import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Routes from './Routes';
import { getToken } from './utils/storage';
import {
  setupNotificationListeners,
  removeNotificationListeners,
} from './services/notificationService';

// Empêche Expo de masquer automatiquement le splash tant que l'app n'est pas prête.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // (Optionnel) Charger ici les polices personnalisées avec expo-font
        // dès que des fichiers de police (ex. Outfit) seront ajoutés au projet.
        // Aujourd'hui l'app utilise les polices système, donc aucune à charger.

        // Vérifie le token d'authentification (AsyncStorage) avant l'affichage.
        await getToken();
      } catch (e) {
        console.warn('[App] préparation splash :', e);
      } finally {
        setAppIsReady(true);
      }
    })();
  }, []);

  // ── Notifications push ──────────────────────────────────────
  // Écouteurs actifs tout au long de la vie de l'app. L'enregistrement du
  // jeton Expo est déclenché par AuthContext dès que l'utilisateur est connecté.
  useEffect(() => {
    const listeners = setupNotificationListeners();
    return () => removeNotificationListeners(listeners);
  }, []);

  // Masque le splash une fois la première frame rendue ET l'app prête.
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady]);

  if (!appIsReady) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        <Routes />
      </View>
    </SafeAreaProvider>
  );
}
