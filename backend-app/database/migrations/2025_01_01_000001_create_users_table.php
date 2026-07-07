<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ═══════════════════════════════════════════════════════════════
//  TABLE : users
//  Modèle : Utilisateur
//  Source : Diagramme de classes MediAI v2
//  Attributs : id, nom, prenom, email, password, date_naissance,
//              sexe, groupe_sanguin, taille_cm, poids_kg,
//              allergies, antecedents, vaccinations, localisation,
//              telephone, dispositif_iot, consentements x3
// ═══════════════════════════════════════════════════════════════

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {

            // ── Identifiants ──────────────────────────────────
            $table->id();
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->string('email', 255)->unique();

            // Champ nommé "password" (standard Laravel)
            // Notre SQL avait "password_hash" → corrigé ici
            $table->string('password');

            // ── Informations personnelles ─────────────────────
            $table->date('date_naissance')->nullable();
            $table->enum('sexe', ['M', 'F', 'A'])->default('A');
            $table->string('groupe_sanguin', 5)->nullable()
                  ->comment('A+, A-, B+, B-, AB+, AB-, O+, O-');

            // ── Informations médicales (v2) ───────────────────
            $table->unsignedTinyInteger('taille_cm')->nullable()
                  ->comment('Taille en centimètres');
            $table->unsignedTinyInteger('poids_kg')->nullable()
                  ->comment('Poids en kilogrammes');
            $table->text('allergies')->nullable();
            $table->text('antecedents')->nullable();
            $table->text('vaccinations')->nullable();
            $table->string('localisation', 200)->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('dispositif_iot', 100)->nullable()
                  ->comment('Nom du dispositif ESP32 appairé');

            // ── Consentements (v2) ────────────────────────────
            $table->boolean('consent_diagnostic')->default(false);
            $table->boolean('consent_partage')->default(false);
            $table->boolean('consent_rgpd')->default(false);

            // ── Authentification Laravel (standard) ──────────
            $table->string('remember_token', 100)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->softDeletes(); // deleted_at (RGPD)
            $table->timestamps();  // created_at + updated_at
        });

        // ── Contraintes CHECK (MySQL 8+ seulement) ────────────
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users ADD CONSTRAINT chk_groupe_sanguin
                CHECK (groupe_sanguin IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')
                OR groupe_sanguin IS NULL)");

            DB::statement("ALTER TABLE users ADD CONSTRAINT chk_taille
                CHECK (taille_cm BETWEEN 30 AND 250 OR taille_cm IS NULL)");

            DB::statement("ALTER TABLE users ADD CONSTRAINT chk_poids
                CHECK (poids_kg BETWEEN 1 AND 300 OR poids_kg IS NULL)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
