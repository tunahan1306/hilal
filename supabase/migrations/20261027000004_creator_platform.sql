-- Modül C — Creator Platform (creator hesabı, içerik hakları, ücretli abonelik tier'ları,
-- payout kaydı). app_users (20261027000001), user_profiles (20261027000003) ve
-- country_feature_publishable (20261027000002) üzerine kurulur.
--
-- Bu migration ayrıca Modül B'den KASITLI OLARAK ertelenen posts/media_assets'i de içerir
-- (bkz. 20261027000003_social_platform.sql yorumu) — ücretli bir gönderi yalnızca ekli
-- medyanın hak kaydı incelendiğinde anlamlı olduğu için birlikte ele alınır.
--
-- ÖNEMLİ TASARIM KARARI: creator_subscriptions hiçbir zaman gerçek bir satın almayla
-- oluşamaz. src/server/payments.ts'teki PaymentProvider gerçek bir sağlayıcı onaylanana
-- kadar her zaman PaymentsDisabledError fırlatır (bkz. src/server/services/creator.ts
-- subscribeToTier) — tıpkı yaş doğrulama sağlayıcısı seçilene kadar hiçbir profilin
-- kamuya açılamaması gibi, bu tablo da Modül F'e kadar yapısal olarak atıl kalır.
--
-- Modül D (bağımsız seks işçisi ilanı, hizmet rezervasyonu/ödemesine aracılık) için
-- hiçbir tablo/sütun/bayrak yoktur — kalıcı olarak kapsam dışı.

-- ---------------------------------------------------------------------
-- 1. Medya varlığı (Modül B'den ertelenmişti) — herhangi bir app_user'a ait, creator'a
--    özgü değil. EXIF/GPS dahil metadata src/server/services/images.ts ile temizlenir;
--    bu migration yalnızca zaten işlenmiş bayt dizisini saklar (senkron, biletsiz).
-- ---------------------------------------------------------------------
-- media_kind zaten 20261017000001_media_richtext.sql'de tanımlı (profile_media.kind ile paylaşılır).
create type media_asset_status as enum ('processing', 'ready', 'rejected');

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users (id) on delete cascade,
  storage_path text not null unique,
  url text not null,
  kind media_kind not null,
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  duration_seconds int check (duration_seconds is null or duration_seconds > 0),
  status media_asset_status not null default 'processing',
  rights_confirmed boolean not null default false,
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index media_assets_owner_idx on media_assets (owner_id, created_at desc);

alter table media_assets enable row level security;
revoke all on media_assets from anon, authenticated;
grant select, insert on media_assets to authenticated;
grant all on media_assets to service_role;
create policy "owner manage own media" on media_assets for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "admin read media assets" on media_assets for select to authenticated
  using (is_admin());

comment on table media_assets is 'Son kullanıcı/creator medya varlığı; EXIF/GPS dahil metadata temizlenmiş biçimde saklanır (bkz. src/server/services/images.ts).';

-- ---------------------------------------------------------------------
-- 2. İçerik hakları — profile_consents/verification_records'taki kanıt-işaretçi deseniyle
--    birebir (bkz. 02a_DATA_MODEL.md "content_rights" notu). posts_public view'ından ÖNCE
--    tanımlanır, çünkü o view bu tabloyu sorgular.
-- ---------------------------------------------------------------------
create table content_rights (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null unique references media_assets (id) on delete cascade,
  rights_type text not null check (rights_type in ('self_generated', 'licensed')),
  evidence_path text,
  confirmed_at timestamptz not null default now(),
  reviewed_by uuid references admins (id),
  reviewed_at timestamptz
);

alter table content_rights enable row level security;
revoke all on content_rights from anon, authenticated;
grant select, insert on content_rights to authenticated;
grant all on content_rights to service_role;
create policy "owner manage own content rights" on content_rights for all to authenticated
  using (exists (select 1 from media_assets m where m.id = media_asset_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from media_assets m where m.id = media_asset_id and m.owner_id = auth.uid()));
create policy "admin read content rights" on content_rights for select to authenticated using (is_admin());

comment on table content_rights is 'Medya başına hak kanıtı; ham belge evidence_path altında consent-documents ile aynı özel kovada tutulur. reviewed_by dolana kadar ücretli yayın ön koşulu sağlanmaz (bkz. posts_public).';

-- ---------------------------------------------------------------------
-- 3. Gönderi (post) — yalnızca ilk sürüm kapsamı (yorum/beğeni yok)
-- ---------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references app_users (id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  visibility profile_visibility not null default 'public',
  paid boolean not null default false,
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger posts_updated_at before update on posts for each row execute function set_updated_at();
create index posts_author_idx on posts (author_id, created_at desc);

create table post_media (
  post_id uuid not null references posts (id) on delete cascade,
  media_asset_id uuid not null references media_assets (id) on delete cascade,
  position int not null default 0,
  primary key (post_id, media_asset_id)
);

alter table posts enable row level security;
alter table post_media enable row level security;
revoke all on posts, post_media from anon, authenticated;
grant select, insert, update on posts to authenticated;
grant select, insert on post_media to authenticated;
grant all on posts, post_media to service_role;
create policy "owner manage own posts" on posts for all to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "admin read posts" on posts for select to authenticated using (is_admin());
-- post_media, posts'u (kendine değil) sorguladığı için self-referential recursion riski yok.
create policy "owner manage own post media" on post_media for all to authenticated
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "admin read post media" on post_media for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------
-- 4. Herkese açık gönderi akışı — user_profiles_public ile aynı disiplin: yalnızca
--    onaylı yazarın onaylı, kamuya açık, ülkesinde "digital_content" izinli gönderileri.
--    Ücretli bir gönderi yalnızca EKLİ TÜM medya varlıklarının incelenmiş (reviewed_by
--    dolu) bir content_rights kaydı varsa görünür (bkz. 02a_DATA_MODEL.md "content_rights"
--    notu). Abonelik durumuna göre gövdenin gizlenmesi bu view'ın işi değil — görünürlük
--    (var/yok) burada, içerik indirgeme (body gösterilsin mi) servis katmanında yapılır.
-- ---------------------------------------------------------------------
create or replace view posts_public with (security_invoker = false) as
select p.id, p.author_id, p.body, p.paid, p.created_at
from posts p
join user_profiles up on up.user_id = p.author_id
where p.moderation_status = 'approved'
  and p.visibility = 'public'
  and up.moderation_status = 'approved'
  and country_feature_publishable(up.country_code, 'digital_content')
  and (
    p.paid = false
    or not exists (
      select 1 from post_media pm
      where pm.post_id = p.id
        and not exists (
          select 1 from content_rights cr
          where cr.media_asset_id = pm.media_asset_id and cr.reviewed_by is not null
        )
    )
  );
revoke insert, update, delete, truncate on posts_public from anon, authenticated;
grant select on posts_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Creator hesabı — ekonomiye katılım başvurusu/onayı
-- ---------------------------------------------------------------------
create type creator_account_status as enum ('pending', 'active', 'suspended');

create table creator_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users (id) on delete cascade,
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 160),
  country_code text not null references countries (code),
  status creator_account_status not null default 'pending',
  approved_by uuid references admins (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index creator_accounts_status_idx on creator_accounts (status);

alter table creator_accounts enable row level security;
revoke all on creator_accounts from anon, authenticated;
grant select, insert on creator_accounts to authenticated;
grant all on creator_accounts to service_role;
-- Yalnızca okuma + başvuru (insert); onay/askıya alma (status güncellemesi) yalnızca
-- service_role ile yapılır (bkz. updateCreatorAccountStatus) — authenticated rolüne hiçbir
-- koşulda update grant'ı verilmez, böylece sahibi dahil kimse kendi statüsünü değiştiremez.
create policy "owner read own creator account" on creator_accounts for select to authenticated
  using (auth.uid() = user_id);
create policy "owner apply as creator" on creator_accounts for insert to authenticated
  with check (auth.uid() = user_id);
create policy "admin read creator accounts" on creator_accounts for select to authenticated using (is_admin());

comment on table creator_accounts is 'Creator ekonomisine katılım başvurusu/onayı; status=active olunca user_roles''e creator rolü tetikleyiciyle eklenir.';

-- Onay anında rol senkronizasyonu — tek yazma yolu trigger'dır (uygulama katmanı
-- user_roles'e doğrudan yazmaz); is_conversation_participant() ile aynı gerekçeyle
-- security definer: tetikleyici RLS'e tabi olmadan user_roles'e INSERT edebilmeli.
create or replace function sync_creator_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    insert into user_roles (user_id, role) values (new.user_id, 'creator')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;
create trigger creator_accounts_sync_role after insert or update on creator_accounts
  for each row execute function sync_creator_role();

-- ---------------------------------------------------------------------
-- 6. Ücretli abonelik tier'ları ve abonelikler — membership_plans/subscriptions'tan
--    KASITLI OLARAK AYRI (farklı sahip: admin-küratörlü keşif ürünü değil, creator'ın
--    kendi tanımladığı paket, bkz. 02a_DATA_MODEL.md).
-- ---------------------------------------------------------------------
create table creator_subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creator_accounts (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  price_amount numeric(12, 2) not null check (price_amount > 0),
  price_currency text not null default 'try' check (price_currency ~ '^[a-z]{3}$'),
  description text check (description is null or char_length(description) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index creator_subscription_tiers_creator_idx on creator_subscription_tiers (creator_id);

alter table creator_subscription_tiers enable row level security;
revoke all on creator_subscription_tiers from anon, authenticated;
grant select, insert, update on creator_subscription_tiers to authenticated;
grant all on creator_subscription_tiers to service_role;
create policy "creator manage own tiers" on creator_subscription_tiers for all to authenticated
  using (exists (select 1 from creator_accounts c where c.id = creator_id and c.user_id = auth.uid()))
  with check (exists (select 1 from creator_accounts c where c.id = creator_id and c.user_id = auth.uid()));
create policy "authenticated read active tiers" on creator_subscription_tiers for select to authenticated
  using (active);
create policy "admin read tiers" on creator_subscription_tiers for select to authenticated using (is_admin());

create type creator_subscription_status as enum ('active', 'cancelled', 'expired');

-- Gerçek satın alma yolu yok: bkz. migration başındaki tasarım kararı notu. insert RLS'i
-- kasıtlı olarak yoktur (service_role dışında hiç kimse yazamaz; gelecekte Modül F'in
-- webhook işleyicisi service_role ile yazacaktır).
create table creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references app_users (id) on delete cascade,
  tier_id uuid not null references creator_subscription_tiers (id) on delete cascade,
  status creator_subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  auto_renew boolean not null default false,
  external_ref text,
  created_at timestamptz not null default now(),
  constraint creator_subscriptions_period check (ends_at > starts_at)
);
create index creator_subscriptions_subscriber_idx on creator_subscriptions (subscriber_id);
create index creator_subscriptions_tier_idx on creator_subscriptions (tier_id);

alter table creator_subscriptions enable row level security;
revoke all on creator_subscriptions from anon, authenticated;
grant select on creator_subscriptions to authenticated;
grant all on creator_subscriptions to service_role;
create policy "subscriber read own subscriptions" on creator_subscriptions for select to authenticated
  using (auth.uid() = subscriber_id);
create policy "creator read own tier subscriptions" on creator_subscriptions for select to authenticated
  using (exists (
    select 1 from creator_subscription_tiers t join creator_accounts c on c.id = t.creator_id
     where t.id = tier_id and c.user_id = auth.uid()
  ));
create policy "admin read subscriptions" on creator_subscriptions for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------
-- 7. Payout kaydı — Modül F'in gerçek payout akışına kadar yalnızca şema/okuma amaçlı.
-- ---------------------------------------------------------------------
create type creator_payout_status as enum ('pending', 'paid', 'failed');

create table creator_payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creator_accounts (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  platform_fee_amount numeric(12, 2) not null check (platform_fee_amount >= 0),
  net_amount numeric(12, 2) not null,
  status creator_payout_status not null default 'pending',
  external_ref text,
  created_at timestamptz not null default now(),
  constraint creator_payouts_period check (period_end > period_start)
);
create index creator_payouts_creator_idx on creator_payouts (creator_id);

alter table creator_payouts enable row level security;
revoke all on creator_payouts from anon, authenticated;
grant select on creator_payouts to authenticated;
grant all on creator_payouts to service_role;
create policy "creator read own payouts" on creator_payouts for select to authenticated
  using (exists (select 1 from creator_accounts c where c.id = creator_id and c.user_id = auth.uid()));
create policy "admin read payouts" on creator_payouts for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------
-- 8. Depolama — kullanıcı medyası profile-images'ten AYRI, yeni bir kova (farklı
--    sahiplik/saklama alanı, bkz. 02a_DATA_MODEL.md "media_assets" notu).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-media', 'user-media', true, 5242880, array['image/webp'])
on conflict (id) do nothing;
