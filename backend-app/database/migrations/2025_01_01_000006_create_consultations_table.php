<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// ═══════════════════════════════════════════════════════════════
//  TABLE : consultations
//  Modèle : Consultation
//  Source : Diagramme de classes MediAI v2
//  ✅ Compatible Laravel : Consultation → consultations
//  Attributs : id, user_id (FK), symptomes (JSON),
//              facteurs_risque (JSON), age_consultation,
//              sexe_consultation, iot_data (JSON, v2),
//              biometrics_id (FK), resultats (JSON),
//              score_ia, urgence, pathologie_detectee,
//              duree_analyse_ms
//  Méthodes : getResume()
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {

            $table->id();

            // ── Clé étrangère user_id ─────────────────────────
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->onUpdate('restrict');

            // ── Données saisies par l'utilisateur ─────────────
            $table->json('symptomes')
                  ->comment('["fievre","toux","fatigue",...]');
            $table->json('facteurs_risque')
                  ->comment('["zone_tropicale","contact_malade",...]');
            $table->unsignedTinyInteger('age_consultation')->nullable();
            $table->enum('sexe_consultation', ['M', 'F', 'A'])->nullable();

            // ── Données IoT fusionnées (v2) ───────────────────
            // Contient : {temp, hr, spo2, bp_syst, bp_diast, glyc, resp}
            $table->json('iot_data')->nullable()
                  ->comment('Snapshot biométrique IoT au moment du diagnostic');

            // Référence vers la mesure IoT utilisée
            $table->foreignId('biometrics_id')
                  ->nullable()
                  ->constrained('donnees_biometriques')
                  ->onDelete('set null')
                  ->onUpdate('restrict');

            // ── Résultats IA ──────────────────────────────────
            $table->json('resultats')->nullable()
                  ->comment('[{maladie, score, urgence, recos, iot_match}, ...]');
            $table->decimal('score_ia', 5, 2)->nullable()
                  ->comment('Score principal de confiance 0.00 à 100.00');
            $table->unsignedTinyInteger('urgence')->nullable()
                  ->comment('1=Faible 2=Modéré 3=Urgent 4=Critique');
            $table->string('pathologie_detectee', 150)->nullable()
                  ->comment('Nom de la pathologie principale détectée');

            // ── Méta-données ──────────────────────────────────
            $table->unsignedSmallInteger('duree_analyse_ms')->nullable()
                  ->comment('Durée du traitement IA en millisecondes');

            $table->timestamps();

            // ── Index de performance ──────────────────────────
            $table->index(['user_id', 'created_at'],    'idx_consult_user_date');
            $table->index('urgence',                     'idx_consult_urgence');
            $table->index('pathologie_detectee',         'idx_consult_pathologie');
        });

        // ── Contraintes CHECK (MySQL seulement) ────────────────
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE consultations
                ADD CONSTRAINT chk_score_ia
                CHECK (score_ia BETWEEN 0 AND 100 OR score_ia IS NULL)");

            DB::statement("ALTER TABLE consultations
                ADD CONSTRAINT chk_urgence_consult
                CHECK (urgence BETWEEN 1 AND 4 OR urgence IS NULL)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
