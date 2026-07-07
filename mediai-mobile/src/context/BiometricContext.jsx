// src/context/BiometricContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { storeMeasure } from '../services/biometricService';

const BiometricContext = createContext();
const STORAGE_KEY = '@mediai_biometric';

// UUIDs BLE (DOIVENT être identiques à ceux du main.cpp de l'ESP32)
const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const CHARACTERISTIC_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
const DEVICE_NAME = 'MediAI Band Pro';

// ✅ État initial : toutes les métriques à null (pas de mesure)
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
  const managerRef = useRef(new BleManager());
  const deviceRef = useRef(null);
  // Buffer de ré-assemblage des trames BLE (une notification peut être
  // fragmentée par le MTU ; le firmware délimite chaque JSON par '\n').
  const bleBufferRef = useRef('');
  // Dernières valeurs affichées (miroir de deviceData accessible en synchrone
  // dans le callback BLE) : sert à conserver la dernière mesure valide quand
  // une trame arrive sans nouvelle valeur (main retirée du capteur).
  const deviceDataRef = useRef(INITIAL_DEVICE_DATA);

  const [connected, setConnected] = useState(false);
  const [deviceData, setDeviceData] = useState(INITIAL_DEVICE_DATA);
  const [history, setHistory] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadDeviceData();
    
    return () => {
      if (deviceRef.current) {
        deviceRef.current.cancelConnection().catch(() => {});
      }
      managerRef.current.destroy();
    };
  }, []);

  // ── Persistance AsyncStorage ──────────────────────────────
  const loadDeviceData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setConnected(parsed.connected || false);
        const restored = parsed.deviceData || INITIAL_DEVICE_DATA;
        setDeviceData(restored);
        deviceDataRef.current = restored;
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
        history: hist
      }));
    } catch (error) {
      console.error('❌ Erreur sauvegarde données IoT:', error);
    }
  };

  // ── Permissions Bluetooth (Android) ───────────────────────
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        const allGranted = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          console.error('❌ Permissions Bluetooth refusées');
          return false;
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message: 'MediAI a besoin de la localisation pour scanner les appareils Bluetooth',
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Refuser',
            buttonPositive: 'Accepter',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.error('❌ Permission localisation refusée');
          return false;
        }
      }
    }
    return true;
  };

  // ── Connexion BLE réelle ──────────────────────────────────
  const connectDevice = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.error('❌ Permissions refusées, annulation du scan');
      return;
    }

    setIsScanning(true);
    console.log('🔍 Scan BLE démarré...');

    const manager = managerRef.current;

    manager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        console.error('❌ Erreur scan BLE:', error.message);
        setIsScanning(false);
        return;
      }

      if (device && device.name === DEVICE_NAME) {
        console.log('✅ Dispositif trouvé:', device.name, 'ID:', device.id);
        manager.stopDeviceScan();
        setIsScanning(false);

        try {
          console.log('🔗 Connexion en cours...');
          const connectedDevice = await device.connect();
          deviceRef.current = connectedDevice;
          bleBufferRef.current = '';
          console.log('✅ Connecté');

          // Négocier un MTU plus grand pour que le JSON complet (~60 octets)
          // tienne dans une seule notification (défaut = 20 octets utiles).
          try {
            await connectedDevice.requestMTU(247);
            console.log('✅ MTU négocié (247)');
          } catch (mtuErr) {
            console.warn('⚠️ MTU non négocié, ré-assemblage par trames utilisé:', mtuErr.message);
          }

          console.log('🔍 Découverte des services...');
          await connectedDevice.discoverAllServicesAndCharacteristics();
          console.log('✅ Services découverts');

          console.log('📡 Abonnement aux notifications...');
          connectedDevice.monitorCharacteristicForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            (error, characteristic) => {
              if (error) {
                console.error('❌ Erreur monitoring:', error.message);
                setConnected(false);
                return;
              }

              if (characteristic && characteristic.value) {
                // Décoder le fragment reçu et l'ajouter au buffer de ré-assemblage.
                let chunk;
                try {
                  chunk = atob(characteristic.value);
                } catch (e) {
                  console.error('❌ Décodage base64 BLE:', e.message);
                  return;
                }
                bleBufferRef.current += chunk;

                // Applique une trame JSON complète et met à jour l'état.
                const applyFrame = (frame) => {
                  const clean = frame.trim();
                  if (!clean) return true;
                  let jsonData;
                  try {
                    jsonData = JSON.parse(clean);
                  } catch (e) {
                    return false; // trame incomplète : on attendra la suite
                  }

                  console.log('📥 Données reçues:', jsonData);

                  // Normalisation : une métrique absente, nulle OU à 0 est
                  // considérée « pas de mesure ». 0 n'est jamais une valeur
                  // physiologique valide (temp/FC/SpO2).
                  const reading = {
                    temp: jsonData.temp || null,
                    hr: jsonData.hr || null,
                    spo2: jsonData.spo2 || null,
                  };

                  // Conserver la dernière mesure valide : si la trame courante
                  // n'apporte pas de nouvelle valeur pour une métrique (main
                  // retirée → null), on garde la précédente au lieu de l'effacer.
                  // Les valeurs restent donc affichées jusqu'à la prochaine mesure.
                  const prev = deviceDataRef.current;
                  const newDeviceData = {
                    temp: reading.temp ?? prev.temp,
                    hr: reading.hr ?? prev.hr,
                    spo2: reading.spo2 ?? prev.spo2,
                    bpSystolic: null,
                    bpDiastolic: null,
                    glyc: null,
                    resp: null,
                    timestamp: new Date().toISOString(),
                    valid: jsonData.valid || false,
                  };

                  deviceDataRef.current = newDeviceData;
                  setDeviceData(newDeviceData);
                  setConnected(true);

                  // N'historiser/synchroniser que lorsqu'une vraie mesure arrive,
                  // pour ne pas remplir l'historique de valeurs recopiées.
                  const hasNewReading =
                    reading.temp !== null || reading.hr !== null || reading.spo2 !== null;

                  if (hasNewReading) {
                    setHistory(prev => {
                      const newHistory = [newDeviceData, ...prev].slice(0, 50);
                      saveDeviceData(true, newDeviceData, newHistory);
                      return newHistory;
                    });

                    if (newDeviceData.valid) {
                      storeMeasure(newDeviceData).catch(() => {});
                    }
                  }
                  return true;
                };

                // Cas 1 : firmware récent → trames délimitées par '\n'.
                if (bleBufferRef.current.includes('\n')) {
                  let idx;
                  while ((idx = bleBufferRef.current.indexOf('\n')) !== -1) {
                    const frame = bleBufferRef.current.slice(0, idx);
                    bleBufferRef.current = bleBufferRef.current.slice(idx + 1);
                    applyFrame(frame);
                  }
                } else {
                  // Cas 2 : pas de délimiteur → tenter dès que le buffer forme
                  // un objet JSON complet (une notification = un JSON si MTU OK).
                  const candidate = bleBufferRef.current.trim();
                  if (candidate.endsWith('}') && applyFrame(candidate)) {
                    bleBufferRef.current = '';
                  }
                }

                // Garde-fou : ne jamais laisser le buffer gonfler indéfiniment.
                if (bleBufferRef.current.length > 512) bleBufferRef.current = '';
              }
            }
          );

          setConnected(true);
          console.log('✅ Connexion BLE établie avec succès');
        } catch (err) {
          console.error('❌ Erreur connexion BLE:', err);
          setConnected(false);
          deviceRef.current = null;
        }
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      console.log('⏱️ Timeout scan BLE');
    }, 15000);
  }, []);

  // ── Déconnexion ───────────────────────────────────────────
  const disconnectDevice = useCallback(async () => {
    try {
      if (deviceRef.current) {
        await deviceRef.current.cancelConnection();
        deviceRef.current = null;
      }
      bleBufferRef.current = '';
      setConnected(false);
      // ✅ Réinitialiser à null (pas de valeurs par défaut)
      deviceDataRef.current = INITIAL_DEVICE_DATA;
      setDeviceData(INITIAL_DEVICE_DATA);
      saveDeviceData(false, null, history);
      console.log('🔌 Déconnecté');
    } catch (err) {
      console.error('❌ Erreur déconnexion:', err);
    }
  }, [history]);

  // ── Mise à jour manuelle des données ──────────────────────
  const updateDeviceData = async (newData) => {
    const updatedData = { ...deviceData, ...newData, timestamp: new Date().toISOString() };
    deviceDataRef.current = updatedData;
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
    updateDeviceData
  };

  return (
    <BiometricContext.Provider value={value}>
      {children}
    </BiometricContext.Provider>
  );
};