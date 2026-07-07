<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Connexion Google (Sign-In mobile).
    // GOOGLE_CLIENT_IDS = liste séparée par des virgules des Client IDs OAuth
    // autorisés (Web + Android + iOS). L'« aud » du token Google doit y figurer.
    'google' => [
        'client_ids' => array_filter(explode(',', (string) env('GOOGLE_CLIENT_IDS', ''))),
    ],

    'huggingface' => [
        // Token HF (accepte HF_TOKEN ou HUGGINGFACE_API_TOKEN).
        'token' => env('HF_TOKEN', env('HUGGINGFACE_API_TOKEN')),
        // medgemma-3-12b-it n'est pas disponible sur HF ; gemma-3-12b-it via le
        // router générique est le seul modèle 12B qui répond avec ce token.
        'model' => env('HUGGINGFACE_MODEL', 'google/gemma-3-12b-it'),
        'model_url' => env(
            'HUGGINGFACE_MODEL_URL',
            'https://router.huggingface.co/v1/chat/completions',
        ),
        'timeout' => env('HUGGINGFACE_TIMEOUT', 60),
    ],

];
