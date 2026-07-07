// src/services/authService.js
// ─────────────────────────────────────────────────────────────
// Authentification réelle contre l'API Laravel MediAI v2 (Sanctum).
// Remplace l'ancienne simulation MOCK_USERS.
// ─────────────────────────────────────────────────────────────
import api, { extractApiError } from './api';
import { storeToken, storeUserData, logoutUser, getUserData } from '../utils/storage';
import { mapUserFromApi, mapRegisterToApi, mapProfileToApi } from './mappers';

// ── Connexion ─────────────────────────────────────────────────
export const login = async (email, password) => {
  try {
    const { data } = await api.post('/login', { email, password });
    const user = mapUserFromApi(data.user);

    await storeToken(data.token);
    await storeUserData(user);

    return { success: true, user, token: data.token };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Email ou mot de passe incorrect') };
  }
};

// ── Inscription ───────────────────────────────────────────────
export const register = async (userData) => {
  try {
    const payload = mapRegisterToApi(userData);
    const { data } = await api.post('/register', payload);

    if (data.token && data.user) {
      const user = mapUserFromApi(data.user);

      await storeToken(data.token);
      await storeUserData(user);

      return { success: true, user, token: data.token, message: data.message };
    }

    return {
      success: true,
      message: data.message,
      requiresEmailVerification: Boolean(data.requires_email_verification),
      email: data.user?.email || payload.email,
      user: data.user ? mapUserFromApi(data.user) : null,
    };
  } catch (error) {
    return { success: false, error: extractApiError(error, "Erreur lors de l'inscription") };
  }
};

// ── Validation email après inscription ───────────────────────
export const verifyEmail = async (email, code) => {
  try {
    const { data } = await api.post('/verify-email', { email, code });
    const user = mapUserFromApi(data.user);

    await storeToken(data.token);
    await storeUserData(user);

    return { success: true, user, token: data.token, message: data.message };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Code invalide ou expiré.') };
  }
};

// ── Renvoi du code de validation email ───────────────────────
export const resendEmailVerification = async (email) => {
  try {
    const { data } = await api.post('/resend-email-verification', { email });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, error: extractApiError(error, "Impossible d'envoyer le code. Réessayez.") };
  }
};

// ── Connexion Google : échange l'ID token contre une session ──
export const loginWithGoogle = async (idToken) => {
  try {
    const { data } = await api.post('/auth/google', { id_token: idToken });
    const user = mapUserFromApi(data.user);

    await storeToken(data.token);
    await storeUserData(user);

    return { success: true, user, token: data.token };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Connexion Google impossible.') };
  }
};

// ── Mot de passe oublié : demande du code OTP ─────────────────
export const requestPasswordReset = async (email) => {
  try {
    const { data } = await api.post('/forgot-password', { email });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, error: extractApiError(error, "Impossible d'envoyer le code. Réessayez.") };
  }
};

// ── Mot de passe oublié : validation du code + nouveau mot de passe ──
export const resetPassword = async (email, code, password) => {
  try {
    const { data } = await api.post('/reset-password', {
      email,
      code,
      password,
      password_confirmation: password,
    });
    return { success: true, message: data.message };
  } catch (error) {
    return { success: false, error: extractApiError(error, 'Code invalide ou expiré.') };
  }
};

// ── Déconnexion ───────────────────────────────────────────────
export const logout = async () => {
  try {
    await api.post('/logout'); // révoque le token côté serveur
  } catch (_) {
    // on purge la session locale même si l'appel échoue
  }
  await logoutUser();
  return { success: true };
};

// ── Profil de l'utilisateur connecté ──────────────────────────
export const fetchProfile = async () => {
  try {
    const { data } = await api.get('/me');
    const user = mapUserFromApi(data.user);
    await storeUserData(user);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// ── Mise à jour du profil ─────────────────────────────────────
export const updateProfile = async (updates) => {
  try {
    const { data } = await api.put('/profile', mapProfileToApi(updates));
    const user = mapUserFromApi(data.user);
    await storeUserData(user);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: extractApiError(error) };
  }
};

// Récupère l'utilisateur stocké localement (rafraîchissement UI).
export const getUserInfo = async () => getUserData();
