// src/pages/MedicalRecord.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { downloadBase64 } from '../utils/download';
import { colors } from '../styles/globalStyles';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../services/consultationHistoryService';
import { exportCarnetBase64, getCarnet } from '../services/carnetService';
import { mapConsultationToDiagnostic } from '../services/mappers';
import Toast from '../components/common/Toast';

export default function MedicalRecord({ navigation, route }) {
  const { user } = useAuth();
  const patientId = route?.params?.patientId || null;
  const patientNameParam = route?.params?.patientName || null;
  const readOnly = Boolean(route?.params?.readOnly);
  const [recordUser, setRecordUser] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadDiagnostics = async () => {
    if (!user?.id) return;

    if (patientId) {
      const res = await getCarnet(patientId);
      if (res.success) {
        setRecordUser(res.data.user || null);
        setDiagnostics((res.data.consultations || []).map(mapConsultationToDiagnostic));
      } else {
        showToast(res.error || 'Accès au carnet refusé', 'error');
      }
      setLoading(false);
      return;
    }

    setRecordUser(user);
    const res = await getHistory();
    if (res.success) {
      setDiagnostics((res.data || []).map(mapConsultationToDiagnostic));
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDiagnostics();
    setRefreshing(false);
  }, [patientId, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadDiagnostics();
  }, [user?.id, patientId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString).slice(0, 10);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getUrgencyColor = (score) => {
    if (score >= 80) return '#f97316';
    if (score >= 60) return '#f59e0b';
    return '#22c55e';
  };

  const getUrgencyText = (score) => {
    if (score >= 80) return '🟠 Urgent';
    if (score >= 60) return '🟡 Modéré';
    return '🟢 Léger';
  };

  const displayName = patientNameParam
    || [recordUser?.prenom, recordUser?.nom].filter(Boolean).join(' ').trim()
    || user?.name
    || 'Patient';
  const displayId = recordUser?.id || patientId || user?.id || 0;
  const displaySexe = recordUser?.sexe || user?.sexe;
  const displayBlood = recordUser?.groupe_sanguin || [user?.bloodType, user?.rhesus].filter(Boolean).join('') || 'Non renseigné';
  const displayBirth = recordUser?.date_naissance || user?.birthDate || 'Non renseignée';
  const displayAllergies = recordUser?.allergies || user?.allergies || 'Aucune';
  const displayAntecedents = recordUser?.antecedents || user?.antecedents || 'Aucun';

  const handleExport = async () => {
    showToast('📄 Génération du PDF en cours...', 'info');

    const res = await exportCarnetBase64(patientId);
    if (!res.success || !res.base64) {
      showToast('❌ Échec de la génération : ' + (res.error || 'serveur injoignable'), 'error');
      return;
    }

    try {
      const filename = res.filename || `carnet-mediai-${displayId || 'me'}.pdf`;

      // Web : pas d'écriture disque ni de partage système → téléchargement
      // navigateur direct depuis le base64.
      if (Platform.OS === 'web') {
        downloadBase64(res.base64, filename, 'application/pdf');
        showToast('✅ Carnet PDF téléchargé', 'success');
        return;
      }

      const file = new File(Paths.document, filename);
      file.create({ overwrite: true });
      file.write(res.base64, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Carnet de santé MediAI',
        });
        showToast('✅ Carnet PDF généré', 'success');
      } else {
        showToast('✅ PDF enregistré sur l’appareil', 'success');
      }
    } catch (e) {
      console.warn('[Carnet] échec écriture/partage PDF :', e);
      showToast('❌ Erreur lors de l’enregistrement du PDF', 'error');
    }
  };

  const handleShare = async () => {
    const message = `📔 *Carnet de santé MediAI*\n\n👤 *Patient:* ${displayName}\n📅 *Date:* ${new Date().toLocaleDateString('fr-FR')}\n📊 *Consultations:* ${diagnostics.length}\n\n${diagnostics.map(d => `▪️ ${d.disease} (${d.score}%) - ${d.date}`).join('\n')}\n\n📱 Généré par MediAI`;
    try {
      await Share.share({ message, title: 'Carnet de santé MediAI' });
      showToast('📱 Partage lancé !', 'success');
    } catch (error) {
      showToast('❌ Erreur lors du partage', 'error');
    }
  };

  const totalConsultations = diagnostics.length;
  const averageScore = diagnostics.length > 0 ? Math.round(diagnostics.reduce((sum, d) => sum + d.score, 0) / diagnostics.length) : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><View style={{ height: 34 }} /><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>← Retour</Text></TouchableOpacity><Text style={styles.title}>📔 Carnet de santé</Text></View>
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Chargement...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>📔 {readOnly ? 'Carnet patient' : 'Mon carnet de santé'}</Text>
        <Text style={styles.subtitle}>{readOnly ? displayName : 'Votre historique médical complet'}</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}>
        <View style={styles.card}>
          <View style={styles.logo}><View style={styles.logoIcon}><Text style={styles.logoIconText}>🧬</Text></View><Text style={styles.logoText}>MediAI — Carnet de santé</Text></View>
          
          <View style={styles.patientBlock}>
            <View style={styles.patientHeader}><Text style={styles.patientName}>{displayName}</Text><View style={styles.patientBadge}><Text style={styles.patientBadgeText}>ID: #{String(displayId).padStart(6, '0')}</Text></View></View>
            <Text style={styles.patientInfo}>🎂 {displayBirth} · {displaySexe === 'M' ? 'Masculin' : displaySexe === 'F' ? 'Féminin' : 'Non renseigné'} · 🩸 {displayBlood}</Text>
            <Text style={styles.patientInfo}>💊 Allergies : {displayAllergies} · 🏥 Antécédents : {displayAntecedents}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={styles.statNumber}>{totalConsultations}</Text><Text style={styles.statLabel}>Consultations</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statNumber}>{averageScore}%</Text><Text style={styles.statLabel}>Score moyen</Text></View>
          </View>

          <Text style={styles.sectionLabel}>📋 Historique ({totalConsultations})</Text>
          {diagnostics.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyEmoji}>📔</Text><Text style={styles.emptyTitle}>Aucune consultation</Text><Text style={styles.emptyText}>{readOnly ? 'Aucun diagnostic disponible pour ce patient.' : 'Effectuez votre premier diagnostic pour voir votre historique ici.'}</Text></View>
          ) : (
            diagnostics.map((item, idx) => (
              <View key={item.id || idx} style={styles.entry}>
                <View style={styles.entryHeader}><Text style={styles.entryDate}>{formatDate(item.date)}</Text><View style={[styles.entryUrgency, { backgroundColor: getUrgencyColor(item.score) + '20' }]}><Text style={[styles.entryUrgencyText, { color: getUrgencyColor(item.score) }]}>{getUrgencyText(item.score)}</Text></View></View>
                <Text style={styles.entryDiag}>{item.disease}</Text>
                <View style={styles.entryScoreContainer}><View style={styles.entryScoreBar}><View style={[styles.entryScoreFill, { width: `${item.score}%`, backgroundColor: getUrgencyColor(item.score) }]} /></View><Text style={styles.entryScore}>{item.score}%</Text></View>
                {item.symptoms && item.symptoms.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailTitle}>Symptômes décrits</Text>
                    <Text style={styles.detailText}>{item.symptoms.join(', ')}</Text>
                  </View>
                )}
                {!!item.diagnosis && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailTitle}>Diagnostic IA</Text>
                    <Text style={styles.detailText}>{item.diagnosis}</Text>
                  </View>
                )}
                {item.causes && item.causes.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailTitle}>Causes ou facteurs possibles</Text>
                    {item.causes.map((cause, causeIdx) => <Text key={causeIdx} style={styles.detailText}>• {cause}</Text>)}
                  </View>
                )}
                {item.prescriptions && item.prescriptions.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailTitle}>Prescriptions / conduite à tenir</Text>
                    {item.prescriptions.map((prescription, prescriptionIdx) => <Text key={prescriptionIdx} style={styles.detailText}>• {prescription}</Text>)}
                  </View>
                )}
                {item.iotData && <Text style={styles.entryIot}>📡 IoT: 🌡️{item.iotData.temp ?? '—'}°C · 💓{item.iotData.hr ?? '—'}bpm · 🫁{item.iotData.spo2 ?? '—'}%</Text>}
              </View>
            ))
          )}
          <Text style={styles.footer}>Généré par MediAI le {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}><Text style={styles.exportIcon}>📄</Text><Text style={styles.exportBtnText}>Télécharger en PDF</Text></TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}><Text style={styles.shareIcon}>📱</Text><Text style={styles.shareBtnText}>Partager via WhatsApp</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: colors.green, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: 20, margin: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center' },
  logoIconText: { fontSize: 22 },
  logoText: { fontSize: 16, fontWeight: '700', color: colors.green },
  patientBlock: { backgroundColor: colors.greenPale, borderRadius: 16, padding: 14, marginBottom: 16 },
  patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 },
  patientName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  patientBadge: { backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  patientBadgeText: { fontSize: 9, color: colors.green, fontWeight: '600' },
  patientInfo: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: colors.cream, borderRadius: 12, padding: 12, marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '700', color: colors.green },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 },
  entry: { borderLeftWidth: 3, borderLeftColor: colors.greenLight, paddingLeft: 12, marginBottom: 16, paddingBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryDate: { fontSize: 10, color: colors.muted },
  entryUrgency: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  entryUrgencyText: { fontSize: 9, fontWeight: '600' },
  entryDiag: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2, marginBottom: 6 },
  entryScoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  entryScoreBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  entryScoreFill: { height: '100%', borderRadius: 2 },
  entryScore: { fontSize: 11, fontWeight: '600', color: colors.green },
  entrySymptoms: { fontSize: 10, color: colors.muted, marginTop: 4 },
  detailBlock: { backgroundColor: colors.cream, borderRadius: 10, padding: 10, marginTop: 8 },
  detailTitle: { fontSize: 10, fontWeight: '700', color: colors.green, marginBottom: 4, textTransform: 'uppercase' },
  detailText: { fontSize: 11, color: colors.text, lineHeight: 16 },
  entryIot: { fontSize: 9, color: '#0ea5e9', marginTop: 8 },
  footer: { textAlign: 'center', fontSize: 9, color: colors.muted, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green, marginHorizontal: 16, padding: 14, borderRadius: 14, marginBottom: 10, gap: 8 },
  exportIcon: { fontSize: 18, color: colors.white },
  exportBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, marginHorizontal: 16, padding: 14, borderRadius: 14, marginBottom: 40, gap: 8 },
  shareIcon: { fontSize: 18, color: colors.text },
  shareBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
