// src/components/auth/GoogleSignInButton.jsx
// ─────────────────────────────────────────────────────────────
// Variante NATIVE (Android/iOS) du bouton « Continuer avec Google ».
// Encapsule tout le flux @react-native-google-signin :
//   - configuration au montage (webClientId),
//   - hasPlayServices + signIn,
//   - extraction de l'ID token,
//   - traduction des codes d'erreur en messages.
//
// Le parent ne connaît que deux callbacks :
//   onIdToken(idToken)         → succès, à échanger contre une session
//   onError(message, type)     → 'warning' (annulation) ou 'error'
//
// La variante web vit dans GoogleSignInButton.web.jsx (Metro la choisit
// automatiquement sur le web) et n'importe PAS ce module natif.
// ─────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { colors } from '../../styles/globalStyles';
import { WEB_CLIENT_ID } from '../../config/google';

export default function GoogleSignInButton({ onIdToken, onError }) {
  // Configure Google Sign-In une seule fois au montage.
  useEffect(() => {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  }, []);

  const handlePress = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      // v13+ : { type: 'success', data: { idToken, user } } ; versions antérieures : { idToken }
      const idToken = result?.data?.idToken ?? result?.idToken;
      if (!idToken) {
        onError?.('Connexion Google annulée', 'warning');
        return;
      }
      onIdToken?.(idToken);
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        onError?.('Connexion Google annulée', 'warning');
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError?.('Google Play Services indisponible', 'error');
      } else if (String(error?.code) === '10' || error?.code === statusCodes.DEVELOPER_ERROR) {
        // DEVELOPER_ERROR : SHA-1 / package non enregistrés dans le client
        // OAuth Android, ou webClientId incorrect (mauvaise config Google Cloud).
        onError?.('Config Google invalide (SHA-1/package)', 'error');
      } else {
        onError?.(`Erreur Google${error?.code ? ` [${error.code}]` : ''}`, 'error');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.socialButton} onPress={handlePress}>
      <Text style={styles.socialIcon}>🌐</Text>
      <Text style={styles.socialButtonText}>Continuer avec Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  socialIcon: { fontSize: 18 },
  socialButtonText: { fontSize: 13, fontWeight: '500', color: colors.text },
});
