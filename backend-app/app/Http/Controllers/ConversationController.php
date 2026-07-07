<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// ═══════════════════════════════════════════════════════════════
//  ConversationController
//  Gestion des fils de discussion IA de l'utilisateur connecté.
// ═══════════════════════════════════════════════════════════════
class ConversationController extends Controller
{
    /**
     * GET /api/conversations — liste des conversations (récentes en premier).
     */
    public function index(Request $request): JsonResponse
    {
        $conversations = Conversation::where('user_id', $request->user()->id)
            ->latest()
            ->get(['id', 'title', 'status', 'started_at', 'completed_at', 'created_at']);

        return response()->json(['data' => $conversations]);
    }

    /**
     * POST /api/conversations — crée une nouvelle conversation vide.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $conversation = Conversation::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'] ?? null,
            'status' => 'active',
            'started_at' => now(),
        ]);

        return response()->json(['data' => $conversation], 201);
    }

    /**
     * GET /api/conversations/{id}/messages — messages d'une conversation.
     */
    public function messages(Request $request, int $id): JsonResponse
    {
        $conversation = $this->resolve($request, $id);

        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get(['id', 'conversation_id', 'role', 'content', 'iot_data', 'model', 'created_at']);

        return response()->json([
            'conversation' => $conversation->only(['id', 'title', 'status', 'started_at', 'completed_at']),
            'data' => $messages,
            'diagnostic' => $conversation->diagnostic,
        ]);
    }

    /**
     * DELETE /api/conversations/{id} — supprime la conversation (cascade messages).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $conversation = $this->resolve($request, $id);
        $conversation->delete();

        return response()->json(['message' => 'Conversation supprimée.']);
    }

    /** Récupère une conversation appartenant à l'utilisateur ou 404/403. */
    private function resolve(Request $request, int $id): Conversation
    {
        $conversation = Conversation::findOrFail($id);
        abort_unless($conversation->user_id === $request->user()->id, 403, 'Accès refusé.');

        return $conversation;
    }
}
