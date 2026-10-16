-- Yayın kuralları ve RLS için SQL testleri (yalnızca sentetik veri).
-- Çalıştırma: npm run test:db
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local');
insert into admins (id, email, display_name, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', 'Test', 'owner');

insert into profiles (id, slug, nickname, birth_date, city_id, bio, created_by, moderation_status)
select '00000000-0000-0000-0000-0000000000b1', 'test-profil', 'Test', '1995-05-05', id,
  'Sentetik test profili, yalnızca test amaçlıdır.', '00000000-0000-0000-0000-0000000000a1', 'approved'
from cities where plate = 34;

-- 1) Ön koşullar yokken yayın engellenmeli
do $$
begin
  begin
    update profiles set status = 'published' where id = '00000000-0000-0000-0000-0000000000b1';
    raise exception 'TEST FAILED: yetkisiz yayın engellenmedi';
  exception when raise_exception then
    if sqlerrm not like 'Yayın engellendi%' then raise; end if;
  end;
end $$;

-- 2) Ön koşullar tamamlanınca yayın başarılı olmalı
insert into verification_records (profile_id, type, status, method) values
  ('00000000-0000-0000-0000-0000000000b1', 'age', 'approved', 'test');
insert into profile_consents (profile_id, type, granted_at, method) values
  ('00000000-0000-0000-0000-0000000000b1', 'publication', now(), 'test'),
  ('00000000-0000-0000-0000-0000000000b1', 'photo_rights', now(), 'test');
-- Hak kaydı olmadan medya onaylanamaz
do $$
begin
  begin
    insert into profile_media (profile_id, kind, status, storage_path, mime_type, width, height, moderation)
    values ('00000000-0000-0000-0000-0000000000b1', 'image', 'ready', 't/x.webp', 'image/webp', 800, 1000, 'approved');
    raise exception 'TEST FAILED: hak kaydı olmayan medya onaylandı';
  exception when check_violation then null;
  end;
end $$;
insert into profile_media (profile_id, kind, status, storage_path, public_url, mime_type, width, height, rights_confirmed, ownership_source, moderation, is_cover) values
  ('00000000-0000-0000-0000-0000000000b1', 'image', 'ready', 't/1.webp', 'https://x/1.webp', 'image/webp', 800, 1000, true, 'owner', 'approved', true),
  ('00000000-0000-0000-0000-0000000000b1', 'image', 'ready', 't/2.webp', null, 'image/webp', 800, 1000, false, null, 'pending', false);
update profiles set status = 'published', published_at = now() where id = '00000000-0000-0000-0000-0000000000b1';

-- 3) 18 yaş altı profil yayınlanamamalı
insert into profiles (id, slug, nickname, birth_date, city_id, bio, moderation_status)
select '00000000-0000-0000-0000-0000000000b2', 'genc-profil', 'Genc', (current_date - interval '17 years')::date, id,
  'Sentetik test profili, yalnızca test amaçlıdır.', 'approved'
from cities where plate = 6;
do $$
begin
  begin
    update profiles set status = 'published' where id = '00000000-0000-0000-0000-0000000000b2';
    raise exception 'TEST FAILED: 18 yaş altı yayın engellenmedi';
  exception when raise_exception then
    if sqlerrm not like 'Yayın engellendi: profil sahibi 18%' then raise; end if;
  end;
end $$;

-- 4) anon: profiles tablosuna erişemez, view üzerinden yalnızca güvenli kolonları görür
set local role anon;
do $$
declare n int;
begin
  begin
    perform 1 from profiles limit 1;
    raise exception 'TEST FAILED: anon profiles tablosunu okuyabildi';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from profiles_public;
  if n <> 1 then raise exception 'TEST FAILED: profiles_public % satır döndürdü', n; end if;
  select count(*) into n from profile_media_public;
  if n <> 1 then raise exception 'TEST FAILED: onaysız medya kamuya görünüyor (% satır)', n; end if;
  begin
    perform 1 from profile_media limit 1;
    raise exception 'TEST FAILED: anon profile_media tablosunu okuyabildi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from profile_consents limit 1;
    raise exception 'TEST FAILED: anon rıza kayıtlarını okuyabildi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'profiles_public' and column_name = 'birth_date') then
    raise exception 'TEST FAILED: profiles_public doğum tarihini sızdırıyor';
  end if;
end $$;

-- 5) authenticated ama MFA (aal2) yok → yönetici sayılmaz
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claims', '{"aal":"aal1"}', true);
do $$
declare n int;
begin
  select count(*) into n from profiles;
  if n <> 0 then raise exception 'TEST FAILED: MFA olmadan % profil görüldü', n; end if;
end $$;
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
do $$
declare n int;
begin
  select count(*) into n from profiles;
  if n <> 2 then raise exception 'TEST FAILED: MFA ile yönetici % profil gördü', n; end if;
end $$;
reset role;

-- 6) Denetim kayıtları değiştirilemez
insert into audit_logs (action, entity_type) values ('test', 'test');
do $$
begin
  begin
    update audit_logs set action = 'x';
    raise exception 'TEST FAILED: audit log güncellenebildi';
  exception when raise_exception then
    if sqlerrm not like 'audit_logs%' then raise; end if;
  end;
end $$;

-- 7) Yayın rızası geri alınınca profil otomatik yayından kalkar
update profile_consents set revoked_at = now()
where profile_id = '00000000-0000-0000-0000-0000000000b1' and type = 'publication';
do $$
begin
  if (select status from profiles where id = '00000000-0000-0000-0000-0000000000b1') <> 'unpublished' then
    raise exception 'TEST FAILED: rıza geri alındığında profil yayından kalkmadı';
  end if;
  if exists (select 1 from profiles_public) then
    raise exception 'TEST FAILED: rızası geri alınmış profil kamuya görünüyor';
  end if;
end $$;

-- 8) Medya kullanım izni geri alınınca tüm medya onayı düşer
update profile_consents set revoked_at = now()
where profile_id = '00000000-0000-0000-0000-0000000000b1' and type = 'photo_rights';
do $$
begin
  if exists (select 1 from profile_media where profile_id = '00000000-0000-0000-0000-0000000000b1' and (moderation = 'approved' or public_url is not null)) then
    raise exception 'TEST FAILED: izin geri alındı ama medya hâlâ onaylı/herkese açık';
  end if;
end $$;

select 'ALL DB TESTS PASSED' as result;
rollback;
