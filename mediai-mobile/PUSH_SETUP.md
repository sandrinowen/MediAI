# Configuration des notifications push (Expo Push + FCM)

> ⚠️ Rappel : **rien de tout ceci ne touche à ta base MySQL.** FCM est seulement
> le canal de livraison imposé par Google pour délivrer une notification à un
> téléphone Android quand l'app est fermée. Aucune donnée n'est stockée chez Google.
>
> Le backend continue d'envoyer via **Expo Push** (`exp.host`) — voir
> `backend-app/app/Services/PushNotificationService.php`. FCM ne sert qu'au
> « dernier kilomètre » entre Expo et l'appareil.

Ces étapes se font avec TON compte Google + TON compte Expo (je ne peux pas les
faire à ta place). Suis-les dans l'ordre.

---

## 1. Créer un projet Firebase + l'app Android

1. Va sur https://console.firebase.google.com/ → **Ajouter un projet** (nom libre, ex. `mediai`).
2. Dans le projet → icône Android pour **ajouter une application Android**.
3. **Nom du package Android** : `com.mediai.mobile` (⚠️ doit correspondre EXACTEMENT à `android.package` dans `app.json`).
4. Télécharge le fichier **`google-services.json`** proposé.
5. Place-le à la racine du dossier mobile :
   ```
   mediai-mobile/google-services.json
   ```
   (C'est le chemin déjà déclaré dans `app.json` → `android.googleServicesFile`.)

> `google-services.json` contient des identifiants de projet — ajoute-le à `.gitignore`
> si le repo est public.

---

## 2. Récupérer la clé serveur FCM et la donner à Expo

Expo doit pouvoir parler à FCM en ton nom (FCM V1).

1. Firebase Console → ⚙️ **Paramètres du projet** → onglet **Comptes de service**.
2. Clique **Générer une nouvelle clé privée** → un fichier `.json` est téléchargé.
3. Donne cette clé à Expo :
   ```bash
   cd mediai-mobile
   npx eas credentials
   ```
   - Plateforme : **Android**
   - Choisis **Google Service Account** → **FCM V1** → uploade le `.json` de l'étape 2.

   (Alternative UI : https://expo.dev → ton projet → **Credentials** → Android → FCM V1.)

---

## 3. Lier l'app à un projet EAS (pour obtenir le projectId)

`getExpoPushTokenAsync` a besoin d'un `projectId` EAS hors Expo Go.

```bash
cd mediai-mobile
npx eas init
```

Cela crée le projet côté Expo et écrit automatiquement `extra.eas.projectId`
dans `app.json`. Le code (`src/services/notificationService.js` → `getProjectId()`)
le lit déjà.

Si tu préfères le faire à la main, ajoute dans `app.json` sous `expo` :
```json
"extra": { "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" } },
"owner": "<ton-compte-expo>"
```

---

## 4. Rebuild natif

Le `google-services.json` n'est intégré qu'au build natif (pas de hot-reload) :

```bash
cd mediai-mobile
npx expo run:android
```

---

## 5. Tester

1. Lance l'app sur un **appareil physique** (les push ne marchent pas sur émulateur).
2. Connecte-toi : au login, `registerForPushNotifications()` envoie le token à
   `PUT /api/user/push-token` (stocké en MySQL, colonne `users.expo_push_token`).
3. Vérifie en base :
   ```sql
   SELECT id, email, expo_push_token FROM users WHERE expo_push_token IS NOT NULL;
   ```
4. Test rapide d'envoi via l'outil Expo :
   https://expo.dev/notifications — colle le `ExponentPushToken[...]` et envoie.
5. Test bout-en-bout : prends/valide un RDV → le backend appelle Expo Push
   (`PushNotificationService::send`) → notification reçue.

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `Default FirebaseApp is not initialized` | `google-services.json` absent ou mauvais package → refais étape 1, puis rebuild. |
| `getExpoPushTokenAsync` échoue / pas de projectId | Étape 3 non faite (`eas init`). |
| Token obtenu mais aucune notif reçue | Clé FCM V1 non uploadée à Expo (étape 2). |
| Notif reçue en foreground mais pas app fermée | Problème FCM (étape 2), pas le code JS. |
| `DeviceNotRegistered` dans les logs Laravel | Token périmé : l'app en régénère un au prochain login. |
