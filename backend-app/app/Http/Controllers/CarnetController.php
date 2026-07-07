<?php

namespace App\Http\Controllers;

use App\Models\RendezVous;
use App\Models\User;
use App\Services\CarnetPDFService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// ═══════════════════════════════════════════════════════════════
//  CarnetController
//  Export du carnet de santé PDF (DomPDF) + partage.
// ═══════════════════════════════════════════════════════════════
class CarnetController extends Controller
{
    public function __construct(private readonly CarnetPDFService $carnet) {}

    /**
     * GET /api/carnet — données structurées du carnet (JSON).
     */
    public function show(Request $request): JsonResponse
    {
        $target = $this->resolveTargetUser($request);
        $data = $this->carnet->buildData($target);

        return response()->json([
            'user'          => $data['user'],
            'biometrics'    => $data['biometrics'],
            'consultations' => $data['consultations'],
            'genere_le'     => $data['genere_le'],
        ]);
    }

    /**
     * GET /api/carnet/export — télécharge le PDF.
     */
    public function export(Request $request): Response
    {
        $target = $this->resolveTargetUser($request);
        $pdf = $this->carnet->render($target);
        $filename = 'carnet-mediai-'.$target->id.'.pdf';

        return $pdf->download($filename);
    }

    /**
     * GET /api/carnet/export/base64 — PDF encodé (app mobile / WhatsApp).
     */
    public function exportBase64(Request $request): JsonResponse
    {
        $target = $this->resolveTargetUser($request);

        return response()->json([
            'filename' => 'carnet-mediai-'.$target->id.'.pdf',
            'mime'     => 'application/pdf',
            'base64'   => $this->carnet->toBase64($target),
        ]);
    }

    /**
     * Sans patient_id : carnet du compte connecté.
     * Avec patient_id : accès médecin uniquement si un RDV confirmé existe.
     */
    private function resolveTargetUser(Request $request): User
    {
        $user = $request->user();
        $patientId = $request->integer('patient_id');

        if (! $patientId || $patientId === $user->id) {
            return $user;
        }

        $target = User::findOrFail($patientId);

        if ($user->isAdmin()) {
            return $target;
        }

        $medecin = $user->role === 'medecin' ? $user->medecin()->first() : null;

        abort_unless($medecin, 403, 'Accès refusé.');

        $canAccess = RendezVous::where('medecin_id', $medecin->id)
            ->where('user_id', $target->id)
            ->whereIn('statut', ['confirme', 'effectue'])
            ->exists();

        abort_unless($canAccess, 403, 'Carnet accessible après acceptation de la consultation.');

        return $target;
    }
}
