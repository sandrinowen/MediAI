<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

// ═══════════════════════════════════════════════════════════════
//  AdminSeeder — 3 comptes administrateur.
//  Email déjà vérifié (email_verified_at) pour permettre la
//  connexion immédiate. Mot de passe haché via le cast du modèle.
// ═══════════════════════════════════════════════════════════════
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            ['prenom' => 'Admin', 'nom' => 'Un',    'email' => 'admin1@mediai.cm'],
            ['prenom' => 'Admin', 'nom' => 'Deux',  'email' => 'admin2@mediai.cm'],
            ['prenom' => 'Admin', 'nom' => 'Trois', 'email' => 'admin3@mediai.cm'],
        ];

        foreach ($admins as $admin) {
            User::updateOrCreate(
                ['email' => $admin['email']],
                [
                    'nom' => $admin['nom'],
                    'prenom' => $admin['prenom'],
                    'password' => 'admin1234',
                    'role' => 'admin',
                    'sexe' => 'M',
                    'email_verified_at' => now(),
                    'consent_diagnostic' => true,
                    'consent_partage' => true,
                    'consent_rgpd' => true,
                ]
            );
        }
    }
}
