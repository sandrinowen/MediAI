<?php

// ═══════════════════════════════════════════════════════════════
//  Configuration du moteur de diagnostic IA
//  Pour l'instant : scoring 100% local (PHP) basé sur la table maladies.
//  L'appel HTTP au service Flask externe est désactivé par défaut.
// ═══════════════════════════════════════════════════════════════

return [

    // Active l'appel HTTP au moteur Flask externe (false = scoring PHP local)
    'use_remote' => env('IA_USE_REMOTE', false),

    'service_url' => env('IA_SERVICE_URL', 'http://localhost:5000'),
    'timeout'     => env('IA_TIMEOUT', 10),

    // Score minimum (0..1) pour qu'une maladie apparaisse dans les résultats
    'min_seuil' => env('IA_MIN_SEUIL', 0.30),

    // Nombre maximum de résultats retournés
    'max_resultats' => env('IA_MAX_RESULTATS', 5),

    // ── Bonus de fusion IoT (v2) ──────────────────────────────
    // Appliqués au score quand les biométriques dépassent un seuil.
    'fusion' => [
        'temp_seuil'   => 38.0,   // °C  → bonus fièvre
        'temp_bonus'   => 0.20,
        'hr_seuil'     => 100,    // bpm → bonus tachycardie
        'hr_bonus'     => 0.15,
        'spo2_seuil'   => 95,     // %   → bonus détresse respiratoire (si <)
        'spo2_bonus'   => 0.20,
        'glyc_seuil'   => 1.26,   // g/L → bonus hyperglycémie
        'glyc_bonus'   => 0.15,
    ],
];
