import api, { extractApiError } from './api';

const textFromValue = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  if (Array.isArray(value)) {
    return value.map((item) => textFromValue(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "content")) {
      return textFromValue(value.content, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, "message")) {
      return textFromValue(value.message, fallback);
    }
    return fallback;
  }
  return String(value);
};

const normalizeChatMessage = (message, fallbackId) => {
  const raw = message && typeof message === "object" ? message : { content: message };

  return {
    ...raw,
    id: raw.id ?? fallbackId,
    role: typeof raw.role === "string" ? raw.role : "assistant",
    content: textFromValue(raw.content),
  };
};

export const getChatHistory = async () => {
  try {
    const { data } = await api.get('/chat/history');
    return {
      success: true,
      data: Array.isArray(data.data)
        ? data.data.map((message, index) => normalizeChatMessage(message, 'history-' + index))
        : [],
    };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Historique du chat indisponible') };
  }
};

export const sendChatMessage = async (message, iotData = {}, conversationId = null) => {
  try {
    const payload = { message, iot_data: iotData };
    if (conversationId) payload.conversation_id = conversationId;

    const { data } = await api.post('/chat/message', payload);
    return {
      success: true,
      data: {
        ...data,
        conversationId: data.conversation_id ?? conversationId ?? null,
        needsConfirmation: Boolean(data.needs_confirmation),
        isFinalDiagnostic: Boolean(data.is_final_diagnostic),
        diagnostic: data.diagnostic ?? null,
        message: normalizeChatMessage(data.message, 'assistant-' + Date.now()),
      },
    };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Assistant IA indisponible') };
  }
};

// ── Conversations (fils de discussion) ─────────────────────────
export const createConversation = async (title = null) => {
  try {
    const { data } = await api.post('/conversations', title ? { title } : {});
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Impossible de créer la conversation') };
  }
};

export const getConversations = async () => {
  try {
    const { data } = await api.get('/conversations');
    return { success: true, data: Array.isArray(data.data) ? data.data : [] };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Conversations indisponibles') };
  }
};

export const getConversationMessages = async (id) => {
  try {
    const { data } = await api.get(`/conversations/${id}/messages`);
    return {
      success: true,
      data: {
        conversation: data.conversation ?? null,
        diagnostic: data.diagnostic ?? null,
        messages: Array.isArray(data.data)
          ? data.data.map((message, index) => normalizeChatMessage(message, 'conv-' + id + '-' + index))
          : [],
      },
    };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Conversation introuvable') };
  }
};

export const deleteConversation = async (id) => {
  try {
    await api.delete(`/conversations/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Suppression impossible') };
  }
};

export const clearChatHistory = async () => {
  try {
    await api.delete('/chat/clear');
    return { success: true };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Impossible d effacer le chat') };
  }
};

export const iotDataForChat = (deviceData = {}) => {
  const bloodPressure = deviceData.bpSystolic && deviceData.bpDiastolic
    ? `${deviceData.bpSystolic}/${deviceData.bpDiastolic}`
    : undefined;

  // On n'inclut que les métriques réellement mesurées : le diagnostic
  // fonctionne donc même avec des données partielles (une seule mesure suffit).
  // heartRate / respiratoryRate sont arrondis car le backend les valide en
  // entiers — une valeur décimale ferait échouer tout l'envoi (422) et l'IA
  // ne recevrait alors aucune donnée capteur.
  const candidates = {
    temperature: deviceData.temp,
    spo2: deviceData.spo2,
    heartRate: deviceData.hr != null ? Math.round(deviceData.hr) : undefined,
    bloodPressure,
    glucose: deviceData.glyc,
    respiratoryRate: deviceData.resp != null ? Math.round(deviceData.resp) : undefined,
  };

  return Object.fromEntries(
    Object.entries(candidates).filter(([, value]) => value !== null && value !== undefined),
  );
};
