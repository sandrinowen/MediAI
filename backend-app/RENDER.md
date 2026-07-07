# Deploying MediAI Backend on Render

This backend is prepared for a Render Docker web service with Render-managed PostgreSQL.

## Before Deploying

1. Push `render.yaml`, `backend-app/Dockerfile`, and `backend-app/docker/render-entrypoint.sh` to GitHub.
2. In Render, create a new Blueprint from the `sandrinowen/MediAI` repository.
3. Keep the service branch as `backend-app`.
4. Fill the secret environment variables requested by Render.

## Required Secret Variables

- `APP_KEY`: copy the value from your local `backend-app/.env`.
- `MAIL_USERNAME`: your SMTP username.
- `MAIL_PASSWORD`: your SMTP password.
- `MAIL_FROM_ADDRESS`: the sender email address.
- `HUGGINGFACE_API_TOKEN`: your Hugging Face token.
- `GOOGLE_CLIENT_IDS`: optional comma-separated Google OAuth client IDs, if Google login is enabled.

## Notes

- Render runs `php artisan migrate --force` at container startup.
- The Docker image uses PostgreSQL through `DB_CONNECTION=pgsql` and `DB_URL`.
- The Blueprint uses Render free plans by default; free Render Postgres is currently limited to 30 days, so use `basic-256mb` or higher for longer-lived data.
- Logs go to Render logs through `LOG_CHANNEL=stderr`.
- `QUEUE_CONNECTION=sync` avoids needing a separate queue worker for the current app.
- Native mobile apps do not need browser CORS. If you deploy a web frontend later, add its origin to `CORS_ALLOWED_ORIGINS`.
