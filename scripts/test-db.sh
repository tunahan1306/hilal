#!/usr/bin/env bash
# Migration + seed + SQL politika testlerini geçici bir Postgres konteynerinde çalıştırır.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=hilal-dbtest-$$
PORT=${PORT:-55433}
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=pw -p "$PORT:5432" postgres:16-alpine >/dev/null
trap 'docker stop "$NAME" >/dev/null' EXIT
for _ in $(seq 1 30); do pg_isready -h localhost -p "$PORT" -q && break; sleep 1; done
sleep 1
export PGPASSWORD=pw
PSQL="psql -h localhost -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f supabase/sql-tests/supabase-stubs.sql
for f in supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f supabase/seed.sql
$PSQL -f supabase/sql-tests/policies.test.sql
