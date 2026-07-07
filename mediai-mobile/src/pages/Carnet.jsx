// src/pages/Carnet.jsx
// Carnet de santé : liste des diagnostics + export PDF.
import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import * as Sharing from 'expo-sharing';
import { colors } from '../styles/globalStyles';
import { getDiagnostics, exportDiagnosticsPdf } from '../services/diagnosticService';
import Toast from '../components/common/Toast';

const hypColor = (pct) => (pct > 60 ? colors.greenLight : pct >= 30 ? colors.yellow : colors.warn);

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function Carnet({ navigation }) {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ visible: true, message, type });

  const load = useCallback(async () => {
    const result = await getDiagnostics();
    if (result.success) setDiagnostics(result.data);
    else showToast(result.error || 'Chargement impossible', 'error');
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', load);
    load();
    return unsubscribe;
  }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    showToast('📄 Génération du PDF...', 'info');

    const result = await exportDiagnosticsPdf();
    if (!result.success) {
      showToast('❌ ' + (result.error || 'Échec de la génération'), 'error');
      setDownloading(false);
      return;
    }

    try {
      // Sur web, le service a déjà déclenché le téléchargement (pas d'`uri`
      // à partager). Sur natif, on ouvre la feuille de partage système.
      if (result.uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Carnet de diagnostics MediAI',
        });
      }
      showToast('✅ Carnet PDF généré', 'success');
    } catch (e) {
      console.warn('[Carnet] partage PDF :', e);
      showToast('❌ Erreur lors du partage du PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />

      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>📔 Carnet de santé</Text>
            <Text style={styles.subtitle}>{diagnostics.length} diagnostic(s)</Text>
          </View>
          <TouchableOpacity style={styles.pdfBtn} onPress={handleDownloadPdf} disabled={downloading}>
            {downloading
              ? <ActivityIndicator size="small" color={colors.green} />
              : <Text style={styles.pdfBtnText}>📥 PDF</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
        >
          {diagnostics.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📔</Text>
              <Text style={styles.emptyTitle}>Aucun diagnostic dans votre carnet</Text>
              <Text style={styles.emptyText}>Terminez une conversation avec l'assistant IA pour générer votre premier diagnostic.</Text>
            </View>
          ) : (
            diagnostics.map((item) => {
              const pct = item.main_probability != null ? Math.max(0, Math.min(100, Number(item.main_probability))) : null;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('DiagnosticDetail', { id: item.id })}
                >
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.diagnosed_at)}</Text>
                    {item.main_hypothesis && (
                      <View style={styles.mainHypRow}>
                        <Text style={styles.mainHyp}>{item.main_hypothesis}</Text>
                        {pct != null && <Text style={[styles.mainPct, { color: hypColor(pct) }]}>{pct}%</Text>}
                      </View>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 24, paddingBottom: 20, backgroundColor: colors.green, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  pdfBtn: { backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, minWidth: 74, alignItems: 'center' },
  pdfBtnText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDate: { fontSize: 11, color: colors.muted, marginTop: 3 },
  mainHypRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  mainHyp: { fontSize: 13, fontWeight: '600', color: colors.text },
  mainPct: { fontSize: 13, fontWeight: '800' },
  chevron: { fontSize: 26, color: colors.muted, marginLeft: 10 },
});
