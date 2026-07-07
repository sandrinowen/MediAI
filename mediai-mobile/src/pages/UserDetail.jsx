// src/pages/UserDetail.jsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { colors } from '../styles/globalStyles';
import { getUserById, updateUser, updateUserRole } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import { MESSAGES } from '../utils/messages';
import { ROLES, ROLE_OPTIONS, ROLE_LABELS, canModifyRole } from '../utils/roles';

export default function UserDetail({ route, navigation }) {
  const { userId } = route.params;
  const { user: currentUser, updateUser: updateCurrentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
  const [formData, setFormData] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const userData = await getUserById(userId);
    setUser(userData);
    setFormData(userData);
  };

  const handleSave = async () => {
    const updated = await updateUser(userId, formData);
    if (updated) {
      showToast(MESSAGES.USER_UPDATE_SUCCESS, 'success');
      setIsEditing(false);
      loadUser();
      if (currentUser.id === userId) updateCurrentUser(updated);
    } else {
      showToast(MESSAGES.USER_UPDATE_ERROR, 'error');
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!canModifyRole(currentUser)) { showToast(MESSAGES.PERMISSION_DENIED, 'error'); return; }
    setConfirmModal({
      visible: true,
      title: 'Modification du rôle',
      message: `Êtes-vous sûr de vouloir changer le rôle de ${user.name} en ${ROLE_OPTIONS.find(r => r.value === newRole)?.label} ?`,
      onConfirm: async () => {
        const updated = await updateUserRole(userId, newRole);
        if (updated) {
          showToast(MESSAGES.ROLE_UPDATE_SUCCESS, 'success');
          await loadUser();
          if (currentUser.id === userId) updateCurrentUser(updated);
        } else {
          showToast(MESSAGES.ROLE_UPDATE_ERROR, 'error');
        }
        setConfirmModal({ visible: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><View style={{ height: 34 }} /><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>← Retour</Text></TouchableOpacity><Text style={styles.title}>Chargement...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal({ ...confirmModal, visible: false })} />
      
      <View style={styles.header}>
        <View style={{ height: 34 }} /><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>← Retour</Text></TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarEmoji}>{user.sexe === 'F' ? '👩' : '👤'}</Text></View>
        {isEditing ? <TextInput style={styles.editNameInput} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} /> : <Text style={styles.name}>{user.name}</Text>}
        <View style={[styles.roleBadge, { backgroundColor: ROLE_LABELS[user.role]?.bgColor || '#f0f0f0' }]}><Text style={[styles.roleText, { color: ROLE_LABELS[user.role]?.color || colors.muted }]}>{ROLE_LABELS[user.role]?.label || '👤 Utilisateur'}</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📧 Email</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} /> : <Text style={styles.infoValue}>{user.email}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📞 Téléphone</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} /> : <Text style={styles.infoValue}>{user.phone}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>🎂 Âge</Text>{isEditing ? <TextInput style={styles.editInput} value={String(formData.age)} onChangeText={(t) => setFormData({ ...formData, age: parseInt(t) || 0 })} keyboardType="numeric" /> : <Text style={styles.infoValue}>{user.age} ans</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>📍 Localisation</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.location} onChangeText={(t) => setFormData({ ...formData, location: t })} /> : <Text style={styles.infoValue}>{user.location}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>⚥ Sexe</Text>{isEditing ? <View style={styles.sexeEditContainer}><TouchableOpacity style={[styles.sexeEditButton, formData.sexe === 'M' && styles.sexeEditActive]} onPress={() => setFormData({ ...formData, sexe: 'M' })}><Text style={styles.sexeEditText}>M</Text></TouchableOpacity><TouchableOpacity style={[styles.sexeEditButton, formData.sexe === 'F' && styles.sexeEditActive]} onPress={() => setFormData({ ...formData, sexe: 'F' })}><Text style={styles.sexeEditText}>F</Text></TouchableOpacity></View> : <Text style={styles.infoValue}>{user.sexe === 'M' ? 'Masculin' : 'Féminin'}</Text>}</View>

          {canModifyRole(currentUser) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>👑 Rôle</Text>
              {isEditing ? <View style={styles.roleSelectContainer}>{ROLE_OPTIONS.map(role => (<TouchableOpacity key={role.value} style={[styles.roleSelectButton, formData.role === role.value && styles.roleSelectActive]} onPress={() => setFormData({ ...formData, role: role.value })}><Text style={[styles.roleSelectText, formData.role === role.value && styles.roleSelectTextActive]}>{role.label}</Text></TouchableOpacity>))}</View> : <TouchableOpacity onPress={() => Alert.alert('Changer le rôle', `Sélectionnez le nouveau rôle pour ${user.name}`, ROLE_OPTIONS.map(role => ({ text: role.label, onPress: () => handleRoleChange(role.value) })))}><Text style={[styles.infoValue, styles.changeRoleText]}>{ROLE_LABELS[user.role]?.label} ✏️</Text></TouchableOpacity>}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations médicales</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>💊 Allergies</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.allergies} onChangeText={setFormData} /> : <Text style={styles.infoValue}>{user.allergies}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>🏥 Antécédents</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.antecedents} onChangeText={setFormData} /> : <Text style={styles.infoValue}>{user.antecedents}</Text>}</View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>💉 Groupe sanguin</Text>{isEditing ? <TextInput style={styles.editInput} value={formData.bloodType} onChangeText={setFormData} /> : <Text style={styles.infoValue}>{user.bloodType}</Text>}</View>
        </View>

        {!isEditing ? <Button title="✏️ Modifier" onPress={() => setIsEditing(true)} style={styles.editButton} /> : <View style={styles.editButtons}><Button title="💾 Enregistrer" onPress={handleSave} style={styles.saveButton} /><Button title="❌ Annuler" onPress={() => { setIsEditing(false); loadUser(); }} variant="secondary" /></View>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 30, backgroundColor: colors.green, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  avatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarEmoji: { fontSize: 32 },
  name: { fontSize: 20, fontWeight: '700', color: colors.white },
  editNameInput: { fontSize: 20, fontWeight: '700', color: colors.white, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, textAlign: 'center', width: '100%' },
  roleBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '500' },
  section: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 13, color: colors.muted, width: 100 },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1, textAlign: 'right' },
  editInput: { fontSize: 13, fontWeight: '500', color: colors.text, backgroundColor: colors.greenPale, borderRadius: 8, padding: 8, flex: 1, textAlign: 'right' },
  sexeEditContainer: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' },
  sexeEditButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.greenPale },
  sexeEditActive: { backgroundColor: colors.green },
  sexeEditText: { fontSize: 12, color: colors.text },
  roleSelectContainer: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' },
  roleSelectButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.greenPale },
  roleSelectActive: { backgroundColor: colors.green },
  roleSelectText: { fontSize: 11, color: colors.text },
  roleSelectTextActive: { color: colors.white },
  changeRoleText: { color: colors.greenLight, textDecorationLine: 'underline' },
  diagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  diagName: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 2 },
  diagDate: { fontSize: 11, color: colors.muted, flex: 1, textAlign: 'center' },
  diagScore: { fontSize: 12, fontWeight: '700', color: colors.green, flex: 1, textAlign: 'right' },
  editButton: { marginHorizontal: 16, marginVertical: 20 },
  editButtons: { gap: 12, marginHorizontal: 16, marginVertical: 20 },
  saveButton: { marginBottom: 8 },
});