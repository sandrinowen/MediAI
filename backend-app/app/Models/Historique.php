<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Historique
//  Table   : historique  (forcée — sans "s")
//  Archive lecture seule : pas de updated_at.
// ═══════════════════════════════════════════════════════════════
class Historique extends Model
{
    protected $table = 'historique';

    // Pas de colonne updated_at sur cette table
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'consultation_id',
        'resume',
        'pathologie',
        'score',
        'urgence',
        'date_consultation',
    ];

    protected function casts(): array
    {
        return [
            'score'             => 'float',
            'urgence'           => 'integer',
            'date_consultation' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
