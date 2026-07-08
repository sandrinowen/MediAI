// app.config.js
// ─────────────────────────────────────────────────────────────
// Config dynamique Expo. Reprend tout le contenu statique d'app.json
// (passé via `config`) et injecte :
//   - le chemin de google-services.json
//   - l'URL de base de l'API (configurable sans toucher au code)
//
// En build EAS, `google-services.json` est fourni par une variable
// d'environnement de type "file" (secret) nommée GOOGLE_SERVICES_JSON :
// EAS la matérialise en fichier et expose son chemin dans process.env.
// En local (expo run:android), on retombe sur le fichier à la racine.
//
// API_BASE_URL : défini via une variable d'env EAS (ou .env local). Permet
// de changer l'adresse du backend sans modifier le code. Fallback :
// backend Render public, pour que les builds APK restent utilisables sans IP locale.
// ─────────────────────────────────────────────────────────────
const DEFAULT_API_BASE_URL = 'https://mediai-backend-s8en.onrender.com/api';

export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
  },
});
