<?php

namespace App\Http\Controllers;

use App\Mail\EmailVerificationCodeMail;
use App\Mail\PasswordResetCodeMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// ═══════════════════════════════════════════════════════════════
//  AuthController
//  Inscription (3 étapes v2), connexion, déconnexion, profil.
//  Tokens via Laravel Sanctum.
// ═══════════════════════════════════════════════════════════════
class AuthController extends Controller
{
    /**
     * POST /api/register
     * Inscription v2 : identité + profil médical + IoT + consentements.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Étape 1 — identité
            'nom'            => ['required', 'string', 'max:100'],
            'prenom'         => ['required', 'string', 'max:100'],
            'email'          => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'       => ['required', 'string', 'min:8', 'confirmed'],
            'date_naissance' => ['nullable', 'date', 'before:today'],
            'sexe'           => ['nullable', Rule::in(['M', 'F', 'A'])],
            'telephone'      => ['nullable', 'string', 'max:20'],
            'localisation'   => ['nullable', 'string', 'max:200'],
            // Rôle choisi à l'inscription : patient (défaut) ou medecin.
            // 'admin' volontairement exclu (jamais auto-attribuable).
            'role'           => ['nullable', Rule::in(['patient', 'medecin'])],
            // Spécialité — requise uniquement pour un compte médecin.
            'specialite'     => ['required_if:role,medecin', 'nullable', 'string', 'max:100'],
            // Étape 2 — profil médical
            'groupe_sanguin' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'taille_cm'      => ['nullable', 'integer', 'between:30,250'],
            'poids_kg'       => ['nullable', 'integer', 'between:1,300'],
            'allergies'      => ['nullable', 'string'],
            'antecedents'    => ['nullable', 'string'],
            // Étape 3 — IoT + consentements
            'dispositif_iot'     => ['nullable', 'string', 'max:100'],
            'consent_diagnostic' => ['nullable', 'boolean'],
            'consent_partage'    => ['nullable', 'boolean'],
            'consent_rgpd'       => ['accepted'], // RGPD obligatoire
        ]);

        // La spécialité n'appartient pas à la table users : on l'isole.
        $specialite = $data['specialite'] ?? null;
        unset($data['specialite']);

        $data['role'] = $data['role'] ?? 'patient';

        $user = DB::transaction(function () use ($data, $specialite) {
            $user = User::create($data);

            // Compte médecin → fiche dans l'annuaire RDV (réservable).
            if ($user->role === 'medecin') {
                $user->medecin()->create([
                    'nom'          => trim("{$user->prenom} {$user->nom}"),
                    'specialite'   => $specialite,
                    'localisation' => $user->localisation,
                    'telephone'    => $user->telephone,
                    'email'        => $user->email,
                    'actif'        => true,
                ]);
            }

            return $user;
        });

        $user->refresh(); // recharge les valeurs par défaut DB (ex: role)

        $this->sendEmailVerificationCode($user);

        return response()->json([
            'message' => 'Compte créé. Un code de validation a été envoyé par e-mail.',
            'user'    => $user,
            'requires_email_verification' => true,
        ], 201);
    }

    /**
     * POST /api/login
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email ou mot de passe incorrect.'],
            ]);
        }

        if (! $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => ['Veuillez valider votre compte avec le code reçu par e-mail avant de vous connecter.'],
            ]);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    /**
     * POST /api/verify-email
     * Vérifie le code envoyé après inscription puis active le compte.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code'  => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte associé à cette adresse.'],
            ]);
        }

        if ($user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte est déjà validé. Connectez-vous avec votre mot de passe.'],
            ]);
        }

        $record = DB::table('email_verification_codes')
            ->where('email', $user->email)
            ->first();

        if (! $record || Carbon::parse($record->created_at)->lt(now()->subMinutes(10))) {
            throw ValidationException::withMessages([
                'code' => ['Code invalide ou expiré. Veuillez en demander un nouveau.'],
            ]);
        }

        if (! Hash::check($data['code'], $record->token)) {
            throw ValidationException::withMessages([
                'code' => ['Code incorrect.'],
            ]);
        }

        $user->forceFill(['email_verified_at' => now()])->save();
        DB::table('email_verification_codes')->where('email', $user->email)->delete();

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'message' => 'Compte validé avec succès.',
            'user'    => $user->fresh(),
            'token'   => $token,
        ]);
    }

    /**
     * POST /api/resend-email-verification
     * Renvoie un code de validation au compte non vérifié.
     */
    public function resendEmailVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte associé à cette adresse.'],
            ]);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'message' => 'Ce compte est déjà validé.',
            ]);
        }

        $existing = DB::table('email_verification_codes')
            ->where('email', $user->email)
            ->first();

        if ($existing && Carbon::parse($existing->created_at)->gt(now()->subSeconds(60))) {
            throw ValidationException::withMessages([
                'email' => ['Un code a déjà été envoyé récemment. Réessayez dans une minute.'],
            ]);
        }

        $this->sendEmailVerificationCode($user);

        return response()->json([
            'message' => 'Un nouveau code de validation a été envoyé par e-mail.',
        ]);
    }

    /**
     * POST /api/forgot-password
     * Génère un code OTP à 6 chiffres, le stocke (haché) et l'envoie par e-mail.
     * Réponse volontairement générique : ne révèle pas si l'e-mail existe.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if ($user) {
            // Anti-spam : un nouveau code au maximum toutes les 60 secondes.
            $existing = DB::table('password_reset_tokens')
                ->where('email', $user->email)
                ->first();

            if ($existing && Carbon::parse($existing->created_at)->gt(now()->subSeconds(60))) {
                throw ValidationException::withMessages([
                    'email' => ['Un code a déjà été envoyé récemment. Réessayez dans une minute.'],
                ]);
            }

            // Code à 6 chiffres (100000–999999).
            $code = (string) random_int(100000, 999999);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                [
                    'token'      => Hash::make($code),
                    'created_at' => now(),
                ],
            );

            Mail::to($user->email)->send(
                new PasswordResetCodeMail($code, $user->prenom ?? '', 10),
            );
        }

        return response()->json([
            'message' => 'Si cette adresse est associée à un compte, un code de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * POST /api/reset-password
     * Vérifie le code OTP (existence, expiration 10 min, correspondance)
     * puis met à jour le mot de passe et révoque les sessions existantes.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'code'     => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $data['email'])
            ->first();

        // Code introuvable ou expiré (> 10 minutes).
        if (! $record || Carbon::parse($record->created_at)->lt(now()->subMinutes(10))) {
            throw ValidationException::withMessages([
                'code' => ['Code invalide ou expiré. Veuillez en demander un nouveau.'],
            ]);
        }

        if (! Hash::check($data['code'], $record->token)) {
            throw ValidationException::withMessages([
                'code' => ['Code incorrect.'],
            ]);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Aucun compte associé à cette adresse.'],
            ]);
        }

        // Le cast 'hashed' du modèle hache automatiquement le mot de passe.
        $user->update(['password' => $data['password']]);

        // Consomme le code et déconnecte les autres sessions (sécurité).
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        ]);
    }

    /**
     * POST /api/auth/google
     * Connexion via Google : vérifie l'ID token auprès de Google,
     * puis lie/crée le compte et renvoie un token Sanctum.
     */
    public function googleLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        // Vérification du token auprès de Google.
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $data['id_token'],
        ]);

        if (! $response->ok()) {
            throw ValidationException::withMessages([
                'id_token' => ['Token Google invalide ou expiré.'],
            ]);
        }

        $payload = $response->json();

        // Le token doit avoir été émis pour notre application (aud autorisé).
        $allowed = config('services.google.client_ids', []);
        if (empty($allowed) || ! in_array($payload['aud'] ?? null, $allowed, true)) {
            throw ValidationException::withMessages([
                'id_token' => ['Token Google non destiné à cette application.'],
            ]);
        }

        // L'e-mail doit être vérifié par Google (string "true" via tokeninfo).
        $emailVerified = $payload['email_verified'] ?? false;
        if ($emailVerified !== true && $emailVerified !== 'true') {
            throw ValidationException::withMessages([
                'id_token' => ['Adresse e-mail Google non vérifiée.'],
            ]);
        }

        $googleId = $payload['sub'] ?? null;
        $email    = $payload['email'] ?? null;

        if (! $googleId || ! $email) {
            throw ValidationException::withMessages([
                'id_token' => ['Informations Google incomplètes.'],
            ]);
        }

        // 1) compte déjà lié, sinon 2) e-mail existant à lier, sinon 3) création.
        $user = User::where('google_id', $googleId)->first()
            ?? User::where('email', $email)->first();

        if ($user) {
            if (! $user->google_id) {
                $user->update(['google_id' => $googleId]);
            }
            if (! $user->email_verified_at) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }
        } else {
            $user = User::create([
                'google_id'    => $googleId,
                'email'        => $email,
                'prenom'       => $payload['given_name'] ?? '',
                'nom'          => $payload['family_name'] ?? ($payload['name'] ?? 'Utilisateur'),
                'password'     => Str::random(40), // mot de passe aléatoire (cast 'hashed')
                'email_verified_at' => now(),
                'consent_rgpd' => true,
            ]);
            $user->refresh();
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'message' => 'Connexion Google réussie',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    /**
     * GET /api/me — profil de l'utilisateur connecté.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->loadCount(['consultations', 'rendezVous']),
        ]);
    }

    /**
     * PUT /api/profile — mise à jour du profil.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'nom'            => ['sometimes', 'string', 'max:100'],
            'prenom'         => ['sometimes', 'string', 'max:100'],
            'date_naissance' => ['nullable', 'date', 'before:today'],
            'sexe'           => ['nullable', Rule::in(['M', 'F', 'A'])],
            'telephone'      => ['nullable', 'string', 'max:20'],
            'localisation'   => ['nullable', 'string', 'max:200'],
            'groupe_sanguin' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'taille_cm'      => ['nullable', 'integer', 'between:30,250'],
            'poids_kg'       => ['nullable', 'integer', 'between:1,300'],
            'allergies'      => ['nullable', 'string'],
            'antecedents'    => ['nullable', 'string'],
            'vaccinations'   => ['nullable', 'string'],
            'dispositif_iot' => ['nullable', 'string', 'max:100'],
            'has_sickle_cell'  => ['nullable', 'boolean'],
            'has_diabetes'     => ['nullable', 'boolean'],
            'has_hypertension' => ['nullable', 'boolean'],
        ]);

        $user->update($data);
        $user->refresh();

        if ($user->isMedecin()) {
            $user->medecin()->update([
                'nom'          => trim("{$user->prenom} {$user->nom}"),
                'localisation' => $user->localisation,
                'telephone'    => $user->telephone,
                'email'        => $user->email,
            ]);
        }

        return response()->json([
            'message' => 'Profil mis à jour',
            'user'    => $user->fresh()->loadCount(['consultations', 'rendezVous']),
        ]);
    }

    /**
     * POST /api/logout — révoque le token courant.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie']);
    }

    private function sendEmailVerificationCode(User $user): void
    {
        $code = (string) random_int(100000, 999999);

        DB::table('email_verification_codes')->updateOrInsert(
            ['email' => $user->email],
            [
                'token'      => Hash::make($code),
                'created_at' => now(),
            ],
        );

        Mail::to($user->email)->send(
            new EmailVerificationCodeMail($code, $user->prenom ?? '', 10),
        );
    }
}
