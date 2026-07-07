// src/services/adminService.js
// ─────────────────────────────────────────────────────────────
// Administration via l'API Laravel (rôle admin requis).
//   - Gestion des utilisateurs (liste, détail, édition, rôle)
//   - Statistiques globales + tous les rendez-vous
// Remplace les fonctions admin de l'ancien mock userService.js.
// Conserve les MÊMES contrats de retour que le mock (array / objet /
// null) pour limiter les changements dans les pages.
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';
import { mapUserFromApi } from './mappers';

// Construit le payload API d'édition utilisateur (champs admin).
const buildUserPayload = (updates = {}) => {
  const out = {};
  if (updates.name !== undefined) {
    const parts = (updates.name || '').trim().split(/\s+/);
    out.prenom = parts.shift() || updates.name;
    out.nom = parts.join(' ') || out.prenom;
  }
  if (updates.email !== undefined) out.email = updates.email;
  if (updates.phone !== undefined) out.telephone = updates.phone;
  if (updates.location !== undefined) out.localisation = updates.location;
  if (updates.sexe !== undefined) out.sexe = updates.sexe;
  if (updates.bloodType !== undefined) out.groupe_sanguin = updates.bloodType || null;
  if (updates.allergies !== undefined) out.allergies = updates.allergies;
  if (updates.antecedents !== undefined) out.antecedents = updates.antecedents;
  if (updates.role !== undefined) out.role = updates.role;
  // âge → date de naissance approximative (1er janvier) si fournie
  if (updates.age) {
    const year = new Date().getFullYear() - parseInt(updates.age, 10);
    if (!Number.isNaN(year)) out.date_naissance = `${year}-01-01`;
  }
  return out;
};

// ── Utilisateurs ──────────────────────────────────────────────

// Liste de tous les utilisateurs (sans mot de passe). → { success, users, error? }
export const getAllUsers = async () => {
  try {
    const { data } = await api.get('/users');
    return { success: true, users: (data.users || []).map(mapUserFromApi) };
  } catch (error) {
    return { success: false, users: [], error: extractApiError(error, 'Impossible de charger les utilisateurs.') };
  }
};

// Détail d'un utilisateur. → user | null
export const getUserById = async (userId) => {
  try {
    const { data } = await api.get(`/users/${userId}`);
    return mapUserFromApi(data.user);
  } catch (_) {
    return null;
  }
};

// Mise à jour d'un utilisateur (admin). → user | null
export const updateUser = async (userId, updates) => {
  try {
    const { data } = await api.put(`/users/${userId}`, buildUserPayload(updates));
    return mapUserFromApi(data.user);
  } catch (_) {
    return null;
  }
};

// Changement de rôle (admin). → user | null
export const updateUserRole = async (userId, newRole) => {
  try {
    const { data } = await api.patch(`/users/${userId}/role`, { role: newRole });
    return mapUserFromApi(data.user);
  } catch (_) {
    return null;
  }
};

// ── Statistiques ──────────────────────────────────────────────

// Agrégats globaux (déjà au format UI attendu par AdminStatistics). → object
export const getStatistics = async () => {
  try {
    const { data } = await api.get('/statistics');
    return data;
  } catch (_) {
    return {
      totalUsers: 0, totalConsultations: 0, totalAppointments: 0,
      patientsCount: 0, medecinsCount: 0, adminsCount: 0, topDiseases: [],
    };
  }
};
