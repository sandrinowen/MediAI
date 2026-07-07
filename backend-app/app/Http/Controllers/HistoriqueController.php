<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ═══════════════════════════════════════════════════════════════
//  HistoriqueController
//  Liste filtrable des consultations passées (FilterChips mobile).
// ═══════════════════════════════════════════════════════════════
class HistoriqueController extends Controller
{
    /**
     * GET /api/historique
     * Filtres : ?categorie=infectieuse|chronique  &  ?periode=mois
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'categorie' => ['nullable', 'string'],
            'periode'   => ['nullable', 'in:mois,semaine,tout'],
        ]);

        $query = $request->user()
            ->consultations()
            ->latest();

        // Filtre période
        if ($request->periode === 'mois') {
            $query->where('created_at', '>=', now()->startOfMonth());
        } elseif ($request->periode === 'semaine') {
            $query->where('created_at', '>=', now()->startOfWeek());
        }

        // Filtre catégorie (sur la pathologie détectée via la KB)
        if ($cat = $request->string('categorie')->toString()) {
            $query->where('pathologie_detectee', 'like', "%{$cat}%");
        }

        $consultations = $query->paginate($request->integer('per_page', 15));

        return response()->json($consultations);
    }

    /**
     * GET /api/historique/{consultation} — détail d'une consultation.
     */
    public function show(Request $request, int $consultation): JsonResponse
    {
        $item = $request->user()
            ->consultations()
            ->with('biometrics')
            ->findOrFail($consultation);

        return response()->json(['consultation' => $item]);
    }
}
