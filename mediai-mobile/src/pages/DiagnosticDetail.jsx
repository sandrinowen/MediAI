// src/pages/DiagnosticDetail.jsx
// Page complète d'un diagnostic (carnet de santé).
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../styles/globalStyles';
import { getDiagnosticById } from '../services/diagnosticService';

const hypColor = (pct) => (pct > 60 ? colors.greenLight : pct >= 30 ? colors.yellow : colors.warn);

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DiagnosticDetail({ navigation, route }) {
  const id = route?.params?.id;
  const [diagnostic, setDiagnostic] = useState(route?.params?.diagnostic || null);
  const [loading, setLoading] = useState(!route?.params?.diagnostic);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      const result = await getDiagnosticById(id);
      if (!active) return;
      if (result.success) setDiagnostic(result.data);
      else setError(result.error);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  const hypotheses = Array.isArray(diagnostic?.hypotheses) ? diagnostic.hypotheses : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ height: 34 }} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{diagnostic?.title || 'Diagnostic'}</Text>
        <Text style={styles.subtitle}>
          {diagnostic ? formatDate(diagnostic.diagnosed_at || diagnostic.created_at) : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.green} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : !diagnostic ? (
        <View style={styles.center}><Text style={styles.errorText}>Diagnostic introuvable.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Section title="Symptômes décrits">
            <Text style={styles.text}>{diagnostic.symptoms_summary || 'Non renseignés.'}</Text>
          </Section>

          <Section title="Hypothèses diagnostiques">
            {hypotheses.length === 0 ? (
              <Text style={styles.text}>Aucune hypothèse fournie.</Text>
            ) : (
              hypotheses.map((h, index) => {
                const pct = Math.max(0, Math.min(100, Number(h.probability) || 0));
                return (
                  <View key={`${h.name}-${index}`} style={styles.hyp}>
                    <View style={styles.hypHead}>
                      <Text style={styles.hypName}>{h.name}</Text>
                      <Text style={[styles.hypPct, { color: hypColor(pct) }]}>{pct}%</Text>
                    </View>
                    <View style={styles.hypBarBg}>
                      <View style={[styles.hypBarFill, { width: `${pct}%`, backgroundColor: hypColor(pct) }]} />
                    </View>
                    {!!h.description && <Text style={styles.hypDesc}>{h.description}</Text>}
                  </View>
                );
              })
            )}
          </Section>

          <Section title="Examens recommandés">
            <Text style={styles.text}>{diagnostic.recommended_exams || 'Non renseignés.'}</Text>
          </Section>

          <Section title="Traitement recommandé">
            <Text style={styles.text}>{diagnostic.treatment || 'Non renseigné.'}</Text>
          </Section>

          <View style={[styles.section, styles.alarmSection]}>
            <Text style={[styles.sectionTitle, { color: colors.warn }]}>⚠️ Signes d'alarme</Text>
            <Text style={styles.text}>{diagnostic.alarm_signs || 'Aucun signe d\'alarme spécifié.'}</Text>
          </View>

          <Text style={styles.disclaimer}>
            {diagnostic.disclaimer || "MediAI est un outil d'aide — consultez un médecin pour toute décision médicale."}
          </Text>
        </ScrollView>
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: colors.warn, fontSize: 13, textAlign: 'center' },
  section: { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.green, marginBottom: 10 },
  text: { fontSize: 13, color: colors.text, lineHeight: 20 },
  hyp: { marginBottom: 14 },
  hypHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  hypName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 8 },
  hypPct: { fontSize: 13, fontWeight: '800' },
  hypBarBg: { height: 9, backgroundColor: '#eef2ed', borderRadius: 5, overflow: 'hidden' },
  hypBarFill: { height: '100%', borderRadius: 5 },
  hypDesc: { fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 17 },
  alarmSection: { backgroundColor: colors.warnBg, borderColor: '#f5c6b8' },
  disclaimer: { fontSize: 11, fontStyle: 'italic', color: colors.muted, textAlign: 'center', marginTop: 18, marginHorizontal: 24, lineHeight: 16 },
});
