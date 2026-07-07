<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ═══════════════════════════════════════════════════════════════
//  StatistiqueController
//  Statistiques globales pour l'écran Admin (mobile).
//  Réservé aux administrateurs.
// ═══════════════════════════════════════════════════════════════
class StatistiqueController extends Controller
{
    /**
     * GET /api/statistics — agrégats globaux.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403, 'Accès réservé aux administrateurs.');

        // Top 5 pathologies détectées (consultations)
        $topDiseases = Consultation::query()
            ->whereNotNull('pathologie_detectee')
            ->selectRaw('pathologie_detectee as name, COUNT(*) as count')
            ->groupBy('pathologie_detectee')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'count' => (int) $row->count]);

        return response()->json([
            'totalUsers'         => User::count(),
            'totalConsultations' => Consultation::count(),
            'totalAppointments'  => RendezVous::whereIn('statut', ['planifie', 'confirme'])->count(),
            'patientsCount'      => User::where('role', 'patient')->count(),
            'medecinsCount'      => User::where('role', 'medecin')->count(),
            'adminsCount'        => User::where('role', 'admin')->count(),
            'topDiseases'        => $topDiseases,
        ]);
    }

    /**
     * GET /api/statistics/appointments — tous les rendez-vous (admin).
     */
    public function appointments(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403, 'Accès réservé aux administrateurs.');

        $rdv = RendezVous::query()
            ->with([
                'medecin:id,nom,specialite',
                'user:id,nom,prenom',
            ])
            ->orderByDesc('date_rdv')
            ->get();

        return response()->json(['rendez_vous' => $rdv]);
    }
}
