// src/services/notificationService.js
// ─────────────────────────────────────────────────────────────
// Notifications push Expo :
//  - enregistrement du jeton et envoi au backend Laravel
//  - écoute des notifications (foreground + clic)
//  - canal Android dédié aux rendez-vous
//
// ⚠️ Les push Expo ne fonctionnent que sur appareil PHYSIQUE.
// ─────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { navigate } from './navigationRef';

const PUSH_TOKEN_KEY = 'expo_push_token';
const ANDROID_CHANNEL_ID = 'mediai-rdv';

// Affiche les notifications reçues même lorsque l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Récupère le projectId EAS s'il est configuré (nécessaire hors Expo Go récent).
const getProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ||
  Constants?.easConfig?.projectId ||
  undefined;

// ── Canal Android ─────────────────────────────────────────────
export async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  // Pas de champ `sound` : sur Android une chaîne y est traitée comme un
  // fichier son personnalisé à bundler (ex. 'alert.wav'). 'default' déclenchait
  // « Custom sound 'default' not found ». Le canal HIGH joue le son système.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Rendez-vous MediAI',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

// ── Enregistrement du jeton push ──────────────────────────────
export async function registerForPushNotifications() {
  // Pas de push Expo sur le web (nécessiterait un service worker + VAPID).
  if (Platform.OS === 'web') return null;
  // Les push nécessitent un appareil physique.
  if (!Device.isDevice) {
    console.warn('[push] Appareil non physique : notifications indisponibles.');
    return null;
  }

  await configureAndroidChannel();

  // Permission (demande si nécessaire).
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('[push] Permission de notification refusée.');
    return null;
  }

  // Jeton Expo.
  let token;
  try {
    const projectId = getProjectId();
    const response = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = response.data;
  } catch (error) {
    console.warn('[push] Impossible de récupérer le token Expo :', error?.message || error);
    return null;
  }

  // Envoi au backend + stockage local.
  try {
    await api.put('/user/push-token', { expo_push_token: token });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (error) {
    console.warn('[push] Enregistrement du token côté serveur échoué :', error?.message || error);
  }

  return token;
}

// ── Écoute des notifications ──────────────────────────────────
// Retourne un objet { received, response } de subscriptions à nettoyer.
export function setupNotificationListeners() {
  // Aucun listener push à attacher sur le web.
  if (Platform.OS === 'web') return {};

  const received = Notifications.addNotificationReceivedListener((notification) => {
    // Notification reçue avec l'app au premier plan (log/toast possible ici).
    console.log('[push] reçue :', notification?.request?.content?.title);
  });

  const response = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res?.notification?.request?.content?.data || {};
    routeFromNotificationData(data);
  });

  return { received, response };
}

// Nettoyage des subscriptions (à appeler au démontage).
export function removeNotificationListeners(listeners) {
  listeners?.received?.remove?.();
  listeners?.response?.remove?.();
}

// Redirige l'utilisateur selon le type de notification.
function routeFromNotificationData(data = {}) {
  switch (data.type) {
    case 'new_appointment':
      // Médecin : liste des consultations à traiter.
      navigate('DoctorConsultations');
      break;
    case 'appointment_accepted':
    case 'appointment_cancelled':
    case 'appointment_completed':
    case 'appointment_updated':
      // Patient : accueil (section rendez-vous).
      navigate('Accueil');
      break;
    default:
      break;
  }
}
