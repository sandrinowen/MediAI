<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// ═══════════════════════════════════════════════════════════════
//  Modèle : Maladie (Base de Connaissances du moteur IA)
//  Table   : maladies
// ═══════════════════════════════════════════════════════════════
class Maladie extends Model
{
    protected $table = 'maladies';

    protected $fillable = [
        'code',
        'nom',
        'categorie',
        'icd11',
        'urgence',
        'seuil',
        'symptomes_princ',
        'symptomes_sec',
        'facteurs_risque',
        'recommandations',
        'actif',
    ];

    protected function casts(): array
    {
        return [
            'urgence'         => 'integer',
            'seuil'           => 'float',
            'symptomes_princ' => 'array',
            'symptomes_sec'   => 'array',
            'facteurs_risque' => 'array',
            'recommandations' => 'array',
            'actif'           => 'boolean',
        ];
    }

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}
