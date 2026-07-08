// src/services/api.js
// ─────────────────────────────────────────────────────────────
// Instance Axios centralisée pour l'API Laravel MediAI v2.
// - Injecte automatiquement le token Sanctum (Bearer).
// - Gère la déconnexion auto sur 401.
// ─────────────────────────────────────────────────────────────
import axios from 'axios';
import Constants from 'expo-constants';
import { getToken, logoutUser } from '../utils/storage';

// URL de base de l'API.
// Source de vérité : app.config.js → extra.apiBaseUrl, alimenté par la
// variable d'environnement API_BASE_URL au build EAS (ou .env local).
// Ainsi l'adresse du backend se change SANS modifier le code. Le fallback
// pointe vers le backend Render public pour les builds APK.
// Fallback en dur au cas où extra ne serait pas renseigné.
const FALLBACK_API_BASE_URL = 'https://mediai-backend-s8en.onrender.com/api';

export const API_BASE_URL =
  Constants?.expoConfig?.extra?.apiBaseUrl ?? FALLBACK_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ── Requête : ajoute le Bearer token ──────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Réponse : 401 → purge la session locale ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await logoutUser();
    }
    return Promise.reject(error);
  }
);

// Extrait un message d'erreur lisible depuis une réponse Laravel.
export const extractApiError = (error, fallback = 'Une erreur est survenue') => {
  const data = error.response?.data;
  if (data?.errors) {
    // Erreurs de validation Laravel : { errors: { champ: [msg] } }
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) return first[0];
  }
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof error.message === "string") return error.message;
  return fallback;
};

export default api;
