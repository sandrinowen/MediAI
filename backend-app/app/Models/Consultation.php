<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Consultation
//  Table   : consultations
// ═══════════════════════════════════════════════════════════════
class Consultation extends Model
{
    protected $table = 'consultations';

    protected $fillable = [
        'user_id',
        'symptomes',
        'facteurs_risque',
        'age_consultation',
        'sexe_consultation',
        'iot_data',
        'biometrics_id',
        'resultats',
        'score_ia',
        'urgence',
        'pathologie_detectee',
        'duree_analyse_ms',
    ];

    protected function casts(): array
    {
        return [
            'symptomes'        => 'array',
            'facteurs_risque'  => 'array',
            'iot_data'         => 'array',
            'resultats'        => 'array',
            'score_ia'         => 'float',
            'urgence'          => 'integer',
            'age_consultation' => 'integer',
            'duree_analyse_ms' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function biometrics(): BelongsTo
    {
        return $this->belongsTo(DonneesBiometriques::class, 'biometrics_id');
    }

    public function historique(): HasMany
    {
        return $this->hasMany(Historique::class);
    }

    public function alertes(): HasMany
    {
        return $this->hasMany(Alerte::class);
    }
}
