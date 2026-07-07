<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  Ajoute google_id : identifiant Google (sub) pour la connexion
//  sociale. Permet de lier un compte à un compte Google et d'éviter
//  l'usurpation par simple correspondance d'e-mail.
// ═══════════════════════════════════════════════════════════════
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_id');
        });
    }
};
