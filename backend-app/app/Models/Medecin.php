<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Medecin
//  Table   : medecins
// ═══════════════════════════════════════════════════════════════
class Medecin extends Model
{
    protected $table = 'medecins';

    protected $fillable = [
        'user_id',
        'nom',
        'specialite',
        'rating',
        'emoji',
        'localisation',
        'telephone',
        'email',
        'horaires',
        'actif',
    ];

    protected function casts(): array
    {
        return [
            'rating'   => 'float',
            'horaires' => 'array',
            'actif'    => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function rendezVous(): HasMany
    {
        return $this->hasMany(RendezVous::class, 'medecin_id');
    }

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }

    /**
     * Créneaux disponibles pour une date donnée (horaires moins les RDV pris).
     */
    public function creneauxDisponibles(string $date): array
    {
        $jour = strtolower(\Carbon\Carbon::parse($date)->locale('fr')->isoFormat('dddd'));
        $tous = $this->horaires[$jour] ?? [];

        $pris = $this->rendezVous()
            ->where('date_rdv', $date)
            ->whereIn('statut', ['planifie', 'confirme'])
            ->pluck('creneau')
            ->map(fn ($c) => substr($c, 0, 5)) // HH:MM
            ->all();

        return array_values(array_map(
            fn ($slot) => ['heure' => $slot, 'disponible' => ! in_array($slot, $pris, true)],
            $tous
        ));
    }
}
