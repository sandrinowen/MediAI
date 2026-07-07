// src/services/carnetService.js
// ─────────────────────────────────────────────────────────────
// Carnet de santé PDF généré côté serveur (DomPDF).
// Patient : carnet du compte connecté.
// Médecin : carnet d'un patient accepté via patient_id.
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';

const paramsFor = (patientId) => (patientId ? { params: { patient_id: patientId } } : undefined);

export const exportCarnetBase64 = async (patientId = null) => {
  try {
    const { data } = await api.get('/carnet/export/base64', paramsFor(patientId));
    return {
      success: true,
      filename: data.filename,
      mime: data.mime,
      base64: data.base64,
    };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

export const getCarnet = async (patientId = null) => {
  try {
    const { data } = await api.get('/carnet', paramsFor(patientId));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};
