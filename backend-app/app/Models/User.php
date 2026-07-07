<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// ═══════════════════════════════════════════════════════════════
//  Modèle : User (Utilisateur)
//  Table   : users
//  Auth API mobile via Sanctum (HasApiTokens).
// ═══════════════════════════════════════════════════════════════
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'nom',
        'prenom',
        'email',
        'email_verified_at',
        'google_id',
        'password',
        'date_naissance',
        'sexe',
        'groupe_sanguin',
        'taille_cm',
        'poids_kg',
        'allergies',
        'antecedents',
        'vaccinations',
        'localisation',
        'telephone',
        'dispositif_iot',
        'has_sickle_cell',
        'has_diabetes',
        'has_hypertension',
        'consent_diagnostic',
        'consent_partage',
        'consent_rgpd',
        'role',
        'expo_push_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'date_naissance'     => 'date',
            'email_verified_at'  => 'datetime',
            'password'           => 'hashed',
            'consent_diagnostic' => 'boolean',
            'consent_partage'    => 'boolean',
            'consent_rgpd'       => 'boolean',
            'taille_cm'          => 'integer',
            'poids_kg'           => 'integer',
            'has_sickle_cell'   => 'boolean',
            'has_diabetes'      => 'boolean',
            'has_hypertension'  => 'boolean',
        ];
    }

    // ── Relations ─────────────────────────────────────────────
    // Fiche annuaire RDV (présente uniquement pour les comptes médecin).
    public function medecin(): HasOne
    {
        return $this->hasOne(Medecin::class);
    }

    public function biometrics(): HasMany
    {
        return $this->hasMany(DonneesBiometriques::class);
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class);
    }

    public function historique(): HasMany
    {
        return $this->hasMany(Historique::class);
    }

    public function rendezVous(): HasMany
    {
        return $this->hasMany(RendezVous::class);
    }

    public function alertes(): HasMany
    {
        return $this->hasMany(Alerte::class);
    }

    // Conversations IA (collecte de symptômes) et diagnostics structurés.
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function diagnostics(): HasMany
    {
        return $this->hasMany(Diagnostic::class);
    }

    // ── Helpers ───────────────────────────────────────────────
    public function getAgeAttribute(): ?int
    {
        return $this->date_naissance?->age;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isMedecin(): bool
    {
        return $this->role === 'medecin';
    }
}
