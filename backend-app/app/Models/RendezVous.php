<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ═══════════════════════════════════════════════════════════════
//  Modèle : RendezVous
//  Table   : rendez_vous  (forcée — pluriel irrégulier)
// ═══════════════════════════════════════════════════════════════
class RendezVous extends Model
{
    protected $table = 'rendez_vous';

    protected $fillable = [
        'user_id',
        'medecin_id',
        'consultation_id',
        'date_rdv',
        'creneau',
        'statut',
        'motif',
        'note_medecin',
    ];

    protected function casts(): array
    {
        return [
            'date_rdv' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function medecin(): BelongsTo
    {
        return $this->belongsTo(Medecin::class, 'medecin_id');
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }
}
