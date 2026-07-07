// src/pages/ForgotPassword.jsx
// ─────────────────────────────────────────────────────────────
// Mot de passe oublié — flux OTP en 2 étapes :
//   Étape 1 : saisie de l'e-mail → envoi d'un code à 6 chiffres.
//   Étape 2 : saisie du code + nouveau mot de passe → réinitialisation.
// ─────────────────────────────────────────────────────────────
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { colors } from '../styles/globalStyles';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import { requestPasswordReset, resetPassword } from '../services/authService';

export default function ForgotPassword({ navigation }) {
  const [step, setStep] = useState(1); // 1 = email, 2 = code + nouveau mot de passe
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  // ── Étape 1 : demander le code ──────────────────────────────
  const handleRequestCode = async () => {
    if (!email.trim()) {
      showToast('Veuillez saisir votre adresse e-mail', 'warning');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email.trim());
    setLoading(false);

    if (result.success) {
      showToast('Code envoyé ! Vérifiez votre boîte mail.', 'success');
      setStep(2);
    } else {
      showToast(result.error, 'error');
    }
  };

  // ── Étape 2 : valider le code et changer le mot de passe ────
  const handleResetPassword = async () => {
    if (!code.trim() || !password || !confirmPassword) {
      showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }
    if (password.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'warning');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email.trim(), code.trim(), password);
    setLoading(false);

    if (result.success) {
      showToast('Mot de passe réinitialisé ! Connectez-vous.', 'success');
      setTimeout(() => navigation.navigate('Login'), 1200);
    } else {
      showToast(result.error, 'error');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <Loader visible={loading} />

      <View style={styles.header}>
        <View style={{ height: 54 }} />
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>🔑</Text>
        </View>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Saisissez votre e-mail pour recevoir un code'
            : `Code envoyé à ${email}`}
        </Text>
      </View>

      <View style={styles.form}>
        {step === 1 ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Adresse e-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="exemple@mail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.muted}
              />
            </View>
            <Button title="Envoyer le code" onPress={handleRequestCode} />
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Code reçu (6 chiffres)</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="••••••"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor={colors.muted}
              />
            </View>
            <Button title="Réinitialiser le mot de passe" onPress={handleResetPassword} />
            <TouchableOpacity style={styles.resend} onPress={handleRequestCode}>
              <Text style={styles.resendText}>Renvoyer un code</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.backContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backLink}>← Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoIconText: { fontSize: 30 },
  title: { fontSize: 26, fontWeight: '700', color: colors.green },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 5, textAlign: 'center', paddingHorizontal: 24 },
  form: { flex: 1, paddingHorizontal: 24 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: colors.white, color: colors.text },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '700' },
  resend: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: colors.greenLight, fontWeight: '500' },
  backContainer: { alignItems: 'center', marginTop: 24 },
  backLink: { fontSize: 14, fontWeight: '600', color: colors.green },
});
