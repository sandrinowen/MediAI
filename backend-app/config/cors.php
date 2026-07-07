<?php

$csv = static function (string $key, array $fallback = []): array {
    $value = env($key);

    if ($value === null) {
        return $fallback;
    }

    return array_values(array_filter(array_map('trim', explode(',', (string) $value))));
};

$localOrigins = [
    'http://localhost:3000',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
];

$localOriginPatterns = [
    '#^http://192\.168\.\d+\.\d+(:\d+)?$#',
    '#^http://localhost:\d+$#',
    '#^http://127\.0\.0\.1:\d+$#',
];

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $csv('CORS_ALLOWED_ORIGINS', $localOrigins),

    'allowed_origins_patterns' => $csv('CORS_ALLOWED_ORIGIN_PATTERNS', $localOriginPatterns),

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
