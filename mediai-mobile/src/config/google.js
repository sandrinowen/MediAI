// src/config/google.js
// ─────────────────────────────────────────────────────────────
// Configuration Google Sign-In.
//
// WEB_CLIENT_ID = "Client ID OAuth 2.0" de type **Application Web**
// créé dans Google Cloud Console (APIs & Services → Credentials).
// C'est lui qui sert d'« audience » de l'ID token côté backend.
//
// ⚠️ Il faut AUSSI créer un Client ID de type **Android** (avec le
//    nom de package de l'app + l'empreinte SHA-1 du keystore) pour
//    que Google accepte de connecter sur Android. Ce dernier n'a pas
//    besoin d'être référencé ici, mais doit exister dans le projet.
// ─────────────────────────────────────────────────────────────
export const WEB_CLIENT_ID = '440449924719-2acpfkihvv9pum84usu0lfl5f0rkttjd.apps.googleusercontent.com';
