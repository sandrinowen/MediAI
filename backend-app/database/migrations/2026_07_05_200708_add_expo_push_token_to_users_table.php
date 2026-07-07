<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  Ajoute expo_push_token à la table users.
//  Stocke le jeton Expo Push (ExponentPushToken[xxx]) du dispositif
//  de l'utilisateur pour l'envoi des notifications push.
// ═══════════════════════════════════════════════════════════════
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('expo_push_token')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('expo_push_token');
        });
    }
};
