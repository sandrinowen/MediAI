<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// ═══════════════════════════════════════════════════════════════
//  Modèle : DonneesBiometriques
//  Table   : donnees_biometriques  (forcée — pluriel irrégulier)
//  3 métriques IoT réelles (v2 simplifiée) :
//    • MLX90614  → température
//    • MAX30102  → fréquence cardiaque + SpO2
// ═══════════════════════════════════════════════════════════════
class DonneesBiometriques extends Model
{
    protected $table = 'donnees_biometriques';

    protected $fillable = [
        'user_id',
        'temperature',
        'freq_cardiaque',
        'spo2',
        'contexte',
        'timestamp',
    ];

    protected function casts(): array
    {
        return [
            'temperature'    => 'float',
            'freq_cardiaque' => 'integer',
            'spo2'           => 'integer',
            'timestamp'      => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Snapshot compact pour fusion dans le diagnostic IA.
     * Format attendu par le moteur Flask : {temp, hr, spo2}
     */
    public function toIotSnapshot(): array
    {
        return [
            'temp' => $this->temperature,
            'hr'   => $this->freq_cardiaque,
            'spo2' => $this->spo2,
        ];
    }
}