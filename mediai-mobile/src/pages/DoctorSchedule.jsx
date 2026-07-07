// src/pages/DoctorSchedule.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { colors } from '../styles/globalStyles';
import Loader from '../components/common/Loader';
import Toast from '../components/common/Toast';
import { getMedecinProfile, updateMedecinProfile } from '../services/medecinService';

const JOURS = [
  { key: 'lundi', label: 'Lundi', emoji: '📅' },
  { key: 'mardi', label: 'Mardi', emoji: '📅' },
  { key: 'mercredi', label: 'Mercredi', emoji: '📅' },
  { key: 'jeudi', label: 'Jeudi', emoji: '📅' },
  { key: 'vendredi', label: 'Vendredi', emoji: '📅' },
  { key: 'samedi', label: 'Samedi', emoji: '📅' },
  { key: 'dimanche', label: 'Dimanche', emoji: '📅' },
];

const CRENEAUX_PRESETS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export default function DoctorSchedule({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medecin, setMedecin] = useState(null);
  const [horaires, setHoraires] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadData = async () => {
    const result = await getMedecinProfile();
    if (result.success) {
      setMedecin(result.medecin);
      setHoraires(result.medecin.horaires || {});
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleCreneau = (jour, creneau) => {
    setHoraires(prev => {
      const slots = prev[jour] || [];
      const updated = slots.includes(creneau)
        ? slots.filter(c => c !== creneau)
        : [...slots, creneau].sort();
      const newHoraires = { ...prev };
      if (updated.length === 0) {
        delete newHoraires[jour];
      } else {
        newHoraires[jour] = updated;
      }
      return newHoraires;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    const result = await updateMedecinProfile({ horaires });
    setLoading(false);
    if (result.success) {
      showToast('✅ Disponibilités enregistrées', 'success');
      setMedecin(result.medecin);
    } else {
      showToast(result.error, 'error');
    }
  };

  const handlePresetMatinAM = (jour) => {
    const matin = ['08:00', '09:00', '10:00', '11:00'];
    setHoraires(prev => ({ ...prev, [jour]: matin }));
  };

  const handlePresetApresMidi = (jour) => {
    const apm = ['14:00', '15:00', '16:00', '17:00'];
    setHoraires(prev => ({ ...prev, [jour]: apm }));
  };

  const handleClearDay = (jour) => {
    Alert.alert('Vider ce jour', `Supprimer tous les créneaux du ${JOURS.find(j => j.key === jour)?.label} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: () => {
        setHoraires(prev => {
          const newHoraires = { ...prev };
          delete newHoraires[jour];
          return newHoraires;
        });
      }},
    ]);
  };

  if (loading) return <Loader visible={true} text="Chargement..." />;

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

      <View style={styles.header}>
        <View style={{ height: 40 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📅 Mes disponibilités</Text>
        <Text style={styles.subtitle}>Configurez vos créneaux de consultation</Text>
      </View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}>
        {JOURS.map(({ key, label, emoji }) => {
          const slots = horaires[key] || [];
          const count = slots.length;
          return (
            <View key={key} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayLabel}>{emoji} {label}</Text>
                  <Text style={styles.dayCount}>{count} créneau{count > 1 ? 'x' : ''}</Text>
                </View>
                <View style={styles.dayActions}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => handlePresetMatinAM(key)}>
                    <Text style={styles.presetBtnText}>☀️ Matin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => handlePresetApresMidi(key)}>
                    <Text style={styles.presetBtnText}>🌙 A-M</Text>
                  </TouchableOpacity>
                  {count > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={() => handleClearDay(key)}>
                      <Text style={styles.clearBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.slotGrid}>
                {CRENEAUX_PRESETS.map(creneau => {
                  const isSelected = slots.includes(creneau);
                  return (
                    <TouchableOpacity
                      key={creneau}
                      style={[styles.slotBtn, isSelected && styles.slotBtnActive]}
                      onPress={() => toggleCreneau(key, creneau)}
                    >
                      <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{creneau}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>💾 Enregistrer mes disponibilités</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { marginBottom: 16 },
  backText: { fontSize: 15, color: colors.green, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.muted },
  scrollView: { flex: 1 },
  dayCard: { marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  dayCount: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dayActions: { flexDirection: 'row', gap: 8 },
  presetBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.greenPale, borderRadius: 8 },
  presetBtnText: { fontSize: 11, fontWeight: '600', color: colors.green },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.border, borderRadius: 8 },
  clearBtnText: { fontSize: 14 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  slotBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  slotText: { fontSize: 13, fontWeight: '600', color: colors.text },
  slotTextActive: { color: colors.white },
  saveButton: { marginHorizontal: 16, marginTop: 24, paddingVertical: 16, backgroundColor: colors.green, borderRadius: 14, alignItems: 'center' },
  saveButtonText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
