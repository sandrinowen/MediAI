<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// ═══════════════════════════════════════════════════════════════
//  TABLE : donnees_biometriques
//  Modèle : DonneesBiometriques
//  Source : Diagramme de classes MediAI v2 (SIMPLIFIÉ)
//  Attributs : id, user_id (FK),
//              temperature, freq_cardiaque, spo2,
//              contexte, timestamp
//  ⚠️ Ajouter dans le modèle :
//     protected $table = 'donnees_biometriques';
//  3 métriques IoT réelles (v2 simplifiée)
//  Capteurs : MLX90614 (temp) + MAX30102 (FC + SpO2)
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donnees_biometriques', function (Blueprint $table) {

            $table->id();

            // ── Clé étrangère ─────────────────────────────────
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->onUpdate('restrict');

            // ── 3 métriques capteurs réelles (v2 simplifiée) ──

            // Capteur MLX90614 — température corporelle infrarouge
            $table->decimal('temperature', 4, 1)->nullable()
                  ->comment('Température corporelle en °C');

            // Capteur MAX30102 — fréquence cardiaque
            $table->unsignedSmallInteger('freq_cardiaque')->nullable()
                  ->comment('Fréquence cardiaque en bpm');

            // Capteur MAX30102 — saturation O2
            $table->unsignedTinyInteger('spo2')->nullable()
                  ->comment('Saturation en oxygène SpO2 en %');

            // ── Contexte de mesure ────────────────────────────
            $table->enum('contexte', [
                'repos', 'effort', 'apres_repas', 'matin', 'soir'
            ])->nullable()->default('repos');

            // ── Horodatage (remplace created_at comme champ principal)
            $table->timestamp('timestamp')->useCurrent();
            $table->timestamps();

            // ── Index de performance ──────────────────────────
            $table->index(['user_id', 'timestamp'], 'idx_bio_user_time');
        });

        // ── Contraintes CHECK physiologiques (MySQL seulement) ──
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE donnees_biometriques
                ADD CONSTRAINT chk_temperature
                CHECK (temperature BETWEEN 30.0 AND 45.0 OR temperature IS NULL)");

            DB::statement("ALTER TABLE donnees_biometriques
                ADD CONSTRAINT chk_freq_cardiaque
                CHECK (freq_cardiaque BETWEEN 20 AND 300 OR freq_cardiaque IS NULL)");

            DB::statement("ALTER TABLE donnees_biometriques
                ADD CONSTRAINT chk_spo2
                CHECK (spo2 BETWEEN 50 AND 100 OR spo2 IS NULL)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('donnees_biometriques');
    }
};