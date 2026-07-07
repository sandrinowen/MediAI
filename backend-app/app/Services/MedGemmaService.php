<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Consultation;
use App\Models\Conversation;
use App\Models\Diagnostic;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MedGemmaService
{
    /** Balise que l'IA doit émettre lorsqu'elle veut confirmer les symptômes. */
    public const CONFIRMATION_TAG = '[CONFIRMATION_REQUISE]';

    private ?string $hfToken;
    private string $modelUrl;
    private string $model;

    public function __construct()
    {
        $this->hfToken = config('services.huggingface.token');
        $this->modelUrl = config('services.huggingface.model_url');
        $this->model = config('services.huggingface.model', 'google/medgemma-4b-it');
    }

    public function chat(User $user, string $newMessage, array $iotData = []): array
    {
        ChatMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $newMessage,
            'iot_data' => $iotData ?: null,
        ]);

        $history = $this->buildHistory($user);
        $systemPrompt = $this->buildSystemPrompt($user, $iotData);
        $result = $this->callHuggingFace($systemPrompt, $history);

        ChatMessage::create([
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $result['response'],
            'model' => $result['model'],
        ]);

        if ($result['success']) {
            $this->storeConsultationFromChat($user, $newMessage, $iotData, $result['response']);
        }

        return $result;
    }

    // ═══════════════════════════════════════════════════════════
    //  FLUX CONVERSATIONNEL (v3) — collecte de symptômes puis
    //  génération d'un diagnostic structuré confirmé par le patient.
    // ═══════════════════════════════════════════════════════════

    /**
     * Point d'entrée du chat multi-conversations.
     *
     * Deux modes :
     *  - MODE 1 (discussion) : l'IA affine les symptômes et pose la question
     *    de confirmation lorsqu'elle a assez d'informations (balise CONFIRMATION_TAG).
     *  - MODE 2 (diagnostic final) : déclenché quand le patient répond « Oui »
     *    à la confirmation → génération d'un JSON structuré sauvegardé en base.
     *
     * @return array{success:bool,response:string,model:string,needs_confirmation:bool,is_final_diagnostic:bool,diagnostic:?Diagnostic}
     */
    public function converse(User $user, Conversation $conversation, string $newMessage, array $iotData = []): array
    {
        $awaitingConfirmation = $this->isAwaitingConfirmation($conversation);
        $confirmed = $awaitingConfirmation && $this->isAffirmative($newMessage);

        // 1) Message patient
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $newMessage,
            'iot_data' => $iotData ?: null,
        ]);

        // Titre auto depuis le premier symptôme décrit
        if (blank($conversation->title)) {
            $conversation->update(['title' => $this->makeTitle($newMessage)]);
        }

        // 2) MODE 2 — génération du diagnostic final
        if ($confirmed) {
            return $this->generateFinalDiagnostic($user, $conversation, $iotData);
        }

        // 3) MODE 1 — discussion / collecte
        $history = $this->buildConversationHistory($conversation);
        $systemPrompt = $this->buildSystemPrompt($user, $iotData)
            ."\n\n".$this->buildConfirmationInstruction();
        $result = $this->callHuggingFace($systemPrompt, $history);

        $rawResponse = $result['response'];
        $needsConfirmation = $result['success'] && str_contains($rawResponse, self::CONFIRMATION_TAG);
        $cleanResponse = $this->stripConfirmationTag($rawResponse);

        // On conserve la balise en base (détection au tour suivant), on la retire
        // uniquement dans la réponse renvoyée au client.
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $rawResponse,
            'model' => $result['model'],
        ]);

        return [
            'success' => $result['success'],
            'response' => $cleanResponse,
            'model' => $result['model'],
            'needs_confirmation' => $needsConfirmation,
            'is_final_diagnostic' => false,
            'diagnostic' => null,
        ];
    }

    /**
     * MODE 2 — demande à MedGemma un JSON structuré, le parse, le sauvegarde
     * dans la table diagnostics et clôture la conversation.
     */
    private function generateFinalDiagnostic(User $user, Conversation $conversation, array $iotData): array
    {
        $history = $this->buildConversationHistory($conversation);
        $systemPrompt = $this->buildSystemPrompt($user, $iotData);

        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history,
            [['role' => 'user', 'content' => $this->buildFinalInstruction()]],
        );

        $result = $this->callChatCompletion($messages);
        $data = $result['success'] ? $this->parseDiagnosticJson($result['response']) : null;

        // Échec (IA indispo ou JSON illisible) : on ne clôture pas la conversation.
        if (! $data) {
            $fallbackText = $result['success']
                ? "Je n'ai pas réussi à structurer le diagnostic final. Pouvez-vous confirmer à nouveau ou préciser un symptôme ?"
                : $result['response'];

            ChatMessage::create([
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'role' => 'assistant',
                'content' => $fallbackText,
                'model' => $result['model'],
            ]);

            return [
                'success' => false,
                'response' => $fallbackText,
                'model' => $result['model'],
                'needs_confirmation' => false,
                'is_final_diagnostic' => false,
                'diagnostic' => null,
            ];
        }

        // Le résumé des symptômes est reconstruit à partir de TOUS les messages
        // du patient (role=user) de la conversation, indépendamment du JSON IA.
        $symptomsSummary = $this->buildSymptomsSummary($conversation) ?: $data['symptoms_summary'];

        $diagnostic = Diagnostic::updateOrCreate(
            ['conversation_id' => $conversation->id],
            [
                'user_id' => $user->id,
                'title' => $data['title'],
                'symptoms_summary' => $symptomsSummary,
                'hypotheses' => $data['hypotheses'],
                'recommended_exams' => $data['recommended_exams'],
                'treatment' => $data['treatment'],
                'alarm_signs' => $data['alarm_signs'],
                'disclaimer' => $data['disclaimer'],
                'diagnosed_at' => now(),
            ],
        );

        $conversation->update([
            'status' => 'completed',
            'completed_at' => now(),
            'title' => $data['title'] ?: $conversation->title,
        ]);

        $summaryText = $this->buildDiagnosticSummaryText($data);

        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $summaryText,
            'model' => $result['model'],
        ]);

        return [
            'success' => true,
            'response' => $summaryText,
            'model' => $result['model'],
            'needs_confirmation' => false,
            'is_final_diagnostic' => true,
            'diagnostic' => $diagnostic,
        ];
    }

    /**
     * Construit le résumé des symptômes à partir de tous les messages
     * du patient (role=user) de la conversation. Le dernier message
     * (la confirmation « oui ») est exclu car il n'apporte aucun symptôme.
     */
    private function buildSymptomsSummary(Conversation $conversation): string
    {
        $userMessages = $conversation->messages()
            ->where('role', 'user')
            ->orderBy('created_at')
            ->pluck('content')
            ->map(fn ($content) => trim(preg_replace('/\s+/', ' ', (string) $content) ?? ''))
            ->filter()
            ->values();

        // Retire le dernier message s'il s'agit de la confirmation finale.
        if ($userMessages->isNotEmpty() && $this->isAffirmative($userMessages->last())) {
            $userMessages = $userMessages->slice(0, -1)->values();
        }

        $summary = $userMessages->implode('. ');

        return mb_substr($summary, 0, 2000);
    }

    /** Le dernier message assistant contient-il la balise de confirmation ? */
    private function isAwaitingConfirmation(Conversation $conversation): bool
    {
        $last = $conversation->messages()
            ->where('role', 'assistant')
            ->latest()
            ->first();

        return $last !== null && str_contains((string) $last->content, self::CONFIRMATION_TAG);
    }

    /** Historique d'une conversation (balise de confirmation retirée). */
    private function buildConversationHistory(Conversation $conversation): array
    {
        return $conversation->messages()
            ->orderBy('created_at')
            ->limit(40)
            ->get()
            ->map(fn (ChatMessage $message) => [
                'role' => $message->role,
                'content' => $this->stripConfirmationTag((string) $message->content),
            ])
            ->values()
            ->toArray();
    }

    private function stripConfirmationTag(string $text): string
    {
        return trim(str_replace(self::CONFIRMATION_TAG, '', $text));
    }

    /** Réponse patient interprétée comme « oui, ce sont tous mes symptômes ». */
    private function isAffirmative(string $message): bool
    {
        $clean = mb_strtolower(trim($message));
        $clean = preg_replace('/[.!]+$/u', '', $clean) ?? $clean;

        if ($clean === '') {
            return false;
        }

        // Refus explicite prioritaire (« non, j'ai d'autres symptômes »)
        if (preg_match('/^(non|no|nan|pas |autre|j\'ai d)/u', $clean)) {
            return false;
        }

        return (bool) preg_match(
            '/^(oui|ouais|yes|yep|ok|okay|d\'accord|daccord|voil[aà]|exact|exactement|c\'est (bien )?(tout|[cç]a)|tout est l[aà]|absolument|confirm)/u',
            $clean,
        ) || str_contains($clean, 'oui');
    }

    /** Titre court dérivé du premier message patient. */
    private function makeTitle(string $message): string
    {
        $clean = trim(preg_replace('/\s+/', ' ', $message) ?? $message);

        return mb_substr($clean, 0, 60) ?: 'Nouvelle consultation';
    }

    /** Instruction MODE 1 ajoutée par-dessus le system prompt camerounais. */
    private function buildConfirmationInstruction(): string
    {
        $tag = self::CONFIRMATION_TAG;

        return <<<PROMPT
## COLLECTE DES SYMPTOMES ET CONFIRMATION
- Tu es en phase de collecte : discute librement et pose UNE seule question de suivi a la fois pour affiner les symptomes.
- Quand tu estimes avoir collecte suffisamment de symptomes (au moins 3 echanges), tu DOIS d'abord demander : "Est-ce que ce sont bien tous les symptomes que vous ressentez en ce moment ?" puis terminer ton message par exactement cette balise : {$tag} sans rien apres.
- N'utilise la balise {$tag} qu'une seule fois, uniquement quand tu es pret a conclure.
- Ne genere JAMAIS toi-meme le diagnostic final structure dans cette phase : attends la confirmation du patient.
PROMPT;
    }

    /** Instruction MODE 2 — force un JSON structuré. */
    private function buildFinalInstruction(): string
    {
        return <<<PROMPT
Le patient vient de confirmer la liste complete de ses symptomes. Genere maintenant le DIAGNOSTIC FINAL.
Reponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou apres, sans bloc Markdown, respectant EXACTEMENT ce format :
{
  "title": "Titre court du diagnostic principal",
  "symptoms_summary": "Resume des symptomes decrits par le patient",
  "hypotheses": [
    { "name": "Nom de la maladie", "probability": 78, "description": "Explication courte" }
  ],
  "recommended_exams": "Liste des examens recommandes",
  "treatment": "Traitement recommande selon protocoles MINSANTE + OMS",
  "alarm_signs": "Signes necessitant une consultation urgente",
  "disclaimer": "MediAI est un outil d'aide - consultez un medecin"
}
Contraintes : "probability" est un entier entre 0 et 100 ; classe les hypotheses par probabilite decroissante ; priorise les pathologies frequentes au Cameroun (paludisme, typhoide, etc.).
PROMPT;
    }

    /**
     * Extrait et normalise l'objet JSON renvoyé par MedGemma.
     *
     * @return array<string,mixed>|null
     */
    private function parseDiagnosticJson(string $response): ?array
    {
        $text = trim($response);
        // Retire d'éventuelles clôtures Markdown ```json ... ```
        $text = preg_replace('/^```(?:json)?/i', '', $text);
        $text = preg_replace('/```$/', '', $text ?? '');
        $text = trim($text ?? '');

        // Isole le premier objet JSON.
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false || $end <= $start) {
            return null;
        }
        $json = substr($text, $start, $end - $start + 1);

        $data = json_decode($json, true);
        if (! is_array($data)) {
            return null;
        }

        $hypotheses = [];
        foreach ((array) ($data['hypotheses'] ?? []) as $item) {
            if (! is_array($item)) {
                continue;
            }
            $name = trim((string) ($item['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $hypotheses[] = [
                'name' => $name,
                'probability' => max(0, min(100, (int) ($item['probability'] ?? 0))),
                'description' => trim((string) ($item['description'] ?? '')),
            ];
        }

        usort($hypotheses, fn ($a, $b) => $b['probability'] <=> $a['probability']);

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '' && $hypotheses) {
            $title = 'Suspicion de '.$hypotheses[0]['name'];
        }
        if ($title === '') {
            $title = 'Diagnostic MediAI';
        }

        return [
            'title' => $title,
            'symptoms_summary' => trim((string) ($data['symptoms_summary'] ?? '')),
            'hypotheses' => $hypotheses,
            'recommended_exams' => trim((string) ($data['recommended_exams'] ?? '')),
            'treatment' => trim((string) ($data['treatment'] ?? '')),
            'alarm_signs' => trim((string) ($data['alarm_signs'] ?? '')),
            'disclaimer' => trim((string) ($data['disclaimer'] ?? '')) ?: "MediAI est un outil d'aide - consultez un medecin.",
        ];
    }

    /** Message assistant convivial affiché sous la carte diagnostic. */
    private function buildDiagnosticSummaryText(array $data): string
    {
        $main = $data['hypotheses'][0] ?? null;
        $lead = $main
            ? "Hypothese principale : {$main['name']} ({$main['probability']}%)."
            : '';

        return trim(
            "Voici votre diagnostic : {$data['title']}. {$lead} "
            ."Retrouvez le detail (examens, traitement, signes d'alarme) dans votre carnet de sante.\n\n"
            .($data['disclaimer'] ?: "MediAI est un outil d'aide - consultez un medecin.")
        );
    }

    private function buildHistory(User $user): array
    {
        return ChatMessage::where('user_id', $user->id)
            ->latest()
            ->limit(30)
            ->get()
            ->reverse()
            ->map(fn (ChatMessage $message) => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->values()
            ->toArray();
    }

    private function callHuggingFace(string $systemPrompt, array $history): array
    {
        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history,
        );

        return $this->callChatCompletion($messages);
    }

    /**
     * Appel bas niveau à MedGemma avec une liste de messages déjà construite.
     */
    private function callChatCompletion(array $messages): array
    {
        if (empty($this->hfToken) || empty($this->modelUrl)) {
            Log::warning('MedGemma configuration missing');

            return $this->fallback(
                "Le moteur IA n'est pas encore configuré. Ajoutez HUGGINGFACE_API_TOKEN dans le fichier .env du backend.",
                'configuration'
            );
        }

        try {
            $response = Http::withToken($this->hfToken)
                ->acceptJson()
                ->timeout((int) config('services.huggingface.timeout', 60))
                ->retry(2, 1000)
                ->post($this->modelUrl, [
                    'model' => $this->model,
                    'messages' => $messages,
                    'max_tokens' => 1024,
                    'temperature' => 0.3,
                    'top_p' => 0.9,
                    'stream' => false,
                ]);

            if ($response->failed()) {
                Log::error('MedGemma error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return $this->fallback();
            }

            $text = $this->extractText($response->json());

            if (! $text) {
                Log::warning('MedGemma empty response', ['body' => $response->body()]);

                return $this->fallback();
            }

            return [
                'success' => true,
                'response' => trim($text),
                'model' => $this->model,
            ];
        } catch (\Throwable $e) {
            Log::error('MedGemma exception', ['message' => $e->getMessage()]);

            return $this->fallback();
        }
    }

    private function extractText(array $data): ?string
    {
        $content = $data['choices'][0]['message']['content']
            ?? $data['generated_text']
            ?? $data[0]['generated_text']
            ?? null;

        if (is_string($content)) {
            return $content;
        }

        if (is_array($content)) {
            return collect($content)
                ->map(fn ($part) => is_array($part) ? ($part['text'] ?? '') : (string) $part)
                ->filter()
                ->implode("\n");
        }

        return null;
    }

    private function buildSystemPrompt(User $user, array $iotData): string
    {
        $displayName = trim(($user->prenom ?? '').' '.($user->nom ?? '')) ?: 'patient';
        $firstName = $user->prenom ?: $user->nom ?: 'patient';
        $sex = match ($user->sexe) {
            'M' => 'masculin',
            'F' => 'féminin',
            default => 'autre ou non renseigné',
        };

        $profileLines = [];
        if ($user->age !== null) {
            $profileLines[] = "- Age : {$user->age} ans";
        }
        if ($user->sexe) {
            $profileLines[] = "- Sexe : {$sex}";
        }
        if ($user->localisation) {
            $profileLines[] = "- Localisation : {$user->localisation}";
        }
        if ($user->groupe_sanguin) {
            $profileLines[] = "- Groupe sanguin : {$user->groupe_sanguin}";
        }
        if ($user->taille_cm) {
            $profileLines[] = "- Taille : {$user->taille_cm} cm";
        }
        if ($user->poids_kg) {
            $profileLines[] = "- Poids : {$user->poids_kg} kg";
        }
        if ($user->allergies) {
            $profileLines[] = "- Allergies : {$user->allergies}";
        }
        if ($user->antecedents) {
            $profileLines[] = "- Antecedents : {$user->antecedents}";
        }
        if ($user->vaccinations) {
            $profileLines[] = "- Vaccinations : {$user->vaccinations}";
        }

        $profileBlock = $profileLines
            ? "## PROFIL PATIENT (ne pas mentionner sauf si utile)\n".implode("\n", $profileLines)
            : "## PROFIL PATIENT\n- Non renseigne";

        $iotBlock = $this->buildIotBlock($iotData);

        $month = (int) now()->format('n');
        $season = in_array($month, [3, 4, 5, 6, 7, 8, 9, 10], true)
            ? 'Saison des pluies au Cameroun : risque plus eleve de paludisme et maladies hydriques.'
            : 'Saison seche au Cameroun : risque plus eleve d infections respiratoires et meningites.';

        return <<<PROMPT
Tu es MediAI, un assistant medical conversationnel bilingue francais/anglais concu pour le systeme de sante camerounais.
Tu aides a orienter le patient, sans poser de diagnostic definitif et sans remplacer un professionnel de sante.

Patient connecte : {$displayName}. Utilise le prenom "{$firstName}" naturellement si cela rend la conversation plus claire.

## COMPORTEMENT
- Reponds en francais par defaut, en anglais si le patient ecrit en anglais.
- Pose une seule question de suivi a la fois.
- Si les symptomes sont alarmants, arrete le questionnement et oriente vers les urgences.
- Explique simplement les hypotheses, examens utiles, signes d alarme et prochaines actions.
- Ne donne pas de posologie personnalisee sans recommander une confirmation par un professionnel.

## STRUCTURE ATTENDUE
1. Reformule brievement ce que tu comprends.
2. Propose une ou deux hypotheses probables si les informations suffisent.
3. Pose une question precise pour affiner.
4. Quand l information est suffisante, donne une synthese : diagnostic probable, causes ou facteurs possibles, prescriptions/conduite a tenir, signes d alarme.
5. Dans cette synthese, utilise si possible ces libelles courts pour faciliter le carnet medical : "Diagnostic probable", "Causes possibles", "Prescriptions / conduite a tenir".

{$profileBlock}{$iotBlock}

## SAISON ACTUELLE
{$season}

## PATHOLOGIES PRIORITAIRES AU CAMEROUN
Priorise selon le contexte : paludisme, fievre typhoide, tuberculose, VIH/SIDA, cholera, dengue, drepanocytose, malnutrition, diabete type 2, hypertension.

## LIMITES ET URGENCES
- Jamais de diagnostic definitif : recommander une confirmation medicale.
- Urgence immediate si convulsions, detresse respiratoire, confusion, choc, hemorragie, douleur thoracique intense, SpO2 basse, enfant de moins de 5 ans tres malade, femme enceinte avec signes graves.
- En cas d urgence au Cameroun : SAMU 15, Pompiers 18, ou urgences les plus proches.
- Termine les syntheses par : "MediAI est un outil d'aide - consultez un medecin."
PROMPT;
    }

    private function buildIotBlock(array $iotData): string
    {
        if (! $iotData) {
            return '';
        }

        $lines = [];
        if (isset($iotData['temperature'])) {
            $lines[] = "- Temperature : {$iotData['temperature']} degC";
        }
        if (isset($iotData['spo2'])) {
            $lines[] = "- SpO2 : {$iotData['spo2']}%";
        }
        if (isset($iotData['heartRate'])) {
            $lines[] = "- Frequence cardiaque : {$iotData['heartRate']} bpm";
        }
        if (isset($iotData['bloodPressure'])) {
            $lines[] = "- Pression arterielle : {$iotData['bloodPressure']}";
        }
        if (isset($iotData['glucose'])) {
            $lines[] = "- Glycemie : {$iotData['glucose']} g/L";
        }
        if (isset($iotData['respiratoryRate'])) {
            $lines[] = "- Frequence respiratoire : {$iotData['respiratoryRate']} cycles/min";
        }

        if (! $lines) {
            return '';
        }

        return "\n\n## DONNEES CAPTEURS IOT ESP32\n"
            .implode("\n", $lines)
            ."\nIntegre ces mesures dans le raisonnement clinique, en restant prudent.";
    }

    private function storeConsultationFromChat(User $user, string $patientMessage, array $iotData, string $assistantResponse): void
    {
        $details = $this->extractMedicalDetails($assistantResponse);
        $diagnostic = $details['diagnostic'] ?: 'Diagnostic IA';

        Consultation::create([
            'user_id' => $user->id,
            'symptomes' => $this->extractSymptoms($patientMessage),
            'facteurs_risque' => $details['causes'],
            'age_consultation' => $user->age,
            'sexe_consultation' => $user->sexe,
            'iot_data' => $this->normalizeIotData($iotData),
            'resultats' => [[
                'maladie' => $diagnostic,
                'diagnostic' => $details['diagnostic'] ?: $diagnostic,
                'causes' => $details['causes'],
                'prescriptions' => $details['prescriptions'],
                'resume_ia' => $assistantResponse,
            ]],
            'score_ia' => $this->estimateScore($assistantResponse),
            'urgence' => $this->estimateUrgency($assistantResponse, $iotData),
            'pathologie_detectee' => mb_substr($diagnostic, 0, 150),
        ]);
    }

    private function extractSymptoms(string $message): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $message));

        return $clean === '' ? [] : [$clean];
    }

    private function extractMedicalDetails(string $response): array
    {
        $text = trim($response);

        return [
            'diagnostic' => $this->extractLabeledValue($text, [
                'Diagnostic probable', 'Diagnostic', 'Hypothese probable', 'Hypothèse probable', 'Pathologie probable',
            ]) ?: $this->extractLikelyDisease($text),
            'causes' => $this->extractListAfterLabels($text, [
                'Causes possibles', 'Causes', 'Facteurs possibles', 'Facteurs de risque',
            ]),
            'prescriptions' => $this->extractListAfterLabels($text, [
                'Prescriptions / conduite a tenir', 'Prescriptions / conduite à tenir', 'Prescriptions', 'Traitement', 'Conduite a tenir', 'Conduite à tenir', 'Recommandations',
            ]),
        ];
    }

    private function extractLabeledValue(string $text, array $labels): ?string
    {
        foreach ($labels as $label) {
            $pattern = '/'.preg_quote($label, '/').'\s*[:\-]\s*(.+)$/imu';
            if (preg_match($pattern, $text, $matches)) {
                return $this->cleanExtractedLine($matches[1]);
            }
        }

        return null;
    }

    private function extractListAfterLabels(string $text, array $labels): array
    {
        $lines = preg_split('/\R/', $text) ?: [];
        $items = [];
        $capturing = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                if ($capturing && $items) {
                    break;
                }
                continue;
            }

            $matchedLabel = false;
            foreach ($labels as $label) {
                if (preg_match('/^'.preg_quote($label, '/').'\s*[:\-]?\s*(.*)$/iu', $trimmed, $matches)) {
                    $capturing = true;
                    $matchedLabel = true;
                    $value = $this->cleanExtractedLine($matches[1] ?? '');
                    if ($value !== '') {
                        $items[] = $value;
                    }
                    break;
                }
            }

            if ($matchedLabel) {
                continue;
            }

            if ($capturing) {
                if (preg_match('/^[A-ZÀ-Ý][A-Za-zÀ-ÿ\s\/]+\s*[:]/u', $trimmed)) {
                    break;
                }

                $value = $this->cleanExtractedLine($trimmed);
                if ($value !== '') {
                    $items[] = $value;
                }
            }
        }

        return array_values(array_unique(array_slice($items, 0, 6)));
    }

    private function extractLikelyDisease(string $text): ?string
    {
        $patterns = [
            '/(?:paludisme|malaria)/iu' => 'Paludisme suspect',
            '/(?:grippe|influenza)/iu' => 'Grippe suspecte',
            '/(?:typho[iï]de)/iu' => 'Fièvre typhoïde suspecte',
            '/(?:gastro[- ]?ent[eé]rite)/iu' => 'Gastro-entérite suspecte',
            '/(?:pneumonie)/iu' => 'Pneumonie suspecte',
            '/(?:tuberculose)/iu' => 'Tuberculose suspecte',
            '/(?:dengue)/iu' => 'Dengue suspecte',
            '/(?:hypertension)/iu' => 'Hypertension suspecte',
            '/(?:diab[eè]te)/iu' => 'Diabète suspect',
        ];

        foreach ($patterns as $pattern => $label) {
            if (preg_match($pattern, $text)) {
                return $label;
            }
        }

        return null;
    }

    private function cleanExtractedLine(string $line): string
    {
        $line = trim($line);
        $line = preg_replace('/^[\-•*\d.)\s]+/u', '', $line);
        $line = preg_replace('/\s+/', ' ', $line);

        return trim($line ?? '', " \t\n\r\0\x0B*_");
    }

    private function normalizeIotData(array $iotData): ?array
    {
        if (! $iotData) {
            return null;
        }

        return [
            'temp' => $iotData['temperature'] ?? null,
            'hr' => $iotData['heartRate'] ?? null,
            'spo2' => $iotData['spo2'] ?? null,
            'bp' => $iotData['bloodPressure'] ?? null,
            'glucose' => $iotData['glucose'] ?? null,
            'resp' => $iotData['respiratoryRate'] ?? null,
        ];
    }

    private function estimateScore(string $response): int
    {
        if (preg_match('/(\d{1,3})\s*%/', $response, $matches)) {
            return max(0, min(100, (int) $matches[1]));
        }

        return preg_match('/probable|compatible|suspect/iu', $response) ? 75 : 60;
    }

    private function estimateUrgency(string $response, array $iotData): int
    {
        if (preg_match('/urgence|imm[eé]diat|SAMU|d[eé]tresse|convulsion|confusion|douleur thoracique/iu', $response)) {
            return 4;
        }

        if (($iotData['spo2'] ?? 100) < 92 || ($iotData['temperature'] ?? 36) >= 39.5 || ($iotData['heartRate'] ?? 0) >= 130) {
            return 3;
        }

        if (preg_match('/fi[eè]vre|douleur|vomissement|diarrh[eé]e|frissons/iu', $response)) {
            return 2;
        }

        return 1;
    }

    private function fallback(
        string $message = "Je suis temporairement indisponible. En cas d'urgence, appelez le SAMU au 15 ou rendez-vous aux urgences les plus proches.",
        string $model = 'fallback'
    ): array {
        return [
            'success' => false,
            'response' => $message,
            'model' => $model,
        ];
    }
}
