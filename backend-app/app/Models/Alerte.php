<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Alerte
//  Table   : alertes  (pas de updated_at)
// ═══════════════════════════════════════════════════════════════
class Alerte extends Model
{
    protected $table = 'alertes';

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'consultation_id',
        'niveau',
        'message',
        'score_risque',
        'lu',
        'horodatage',
    ];

    protected function casts(): array
    {
        return [
            'score_risque' => 'float',
            'lu'           => 'boolean',
            'horodatage'   => 'datetime',
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
