<?php

namespace Database\Seeders;

use App\Models\Medecin;
use App\Models\User;
use Illuminate\Database\Seeder;

// ═══════════════════════════════════════════════════════════════
//  DoctorSeeder — Médecins.
//  Superset couvrant ceux référencés dans le frontend Appointments.jsx
//  (résolution medecin_id par nom lors de la prise de RDV).
//  horaires : { jour: ["HH:MM", ...] }  (en français, minuscule)
// ═══════════════════════════════════════════════════════════════
class DoctorSeeder extends Seeder
{
    public function run(): void
    {
        $semaine = [
            'lundi'    => ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
            'mardi'    => ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
            'mercredi' => ['08:00', '09:00', '10:00', '11:00', '14:00'],
            'jeudi'    => ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'],
            'vendredi' => ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'],
        ];

        $medecins = [
            [
                'nom' => 'Dr. Amina Fouda', 'specialite' => 'Infectiologue',
                'rating' => 4.8, 'emoji' => '👩‍⚕️',
                'localisation' => 'Hôpital Central, Yaoundé', 'telephone' => '+237 690 11 22 33',
                'email' => 'a.fouda@mediai.cm', 'horaires' => $semaine,
            ],
            [
                'nom' => 'Dr. Samuel Nkeng', 'specialite' => 'Médecin Généraliste',
                'rating' => 4.8, 'emoji' => '👨‍⚕️',
                'localisation' => 'Hôpital Central de Yaoundé', 'telephone' => '+237 691 44 55 66',
                'email' => 's.nkeng@mediai.cm', 'horaires' => $semaine,
            ],
            [
                'nom' => 'Dr. Claire Mvogo', 'specialite' => 'Médecin Généraliste',
                'rating' => 4.9, 'emoji' => '👩‍⚕️',
                'localisation' => 'Hôpital Central de Yaoundé', 'telephone' => '+237 692 77 88 99',
                'email' => 'c.mvogo@mediai.cm', 'horaires' => $semaine,
            ],
            [
                'nom' => 'Dr. Marie Ngo', 'specialite' => 'Pédiatre',
                'rating' => 4.9, 'emoji' => '👩‍⚕️',
                'localisation' => 'Hôpital Gynéco-Obstétrique, Yaoundé', 'telephone' => '+237 693 10 20 30',
                'email' => 'm.ngo@mediai.cm', 'horaires' => $semaine,
            ],
            [
                'nom' => 'Dr. Pierre Nganou', 'specialite' => 'Cardiologue',
                'rating' => 4.9, 'emoji' => '👨‍⚕️',
                'localisation' => 'Clinique de la CNPS, Yaoundé', 'telephone' => '+237 694 40 50 60',
                'email' => 'p.nganou@mediai.cm', 'horaires' => $semaine,
            ],
        ];

        foreach ($medecins as $m) {
            [$prenom, $nom] = $this->splitDoctorName($m['nom']);

            $user = User::updateOrCreate(
                ['email' => $m['email']],
                [
                    'nom' => $nom,
                    'prenom' => $prenom,
                    'password' => 'password123',
                    'sexe' => str_contains($m['emoji'], '👩') ? 'F' : 'M',
                    'telephone' => $m['telephone'],
                    'localisation' => $m['localisation'],
                    'consent_rgpd' => true,
                    'role' => 'medecin',
                ]
            );

            Medecin::updateOrCreate(
                ['nom' => $m['nom']],
                $m + ['user_id' => $user->id, 'actif' => true]
            );
        }
    }

    private function splitDoctorName(string $doctorName): array
    {
        $name = trim(str_replace('Dr.', '', $doctorName));
        $parts = preg_split('/\s+/', $name, 2);

        return [$parts[0] ?? 'Docteur', $parts[1] ?? $parts[0] ?? 'MediAI'];
    }
}
