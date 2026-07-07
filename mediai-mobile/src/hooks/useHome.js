// src/hooks/useHome.js
// ─────────────────────────────────────────────────────────────
// Données de la page d'accueil patient :
//  - recentDiagnostics : 3 derniers diagnostics structurés
//  - appointments      : rendez-vous du patient (avec statut)
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { getRecentDiagnostics } from '../services/diagnosticService';
import { getUserRDV } from '../services/rdvService';

export function useHome({ enabled = true } = {}) {
  const [recentDiagnostics, setRecentDiagnostics] = useState([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(enabled);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(enabled);

  const refreshDiagnostics = useCallback(async () => {
    if (!enabled) return;
    setLoadingDiagnostics(true);
    const result = await getRecentDiagnostics();
    if (result.success) setRecentDiagnostics(result.data);
    setLoadingDiagnostics(false);
  }, [enabled]);

  const refreshAppointments = useCallback(async () => {
    if (!enabled) return;
    setLoadingAppointments(true);
    const result = await getUserRDV();
    if (result.success) setAppointments(result.rdvs);
    setLoadingAppointments(false);
  }, [enabled]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshDiagnostics(), refreshAppointments()]);
  }, [refreshDiagnostics, refreshAppointments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recentDiagnostics,
    loadingDiagnostics,
    refreshDiagnostics,
    appointments,
    loadingAppointments,
    refreshAppointments,
    refresh,
  };
}

export default useHome;
