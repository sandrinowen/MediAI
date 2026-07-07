<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

// ═══════════════════════════════════════════════════════════════
//  PushNotificationService
//  Envoi de notifications push via l'API Expo Push Service.
//  https://docs.expo.dev/push-notifications/sending-notifications/
//
//  Principe : ne JAMAIS bloquer le flux métier si l'envoi échoue.
//  Toute erreur est journalisée (Log::warning) sans exception remontée.
// ═══════════════════════════════════════════════════════════════
class PushNotificationService
{
    /** Endpoint officiel du service de push Expo. */
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Envoie une notification push à un dispositif Expo.
     *
     * @param  string  $expoPushToken  Jeton "ExponentPushToken[xxx]"
     * @param  array<string,mixed>  $data  Données personnalisées (deep-link, type…)
     * @return bool  true si l'envoi a été accepté par Expo, false sinon.
     */
    public function send(string $expoPushToken, string $title, string $body, array $data = []): bool
    {
        // Garde-fou : jeton absent ou format invalide → on ignore silencieusement.
        if (! $this->isValidToken($expoPushToken)) {
            return false;
        }

        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->post(self::EXPO_PUSH_URL, [
                    'to' => $expoPushToken,
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'sound' => 'default',
                    'priority' => 'high',
                    'channelId' => 'mediai-rdv',
                ]);

            if ($response->failed()) {
                Log::warning('Expo push HTTP error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            // Expo renvoie { "data": { "status": "ok" | "error", ... } }
            $status = $response->json('data.status');
            if ($status !== 'ok') {
                Log::warning('Expo push rejected', ['body' => $response->body()]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('Expo push exception', ['message' => $e->getMessage()]);

            return false;
        }
    }

    /** Vérifie sommairement le format d'un jeton Expo. */
    private function isValidToken(?string $token): bool
    {
        if (! $token) {
            return false;
        }

        return str_starts_with($token, 'ExponentPushToken[')
            || str_starts_with($token, 'ExpoPushToken[');
    }
}
