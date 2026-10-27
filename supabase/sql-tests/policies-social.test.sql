-- 14) Modül B — sosyal platform (yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'sosyal1@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'sosyal2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'sosyal3@test.local');
insert into app_users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'sosyal1@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'sosyal2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'sosyal3@test.local');
insert into user_profiles (user_id, handle, display_name, birth_date, country_code, visibility, moderation_status)
select '00000000-0000-0000-0000-0000000000d1', 'kullanici_bir', 'Kullanıcı Bir', '1990-01-01', c.code, 'public', 'approved' from countries c where c.code = 'nl';
insert into user_profiles (user_id, handle, display_name, birth_date, country_code, visibility, moderation_status)
select '00000000-0000-0000-0000-0000000000d2', 'kullanici_iki', 'Kullanıcı İki', '1990-01-01', c.code, 'public', 'approved' from countries c where c.code = 'nl';

do $$
begin
  -- 14.1 Yaş doğrulaması olmadan onaylı+kamu+ülke-izinli profil bile kamuya görünmez
  --     (sağlayıcı seçilmeden hiçbir sosyal profil yayınlanamaz — bilinçli tasarım kararı).
  if exists (select 1 from user_profiles_public where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'TEST FAILED: yaş doğrulaması olmadan profil kamuya görünüyor';
  end if;
end $$;

-- Ülke özelliği henüz izinli değil (fail-closed); izin ver ve yaş doğrulamasını da ekle.
insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('nl', 'social_profiles', 'permitted', 'Sentetik Hukuk Test', 'TEST-SOCIAL-1', current_date + 30, '00000000-0000-0000-0000-0000000000a1');
insert into age_verification_checks (user_id, provider, provider_ref, status, checked_at)
values ('00000000-0000-0000-0000-0000000000d1', 'test-provider', 'ref-1', 'approved', now());

do $$
begin
  -- 14.2 Yaş doğrulaması VE ülke izni birlikte varken profil kamuya görünür.
  if not exists (select 1 from user_profiles_public where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'TEST FAILED: tüm koşullar sağlandığında profil kamuya görünmüyor';
  end if;
  -- Diğer kullanıcının (d2) yaş doğrulaması yok — hâlâ görünmemeli.
  if exists (select 1 from user_profiles_public where user_id = '00000000-0000-0000-0000-0000000000d2') then
    raise exception 'TEST FAILED: yaş doğrulaması olmayan ikinci kullanıcı görünüyor';
  end if;
end $$;

-- 14.3 Yetki: anon takip/engelleme/mesaj ekleyemez; kullanıcı yalnızca kendi adına işlem yapabilir.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
begin
  begin
    insert into follows (follower_id, followee_id) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1');
    raise exception 'TEST FAILED: kullanıcı başkası adına takip ekleyebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into follows (follower_id, followee_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
do $$
begin
  if not exists (select 1 from follows where follower_id = '00000000-0000-0000-0000-0000000000d1' and followee_id = '00000000-0000-0000-0000-0000000000d2') then
    raise exception 'TEST FAILED: kendi adına eklenen takip görünmüyor';
  end if;
  begin
    insert into follows (follower_id, followee_id) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1');
    raise exception 'TEST FAILED: kendini takip edebildi';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- 14.4 Mesajlaşma: ortak katılımcı olmayan biri mesaj gönderemez; engellenen taraf gönderemez.
insert into conversations (id) values ('00000000-0000-0000-0000-0000000000e1');
insert into conversation_participants (conversation_id, user_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d3', true);
do $$
begin
  begin
    insert into messages (conversation_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d3', 'merhaba');
    raise exception 'TEST FAILED: katılımcı olmayan kullanıcı mesaj gönderebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
insert into messages (conversation_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'merhaba');
reset role;

-- d2, d1'i engelliyor; d1 artık bu konuşmaya mesaj gönderemez (DB tetikleyicisi, RLS'e ek savunma).
insert into user_blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
begin
  begin
    insert into messages (conversation_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'tekrar');
    raise exception 'TEST FAILED: engellenen taraf mesaj gönderebildi';
  exception when raise_exception then
    if sqlerrm not like 'Mesaj engellendi%' then raise; end if;
  end;
end $$;
reset role;

-- 14.5 Bildirim: yalnızca sahibi okur; tür/metin değil yalnızca okundu zamanı değiştirilebilir.
insert into notifications (user_id, type, payload) values ('00000000-0000-0000-0000-0000000000d1', 'new_follower', '{"from": "d2"}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
do $$
begin
  if exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'TEST FAILED: başka kullanıcının bildirimi görülebiliyor';
  end if;
end $$;
reset role;
