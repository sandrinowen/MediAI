<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Conversation
//  Table   : conversations
//  Un fil de discussion IA (collecte de symptômes) pouvant aboutir
//  à un diagnostic structuré (table diagnostics).
// ═══════════════════════════════════════════════════════════════
class Conversation extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'status',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'status' => 'string',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function diagnostic(): HasOne
    {
        return $this->hasOne(Diagnostic::class);
    }
}
