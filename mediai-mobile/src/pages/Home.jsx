// src/pages/Home.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { colors } from '../styles/globalStyles';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import { getDoctorConsultations } from '../services/rdvService';
import { useHome } from '../hooks/useHome';

const PATIENT_ACTIONS = [
  { id: 'chat-ia', label: 'Diagnostic', sub: 'Parler à MediAI', icon: '🧬', color: colors.greenPale, screen: 'ChatIA' },
  { id: 'iot', label: 'Capteurs IoT', sub: 'Suivi temps réel', icon: '📡', color: '#e0f2fe', screen: 'Capteurs' },
  { id: 'rdv', label: 'Rendez-vous', sub: 'Consulter un médecin', icon: '📅', color: '#e8f4fd', screen: 'Appointments' },
  { id: 'carnet', label: 'Carnet santé', sub: 'Historique complet', icon: '📔', color: colors.yellowBg, screen: 'MedicalRecord' },
  { id: 'profil', label: 'Mon profil', sub: 'Données personnelles', icon: '👤', color: colors.warnBg, screen: 'Profil' },
];

const DOCTOR_ACTIONS = [
  { id: 'consultations', label: 'Consultations', sub: 'Accepter ou refuser', icon: '🩺', color: colors.greenPale, screen: 'DoctorConsultations' },
  { id: 'schedule', label: 'Horaires', sub: 'Planifier mes créneaux', icon: '📅', color: '#e0f2fe', screen: 'DoctorSchedule' },
  { id: 'history', label: 'Historique', sub: 'Suivi des diagnostics', icon: '📋', color: colors.yellowBg, screen: 'Historique' },
  { id: 'profile', label: 'Profil médecin', sub: 'Coordonnées et spécialité', icon: '👨‍⚕️', color: colors.warnBg, screen: 'Profil' },
];

const ADMIN_ACTIONS = [
  { id: 'users', label: 'Utilisateurs', sub: 'Rôles et profils', icon: '👥', color: colors.greenPale, screen: 'AdminUsers' },
  { id: 'stats', label: 'Statistiques', sub: 'Vue globale', icon: '📊', color: '#e0f2fe', screen: 'AdminStatistics' },
  { id: 'profile', label: 'Profil', sub: 'Compte admin', icon: '👤', color: colors.warnBg, screen: 'Profil' },
];

// ── Rendez-vous : libellés / couleurs des statuts internes ────────
const RDV_STATUS = {
  planifie: { label: '🕐 EN ATTENTE', color: '#6b7280', bg: '#f3f4f6' },
  confirme: { label: '✅ ACCEPTÉ', color: '#16a34a', bg: '#dcfce7' },
  effectue: { label: '🏁 TERMINÉ', color: '#2563eb', bg: '#dbeafe' },
  annule: { label: '❌ ANNULÉ', color: '#ef4444', bg: '#fee2e2' },
};

// Couleur du taux d'hypothèse principale (vert >=60, orange 30-59, rouge <30).
const hypBadge = (pct) => {
  if (pct == null) return { color: colors.muted, bg: colors.cream };
  if (pct >= 60) return { color: '#16a34a', bg: '#dcfce7' };
  if (pct >= 30) return { color: '#f59e0b', bg: '#fef3e2' };
  return { color: '#ef4444', bg: '#fee2e2' };
};

// Date longue en français : « 3 juillet 2026 ».
const formatLongDate = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ── Helpers médecin (consultations à venir) ──────────────────────
const STATUS_LABELS = { planifie: 'En attente', confirme: 'Acceptée', annule: 'Annulée', effectue: 'Terminée' };
const STATUS_COLORS = { planifie: '#f59e0b', confirme: '#22c55e', annule: '#ef4444', effectue: '#2563eb' };

const patientName = (rdv = {}) => {
  const patient = rdv.user || {};
  return [patient.prenom, patient.nom].filter(Boolean).join(' ') || patient.email || 'Patient';
};

const doctorName = (rdv = {}) => rdv.medecin?.nom || 'Médecin';

const formatAppointmentDate = (rdv = {}) => {
  const dateValue = rdv.date_rdv;
  const hour = String(rdv.creneau || '').slice(0, 5);
  const date = dateValue ? new Date(dateValue) : null;

  if (!date || Number.isNaN(date.getTime())) return hour || 'Date à confirmer';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const day = sameDay(date, today)
    ? "Aujourd'hui"
    : sameDay(date, tomorrow)
      ? 'Demain'
      : date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' });

  return hour ? day + ' · ' + hour : day;
};

const mapDoctorAppointment = (rdv = {}) => ({
  id: rdv.id,
  name: patientName(rdv),
  date: formatAppointmentDate(rdv),
  iot: rdv.motif || rdv.consultation?.pathologie_detectee || 'Consultation médicale',
  score: STATUS_LABELS[rdv.statut] || rdv.statut || 'Planifiée',
  urgency: STATUS_COLORS[rdv.statut] || colors.green,
});

export default function Home({ navigation }) {
  const { user, isAdmin, isMedecin } = useAuth();
  const isPatient = !isAdmin && !isMedecin;
  const { connected, deviceData } = useBiometric();
  const [refreshing, setRefreshing] = useState(false);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorAppointmentsError, setDoctorAppointmentsError] = useState('');

  // Données patient (diagnostics récents + rendez-vous) via le hook dédié.
  const {
    recentDiagnostics,
    loadingDiagnostics,
    appointments,
    loadingAppointments,
    refresh: refreshHome,
  } = useHome({ enabled: isPatient });

  const loadDoctorAppointments = useCallback(async () => {
    if (!isMedecin) return;

    const result = await getDoctorConsultations();
    if (result.success) {
      setDoctorAppointments(result.rdvs || []);
      setDoctorAppointmentsError('');
    } else {
      setDoctorAppointments([]);
      setDoctorAppointmentsError(result.error || 'Impossible de charger les consultations.');
    }
  }, [isMedecin]);

  useEffect(() => {
    loadDoctorAppointments();
  }, [loadDoctorAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isMedecin) {
      await loadDoctorAppointments();
    } else if (isPatient) {
      await refreshHome();
    } else {
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setRefreshing(false);
  }, [isMedecin, isPatient, loadDoctorAppointments, refreshHome]);

  const actions = isAdmin ? ADMIN_ACTIONS : isMedecin ? DOCTOR_ACTIONS : PATIENT_ACTIONS;

  const doctorRecent = useMemo(() => {
    if (!isMedecin) return [];
    return doctorAppointments
      .filter(rdv => rdv.statut !== 'annule')
      .sort((a, b) => {
        const dateA = (a.date_rdv || '') + ' ' + (a.creneau || '');
        const dateB = (b.date_rdv || '') + ' ' + (b.creneau || '');
        return dateA.localeCompare(dateB);
      })
      .slice(0, 3)
      .map(mapDoctorAppointment);
  }, [doctorAppointments, isMedecin]);

  // Rendez-vous patient à afficher (les 3 plus récents, hors annulés en tête).
  const patientRdv = useMemo(() => (isPatient ? appointments.slice(0, 3) : []), [appointments, isPatient]);

  const getIoTStatus = () => {
    if (connected && deviceData) return `${deviceData.hr || 78} bpm`;
    return 'Déconnecté';
  };

  const getIoTIcon = () => {
    if (connected && deviceData) return deviceData.hr > 100 ? '⚡' : '💓';
    return '📡';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
      >
        <View style={styles.header}>
          <View style={{ height: 34 }} />
          <Text style={styles.greeting}>{isMedecin ? 'Bonjour docteur' : isAdmin ? 'Tableau de bord' : 'Bonjour 👋'}</Text>
          <Text style={styles.name}>{user?.name || 'Jean-Paul Mbarga'}</Text>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate(isAdmin ? 'AdminUsers' : isMedecin ? 'DoctorConsultations' : 'Carnet')}>
              <Text style={styles.statIcon}>{isAdmin ? '👥' : isMedecin ? '🩺' : '📔'}</Text>
              <View style={styles.statTextWrap}>
                <Text style={styles.statLabel}>{isAdmin ? 'Utilisateurs' : isMedecin ? 'Consultations' : 'Carnet santé'}</Text>
                <Text style={styles.statValue}>{isAdmin ? 'Gérer' : isMedecin ? 'À gérer' : 'Consulter'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate(isAdmin ? 'AdminStatistics' : isMedecin ? 'DoctorSchedule' : 'Capteurs')}>
              <Text style={styles.statIcon}>{isAdmin ? '📊' : isMedecin ? '📅' : getIoTIcon()}</Text>
              <View style={styles.statTextWrap}>
                <Text style={styles.statLabel}>{isAdmin ? 'Statistiques' : isMedecin ? 'Disponibilités' : 'Capteur IoT'}</Text>
                <Text style={styles.statValue}>{isAdmin ? 'Voir' : isMedecin ? 'Planifier' : getIoTStatus()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
        </View>

        <View style={styles.quickActions}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.qaCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.qaIcon, { backgroundColor: action.color }]}>
                <Text style={styles.qaIconText}>{action.icon}</Text>
              </View>
              <Text style={styles.qaLabel}>{action.label}</Text>
              <Text style={styles.qaSub}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── PATIENT : Diagnostics récents ─────────────────────── */}
        {isPatient && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Diagnostics récents</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Carnet')}>
                <Text style={styles.sectionLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {loadingDiagnostics ? (
              <View style={styles.loaderCard}><ActivityIndicator size="small" color={colors.green} /></View>
            ) : recentDiagnostics.length === 0 ? (
              <View style={styles.emptyConsultCard}>
                <Text style={styles.emptyConsultText}>Aucun diagnostic récent. Lancez votre première analyse.</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('ChatIA')}>
                  <Text style={styles.emptyCtaText}>🧬 Démarrer un diagnostic</Text>
                </TouchableOpacity>
              </View>
            ) : recentDiagnostics.map(diag => {
              const pct = diag.hypothesis?.probability != null
                ? Math.max(0, Math.min(100, Number(diag.hypothesis.probability)))
                : null;
              const badge = hypBadge(pct);
              return (
                <TouchableOpacity
                  key={diag.id}
                  style={styles.diagCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('DiagnosticDetail', { id: diag.id })}
                >
                  <View style={styles.diagInfo}>
                    <Text style={styles.diagTitle} numberOfLines={1}>{diag.title}</Text>
                    <Text style={styles.diagDate}>{formatLongDate(diag.diagnosed_at)}</Text>
                    {diag.hypothesis?.name && (
                      <View style={[styles.hypBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.hypBadgeText, { color: badge.color }]} numberOfLines={1}>
                          {diag.hypothesis.name}{pct != null ? ` · ${pct}%` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}

            {/* ── PATIENT : Rendez-vous ───────────────────────────── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rendez-vous</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
                <Text style={styles.sectionLink}>Prendre RDV</Text>
              </TouchableOpacity>
            </View>

            {loadingAppointments ? (
              <View style={styles.loaderCard}><ActivityIndicator size="small" color={colors.green} /></View>
            ) : patientRdv.length === 0 ? (
              <View style={styles.emptyConsultCard}>
                <Text style={styles.emptyConsultText}>Aucun rendez-vous pour le moment.</Text>
              </View>
            ) : patientRdv.map(rdv => {
              const status = RDV_STATUS[rdv.statut] || RDV_STATUS.planifie;
              return (
                <View key={rdv.id} style={styles.rdvCard}>
                  <View style={styles.rdvTop}>
                    <Text style={styles.rdvDoctor} numberOfLines={1}>👨‍⚕️ {doctorName(rdv)}</Text>
                    <View style={[styles.rdvBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.rdvBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.rdvDate}>{formatAppointmentDate(rdv)}</Text>
                  {!!rdv.motif && <Text style={styles.rdvNotes}>📝 {rdv.motif}</Text>}
                </View>
              );
            })}
          </>
        )}

        {/* ── MÉDECIN : Prochaines consultations ─────────────────── */}
        {isMedecin && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prochaines consultations</Text>
              <TouchableOpacity onPress={() => navigation.navigate('DoctorConsultations')}>
                <Text style={styles.sectionLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {doctorAppointmentsError ? (
              <View style={styles.emptyConsultCard}>
                <Text style={styles.emptyConsultText}>{doctorAppointmentsError}</Text>
              </View>
            ) : doctorRecent.length === 0 ? (
              <View style={styles.emptyConsultCard}>
                <Text style={styles.emptyConsultText}>Aucune consultation programmée.</Text>
              </View>
            ) : doctorRecent.map(consult => (
              <TouchableOpacity
                key={consult.id}
                style={styles.consultCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DoctorConsultations')}
              >
                <View style={[styles.consultDot, { backgroundColor: consult.urgency }]} />
                <View style={styles.consultInfo}>
                  <Text style={styles.consultName}>{consult.name}</Text>
                  <Text style={styles.consultDate}>{consult.date}{consult.iot ? ` · ${consult.iot}` : ''}</Text>
                </View>
                <Text style={styles.consultScore}>{consult.score}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 88 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: colors.green, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  statIcon: { fontSize: 22 },
  statTextWrap: { flex: 1, minWidth: 0 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  statValue: { fontSize: 13, fontWeight: '600', color: colors.white },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 12, color: colors.greenLight, fontWeight: '500' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 24 },
  qaCard: { width: '48%', backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  qaIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  qaIconText: { fontSize: 22 },
  qaLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  qaSub: { fontSize: 10, color: colors.muted, marginTop: 3, lineHeight: 14 },

  // Diagnostics récents
  diagCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 14, marginHorizontal: 24, marginBottom: 10, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  diagInfo: { flex: 1, minWidth: 0 },
  diagTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  diagDate: { fontSize: 11, color: colors.muted, marginTop: 3 },
  hypBadge: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  hypBadgeText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 26, color: colors.muted, marginLeft: 10 },

  // Rendez-vous patient
  rdvCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, marginHorizontal: 24, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rdvTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rdvDoctor: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  rdvBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  rdvBadgeText: { fontSize: 10, fontWeight: '800' },
  rdvDate: { fontSize: 12, color: colors.muted, marginTop: 6 },
  rdvNotes: { fontSize: 12, color: colors.text, marginTop: 6 },

  // États
  loaderCard: { paddingVertical: 24, alignItems: 'center' },
  emptyConsultCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginHorizontal: 24, borderWidth: 1, borderColor: colors.border },
  emptyConsultText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  emptyCta: { marginTop: 12, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  emptyCtaText: { color: colors.white, fontSize: 13, fontWeight: '700' },

  // Consultations médecin
  consultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 14, marginHorizontal: 24, marginBottom: 10, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  consultDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  consultInfo: { flex: 1, minWidth: 0 },
  consultName: { fontSize: 13, fontWeight: '600', color: colors.text },
  consultDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  consultScore: { fontSize: 12, fontWeight: '700', color: colors.green, marginLeft: 8 },
});
