// src/services/rdvService.js
// ─────────────────────────────────────────────────────────────
// Médecins + Rendez-vous via l'API Laravel (Doctors + RDV)
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';

// ── Médecins ──────────────────────────────────────────────────
export const getDoctors = async (filters = {}) => {
  try {
    const { data } = await api.get('/doctors', { params: filters });
    return { success: true, doctors: data.doctors || [] };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Créneaux disponibles pour un médecin à une date.
export const getCreneaux = async (doctorId, date) => {
  try {
    const { data } = await api.get(`/doctors/${doctorId}`, { params: { date } });
    return { success: true, doctor: data.doctor, date: data.date, creneaux: data.creneaux || [] };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// ── Rendez-vous / consultations ───────────────────────────────
export const getUserRDV = async () => {
  try {
    const { data } = await api.get('/rdv');
    return { success: true, rdvs: data.rendez_vous || [] };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Même endpoint : le backend renvoie les RDV du médecin si le rôle connecté est medecin.
export const getDoctorConsultations = getUserRDV;

export const bookRDV = async (payload) => {
  try {
    const { data } = await api.post('/rdv', payload);
    return { success: true, rdv: data.rendez_vous };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

export const confirmRDV = async (rdvId) => {
  try {
    const { data } = await api.patch(`/rdv/${rdvId}/confirm`);
    return { success: true, rdv: data.rendez_vous };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

export const cancelRDV = async (rdvId) => {
  try {
    const { data } = await api.patch(`/rdv/${rdvId}/cancel`);
    return { success: true, rdv: data.rendez_vous };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Changement de statut générique (médecin) : accepted | completed | cancelled
// ou libellés internes planifie | confirme | annule | effectue.
export const updateAppointmentStatus = async (rdvId, status) => {
  try {
    const { data } = await api.patch(`/rdv/${rdvId}/status`, { status });
    return { success: true, rdv: data.rendez_vous };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};
