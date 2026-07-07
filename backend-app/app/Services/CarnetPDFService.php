<?php

namespace App\Services;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;

// ═══════════════════════════════════════════════════════════════
//  CarnetPDFService
//  Génère le carnet de santé PDF d'un utilisateur (DomPDF),
//  incluant ses consultations et ses dernières données IoT.
// ═══════════════════════════════════════════════════════════════
class CarnetPDFService
{
    /**
     * Construit les données du carnet pour un utilisateur.
     */
    public function buildData(User $user): array
    {
        $user->loadMissing(['consultations' => fn ($q) => $q->latest()]);

        $dernieresBio = $user->biometrics()->latest('timestamp')->first();

        return [
            'user'         => $user,
            'consultations' => $user->consultations,
            'biometrics'   => $dernieresBio,
            'genere_le'    => now(),
        ];
    }

    /**
     * Rend le PDF binaire du carnet.
     */
    public function render(User $user): \Barryvdh\DomPDF\PDF
    {
        $data = $this->buildData($user);

        return Pdf::loadView('pdf.carnet', $data)
            ->setPaper('a4', 'portrait');
    }

    /**
     * Retourne le PDF encodé en base64 (pour l'app mobile).
     */
    public function toBase64(User $user): string
    {
        return base64_encode($this->render($user)->output());
    }
}
