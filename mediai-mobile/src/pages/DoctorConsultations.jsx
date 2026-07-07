// src/pages/DoctorConsultations.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../styles/globalStyles';
import Toast from '../components/common/Toast';
import ConfirmModal from '../components/common/ConfirmModal';
import { getDoctorConsultations, confirmRDV, cancelRDV } from '../services/rdvService';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'planifie', label: 'À accepter' },
  { key: 'confirme', label: 'Acceptées' },
  { key: 'annule', label: 'Refusées' },
];

const STATUS = {
  planifie: { label: 'En attente', color: '#92400e', bg: colors.yellowBg, dot: '#f59e0b' },
  confirme: { label: 'Acceptée', color: '#065f46', bg: colors.greenPale, dot: '#22c55e' },
  annule: { label: 'Refusée', color: '#7f1d1d', bg: colors.warnBg, dot: colors.warn },
  effectue: { label: 'Effectuée', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
};

const patientName = (rdv) => [rdv.user?.prenom, rdv.user?.nom].filter(Boolean).join(' ').trim() || 'Patient';
const fmtDate = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function DoctorConsultations({ navigation }) {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null, type: 'confirm', confirmText: 'Confirmer' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  const loadData = async () => {
    const result = await getDoctorConsultations();
    if (result.success) {
      setConsultations(result.rdvs || []);
    } else {
      showToast(result.error || 'Impossible de charger les consultations', 'error');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const counts = useMemo(() => ({
    total: consultations.length,
    pending: consultations.filter(r => r.statut === 'planifie').length,
    accepted: consultations.filter(r => r.statut === 'confirme').length,
  }), [consultations]);

  const visibleConsultations = useMemo(() => (
    filter === 'all' ? consultations : consultations.filter(r => r.statut === filter)
  ), [consultations, filter]);

  const runAction = async (rdv, action) => {
    const result = action === 'confirm' ? await confirmRDV(rdv.id) : await cancelRDV(rdv.id);
    if (result.success) {
      showToast(action === 'confirm' ? 'Consultation acceptée' : 'Consultation refusée', 'success');
      await loadData();
    } else {
      showToast(result.error || 'Action impossible', 'error');
    }
  };

  const askConfirm = (rdv) => {
    setConfirmModal({
      visible: true,
      title: 'Accepter la consultation',
      message: `Autoriser ${patientName(rdv)} à venir sur ce créneau et débloquer son carnet médical ?`,
      confirmText: 'Accepter',
      type: 'confirm',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        await runAction(rdv, 'confirm');
      },
    });
  };

  const askCancel = (rdv) => {
    setConfirmModal({
      visible: true,
      title: 'Refuser la consultation',
      message: `Refuser la demande de ${patientName(rdv)} ?`,
      confirmText: 'Refuser',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        await runAction(rdv, 'cancel');
      },
    });
  };

  const openCarnet = (rdv) => {
    if (rdv.statut !== 'confirme' && rdv.statut !== 'effectue') {
      showToast('Acceptez d’abord la consultation pour ouvrir le carnet', 'warning');
      return;
    }
    navigation.navigate('MedicalRecord', { patientId: rdv.user_id, patientName: patientName(rdv), readOnly: true });
  };

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <ConfirmModal
        {...confirmModal}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
        cancelText="Annuler"
      />

      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <Text style={styles.greeting}>Espace médecin</Text>
        <Text style={styles.title}>Gestion des consultations</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{counts.pending}</Text><Text style={styles.summaryLabel}>À accepter</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{counts.accepted}</Text><Text style={styles.summaryLabel}>Acceptées</Text></View>
          <TouchableOpacity style={styles.summaryCard} onPress={() => navigation.navigate('DoctorSchedule')}>
            <Text style={styles.summaryValue}>📅</Text><Text style={styles.summaryLabel}>Horaires</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
      >
        <View style={styles.filterRow}>
          {FILTERS.map(item => (
            <TouchableOpacity key={item.key} style={[styles.filterChip, filter === item.key && styles.filterChipActive]} onPress={() => setFilter(item.key)}>
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Demandes patients</Text>
          <Text style={styles.sectionCount}>{visibleConsultations.length}</Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}><Text style={styles.emptyEmoji}>⌛</Text><Text style={styles.emptyTitle}>Chargement...</Text></View>
        ) : visibleConsultations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🩺</Text>
            <Text style={styles.emptyTitle}>Aucune consultation</Text>
            <Text style={styles.emptyText}>Les demandes de rendez-vous des patients apparaîtront ici.</Text>
          </View>
        ) : (
          visibleConsultations.map(rdv => {
            const status = STATUS[rdv.statut] || STATUS.planifie;
            const canOpen = rdv.statut === 'confirme' || rdv.statut === 'effectue';
            return (
              <View key={rdv.id} style={styles.consultCard}>
                <View style={styles.cardTop}>
                  <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patientName(rdv)}</Text>
                    <Text style={styles.meta}>{fmtDate(rdv.date_rdv)} · {String(rdv.creneau || '').slice(0, 5)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <Text style={styles.reason}>{rdv.motif || 'Consultation médicale'}</Text>
                {!!rdv.consultation?.pathologie_detectee && (
                  <Text style={styles.diagnostic}>Dernier diagnostic : {rdv.consultation.pathologie_detectee} · {Math.round(Number(rdv.consultation.score_ia || 0))}%</Text>
                )}
                <Text style={styles.patientMeta}>📞 {rdv.user?.telephone || 'Téléphone non renseigné'} · 🩸 {rdv.user?.groupe_sanguin || 'Groupe inconnu'}</Text>

                <View style={styles.actionsRow}>
                  {rdv.statut === 'planifie' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => askConfirm(rdv)}>
                        <Text style={styles.acceptText}>Accepter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => askCancel(rdv)}>
                        <Text style={styles.rejectText}>Refuser</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={[styles.actionBtn, canOpen ? styles.recordBtn : styles.recordBtnDisabled]} onPress={() => openCarnet(rdv)}>
                    <Text style={[styles.recordText, !canOpen && styles.recordTextDisabled]}>Carnet médical</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 96 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: colors.green, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  title: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.white },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 12, color: colors.green, fontWeight: '700' },
  consultCard: { backgroundColor: colors.white, borderRadius: 18, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  reason: { fontSize: 13, color: colors.text, marginTop: 12, lineHeight: 18 },
  diagnostic: { fontSize: 11, color: colors.green, marginTop: 6, fontWeight: '600' },
  patientMeta: { fontSize: 11, color: colors.muted, marginTop: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { flexGrow: 1, minWidth: '30%', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  acceptBtn: { backgroundColor: colors.green },
  rejectBtn: { backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warn },
  recordBtn: { backgroundColor: colors.greenPale, borderWidth: 1, borderColor: colors.greenLight },
  recordBtnDisabled: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  acceptText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  rejectText: { color: colors.warn, fontSize: 12, fontWeight: '700' },
  recordText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  recordTextDisabled: { color: colors.muted },
  emptyState: { alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginTop: 6, padding: 28, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
