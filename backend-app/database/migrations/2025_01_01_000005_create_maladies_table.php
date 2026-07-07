<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// ═══════════════════════════════════════════════════════════════
//  TABLE : maladies
//  Modèle : Maladie
//  Source : Diagramme de classes MediAI v2 — Maladie (KB)
//  ✅ Compatible Laravel : Maladie → maladies (pas de pb)
//  Attributs : id, code, nom, categorie, icd11, urgence, seuil,
//              symptomes_princ (JSON), symptomes_sec (JSON),
//              facteurs_risque (JSON), recommandations (JSON)
//  Méthodes : score(syms,risks,iot), getRecommandations()
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maladies', function (Blueprint $table) {

            $table->id();

            // ── Identification ────────────────────────────────
            $table->string('code', 30)->unique()
                  ->comment('Clé interne ex: paludisme, grippe');
            $table->string('nom', 150);
            $table->string('categorie', 100);
            $table->string('icd11', 20)->nullable()
                  ->comment('Code ICD-11 international');

            // ── Paramètres du moteur IA ───────────────────────
            $table->unsignedTinyInteger('urgence')
                  ->comment('1=Faible 2=Modéré 3=Urgent 4=Critique');
            $table->decimal('seuil', 4, 3)
                  ->comment('Score minimum déclenchement (0.000 à 1.000)');

            // ── Base de connaissances (JSON) ──────────────────
            // Correspond à sp dans le KB du HTML
            $table->json('symptomes_princ')
                  ->comment('Symptômes principaux avec poids {symptome: poids}');
            // Correspond à ss dans le KB du HTML
            $table->json('symptomes_sec')
                  ->comment('Symptômes secondaires avec poids');
            // Correspond à fr dans le KB du HTML
            $table->json('facteurs_risque')
                  ->comment('Facteurs de risque ["zone_tropicale", ...]');
            // Correspond à recos dans le KB du HTML
            $table->json('recommandations')
                  ->comment('Conseils médicaux ["Repos...", ...]');

            // ── Gestion ───────────────────────────────────────
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // ── Index ─────────────────────────────────────────
            $table->index('urgence', 'idx_maladies_urgence');
            $table->index('actif',   'idx_maladies_actif');
        });

        // ── Contraintes CHECK (MySQL seulement) ────────────────
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE maladies
                ADD CONSTRAINT chk_urgence_maladie
                CHECK (urgence BETWEEN 1 AND 4)");

            DB::statement("ALTER TABLE maladies
                ADD CONSTRAINT chk_seuil
                CHECK (seuil BETWEEN 0.000 AND 1.000)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('maladies');
    }
};
