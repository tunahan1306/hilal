-- Phase 5 (QA/security) — fixes for findings confirmed by a structured review of the
-- Modül A-G diff (bkz. docs/transformation/05_PHASE5_QA_SECURITY.md). Her biri aşağıda ayrı
-- ayrı gerekçelendirilmiştir; hiçbiri mevcut, test edilmiş davranışı KASITLI OLARAK değiştirmez
-- — yalnızca belgelenen tasarım niyetiyle kodun gerçek davranışı arasındaki boşlukları kapatır.

-- ---------------------------------------------------------------------
-- 1. user_profiles_public — askıya alınmış (app_users.status <> 'active') bir kullanıcının
--    profili, hesabı askıya alındıktan SONRA bile kamuya açık kalıyordu (triageContentReport'un
--    "suspend_account" eylemi yalnızca girişi engelliyordu, zaten yayındaki profili gizlemiyordu).
-- ---------------------------------------------------------------------
create or replace view user_profiles_public with (security_invoker = false) as
select
  p.id, p.user_id, p.handle, p.display_name, p.bio,
  date_part('year', age(current_date, p.birth_date))::int as age,
  p.country_code, p.created_at
from user_profiles p
join app_users au on au.id = p.user_id
where p.moderation_status = 'approved'
  and p.visibility = 'public'
  and au.status = 'active'
  and p.birth_date <= current_date - interval '18 years'
  and country_feature_publishable(p.country_code, 'social_profiles')
  and exists (
    select 1 from age_verification_checks v
     where v.user_id = p.user_id and v.status = 'approved'
       and (v.expires_at is null or v.expires_at >= now())
  );

-- ---------------------------------------------------------------------
-- 2. posts_public — üç boşluk birden kapatılır:
--    a) Yazarın hesabı askıya alınınca gönderileri de kamuya kapanmalı (yukarıdakiyle aynı boşluk).
--    b) Bir medya varlığı tek başına reddedilince (triageContentReport "remove_content" →
--       setContentModerationStatus('media_asset', ...)) o medyayı taşıyan gönderi hâlâ görünür
--       kalıyordu — hiçbir okuma yolu media_assets.moderation_status'u sorgulamıyordu.
--    c) Ücretli bir gönderi SIFIR ekli medyayla oluşturulabildiği için (allMediaRightsReviewed([])
--       boş dizi için vacuous-true döner) hak incelemesi kapısını hiç görmeden yayına giriyordu;
--       servis katmanında da kapatıldı (bkz. src/server/services/social.ts createPost), burada
--       view seviyesinde ikinci bir savunma hattı olarak da uygulanır.
-- ---------------------------------------------------------------------
create or replace view posts_public with (security_invoker = false) as
select p.id, p.author_id, p.body, p.paid, p.created_at
from posts p
join user_profiles up on up.user_id = p.author_id
join app_users au on au.id = p.author_id
where p.moderation_status = 'approved'
  and p.visibility = 'public'
  and up.moderation_status = 'approved'
  and au.status = 'active'
  and country_feature_publishable(up.country_code, 'digital_content')
  and not exists (
    select 1 from post_media pm
    join media_assets ma on ma.id = pm.media_asset_id
    where pm.post_id = p.id and ma.moderation_status = 'rejected'
  )
  and (
    p.paid = false
    or (
      exists (select 1 from post_media pm where pm.post_id = p.id)
      and not exists (
        select 1 from post_media pm
        where pm.post_id = p.id
          and not exists (
            select 1 from content_rights cr
            where cr.media_asset_id = pm.media_asset_id and cr.reviewed_by is not null
          )
      )
    )
  );

-- ---------------------------------------------------------------------
-- 3. creator_subscription_tiers RLS — "authenticated read active tiers" politikası yalnızca
--    `active` sütununu kontrol ediyordu; creator_accounts.status='active' ve
--    country_feature_publishable(..., 'paid_subscriptions') kontrolünü UYGULAMIYORDU. Bu
--    kontroller yalnızca servis katmanında (getPublicSubscriptionTiers) vardı — ama servis
--    katmanı service_role kullandığından RLS'i zaten atlıyor; bu RLS politikası Supabase
--    REST API'sine KENDİ oturum JWT'siyle doğrudan erişen herhangi bir authenticated kullanıcı
--    için TEK gerçek kapıydı ve o kapı boştu. Artık servis katmanıyla birebir aynı üç koşulu uygular.
--
--    security definer ZORUNLU: creator_accounts'un kendi RLS'i (yalnızca sahibi veya admin
--    okuyabilir) devrede olmasaydı bile, bu alt sorgu auth.uid()'si creator'ın kendisi OLMAYAN
--    bir görüntüleyici için creator_accounts satırını hiç GÖREMEZDİ ve EXISTS sessizce false
--    dönerdi — is_conversation_participant()/enforce_message_not_blocked() ile aynı gerekçe.
-- ---------------------------------------------------------------------
create or replace function creator_tier_publicly_visible(p_creator_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from creator_accounts c
     where c.id = p_creator_id and c.status = 'active'
       and country_feature_publishable(c.country_code, 'paid_subscriptions')
  );
$$;
revoke all on function creator_tier_publicly_visible(uuid) from public;
grant execute on function creator_tier_publicly_visible(uuid) to authenticated, service_role;

drop policy if exists "authenticated read active tiers" on creator_subscription_tiers;
create policy "authenticated read publicly permitted tiers" on creator_subscription_tiers for select to authenticated
  using (active and creator_tier_publicly_visible(creator_id));
