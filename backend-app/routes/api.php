<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BiometricsController;
use App\Http\Controllers\CarnetController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\DiagnosticChatController;
use App\Http\Controllers\DiagnosticController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\HistoriqueController;
use App\Http\Controllers\MedecinController;
use App\Http\Controllers\RDVController;
use App\Http\Controllers\StatistiqueController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ═══════════════════════════════════════════════════════════════
//  Routes API MediAI v2  (préfixe /api)
// ═══════════════════════════════════════════════════════════════

// ── Authentification (public) ─────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
Route::post('/resend-email-verification', [AuthController::class, 'resendEmailVerification']);

// ── Mot de passe oublié (public, OTP par e-mail) ──────────────
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password',  [AuthController::class, 'resetPassword']);

// ── Connexion Google (public) ─────────────────────────────────
Route::post('/auth/google', [AuthController::class, 'googleLogin']);

// ── Routes protégées (Sanctum) ────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Profil / session
    Route::get('/me',       [AuthController::class, 'me']);
    Route::put('/profile',  [AuthController::class, 'updateProfile']);
    Route::post('/logout',  [AuthController::class, 'logout']);

    // Jeton de notifications push Expo (dispositif de l'utilisateur)
    Route::put('/user/push-token', [UserController::class, 'updatePushToken']);

    // Chat conversationnel MedGemma
    Route::prefix('chat')->group(function () {
        Route::post('/message', [DiagnosticChatController::class, 'sendMessage']);
        Route::get('/history', [DiagnosticChatController::class, 'history']);
        Route::delete('/clear', [DiagnosticChatController::class, 'clearHistory']);
    });

    // Conversations (fils de discussion IA)
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{id}/messages', [ConversationController::class, 'messages'])->whereNumber('id');
    Route::delete('/conversations/{id}', [ConversationController::class, 'destroy'])->whereNumber('id');

    // Diagnostics structurés (carnet de santé)
    Route::get('/diagnostics', [DiagnosticController::class, 'index']);
    Route::get('/diagnostics/recent', [DiagnosticController::class, 'recent']);
    Route::get('/diagnostics/export/pdf', [DiagnosticController::class, 'exportPdf']);
    Route::get('/diagnostics/{id}', [DiagnosticController::class, 'show'])->whereNumber('id');

    // Biométriques IoT (ESP32)
    Route::get('/biometrics',        [BiometricsController::class, 'index']);
    Route::post('/biometrics',       [BiometricsController::class, 'store']);
    Route::get('/biometrics/latest', [BiometricsController::class, 'latest']);

    // Historique des consultations
    Route::get('/historique',              [HistoriqueController::class, 'index']);
    Route::get('/historique/{consultation}', [HistoriqueController::class, 'show']);

    // Médecins
    Route::get('/doctors',           [DoctorController::class, 'index']);
    Route::get('/doctors/{medecin}', [DoctorController::class, 'show']);

    // Fiche annuaire du médecin connecté (disponibilités RDV)
    Route::get('/medecin/me', [MedecinController::class, 'me']);
    Route::put('/medecin/me', [MedecinController::class, 'update']);

    // Rendez-vous
    Route::get('/rdv',                 [RDVController::class, 'index']);
    Route::post('/rdv',                [RDVController::class, 'store']);
    Route::patch('/rdv/{rdv}/confirm', [RDVController::class, 'confirm']);
    Route::patch('/rdv/{rdv}/cancel',  [RDVController::class, 'cancel']);
    Route::patch('/rdv/{rdv}/status',  [RDVController::class, 'updateStatus']);

    // Carnet de santé
    Route::get('/carnet',                [CarnetController::class, 'show']);
    Route::get('/carnet/export',         [CarnetController::class, 'export']);
    Route::get('/carnet/export/base64',  [CarnetController::class, 'exportBase64']);

    // ── Administration (rôle admin requis, vérifié dans les contrôleurs) ──
    Route::get('/users',               [UserController::class, 'index']);
    Route::get('/users/{user}',        [UserController::class, 'show']);
    Route::put('/users/{user}',        [UserController::class, 'update']);
    Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);

    Route::get('/statistics',              [StatistiqueController::class, 'index']);
    Route::get('/statistics/appointments', [StatistiqueController::class, 'appointments']);
});
