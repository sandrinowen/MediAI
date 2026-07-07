// src/pages/AdminStatistics.jsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Modal, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors } from '../styles/globalStyles';
import { getStatistics } from '../services/adminService';
import Toast from '../components/common/Toast';

export default function AdminStatistics({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadData = async () => {
    const statsData = await getStatistics();
    setStats(statsData);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const buildReportCsv = () => {
    const generatedAt = new Date().toLocaleString('fr-FR');
    const lines = [
      'Rapport statistique MediAI',
      `Genere le;${generatedAt}`,
      '',
      'Indicateur;Valeur',
      `Utilisateurs;${stats?.totalUsers || 0}`,
      `Consultations;${stats?.totalConsultations || 0}`,
      `Rendez-vous;${stats?.totalAppointments || 0}`,
      `Patients;${stats?.patientsCount || 0}`,
      `Medecins;${stats?.medecinsCount || 0}`,
      `Admins;${stats?.adminsCount || 0}`,
      '',
      'Pathologie;Nombre de cas',
    ];

    if (stats?.topDiseases?.length) {
      stats.topDiseases.forEach(disease => {
        lines.push(`${String(disease.name || '').replace(/;/g, ',')};${disease.count || 0}`);
      });
    } else {
      lines.push('Aucune donnee;0');
    }

    return lines.join('\n');
  };

  const downloadReportOnWeb = (filename, content) => {
    const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!stats) {
      showToast('❌ Aucune statistique à exporter', 'error');
      return;
    }

    setExportModal(true);

    try {
      const date = new Date().toISOString().slice(0, 10);
      const filename = `rapport-mediai-${date}.csv`;
      const content = buildReportCsv();

      if (Platform.OS === 'web') {
        downloadReportOnWeb(filename, content);
        showToast('✅ Rapport téléchargé', 'success');
        return;
      }

      const file = new File(Paths.document, filename);
      file.create({ overwrite: true });
      file.write(content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Rapport statistique MediAI',
        });
        showToast('✅ Rapport prêt à partager', 'success');
      } else {
        showToast('✅ Rapport enregistré sur l’appareil', 'success');
      }
    } catch (error) {
      console.warn('[AdminStatistics] échec export rapport :', error);
      showToast('❌ Erreur lors de l’export du rapport', 'error');
    } finally {
      setExportModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ height: 34 }} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Statistiques</Text>
        </View>
        <View style={styles.placeholder}><Text style={styles.placeholderEmoji}>⏳</Text><Text style={styles.placeholderText}>Chargement...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      
      <Modal transparent visible={exportModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIcon}><Text style={styles.modalIconText}>📄</Text></View>
            <Text style={styles.modalTitle}>Export en cours</Text>
            <Text style={styles.modalMessage}>Génération du rapport statistique...</Text>
            <View style={styles.progressBar}><View style={styles.progressFill} /></View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Tableau de bord</Text>
        <Text style={styles.subtitle}>Statistiques globales</Text>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statIcon}>👥</Text><Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text><Text style={styles.statLabel}>Utilisateurs</Text></View>
          <View style={styles.statCard}><Text style={styles.statIcon}>📋</Text><Text style={styles.statNumber}>{stats?.totalConsultations || 0}</Text><Text style={styles.statLabel}>Consultations</Text></View>
          <View style={styles.statCard}><Text style={styles.statIcon}>📅</Text><Text style={styles.statNumber}>{stats?.totalAppointments || 0}</Text><Text style={styles.statLabel}>Rendez-vous</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 Répartition des rôles</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleItem}><Text style={styles.roleEmoji}>👤</Text><Text style={styles.roleNumber}>{stats?.patientsCount || 0}</Text><Text style={styles.roleName}>Patients</Text></View>
            <View style={styles.roleItem}><Text style={styles.roleEmoji}>👨‍⚕️</Text><Text style={styles.roleNumber}>{stats?.medecinsCount || 0}</Text><Text style={styles.roleName}>Médecins</Text></View>
            <View style={styles.roleItem}><Text style={styles.roleEmoji}>🔐</Text><Text style={styles.roleNumber}>{stats?.adminsCount || 0}</Text><Text style={styles.roleName}>Admins</Text></View>
          </View>
        </View>

        {stats?.topDiseases && stats.topDiseases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Pathologies fréquentes</Text>
            {stats.topDiseases.map((disease, index) => (
              <View key={index} style={styles.diseaseRow}><Text style={styles.diseaseRank}>{index + 1}</Text><Text style={styles.diseaseName}>{disease.name}</Text><Text style={styles.diseaseCount}>{disease.count} cas</Text></View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportIcon}>📄</Text><Text style={styles.exportText}>Exporter le rapport</Text>
        </TouchableOpacity>
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
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 48, marginBottom: 12 },
  placeholderText: { fontSize: 14, color: colors.muted },
  statsGrid: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statNumber: { fontSize: 22, fontWeight: '700', color: colors.green },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  section: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: colors.muted, paddingVertical: 20 },
  appointmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  appointmentDoctor: { fontSize: 14, fontWeight: '600', color: colors.text },
  appointmentDetails: { fontSize: 11, color: colors.muted, marginTop: 2 },
  appointmentStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusConfirmed: { backgroundColor: '#d1fae5' },
  appointmentStatusText: { fontSize: 10, fontWeight: '500' },
  roleRow: { flexDirection: 'row', justifyContent: 'space-around' },
  roleItem: { alignItems: 'center' },
  roleEmoji: { fontSize: 24, marginBottom: 8 },
  roleNumber: { fontSize: 18, fontWeight: '700', color: colors.text },
  roleName: { fontSize: 12, color: colors.muted, marginTop: 4 },
  diseaseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  diseaseRank: { width: 30, fontSize: 14, fontWeight: '600', color: colors.green },
  diseaseName: { flex: 1, fontSize: 14, color: colors.text },
  diseaseCount: { fontSize: 12, color: colors.muted },
  exportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green, marginHorizontal: 16, marginVertical: 20, padding: 16, borderRadius: 16, gap: 10 },
  exportIcon: { fontSize: 20, color: colors.white },
  exportText: { fontSize: 16, fontWeight: '600', color: colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: colors.white, borderRadius: 24, padding: 24, alignItems: 'center', width: '80%' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalIconText: { fontSize: 32 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalMessage: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  progressBar: { width: '100%', height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { width: '70%', height: '100%', backgroundColor: colors.green, borderRadius: 2 },
});