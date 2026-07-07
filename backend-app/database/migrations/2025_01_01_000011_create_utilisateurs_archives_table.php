<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : utilisateurs_archives
//  Modèle : UtilisateurArchive
//  Source : Diagramme de classes MediAI v2 (RGPD)
//  🔴 PROBLÈME LARAVEL : "UtilisateurArchive" → Laravel cherche
//     "utilisateur_archives". Mieux vaut forcer dans le modèle :
//     protected $table = 'utilisateurs_archives';
//  Attributs : id, user_id_original, email, nom, prenom,
//              data_complete (JSON), raison, archive_at
//  Peuplée par : Trigger trg_before_delete_utilisateur
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        // Nom exact : "utilisateurs_archives"
        // Le modèle doit avoir : protected $table = 'utilisateurs_archives';
        Schema::create('utilisateurs_archives', function (Blueprint $table) {

            $table->id();

            // ── Référence à l'utilisateur supprimé ────────────
            // PAS une FK car l'utilisateur sera supprimé
            $table->unsignedBigInteger('user_id_original');

            // ── Données minimales pour identification ─────────
            $table->string('email', 255);
            $table->string('nom', 100);
            $table->string('prenom', 100);

            // ── Snapshot complet du profil (RGPD) ────────────
            $table->json('data_complete')
                  ->comment('Snapshot JSON complet du profil au moment de la suppression');

            // ── Méta-données ──────────────────────────────────
            $table->string('raison', 100)->nullable()->default('suppression_compte');
            $table->timestamp('archive_at')->useCurrent();

            // ── Index ─────────────────────────────────────────
            $table->index('user_id_original', 'idx_archive_user');
            $table->index('email',            'idx_archive_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilisateurs_archives');
    }
};
