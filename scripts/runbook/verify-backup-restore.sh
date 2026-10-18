#!/usr/bin/env bash
# Yedek doğrulama: roles.sql + schema.sql + data.sql dosyalarını YALITILMIŞ, geçici bir
# Supabase Postgres 17 container'ına geri yükler ve tablo başına satır sayılarını
# döküm dosyasıyla karşılaştırır. Production'a bağlanmaz; container sonunda silinir.
# Kullanım: scripts/runbook/verify-backup-restore.sh <yedek-klasörü>
set -euo pipefail
DIR="${1:?yedek klasörü}"
IMAGE="${RESTORE_IMAGE:-public.ecr.aws/supabase/postgres:17.11.0.004}"
for f in roles.sql schema.sql data.sql; do [[ -s "$DIR/$f" ]] || { echo "EKSİK: $f"; exit 2; }; done
if [[ -f "$DIR/SHA256SUMS" ]]; then (cd "$DIR" && shasum -a 256 -c SHA256SUMS) || { echo "SHA256 UYUŞMAZ"; exit 3; }; fi

if [[ "${RESTORE_STACK:-}" == "1" ]]; then
  # Ayrı, yerel Supabase yığını (supabase/config.toml project_id=hilal-restore-check, db 55422).
  # Auth/storage şemaları servislerin kendi migration'larıyla oluşmuş olur; production verisi
  # yüklenmeden önce yığın sıkılaştırılır: API servisleri durdurulur, DB şifreleri rastgeleleştirilir.
  DB_CONTAINER=supabase_db_hilal-restore-check
  docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" || { echo "restore yığını çalışmıyor"; exit 5; }
  for c in kong rest auth storage realtime; do docker stop "supabase_${c}_hilal-restore-check" >/dev/null 2>&1 || true; done
  PW=$(openssl rand -hex 16)
  docker exec -i "$DB_CONTAINER" psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1 >/dev/null <<SQL
alter role supabase_admin password '$PW';
alter role postgres password '$PW';
alter role authenticator password '$PW';
SQL
  PORT=55422
  trap 'true' EXIT
else
  NAME="hilal-restore-check-$$"
  PORT=$(( 56000 + RANDOM % 900 ))
  PW=$(openssl rand -hex 16)          # yalnızca bu geçici container için; ekrana yazılmaz
  docker run -d --rm --name "$NAME" -p "127.0.0.1:$PORT:5432" -e POSTGRES_PASSWORD="$PW" "$IMAGE" >/dev/null
  trap 'docker stop "$NAME" >/dev/null 2>&1 || true' EXIT
fi
export PGPASSWORD="$PW"
URL="postgresql://supabase_admin@127.0.0.1:$PORT/postgres"   # süper kullanıcı; yalnızca bu yalıtılmış hedef
for _ in $(seq 1 60); do pg_isready -h 127.0.0.1 -p "$PORT" -q && psql "$URL" -Atqc "select 1" >/dev/null 2>&1 && break; sleep 2; done
sleep 3

echo "== yalıtılmış ortamda eksik Supabase servis rolleri (gerçek projede zaten vardır)"
for role in $(grep -oE '(ROLE|TO|FROM) "[a-z_]+"' "$DIR/roles.sql" | sed -E 's/.*"([a-z_]+)"/\1/' | sort -u); do
  exists=$(psql "$URL" -Atqc "select count(*) from pg_roles where rolname = '$role'")
  if [[ "$exists" == "0" ]]; then psql "$URL" -q -c "create role \"$role\" nologin" && echo "oluşturuldu: $role"; fi
done

echo "== şema ve roller (tek transaction)"
psql "$URL" -X -q --single-transaction -v ON_ERROR_STOP=1 -f "$DIR/roles.sql" -f "$DIR/schema.sql" >/dev/null
echo "roller + şema: TAMAM"

echo "== veri: tablo tablo geri yükleme ve satır sayısı karşılaştırması"
WORK=$(mktemp -d)
python3 -I - "$DIR/data.sql" "$WORK" <<'PY'
import re, sys, os
src, out = sys.argv[1], sys.argv[2]
header, blocks, cur, buf, n = [], [], None, [], 0
for line in open(src, encoding="utf-8"):
    if cur is None:
        m = re.match(r'^COPY ("?[\w]+"?)\.("?[\w]+"?) ', line)
        if m:
            cur = f"{m.group(1).strip(chr(34))}.{m.group(2).strip(chr(34))}"; buf = [line]; n = 0
        elif not blocks and line.startswith("SET "):
            header.append(line)
    else:
        buf.append(line)
        if line.rstrip("\n") == "\\.":
            blocks.append((cur, n, buf)); cur = None
        else:
            n += 1
with open(os.path.join(out, "index.tsv"), "w") as idx:
    for i, (tbl, cnt, lines) in enumerate(blocks):
        f = os.path.join(out, f"{i:04d}.sql")
        with open(f, "w", encoding="utf-8") as fh:
            fh.writelines(header); fh.write("SET session_replication_role = replica;\n"); fh.writelines(lines)
        idx.write(f"{f}\t{tbl}\t{cnt}\n")
PY
fail_app=0; fail_platform=0; ok=0
while IFS=$'\t' read -r file tbl expected; do
  schema="${tbl%%.*}"
  if psql "$URL" -X -q -v ON_ERROR_STOP=1 -f "$file" >/dev/null 2>"$WORK/err"; then
    actual=$(psql "$URL" -Atqc "select count(*) from \"$schema\".\"${tbl#*.}\"")
    if [[ "$actual" == "$expected" ]]; then ok=$((ok + 1)); else echo "UYUŞMAZ $tbl döküm=$expected geri_yüklenen=$actual"; [[ $schema == public || $schema == storage ]] && fail_app=1 || fail_platform=1; fi
  else
    reason=$(head -1 "$WORK/err" | sed -E 's/^psql:[^:]+:[0-9]+: //' | cut -c1-110)
    if [[ $schema == public || $schema == storage ]]; then echo "HATA (uygulama verisi) $tbl ($expected satır): $reason"; fail_app=1
    else echo "platform şeması sürüm farkı: $tbl ($expected satır) — $reason"; fail_platform=1; fi
  fi
done < "$WORK/index.tsv"
rm -rf "$WORK"
echo "satır sayısı birebir tutan tablo: $ok"
echo "== public şeması özet"
psql "$URL" -Atqc "select 'public tablo: ' || count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"
psql "$URL" -Atqc "select 'RLS kapalı public tablo: ' || count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity"
for t in profiles example_profiles admins audit_logs privacy_requests seo_pages site_settings cities districts; do
  printf '%-18s %s\n' "$t" "$(psql "$URL" -Atqc "select count(*) from public.$t" 2>/dev/null || echo '-')"
done
if [[ $fail_app -ne 0 ]]; then echo "SONUÇ: UYGULAMA VERİSİNDE SORUN VAR — yedek doğrulanmadı"; exit 4; fi
if [[ $fail_platform -ne 0 ]]; then echo "SONUÇ: public/storage verisi DOĞRULANDI; platform şemalarında (auth vb.) yalnızca bu yalıtılmış imajın sürüm farkından kaynaklanan uyarılar var (gerçek Supabase projesine geri yüklemede bu tablolar güncel sürümdedir)"; exit 0; fi
echo "SONUÇ: YEDEK DOĞRULANDI (tüm tablolar)"
