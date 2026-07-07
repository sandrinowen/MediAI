<?php

namespace Database\Seeders;

use App\Models\Maladie;
use Illuminate\Database\Seeder;

// ═══════════════════════════════════════════════════════════════
//  MaladieSeeder — Base de connaissances : 8 maladies (KB v2)
//
//  ⚠️ ALIGNÉ SUR LE FRONTEND : les codes de symptômes / facteurs et
//  les seuils sont IDENTIQUES à DISEASE_DB de mediai-mobile/src/pages/
//  Diagnostic.jsx, afin que le scoring serveur reproduise le calcul
//  local (fallback hors-ligne transparent).
//
//  symptomes_princ : {code_symptome: poids}   (poids 2 dans le front)
//  facteurs_risque : [codes]                   (poids 1 dans le front)
//  urgence : 1=Faible 2=Modéré 3=Urgent 4=Critique
// ═══════════════════════════════════════════════════════════════
class MaladieSeeder extends Seeder
{
    public function run(): void
    {
        // Helper : transforme une liste de codes en map {code: 2.0}
        $w = fn (array $codes) => array_fill_keys($codes, 2.0);

        $maladies = [
            [
                'code' => 'paludisme', 'nom' => 'Paludisme', 'categorie' => 'Infectieuse / Parasitaire',
                'icd11' => '1F40', 'urgence' => 3, 'seuil' => 0.40,
                'symptomes_princ' => $w(['fievre', 'frissons', 'sueurs', 'maux_tete', 'fatigue', 'nausees', 'vomissements', 'douleurs_musc', 'courbatures']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['zone_tropicale', 'voyage_afrique', 'moustiques', 'saison_pluies'],
                'recommandations' => [
                    '🩸 Test TDR immédiat',
                    '🔬 Frottis sanguin / Goutte épaisse',
                    '💊 ACT (Artemisinin-based Combination Therapy)',
                    '🏥 Hospitalisation si forme grave',
                    '🌡️ Surveillance température toutes les 6h',
                ],
            ],
            [
                'code' => 'grippe', 'nom' => 'Grippe (Influenza)', 'categorie' => 'Infectieuse / Virale',
                'icd11' => '1E32', 'urgence' => 2, 'seuil' => 0.35,
                'symptomes_princ' => $w(['fievre', 'toux', 'maux_tete', 'fatigue', 'douleurs_musc', 'courbatures', 'mal_gorge', 'nez_coule', 'frissons']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['saison_froide', 'contact_malade', 'collectivite'],
                'recommandations' => [
                    '🛌 Repos et isolement à domicile',
                    '💧 Hydratation abondante',
                    '💊 Paracétamol pour la fièvre',
                    '🧪 Test PCR si symptômes sévères',
                    '💊 Oseltamivir (Tamiflu) si début < 48h',
                ],
            ],
            [
                'code' => 'covid', 'nom' => 'COVID-19', 'categorie' => 'Infectieuse / Virale',
                'icd11' => 'RA01', 'urgence' => 3, 'seuil' => 0.40,
                'symptomes_princ' => $w(['fievre', 'toux', 'difficulte_respiratoire', 'fatigue', 'mal_gorge', 'maux_tete', 'perte_appetit', 'dyspnee']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['contact_malade', 'collectivite', 'age_avance', 'immunodepression'],
                'recommandations' => [
                    '🧪 Test antigénique ou PCR immédiat',
                    '🛌 Isolement strict 7-10 jours',
                    '🌡️ Surveillance saturation oxygène (SpO2)',
                    '💊 Traitement symptomatique (paracétamol)',
                    '🏥 Hospitalisation si désaturation (SpO2 < 94%)',
                ],
            ],
            [
                'code' => 'gastro', 'nom' => 'Gastro-entérite aiguë', 'categorie' => 'Gastro-intestinale',
                'icd11' => '1A40', 'urgence' => 2, 'seuil' => 0.45,
                'symptomes_princ' => $w(['diarrhee', 'vomissements', 'douleurs_abdo', 'nausees', 'fievre', 'fatigue', 'ballonnements']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['eau_contaminee', 'aliments_avaries', 'contact_malade'],
                'recommandations' => [
                    '💧 Réhydratation orale (SRO)',
                    '🍚 Régime sans lactose, aliments légers',
                    '🚫 Éviter les antidiarrhéiques si fièvre',
                    '🩺 Surveillance des signes de déshydratation',
                    '🏥 Consultation si persistance > 48h',
                ],
            ],
            [
                'code' => 'dengue', 'nom' => 'Dengue', 'categorie' => 'Infectieuse / Virale',
                'icd11' => '1D2', 'urgence' => 3, 'seuil' => 0.50,
                'symptomes_princ' => $w(['fievre', 'maux_tete', 'douleurs_musc', 'douleurs_retroorbitaires', 'fatigue', 'nausees', 'vomissements', 'eruption']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['zone_tropicale', 'moustiques', 'saison_pluies'],
                'recommandations' => [
                    '🧪 Test NS1 Ag (J1-J5)',
                    '🩸 NFS : surveillance des plaquettes',
                    "💊 Paracétamol uniquement (pas d'aspirine)",
                    '💧 Hydratation intense',
                    '🏥 Hospitalisation si signes de gravité',
                ],
            ],
            [
                'code' => 'typhoide', 'nom' => 'Fièvre typhoïde', 'categorie' => 'Infectieuse / Bactérienne',
                'icd11' => '1A07', 'urgence' => 3, 'seuil' => 0.50,
                'symptomes_princ' => $w(['fievre', 'maux_tete', 'fatigue', 'douleurs_abdo', 'constipation', 'diarrhee', 'toux']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['eau_contaminee', 'voyage_afrique', 'voyage_asie'],
                'recommandations' => [
                    '🩸 Hémoculture et coproculture',
                    '💊 Azithromycine ou Fluoroquinolone',
                    '💧 Hydratation IV si nécessaire',
                    '🛌 Isolement entérique',
                    '🧼 Hygiène stricte',
                ],
            ],
            [
                'code' => 'bronchite', 'nom' => 'Bronchite aiguë', 'categorie' => 'Respiratoire',
                'icd11' => 'CA20', 'urgence' => 2, 'seuil' => 0.40,
                'symptomes_princ' => $w(['toux', 'toux_grasse', 'expectorations', 'fatigue', 'difficulte_respiratoire', 'douleurs_thoraciques']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['tabac', 'saison_froide', 'asthme'],
                'recommandations' => [
                    '🫁 Repos et hydratation',
                    '💨 Bronchodilatateurs si nécessaires',
                    '💊 Antitussifs si toux sévère',
                    '🚭 Arrêt du tabac temporaire',
                    '🩺 Consultation si aggravation',
                ],
            ],
            [
                'code' => 'pneumonie', 'nom' => 'Pneumonie', 'categorie' => 'Respiratoire',
                'icd11' => 'CA40', 'urgence' => 3, 'seuil' => 0.50,
                'symptomes_princ' => $w(['fievre', 'toux', 'difficulte_respiratoire', 'douleurs_thoraciques', 'fatigue', 'expectorations', 'dyspnee']),
                'symptomes_sec'   => [],
                'facteurs_risque' => ['age_avance', 'tabac', 'immunodepression', 'asthme'],
                'recommandations' => [
                    '📷 Radiographie thoracique',
                    '🩸 NFS, CRP, hémocultures',
                    '💊 Antibiothérapie adaptée',
                    '💨 Oxygénothérapie si SpO2 < 94%',
                    '🏥 Hospitalisation si forme sévère',
                ],
            ],
        ];

        foreach ($maladies as $m) {
            Maladie::updateOrCreate(['code' => $m['code']], $m + ['actif' => true]);
        }
    }
}
