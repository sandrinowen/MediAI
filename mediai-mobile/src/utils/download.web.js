// src/utils/download.web.js
// ─────────────────────────────────────────────────────────────
// Helpers de téléchargement de fichier côté navigateur (web).
// Metro choisit ce fichier (.web.js) sur le web ; la variante native
// (download.js) n'expose que des stubs jamais appelés sur mobile.
//
// Factorise le patron déjà utilisé dans AdminStatistics.jsx
// (Blob → object URL → <a download> → clic → révocation).
// ─────────────────────────────────────────────────────────────

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Télécharge un Blob (ex. réponse axios `responseType: 'blob'`).
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

// Télécharge un contenu base64 (ex. PDF renvoyé encodé par le backend).
export function downloadBase64(base64, filename, mime = 'application/octet-stream') {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  downloadBlob(new Blob([bytes], { type: mime }), filename);
}
