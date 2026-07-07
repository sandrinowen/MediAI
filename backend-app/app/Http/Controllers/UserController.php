<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// ═══════════════════════════════════════════════════════════════
//  UserController
//  Gestion des utilisateurs (écrans Admin du mobile).
//  Réservé aux administrateurs (sauf show de soi-même).
// ═══════════════════════════════════════════════════════════════
class UserController extends Controller
{
    /**
     * GET /api/users — liste de tous les utilisateurs (admin).
     * Inclut les compteurs consultations / rendez-vous.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $users = User::query()
            ->withCount(['consultations', 'rendezVous'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * GET /api/users/{user} — détail d'un utilisateur (admin).
     */
    public function show(Request $request, int $user): JsonResponse
    {
        $this->ensureAdmin($request);

        $target = User::withCount(['consultations', 'rendezVous'])
            ->findOrFail($user);

        return response()->json(['user' => $target]);
    }

    /**
     * PUT /api/users/{user} — mise à jour d'un utilisateur (admin).
     */
    public function update(Request $request, int $user): JsonResponse
    {
        $this->ensureAdmin($request);

        $target = User::findOrFail($user);

        $data = $request->validate([
            'nom'            => ['sometimes', 'string', 'max:100'],
            'prenom'         => ['sometimes', 'string', 'max:100'],
            'email'          => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'telephone'      => ['nullable', 'string', 'max:20'],
            'localisation'   => ['nullable', 'string', 'max:200'],
            'sexe'           => ['nullable', Rule::in(['M', 'F', 'A'])],
            'date_naissance' => ['nullable', 'date', 'before:today'],
            'groupe_sanguin' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'allergies'      => ['nullable', 'string'],
            'antecedents'    => ['nullable', 'string'],
            'role'           => ['sometimes', Rule::in(['patient', 'medecin', 'admin'])],
        ]);

        $target->update($data);
        $this->ensureMedecinFiche($target);

        return response()->json([
            'message' => 'Utilisateur mis à jour',
            'user'    => $target->loadCount(['consultations', 'rendezVous']),
        ]);
    }

    /**
     * PATCH /api/users/{user}/role — changement de rôle (admin).
     */
    public function updateRole(Request $request, int $user): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'role' => ['required', Rule::in(['patient', 'medecin', 'admin'])],
        ]);

        $target = User::findOrFail($user);
        $target->update(['role' => $data['role']]);
        $this->ensureMedecinFiche($target);

        return response()->json([
            'message' => 'Rôle mis à jour',
            'user'    => $target->loadCount(['consultations', 'rendezVous']),
        ]);
    }

    /**
     * PUT /api/user/push-token — enregistre le jeton Expo Push du dispositif
     * de l'utilisateur connecté (pour les notifications de rendez-vous).
     */
    public function updatePushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->update(['expo_push_token' => $data['expo_push_token']]);

        return response()->json(['message' => 'Token enregistré']);
    }

    /** Crée la fiche annuaire si un utilisateur devient médecin. */
    private function ensureMedecinFiche(User $user): void
    {
        if ($user->role !== 'medecin') {
            return;
        }

        $name = trim("{$user->prenom} {$user->nom}") ?: $user->email;

        $user->medecin()->firstOrCreate(
            [],
            [
                'nom'          => $name,
                'specialite'   => 'Médecine générale',
                'localisation' => $user->localisation,
                'telephone'    => $user->telephone,
                'email'        => $user->email,
                'actif'        => true,
            ],
        );
    }

    /** Bloque la requête si l'utilisateur courant n'est pas admin. */
    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()->isAdmin(), 403, 'Accès réservé aux administrateurs.');
    }
}
