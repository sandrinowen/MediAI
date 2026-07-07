<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        @page { margin: 32px 36px 60px 36px; }
        body { color: #1b2e22; font-size: 12px; }

        /* En-tête MediAI */
        .brand { border-bottom: 3px solid #2d6a4f; padding-bottom: 8px; margin-bottom: 14px; }
        .brand-title { color: #2d6a4f; font-size: 22px; font-weight: bold; }
        .brand-sub { color: #6b8f71; font-size: 11px; }
        .brand-meta { color: #6b8f71; font-size: 10px; text-align: right; margin-top: -20px; }

        .diag { page-break-after: always; }
        .diag:last-child { page-break-after: auto; }

        .diag-title { color: #2d6a4f; font-size: 17px; font-weight: bold; margin: 6px 0 2px 0; }
        .diag-date { color: #6b8f71; font-size: 10px; margin-bottom: 12px; }

        h2 { color: #2d6a4f; font-size: 13px; margin: 16px 0 6px 0; border-left: 4px solid #52b788; padding-left: 8px; }
        p.text { line-height: 1.5; color: #1b2e22; margin: 0 0 4px 0; }

        /* Barres de progression des hypothèses */
        .hyp { margin-bottom: 10px; }
        .hyp-head { margin-bottom: 3px; }
        .hyp-name { font-weight: bold; color: #1b2e22; }
        .hyp-pct { float: right; font-weight: bold; }
        .bar-bg { background: #e9f1ec; border-radius: 6px; height: 12px; width: 100%; }
        .bar-fill { height: 12px; border-radius: 6px; }
        .hyp-desc { color: #566b5b; font-size: 10px; margin-top: 3px; }

        .alarm { background: #fde8e1; border: 1px solid #e76f51; border-radius: 6px; padding: 8px 10px; color: #a83e26; }
        .disclaimer { margin-top: 18px; font-style: italic; color: #6b8f71; font-size: 10px; border-top: 1px solid #d4e6d9; padding-top: 8px; }

        /* Pied de page avec numéro de page (compteurs DomPDF) */
        .page-footer { position: fixed; bottom: -40px; left: 0; right: 0; height: 30px; color: #95a5a6; font-size: 9px; border-top: 1px solid #eee; padding-top: 6px; }
        .page-footer .right:after { content: "Page " counter(page) " / " counter(pages); }
    </style>
</head>
<body>
    <div class="page-footer">
        <span>MediAI — Carnet de diagnostics</span>
        <span class="right" style="float:right;"></span>
    </div>

    @if($diagnostics->isEmpty())
        <div class="brand">
            <div class="brand-title">🧬 MediAI</div>
            <div class="brand-sub">Carnet de diagnostics — {{ trim(($user->prenom ?? '').' '.($user->nom ?? '')) ?: $user->email }}</div>
        </div>
        <p class="text">Aucun diagnostic enregistré dans votre carnet.</p>
    @else
        @foreach($diagnostics as $d)
            <div class="diag">
                <div class="brand">
                    <div class="brand-title">🧬 MediAI</div>
                    <div class="brand-sub">Carnet de diagnostics — {{ trim(($user->prenom ?? '').' '.($user->nom ?? '')) ?: $user->email }}</div>
                    <div class="brand-meta">Généré le {{ $genere_le->format('d/m/Y à H:i') }}</div>
                </div>

                <div class="diag-title">{{ $d->title }}</div>
                <div class="diag-date">
                    Diagnostic du
                    {{ optional($d->diagnosed_at)->format('d/m/Y à H:i') ?? $d->created_at->format('d/m/Y à H:i') }}
                </div>

                <h2>Symptômes décrits</h2>
                <p class="text">{{ $d->symptoms_summary ?: 'Non renseignés.' }}</p>

                <h2>Hypothèses diagnostiques</h2>
                @forelse($d->hypotheses ?? [] as $h)
                    @php
                        $pct = max(0, min(100, (int) ($h['probability'] ?? 0)));
                        $color = $pct > 60 ? '#2d9d5f' : ($pct >= 30 ? '#f4a261' : '#e76f51');
                    @endphp
                    <div class="hyp">
                        <div class="hyp-head">
                            <span class="hyp-name">{{ $h['name'] ?? '—' }}</span>
                            <span class="hyp-pct" style="color: {{ $color }};">{{ $pct }}%</span>
                        </div>
                        <div class="bar-bg">
                            <div class="bar-fill" style="width: {{ $pct }}%; background: {{ $color }};"></div>
                        </div>
                        @if(!empty($h['description']))
                            <div class="hyp-desc">{{ $h['description'] }}</div>
                        @endif
                    </div>
                @empty
                    <p class="text">Aucune hypothèse fournie.</p>
                @endforelse

                <h2>Examens recommandés</h2>
                <p class="text">{{ $d->recommended_exams ?: 'Non renseignés.' }}</p>

                <h2>Traitement recommandé</h2>
                <p class="text">{{ $d->treatment ?: 'Non renseigné.' }}</p>

                <h2>Signes d'alarme</h2>
                <div class="alarm">{{ $d->alarm_signs ?: 'Aucun signe d\'alarme spécifié.' }}</div>

                <div class="disclaimer">
                    ⚠️ {{ $d->disclaimer ?: "MediAI est un outil d'aide — consultez un médecin pour toute décision médicale." }}
                </div>
            </div>
        @endforeach
    @endif
</body>
</html>
