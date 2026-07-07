<?php

namespace App\Http\Controllers;

use App\Models\Medecin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// ═══════════════════════════════════════════════════════════════
//  MedecinController
//  Gestion par le médecin connecté de SA propre fiche annuaire :
//  consultation et mise à jour des horaires (disponibilités RDV),
//  spécialité et coordonnées professionnelles.
// ═══════════════════════════════════════════════════════════════
class MedecinController extends Controller
{
    // Jours acceptés dans le JSON horaires (français, minuscule).
    private const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    /**
     * GET /api/medecin/me — fiche annuaire du médecin connecté.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'medecin' => $this->resolveFiche($request),
        ]);
    }

    /**
     * PUT /api/medecin/me — met à jour horaires / spécialité / coordonnées.
     */
    public function update(Request $request): JsonResponse
    {
        $medecin = $this->resolveFiche($request);

        $data = $request->validate([
            'specialite'   => ['sometimes', 'string', 'max:100'],
            'localisation' => ['nullable', 'string', 'max:200'],
            'telephone'    => ['nullable', 'string', 'max:20'],
            'actif'        => ['sometimes', 'boolean'],
            // horaires : { "lundi": ["08:00","09:00"], ... }
            'horaires'                => ['sometimes', 'array'],
            'horaires.*'              => ['array'],
            'horaires.*.*'            => ['string', 'date_format:H:i'],
        ]);

        // Valide les clés de jour et normalise (tri + dédoublonnage des créneaux).
        if (isset($data['horaires'])) {
            $horaires = [];
            foreach ($data['horaires'] as $jour => $creneaux) {
                if (! in_array($jour, self::JOURS, true)) {
                    throw ValidationException::withMessages([
                        'horaires' => ["Jour invalide : {$jour}."],
                    ]);
                }
                $slots = array_values(array_unique($creneaux));
                sort($slots);
                if ($slots) {
                    $horaires[$jour] = $slots;
                }
            }
            $data['horaires'] = $horaires;
        }

        $medecin->update($data);

        return response()->json([
            'message' => 'Disponibilités mises à jour',
            'medecin' => $medecin->fresh(),
        ]);
    }

    /**
     * Récupère la fiche du médecin connecté ; 403 si le compte n'est pas médecin.
     * Auto-réparation : crée la fiche si le rôle est médecin mais la fiche absente
     * (comptes créés avant l'introduction de l'annuaire lié).
     */
    private function resolveFiche(Request $request): Medecin
    {
        $user = $request->user();

        abort_unless($user->role === 'medecin', 403, 'Réservé aux comptes médecin.');

        return $user->medecin()->firstOrCreate(
            [],
            [
                'nom'          => trim("{$user->prenom} {$user->nom}"),
                'specialite'   => 'Médecine générale',
                'localisation' => $user->localisation,
                'telephone'    => $user->telephone,
                'email'        => $user->email,
                'actif'        => true,
            ],
        );
    }
}
