// src/components/auth/GoogleSignInButton.web.jsx
// ─────────────────────────────────────────────────────────────
// Variante WEB du bouton « Continuer avec Google ».
// Metro/Expo choisit ce fichier (extension .web.jsx) sur le web ; il
// n'importe donc JAMAIS @react-native-google-signin (100 % natif).
//
// Utilise Google Identity Services via @react-oauth/google. Le
// `credential` renvoyé par GoogleLogin est un ID token JWT dont l'audience
// est le WEB_CLIENT_ID → accepté tel quel par le backend /auth/google
// (qui valide `aud` contre GOOGLE_CLIENT_IDS).
//
// ⚠️ Prérequis Google Cloud Console : ajouter l'origine JavaScript
//    autorisée (ex. http://localhost:8081, puis le domaine de prod) au
//    client OAuth Web, sinon GIS refuse d'émettre le token.
//
// Même contrat que la variante native :
//   onIdToken(idToken) / onError(message, type)
// ─────────────────────────────────────────────────────────────
import { View, StyleSheet } from 'react-native';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { WEB_CLIENT_ID } from '../../config/google';

export default function GoogleSignInButton({ onIdToken, onError }) {
  return (
    <View style={styles.wrap}>
      <GoogleOAuthProvider clientId={WEB_CLIENT_ID}>
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            const idToken = credentialResponse?.credential;
            if (idToken) {
              onIdToken?.(idToken);
            } else {
              onError?.('Connexion Google annulée', 'warning');
            }
          }}
          onError={() => onError?.('Erreur lors de la connexion Google', 'error')}
          text="continue_with"
          shape="rectangular"
          width="320"
        />
      </GoogleOAuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
});
