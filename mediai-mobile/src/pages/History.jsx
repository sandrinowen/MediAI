// src/pages/History.jsx
// Liste simple des diagnostics de l'utilisateur (carnet — vue historique).
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { colors } from '../styles/globalStyles';
import { getDiagnostics } from '../services/diagnosticService';

const hypColor = (pct) => (pct > 60 ? colors.greenLight : pct >= 30 ? colors.yellow : colors.warn);

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return `Aujourd'hui, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Hier, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function History({ navigation }) {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await getDiagnostics();
    if (result.success) setDiagnostics(result.data);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <Text style={styles.title}>📋 Historique</Text>
        <Text style={styles.subtitle}>{diagnostics.length} diagnostic(s)</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
        >
          {diagnostics.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Aucun diagnostic</Text>
              <Text style={styles.emptyText}>Terminez une conversation avec l'assistant IA pour voir vos diagnostics ici.</Text>
            </View>
          ) : (
            diagnostics.map((item) => {
              const pct = item.main_probability != null ? Math.max(0, Math.min(100, Number(item.main_probability))) : null;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.item}
                  onPress={() => navigation.navigate('DiagnosticDetail', { id: item.id })}
                >
                  <View style={styles.itemTop}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.status}>✅</Text>
                  </View>
                  <Text style={styles.itemDate}>{formatDate(item.diagnosed_at)}</Text>
                  {item.main_hypothesis && (
                    <View style={styles.hypRow}>
                      <Text style={styles.hyp}>{item.main_hypothesis}</Text>
                      {pct != null && <Text style={[styles.pct, { color: hypColor(pct) }]}>{pct}%</Text>}
                    </View>
                  )}
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
  title: { fontSize: 20, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  item: { backgroundColor: colors.white, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, marginRight: 8 },
  status: { fontSize: 14 },
  itemDate: { fontSize: 11, color: colors.muted, marginTop: 3 },
  hypRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  hyp: { fontSize: 13, fontWeight: '600', color: colors.text },
  pct: { fontSize: 13, fontWeight: '800' },
});
