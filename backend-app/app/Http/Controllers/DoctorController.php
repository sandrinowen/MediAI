<?php

namespace App\Http\Controllers;

use App\Models\Medecin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ═══════════════════════════════════════════════════════════════
//  DoctorController
//  Annuaire des médecins + créneaux disponibles (écran RDV).
// ═══════════════════════════════════════════════════════════════
class DoctorController extends Controller
{
    /**
     * GET /api/doctors — liste filtrable par spécialité / recherche.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Medecin::actif()
            ->whereHas('user', fn ($user) => $user->where('role', 'medecin'));

        if ($spec = $request->string('specialite')->toString()) {
            $query->where('specialite', $spec);
        }

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($sub) use ($q) {
                $sub->where('nom', 'like', "%{$q}%")
                    ->orWhere('specialite', 'like', "%{$q}%");
            });
        }

        $medecins = $query->orderByDesc('rating')->get();

        return response()->json(['doctors' => $medecins]);
    }

    /**
     * GET /api/doctors/{medecin} — détail + créneaux pour une date.
     */
    public function show(Request $request, Medecin $medecin): JsonResponse
    {
        abort_unless(
            $medecin->actif && $medecin->user?->role === 'medecin',
            404,
            'Médecin introuvable.'
        );

        $date = $request->date('date')?->toDateString() ?? now()->toDateString();

        return response()->json([
            'doctor'    => $medecin,
            'date'      => $date,
            'creneaux'  => $medecin->creneauxDisponibles($date),
        ]);
    }
}
