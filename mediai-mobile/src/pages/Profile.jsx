// src/pages/Profile.jsx - VERSION CORRIGÉE
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput, Modal, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors } from '../styles/globalStyles';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/common/Toast';
import { ROLE_LABELS } from '../utils/roles';

export default function Profile({ navigation }) {
  const { user, logout, isAdmin, isMedecin, updateUser: updateCurrentUser, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showMedicalEdit, setShowMedicalEdit] = useState(false);
  const [medicalForm, setMedicalForm] = useState({});

  const showToastMessage = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        age: user.age?.toString() || '',
        sexe: user.sexe || '',
        location: user.location || '',
        bloodType: user.bloodType || '',
        rhesus: user.rhesus || '+',
        allergies: user.allergies || '',
        antecedents: user.antecedents || '',
      });
      setMedicalForm({
        bloodType: user.bloodType || '',
        rhesus: user.rhesus || '+',
        allergies: user.allergies || '',
        antecedents: user.antecedents || '',
      });
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Rafraîchit depuis l'API (/me) ; le contexte met à jour `user`,
    // ce qui réinitialise formData via le useEffect ci-dessus.
    await refreshUser();
    setRefreshing(false);
  }, []);

  const handleSaveProfile = async () => {
    const res = await updateCurrentUser({
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      age: formData.age,
      sexe: formData.sexe,
    });
    if (res.success) {
      showToastMessage('✅ Profil mis à jour avec succès', 'success');
      setIsEditing(false);
    } else {
      showToastMessage('❌ ' + (res.error || 'Erreur lors de la mise à jour'), 'error');
    }
  };

  const handleSaveMedicalInfo = async () => {
    const res = await updateCurrentUser({
      bloodType: medicalForm.bloodType,
      rhesus: medicalForm.rhesus, // requis : le backend valide "A+", pas "A"
      allergies: medicalForm.allergies,
      antecedents: medicalForm.antecedents,
    });
    if (res.success) {
      setFormData(prev => ({ ...prev, bloodType: medicalForm.bloodType, rhesus: medicalForm.rhesus, allergies: medicalForm.allergies, antecedents: medicalForm.antecedents }));
      showToastMessage('✅ Informations médicales mises à jour', 'success');
      setShowMedicalEdit(false);
    } else {
      showToastMessage('❌ ' + (res.error || 'Erreur lors de la mise à jour'), 'error');
    }
  };

  const doLogout = async () => {
    // Pas de navigation manuelle : logout() bascule isAuthenticated à false,
    // ce qui fait basculer le rendu conditionnel (AppStack → AuthStack) et
    // affiche Login automatiquement. Naviguer ici viserait un écran absent
    // de la pile courante → warning "NAVIGATE 'Login' was not handled".
    await logout();
  };

  const handleLogout = () => {
    // react-native-web n'implémente pas Alert.alert multi-boutons :
    // sur web on passe par window.confirm, sinon Alert natif.
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        doLogout();
      }
      return;
    }
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', onPress: doLogout, style: 'destructive' }
    ]);
  };

  const bloodTypeOptions = ['A', 'B', 'AB', 'O'];
  const rhesusOptions = ['+', '-'];
  const genderOptions = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
    { value: 'A', label: 'Autre' },
  ];
  const getSexLabel = (sexe) => genderOptions.find(option => option.value === sexe)?.label || 'Non renseigné';
  const isPatientProfile = !isAdmin && !isMedecin;
  const displayBloodGroup = `${user?.bloodType || "Non renseigné"}${user?.bloodType ? (user?.rhesus || "") : ""}`;
  const formatBirthDate = (value) => {
    if (!value) return user?.age ? `${user.age} ans` : "Non renseigné";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString("fr-FR");
  };
  const birthDateText = formatBirthDate(user?.birthDate);
  const chronicOptions = [
    { field: "hasSickleCell", icon: "🩸", label: "Drépanocytose", sub: "Trait AS ou forme SS", enabled: Boolean(user?.hasSickleCell) },
    { field: "hasDiabetes", icon: "🍬", label: "Diabète", sub: "Type 1 ou Type 2", enabled: Boolean(user?.hasDiabetes) },
    { field: "hasHypertension", icon: "🫀", label: "Hypertension (HTA)", sub: "Sous traitement ou non", enabled: Boolean(user?.hasHypertension) },
  ];

  const toggleChronic = async (item) => {
    const res = await updateCurrentUser({ [item.field]: !item.enabled });
    showToastMessage(res.success ? "✅ Profil IA mis à jour" : "⚠️ Condition mise à jour localement", res.success ? "success" : "warning");
  };

  const renderInfoRow = ({ icon, label, value, children, onPress, valueStyle }) => (
    <TouchableOpacity style={styles.mockInfoRow} activeOpacity={onPress ? 0.75 : 1} onPress={onPress}>
      <View style={styles.mockInfoLeft}>
        <Text style={styles.mockInfoIcon}>{icon}</Text>
        <Text style={styles.mockInfoLabel}>{label}</Text>
      </View>
      <View style={styles.mockInfoRight}>
        {children || <Text style={[styles.mockInfoValue, valueStyle]}>{value}</Text>}
        {onPress && <Text style={styles.mockInfoArrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderChronicRow = (item) => (
    <TouchableOpacity key={item.field} style={styles.chronicRow} activeOpacity={0.75} onPress={() => toggleChronic(item)}>
      <View style={styles.chronicLeft}>
        <Text style={styles.chronicIcon}>{item.icon}</Text>
        <View>
          <Text style={styles.chronicLabel}>{item.label}</Text>
          <Text style={styles.chronicSub}>{item.sub}</Text>
        </View>
      </View>
      <View style={[styles.chronicSwitch, item.enabled && styles.chronicSwitchOn]}>
        <View style={[styles.chronicThumb, item.enabled && styles.chronicThumbOn]} />
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      
      {!isMedecin && (
      <Modal visible={showMedicalEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>📝 Informations médicales</Text>
            <Text style={styles.modalLabel}>🩸 Groupe sanguin</Text>
            <View style={styles.bloodTypeContainer}>
              {bloodTypeOptions.map(type => (
                <TouchableOpacity key={type} style={[styles.bloodTypeBtn, medicalForm.bloodType === type && styles.bloodTypeBtnActive]} onPress={() => setMedicalForm({ ...medicalForm, bloodType: type })}>
                  <Text style={[styles.bloodTypeText, medicalForm.bloodType === type && styles.bloodTypeTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>🧬 Facteur Rhésus</Text>
            <View style={styles.rhesusContainer}>
              {rhesusOptions.map(rh => (
                <TouchableOpacity key={rh} style={[styles.rhesusBtn, medicalForm.rhesus === rh && styles.rhesusBtnActive]} onPress={() => setMedicalForm({ ...medicalForm, rhesus: rh })}>
                  <Text style={[styles.rhesusText, medicalForm.rhesus === rh && styles.rhesusTextActive]}>{rh}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>💊 Allergies</Text>
            <TextInput style={styles.modalInput} placeholder="Ex: Pénicilline, Arachides..." value={medicalForm.allergies} onChangeText={(text) => setMedicalForm({ ...medicalForm, allergies: text })} multiline />
            <Text style={styles.modalLabel}>🏥 Antécédents médicaux</Text>
            <TextInput style={[styles.modalInput, styles.modalTextArea]} placeholder="Ex: Diabète, Hypertension..." value={medicalForm.antecedents} onChangeText={(text) => setMedicalForm({ ...medicalForm, antecedents: text })} multiline numberOfLines={3} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMedicalEdit(false)}><Text style={styles.modalCancelText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMedicalInfo}><Text style={styles.modalSaveText}>Enregistrer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}>
        <View style={styles.header}>
          <View style={{ height: 34 }} />
          <View style={styles.avatar}><Text style={styles.avatarEmoji}>{isMedecin ? (user?.sexe === 'F' ? '👩‍⚕️' : '👨‍⚕️') : (user?.sexe === 'F' ? '👩' : '👤')}</Text></View>
          {isEditing ? <TextInput style={styles.editNameInput} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} /> : <Text style={styles.name}>{user?.name || 'Invité'}</Text>}
          <View style={[styles.roleBadge, { backgroundColor: ROLE_LABELS[user?.role]?.bgColor || '#f0f0f0' }]}><Text style={[styles.roleText, { color: ROLE_LABELS[user?.role]?.color || colors.muted }]}>{ROLE_LABELS[user?.role]?.label || '👤 Patient'}</Text></View>
          <Text style={styles.id}>ID {isMedecin ? 'Médecin' : 'Patient'} : #MP-{String(user?.id || 0).padStart(6, '0')}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statNum}>{user?.consultations || 0}</Text><Text style={styles.statLabel}>Consultations</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{user?.appointments || 0}</Text><Text style={styles.statLabel}>RDV planifiés</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>{isMedecin ? 'MD' : (user?.bloodType || '?') + (user?.rhesus || '')}</Text><Text style={styles.statLabel}>{isMedecin ? 'Compte médecin' : 'Groupe sanguin'}</Text></View>
          </View>
        </View>

        {(isAdmin || isMedecin) && (
          <View style={styles.adminSection}>
            <Text style={styles.adminTitle}>⚙️ {isMedecin ? 'Espace Médecin' : 'Administration'}</Text>
            {isMedecin ? (
              <>
                <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('DoctorConsultations')}>
                  <View style={styles.adminButtonLeft}>
                    <Text style={styles.adminButtonIcon}>🩺</Text>
                    <Text style={styles.adminButtonText}>Gestion des consultations</Text>
                  </View>
                  <Text style={styles.adminButtonArrow}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('DoctorSchedule')}>
                  <View style={styles.adminButtonLeft}>
                    <Text style={styles.adminButtonIcon}>📅</Text>
                    <Text style={styles.adminButtonText}>Mes disponibilités</Text>
                  </View>
                  <Text style={styles.adminButtonArrow}>›</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminUsers')}><View style={styles.adminButtonLeft}><Text style={styles.adminButtonIcon}>👥</Text><Text style={styles.adminButtonText}>Gérer les utilisateurs</Text></View><Text style={styles.adminButtonArrow}>›</Text></TouchableOpacity>
                <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminStatistics')}><View style={styles.adminButtonLeft}><Text style={styles.adminButtonIcon}>📊</Text><Text style={styles.adminButtonText}>Statistiques</Text></View><Text style={styles.adminButtonArrow}>›</Text></TouchableOpacity>
              </>
            )}
          </View>
        )}

        {isPatientProfile ? (
          <>
            <View style={styles.mockInfoSection}>
              {renderInfoRow({
                icon: "🎂",
                label: isEditing ? "Âge" : "Date de naissance",
                value: birthDateText,
                children: isEditing ? <TextInput style={styles.mockEditInput} value={formData.age} onChangeText={(t) => setFormData({ ...formData, age: t.replace(/[^0-9]/g, "") })} keyboardType="numeric" /> : null,
              })}
              {renderInfoRow({
                icon: "📍",
                label: "Localisation",
                value: user?.location || "Yaoundé",
                children: isEditing ? <TextInput style={styles.mockEditInput} value={formData.location} onChangeText={(t) => setFormData({ ...formData, location: t })} /> : null,
              })}
              {renderInfoRow({
                icon: "📞",
                label: "Téléphone",
                value: user?.phone || "Non renseigné",
                children: isEditing ? <TextInput style={styles.mockEditInput} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} keyboardType="phone-pad" /> : null,
              })}
            </View>

            <View style={styles.mockInfoSection}>
              {renderInfoRow({ icon: "💊", label: "Allergies", value: user?.allergies || "Aucune connue", onPress: () => setShowMedicalEdit(true) })}
              {renderInfoRow({ icon: "🩸", label: "Groupe sanguin", value: displayBloodGroup, onPress: () => setShowMedicalEdit(true) })}
              {renderInfoRow({ icon: "💉", label: "Vaccinations", value: user?.vaccinations || "À jour", onPress: () => showToastMessage("Carnet vaccinal bientôt disponible", "info") })}
            </View>

            <View style={styles.chronicSectionOuter}>
              <Text style={styles.chronicSectionTitle}>⚕️ Conditions chroniques · Contexte IA</Text>
              <View style={styles.chronicSectionCard}>
                {chronicOptions.map(renderChronicRow)}
              </View>
              <Text style={styles.chronicNote}>🧬 Ces informations sont transmises silencieusement à MedGemma pour personnaliser votre diagnostic.</Text>
            </View>

            <View style={styles.mockInfoSection}>
              {renderInfoRow({ icon: "📡", label: "Dispositif IoT", value: user?.dispositif_iot ? "● Connecté" : "Non connecté", valueStyle: user?.dispositif_iot ? styles.connectedValue : null, onPress: () => navigation.navigate("Capteurs") })}
              {renderInfoRow({ icon: "📔", label: "Carnet de santé", value: "", onPress: () => navigation.navigate("MedicalRecord") })}
              {renderInfoRow({ icon: "🔐", label: "Sécurité", value: "", onPress: () => showToastMessage("Paramètres de sécurité bientôt disponibles", "info") })}
              {!isEditing ? renderInfoRow({ icon: "✏️", label: "Modifier le profil", value: "", onPress: () => setIsEditing(true) }) : (
                <View style={styles.mockEditButtons}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}><Text style={styles.saveButtonText}>💾 Enregistrer</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditing(false); onRefresh(); }}><Text style={styles.cancelButtonText}>❌ Annuler</Text></TouchableOpacity>
                </View>
              )}
              {renderInfoRow({ icon: "🚪", label: "Déconnexion", value: "", onPress: handleLogout })}
            </View>
          </>
        ) : (
          <>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📧 Email</Text><Text style={styles.infoValue}>{user?.email || 'Non renseigné'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📞 Téléphone</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} keyboardType="phone-pad" /> : <Text style={styles.infoValue}>{user?.phone || 'Non renseigné'}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>🎂 Âge</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.age} onChangeText={(t) => setFormData({ ...formData, age: t.replace(/[^0-9]/g, '') })} keyboardType="numeric" /> : <Text style={styles.infoValue}>{user?.age ? `${user.age} ans` : 'Non renseigné'}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📍 Localisation</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.location} onChangeText={(t) => setFormData({ ...formData, location: t })} /> : <Text style={styles.infoValue}>{user?.location || 'Yaoundé, Cameroun'}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>⚥ Sexe</Text>{isEditing ? <View style={styles.sexEditContainer}>{genderOptions.map(option => (<TouchableOpacity key={option.value} style={[styles.sexOption, formData.sexe === option.value && styles.sexOptionActive]} onPress={() => setFormData({ ...formData, sexe: option.value })}><Text style={[styles.sexOptionText, formData.sexe === option.value && styles.sexOptionTextActive]}>{option.label}</Text></TouchableOpacity>))}</View> : <Text style={styles.infoValue}>{getSexLabel(user?.sexe)}</Text>}</View>
        </View>

        {!isMedecin && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}><Text style={styles.sectionTitle}>Informations médicales</Text><TouchableOpacity onPress={() => setShowMedicalEdit(true)}><Text style={styles.editMedicalBtn}>✏️ Modifier</Text></TouchableOpacity></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>🩸 Groupe sanguin</Text><Text style={styles.infoValue}>{user?.bloodType || 'Non renseigné'}{user?.rhesus || ''}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>💊 Allergies</Text><Text style={styles.infoValue}>{user?.allergies || 'Aucune connue'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>🏥 Antécédents</Text><Text style={styles.infoValue}>{user?.antecedents || 'Aucun'}</Text></View>
        </View>
        )}

        <View style={styles.section}>
          {isMedecin ? (
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('DoctorConsultations')}><Text style={styles.actionIcon}>📋</Text><Text style={styles.actionLabel}>Historique des consultations</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('MedicalRecord')}><Text style={styles.actionIcon}>📔</Text><Text style={styles.actionLabel}>Carnet de santé</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Carnet')}><Text style={styles.actionIcon}>📔</Text><Text style={styles.actionLabel}>Historique des diagnostics</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>
            </>
          )}
          {!isEditing ? <TouchableOpacity style={styles.actionRow} onPress={() => setIsEditing(true)}><Text style={styles.actionIcon}>✏️</Text><Text style={styles.actionLabel}>Modifier le profil</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity> : <View style={styles.editButtons}><TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}><Text style={styles.saveButtonText}>💾 Enregistrer</Text></TouchableOpacity><TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditing(false); onRefresh(); }}><Text style={styles.cancelButtonText}>❌ Annuler</Text></TouchableOpacity></View>}
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}><Text style={styles.actionIcon}>🚪</Text><Text style={styles.actionLabel}>Déconnexion</Text><Text style={styles.actionArrow}>›</Text></TouchableOpacity>
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 30, backgroundColor: colors.green, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarEmoji: { fontSize: 32 },
  name: { fontSize: 20, fontWeight: '700', color: colors.white },
  editNameInput: { fontSize: 20, fontWeight: '700', color: colors.white, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, textAlign: 'center', width: '100%' },
  roleBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '500' },
  id: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 32, marginTop: 16 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  adminSection: { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  adminTitle: { fontSize: 15, fontWeight: '700', color: colors.green, marginBottom: 12 },
  adminButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  adminButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminButtonIcon: { fontSize: 20 },
  adminButtonText: { fontSize: 14, fontWeight: '500', color: colors.text },
  adminButtonArrow: { fontSize: 16, color: colors.muted },
  section: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editMedicalBtn: { fontSize: 12, color: colors.greenLight, fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.muted, width: 100 },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1, textAlign: 'right' },
  editInput: { fontSize: 13, fontWeight: '500', color: colors.text, backgroundColor: colors.greenPale, borderRadius: 8, padding: 8, flex: 1, textAlign: 'right' },
  sexEditContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  sexOption: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  sexOptionActive: { backgroundColor: colors.green, borderColor: colors.green },
  sexOptionText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  sexOptionTextActive: { color: colors.white },
  mockInfoSection: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 24, marginTop: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, shadowColor: colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 2 },
  mockInfoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  mockInfoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  mockInfoIcon: { fontSize: 18, width: 22 },
  mockInfoLabel: { fontSize: 13, fontWeight: "500", color: colors.text },
  mockInfoRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  mockInfoValue: { fontSize: 12, color: colors.muted, textAlign: "right" },
  mockInfoArrow: { fontSize: 16, color: colors.muted },
  mockEditInput: { minWidth: 130, fontSize: 12, fontWeight: "500", color: colors.text, backgroundColor: colors.greenPale, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, textAlign: "right" },
  mockEditButtons: { flexDirection: "row", gap: 12, padding: 14 },
  connectedValue: { color: "#10b981", fontWeight: "600" },
  chronicSectionOuter: { paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  chronicSectionTitle: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 8, marginBottom: 8 },
  chronicSectionCard: { backgroundColor: colors.white, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: colors.border, shadowColor: colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 2 },
  chronicRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  chronicLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  chronicIcon: { fontSize: 20, width: 24 },
  chronicLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  chronicSub: { fontSize: 10, color: colors.muted, marginTop: 1 },
  chronicSwitch: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  chronicSwitchOn: { backgroundColor: colors.green },
  chronicThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  chronicThumbOn: { transform: [{ translateX: 18 }] },
  chronicNote: { fontSize: 10, color: colors.muted, marginTop: 6, paddingHorizontal: 8, lineHeight: 15 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionIcon: { fontSize: 18, width: 32 },
  actionLabel: { flex: 1, fontSize: 13, color: colors.text },
  actionArrow: { fontSize: 16, color: colors.muted },
  editButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  saveButton: { flex: 1, backgroundColor: colors.green, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  cancelButton: { flex: 1, backgroundColor: colors.warnBg, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.warn, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: colors.white, borderRadius: 24, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.green, textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.cream },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  bloodTypeContainer: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  bloodTypeBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  bloodTypeBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  bloodTypeText: { fontSize: 20, fontWeight: '700', color: colors.muted },
  bloodTypeTextActive: { color: colors.white },
  rhesusContainer: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  rhesusBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  rhesusBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  rhesusText: { fontSize: 24, fontWeight: '700', color: colors.muted },
  rhesusTextActive: { color: colors.white },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  modalSaveBtn: { flex: 1, backgroundColor: colors.green, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '600', color: colors.white },
});