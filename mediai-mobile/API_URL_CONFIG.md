# Configurer l'URL du backend (API_BASE_URL)

L'app lit l'adresse du backend depuis **une variable de configuration**, pas en dur
dans le code. Tu peux donc changer l'IP sans modifier `api.js`.

## Où c'est défini

| Endroit | Rôle |
|---|---|
| `app.config.js` → `extra.apiBaseUrl` | Injecte la valeur dans l'app (lit `process.env.API_BASE_URL`, sinon fallback). |
| `src/services/api.js` | Lit `Constants.expoConfig.extra.apiBaseUrl`. |
| Variable EAS `API_BASE_URL` | Valeur utilisée lors d'un **build EAS** (profils `preview` et `production`). |
| `DEFAULT_API_BASE_URL` dans `app.config.js` | Fallback si aucune variable n'est fournie. |

## Trouver l'IP actuelle du PC (backend)

```bash
hostname -I | awk '{print $1}'
```

⚠️ Le backend doit tourner sur `0.0.0.0` pour être joignable depuis le téléphone :
```bash
cd ~/MediAI/backend-app
php artisan serve --host=0.0.0.0 --port=8000
```
Le téléphone doit être sur le **même réseau** que le PC.

## Changer l'IP pour un nouveau build EAS

```bash
cd ~/MediAI/mediai-mobile
# Remplace <IP> par la sortie de `hostname -I`
npx eas env:update --environment preview    --name API_BASE_URL --value "http://<IP>:8000/api" --non-interactive
npx eas env:update --environment production  --name API_BASE_URL --value "http://<IP>:8000/api" --non-interactive
# puis rebuild
npx eas build --profile preview --platform android
```

## Changer l'IP en développement local (sans rebuild)

Crée un fichier `.env` à la racine de `mediai-mobile` :
```
API_BASE_URL=http://<IP>:8000/api
```
puis lance `npx expo start`. (Le `.env` n'est lu qu'en local ; ne pas committer.)

## Solution durable (éviter de changer l'IP)

L'IP change à chaque réseau. Pour une adresse stable, envisager :
- déployer le backend sur un serveur/hébergement avec un nom de domaine fixe ;
- un tunnel (ex. `ngrok http 8000`) qui donne une URL publique stable le temps d'une session.
