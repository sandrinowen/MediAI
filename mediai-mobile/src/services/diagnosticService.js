// src/services/diagnosticService.js
// ─────────────────────────────────────────────────────────────
// Carnet de santé : diagnostics structurés générés par MedGemma.
//  - getDiagnostics()      : liste résumée (Historique / Carnet)
//  - getDiagnosticById(id) : diagnostic complet (page détail)
//  - exportDiagnosticsPdf(): PDF de tous les diagnostics (base64)
// ─────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import api, { extractApiError, API_BASE_URL } from './api';
import { getToken } from '../utils/storage';
import { downloadBlob } from '../utils/download';

export const getDiagnostics = async () => {
  try {
    const { data } = await api.get('/diagnostics');
    return { success: true, data: Array.isArray(data.data) ? data.data : [] };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Diagnostics indisponibles') };
  }
};

// 3 derniers diagnostics pour la page d'accueil (id, title, diagnosed_at, hypothesis).
export const getRecentDiagnostics = async () => {
  try {
    const { data } = await api.get('/diagnostics/recent');
    return { success: true, data: Array.isArray(data.data) ? data.data : [] };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Diagnostics indisponibles') };
  }
};

export const getDiagnosticById = async (id) => {
  try {
    const { data } = await api.get(`/diagnostics/${id}`);
    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Diagnostic introuvable') };
  }
};

// Télécharge le PDF du carnet directement dans un fichier local via le module
// natif expo-file-system. On évite `responseType: 'arraybuffer'` d'axios, non
// supporté par le XHR de React Native (source du « Network Error »).
// Le jeton Sanctum est passé en en-tête Authorization comme pour les appels API.
export const exportDiagnosticsPdf = async () => {
  const filename = 'carnet-diagnostics-mediai.pdf';
  try {
    // Web : pas d'accès disque natif. On récupère le PDF en Blob via axios
    // (le token Bearer est injecté par l'intercepteur) et on déclenche un
    // téléchargement navigateur. Pas de `uri` renvoyé (rien à partager).
    if (Platform.OS === 'web') {
      const response = await api.get('/diagnostics/export/pdf', {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      downloadBlob(response.data, filename);
      return { success: true, filename, mime: 'application/pdf', downloaded: true };
    }

    const token = await getToken();
    const destination = new File(Paths.document, filename);

    const file = await File.downloadFileAsync(
      `${API_BASE_URL}/diagnostics/export/pdf`,
      destination,
      {
        idempotent: true,
        headers: {
          Accept: 'application/pdf',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    return { success: true, filename, mime: 'application/pdf', uri: file.uri };
  } catch (error) {
    // downloadFileAsync rejette avec « UnableToDownload ... <status> » sur un
    // code HTTP non-2xx : on remonte un message lisible.
    return { success: false, error: extractApiError(error, error?.message || 'Génération du PDF impossible') };
  }
};
