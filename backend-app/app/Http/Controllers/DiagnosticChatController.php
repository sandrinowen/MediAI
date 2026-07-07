<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\Conversation;
use App\Services\MedGemmaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiagnosticChatController extends Controller
{
    public function __construct(private readonly MedGemmaService $medGemma) {}

    /**
     * POST /api/chat/message
     * Flux conversationnel : crée la conversation au besoin, enregistre le
     * message patient, appelle MedGemma et renvoie les drapeaux du flux
     * (needs_confirmation / is_final_diagnostic / diagnostic).
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversation_id' => ['nullable', 'integer', 'exists:conversations,id'],
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'iot_data' => ['nullable', 'array'],
            'iot_data.temperature' => ['nullable', 'numeric', 'between:30,45'],
            'iot_data.spo2' => ['nullable', 'numeric', 'between:50,100'],
            'iot_data.heartRate' => ['nullable', 'integer', 'between:20,300'],
            'iot_data.bloodPressure' => ['nullable', 'string', 'max:20'],
            'iot_data.glucose' => ['nullable', 'numeric', 'between:0,30'],
            'iot_data.respiratoryRate' => ['nullable', 'integer', 'between:4,80'],
        ]);

        $user = $request->user();

        // Résout la conversation (création automatique au premier message).
        if (! empty($validated['conversation_id'])) {
            $conversation = Conversation::findOrFail($validated['conversation_id']);
            abort_unless($conversation->user_id === $user->id, 403, 'Accès refusé.');
        } else {
            $conversation = Conversation::create([
                'user_id' => $user->id,
                'status' => 'active',
                'started_at' => now(),
            ]);
        }

        $result = $this->medGemma->converse(
            $user,
            $conversation,
            $validated['message'],
            $validated['iot_data'] ?? [],
        );

        return response()->json([
            'success' => $result['success'],
            'conversation_id' => $conversation->id,
            'needs_confirmation' => $result['needs_confirmation'],
            'is_final_diagnostic' => $result['is_final_diagnostic'],
            'diagnostic' => $result['diagnostic'],
            'message' => [
                'role' => 'assistant',
                'content' => $result['response'],
                'model' => $result['model'],
                'created_at' => now()->toISOString(),
            ],
            'error' => $result['success'] ? null : 'Service IA indisponible',
        ], $result['success'] ? 200 : 503);
    }

    public function history(Request $request): JsonResponse
    {
        $messages = ChatMessage::where('user_id', $request->user()->id)
            ->orderBy('created_at')
            ->get(['id', 'role', 'content', 'iot_data', 'model', 'created_at']);

        return response()->json(['data' => $messages]);
    }

    public function clearHistory(Request $request): JsonResponse
    {
        ChatMessage::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Historique efface.']);
    }
}
