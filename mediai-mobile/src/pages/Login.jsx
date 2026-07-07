// src/pages/Login.jsx - VERSION AVEC GOOGLE
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { colors } from '../styles/globalStyles';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { MESSAGES } from '../utils/messages';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const { login, loginWithGoogle } = useAuth();

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      showToast(MESSAGES.LOGIN_SUCCESS, 'success');
    } else {
      showToast(result.error || MESSAGES.LOGIN_ERROR, 'error');
    }
  };

  // Reçoit l'ID token (depuis le bouton natif OU web) et l'échange contre
  // une session côté backend. La logique spécifique à la plateforme (SDK
  // natif vs Google Identity Services) vit dans GoogleSignInButton.
  const handleGoogleIdToken = async (idToken) => {
    setLoading(true);
    const res = await loginWithGoogle(idToken);
    setLoading(false);

    if (res.success) {
      showToast(MESSAGES.LOGIN_SUCCESS, 'success');
    } else {
      showToast(res.error || MESSAGES.LOGIN_ERROR, 'error');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <Loader visible={loading} />
      <View style={styles.authCircleLarge} />
      <View style={styles.authCircleLeft} />
      <View style={styles.authCircleSmall} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
      <View style={styles.header}>
        <View style={{ height: 54 }} />
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>🧬</Text>
        </View>
        <Text style={styles.title}>MediAI</Text>
        <Text style={styles.subtitle}>Votre santé intelligente</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.cardHandle} />
        <Text style={styles.authTitle}>Bon retour 👋</Text>
        <Text style={styles.authSubtitle}>Connectez-vous pour accéder à votre espace santé.</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Adresse e-mail</Text>
          <TextInput 
            style={styles.input} 
            placeholder="jean@exemple.com" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address" 
            placeholderTextColor={colors.muted} 
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="••••••••" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.muted} 
            />
            <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(prev => !prev)}>
              <Text style={styles.passwordToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.authButton} onPress={handleLogin}>
          <Text style={styles.authButtonText}>🔐 Se connecter</Text>
        </TouchableOpacity>

        {/* Séparateur */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou continuer avec</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Bouton Google — variante native ou web résolue par Metro */}
        <GoogleSignInButton
          onIdToken={handleGoogleIdToken}
          onError={(message, type = 'error') => showToast(message, type)}
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.verifyContainer}>
          <Text style={styles.registerText}>Compte non validé ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { verifyEmail: email.trim(), verifyAccount: true })}>
            <Text style={styles.registerLink}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1b4332" },
  scrollContent: { flexGrow: 1 },
  authCircleLarge: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -80, right: -80, backgroundColor: "rgba(82,183,136,0.06)" },
  authCircleLeft: { position: "absolute", width: 200, height: 200, borderRadius: 100, bottom: 200, left: -60, backgroundColor: "rgba(82,183,136,0.06)" },
  authCircleSmall: { position: "absolute", width: 120, height: 120, borderRadius: 60, top: 300, right: 30, backgroundColor: "rgba(82,183,136,0.06)" },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 28 },
  logoIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  logoIconText: { fontSize: 30 },
  title: { fontSize: 28, fontWeight: "700", color: colors.white },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 5, letterSpacing: 1.5, textTransform: "uppercase" },
  form: { flex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 32, backgroundColor: colors.cream, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  cardHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 22 },
  authTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  authSubtitle: { fontSize: 12, color: colors.muted, marginBottom: 22, lineHeight: 18 },
  inputContainer: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: "600", color: colors.muted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: colors.white, color: colors.text },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white },
  passwordInput: { flex: 1, padding: 12, fontSize: 13, color: colors.text },
  passwordToggle: { paddingHorizontal: 14, alignSelf: "stretch", justifyContent: "center" },
  passwordToggleText: { fontSize: 16 },
  forgotPassword: { alignItems: "flex-end", marginBottom: 16 },
  forgotPasswordText: { fontSize: 12, color: colors.green, fontWeight: "500" },
  authButton: { width: "100%", padding: 15, backgroundColor: colors.green, borderRadius: 14, alignItems: "center", marginTop: 6, shadowColor: colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  authButtonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.muted },
  socialButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  socialIcon: { fontSize: 18 },
  socialButtonText: { fontSize: 13, fontWeight: "500", color: colors.text },
  registerContainer: { flexDirection: "row", justifyContent: "center", marginTop: 14 },
  verifyContainer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  registerText: { fontSize: 12, color: colors.muted },
  registerLink: { fontSize: 12, fontWeight: "600", color: colors.green },
});
