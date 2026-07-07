<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : alertes
//  Modèle : Alerte
//  Source : Diagramme de classes MediAI v2
//  ✅ Compatible Laravel : Alerte → alertes (pas de pb)
//  Attributs : id, user_id (FK), consultation_id (FK),
//              niveau, message, score_risque, lu, horodatage
//  Peuplée automatiquement par triggers :
//    - trg_after_insert_consultation (urgence >= 3)
//    - trg_after_insert_biometrics   (métriques critiques)
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertes', function (Blueprint $table) {

            $table->id();

            // ── Clés étrangères ───────────────────────────────
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->onUpdate('restrict');

            $table->foreignId('consultation_id')
                  ->constrained('consultations')
                  ->onDelete('cascade')
                  ->onUpdate('restrict');

            // ── Données de l'alerte ───────────────────────────
            $table->enum('niveau', ['attention', 'urgence', 'critique'])
                  ->default('attention');
            $table->text('message');
            $table->decimal('score_risque', 5, 2)->nullable();
            $table->boolean('lu')->default(false);

            // Horodatage séparé de created_at pour plus de clarté
            $table->timestamp('horodatage')->useCurrent();
            $table->timestamp('created_at')->useCurrent();

            // ── Index ─────────────────────────────────────────
            $table->index(['user_id', 'lu'],  'idx_alertes_user_lu');
            $table->index('niveau',            'idx_alertes_niveau');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertes');
    }
};
