#!/usr/bin/env bash
# main düzeyinden beş migration'ın sıralı provası (20261023000001–03, 20261024000001, 20261025000001) + geri alma.
# Önce: npx supabase db reset --local --version 20261022000001
# Dört yeni migration'ın sıralı provası — YALNIZCA yerel Supabase (127.0.0.1:54322), main düzeyinden başlar.
set -uo pipefail
cd "$(dirname "$0")/../.."
DB=postgresql://postgres:postgres@127.0.0.1:54322/postgres
[[ $DB == *@127.0.0.1:54322/* ]] || exit 1
q() { psql "$DB" -v ON_ERROR_STOP=1 -X -q -A -t -F ' | ' -c "$1"; }
apply() { { echo "begin;"; cat "supabase/migrations/$1.sql"; echo "commit;"; } | psql "$DB" -v ON_ERROR_STOP=1 -X -q; local rc=$?; echo "uygula $1 exit=$rc"; [ $rc = 0 ] && q "insert into supabase_migrations.schema_migrations (version, name) values ('${1%%_*}', '${1#*_}')"; }
echo "== 0. başlangıç (main düzeyi): son sürüm | sayı"; q "select max(version), count(*) from supabase_migrations.schema_migrations"
echo "== 0. sentetik veri (production benzeri: 1 profil, 1 eski + 1 yeni medya)"
q "insert into profiles (id, slug, nickname, birth_date, city_id, bio) values ('00000000-0000-4000-8000-0000000000aa', 'prova-profil', 'Prova', '1990-01-01', (select id from cities where plate=34), 'Sentetik prova verisi.')"
q "insert into profile_media (profile_id, kind, storage_path, public_url, mime_type, width, height, status, moderation, rights_confirmed, rights_confirmed_at, ownership_source) values
 ('00000000-0000-4000-8000-0000000000aa', 'image', 'old/a.webp', 'http://127.0.0.1:54321/storage/v1/object/public/profile-images/old/a.webp', 'image/webp', 10, 10, 'ready', 'approved', true, now(), 'owner'),
 ('00000000-0000-4000-8000-0000000000aa', 'image', 'new/b.webp', 'http://127.0.0.1:54321/storage/v1/object/public/profile-media/new/b.webp', 'image/webp', 10, 10, 'ready', 'approved', true, now(), 'owner')"
echo "== 0. sentetik profil yayında (production benzeri): rıza, doğrulama, onay"
q "insert into verification_records (profile_id, type, method, status) values ('00000000-0000-4000-8000-0000000000aa','age','document','approved')"
q "insert into profile_consents (profile_id, type, granted_at, method) values ('00000000-0000-4000-8000-0000000000aa','publication',now(),'signed'),('00000000-0000-4000-8000-0000000000aa','photo_rights',now(),'signed')"
q "update profiles set moderation_status='approved' where id='00000000-0000-4000-8000-0000000000aa'"
q "update profiles set status='published', published_at=now() where id='00000000-0000-4000-8000-0000000000aa'"
echo "-- yayında ve kamuya açık (1)"; q "select count(*) from profiles_public where slug='prova-profil'"
echo "== 0. ön kontroller (boş | boş | boş) ve eski medya sayısı (1)"
q "select to_regclass('public.contact_messages'), to_regclass('public.rate_limit_buckets'), to_regclass('public.countries')"
q "select count(*) from profile_media where public_url like '%/profile-images/%' and coalesce(array_length(public_paths,1),0)=0"

apply 20261023000001_contact_messages
echo "-- 1 doğrulama: RLS(t) | anon select,insert (f,f) | politika"
q "select relrowsecurity from pg_class where oid='public.contact_messages'::regclass"
q "select has_table_privilege('anon','public.contact_messages','select'), has_table_privilege('anon','public.contact_messages','insert')"
q "select polname from pg_policy where polrelid='public.contact_messages'::regclass"

apply 20261023000002_legacy_media_paths
echo "-- 2 doğrulama: eski medya işaretli (legacy-profile-images:old/a.webp) | yeni medya dokunulmadı ({})"
q "select public_paths from profile_media where storage_path='old/a.webp'"
q "select public_paths from profile_media where storage_path='new/b.webp'"

apply 20261023000003_shared_rate_limits
echo "-- 3 doğrulama: RLS(t) | anon tablo/fonksiyon (f,f) service_role (t) | hit,hit (t,f)"
q "select relrowsecurity from pg_class where oid='public.rate_limit_buckets'::regclass"
q "select has_table_privilege('anon','public.rate_limit_buckets','select'), has_function_privilege('anon','public.rate_limit_hit(text,integer,integer)','execute'), has_function_privilege('service_role','public.rate_limit_hit(text,integer,integer)','execute')"
q "select allowed from public.rate_limit_hit('prova:k',1,60)"; q "select allowed from public.rate_limit_hit('prova:k',1,60)"; q "select public.rate_limit_clear('prova:k')" >/dev/null

apply 20261024000001_multi_country_locations
echo "-- 4 doğrulama: ülke | bölge | yer"
q "select c.country_code, count(distinct c.id), count(d.id) from cities c left join districts d on d.city_id=c.id group by 1 order by 1"
echo "-- 4 doğrulama: mevcut profil TR'de kaldı (tr | istanbul)"; q "select c.country_code, c.slug from profiles p join cities c on c.id=p.city_id where p.slug='prova-profil'"
echo "-- 4 doğrulama: countries RLS(t), anon select(t), anon insert reddi"
q "select relrowsecurity from pg_class where oid='public.countries'::regclass"; q "select has_table_privilege('anon','public.countries','select')"
psql "$DB" -X -q -A -t -c "set role anon; insert into public.countries values ('xx',3000,3999,'a','b','c','d');" 2>&1 | head -1
echo "-- 4 doğrulama: aralık dışı plaka reddi"; psql "$DB" -X -q -A -t -c "insert into cities (plate,name,slug,region,population,lat,lng) values (82,'x','x-prova','x',1,0,0)" 2>&1 | head -1

echo "-- 4 sonrası profil hâlâ kamuya açık (1)"; q "select count(*) from profiles_public where slug='prova-profil'"

apply 20261025000001_country_publication_gate
echo "-- 5 doğrulama: tüm ülkeler not_reviewed | TR kararı yokken yayındaki profil kamuya KAPALI (0) ama durum published"
q "select string_agg(code||'='||publication_status, ' ' order by code) from countries"
q "select count(*) from profiles_public where slug='prova-profil'"; q "select status from profiles where slug='prova-profil'"
echo "-- 5 operatör adımı (prova): TR kararı sorumlu kişi + belge ref + tarih ile → görünür (1)"
q "insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by) values ('tr','permitted','PROVA — gerçek onay değildir','PROVA-REF',current_date+30,'00000000-0000-4000-8000-0000000000ad')"
q "select count(*) from profiles_public where slug='prova-profil'"
echo "-- 5 doğrulama: kanıtsız izin reddi | NL'ye taşıma reddi"
psql "$DB" -X -q -A -t -c "insert into country_publication_decisions (country_code,status,approver_name,review_due,decided_by) values ('nl','permitted','Prova Kisi',current_date+1,'00000000-0000-4000-8000-0000000000ad')" 2>&1 | grep -m1 -o 'violates check constraint "[a-z_]*"'
psql "$DB" -X -q -A -t -c "update profiles set city_id=(select id from cities where plate=1008) where slug='prova-profil'" 2>&1 | grep -m1 -o 'Yayın engellendi: NL[^"]*onayı yok'

echo "== geçmiş kaydı (son sürüm | toplam 12)"; q "select max(version), count(*) from supabase_migrations.schema_migrations"
echo "== tekrar çalıştırma: 1, 3, 4 hata verip işlem geri alınmalı; 2 etkisiz kalmalı"
for f in 20261023000001_contact_messages 20261023000002_legacy_media_paths 20261023000003_shared_rate_limits 20261024000001_multi_country_locations 20261025000001_country_publication_gate; do
  out=$({ echo "begin;"; cat "supabase/migrations/$f.sql"; echo "commit;"; } | psql "$DB" -v ON_ERROR_STOP=1 -X -q 2>&1 | grep -m1 ERROR); echo "$f: ${out:-hata yok (idempotent)}"
done
echo "-- tekrar sonrası: bölge sayısı (109) | yer (1715) | eski medya yolu tek"
q "select (select count(*) from cities), (select count(*) from districts), (select array_length(public_paths,1) from profile_media where storage_path='old/a.webp')"

echo "== 5 tekrar sonrası: profil görünür (1) | karar sayısı (1)"
q "select (select count(*) from profiles_public where slug='prova-profil'), (select count(*) from country_publication_decisions)"
echo "== GERİ ALMA 5"
psql "$DB" -v ON_ERROR_STOP=1 -X -q < docs/rollback/20261025000001_country_publication_gate.rollback.sql; echo "rollback exit=$?"
q "select to_regclass('public.country_publication_decisions') is null, (select count(*) from information_schema.columns where table_name='countries' and column_name='publication_status'), (select count(*) from profiles_public where slug='prova-profil')"
q "select polname from pg_policy where polrelid='public.countries'::regclass order by 1"
echo "== 5 yeniden uygula → kararlar sıfırlandı, profil kapalı (0)"
{ echo "begin;"; cat supabase/migrations/20261025000001_country_publication_gate.sql; echo "commit;"; } | psql "$DB" -v ON_ERROR_STOP=1 -X -q; echo "reapply exit=$?"
q "select count(*) from profiles_public where slug='prova-profil'"
