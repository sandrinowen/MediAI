<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// ═══════════════════════════════════════════════════════════════
//  Modèle : UtilisateurArchive (RGPD)
//  Table   : utilisateurs_archives
// ═══════════════════════════════════════════════════════════════
class UtilisateurArchive extends Model
{
    protected $table = 'utilisateurs_archives';

    public const UPDATED_AT = null;
    public const CREATED_AT = null;

    protected $fillable = [
        'user_id_original',
        'email',
        'nom',
        'prenom',
        'data_complete',
        'raison',
        'archive_at',
    ];

    protected function casts(): array
    {
        return [
            'data_complete' => 'array',
            'archive_at'    => 'datetime',
        ];
    }
}
