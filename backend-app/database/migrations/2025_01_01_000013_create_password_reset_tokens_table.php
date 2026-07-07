<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  Table : password_reset_tokens
//  Stocke le code OTP (haché) de réinitialisation du mot de passe.
//  - email      : clé primaire (un code actif par adresse)
//  - token      : code à 6 chiffres haché (Hash::make)
//  - created_at : horodatage pour gérer l'expiration (10 min)
// ═══════════════════════════════════════════════════════════════
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
