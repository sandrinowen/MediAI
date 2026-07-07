// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { isLoggedIn, getUserData, storeUserData } from '../utils/storage';
import { login as apiLogin, register as apiRegister, logout as apiLogout, fetchProfile, updateProfile as apiUpdateProfile, loginWithGoogle as apiLoginWithGoogle, verifyEmail as apiVerifyEmail, resendEmailVerification as apiResendEmailVerification } from '../services/authService';
import { registerForPushNotifications } from '../services/notificationService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => { checkAuthStatus(); }, []);

  // Enregistre le jeton push Expo dès que l'utilisateur est authentifié
  // (connexion, Google, inscription, vérification e-mail ou reprise de session).
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications().catch(() => {});
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        // Affiche d'abord le cache local, puis rafraîchit depuis l'API
        const cached = await getUserData();
        if (cached) { setUser(cached); setIsAuthenticated(true); }

        const result = await fetchProfile();
        if (result.success) {
          setUser(result.user);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const result = await apiLogin(email, password);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return result;
  };

  const loginWithGoogle = async (idToken) => {
    const result = await apiLoginWithGoogle(idToken);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return result;
  };

  const register = async (userData) => {
    const result = await apiRegister(userData);
    if (result.success && result.token) {
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return result;
  };

  const verifyEmail = async (email, code) => {
    const result = await apiVerifyEmail(email, code);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return result;
  };

  const resendEmailVerification = async (email) => apiResendEmailVerification(email);

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates) => {
    // Tente la mise à jour serveur ; fallback local si hors-ligne
    const result = await apiUpdateProfile(updates);
    if (result.success) {
      setUser(result.user);
      return { success: true };
    }
    const merged = { ...user, ...updates };
    await storeUserData(merged);
    setUser(merged);
    return result;
  };

  // Recharge le profil depuis l'API (/me) et met à jour le contexte.
  const refreshUser = async () => {
    const result = await fetchProfile();
    if (result.success) setUser(result.user);
    return result;
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isMedecin: user?.role === 'medecin',
    isPatient: user?.role === 'patient',
    login,
    loginWithGoogle,
    register,
    verifyEmail,
    resendEmailVerification,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
