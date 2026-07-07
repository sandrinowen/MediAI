// src/services/medecinService.js
// ─────────────────────────────────────────────────────────────
// Gestion de la fiche annuaire du médecin connecté :
// consultation et mise à jour des horaires (disponibilités RDV).
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';

// ── Récupère la fiche annuaire du médecin connecté ───────────
export const getMedecinProfile = async () => {
  try {
    const { data } = await api.get('/medecin/me');
    return { success: true, medecin: data.medecin };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Impossible de charger la fiche médecin.') };
  }
};

// ── Met à jour la fiche (spécialité, localisation, horaires) ──
export const updateMedecinProfile = async (updates) => {
  try {
    const { data } = await api.put('/medecin/me', updates);
    return { success: true, medecin: data.medecin };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Impossible de mettre à jour.') };
  }
};
