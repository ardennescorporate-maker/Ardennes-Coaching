#!/usr/bin/env bash
# Applies supabase/migrations/*.sql in order (once each), then supabase/seed.sql on first run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="$1"
P="psql -q -v ON_ERROR_STOP=1 $DB"
$P -c "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, applied_at timestamptz default now())"
fresh=$($P -tAc "select count(*) from supabase_migrations.schema_migrations")
shopt -s nullglob
for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  if [ -z "$($P -tAc "select 1 from supabase_migrations.schema_migrations where version='$v'")" ]; then
    echo "migrate: $v"
    $P -1 -f "$f"
    $P -c "insert into supabase_migrations.schema_migrations(version) values ('$v')"
  fi
done
if [ "$fresh" = "0" ] && [ -f "$ROOT/supabase/seed.sql" ]; then
  echo "seed: supabase/seed.sql"
  $P -1 -f "$ROOT/supabase/seed.sql"
fi
$P -c "notify pgrst, 'reload schema'"
