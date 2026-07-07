// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_TOKEN: '@mediai:token',
  USER_DATA: '@mediai:user',
  IS_LOGGED_IN: '@mediai:loggedIn',
};

// Sauvegarder le token
export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error);
    return false;
  }
};

// Récupérer le token
export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error);
    return null;
  }
};

// Sauvegarder les données utilisateur
export const storeUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données utilisateur:', error);
    return false;
  }
};

// Récupérer les données utilisateur
export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error);
    return null;
  }
};

// Vérifier si l'utilisateur est connecté
export const isLoggedIn = async () => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
    return value === 'true';
  } catch (error) {
    console.error('Erreur lors de la vérification de connexion:', error);
    return false;
  }
};

// Déconnecter l'utilisateur (supprimer toutes les données)
export const logoutUser = async () => {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER_TOKEN, STORAGE_KEYS.USER_DATA, STORAGE_KEYS.IS_LOGGED_IN]);
    return true;
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return false;
  }
};