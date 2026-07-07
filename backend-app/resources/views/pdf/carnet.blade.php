<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { color: #1B4F72; font-size: 12px; }
        h1 { color: #0F6E56; border-bottom: 3px solid #0F6E56; padding-bottom: 6px; }
        h2 { color: #185FA5; margin-top: 24px; font-size: 15px; }
        .meta { color: #566573; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #d0d7de; padding: 6px 8px; text-align: left; }
        th { background: #E1F5EE; color: #0F6E56; }
        .bio-box { background: #EEF4FB; border: 1px solid #185FA5; border-radius: 6px; padding: 10px; margin-top: 8px; }
        .bio-box span { display: inline-block; margin-right: 16px; }
        .details { background: #F8FBFD; color: #34495E; line-height: 1.45; }
        .details strong { color: #0F6E56; }
        .details ul { margin: 4px 0 8px 16px; padding: 0; }
        .urg-4 { color: #E74C3C; font-weight: bold; }
        .urg-3 { color: #BA7517; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 10px; color: #95A5A6; border-top: 1px solid #eee; padding-top: 8px; }
    </style>
</head>
<body>
    <h1>🩺 Carnet de Santé MediAI</h1>
    <p class="meta">
        <strong>{{ $user->prenom }} {{ $user->nom }}</strong> —
        {{ $user->sexe }} —
        Groupe sanguin : {{ $user->groupe_sanguin ?? 'N/A' }}<br>
        Email : {{ $user->email }} | Téléphone : {{ $user->telephone ?? 'N/A' }}<br>
        Généré le {{ $genere_le->format('d/m/Y à H:i') }}
    </p>

    @if($biometrics)
        <h2>Dernières mesures IoT</h2>
        <div class="bio-box">
            <span>🌡️ Temp : {{ $biometrics->temperature ?? '—' }} °C</span>
            <span>❤️ FC : {{ $biometrics->freq_cardiaque ?? '—' }} bpm</span>
            <span>🫁 SpO2 : {{ $biometrics->spo2 ?? '—' }} %</span>
            <span>🩸 PA : {{ $biometrics->pression_syst ?? '—' }}/{{ $biometrics->pression_diast ?? '—' }} mmHg</span>
            <span>🍬 Glycémie : {{ $biometrics->glycemie ?? '—' }} g/L</span>
            <span>💨 Resp : {{ $biometrics->freq_respiratoire ?? '—' }} /min</span>
        </div>
    @endif

    <h2>Historique des consultations ({{ $consultations->count() }})</h2>
    @if($consultations->isEmpty())
        <p>Aucune consultation enregistrée.</p>
    @else
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Pathologie détectée</th>
                    <th>Score IA</th>
                    <th>Urgence</th>
                </tr>
            </thead>
            <tbody>
                @foreach($consultations as $c)
                    @php
                        $principal = is_array($c->resultats) ? ($c->resultats[0] ?? []) : [];
                        $symptomes = is_array($c->symptomes) ? $c->symptomes : [];
                        $causes = is_array($principal['causes'] ?? null)
                            ? $principal['causes']
                            : (is_array($c->facteurs_risque) ? $c->facteurs_risque : []);
                        $prescriptions = is_array($principal['prescriptions'] ?? null)
                            ? $principal['prescriptions']
                            : (is_array($principal['recos'] ?? null) ? $principal['recos'] : []);
                        $diagnostic = $principal['diagnostic'] ?? $c->pathologie_detectee ?? null;
                    @endphp
                    <tr>
                        <td>{{ $c->created_at->format('d/m/Y') }}</td>
                        <td>{{ $c->pathologie_detectee ?? '—' }}</td>
                        <td>{{ $c->score_ia !== null ? $c->score_ia.' %' : '—' }}</td>
                        <td class="urg-{{ $c->urgence }}">{{ $c->urgence ?? '—' }}/4</td>
                    </tr>
                    @if($symptomes || $diagnostic || $causes || $prescriptions)
                        <tr>
                            <td colspan="4" class="details">
                                @if($symptomes)
                                    <strong>Symptômes décrits :</strong> {{ implode(', ', $symptomes) }}<br>
                                @endif
                                @if($diagnostic)
                                    <strong>Diagnostic IA :</strong> {{ $diagnostic }}<br>
                                @endif
                                @if($causes)
                                    <strong>Causes ou facteurs possibles :</strong>
                                    <ul>
                                        @foreach($causes as $cause)
                                            <li>{{ $cause }}</li>
                                        @endforeach
                                    </ul>
                                @endif
                                @if($prescriptions)
                                    <strong>Prescriptions / conduite à tenir :</strong>
                                    <ul>
                                        @foreach($prescriptions as $prescription)
                                            <li>{{ $prescription }}</li>
                                        @endforeach
                                    </ul>
                                @endif
                            </td>
                        </tr>
                    @endif
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        Document généré automatiquement par MediAI v2. À titre informatif uniquement —
        ne remplace pas l'avis d'un professionnel de santé.
    </div>
</body>
</html>
