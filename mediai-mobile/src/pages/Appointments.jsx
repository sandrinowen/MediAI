// src/pages/Appointments.jsx
import { Alert, View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../styles/globalStyles';
import { bookRDV, getCreneaux, getDoctors, getUserRDV } from '../services/rdvService';

const DEFAULT_SPECIALTIES = ['Tous', 'Généraliste', 'Infectiologue', 'Cardiologue', 'Pédiatre'];

// ── État des rendez-vous du patient : groupes affichés + libellés/couleurs ──
// L'ordre du tableau définit l'ordre d'affichage des sections.
const RDV_GROUPS = [
  { statut: 'planifie', label: 'En attente', color: '#6b7280', bg: '#f3f4f6' },
  { statut: 'confirme', label: 'En cours', color: '#16a34a', bg: '#dcfce7' },
  { statut: 'effectue', label: 'Terminé', color: '#2563eb', bg: '#dbeafe' },
  { statut: 'annule', label: 'Annulé', color: '#ef4444', bg: '#fee2e2' },
];

const getDoctorLabel = (rdv = {}) => rdv.medecin?.nom || 'Médecin';

// Date + heure d'un RDV, avec raccourcis « Aujourd'hui » / « Demain ».
const formatRdvDate = (rdv = {}) => {
  const hour = String(rdv.creneau || '').slice(0, 5);
  const date = rdv.date_rdv ? new Date(rdv.date_rdv) : null;
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

  return hour ? `${day} · ${hour}` : day;
};

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getDoctorName = (doctor = {}) => doctor.nom || doctor.name || 'Médecin';
const getDoctorSpecialty = (doctor = {}) => doctor.specialite || doctor.specialty || 'Spécialité non renseignée';
const getToday = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const matchesSpecialty = (specialty, selected) => {
  if (selected === 'Tous') return true;

  const normalizedSpecialty = normalize(specialty);
  const normalizedSelected = normalize(selected);

  if (normalizedSelected === 'generaliste') {
    return normalizedSpecialty.includes('generaliste') || normalizedSpecialty.includes('generale');
  }

  return normalizedSpecialty.includes(normalizedSelected);
};

export default function Appointments({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Tous');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [motif, setMotif] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [myRdv, setMyRdv] = useState([]);
  const [rdvLoading, setRdvLoading] = useState(true);

  const loadMyRdv = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRdvLoading(true);
    const result = await getUserRDV();
    if (result.success) setMyRdv(Array.isArray(result.rdvs) ? result.rdvs : []);
    if (!silent) setRdvLoading(false);
  }, []);

  const loadDoctors = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setError('');

    const result = await getDoctors();
    if (result.success) {
      setDoctors(Array.isArray(result.doctors) ? result.doctors : []);
    } else {
      setError(result.error || 'Impossible de charger les médecins.');
    }

    if (!silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDoctors();
    loadMyRdv();
  }, [loadDoctors, loadMyRdv]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDoctors({ silent: true }), loadMyRdv({ silent: true })]);
    setRefreshing(false);
  }, [loadDoctors, loadMyRdv]);

  const loadSlots = useCallback(async (doctorId, date) => {
    if (!doctorId || !date) return;

    setSlotsLoading(true);
    setBookingError('');
    setSelectedSlot('');

    const result = await getCreneaux(doctorId, date);
    if (result.success) {
      setSlots(Array.isArray(result.creneaux) ? result.creneaux : []);
    } else {
      setSlots([]);
      setBookingError(result.error || 'Impossible de charger les créneaux.');
    }

    setSlotsLoading(false);
  }, []);

  const openBooking = useCallback((doctor) => {
    const doctorId = doctor?.id;
    if (!doctorId) {
      setBookingError('Médecin invalide.');
      return;
    }

    const nextDate = selectedDate || getToday();
    setSelectedDoctorId(doctorId);
    setSelectedDate(nextDate);
    setMotif('');
    loadSlots(doctorId, nextDate);
  }, [loadSlots, selectedDate]);

  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
    setSlots([]);
    setSelectedSlot('');
    setBookingError('');
  }, []);

  const handleBook = useCallback(async (doctor) => {
    if (!doctor?.id || !selectedDate || !selectedSlot) {
      setBookingError('Choisissez une date et un créneau.');
      return;
    }

    setBooking(true);
    setBookingError('');

    const result = await bookRDV({
      medecin_id: doctor.id,
      date_rdv: selectedDate,
      creneau: selectedSlot,
      motif: motif.trim() || null,
    });

    setBooking(false);

    if (result.success) {
      Alert.alert('Rendez-vous demandé', 'Votre demande a été envoyée au médecin.');
      setSelectedDoctorId(null);
      setSelectedSlot('');
      setMotif('');
      setSlots([]);
      loadMyRdv({ silent: true });
      return;
    }

    setBookingError(result.error || 'Impossible de réserver ce rendez-vous.');
    loadSlots(doctor.id, selectedDate);
  }, [loadSlots, loadMyRdv, motif, selectedDate, selectedSlot]);

  const specialties = useMemo(() => {
    const apiSpecialties = doctors
      .map(getDoctorSpecialty)
      .filter(Boolean)
      .filter(specialty => specialty !== 'Spécialité non renseignée');

    return [...DEFAULT_SPECIALTIES, ...apiSpecialties].filter((specialty, index, list) => (
      list.findIndex(item => normalize(item) === normalize(specialty)) === index
    ));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return doctors.filter(doctor => {
      const name = getDoctorName(doctor);
      const specialty = getDoctorSpecialty(doctor);
      const matchesQuery = !normalizedQuery
        || normalize(name).includes(normalizedQuery)
        || normalize(specialty).includes(normalizedQuery);

      return matchesQuery && matchesSpecialty(specialty, selectedSpecialty);
    });
  }, [doctors, query, selectedSpecialty]);

  // Regroupe les RDV du patient par statut, dans l'ordre de RDV_GROUPS,
  // en n'affichant que les sections non vides. Les RDV les plus récents d'abord.
  const rdvSections = useMemo(() => {
    const sorted = [...myRdv].sort((a, b) => {
      const keyA = `${a.date_rdv || ''} ${a.creneau || ''}`;
      const keyB = `${b.date_rdv || ''} ${b.creneau || ''}`;
      return keyB.localeCompare(keyA);
    });

    return RDV_GROUPS
      .map(group => ({ ...group, items: sorted.filter(rdv => rdv.statut === group.statut) }))
      .filter(group => group.items.length > 0);
  }, [myRdv]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rendez-vous</Text>
        <Text style={styles.subtitle}>Médecins disponibles près de vous</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
      >
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Nom, spécialité..."
            placeholderTextColor="#9dbfaa"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtyChips}
        >
          {specialties.map(specialty => {
            const active = selectedSpecialty === specialty;
            return (
              <TouchableOpacity
                key={specialty}
                style={[styles.specialtyChip, active && styles.specialtyChipActive]}
                onPress={() => setSelectedSpecialty(specialty)}
              >
                <Text style={[styles.specialtyChipText, active && styles.specialtyChipTextActive]}>
                  {specialty}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Sous-section : état de mes rendez-vous ─────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes rendez-vous</Text>
        </View>

        {rdvLoading ? (
          <View style={styles.rdvLoader}>
            <ActivityIndicator size="small" color={colors.green} />
          </View>
        ) : rdvSections.length === 0 ? (
          <View style={styles.rdvEmptyCard}>
            <Text style={styles.rdvEmptyText}>
              Vous n'avez aucun rendez-vous pour le moment. Choisissez un médecin ci-dessous pour en prendre un.
            </Text>
          </View>
        ) : (
          rdvSections.map(group => (
            <View key={group.statut} style={styles.rdvGroup}>
              <View style={styles.rdvGroupHead}>
                <View style={[styles.rdvGroupDot, { backgroundColor: group.color }]} />
                <Text style={styles.rdvGroupTitle}>{group.label}</Text>
                <Text style={styles.rdvGroupCount}>{group.items.length}</Text>
              </View>

              {group.items.map(rdv => (
                <View key={rdv.id} style={styles.rdvCard}>
                  <View style={styles.rdvCardTop}>
                    <Text style={styles.rdvDoctor} numberOfLines={1}>👨‍⚕️ {getDoctorLabel(rdv)}</Text>
                    <View style={[styles.rdvBadge, { backgroundColor: group.bg }]}>
                      <Text style={[styles.rdvBadgeText, { color: group.color }]}>{group.label}</Text>
                    </View>
                  </View>
                  {!!rdv.medecin?.specialite && (
                    <Text style={styles.rdvSpecialty}>{rdv.medecin.specialite}</Text>
                  )}
                  <Text style={styles.rdvDate}>🗓️ {formatRdvDate(rdv)}</Text>
                  {!!rdv.motif && <Text style={styles.rdvMotif} numberOfLines={2}>📝 {rdv.motif}</Text>}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prendre un rendez-vous</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Chargement des médecins...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Chargement impossible</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadDoctors()}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun médecin trouvé</Text>
            <Text style={styles.stateText}>Aucun médecin inscrit ne correspond à cette recherche.</Text>
          </View>
        ) : (
          filteredDoctors.map((doctor, index) => {
            const name = getDoctorName(doctor);
            const specialty = getDoctorSpecialty(doctor);

            return (
              <View key={doctor.id || `${name}-${index}`} style={styles.doctorCard}>
                <View style={styles.doctorTop}>
                  <View style={styles.doctorAvatar}>
                    <Text style={styles.doctorAvatarText}>{doctor.emoji || '👨‍⚕️'}</Text>
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{name}</Text>
                    <Text style={styles.doctorSpecialty}>{specialty}</Text>
                    {!!doctor.localisation && <Text style={styles.doctorMeta}>{doctor.localisation}</Text>}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => selectedDoctorId === doctor.id ? setSelectedDoctorId(null) : openBooking(doctor)}
                >
                  <Text style={styles.bookButtonText}>
                    {selectedDoctorId === doctor.id ? 'Fermer' : 'Prendre rendez-vous'}
                  </Text>
                </TouchableOpacity>

                {selectedDoctorId === doctor.id && (
                  <View style={styles.bookingPanel}>
                    <Text style={styles.bookingLabel}>Date</Text>
                    <View style={styles.dateRow}>
                      <TextInput
                        style={styles.dateInput}
                        value={selectedDate}
                        onChangeText={handleDateChange}
                        placeholder="AAAA-MM-JJ"
                        placeholderTextColor="#9dbfaa"
                      />
                      <TouchableOpacity
                        style={styles.loadSlotsButton}
                        onPress={() => loadSlots(doctor.id, selectedDate)}
                        disabled={slotsLoading}
                      >
                        <Text style={styles.loadSlotsButtonText}>
                          {slotsLoading ? '...' : 'Créneaux'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {slotsLoading ? (
                      <Text style={styles.bookingHint}>Chargement des créneaux...</Text>
                    ) : slots.length === 0 ? (
                      <Text style={styles.bookingHint}>Aucun créneau disponible pour cette date.</Text>
                    ) : (
                      <View style={styles.slotsGrid}>
                        {slots.map(slot => {
                          const hour = slot.heure || slot;
                          const available = slot.disponible !== false;
                          const active = selectedSlot === hour;

                          return (
                            <TouchableOpacity
                              key={hour}
                              style={[
                                styles.slotChip,
                                !available && styles.slotChipDisabled,
                                active && styles.slotChipActive,
                              ]}
                              onPress={() => available && setSelectedSlot(hour)}
                              disabled={!available}
                            >
                              <Text style={[
                                styles.slotChipText,
                                !available && styles.slotChipTextDisabled,
                                active && styles.slotChipTextActive,
                              ]}>
                                {hour}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    <TextInput
                      style={styles.motifInput}
                      value={motif}
                      onChangeText={setMotif}
                      placeholder="Motif du rendez-vous (optionnel)"
                      placeholderTextColor="#9dbfaa"
                      multiline
                    />

                    {!!bookingError && <Text style={styles.bookingError}>{bookingError}</Text>}

                    <TouchableOpacity
                      style={[styles.confirmButton, (!selectedSlot || booking) && styles.confirmButtonDisabled]}
                      onPress={() => handleBook(doctor)}
                      disabled={!selectedSlot || booking}
                    >
                      <Text style={styles.confirmButtonText}>
                        {booking ? 'Réservation...' : 'Confirmer le rendez-vous'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.green,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scrollContent: { paddingBottom: 90 },
  searchBox: {
    marginTop: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, padding: 0, fontSize: 13, color: colors.text },
  specialtyChips: { paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  specialtyChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  specialtyChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  specialtyChipText: { fontSize: 11, fontWeight: '500', color: colors.muted },
  specialtyChipTextActive: { color: colors.white },

  // Sous-section « Mes rendez-vous »
  sectionHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rdvLoader: { paddingVertical: 18, alignItems: 'center' },
  rdvEmptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rdvEmptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  rdvGroup: { marginBottom: 6 },
  rdvGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 8 },
  rdvGroupDot: { width: 8, height: 8, borderRadius: 4 },
  rdvGroupTitle: { fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.3 },
  rdvGroupCount: { fontSize: 11, fontWeight: '700', color: colors.muted },
  rdvCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rdvCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rdvDoctor: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  rdvBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  rdvBadgeText: { fontSize: 10, fontWeight: '800' },
  rdvSpecialty: { fontSize: 11, color: colors.muted, marginTop: 4 },
  rdvDate: { fontSize: 12, color: colors.text, marginTop: 6 },
  rdvMotif: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },

  doctorCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 2,
  },
  doctorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarText: { fontSize: 22 },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 14, fontWeight: '700', color: colors.text },
  doctorSpecialty: { fontSize: 11, color: colors.muted, marginTop: 3 },
  doctorMeta: { fontSize: 11, color: colors.muted, marginTop: 3 },
  bookButton: {
    marginTop: 14,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  bookButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  bookingPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.cream,
  },
  loadSlotsButton: {
    minWidth: 88,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.greenPale,
  },
  loadSlotsButtonText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  bookingHint: { marginTop: 12, fontSize: 12, color: colors.muted, lineHeight: 18 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  slotChip: {
    minWidth: 64,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  slotChipActive: { backgroundColor: colors.green, borderColor: colors.green },
  slotChipDisabled: { backgroundColor: '#eef3ee', borderColor: '#e3ebe3' },
  slotChipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  slotChipTextActive: { color: colors.white },
  slotChipTextDisabled: { color: '#a8b6aa' },
  motifInput: {
    minHeight: 76,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.cream,
    textAlignVertical: 'top',
  },
  bookingError: { marginTop: 10, color: colors.warn, fontSize: 12, lineHeight: 17 },
  confirmButton: {
    marginTop: 12,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.55 },
  confirmButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  stateTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stateText: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  retryButton: { marginTop: 14, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  retryButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
