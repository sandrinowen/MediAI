<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : historique
//  Modèle : Historique
//  Source : Diagramme de classes MediAI v2
//  🔴 PROBLÈME LARAVEL : Modèle "Historique" → Laravel cherche
//     "historiques" (avec s). Solution : dans le modèle ajouter :
//     protected $table = 'historique';
//  Attributs : id, user_id (FK), consultation_id (FK),
//              resume, pathologie, score, urgence,
//              date_consultation
//  Peuplée automatiquement par le Trigger trg_after_insert_consultation
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        // Nom exact : "historique" (sans s)
        // Le modèle doit avoir : protected $table = 'historique';
        Schema::create('historique', function (Blueprint $table) {

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

            // ── Données résumées ──────────────────────────────
            $table->text('resume')->nullable()
                  ->comment('Résumé textuel généré automatiquement par trigger');
            $table->string('pathologie', 150)->nullable();
            $table->decimal('score', 5, 2)->nullable();
            $table->unsignedTinyInteger('urgence')->nullable();

            // ── Date de la consultation ───────────────────────
            $table->timestamp('date_consultation');

            // Pas de updated_at (lecture seule — archive)
            $table->timestamp('created_at')->useCurrent();

            // ── Index ─────────────────────────────────────────
            $table->index(['user_id', 'date_consultation'], 'idx_hist_user_date');
            $table->index('consultation_id',                'idx_hist_consult');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historique');
    }
};
