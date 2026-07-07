// src/pages/Register.jsx - VERSION AVEC BOUTONS SOCIAUX
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { colors } from '../styles/globalStyles';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { MESSAGES } from '../utils/messages';

export default function Register({ navigation, route }) {
  const initialEmail = route?.params?.verifyEmail || '';
  const initialVerificationStep = Boolean(route?.params?.verifyAccount || initialEmail);
  const [step, setStep] = useState(initialVerificationStep ? 4 : 1);
  const [role, setRole] = useState('patient'); // 'patient' | 'medecin'
  const [specialite, setSpecialite] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sexe, setSexe] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [antecedents, setAntecedents] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const { register, verifyEmail, resendEmailVerification } = useAuth();

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const specialiteOptions = [
    'Médecine générale', 'Cardiologie', 'Pédiatrie', 'Gynécologie',
    'Dermatologie', 'Ophtalmologie', 'Neurologie', 'Psychiatrie',
    'Chirurgie', 'Dentaire', 'ORL', 'Autre',
  ];
  const isMedecin = role === 'medecin';

  const handleNext = () => {
    if (step === 1) {
      if (!name || !email || !phone || !password || !confirmPassword) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Les mots de passe ne correspondent pas', 'warning');
        return;
      }
      if (password.length < 8) {
        showToast('Le mot de passe doit contenir au moins 8 caractères', 'warning');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (isMedecin) {
        if (!specialite) {
          showToast('Veuillez sélectionner votre spécialité', 'warning');
          return;
        }
      } else if (!age || !sexe) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    const result = await register({
      name, email, phone, password, role, specialite,
      // Champs médicaux uniquement pour un patient (masqués côté médecin)
      age: isMedecin ? null : parseInt(age),
      sexe: isMedecin ? 'A' : sexe,
      bloodType: isMedecin ? null : (bloodType || 'A+'),
      allergies: isMedecin ? null : (allergies || 'Aucune'),
      antecedents: isMedecin ? null : (antecedents || 'Aucun'),
      location: 'Yaoundé, Cameroun'
    });
    setLoading(false);

    if (result.success) {
      if (result.requiresEmailVerification) {
        setEmail(result.email || email.trim());
        setStep(4);
        showToast('Code envoyé ! Vérifiez votre boîte mail.', 'success');
      } else {
        showToast(MESSAGES.REGISTER_SUCCESS, 'success');
      }
    } else {
      showToast(result.error || MESSAGES.REGISTER_ERROR, 'error');
    }
  };

  const handleVerifyEmail = async () => {
    const normalizedEmail = email.trim();
    const normalizedCode = verificationCode.trim();

    if (!normalizedEmail || !normalizedCode) {
      showToast('Veuillez saisir votre e-mail et le code reçu', 'warning');
      return;
    }
    if (normalizedCode.length !== 6) {
      showToast('Le code doit contenir 6 chiffres', 'warning');
      return;
    }

    setLoading(true);
    const result = await verifyEmail(normalizedEmail, normalizedCode);
    setLoading(false);

    if (result.success) {
      showToast('Compte validé avec succès !', 'success');
    } else {
      showToast(result.error || 'Code invalide ou expiré', 'error');
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      showToast('Veuillez saisir votre adresse e-mail', 'warning');
      return;
    }

    setLoading(true);
    const result = await resendEmailVerification(normalizedEmail);
    setLoading(false);

    if (result.success) {
      showToast('Nouveau code envoyé par e-mail.', 'success');
    } else {
      showToast(result.error || "Impossible d'envoyer le code", 'error');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <Loader visible={loading} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ height: 40 }} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>🧬</Text>
          </View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez MediAI</Text>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
            <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
            <Text style={styles.progressLabel}>Compte</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
            <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
            <Text style={styles.progressLabel}>{isMedecin ? 'Profil' : 'Médical'}</Text>
          </View>
          <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
            <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
            <Text style={styles.progressLabel}>{step === 4 ? 'Email' : isMedecin ? 'Validation' : 'IoT'}</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Step 1: Account Info */}
          {step === 1 && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Je m'inscris en tant que</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'patient' && styles.roleCardActive]}
                    onPress={() => setRole('patient')}
                  >
                    <Text style={styles.roleEmoji}>🧑</Text>
                    <Text style={[styles.roleTitle, role === 'patient' && styles.roleTitleActive]}>Patient</Text>
                    <Text style={[styles.roleDesc, role === 'patient' && styles.roleDescActive]}>Suivi santé & diagnostic</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'medecin' && styles.roleCardActive]}
                    onPress={() => setRole('medecin')}
                  >
                    <Text style={styles.roleEmoji}>👨‍⚕️</Text>
                    <Text style={[styles.roleTitle, role === 'medecin' && styles.roleTitleActive]}>Médecin</Text>
                    <Text style={[styles.roleDesc, role === 'medecin' && styles.roleDescActive]}>Consultations & patients</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom complet</Text>
                <TextInput style={styles.input} placeholder="Jean-Paul Mbarga" value={name} onChangeText={setName} placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput style={styles.input} placeholder="exemple@email.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Téléphone</Text>
                <TextInput style={styles.input} placeholder="+237 6XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmer mot de passe</Text>
                <TextInput style={styles.input} placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={colors.muted} />
              </View>
            </>
          )}

          {/* Step 2 (médecin) : Profil professionnel */}
          {step === 2 && isMedecin && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Spécialité</Text>
              <View style={styles.bloodTypeContainer}>
                {specialiteOptions.map(spec => (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.bloodTypeBtn, specialite === spec && styles.bloodTypeBtnActive]}
                    onPress={() => setSpecialite(spec)}
                  >
                    <Text style={[styles.bloodTypeText, specialite === spec && styles.bloodTypeTextActive]}>{spec}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 2 (patient) : Medical Info */}
          {step === 2 && !isMedecin && (
            <>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Âge</Text>
                  <TextInput style={styles.input} placeholder="35" value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={colors.muted} />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Sexe</Text>
                  <View style={styles.sexeContainer}>
                    <TouchableOpacity style={[styles.sexeButton, sexe === 'M' && styles.sexeButtonActive]} onPress={() => setSexe('M')}>
                      <Text style={[styles.sexeText, sexe === 'M' && styles.sexeTextActive]}>M</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.sexeButton, sexe === 'F' && styles.sexeButtonActive]} onPress={() => setSexe('F')}>
                      <Text style={[styles.sexeText, sexe === 'F' && styles.sexeTextActive]}>F</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Groupe sanguin</Text>
                <View style={styles.bloodTypeContainer}>
                  {bloodTypeOptions.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.bloodTypeBtn, bloodType === type && styles.bloodTypeBtnActive]}
                      onPress={() => setBloodType(type)}
                    >
                      <Text style={[styles.bloodTypeText, bloodType === type && styles.bloodTypeTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Allergies</Text>
                <TextInput style={styles.input} placeholder="Ex: Pénicilline, Arachides..." value={allergies} onChangeText={setAllergies} placeholderTextColor={colors.muted} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Antécédents médicaux</Text>
                <TextInput style={styles.input} placeholder="Ex: Diabète, Hypertension..." value={antecedents} onChangeText={setAntecedents} placeholderTextColor={colors.muted} />
              </View>
            </>
          )}

          {/* Step 3: IoT Consent */}
          {step === 3 && (
            <>
              {!isMedecin && (
                <View style={styles.iotCard}>
                  <Text style={styles.iotIcon}>📡</Text>
                  <Text style={styles.iotTitle}>Connecter un dispositif IoT</Text>
                  <Text style={styles.iotSubtitle}>Couplage optionnel avec votre bracelet de mesures biologiques.</Text>
                  <TouchableOpacity style={styles.iotButton} onPress={() => showToast('📡 Bluetooth activé — Recherche de dispositifs…', 'info')}>
                    <Text style={styles.iotButtonText}>📡 Rechercher un dispositif</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.consentTitle}>Consentements requis</Text>
              <View style={styles.checkItem}>
                <View style={styles.checkCircle}><Text style={styles.checkText}>✓</Text></View>
                <Text style={styles.checkLabel}>J'accepte les <Text style={styles.checkLink}>conditions d'utilisation</Text></Text>
              </View>
              <View style={styles.checkItem}>
                <View style={styles.checkCircle}><Text style={styles.checkText}>✓</Text></View>
                <Text style={styles.checkLabel}>J'accepte la <Text style={styles.checkLink}>politique de confidentialité</Text></Text>
              </View>
              <View style={styles.checkItem}>
                <View style={styles.checkCircle}><Text style={styles.checkText}>✓</Text></View>
                <Text style={styles.checkLabel}>Je consens au traitement de mes <Text style={styles.checkLink}>données de santé</Text></Text>
              </View>
            </>
          )}

          {/* Step 4: Email verification */}
          {step === 4 && (
            <>
              <View style={styles.verificationCard}>
                <Text style={styles.verificationIcon}>✉️</Text>
                <Text style={styles.verificationTitle}>Validation du compte</Text>
                <Text style={styles.verificationSubtitle}>Saisissez le code reçu par e-mail.</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Adresse e-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="exemple@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Code de validation</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="123456"
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.muted}
                />
              </View>
              <TouchableOpacity style={styles.resendButton} onPress={handleResendVerification}>
                <Text style={styles.resendButtonText}>Renvoyer le code</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {step > 1 && step < 4 && (
              <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handlePrevious}>
                <Text style={styles.prevButtonText}>← Retour</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity style={[styles.navButton, styles.nextButton, step === 1 && { flex: 1 }]} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Suivant →</Text>
              </TouchableOpacity>
            ) : step === 3 ? (
              <TouchableOpacity style={[styles.navButton, styles.registerButton]} onPress={handleRegister}>
                <Text style={styles.registerButtonText}>✅ Créer mon compte</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.navButton, styles.registerButton]} onPress={handleVerifyEmail}>
                <Text style={styles.registerButtonText}>Valider mon compte</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  backButton: { alignSelf: 'flex-start', marginBottom: 20 },
  backText: { fontSize: 13, color: colors.green },
  logoIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoIconText: { fontSize: 28 },
  title: { fontSize: 24, fontWeight: '700', color: colors.green },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 5 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, marginVertical: 20 },
  progressStep: { alignItems: 'center' },
  progressNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, textAlign: 'center', lineHeight: 32, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  progressNumberActive: { backgroundColor: colors.green, color: colors.white },
  progressStepActive: {},
  progressLabel: { fontSize: 10, color: colors.muted },
  progressLine: { width: 40, height: 2, backgroundColor: colors.border, marginHorizontal: 8 },
  progressLineActive: { backgroundColor: colors.green },
  form: { paddingHorizontal: 24, paddingBottom: 40 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: colors.white, color: colors.text },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '700' },
  roleContainer: { flexDirection: 'row', gap: 12 },
  roleCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center' },
  roleCardActive: { backgroundColor: colors.greenPale, borderColor: colors.green },
  roleEmoji: { fontSize: 28, marginBottom: 6 },
  roleTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  roleTitleActive: { color: colors.green },
  roleDesc: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },
  roleDescActive: { color: colors.green },
  row: { flexDirection: 'row', gap: 16, marginBottom: 0 },
  sexeContainer: { flexDirection: 'row', gap: 12 },
  sexeButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  sexeButtonActive: { backgroundColor: colors.green, borderColor: colors.green },
  sexeText: { fontSize: 16, color: colors.muted },
  sexeTextActive: { color: colors.white },
  bloodTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodTypeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  bloodTypeBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  bloodTypeText: { fontSize: 13, color: colors.muted },
  bloodTypeTextActive: { color: colors.white },
  iotCard: { backgroundColor: colors.blueBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#bae6fd' },
  iotIcon: { fontSize: 28, marginBottom: 8 },
  iotTitle: { fontSize: 15, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  iotSubtitle: { fontSize: 12, color: '#0c4a6e', marginBottom: 12 },
  iotButton: { backgroundColor: colors.green, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  iotButtonText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  consentTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center' },
  checkText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  checkLabel: { fontSize: 12, color: colors.muted },
  checkLink: { color: colors.green, fontWeight: '600' },
  verificationCard: { backgroundColor: colors.greenPale, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' },
  verificationIcon: { fontSize: 28, marginBottom: 8 },
  verificationTitle: { fontSize: 16, fontWeight: '700', color: colors.green, marginBottom: 4 },
  verificationSubtitle: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  resendButton: { alignItems: 'center', paddingVertical: 8 },
  resendButtonText: { fontSize: 14, color: colors.greenLight, fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 24 },
  navButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  prevButton: { backgroundColor: colors.border },
  prevButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  nextButton: { backgroundColor: colors.green },
  nextButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  registerButton: { flex: 1, backgroundColor: colors.green },
  registerButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.muted },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  socialIcon: { fontSize: 18 },
  socialButtonText: { fontSize: 14, fontWeight: '500', color: colors.text },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: colors.muted },
  loginLink: { fontSize: 14, fontWeight: '600', color: colors.green },
});
