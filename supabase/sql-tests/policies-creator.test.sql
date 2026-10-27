-- 15) Modül C — creator platform (yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'creator1@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'subscriber1@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'other1@test.local');
insert into app_users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'creator1@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'subscriber1@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'other1@test.local');
insert into user_profiles (user_id, handle, display_name, birth_date, country_code, visibility, moderation_status)
select '00000000-0000-0000-0000-0000000000f1', 'creator_bir', 'Creator Bir', '1990-01-01', c.code, 'public', 'approved' from countries c where c.code = 'nl';

insert into creator_accounts (id, user_id, legal_name, country_code)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Test Creator BV', 'nl');

-- 15.1 Onaydan önce user_roles'te creator rolü yok.
do $$
begin
  if exists (select 1 from user_roles where user_id = '00000000-0000-0000-0000-0000000000f1' and role = 'creator') then
    raise exception 'TEST FAILED: onaylanmadan creator rolü eklendi';
  end if;
end $$;

update creator_accounts set status = 'active', approved_by = '00000000-0000-0000-0000-0000000000a1', approved_at = now()
where id = '00000000-0000-0000-0000-0000000000c1';

-- 15.2 Onay sonrası tetikleyici creator rolünü ekler.
do $$
begin
  if not exists (select 1 from user_roles where user_id = '00000000-0000-0000-0000-0000000000f1' and role = 'creator') then
    raise exception 'TEST FAILED: onay sonrası creator rolü eklenmedi';
  end if;
end $$;

-- 15.3 RLS: hiç kimse (sahibi dahil) authenticated rolüyle creator_accounts'u güncelleyemez
-- (yalnızca admin onayı/askıya alması, service_role ile — bkz. updateCreatorAccountStatus).
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  begin
    update creator_accounts set legal_name = 'Hacked' where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'TEST FAILED: başka kullanıcı creator hesabını güncelleyebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 15.4 Gönderi: ülke için digital_content henüz izinli değilken onaylı+kamu gönderi bile görünmez.
insert into posts (id, author_id, body, visibility, paid, moderation_status)
values ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000f1', 'Merhaba dünya', 'public', false, 'approved');
do $$
begin
  if exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e8') then
    raise exception 'TEST FAILED: digital_content izinli değilken gönderi kamuya görünüyor';
  end if;
end $$;

insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('nl', 'digital_content', 'permitted', 'Sentetik Hukuk Test', 'TEST-CREATOR-1', current_date + 30, '00000000-0000-0000-0000-0000000000a1');

-- 15.5 İzin verildikten sonra ücretsiz gönderi kamuya görünür.
do $$
begin
  if not exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e8') then
    raise exception 'TEST FAILED: tüm koşullar sağlandığında ücretsiz gönderi görünmüyor';
  end if;
end $$;

-- 15.6 Ücretli gönderi: ekli medyanın incelenmiş hak kaydı olmadan asla görünmez.
insert into media_assets (id, owner_id, storage_path, url, kind, status)
values ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000f1', 'user-media/f1/m1.webp', 'https://example.test/m1.webp', 'image', 'ready');
insert into posts (id, author_id, body, visibility, paid, moderation_status)
values ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000f1', 'Ücretli içerik', 'public', true, 'approved');
insert into post_media (post_id, media_asset_id) values ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e9');

do $$
begin
  if exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e7') then
    raise exception 'TEST FAILED: hak kaydı yokken ücretli gönderi görünüyor';
  end if;
end $$;

insert into content_rights (media_asset_id, rights_type) values ('00000000-0000-0000-0000-0000000000e9', 'self_generated');
do $$
begin
  if exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e7') then
    raise exception 'TEST FAILED: hak kaydı incelenmemişken ücretli gönderi görünüyor';
  end if;
end $$;

update content_rights set reviewed_by = '00000000-0000-0000-0000-0000000000a1', reviewed_at = now() where media_asset_id = '00000000-0000-0000-0000-0000000000e9';
do $$
begin
  if not exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e7') then
    raise exception 'TEST FAILED: hak kaydı incelendikten sonra ücretli gönderi hâlâ görünmüyor';
  end if;
end $$;

-- Phase 5 düzeltmesi: creator_subscription_tiers RLS'i artık paid_subscriptions'ın bu ülkede
-- izinli olmasını da şart koşuyor (bkz. 20261027000007 migration) — bu test dosyasındaki
-- sonraki görünürlük testlerinin anlamlı olması için önce izin verilir.
insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('nl', 'paid_subscriptions', 'permitted', 'Sentetik Hukuk Test', 'TEST-CREATOR-2', current_date + 30, '00000000-0000-0000-0000-0000000000a1');

-- 15.7 Abonelik tier'ı: yalnızca aktif (active=true) planlar herkese açık okunur.
insert into creator_subscription_tiers (id, creator_id, name, price_amount, price_currency, active)
values
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000c1', 'Aktif Plan', 9.99, 'try', true),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000c1', 'Pasif Plan', 4.99, 'try', false);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
do $$
begin
  if not exists (select 1 from creator_subscription_tiers where id = '00000000-0000-0000-0000-0000000000e6') then
    raise exception 'TEST FAILED: aktif plan başka bir kullanıcıya görünmüyor';
  end if;
  if exists (select 1 from creator_subscription_tiers where id = '00000000-0000-0000-0000-0000000000e5') then
    raise exception 'TEST FAILED: pasif plan başka bir kullanıcıya görünüyor';
  end if;
end $$;
reset role;

-- 15.8 Abonelik kaydı: yalnızca abone ve creator kendi ilgili kayıtlarını görür (gerçek satın
-- alma yolu yoktur — bu satır yalnızca RLS testinin service_role ile seed'idir, bkz. domain/creator.ts).
insert into creator_subscriptions (id, subscriber_id, tier_id, status, starts_at, ends_at)
values ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e6', 'active', now(), now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if exists (select 1 from creator_subscriptions where id = '00000000-0000-0000-0000-0000000000e4') then
    raise exception 'TEST FAILED: ilgisiz kullanıcı başkasının aboneliğini görebiliyor';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
do $$
begin
  if not exists (select 1 from creator_subscriptions where id = '00000000-0000-0000-0000-0000000000e4') then
    raise exception 'TEST FAILED: abone kendi aboneliğini göremiyor';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
begin
  if not exists (select 1 from creator_subscriptions where id = '00000000-0000-0000-0000-0000000000e4') then
    raise exception 'TEST FAILED: creator kendi tier''ının aboneliğini göremiyor';
  end if;
end $$;
reset role;
