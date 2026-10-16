-- =====================================================================
-- Hilal — ilk şema
-- Kurallar: UUID PK, tüm ilişkiler FK, RLS her tabloda açık.
-- Kamuya açık okuma yalnızca *_public view'ları üzerinden yapılır; bu view'lar
-- hassas alanları (doğum tarihi, rıza belgeleri, moderasyon notları) içermez.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Enum'lar
-- ---------------------------------------------------------------------
create type profile_status as enum ('draft', 'in_review', 'published', 'unpublished', 'archived');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type consent_type as enum ('publication', 'photo_rights', 'data_processing');
create type verification_type as enum ('age', 'identity');
create type verification_status as enum ('pending', 'approved', 'rejected');
create type report_category as enum ('fake_profile', 'unauthorized_photo', 'impersonation', 'harassment',
  'suspected_minor', 'paid_sexual_services', 'personal_data', 'other');
create type report_status as enum ('open', 'in_review', 'resolved', 'rejected', 'appealed');
create type moderation_action_type as enum ('review_started', 'content_removed', 'profile_unpublished',
  'profile_restored', 'report_rejected', 'report_resolved', 'appeal_received', 'appeal_accepted',
  'appeal_rejected', 'auto_unpublished');
create type plan_code as enum ('basic', 'plus', 'premium');
create type subscription_status as enum ('scheduled', 'active', 'expired', 'cancelled');
create type privacy_request_type as enum ('removal', 'access', 'deletion', 'correction', 'objection');
create type privacy_request_status as enum ('received', 'in_progress', 'completed', 'rejected');
create type admin_role as enum ('owner', 'moderator');

-- ---------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Yöneticiler (Supabase Auth kullanıcılarına bağlı)
-- ---------------------------------------------------------------------
create table admins (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  display_name text not null,
  role admin_role not null default 'moderator',
  created_at timestamptz not null default now()
);

-- Oturumdaki kullanıcı yönetici mi ve MFA (AAL2) ile mi giriş yapmış?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins a where a.id = auth.uid())
     and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Konum
-- ---------------------------------------------------------------------
create table cities (
  id uuid primary key default gen_random_uuid(),
  plate smallint not null unique check (plate between 1 and 81),
  name text not null,
  slug text not null unique,
  region text not null,
  is_metropolitan boolean not null default false,
  population integer,
  lat double precision,
  lng double precision
);

create table districts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities (id) on delete cascade,
  name text not null,
  slug text not null,
  population integer,
  unique (city_id, slug)
);
create index districts_city_idx on districts (city_id);

-- ---------------------------------------------------------------------
-- İlgi alanları
-- ---------------------------------------------------------------------
create table interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  name text not null,
  description text
);

-- ---------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,100}$'),
  nickname text not null check (char_length(nickname) between 2 and 40),
  birth_date date not null,
  city_id uuid not null references cities (id),
  district_id uuid references districts (id),
  bio text not null check (char_length(bio) between 20 and 600),
  status profile_status not null default 'draft',
  moderation_status moderation_status not null default 'pending',
  moderation_note text,
  moderated_by uuid references admins (id) on delete set null,
  moderated_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 160),
  noindex boolean not null default false,
  created_by uuid references admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_status_idx on profiles (status);
create index profiles_city_idx on profiles (city_id, status);
create index profiles_district_idx on profiles (district_id, status);
create index profiles_published_at_idx on profiles (published_at desc) where status = 'published';
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();

create table profile_images (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null unique,
  url text not null,
  alt text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  position smallint not null default 0,
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index profile_images_profile_idx on profile_images (profile_id, position);

create table profile_interests (
  profile_id uuid not null references profiles (id) on delete cascade,
  interest_id uuid not null references interests (id) on delete cascade,
  primary key (profile_id, interest_id)
);
create index profile_interests_interest_idx on profile_interests (interest_id);

create table profile_consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  type consent_type not null,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  evidence_path text, -- private bucket: consent-documents
  method text not null,
  recorded_by uuid references admins (id) on delete set null
);
create index profile_consents_profile_idx on profile_consents (profile_id, type) where revoked_at is null;

create table verification_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  type verification_type not null,
  status verification_status not null default 'pending',
  method text not null,
  document_path text, -- private bucket: verification-documents
  checked_by uuid references admins (id) on delete set null,
  checked_at timestamptz,
  retain_until timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index verification_records_profile_idx on verification_records (profile_id, type, status);
create index verification_records_retention_idx on verification_records (retain_until) where document_path is not null;

-- ---------------------------------------------------------------------
-- Moderasyon
-- ---------------------------------------------------------------------
create table moderation_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  category report_category not null,
  description text not null check (char_length(description) between 10 and 1000),
  reporter_email citext,
  reporter_hash text not null, -- IP'nin tuzlu SHA-256 özeti; ham IP saklanmaz
  status report_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index moderation_reports_status_idx on moderation_reports (status, created_at desc);
create index moderation_reports_profile_idx on moderation_reports (profile_id);
create index moderation_reports_hash_idx on moderation_reports (reporter_hash, created_at);
create trigger moderation_reports_updated_at before update on moderation_reports for each row execute function set_updated_at();

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references moderation_reports (id) on delete set null,
  profile_id uuid not null references profiles (id) on delete cascade,
  type moderation_action_type not null,
  note text,
  actor_id uuid references admins (id) on delete set null,
  created_at timestamptz not null default now()
);
create index moderation_actions_report_idx on moderation_actions (report_id);
create index moderation_actions_profile_idx on moderation_actions (profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- Üyelik ve abonelik (tahsilat entegrasyonu YOK)
-- ---------------------------------------------------------------------
create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  code plan_code not null unique,
  name text not null,
  description text not null,
  max_photos smallint not null check (max_photos between 1 and 20),
  sponsored_eligible boolean not null default false,
  advanced_stats boolean not null default false,
  customization boolean not null default false,
  price_monthly_try numeric(10, 2) not null default 0,
  active boolean not null default true
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  plan_id uuid not null references membership_plans (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status subscription_status not null default 'active',
  auto_renew boolean not null default false,
  sponsored boolean not null default false,
  cancelled_at timestamptz,
  external_ref text, -- ileride ödeme kuruluşu referansı; şimdilik null
  note text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index subscriptions_profile_idx on subscriptions (profile_id, ends_at desc);
create index subscriptions_active_idx on subscriptions (ends_at) where status = 'active';

-- ---------------------------------------------------------------------
-- Denetim, KVKK, SEO, ayarlar, istatistik
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references admins (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);
-- Denetim kayıtları değiştirilemez.
create or replace function audit_logs_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs kayıtları değiştirilemez';
end $$;
create trigger audit_logs_no_update before update or delete on audit_logs
  for each row execute function audit_logs_immutable();

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  type privacy_request_type not null,
  profile_id uuid references profiles (id) on delete set null,
  profile_url text,
  requester_name text not null,
  requester_email citext not null,
  relation text not null check (relation in ('self', 'representative', 'other')),
  details text not null,
  status privacy_request_status not null default 'received',
  due_at timestamptz not null, -- KVKK m.13: en geç 30 gün
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index privacy_requests_status_idx on privacy_requests (status, due_at);

create table seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique check (path ~ '^/[a-z0-9\-/]*$'),
  title text check (char_length(title) <= 70),
  description text check (char_length(description) <= 160),
  canonical text,
  index_override boolean,
  intro text,
  updated_at timestamptz not null default now()
);
create trigger seo_pages_updated_at before update on seo_pages for each row execute function set_updated_at();

create table site_settings (
  id boolean primary key default true check (id), -- tek satır
  site_name text not null default 'Hilal',
  support_email text not null default 'destek@example.com',
  maintenance_mode boolean not null default false,
  reports_enabled boolean not null default true
);
insert into site_settings default values;

create table page_views_daily (
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  views integer not null default 0,
  primary key (profile_id, day)
);

create or replace function increment_profile_view(p_profile uuid, p_day date) returns void
language sql security definer set search_path = public as $$
  insert into page_views_daily (profile_id, day, views) values (p_profile, p_day, 1)
  on conflict (profile_id, day) do update set views = page_views_daily.views + 1;
$$;
revoke all on function increment_profile_view(uuid, date) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- Yayın ön koşulları — veritabanı seviyesinde son savunma hattı.
-- Uygulama katmanı aynı kuralları uygular (src/domain/publishing.ts); bu
-- tetikleyici, kural atlanırsa (ör. doğrudan SQL) yayını yine de engeller.
-- ---------------------------------------------------------------------
create or replace function enforce_publish_preconditions() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if new.birth_date > (current_date - interval '18 years') then
      raise exception 'Yayın engellendi: profil sahibi 18 yaşından küçük';
    end if;
    if new.moderation_status <> 'approved' then
      raise exception 'Yayın engellendi: moderasyon onayı yok';
    end if;
    if not exists (select 1 from verification_records v where v.profile_id = new.id and v.type = 'age' and v.status = 'approved') then
      raise exception 'Yayın engellendi: yaş doğrulaması yok';
    end if;
    if not exists (select 1 from profile_consents c where c.profile_id = new.id and c.type = 'publication' and c.revoked_at is null) then
      raise exception 'Yayın engellendi: yayın yetkilendirmesi yok';
    end if;
    if not exists (select 1 from profile_consents c where c.profile_id = new.id and c.type = 'photo_rights' and c.revoked_at is null) then
      raise exception 'Yayın engellendi: fotoğraf kullanım izni yok';
    end if;
    if not exists (select 1 from profile_images i where i.profile_id = new.id)
       or exists (select 1 from profile_images i where i.profile_id = new.id and not i.rights_confirmed) then
      raise exception 'Yayın engellendi: fotoğraf hakları doğrulanmadı';
    end if;
    if exists (select 1 from moderation_reports r where r.profile_id = new.id and r.status in ('open','in_review')
               and r.category in ('suspected_minor','paid_sexual_services','impersonation','unauthorized_photo')) then
      raise exception 'Yayın engellendi: açık kritik şikâyet var';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_publish_guard before insert or update of status on profiles
  for each row execute function enforce_publish_preconditions();

-- Yayın rızası geri alınırsa profil otomatik olarak yayından kalkar.
create or replace function unpublish_on_consent_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.revoked_at is not null and old.revoked_at is null and new.type in ('publication', 'photo_rights') then
    update profiles set status = 'unpublished' where id = new.profile_id and status = 'published';
  end if;
  return new;
end $$;
create trigger consent_revoke_unpublish after update of revoked_at on profile_consents
  for each row execute function unpublish_on_consent_revoke();

-- ---------------------------------------------------------------------
-- Kamuya açık view'lar (yalnızca güvenli kolonlar)
-- ---------------------------------------------------------------------
create view profiles_public with (security_invoker = false) as
select
  p.id,
  p.slug,
  p.nickname,
  date_part('year', age(current_date, p.birth_date))::int as age,
  c.plate as city_plate,
  c.name as city_name,
  c.slug as city_slug,
  d.name as district_name,
  d.slug as district_slug,
  p.bio,
  p.published_at,
  p.updated_at,
  p.seo_title,
  p.seo_description,
  p.noindex,
  exists (
    select 1 from verification_records v
    where v.profile_id = p.id and v.type = 'identity' and v.status = 'approved'
  ) as verified,
  coalesce((
    select s.sponsored and mp.sponsored_eligible
    from subscriptions s join membership_plans mp on mp.id = s.plan_id
    where s.profile_id = p.id and s.status = 'active' and now() between s.starts_at and s.ends_at
    order by s.ends_at desc limit 1
  ), false) as sponsored,
  coalesce((
    select mp.max_photos
    from subscriptions s join membership_plans mp on mp.id = s.plan_id
    where s.profile_id = p.id and s.status = 'active' and now() between s.starts_at and s.ends_at
    order by s.ends_at desc limit 1
  ), 3) as max_photos
from profiles p
join cities c on c.id = p.city_id
left join districts d on d.id = p.district_id
where p.status = 'published'
  and p.moderation_status = 'approved'
  and p.birth_date <= (current_date - interval '18 years')
  and exists (select 1 from profile_consents pc where pc.profile_id = p.id and pc.type = 'publication' and pc.revoked_at is null)
  and exists (select 1 from profile_images pi where pi.profile_id = p.id and pi.rights_confirmed);

create view profile_images_public with (security_invoker = false) as
select pi.profile_id, pi.url, pi.alt, pi.width, pi.height, pi.position
from profile_images pi
join profiles_public pp on pp.id = pi.profile_id
where pi.rights_confirmed;

create view profile_interests_public with (security_invoker = false) as
select pin.profile_id, i.slug, i.name
from profile_interests pin
join interests i on i.id = pin.interest_id
join profiles_public pp on pp.id = pin.profile_id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table admins enable row level security;
alter table cities enable row level security;
alter table districts enable row level security;
alter table interests enable row level security;
alter table profiles enable row level security;
alter table profile_images enable row level security;
alter table profile_interests enable row level security;
alter table profile_consents enable row level security;
alter table verification_records enable row level security;
alter table moderation_reports enable row level security;
alter table moderation_actions enable row level security;
alter table membership_plans enable row level security;
alter table subscriptions enable row level security;
alter table audit_logs enable row level security;
alter table privacy_requests enable row level security;
alter table seo_pages enable row level security;
alter table site_settings enable row level security;
alter table page_views_daily enable row level security;

-- Herkese açık referans verileri
create policy "public read cities" on cities for select using (true);
create policy "public read districts" on districts for select using (true);
create policy "public read interests" on interests for select using (true);
create policy "public read plans" on membership_plans for select using (active);
create policy "public read seo" on seo_pages for select using (true);

-- Yönetici (MFA'lı) tam erişim. Ziyaretçi profillere doğrudan erişemez;
-- *_public view'larını kullanır.
do $$
declare t text;
begin
  foreach t in array array['cities','districts','interests','profiles','profile_images','profile_interests',
    'profile_consents','verification_records','moderation_reports','moderation_actions','membership_plans',
    'subscriptions','privacy_requests','seo_pages','site_settings','page_views_daily']
  loop
    execute format('create policy "admin all %1$s" on %1$I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

create policy "admin read admins" on admins for select to authenticated using (is_admin() or id = auth.uid());
create policy "admin read audit" on audit_logs for select to authenticated using (is_admin());
create policy "admin insert audit" on audit_logs for insert to authenticated with check (is_admin());

-- Şikâyet ve KVKK talepleri yalnızca sunucu (service role) üzerinden, oran
-- sınırlaması ve doğrulamadan geçtikten sonra eklenir; anon doğrudan yazamaz.

grant select on profiles_public, profile_images_public, profile_interests_public to anon, authenticated;
revoke all on profiles from anon;
revoke all on profile_consents, verification_records, moderation_reports, moderation_actions,
  subscriptions, audit_logs, privacy_requests, page_views_daily, admins from anon;

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 5242880, array['image/webp']),
  ('consent-documents', 'consent-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Yalnızca yöneticiler yazabilir; özel bucket'lar sadece yöneticiye okunur.
create policy "admin write profile images" on storage.objects for all to authenticated
  using (bucket_id = 'profile-images' and is_admin()) with check (bucket_id = 'profile-images' and is_admin());
create policy "admin private docs" on storage.objects for all to authenticated
  using (bucket_id in ('consent-documents','verification-documents') and is_admin())
  with check (bucket_id in ('consent-documents','verification-documents') and is_admin());
