<?php

namespace App\Http\Controllers;

use App\Models\Diagnostic;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// ═══════════════════════════════════════════════════════════════
//  DiagnosticController
//  Carnet de santé : liste, détail et export PDF des diagnostics
//  structurés générés par MedGemma.
// ═══════════════════════════════════════════════════════════════
class DiagnosticController extends Controller
{
    /**
     * GET /api/diagnostics — liste résumée pour l'écran Historique / Carnet.
     */
    public function index(Request $request): JsonResponse
    {
        $diagnostics = Diagnostic::where('user_id', $request->user()->id)
            ->latest('diagnosed_at')
            ->get(['id', 'conversation_id', 'title', 'hypotheses', 'diagnosed_at', 'created_at']);

        $data = $diagnostics->map(function (Diagnostic $diagnostic) {
            $main = $diagnostic->hypotheses[0] ?? null;

            return [
                'id' => $diagnostic->id,
                'conversation_id' => $diagnostic->conversation_id,
                'title' => $diagnostic->title,
                'diagnosed_at' => $diagnostic->diagnosed_at,
                'main_hypothesis' => $main['name'] ?? null,
                'main_probability' => $main['probability'] ?? null,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/diagnostics/recent — 3 derniers diagnostics de l'utilisateur
     * pour la page d'accueil (id, titre, date, hypothèse principale).
     */
    public function recent(Request $request): JsonResponse
    {
        $diagnostics = Diagnostic::where('user_id', $request->user()->id)
            ->latest('diagnosed_at')
            ->limit(3)
            ->get(['id', 'title', 'hypotheses', 'diagnosed_at']);

        $data = $diagnostics->map(function (Diagnostic $diagnostic) {
            $main = $diagnostic->hypotheses[0] ?? null;

            return [
                'id' => $diagnostic->id,
                'title' => $diagnostic->title,
                'diagnosed_at' => $diagnostic->diagnosed_at,
                'hypothesis' => $main ? [
                    'name' => $main['name'] ?? null,
                    'probability' => $main['probability'] ?? null,
                ] : null,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/diagnostics/{id} — diagnostic complet (page détail du carnet).
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $diagnostic = $this->resolve($request, $id);

        return response()->json(['data' => $diagnostic]);
    }

    /**
     * GET /api/diagnostics/export/pdf — PDF de tous les diagnostics.
     * Une page par diagnostic (barryvdh/laravel-dompdf).
     */
    public function exportPdf(Request $request): Response
    {
        $user = $request->user();

        $diagnostics = Diagnostic::where('user_id', $user->id)
            ->latest('diagnosed_at')
            ->get();

        $pdf = Pdf::loadView('pdf.diagnostics', [
            'user' => $user,
            'diagnostics' => $diagnostics,
            'genere_le' => now(),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('carnet-diagnostics-mediai-'.$user->id.'.pdf');
    }

    /** Récupère un diagnostic appartenant à l'utilisateur ou 404/403. */
    private function resolve(Request $request, int $id): Diagnostic
    {
        $diagnostic = Diagnostic::findOrFail($id);
        abort_unless($diagnostic->user_id === $request->user()->id, 403, 'Accès refusé.');

        return $diagnostic;
    }
}
