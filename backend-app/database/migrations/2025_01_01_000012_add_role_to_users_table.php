<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : users — ajout du rôle (RBAC)
//  Rôles : patient (défaut), medecin, admin.
//  Nécessaire pour les écrans Admin du mobile (gestion + stats).
// ═══════════════════════════════════════════════════════════════
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['patient', 'medecin', 'admin'])
                  ->default('patient')
                  ->after('consent_rgpd')
                  ->comment('Rôle RBAC : patient | medecin | admin');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
