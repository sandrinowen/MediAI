// src/pages/Results.jsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../styles/globalStyles';

export default function Results({ route, navigation }) {
  const { results, iotData } = route.params || { results: [], iotData: null };

  const getUrgencyColor = (urgence) => {
    switch (urgence) {
      case 3: return '#f97316';
      case 2: return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const getUrgencyText = (urgence) => {
    switch (urgence) {
      case 3: return '🟠 Urgent';
      case 2: return '🟡 Modéré';
      default: return '🟢 Léger';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Nouveau diagnostic</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Résultats</Text>
        <Text style={styles.count}>{results.length} diagnostic(s) trouvé(s)</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IoT Data Strip */}
        {iotData && (
          <View style={styles.iotResultStrip}>
            <Text style={styles.iotResultLabel}>📡 Données capteurs utilisées</Text>
            <View style={styles.iotResultChips}>
              <View style={[styles.iotChip, iotData.temp >= 38.5 && styles.iotChipAlert]}>
                <Text style={styles.iotChipText}>🌡️ {iotData.temp}°C {iotData.temp >= 38.5 ? '— Fièvre confirmée' : ''}</Text>
              </View>
              <View style={[styles.iotChip, iotData.hr > 100 && styles.iotChipAlert]}>
                <Text style={styles.iotChipText}>💓 {iotData.hr} bpm {iotData.hr > 100 ? '— Tachycardie' : ''}</Text>
              </View>
              <View style={styles.iotChip}>
                <Text style={styles.iotChipText}>🫁 SpO₂ {iotData.spo2}% — {iotData.spo2 >= 95 ? 'Normal' : 'Bas'}</Text>
              </View>
            </View>
          </View>
        )}

        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={[styles.accentBar, { backgroundColor: getUrgencyColor(result.urgence) }]} />
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.resultName}>{result.nom}</Text>
                <Text style={styles.resultCat}>{result.cat}</Text>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{Math.round(result.sc * 100)}%</Text>
              </View>
            </View>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(result.urgence) + '20' }]}>
              <Text style={[styles.urgencyText, { color: getUrgencyColor(result.urgence) }]}>{getUrgencyText(result.urgence)}</Text>
            </View>
            <View style={styles.recosContainer}>
              <Text style={styles.recosLabel}>Recommandations</Text>
              {result.recos.map((reco, idx) => (
                <View key={idx} style={styles.recoItem}>
                  <Text style={styles.recoArrow}>→</Text>
                  <Text style={styles.recoText}>{reco}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <View style={styles.warningStrip}>
          <Text style={styles.warningText}>⚠️ Ce diagnostic est une aide. Consultez un médecin pour confirmation.</Text>
        </View>
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
  count: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  iotResultStrip: { backgroundColor: colors.blueBg, marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#bae6fd' },
  iotResultLabel: { fontSize: 10, fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  iotResultChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iotChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: '#bae6fd' },
  iotChipAlert: { backgroundColor: colors.warnBg, borderColor: colors.warn },
  iotChipText: { fontSize: 10, color: '#0c4a6e' },
  resultCard: { backgroundColor: colors.white, borderRadius: 20, marginHorizontal: 16, marginTop: 16, padding: 18, borderWidth: 1, borderColor: colors.border, position: 'relative', overflow: 'hidden' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  resultName: { fontSize: 16, fontWeight: '700', color: colors.text },
  resultCat: { fontSize: 10, color: colors.muted, marginTop: 2 },
  scoreCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 17, fontWeight: '800', color: colors.green },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  recosContainer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  recosLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginBottom: 8 },
  recoItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  recoArrow: { color: colors.greenLight, fontSize: 11, fontWeight: '700' },
  recoText: { fontSize: 11, color: colors.text, lineHeight: 16, flex: 1 },
  warningStrip: { marginHorizontal: 16, marginVertical: 16, marginBottom: 40, padding: 12, backgroundColor: colors.warnBg, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: colors.warn },
  warningText: { fontSize: 11, color: '#9a3412', lineHeight: 16 },
});