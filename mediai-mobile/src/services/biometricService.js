// src/services/biometricService.js
// ─────────────────────────────────────────────────────────────
// Synchronisation des 3 métriques IoT réelles (ESP32 v2) avec l'API Laravel.
// Capteurs : MLX90614 (temp) + MAX30102 (FC + SpO2)
// Le format UI (BiometricContext) : {temp, hr, spo2}  ⇄  format API : donnees_biometriques.
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';

// UI → API (3 métriques réelles)
const toApi = (d = {}) => ({
  temperature: d.temp ?? null,
  freq_cardiaque: d.hr ?? null,
  spo2: d.spo2 ?? null,
  contexte: d.contexte ?? 'repos',
});

// API → UI
export const fromApi = (b) => {
  if (!b) return null;
  return {
    id: b.id,
    temp: b.temperature,
    hr: b.freq_cardiaque,
    spo2: b.spo2,
    timestamp: b.timestamp,
  };
};

// Envoie une mesure (snapshot des 3 capteurs réels).
export const storeMeasure = async (deviceData) => {
  try {
    const { data } = await api.post('/biometrics', toApi(deviceData));
    return { success: true, biometrics: fromApi(data.biometrics) };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Récupère la dernière mesure enregistrée.
export const getLatest = async () => {
  try {
    const { data } = await api.get('/biometrics/latest');
    return { success: true, biometrics: fromApi(data.biometrics), snapshot: data.snapshot };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Historique paginé des mesures.
export const getHistory = async (page = 1) => {
  try {
    const { data } = await api.get('/biometrics', { params: { page } });
    return { success: true, data: (data.data || []).map(fromApi), meta: data };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};