<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : medecins — lien vers le compte utilisateur
//  Permet à une inscription avec role='medecin' de créer une fiche
//  dans l'annuaire RDV rattachée au compte (réservable par les patients).
//  Nullable : les fiches médecins « historiques » (seed) restent valides.
// ═══════════════════════════════════════════════════════════════
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medecins', function (Blueprint $table) {
            $table->foreignId('user_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('Compte utilisateur rattaché (inscription médecin)');
        });
    }

    public function down(): void
    {
        Schema::table('medecins', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
