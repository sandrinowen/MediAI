<?php

// ═══════════════════════════════════════════════════════════════
//  Configuration CORS — accès API depuis l'app mobile (Expo)
// ═══════════════════════════════════════════════════════════════

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:19000',  // Expo (ancien)
        'http://localhost:19006',  // Expo web (ancien)
        'http://localhost:8081',   // Expo web / Metro (SDK 50+)
        'http://127.0.0.1:8081',
    ],

    'allowed_origins_patterns' => [
        '#^http://192\.168\.\d+\.\d+(:\d+)?$#',          // réseau local (téléphone réel)
        '#^http://localhost:\d+$#',                       // n\'importe quel port localhost (dev)
        '#^http://127\.0\.0\.1:\d+$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
