#!/usr/bin/env bash
# Production yedeğini doğrular: ayrı, geçici bir yerel Supabase yığını (project_id
# hilal-restore-check, portlar 554xx) başlatır → sıkılaştırır → yedeği geri yükler →
# tablo bazında satır sayılarını karşılaştırır → yığını VOLUME'LARIYLA siler.
# Production'a bağlanmaz. Kullanım: scripts/runbook/verify-production-backup.sh ~/hilal-backup-2026-10-18
set -euo pipefail
DIR="${1:?yedek klasörü}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SB="$HERE/../../node_modules/.bin/supabase"
cd "$HERE/restore-stack"
cleanup() { "$SB" stop --no-backup >/dev/null 2>&1 || true; }
trap cleanup EXIT
"$SB" stop --no-backup >/dev/null 2>&1 || true
"$SB" start -x studio,postgres-meta,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime >/dev/null
RESTORE_STACK=1 bash "$HERE/verify-backup-restore.sh" "$DIR"
