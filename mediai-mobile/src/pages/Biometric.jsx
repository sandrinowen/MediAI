// src/pages/Biometric.jsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { colors } from '../styles/globalStyles';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import Toast from '../components/common/Toast';
import Loader from '../components/common/Loader';
import RealTimeChart from '../components/biometric/RealTimeChart';

export default function Biometric({ navigation }) {
  const { user } = useAuth();
  const { connected, deviceData, connectDevice, disconnectDevice, isScanning } = useBiometric();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [selectedMetric, setSelectedMetric] = useState('temp');

  // ✅ Fonction helper pour afficher "---" si la valeur est null
  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined) {
      return '---';
    }
    return `${value}${unit}`;
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleConnect = async () => {
    await connectDevice();
    showToast('📡 Appareil MediAI Band Pro connecté avec succès', 'success');
  };

  const handleDisconnect = async () => {
    await disconnectDevice();
    showToast('📡 Appareil déconnecté', 'info');
  };

  const handleSendToDiagnostic = () => {
    if (!connected) {
      const msg = 'Veuillez d\'abord connecter votre appareil IoT pour envoyer les données vers le diagnostic.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Appareil non connecté', msg, [{ text: 'OK' }]);
      return;
    }

    // ✅ Vérifier si au moins une donnée est valide
    const hasValidData = deviceData?.temp !== null || deviceData?.hr !== null || deviceData?.spo2 !== null;
    
    if (!hasValidData) {
      const msg = 'Aucune donnée de capteur valide. Veuillez utiliser les capteurs avant de lancer le diagnostic.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Données insuffisantes', msg, [{ text: 'OK' }]);
      return;
    }

    // ✅ Recap mis à jour avec gestion des valeurs null
    const tempDisplay = deviceData?.temp !== null ? `${deviceData.temp}°C` : 'non mesurée';
    const hrDisplay = deviceData?.hr !== null ? `${deviceData.hr} bpm` : 'non mesurée';
    const spo2Display = deviceData?.spo2 !== null ? `${deviceData.spo2}%` : 'non mesurée';

    const recap = `Les données suivantes seront incluses dans votre diagnostic :\n\n🌡️ Température: ${tempDisplay}\n💓 Fréquence cardiaque: ${hrDisplay}\n🫁 SpO₂: ${spo2Display}\n\nSouhaitez-vous lancer le diagnostic IA avec ces données ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(recap)) navigation.navigate('ChatIA');
      return;
    }
    Alert.alert('Envoi vers diagnostic IA', recap, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Lancer le diagnostic', onPress: () => navigation.navigate('ChatIA') }
    ]);
  };

  // ✅ Fonction modifiée pour gérer les valeurs null
  const getTempStatus = () => {
    const temp = deviceData?.temp;
    
    // Si pas de mesure
    if (temp === null || temp === undefined) {
      return { status: '⏳ En attente', color: '#6b7280', bg: '#f3f4f6' };
    }
    
    if (temp >= 38.5) return { status: '⚠️ Fièvre', color: '#dc2626', bg: '#fee2e2' };
    if (temp >= 37.5) return { status: '⚡ Légère fièvre', color: '#f59e0b', bg: '#fef3e2' };
    return { status: '✓ Normal', color: '#10b981', bg: '#d1fae5' };
  };

  // ✅ Fonction modifiée pour gérer les valeurs null
  const getHeartStatus = () => {
    const hr = deviceData?.hr;
    
    // Si pas de mesure
    if (hr === null || hr === undefined) {
      return { status: '⏳ En attente', color: '#6b7280', bg: '#f3f4f6' };
    }
    
    if (hr > 100) return { status: '⚡ Élevée', color: '#f59e0b', bg: '#fef3e2' };
    if (hr < 60) return { status: '⚠️ Bradycardie', color: '#dc2626', bg: '#fee2e2' };
    return { status: '✓ Normal', color: '#10b981', bg: '#d1fae5' };
  };

  // ✅ Fonction pour SpO2
  const getSpo2Status = () => {
    const spo2 = deviceData?.spo2;
    
    // Si pas de mesure
    if (spo2 === null || spo2 === undefined) {
      return { status: '⏳ En attente', color: '#6b7280', bg: '#f3f4f6' };
    }
    
    if (spo2 < 90) return { status: '⚠️ Critique', color: '#dc2626', bg: '#fee2e2' };
    if (spo2 < 95) return { status: '⚡ Bas', color: '#f59e0b', bg: '#fef3e2' };
    return { status: '✓ Normal', color: '#10b981', bg: '#d1fae5' };
  };

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
      <Loader visible={isScanning} text="Recherche du dispositif..." />

      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📡 Capteurs biologiques</Text>
        <Text style={styles.subtitle}>MediAI Band Pro · Bluetooth 5.0</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
      >
        {/* Device Status */}
        <View style={styles.deviceStatus}>
          <View style={styles.dsTop}>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceIcon}><Text style={styles.deviceIconText}>⌚</Text></View>
              <View>
                <Text style={styles.deviceName}>MediAI Band Pro</Text>
                <Text style={styles.deviceModel}>Modèle MB-2024 · Batterie 84%</Text>
              </View>
            </View>
            <View style={[styles.statusPill, connected ? styles.statusConnected : styles.statusDisconnected]}>
              <View style={[styles.statusDot, connected ? styles.dotGreen : styles.dotRed]} />
              <Text style={styles.statusText}>{connected ? 'Connecté' : 'Déconnecté'}</Text>
            </View>
          </View>
          <View style={styles.signalContainer}>
            <Text style={styles.signalLabel}>Signal BLE</Text>
            <View style={styles.signalBars}>
              <View style={[styles.signalBar, styles.signalBarOn, { height: 6 }]} />
              <View style={[styles.signalBar, styles.signalBarOn, { height: 9 }]} />
              <View style={[styles.signalBar, styles.signalBarOn, { height: 13 }]} />
              <View style={[styles.signalBar, styles.signalBarOn, { height: 17 }]} />
              <View style={[styles.signalBar, styles.signalBarOff, { height: 21 }]} />
            </View>
            <Text style={[styles.signalLabel, { marginLeft: 6 }]}>Fort · -52 dBm</Text>
            {connected && <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● LIVE</Text></View>}
          </View>
          {!connected ? (
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
              <Text style={styles.connectBtnText}>📡 Connecter le dispositif</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Text style={styles.disconnectBtnText}>🔌 Déconnecter</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Metrics Grid - Simplifié à 3 cartes */}
        <View style={styles.metricsGrid}>
          {/* 1. Température */}
          <View style={styles.metricCard}>
            <Text style={styles.mcIcon}>🌡️</Text>
            <Text style={styles.mcLabel}>Température</Text>
            <Text style={styles.mcValue}>
              {formatValue(deviceData?.temp, '°C')}
            </Text>
            <View style={[styles.mcStatus, { backgroundColor: getTempStatus().bg }]}>
              <Text style={[styles.mcStatusText, { color: getTempStatus().color }]}>{getTempStatus().status}</Text>
            </View>
            <RealTimeChart metric="temp" value={deviceData?.temp} />
          </View>

          {/* 2. Fréquence Cardiaque */}
          <View style={styles.metricCard}>
            <Text style={styles.mcIcon}>💓</Text>
            <Text style={styles.mcLabel}>Fréq. cardiaque</Text>
            <Text style={styles.mcValue}>
              {formatValue(deviceData?.hr, ' bpm')}
            </Text>
            <View style={[styles.mcStatus, { backgroundColor: getHeartStatus().bg }]}>
              <Text style={[styles.mcStatusText, { color: getHeartStatus().color }]}>{getHeartStatus().status}</Text>
            </View>
            <RealTimeChart metric="hr" value={deviceData?.hr} />
          </View>

          {/* 3. SpO2 */}
          <View style={styles.metricCard}>
            <Text style={styles.mcIcon}>🫁</Text>
            <Text style={styles.mcLabel}>SpO₂</Text>
            <Text style={styles.mcValue}>
              {formatValue(deviceData?.spo2, '%')}
            </Text>
            <View style={[styles.mcStatus, { backgroundColor: getSpo2Status().bg }]}>
              <Text style={[styles.mcStatusText, { color: getSpo2Status().color }]}>{getSpo2Status().status}</Text>
            </View>
            <RealTimeChart metric="spo2" value={deviceData?.spo2} />
          </View>
        </View>

        {/* AI Fusion Card */}
        <View style={styles.fusionCard}>
          <Text style={styles.fusionTitle}>🧬 Envoyer vers l'IA de diagnostic</Text>
          <Text style={styles.fusionSub}>Ces mesures seront automatiquement incluses pour affiner le diagnostic.</Text>
          <View style={styles.fusionMetrics}>
            {/* ✅ Affichage conditionnel des chips */}
            {deviceData?.temp !== null && (
              <Text style={styles.fusionChip}>🌡️ {deviceData.temp}°C</Text>
            )}
            {deviceData?.hr !== null && (
              <Text style={styles.fusionChip}>💓 {deviceData.hr} bpm</Text>
            )}
            {deviceData?.spo2 !== null && (
              <Text style={styles.fusionChip}>🫁 {deviceData.spo2}%</Text>
            )}
            {/* Si aucune donnée valide */}
            {deviceData?.temp === null && deviceData?.hr === null && deviceData?.spo2 === null && (
              <Text style={styles.fusionChip}>⏳ Aucune donnée disponible</Text>
            )}
          </View>
          <TouchableOpacity style={styles.fusionBtn} onPress={handleSendToDiagnostic}>
            <Text style={styles.fusionBtnText}>🧬 Lancer le diagnostic avec IoT</Text>
          </TouchableOpacity>
        </View>

        {/* Historique */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Historique des mesures</Text>
          <Text style={styles.chartSub}>Évolution sur les dernières 24 heures</Text>
          <View style={styles.chartTabs}>
            <TouchableOpacity style={[styles.chartTab, selectedMetric === 'temp' && styles.chartTabActive]} onPress={() => setSelectedMetric('temp')}>
              <Text style={[styles.chartTabText, selectedMetric === 'temp' && styles.chartTabTextActive]}>Température</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chartTab, selectedMetric === 'hr' && styles.chartTabActive]} onPress={() => setSelectedMetric('hr')}>
              <Text style={[styles.chartTabText, selectedMetric === 'hr' && styles.chartTabTextActive]}>Cœur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chartTab, selectedMetric === 'spo2' && styles.chartTabActive]} onPress={() => setSelectedMetric('spo2')}>
              <Text style={[styles.chartTabText, selectedMetric === 'spo2' && styles.chartTabTextActive]}>SpO₂</Text>
            </TouchableOpacity>
          </View>
          <RealTimeChart metric={selectedMetric} isHistory={true} />
          <View style={styles.chartLegend}>
            <Text style={styles.chartLegendText}>00h</Text>
            <Text style={styles.chartLegendText}>06h</Text>
            <Text style={styles.chartLegendText}>12h</Text>
            <Text style={styles.chartLegendText}>18h</Text>
            <Text style={styles.chartLegendText}>Maintenant</Text>
          </View>
        </View>

        {/* Pairing Steps */}
        <View style={styles.pairingSection}>
          <Text style={styles.pairingTitle}>Comment coupler un dispositif</Text>
          <View style={styles.pairSteps}>
            <View style={styles.pairStep}>
              <View style={styles.pairNum}><Text style={styles.pairNumText}>1</Text></View>
              <Text style={styles.pairText}><Text style={styles.pairBold}>Activer le Bluetooth</Text> sur votre téléphone et allumer le bracelet MediAI.</Text>
            </View>
            <View style={styles.pairStep}>
              <View style={styles.pairNum}><Text style={styles.pairNumText}>2</Text></View>
              <Text style={styles.pairText}>Appuyer sur <Text style={styles.pairBold}>« Connecter le dispositif »</Text> — le bracelet apparaît.</Text>
            </View>
            <View style={styles.pairStep}>
              <View style={styles.pairNum}><Text style={styles.pairNumText}>3</Text></View>
              <Text style={styles.pairText}>Les mesures se synchronisent <Text style={styles.pairBold}>automatiquement</Text> toutes les 2 secondes.</Text>
            </View>
            {connected && (
              <View style={[styles.pairStep, styles.pairStepSuccess]}>
                <View style={[styles.pairNum, styles.pairNumSuccess]}><Text style={styles.pairNumSuccessText}>✓</Text></View>
                <Text style={[styles.pairText, styles.pairTextSuccess]}><Text style={styles.pairBold}>Couplage réussi.</Text> Les mesures se synchronisent en temps réel.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#1e3a5f', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { marginBottom: 12 },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  deviceStatus: { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  dsTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  deviceInfo: { flexDirection: 'row', gap: 12 },
  deviceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  deviceIconText: { fontSize: 22 },
  deviceName: { fontSize: 14, fontWeight: '700', color: colors.text },
  deviceModel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusConnected: { backgroundColor: '#d1fae5' },
  statusDisconnected: { backgroundColor: colors.warnBg },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  dotGreen: { backgroundColor: '#10b981' },
  dotRed: { backgroundColor: colors.warn },
  statusText: { fontSize: 11, fontWeight: '700' },
  signalContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  signalLabel: { fontSize: 11, color: colors.muted },
  signalBars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  signalBar: { width: 4, borderRadius: 1 },
  signalBarOn: { backgroundColor: colors.green },
  signalBarOff: { backgroundColor: colors.border },
  liveBadge: { marginLeft: 'auto', backgroundColor: colors.warnBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveBadgeText: { fontSize: 9, fontWeight: '700', color: '#7f1d1d' },
  connectBtn: { backgroundColor: colors.green, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  connectBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  disconnectBtn: { backgroundColor: colors.warnBg, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: colors.warn },
  disconnectBtnText: { color: colors.warn, fontSize: 13, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  metricCard: { width: '48%', backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border },
  mcIcon: { fontSize: 20, marginBottom: 8 },
  mcLabel: { fontSize: 10, color: colors.muted, fontWeight: '600', textTransform: 'uppercase' },
  mcValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 3 },
  mcUnit: { fontSize: 11, color: colors.muted, fontWeight: '400' },
  mcStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  mcStatusText: { fontSize: 9, fontWeight: '700' },
  fusionCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#1b4332', borderRadius: 20, padding: 18 },
  fusionTitle: { fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 4 },
  fusionSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  fusionMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  fusionChip: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 10, fontWeight: '600', color: colors.white, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  fusionBtn: { backgroundColor: colors.white, borderRadius: 12, padding: 11, alignItems: 'center' },
  fusionBtnText: { fontSize: 12, fontWeight: '700', color: colors.green },
  chartSection: { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, marginBottom: 20, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  chartSub: { fontSize: 11, color: colors.muted, marginBottom: 12 },
  chartTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chartTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border },
  chartTabActive: { backgroundColor: colors.green, borderColor: colors.green },
  chartTabText: { fontSize: 11, fontWeight: '500', color: colors.muted },
  chartTabTextActive: { color: colors.white },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLegendText: { fontSize: 9, color: colors.muted },
  pairingSection: { marginHorizontal: 16, marginBottom: 40 },
  pairingTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 },
  pairSteps: { gap: 10 },
  pairStep: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.white, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  pairStepSuccess: { backgroundColor: colors.greenPale, borderColor: colors.green },
  pairNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center' },
  pairNumSuccess: { backgroundColor: colors.green },
  pairNumText: { fontSize: 12, fontWeight: '700', color: colors.green },
  pairNumSuccessText: { fontSize: 12, fontWeight: '700', color: colors.white },
  pairText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
  pairTextSuccess: { color: colors.green },
  pairBold: { fontWeight: '700' },
});