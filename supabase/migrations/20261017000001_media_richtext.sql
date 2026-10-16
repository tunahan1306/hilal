-- =====================================================================
-- Medya (görsel + video), zengin biyografi ve depolama kotası
--
-- Kurallar (değişmeyen güvenceler korunur):
-- * Yalnızca hazır + kullanım hakkı kayıtlı + yayın onaylı medya kamuya açılır.
-- * Hak kaydı olmayan medya onaylanamaz (CHECK).
-- * Yayın ön koşulları tetikleyicide korunur; "tüm görseller haklı" yerine
--   "en az bir onaylı kapak fotoğrafı" aranır — onaysız medya zaten görünmez.
-- =====================================================================

create type media_kind as enum ('image', 'video');
create type media_status as enum ('uploading', 'processing', 'ready', 'failed');
create type media_moderation as enum ('pending', 'approved', 'rejected');
create type media_ownership_source as enum ('owner', 'photographer_licensed', 'other_licensed');

create table profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  kind media_kind not null,
  status media_status not null default 'uploading',
  storage_path text not null unique,            -- özel bucket: media-private
  thumb_path text,                               -- özel bucket: önizleme / poster
  public_url text,                               -- yalnızca onaylı + yayındaki profil
  public_poster_url text,
  public_paths text[] not null default '{}',     -- herkese açık bucket: media-public
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  bytes bigint not null default 0 check (bytes >= 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  duration_seconds numeric(8, 1) check (duration_seconds is null or duration_seconds >= 0),
  alt text not null default '' check (char_length(alt) <= 200),
  position integer not null default 0,
  is_cover boolean not null default false,
  -- Sahiplik / kullanım hakkı kaydı
  rights_confirmed boolean not null default false,
  ownership_source media_ownership_source,
  ownership_note text check (char_length(ownership_note) <= 300),
  rights_confirmed_by uuid references admins (id) on delete set null,
  rights_confirmed_at timestamptz,
  -- Yayın onayı kaydı
  moderation media_moderation not null default 'pending',
  moderated_by uuid references admins (id) on delete set null,
  moderated_at timestamptz,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  dhash text check (dhash is null or dhash ~ '^[0-9a-f]{16}$'),
  failure_reason text,
  created_at timestamptz not null default now(),
  constraint approved_requires_rights check (moderation <> 'approved' or (rights_confirmed and ownership_source is not null and status = 'ready')),
  constraint public_requires_approval check (public_url is null or moderation = 'approved'),
  constraint cover_is_image check (not is_cover or kind = 'image')
);
create index profile_media_profile_idx on profile_media (profile_id, position);
create index profile_media_moderation_idx on profile_media (moderation, created_at desc);
create unique index profile_media_one_cover on profile_media (profile_id) where is_cover;
create index profile_media_sha_idx on profile_media (profile_id, sha256) where sha256 is not null;

-- Eski görsel kayıtlarını taşı
insert into profile_media (id, profile_id, kind, status, storage_path, public_url, public_paths, mime_type, bytes, width, height, alt, position, is_cover,
  rights_confirmed, ownership_source, rights_confirmed_at, moderation, moderated_at, created_at)
select pi.id, pi.profile_id, 'image', 'ready', pi.storage_path, case when pi.rights_confirmed then pi.url end, '{}', 'image/webp', 0, pi.width, pi.height,
  pi.alt, pi.position, pi.position = (select min(position) from profile_images x where x.profile_id = pi.profile_id),
  pi.rights_confirmed, case when pi.rights_confirmed then 'owner'::media_ownership_source end, case when pi.rights_confirmed then pi.created_at end,
  case when pi.rights_confirmed then 'approved'::media_moderation else 'pending'::media_moderation end, case when pi.rights_confirmed then pi.created_at end, pi.created_at
from profile_images pi;

-- Bağımlı view'lar yeniden kurulur
drop view if exists profile_interests_public;
drop view if exists profile_images_public;
drop view if exists profiles_public;
drop table profile_images;

-- Zengin biyografi: JSON belge (HTML yok); `bio` düz metin özetidir
alter table profiles add column bio_doc jsonb;
alter table profiles drop constraint if exists profiles_bio_check;
alter table profiles add constraint profiles_bio_check check (char_length(bio) between 20 and 20000);
alter table profiles add constraint profiles_bio_doc_shape check (bio_doc is null or (jsonb_typeof(bio_doc) = 'object' and bio_doc ->> 'type' = 'doc' and pg_column_size(bio_doc) < 400000));

-- Paketler: adet sınırı yerine depolama kotası
alter table membership_plans add column storage_quota_mb integer not null default 300 check (storage_quota_mb between 10 and 100000);
update membership_plans set storage_quota_mb = case code when 'basic' then 300 when 'plus' then 1500 else 5000 end;
alter table membership_plans drop column max_photos;

-- ---------------------------------------------------------------------
-- Yayın ön koşulları (medya modeline göre)
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
    if not exists (select 1 from profile_media m where m.profile_id = new.id and m.kind = 'image' and m.status = 'ready'
                   and m.rights_confirmed and m.moderation = 'approved') then
      raise exception 'Yayın engellendi: onaylı fotoğraf yok';
    end if;
    if exists (select 1 from moderation_reports r where r.profile_id = new.id and r.status in ('open','in_review')
               and r.category in ('suspected_minor','paid_sexual_services','impersonation','unauthorized_photo')) then
      raise exception 'Yayın engellendi: açık kritik şikâyet var';
    end if;
  end if;
  return new;
end $$;

-- Medya kullanım izni geri alınırsa tüm medyanın hak ve onay kaydı düşer
create or replace function unpublish_on_consent_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.revoked_at is not null and old.revoked_at is null and new.type in ('publication', 'photo_rights') then
    update profiles set status = 'unpublished' where id = new.profile_id and status = 'published';
    if new.type = 'photo_rights' then
      update profile_media set moderation = 'pending', moderated_at = null, moderated_by = null,
        rights_confirmed = false, ownership_source = null, public_url = null, public_poster_url = null
      where profile_id = new.profile_id;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Kamuya açık view'lar
-- ---------------------------------------------------------------------
create view profiles_public with (security_invoker = false) as
select
  p.id, p.slug, p.nickname,
  date_part('year', age(current_date, p.birth_date))::int as age,
  c.plate as city_plate, c.name as city_name, c.slug as city_slug,
  d.name as district_name, d.slug as district_slug,
  p.bio, p.bio_doc, p.published_at, p.updated_at, p.seo_title, p.seo_description, p.noindex,
  exists (select 1 from verification_records v where v.profile_id = p.id and v.type = 'identity' and v.status = 'approved') as verified,
  coalesce((
    select s.sponsored and mp.sponsored_eligible
    from subscriptions s join membership_plans mp on mp.id = s.plan_id
    where s.profile_id = p.id and s.status = 'active' and now() between s.starts_at and s.ends_at
    order by s.ends_at desc limit 1
  ), false) as sponsored
from profiles p
join cities c on c.id = p.city_id
left join districts d on d.id = p.district_id
where p.status = 'published'
  and p.moderation_status = 'approved'
  and p.birth_date <= (current_date - interval '18 years')
  and exists (select 1 from profile_consents pc where pc.profile_id = p.id and pc.type = 'publication' and pc.revoked_at is null)
  and exists (select 1 from profile_media m where m.profile_id = p.id and m.kind = 'image' and m.status = 'ready' and m.rights_confirmed and m.moderation = 'approved' and m.public_url is not null);

create view profile_media_public with (security_invoker = false) as
select m.profile_id, m.kind, m.public_url as url, m.public_poster_url as poster_url, m.alt, m.width, m.height, m.duration_seconds, m.mime_type, m.position, m.is_cover
from profile_media m
join profiles_public pp on pp.id = m.profile_id
where m.status = 'ready' and m.rights_confirmed and m.moderation = 'approved' and m.public_url is not null;

create view profile_interests_public with (security_invoker = false) as
select pin.profile_id, i.slug, i.name
from profile_interests pin
join interests i on i.id = pin.interest_id
join profiles_public pp on pp.id = pin.profile_id;

-- ---------------------------------------------------------------------
-- RLS ve yetkiler
-- ---------------------------------------------------------------------
alter table profile_media enable row level security;
create policy "admin all profile_media" on profile_media for all to authenticated using (is_admin()) with check (is_admin());
revoke all on profile_media from anon;
grant select on profiles_public, profile_media_public, profile_interests_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- Depolama: özel (yükleme + işlenmiş) ve herkese açık (yalnızca onaylı + yayında)
-- Not: Supabase Free planında tek dosya sınırı 50 MB'tır; video sınırı buna göre yapılandırılmalıdır.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media-private', 'media-private', false, 209715200, array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
  ('media-public', 'media-public', true, 209715200, array['image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy "admin media buckets" on storage.objects for all to authenticated
  using (bucket_id in ('media-private','media-public') and is_admin())
  with check (bucket_id in ('media-private','media-public') and is_admin());
