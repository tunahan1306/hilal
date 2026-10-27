-- 18) Phase 5 (QA/security) düzeltmeleri — bkz. 20261027000007_phase5_security_fixes.sql ve
-- docs/transformation/05_PHASE5_QA_SECURITY.md. policies.test.sql içinden, aynı işlem içinde
-- çalıştırılır (sonunda rollback). d1 (policies-social.test.sql) ve f1/e7/e8/e9
-- (policies-creator.test.sql) daha önce kurulmuş fikstürleri yeniden kullanır.

-- 18.1 Hesabı askıya alınmış bir kullanıcının zaten tüm koşulları sağlayan profili
-- (d1 — policies-social.test.sql test 14.2'de görünür olduğu doğrulanmıştı) artık kamuya kapanır.
do $$
begin
  if not exists (select 1 from user_profiles_public where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'TEST FAILED: ön koşul bozulmuş — d1 beklenmedik şekilde zaten görünmüyor';
  end if;
end $$;
update app_users set status = 'suspended' where id = '00000000-0000-0000-0000-0000000000d1';
do $$
begin
  if exists (select 1 from user_profiles_public where user_id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'TEST FAILED: askıya alınmış kullanıcının profili hâlâ kamuya açık';
  end if;
end $$;
update app_users set status = 'active' where id = '00000000-0000-0000-0000-0000000000d1';

-- 18.2 Hesabı askıya alınmış bir creator'ın zaten yayındaki gönderisi (e8 — policies-creator.test.sql
-- test 15.5'te görünür olduğu doğrulanmıştı) artık kamuya kapanır.
do $$
begin
  if not exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e8') then
    raise exception 'TEST FAILED: ön koşul bozulmuş — e8 beklenmedik şekilde zaten görünmüyor';
  end if;
end $$;
update app_users set status = 'suspended' where id = '00000000-0000-0000-0000-0000000000f1';
do $$
begin
  if exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e8') then
    raise exception 'TEST FAILED: askıya alınmış yazarın gönderisi hâlâ kamuya açık';
  end if;
end $$;
update app_users set status = 'active' where id = '00000000-0000-0000-0000-0000000000f1';

-- 18.3 Bir medya varlığı tek başına reddedilince, onu taşıyan gönderi (e7 — content_rights zaten
-- incelenmiş ve test 15.6'da görünür olduğu doğrulanmıştı) artık kamuya kapanır.
do $$
begin
  if not exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e7') then
    raise exception 'TEST FAILED: ön koşul bozulmuş — e7 beklenmedik şekilde zaten görünmüyor';
  end if;
end $$;
update media_assets set moderation_status = 'rejected' where id = '00000000-0000-0000-0000-0000000000e9';
do $$
begin
  if exists (select 1 from posts_public where id = '00000000-0000-0000-0000-0000000000e7') then
    raise exception 'TEST FAILED: medyası reddedilen gönderi hâlâ kamuya açık';
  end if;
end $$;
update media_assets set moderation_status = 'approved' where id = '00000000-0000-0000-0000-0000000000e9';

-- 18.4 creator_subscription_tiers RLS: ülkesinde paid_subscriptions izinli OLMAYAN bir creator'ın
-- aktif planı, sahibi/admin dışında kimseye görünmez (eski politika yalnızca active=true'ya
-- bakıyordu ve bu kontrolü hiç uygulamıyordu). Taze fikstür: 'de' için henüz hiçbir
-- paid_subscriptions kararı yok (fail-closed varsayılan).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'creator-de@test.local');
insert into app_users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'creator-de@test.local');
insert into creator_accounts (id, user_id, legal_name, country_code, status)
values ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d4', 'Test Creator DE', 'de', 'active');
insert into creator_subscription_tiers (id, creator_id, name, price_amount, price_currency, active)
values ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000d5', 'DE Plan', 5.00, 'eur', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if exists (select 1 from creator_subscription_tiers where id = '00000000-0000-0000-0000-0000000000d6') then
    raise exception 'TEST FAILED: ülkesinde paid_subscriptions izinli olmayan creator''ın planı görülebiliyor';
  end if;
end $$;
reset role;

-- İzin verilince (ve yalnızca o zaman) görünür hale gelir.
insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('de', 'paid_subscriptions', 'permitted', 'Sentetik Hukuk Test', 'TEST-PHASE5-1', current_date + 30, '00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if not exists (select 1 from creator_subscription_tiers where id = '00000000-0000-0000-0000-0000000000d6') then
    raise exception 'TEST FAILED: ülke izni verildikten sonra plan hâlâ görünmüyor';
  end if;
end $$;
reset role;

-- Creator hesabı askıya alınınca ülke izni olsa bile plan tekrar görünmez olur.
update creator_accounts set status = 'suspended' where id = '00000000-0000-0000-0000-0000000000d5';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if exists (select 1 from creator_subscription_tiers where id = '00000000-0000-0000-0000-0000000000d6') then
    raise exception 'TEST FAILED: askıya alınmış creator''ın planı hâlâ görülebiliyor';
  end if;
end $$;
reset role;
