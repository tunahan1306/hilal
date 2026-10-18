#!/usr/bin/env bash
# Runbook §4 provası — YALNIZCA yerel Supabase (127.0.0.1:54322).
set -uo pipefail
DB=postgresql://postgres:postgres@127.0.0.1:54322/postgres
[[ $DB == *127.0.0.1* ]] || exit 1
q() { psql "$DB" -v ON_ERROR_STOP=1 -X -q -A -t -F ' | ' -c "$1"; }
echo "== §17.5 geri alma"
q "begin;
drop function if exists public.rate_limit_purge(); drop function if exists public.rate_limit_clear(text); drop function if exists public.rate_limit_hit(text, integer, integer); drop table if exists public.rate_limit_buckets;
update public.profile_media set public_paths = '{}' where array_length(public_paths, 1) = 1 and public_paths[1] like 'legacy-profile-images:%';
drop table if exists public.contact_messages; drop type if exists public.contact_status; drop type if exists public.contact_category;
commit;" && echo "geri alma: ok"
echo "== 4.0-A geçmiş (20261023*)"; q "select version from supabase_migrations.schema_migrations where version like '20261023%' order by 1"
echo "== 4.0-B (üç boş bekleniyor)"; q "select to_regclass('public.contact_messages'), to_regclass('public.rate_limit_buckets'), to_regprocedure('public.rate_limit_hit(text,integer,integer)')"
echo "== 4.0-C (≥1,≥1,≥1)"; q "select (select count(*) from pg_extension where extname = 'citext'), (select count(*) from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace), (select count(*) from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace)"
echo "== 4.0-D (0)"; q "select count(*) from public.profile_media where public_url like '%/storage/v1/object/public/profile-images/%' and coalesce(array_length(public_paths, 1), 0) = 0"
for f in 20261023000001_contact_messages 20261023000002_legacy_media_paths 20261023000003_shared_rate_limits; do
  echo "== uygula $f"; { echo "begin;"; cat "supabase/migrations/$f.sql"; echo "commit;"; } | psql "$DB" -v ON_ERROR_STOP=1 -X -q; echo "exit=$?"
done
echo "== 4.1 doğrulama (t | admin all… | f f | 4 | trigger)"
q "select relrowsecurity from pg_class where oid = 'public.contact_messages'::regclass"
q "select polname, polcmd, polroles::regrole[] from pg_policy where polrelid = 'public.contact_messages'::regclass"
q "select has_table_privilege('anon', 'public.contact_messages', 'select'), has_table_privilege('anon', 'public.contact_messages', 'insert')"
q "select count(*) from pg_indexes where schemaname = 'public' and tablename = 'contact_messages'"
q "select tgname from pg_trigger where tgrelid = 'public.contact_messages'::regclass and not tgisinternal"
echo "== 4.2 doğrulama (0)"; q "select count(*) from public.profile_media where public_paths[1] like 'legacy-profile-images:%'"
echo "== 4.3 doğrulama (t | f f f t | t | f | 0)"
q "select relrowsecurity from pg_class where oid = 'public.rate_limit_buckets'::regclass"
q "select has_table_privilege('anon', 'public.rate_limit_buckets', 'select'), has_function_privilege('anon', 'public.rate_limit_hit(text,integer,integer)', 'execute'), has_function_privilege('authenticated', 'public.rate_limit_hit(text,integer,integer)', 'execute'), has_function_privilege('service_role', 'public.rate_limit_hit(text,integer,integer)', 'execute')"
q "select allowed from public.rate_limit_hit('runbook:kontrol', 1, 60)"
q "select allowed from public.rate_limit_hit('runbook:kontrol', 1, 60)"
q "select public.rate_limit_clear('runbook:kontrol')" >/dev/null; q "select count(*) from public.rate_limit_buckets where key like 'runbook:%'"
echo "== 4.4 geçmiş kaydı (3)"
q "insert into supabase_migrations.schema_migrations (version, name) values ('20261023000001', 'contact_messages'), ('20261023000002', 'legacy_media_paths'), ('20261023000003', 'shared_rate_limits') on conflict (version) do nothing"
q "select count(*) from supabase_migrations.schema_migrations where version like '20261023%'"
echo "== tekrar çalıştırma koruması (hata beklenir, değişiklik olmaz)"
{ echo "begin;"; cat supabase/migrations/20261023000001_contact_messages.sql; echo "commit;"; } | psql "$DB" -v ON_ERROR_STOP=1 -X -q 2>&1 | head -1; echo "exit=$?"
