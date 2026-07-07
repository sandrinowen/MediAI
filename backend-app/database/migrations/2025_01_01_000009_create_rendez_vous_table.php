<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : rendez_vous
//  Modèle : RendezVous
//  Source : Diagramme de classes MediAI v2
//  🔴 PROBLÈME LARAVEL : L'algorithme de pluriel de Laravel
//     va échouer sur "rendez_vous" et chercher "rendez_vouses".
//     Solution : dans le modèle ajouter :
//     protected $table = 'rendez_vous';
//  Attributs : id, user_id (FK), medecin_id (FK),
//              consultation_id (FK nullable),
//              date_rdv, creneau, statut, motif, note_medecin
//  Méthodes : book(), cancel(), confirm()
//  Contrainte unique : medecin_id + date_rdv + creneau
//                      (1 médecin = 1 patient par créneau)
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        // Nom exact : "rendez_vous" (avec underscore)
        // Le modèle doit avoir : protected $table = 'rendez_vous';
        Schema::create('rendez_vous', function (Blueprint $table) {

            $table->id();

            // ── Clés étrangères ───────────────────────────────
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->onUpdate('restrict');

            $table->foreignId('medecin_id')
                  ->constrained('medecins')
                  ->onDelete('restrict')  // On ne supprime pas un médecin ayant des RDV
                  ->onUpdate('restrict');

            // Consultation ayant déclenché le RDV (optionnel)
            $table->foreignId('consultation_id')
                  ->nullable()
                  ->constrained('consultations')
                  ->onDelete('set null')
                  ->onUpdate('restrict');

            // ── Données du rendez-vous ────────────────────────
            $table->date('date_rdv');
            $table->time('creneau')->comment('Heure du rendez-vous HH:MM:SS');
            $table->enum('statut', ['planifie', 'confirme', 'annule', 'effectue'])
                  ->default('planifie');
            $table->text('motif')->nullable();
            $table->text('note_medecin')->nullable();

            $table->timestamps();

            // ── Contrainte unique : 1 médecin par créneau ─────
            $table->unique(
                ['medecin_id', 'date_rdv', 'creneau'],
                'uq_rdv_creneau'
            );

            // ── Index ─────────────────────────────────────────
            $table->index(['user_id', 'date_rdv'],    'idx_rdv_user');
            $table->index(['medecin_id', 'date_rdv'], 'idx_rdv_medecin_date');
            $table->index('statut',                   'idx_rdv_statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous');
    }
};
