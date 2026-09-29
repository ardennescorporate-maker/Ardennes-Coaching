#!/usr/bin/env bash
# One-time setup of a Docker-free Supabase stand-in for development.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$ROOT/.dev-supabase/bin"
mkdir -p "$BIN"

if [ ! -x "$BIN/postgrest" ]; then
  curl -sSL https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz | tar xJ -C "$BIN"
fi
if [ ! -x "$BIN/auth" ]; then
  curl -sSL https://github.com/supabase/auth/releases/download/v2.180.0/auth-v2.180.0-x86.tar.gz | tar xz -C "$BIN"
fi

DB_PASS="${DB_PASS:-postgres}"
PSQL="psql -v ON_ERROR_STOP=1 -h localhost -U postgres"
export PGPASSWORD="$DB_PASS"

# Superuser password (local cluster), database and Supabase roles.
sudo -u postgres psql -qc "alter user postgres password '$DB_PASS';" 2>/dev/null || true
$PSQL -tc "select 1 from pg_database where datname='studypilot'" | grep -q 1 || $PSQL -c "create database studypilot"
$PSQL -d studypilot -f "$ROOT/scripts/dev-supabase/roles.sql"

# JWT secret + anon/service keys.
if [ ! -f "$ROOT/.dev-supabase/secret" ]; then
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > "$ROOT/.dev-supabase/secret"
fi
SECRET="$(cat "$ROOT/.dev-supabase/secret")"
ANON="$(node "$ROOT/scripts/dev-supabase/jwt.mjs" "$SECRET" anon)"
SERVICE="$(node "$ROOT/scripts/dev-supabase/jwt.mjs" "$SECRET" service_role)"

if [ ! -f "$ROOT/.env.local" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env.local"
fi
node -e '
const fs=require("fs");const f=process.argv[1];let s=fs.readFileSync(f,"utf8");
const set=(k,v)=>{const re=new RegExp("^"+k+"=.*$","m");s=re.test(s)?s.replace(re,k+"="+v):s+"\n"+k+"="+v;};
set("NEXT_PUBLIC_SUPABASE_URL","http://localhost:54321");
set("NEXT_PUBLIC_SUPABASE_ANON_KEY",process.argv[2]);
set("SUPABASE_SERVICE_ROLE_KEY",process.argv[3]);
set("DATABASE_URL","postgres://postgres:'"$DB_PASS"'@localhost:5432/studypilot");
fs.writeFileSync(f,s);' "$ROOT/.env.local" "$ANON" "$SERVICE"
echo "Dev Supabase ready. Run scripts/dev-supabase/start.sh"
