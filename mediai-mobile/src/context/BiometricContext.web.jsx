// src/context/BiometricContext.web.jsx
// ─────────────────────────────────────────────────────────────
// Variante WEB de BiometricContext. Metro/Expo choisit ce fichier
// (extension .web.jsx) à la place de BiometricContext.jsx sur le web.
//
// `react-native-ble-plx` est 100 % natif : l'importer casserait le
// bundle web. Ce stub expose EXACTEMENT la même API que la version
// native (mêmes clés dans `value`, mêmes noms d'exports) pour que les
// écrans qui consomment `useBiometric()` fonctionnent sans modification.
//
// Ce qui est conservé (web-safe) : persistance AsyncStorage, historique,
// mise à jour manuelle des mesures.
// Ce qui est neutralisé : le scan/connexion Bluetooth réel (connectDevice)
// — une vraie connexion au bracelet nécessiterait l'API Web Bluetooth,
// hors périmètre. Le clic affiche un message d'indisponibilité.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeMeasure } from '../services/biometricService';

const BiometricContext = createContext();
const STORAGE_KEY = '@mediai_biometric';

// État initial identique au natif : toutes les métriques à null.
const INITIAL_DEVICE_DATA = {
  temp: null,
  hr: null,
  spo2: null,
  bpSystolic: null,
  bpDiastolic: null,
  glyc: null,
  resp: null,
  timestamp: null,
};

export const useBiometric = () => {
  const context = useContext(BiometricContext);
  if (!context) throw new Error('useBiometric must be used within BiometricProvider');
  return context;
};

export const BiometricProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [deviceData, setDeviceData] = useState(INITIAL_DEVICE_DATA);
  const [history, setHistory] = useState([]);
  // Le scan Bluetooth n'existe pas sur web : toujours false.
  const [isScanning] = useState(false);

  useEffect(() => {
    loadDeviceData();
  }, []);

  // ── Persistance AsyncStorage (localStorage sur web) ───────────
  const loadDeviceData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setConnected(parsed.connected || false);
        setDeviceData(parsed.deviceData || INITIAL_DEVICE_DATA);
        setHistory(parsed.history || []);
      }
    } catch (error) {
      console.error('❌ Erreur chargement données IoT:', error);
    }
  };

  const saveDeviceData = async (conn, data, hist) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        connected: conn,
        deviceData: data,
        history: hist,
      }));
    } catch (error) {
      console.error('❌ Erreur sauvegarde données IoT:', error);
    }
  };

  // ── Bluetooth indisponible sur le web ─────────────────────────
  const connectDevice = useCallback(async () => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(
        "La connexion au bracelet MediAI Band Pro n'est pas disponible sur la version web (Bluetooth non pris en charge). Utilisez l'application mobile pour connecter votre dispositif."
      );
    }
    console.warn('⚠️ connectDevice() ignoré : Bluetooth indisponible sur le web.');
  }, []);

  const disconnectDevice = useCallback(async () => {
    setConnected(false);
    setDeviceData(INITIAL_DEVICE_DATA);
    saveDeviceData(false, null, history);
  }, [history]);

  // ── Mise à jour manuelle des données (identique au natif) ─────
  const updateDeviceData = async (newData) => {
    const updatedData = { ...deviceData, ...newData, timestamp: new Date().toISOString() };
    setDeviceData(updatedData);
    const newHistory = [updatedData, ...history].slice(0, 50);
    setHistory(newHistory);
    saveDeviceData(connected, updatedData, newHistory);

    if (connected) storeMeasure(updatedData).catch(() => {});
  };

  const value = {
    connected,
    deviceData,
    history,
    isScanning,
    connectDevice,
    disconnectDevice,
    updateDeviceData,
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
};
