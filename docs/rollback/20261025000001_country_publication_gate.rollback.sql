-- GERİ ALMA: 20261025000001_country_publication_gate.sql
-- Migration klasöründe DEĞİLDİR; otomatik uygulanmaz. Önce izole bir kopyada denenir.
-- Tek işlem: görünümler, yayın tetikleyicisi ve ülke yetkileri migration öncesi tanımlarına döner;
-- karar tablosu ve ülke yayın sütunları kaldırılır.
--
-- UYARI: Geri alma ülke kapısını, yaş doğrulaması / fotoğraf rızası görünüm koşullarını ve paylaşılan
-- numara korumasını kaldırır; kurgusal kayıtlar yeniden iletişim numarası gösterebilir. Karar geçmişi
-- (country_publication_decisions) silinmeden önce dışa aktarılmalıdır:
--   \copy (select * from public.country_publication_decisions order by decided_at) to 'country_decisions_backup.csv' csv header
-- Denetim kayıtları (audit_logs, action = 'country.publication_decision') korunur.

begin;

-- 1. Kamu görünümleri (sütunlar değişmediği için create or replace yeterli)
create or replace view public.profiles_public with (security_invoker = false) as
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
  ), false) as sponsored,
  case when p.whatsapp_consent_at is not null then p.whatsapp_phone else null end as whatsapp_phone
from profiles p
join cities c on c.id = p.city_id
left join districts d on d.id = p.district_id
where p.status = 'published'
  and p.moderation_status = 'approved'
  and p.birth_date <= (current_date - interval '18 years')
  and exists (select 1 from profile_consents pc where pc.profile_id = p.id and pc.type = 'publication' and pc.revoked_at is null)
  and exists (select 1 from profile_media m where m.profile_id = p.id and m.kind = 'image' and m.status = 'ready' and m.rights_confirmed and m.moderation = 'approved' and m.public_url is not null);

create or replace view public.discovery_profiles with (security_invoker = false) as
select pp.*, false as is_example, null::text as example_image_url, null::integer as example_image_width, null::integer as example_image_height
from public.profiles_public pp
union all
select
  e.id, e.slug, e.nickname,
  date_part('year', age(current_date, e.birth_date))::int as age,
  c.plate, c.name, c.slug, d.name, d.slug,
  e.bio, e.bio_doc, e.published_at, e.updated_at,
  null::text as seo_title, null::text as seo_description, true as noindex,
  false as verified, false as sponsored,
  case when e.contact_authorized_at is not null then e.whatsapp_phone else null end as whatsapp_phone,
  true as is_example, e.image_url, e.image_width, e.image_height
from public.example_profiles e
join public.cities c on c.id = e.city_id
left join public.districts d on d.id = e.district_id and d.city_id = e.city_id
where e.visible and not exists (select 1 from public.profiles_public pp where pp.id = e.id);

-- 2. Yayın tetikleyicisi (eski tanım; yalnızca status değişiminde)
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
drop trigger if exists profiles_publish_guard on public.profiles;
create trigger profiles_publish_guard before insert or update of status on public.profiles
  for each row execute function enforce_publish_preconditions();

-- 3. Ülke kapısı nesneleri
drop trigger if exists countries_publication_guard on public.countries;
drop trigger if exists countries_insert_guard on public.countries;
drop function if exists public.guard_country_publication();
drop function if exists public.guard_country_insert();
drop table if exists public.country_publication_decisions;
drop function if exists public.apply_country_decision();
drop function if exists public.country_decisions_immutable();
drop function if exists public.country_publishable(text);
alter table public.countries drop column if exists decision_id, drop column if exists review_due, drop column if exists publication_status;

-- 4. Ülke tablosu yetkileri migration öncesine döner (yazma yalnızca RLS ile yöneticiye).
grant insert, update, delete on public.countries to authenticated;
drop policy if exists "admin all countries" on public.countries;
create policy "admin all countries" on public.countries for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Not: görünümlerdeki insert/update/delete yetkisi iptali (salt okunur) bilinçli olarak korunur;
-- bu görünümler zaten güncellenebilir değildir, iptal davranışı değiştirmez.

-- 5. Doğrulama
do $$
begin
  if to_regclass('public.country_publication_decisions') is not null then raise exception 'Geri alma doğrulaması: karar tablosu duruyor'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'countries' and column_name = 'publication_status') then
    raise exception 'Geri alma doğrulaması: publication_status sütunu duruyor';
  end if;
  if pg_get_viewdef('public.profiles_public'::regclass) like '%country_publishable%' then raise exception 'Geri alma doğrulaması: görünüm eski tanıma dönmedi'; end if;
end $$;

commit;
