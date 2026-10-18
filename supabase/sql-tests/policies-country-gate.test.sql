-- 12) Ülke yayın kapısı, rıza geri çekme, paylaşılan numara ve kurgusal kayıtlar (yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).

create or replace function pg_temp.prepare_profile(p_id uuid, p_slug text, p_plate int, p_phone text) returns void
language plpgsql as $$
begin
  insert into profiles (id, slug, nickname, birth_date, city_id, bio, moderation_status, whatsapp_phone, whatsapp_consent_at)
  select p_id, p_slug, 'Kapi', '1990-01-01', c.id, 'Sentetik ülke kapısı test profili.', 'approved', p_phone, case when p_phone is null then null else now() end
  from cities c where c.plate = p_plate;
  insert into verification_records (profile_id, type, status, method) values (p_id, 'age', 'approved', 'test');
  insert into profile_consents (profile_id, type, granted_at, method) values (p_id, 'publication', now(), 'test'), (p_id, 'photo_rights', now(), 'test');
  insert into profile_media (profile_id, kind, status, storage_path, public_url, mime_type, width, height, rights_confirmed, ownership_source, moderation, is_cover)
  values (p_id, 'image', 'ready', p_slug || '/1.webp', 'https://x/' || p_slug || '.webp', 'image/webp', 800, 1000, true, 'owner', 'approved', true);
end $$;

select pg_temp.prepare_profile('00000000-0000-0000-0000-0000000000c1', 'kapi-tr', 34, '905321112233');
select pg_temp.prepare_profile('00000000-0000-0000-0000-0000000000c2', 'kapi-nl', 1008, null);
select pg_temp.prepare_profile('00000000-0000-0000-0000-0000000000c3', 'kapi-tr-ayni-numara', 35, '905321112233');

do $$
declare n int;
begin
  -- 12.1 Varsayılan: NL ve DE incelenmedi; konum verisi var diye yayına açılmaz.
  if (select publication_status from countries where code = 'nl') <> 'not_reviewed' then raise exception 'TEST FAILED: NL varsayılanı not_reviewed değil'; end if;
  if public.country_publishable('de') then raise exception 'TEST FAILED: DE onaysız yayına açık'; end if;

  -- 12.2 Onaysız ülkede yayın engellenir.
  begin
    update profiles set status = 'published', published_at = now() where id = '00000000-0000-0000-0000-0000000000c2';
    raise exception 'TEST FAILED: onaysız ülkede (NL) yayın engellenmedi';
  exception when raise_exception then
    if sqlerrm not like 'Yayın engellendi: NL için yayın onayı yok%' then raise; end if;
  end;

  -- 12.3 Kanıtsız veya gözden geçirme tarihsiz "permitted" kararı reddedilir.
  begin
    insert into country_publication_decisions (country_code, status, approver_name, review_due, decided_by)
    values ('nl', 'permitted', 'Biri', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: kanıtsız izin kararı kabul edildi';
  exception when check_violation then null;
  end;
  begin
    insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, decided_by)
    values ('nl', 'permitted', 'Biri', 'REF-1', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: gözden geçirme tarihsiz izin kararı kabul edildi';
  exception when check_violation then null;
  end;

  -- 12.4 Ülke durumu karar kaydı dışında değiştirilemez.
  begin
    update countries set publication_status = 'permitted', review_due = current_date + 10 where code = 'nl';
    raise exception 'TEST FAILED: ülke durumu doğrudan değiştirilebildi';
  exception when raise_exception then
    if sqlerrm not like 'Ülke yayın durumu yalnızca%' then raise; end if;
  end;

  -- 12.5 Paylaşılan numara: aynı numaralı ikinci profil yayınlanamaz.
  update profiles set status = 'published', published_at = now() where id = '00000000-0000-0000-0000-0000000000c1';
  begin
    update profiles set status = 'published', published_at = now() where id = '00000000-0000-0000-0000-0000000000c3';
    raise exception 'TEST FAILED: aynı WhatsApp numaralı ikinci profil yayınlandı';
  exception when raise_exception then
    if sqlerrm not like 'Yayın engellendi: bu WhatsApp numarası%' then raise; end if;
  end;
  if (select whatsapp_phone from profiles_public where id = '00000000-0000-0000-0000-0000000000c1') is distinct from '905321112233' then
    raise exception 'TEST FAILED: tek kullanılan numara kamuya gösterilmiyor';
  end if;

  -- 12.6 Yayındaki profil onaysız ülkeye taşınamaz.
  begin
    update profiles set city_id = (select id from cities where plate = 2002) where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'TEST FAILED: yayındaki profil onaysız ülkeye (DE) taşındı';
  exception when raise_exception then
    if sqlerrm not like 'Yayın engellendi: DE için%' then raise; end if;
  end;
end $$;

-- 12.7 Yetki: anon karar ekleyemez/okuyamaz; MFA'lı moderatör karar ekleyemez; sahip ekleyebilir.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a2', 'mod@test.local');
insert into admins (id, email, display_name, role) values ('00000000-0000-0000-0000-0000000000a2', 'mod@test.local', 'Mod', 'moderator');
set local role anon;
do $$
begin
  begin
    insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by)
    values ('nl', 'permitted', 'Anon', 'REF', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: anon ülke kararı ekleyebildi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from country_publication_decisions;
    raise exception 'TEST FAILED: anon ülke kararlarını okuyabildi';
  exception when insufficient_privilege then null;
  end;
  if has_table_privilege('anon', 'public.profiles_public', 'update') or has_table_privilege('anon', 'public.discovery_profiles', 'insert')
     or has_table_privilege('authenticated', 'public.profile_media_public', 'delete') then
    raise exception 'TEST FAILED: kamu görünümleri salt okunur değil';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
do $$
begin
  begin
    insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by)
    values ('nl', 'permitted', 'Mod', 'REF', current_date + 10, '00000000-0000-0000-0000-0000000000a2');
    raise exception 'TEST FAILED: moderatör ülke kararı ekleyebildi';
  exception when insufficient_privilege then null;
  end;
  begin
    update countries set publication_status = 'permitted' where code = 'nl';
    raise exception 'TEST FAILED: yönetici ülke satırını doğrudan güncelleyebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
-- Sahip başkası adına karar ekleyemez.
do $$
begin
  begin
    insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by)
    values ('nl', 'permitted', 'Sahip', 'REF', current_date + 10, '00000000-0000-0000-0000-0000000000a2');
    raise exception 'TEST FAILED: sahip başkası adına karar ekleyebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('nl', 'permitted', 'Sentetik Hukuk Test', 'TEST-NL-1', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
reset role;

do $$
declare n int;
begin
  -- 12.8 Karar ülke satırına yansır ve denetim kaydı düşer; karar değiştirilemez.
  if not public.country_publishable('nl') then raise exception 'TEST FAILED: sahip kararı NL''yi açmadı'; end if;
  select count(*) into n from audit_logs where action = 'country.publication_decision' and entity_id = 'nl';
  if n <> 1 then raise exception 'TEST FAILED: karar denetim kaydı %', n; end if;
  begin
    update country_publication_decisions set status = 'prohibited' where country_code = 'nl';
    raise exception 'TEST FAILED: karar güncellenebildi';
  exception when raise_exception then if sqlerrm not like 'Ülke yayın kararları%' then raise; end if;
  end;
  begin
    delete from country_publication_decisions where country_code = 'nl';
    raise exception 'TEST FAILED: karar silinebildi';
  exception when raise_exception then if sqlerrm not like 'Ülke yayın kararları%' then raise; end if;
  end;

  -- 12.9 Onaylı ülkede yayın çalışır ve kamuya görünür.
  update profiles set status = 'published', published_at = now() where id = '00000000-0000-0000-0000-0000000000c2';
  select count(*) into n from profiles_public where id = '00000000-0000-0000-0000-0000000000c2';
  if n <> 1 then raise exception 'TEST FAILED: onaylı ülkedeki profil görünmüyor'; end if;
end $$;

-- 12.10 Onay geri çekilince profil arka plan işi olmadan anında kamuya kapanır (durum değişmez).
insert into country_publication_decisions (country_code, status, approver_name, note, decided_by)
values ('nl', 'not_reviewed', 'Sentetik Hukuk Test', 'Onay geri çekildi', '00000000-0000-0000-0000-0000000000a1');
do $$
declare n int;
begin
  select count(*) into n from profiles_public where id = '00000000-0000-0000-0000-0000000000c2';
  if n <> 0 then raise exception 'TEST FAILED: onayı geri çekilen ülkedeki profil kamuya görünüyor'; end if;
  select count(*) into n from discovery_profiles where id = '00000000-0000-0000-0000-0000000000c2';
  if n <> 0 then raise exception 'TEST FAILED: discovery_profiles onaysız ülkeyi gösteriyor'; end if;
  select count(*) into n from profile_media_public where profile_id = '00000000-0000-0000-0000-0000000000c2';
  if n <> 0 then raise exception 'TEST FAILED: onaysız ülkedeki medya kamuya açık'; end if;
  if (select status from profiles where id = '00000000-0000-0000-0000-0000000000c2') <> 'published' then
    raise exception 'TEST FAILED: profil durumu beklenmedik şekilde değişti';
  end if;
end $$;

-- 12.11 Gözden geçirme tarihi geçen onay kendiliğinden kapanır.
insert into country_publication_decisions (country_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('nl', 'permitted', 'Sentetik Hukuk Test', 'TEST-NL-2', current_date - 1, '00000000-0000-0000-0000-0000000000a1');
do $$
begin
  if public.country_publishable('nl') then raise exception 'TEST FAILED: süresi geçmiş onay hâlâ geçerli'; end if;
  if exists (select 1 from profiles_public where id = '00000000-0000-0000-0000-0000000000c2') then
    raise exception 'TEST FAILED: süresi geçmiş onayda profil görünüyor';
  end if;
end $$;

-- 12.12 Yaş doğrulaması geri alınırsa profil kamuya kapanır.
update verification_records set status = 'rejected' where profile_id = '00000000-0000-0000-0000-0000000000c1' and type = 'age';
do $$
begin
  if exists (select 1 from profiles_public where id = '00000000-0000-0000-0000-0000000000c1') then
    raise exception 'TEST FAILED: yaş doğrulaması geri alınan profil kamuya görünüyor';
  end if;
end $$;
update verification_records set status = 'approved' where profile_id = '00000000-0000-0000-0000-0000000000c1' and type = 'age';

-- 12.13 Kurgusal kayıt: onaysız ülkede görünmez; onaylı ülkede iletişim numarası taşımaz ve
-- aynı numarayı kullanan gerçek profilin numarası da gizlenir.
insert into profiles (id, slug, nickname, birth_date, city_id, bio)
select '00000000-0000-0000-0000-0000000000c4', 'kurgu-tr-sahibi', 'Sahip', '1990-01-01', id, 'Sentetik kayıt sahibi profil.' from cities where plate = 6;
insert into example_profiles (id, slug, nickname, birth_date, city_id, bio, whatsapp_phone, contact_authorized_at)
select '00000000-0000-0000-0000-0000000000c4', 'kurgu-kadin-test', 'Kurgu', '1995-01-01', id,
  'Sentetik kurgusal test kaydı, yalnızca test amaçlıdır.', '905321112233', now() from cities where plate = 6;
insert into profiles (id, slug, nickname, birth_date, city_id, bio)
select '00000000-0000-0000-0000-0000000000c5', 'kurgu-nl-sahibi', 'Sahip', '1990-01-01', id, 'Sentetik kayıt sahibi profil.' from cities where plate = 1008;
insert into example_profiles (id, slug, nickname, birth_date, city_id, bio)
select '00000000-0000-0000-0000-0000000000c5', 'kurgu-kadin-nl', 'Kurgu NL', '1995-01-01', id,
  'Sentetik kurgusal test kaydı, yalnızca test amaçlıdır.' from cities where plate = 1008;
do $$
begin
  if (select whatsapp_phone from discovery_profiles where id = '00000000-0000-0000-0000-0000000000c4') is not null then
    raise exception 'TEST FAILED: kurgusal kayıt iletişim numarası taşıyor';
  end if;
  if exists (select 1 from discovery_profiles where id = '00000000-0000-0000-0000-0000000000c5') then
    raise exception 'TEST FAILED: onaysız ülkedeki kurgusal kayıt görünüyor';
  end if;
  if (select whatsapp_phone from profiles_public where id = '00000000-0000-0000-0000-0000000000c1') is not null then
    raise exception 'TEST FAILED: kurgusal kayıtla paylaşılan numara gerçek profilde gösteriliyor';
  end if;
end $$;

-- 12.14 "prohibited" kararı ülkeyi kapalı tutar (kanıt zorunlu değil, sorumlu kişi zorunlu).
insert into country_publication_decisions (country_code, status, approver_name, note, decided_by)
values ('de', 'prohibited', 'Sentetik Hukuk Test', 'Yasak kararı', '00000000-0000-0000-0000-0000000000a1');
do $$
begin
  if (select publication_status from countries where code = 'de') <> 'prohibited' then raise exception 'TEST FAILED: DE yasak kararı yansımadı'; end if;
  if public.country_publishable('de') then raise exception 'TEST FAILED: yasak ülke yayına açık'; end if;
  begin
    insert into country_publication_decisions (country_code, status, approver_name, decided_by) values ('de', 'prohibited', '', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: sorumlu kişisiz karar kabul edildi';
  exception when check_violation then null;
  end;
end $$;
