<?php

namespace App\Http\Controllers;

use App\Models\Medecin;
use App\Models\RendezVous;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

// ═══════════════════════════════════════════════════════════════
//  RDVController
//  Prise / annulation / confirmation de rendez-vous médicaux.
//  Déclenche les notifications push Expo aux participants.
// ═══════════════════════════════════════════════════════════════
class RDVController extends Controller
{
    /** Relations chargées pour les réponses détaillées. */
    private const DETAIL_RELATIONS = [
        'user:id,nom,prenom,email,telephone,sexe,groupe_sanguin,allergies,antecedents',
        'medecin:id,user_id,nom,specialite,emoji,localisation',
        'consultation:id,user_id,pathologie_detectee,score_ia,urgence,created_at',
    ];

    /** Correspondance statuts « anglais » (API générique) → statuts internes. */
    private const STATUS_ALIASES = [
        'pending'   => 'planifie',
        'accepted'  => 'confirme',
        'completed' => 'effectue',
        'cancelled' => 'annule',
    ];

    public function __construct(private readonly PushNotificationService $push)
    {
    }

    /**
     * GET /api/rdv — rendez-vous du patient ou du médecin connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'medecin') {
            $medecin = $user->medecin()->first();

            $rdv = $medecin
                ? $medecin->rendezVous()
                    ->with([
                        'user:id,nom,prenom,email,telephone,sexe,groupe_sanguin,allergies,antecedents',
                        'consultation:id,user_id,pathologie_detectee,score_ia,urgence,created_at',
                    ])
                    ->orderByDesc('date_rdv')
                    ->orderBy('creneau')
                    ->get()
                : collect();
        } else {
            $rdv = $user
                ->rendezVous()
                ->with('medecin:id,nom,specialite,emoji,localisation')
                ->orderByDesc('date_rdv')
                ->get();
        }

        return response()->json(['rendez_vous' => $rdv]);
    }

    /**
     * POST /api/rdv — réserve un créneau (bookSlot).
     * Notifie le médecin concerné.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'medecin_id'      => ['required', 'integer', 'exists:medecins,id'],
            'consultation_id' => ['nullable', 'integer', 'exists:consultations,id'],
            'date_rdv'        => ['required', 'date', 'after_or_equal:today'],
            'creneau'         => ['required', 'date_format:H:i'],
            'motif'           => ['nullable', 'string', 'max:500'],
        ]);

        // Vérifie que le créneau n'est pas déjà pris
        $existe = RendezVous::where('medecin_id', $data['medecin_id'])
            ->where('date_rdv', $data['date_rdv'])
            ->where('creneau', $data['creneau'])
            ->whereIn('statut', ['planifie', 'confirme'])
            ->exists();

        if ($existe) {
            throw ValidationException::withMessages([
                'creneau' => ['Ce créneau est déjà réservé.'],
            ]);
        }

        try {
            $rdv = RendezVous::create([
                'user_id'         => $request->user()->id,
                'medecin_id'      => $data['medecin_id'],
                'consultation_id' => $data['consultation_id'] ?? null,
                'date_rdv'        => $data['date_rdv'],
                'creneau'         => $data['creneau'],
                'motif'           => $data['motif'] ?? null,
                'statut'          => 'planifie',
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Fallback : contrainte UNIQUE DB (ex: SQLite qui ne supporte pas
            // tous les comportements du where date_format)
            if ($e->getCode() === '23000') {
                throw ValidationException::withMessages([
                    'creneau' => ['Ce créneau est déjà réservé.'],
                ]);
            }
            throw $e;
        }

        $this->notifyDoctorNewAppointment($request, $rdv);

        return response()->json([
            'message'     => 'Rendez-vous réservé',
            'rendez_vous' => $rdv->load('medecin:id,nom,specialite,emoji'),
        ], 201);
    }

    /**
     * PATCH /api/rdv/{rdv}/confirm
     */
    public function confirm(Request $request, RendezVous $rdv): JsonResponse
    {
        $this->authorizeParticipant($request, $rdv);
        $rdv->update(['statut' => 'confirme']);
        $this->notifyPatientStatusChange($rdv->fresh(), 'confirme');

        return response()->json([
            'message' => 'Rendez-vous confirmé',
            'rendez_vous' => $rdv->fresh()->load(self::DETAIL_RELATIONS),
        ]);
    }

    /**
     * PATCH /api/rdv/{rdv}/cancel
     */
    public function cancel(Request $request, RendezVous $rdv): JsonResponse
    {
        $this->authorizeParticipant($request, $rdv);
        $rdv->update(['statut' => 'annule']);
        $this->notifyPatientStatusChange($rdv->fresh(), 'annule');

        return response()->json([
            'message' => 'Rendez-vous annulé',
            'rendez_vous' => $rdv->fresh()->load(self::DETAIL_RELATIONS),
        ]);
    }

    /**
     * PATCH /api/rdv/{rdv}/status — changement de statut générique (médecin).
     * Accepte les libellés internes (planifie/confirme/annule/effectue) ou
     * anglais (pending/accepted/cancelled/completed). Notifie le patient.
     */
    public function updateStatus(Request $request, RendezVous $rdv): JsonResponse
    {
        $this->authorizeParticipant($request, $rdv);

        $allowed = array_merge(array_keys(self::STATUS_ALIASES), array_values(self::STATUS_ALIASES));

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in($allowed)],
        ]);

        $statut = self::STATUS_ALIASES[$data['status']] ?? $data['status'];
        $rdv->update(['statut' => $statut]);
        $this->notifyPatientStatusChange($rdv->fresh(), $statut);

        return response()->json([
            'message' => 'Statut mis à jour',
            'rendez_vous' => $rdv->fresh()->load(self::DETAIL_RELATIONS),
        ]);
    }

    // ═══════════════════════════════════════════════════════════
    //  Notifications push
    // ═══════════════════════════════════════════════════════════

    /** Notifie le médecin qu'un patient vient de réserver un créneau. */
    private function notifyDoctorNewAppointment(Request $request, RendezVous $rdv): void
    {
        $medecin = Medecin::with('user:id,expo_push_token')->find($rdv->medecin_id);
        $token = $medecin?->user?->expo_push_token;
        if (! $token) {
            return;
        }

        $patient = $request->user();
        $patientName = trim(($patient->prenom ?? '').' '.($patient->nom ?? '')) ?: 'Un patient';

        $this->push->send(
            $token,
            '🗓️ Nouveau rendez-vous',
            "Le patient {$patientName} a pris un RDV pour le {$this->formatRdvDate($rdv)}",
            ['type' => 'new_appointment', 'appointment_id' => $rdv->id],
        );
    }

    /** Notifie le patient d'un changement de statut de son rendez-vous. */
    private function notifyPatientStatusChange(RendezVous $rdv, string $statut): void
    {
        $rdv->loadMissing(['user:id,expo_push_token', 'medecin:id,nom']);
        $token = $rdv->user?->expo_push_token;
        if (! $token) {
            return;
        }

        $date = $this->formatRdvDate($rdv);
        $medecinName = $rdv->medecin?->nom ?: 'votre médecin';

        [$title, $body, $type] = match ($statut) {
            'confirme' => [
                '✅ Rendez-vous confirmé',
                "Votre RDV du {$date} a été confirmé par Dr {$medecinName}",
                'appointment_accepted',
            ],
            'annule' => [
                '❌ Rendez-vous annulé',
                "Votre RDV du {$date} a été annulé. Veuillez reprendre contact.",
                'appointment_cancelled',
            ],
            'effectue' => [
                '🏁 Rendez-vous terminé',
                "Votre RDV du {$date} avec Dr {$medecinName} est terminé.",
                'appointment_completed',
            ],
            default => [
                '🕐 Rendez-vous mis à jour',
                "Le statut de votre RDV du {$date} a changé.",
                'appointment_updated',
            ],
        };

        $this->push->send($token, $title, $body, [
            'type' => $type,
            'appointment_id' => $rdv->id,
        ]);
    }

    /** Formate la date + l'heure d'un RDV en français (ex. « 8 juillet 2026 à 09:30 »). */
    private function formatRdvDate(RendezVous $rdv): string
    {
        $date = $rdv->date_rdv
            ? $rdv->date_rdv->locale('fr')->isoFormat('D MMMM YYYY')
            : 'date à confirmer';
        $heure = $rdv->creneau ? substr((string) $rdv->creneau, 0, 5) : null;

        return $heure ? "{$date} à {$heure}" : $date;
    }

    /**
     * Vérifie que le RDV concerne le patient connecté ou le médecin assigné.
     */
    private function authorizeParticipant(Request $request, RendezVous $rdv): void
    {
        $user = $request->user();

        if ($rdv->user_id === $user->id) {
            return;
        }

        if ($user->role === 'medecin' && $user->medecin?->id === $rdv->medecin_id) {
            return;
        }

        abort(403, 'Accès refusé.');
    }
}
