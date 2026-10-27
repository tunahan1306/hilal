-- Modül A — Kimlik & Doğrulama: son kullanıcı hesapları.
--
-- Mevcut `admins` (personel) tablosundan kasıtlı olarak ayrı: bu, yönetim tarafından
-- küratörlüğü yapılan `profiles` ürünüyle aynı güven modelini paylaşmayan, kendi kendine
-- kayıt olan yeni bir kullanıcı kitlesidir (bkz. docs/transformation/00_AUDIT.md).
-- `profiles`/`profile_images`/`profile_consents`/`membership_plans`/`subscriptions` bu
-- migration'da DEĞİŞMEZ.
--
-- Doğrulama kanıtı (ham kimlik belgesi/biyometrik veri) burada hiçbir sütunda tutulmaz;
-- yalnızca sağlayıcının verdiği sonuç (`age_verification_checks.status`) saklanır.
--
-- Modül D (bağımsız seks işçisi ilanı, hizmet rezervasyonu, cinsel hizmet ödemesine
-- aracılık) için hiçbir tablo/sütun/bayrak yoktur — kalıcı olarak kapsam dışı.

-- ---------------------------------------------------------------------
-- 1. Son kullanıcı hesabı
-- ---------------------------------------------------------------------
create type app_user_status as enum ('active', 'suspended', 'deleted');

create table app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null unique,
  email_verified_at timestamptz,
  status app_user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index app_users_status_idx on app_users (status) where status <> 'active';
create trigger app_users_updated_at before update on app_users for each row execute function set_updated_at();

alter table app_users enable row level security;
revoke all on app_users from anon, authenticated;
grant select, update on app_users to authenticated;
grant all on app_users to service_role;
-- Kullanıcı yalnızca kendi satırını okur/günceller; e-posta ve durum alanları yalnızca servis
-- katmanı (service role) tarafından değiştirilir — güven sınırı burada da uygulama katmanında.
create policy "owner read own user" on app_users for select to authenticated
  using (auth.uid() = id);
create policy "owner update own user" on app_users for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id and status = (select status from app_users where id = auth.uid()));
-- Moderasyon için yöneticiye okuma erişimi (AAL2 şartı yok: destek ekibinin rapor
-- incelemesi için okuma erişimi gerekir; yazma yalnızca moderasyon eylemleri üzerinden olur).
create policy "admin read users" on app_users for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

comment on table app_users is 'Son kullanıcı hesabı (kendi kendine kayıt). admins tablosundan ayrı güven modeli.';

-- ---------------------------------------------------------------------
-- 2. Kullanıcı rolleri (creator rolü, creator_accounts onayıyla senkronize edilir —
--    bkz. 20261027000004_creator_platform.sql; burada yalnızca şema tanımlanır)
-- ---------------------------------------------------------------------
create type user_role as enum ('member', 'creator');

create table user_roles (
  user_id uuid not null references app_users (id) on delete cascade,
  role user_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table user_roles enable row level security;
revoke all on user_roles from anon, authenticated;
grant select on user_roles to authenticated;
grant all on user_roles to service_role;
create policy "owner read own roles" on user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "admin read roles" on user_roles for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Yaş doğrulama sonucu (yalnızca sonuç — ham belge/biyometrik veri yok)
-- ---------------------------------------------------------------------
create table age_verification_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id) on delete cascade,
  provider text not null check (char_length(provider) between 2 and 60),
  provider_ref text not null check (char_length(provider_ref) between 1 and 200),
  status verification_status not null default 'pending',
  checked_at timestamptz,
  expires_at timestamptz,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index age_verification_checks_user_idx on age_verification_checks (user_id, status, checked_at desc);

alter table age_verification_checks enable row level security;
revoke all on age_verification_checks from anon, authenticated;
grant select on age_verification_checks to authenticated;
grant all on age_verification_checks to service_role;
-- Kullanıcı yalnızca kendi doğrulama sonucunu okur; yazamaz — yalnızca sağlayıcı
-- entegrasyonunun sonucunu kaydeden servis (service role) ekler.
create policy "owner read own verification" on age_verification_checks for select to authenticated
  using (auth.uid() = user_id);
create policy "admin read verification" on age_verification_checks for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

comment on table age_verification_checks is 'Sağlayıcı sonucu yalnızca; ham kimlik belgesi/biyometrik veri bu şemada hiçbir yerde tutulmaz.';

-- ---------------------------------------------------------------------
-- 4. Rıza kayıtları (son kullanıcı için; profile_consents admin-küratörlü ürün için kalır)
-- ---------------------------------------------------------------------
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id) on delete cascade,
  type text not null check (type in ('tos', 'privacy_policy', 'marketing', 'age_attestation')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  method text not null check (char_length(method) between 2 and 60),
  evidence_ref text check (evidence_ref is null or char_length(evidence_ref) <= 500),
  created_at timestamptz not null default now()
);
create index consent_records_active_idx on consent_records (user_id, type) where revoked_at is null;

alter table consent_records enable row level security;
revoke all on consent_records from anon, authenticated;
grant select, insert on consent_records to authenticated;
grant all on consent_records to service_role;
create policy "owner manage own consent" on consent_records for select to authenticated
  using (auth.uid() = user_id);
create policy "owner insert own consent" on consent_records for insert to authenticated
  with check (auth.uid() = user_id);
create policy "admin read consent" on consent_records for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

-- ---------------------------------------------------------------------
-- 5. privacy_requests: son kullanıcı taleplerini de kapsayacak şekilde genişletme
--    (tek değişiklik: nullable user_id + tam olarak bir özneye çözümlenme kısıtı)
-- ---------------------------------------------------------------------
-- profile_id zaten nullable'dı (yalnızca uygulama katmanı zorunlu kılıyordu); yeni kısıt
-- iki sütunu birlikte tam olarak bir özneye çözümlenecek şekilde veritabanı seviyesinde kilitler.
alter table privacy_requests
  add column if not exists user_id uuid references app_users (id) on delete set null;
alter table privacy_requests
  add constraint privacy_requests_one_subject check (num_nonnulls(profile_id, user_id) = 1);

-- ---------------------------------------------------------------------
-- 6. security_events: admin-dışı/denetim-dışı olaylar için (audit_logs.actor_id yalnızca
--    admins(id)'e referans verir; son kullanıcı/anon/sistem olayları audit_logs'a YAZILMAZ,
--    bunun yerine burada tutulur — audit_logs'un immutable/FK şeklini bozmadan).
-- ---------------------------------------------------------------------
create table security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 2 and 80),
  actor_type text not null check (actor_type in ('user', 'admin', 'anon', 'system')),
  actor_id uuid, -- FK yok: admins veya app_users olabilir, audit_logs.entity_id ile aynı gerekçe
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index security_events_type_idx on security_events (event_type, created_at desc);
create index security_events_actor_idx on security_events (actor_id, created_at desc) where actor_id is not null;

alter table security_events enable row level security;
revoke all on security_events from anon, authenticated;
grant select on security_events to authenticated;
grant all on security_events to service_role;
create policy "admin read security events" on security_events for select to authenticated
  using (is_admin());

comment on table security_events is 'Yönetici-dışı aktörlerin (kullanıcı/anon/sistem) olay kaydı; audit_logs sadece admin eylemleri içindir (actor_id -> admins FK).';
