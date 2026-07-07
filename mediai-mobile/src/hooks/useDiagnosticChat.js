import { useCallback, useEffect, useState } from 'react';
import {
  deleteConversation,
  getConversationMessages,
  getConversations,
  sendChatMessage,
} from '../services/diagnosticChatService';

// Balise interne émise par l'IA pour demander la confirmation des symptômes.
// Elle ne doit jamais être affichée au patient.
const CONFIRMATION_TAG = '[CONFIRMATION_REQUISE]';
const stripTag = (text = '') => String(text).replace(CONFIRMATION_TAG, '').trim();
const isAffirmative = (text = '') => /^\s*oui/i.test(String(text));

export const useDiagnosticChat = () => {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [finalDiagnostic, setFinalDiagnostic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // ── Liste des conversations (panneau latéral) ────────────────
  const loadConversations = useCallback(async () => {
    const result = await getConversations();
    if (result.success) setConversations(result.data);
    return result;
  }, []);

  useEffect(() => {
    (async () => {
      setFetching(true);
      await loadConversations();
      setFetching(false);
    })();
  }, [loadConversations]);

  // ── Nouveau chat (réinitialise l'écran, conversation créée au 1er message) ──
  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setNeedsConfirmation(false);
    setFinalDiagnostic(null);
    setError(null);
  }, []);

  // ── Charger une conversation existante ───────────────────────
  const loadConversation = useCallback(async (id) => {
    setFetching(true);
    setError(null);
    const result = await getConversationMessages(id);

    if (!result.success) {
      setError(result.error);
      setFetching(false);
      return;
    }

    const { conversation, diagnostic, messages: rawMessages } = result.data;
    const cleaned = rawMessages.map((m) => ({ ...m, content: stripTag(m.content) }));

    // Rattache la carte diagnostic au dernier message assistant.
    if (diagnostic) {
      for (let i = cleaned.length - 1; i >= 0; i -= 1) {
        if (cleaned[i].role === 'assistant') {
          cleaned[i] = { ...cleaned[i], diagnostic };
          break;
        }
      }
    }

    const lastAssistant = [...rawMessages].reverse().find((m) => m.role === 'assistant');
    const awaiting = Boolean(
      lastAssistant &&
        String(lastAssistant.content).includes(CONFIRMATION_TAG) &&
        conversation?.status !== 'completed',
    );

    setMessages(cleaned);
    setConversationId(id);
    setFinalDiagnostic(diagnostic ?? null);
    setNeedsConfirmation(awaiting);
    setFetching(false);
  }, []);

  // ── Supprimer une conversation ───────────────────────────────
  const removeConversation = useCallback(
    async (id) => {
      const result = await deleteConversation(id);
      if (result.success) {
        setConversations((current) => current.filter((c) => c.id !== id));
        if (id === conversationId) startNewChat();
      } else {
        setError(result.error);
      }
      return result;
    },
    [conversationId, startNewChat],
  );

  // ── Envoi d'un message ───────────────────────────────────────
  const sendMessage = useCallback(
    async (content, iotData = {}) => {
      const clean = String(content).trim();
      if (!clean) return;

      const now = new Date().toISOString();
      const localUserMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: clean,
        created_at: now,
      };
      const typingMessage = {
        id: 'typing',
        role: 'assistant',
        content: '',
        pending: true,
        created_at: now,
      };

      setMessages((current) => [...current, localUserMessage, typingMessage]);
      setLoading(true);
      setError(null);
      setNeedsConfirmation(false);

      const result = await sendChatMessage(clean, iotData, conversationId);

      if (result.success && result.data?.message) {
        const { data } = result;
        const assistantMessage = {
          ...data.message,
          id: `assistant-${Date.now()}`,
          content: stripTag(data.message.content),
          diagnostic: data.isFinalDiagnostic ? data.diagnostic : undefined,
        };

        setMessages((current) => [
          ...current.filter((m) => m.id !== 'typing'),
          assistantMessage,
        ]);

        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
        }
        setNeedsConfirmation(Boolean(data.needsConfirmation));
        if (data.isFinalDiagnostic && data.diagnostic) {
          setFinalDiagnostic(data.diagnostic);
        }

        // Rafraîchit la liste (nouvelle conversation / titre / statut).
        loadConversations();
      } else {
        setMessages((current) => current.filter((m) => m.id !== 'typing'));
        setError(result.error || 'Assistant IA indisponible');
      }

      setLoading(false);
    },
    [conversationId, loadConversations],
  );

  // ── Réponse aux boutons de confirmation ──────────────────────
  const answerConfirmation = useCallback(
    async (accepted, iotData = {}) => {
      const reply = accepted ? 'Oui' : "Non, j'ai d'autres symptômes";
      await sendMessage(reply, iotData);
    },
    [sendMessage],
  );

  return {
    messages,
    conversations,
    conversationId,
    needsConfirmation,
    finalDiagnostic,
    loading,
    fetching,
    error,
    sendMessage,
    answerConfirmation,
    startNewChat,
    loadConversation,
    removeConversation,
    reloadConversations: loadConversations,
    isAffirmative,
  };
};
