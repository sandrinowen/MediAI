<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Diagnostic
//  Table   : diagnostics
//  Résultat structuré (JSON) généré par MedGemma à la fin d'une
//  conversation confirmée par le patient. Alimente le carnet.
// ═══════════════════════════════════════════════════════════════
class Diagnostic extends Model
{
    protected $fillable = [
        'conversation_id',
        'user_id',
        'title',
        'symptoms_summary',
        'hypotheses',
        'recommended_exams',
        'treatment',
        'alarm_signs',
        'disclaimer',
        'diagnosed_at',
    ];

    protected function casts(): array
    {
        return [
            'hypotheses' => 'array',
            'diagnosed_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
