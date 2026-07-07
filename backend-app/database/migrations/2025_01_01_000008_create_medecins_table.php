<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// ═══════════════════════════════════════════════════════════════
//  TABLE : medecins
//  Modèle : Medecin
//  Source : Diagramme de classes MediAI v2
//  ✅ Compatible Laravel : Medecin → medecins (pas de pb)
//  Attributs : id, nom, specialite, rating, emoji,
//              localisation, telephone, email,
//              horaires (JSON), actif
//  Méthodes : getDisponibilites(), getCreneaux()
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medecins', function (Blueprint $table) {

            $table->id();

            // ── Identité ──────────────────────────────────────
            $table->string('nom', 150);
            $table->string('specialite', 100);
            $table->decimal('rating', 3, 1)->nullable()->default(0.0)
                  ->comment('Note moyenne sur 5.0');
            $table->string('emoji', 10)->nullable()->default('👨‍⚕️');

            // ── Coordonnées ───────────────────────────────────
            $table->string('localisation', 200)->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('email', 255)->nullable();

            // ── Disponibilités ────────────────────────────────
            // Format JSON : {"lundi":["08h30","10h00"], "mardi":[...]}
            $table->json('horaires')->nullable()
                  ->comment('Créneaux disponibles par jour de la semaine');

            // ── Gestion ───────────────────────────────────────
            $table->boolean('actif')->default(true);
            $table->timestamps();

            // ── Index ─────────────────────────────────────────
            $table->index('specialite', 'idx_medecins_spec');
            $table->index('actif',      'idx_medecins_actif');
        });

        // ── Contrainte CHECK rating (MySQL seulement) ──────────
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE medecins
                ADD CONSTRAINT chk_rating
                CHECK (rating BETWEEN 0.0 AND 5.0 OR rating IS NULL)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('medecins');
    }
};
