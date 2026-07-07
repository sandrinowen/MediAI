// src/utils/download.js
// ─────────────────────────────────────────────────────────────
// Variante NATIVE des helpers de téléchargement. Sur mobile, l'export
// passe par expo-file-system + expo-sharing directement dans les écrans ;
// ces helpers ne sont donc jamais appelés. Ce fichier existe uniquement
// pour que l'import extensionless '../utils/download' se résolve aussi
// sur natif (la vraie implémentation web est dans download.web.js).
// ─────────────────────────────────────────────────────────────

export function downloadBlob() {
  throw new Error('downloadBlob() est réservé à la plateforme web.');
}

export function downloadBase64() {
  throw new Error('downloadBase64() est réservé à la plateforme web.');
}
