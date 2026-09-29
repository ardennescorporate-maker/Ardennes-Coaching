#!/usr/bin/env bash
# Starts the Docker-free dev backend and applies migrations + seed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
D="$ROOT/.dev-supabase"
BIN="$D/bin"
SECRET="$(cat "$D/secret")"
export PGPASSWORD="${DB_PASS:-postgres}"
DB="postgres://postgres:$PGPASSWORD@localhost:5432/studypilot"

(pg_lsclusters 2>/dev/null | grep -q online) || pg_ctlcluster 16 main start || true
pkill -f "$BIN/auth" 2>/dev/null || true
pkill -f "$BIN/postgrest" 2>/dev/null || true
pkill -f "dev-supabase/proxy.mjs" 2>/dev/null || true
pkill -f "dev-supabase/mail-sink.mjs" 2>/dev/null || true
sleep 0.5

nohup node "$ROOT/scripts/dev-supabase/mail-sink.mjs" > "$D/mail-sink.log" 2>&1 &
nohup node "$ROOT/scripts/dev-supabase/proxy.mjs" > "$D/proxy.log" 2>&1 &

# GoTrue migrates the auth schema on boot; public migrations reference auth.users, so start it first.
set -a
[ -f "$ROOT/.env.local" ] && . "$ROOT/.env.local"
set +a
T="http://localhost:54321/templates"
GOOGLE_ON=false; [ -n "${GOOGLE_CLIENT_ID:-}" ] && GOOGLE_ON=true
env \
  GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
  GOTRUE_DB_DRIVER=postgres \
  DATABASE_URL="postgres://supabase_auth_admin:postgres@localhost:5432/studypilot?search_path=auth" \
  GOTRUE_SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}" \
  GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**" \
  GOTRUE_JWT_SECRET="$SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated \
  GOTRUE_JWT_ADMIN_ROLES=service_role \
  GOTRUE_DISABLE_SIGNUP=false GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false \
  GOTRUE_MAILER_OTP_EXP=3600 GOTRUE_MAILER_OTP_LENGTH=6 \
  GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=2500 GOTRUE_SMTP_ADMIN_EMAIL=noreply@studypilot.dev \
  GOTRUE_SMTP_SENDER_NAME=StudyPilot GOTRUE_SMTP_MAX_FREQUENCY=1s GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 \
  GOTRUE_MAILER_TEMPLATES_CONFIRMATION="$T/confirmation.html" \
  GOTRUE_MAILER_TEMPLATES_RECOVERY="$T/recovery.html" \
  GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE="$T/email_change.html" \
  GOTRUE_MAILER_TEMPLATES_MAGIC_LINK="$T/magic_link.html" \
  GOTRUE_MAILER_SUBJECTS_CONFIRMATION="Your StudyPilot code" \
  GOTRUE_MAILER_SUBJECTS_RECOVERY="Reset your StudyPilot password" \
  GOTRUE_MFA_TOTP_ENROLL_ENABLED=true GOTRUE_MFA_TOTP_VERIFY_ENABLED=true \
  GOTRUE_EXTERNAL_GOOGLE_ENABLED="$GOOGLE_ON" \
  GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  GOTRUE_EXTERNAL_GOOGLE_SECRET="${GOOGLE_CLIENT_SECRET:-}" \
  GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=http://localhost:54321/auth/v1/callback \
  nohup "$BIN/auth" > "$D/gotrue.log" 2>&1 &

for i in $(seq 1 30); do curl -sf http://127.0.0.1:9999/health >/dev/null && break; sleep 0.5; done

bash "$ROOT/scripts/dev-supabase/migrate.sh" "$DB"

env PGRST_DB_URI="postgres://authenticator:postgres@localhost:5432/studypilot" \
  PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$SECRET" \
  PGRST_SERVER_PORT=3001 PGRST_DB_CHANNEL_ENABLED=true \
  nohup "$BIN/postgrest" > "$D/postgrest.log" 2>&1 &

for i in $(seq 1 30); do curl -sf http://localhost:54321/rest/v1/ -H "apikey: x" >/dev/null 2>&1 && break; sleep 0.5; done
echo "Dev Supabase running at http://localhost:54321 (logs in .dev-supabase/)"
