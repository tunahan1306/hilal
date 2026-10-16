-- Optional, explicitly authorized WhatsApp contact; existing rows remain private.
alter table profiles add column whatsapp_phone text;
alter table profiles add column whatsapp_consent_at timestamptz;
alter table profiles add constraint whatsapp_mobile_format check (whatsapp_phone is null or whatsapp_phone ~ '^905[0-9]{9}$');
alter table profiles add constraint whatsapp_permission_requires_phone check (whatsapp_consent_at is null or whatsapp_phone is not null);

create function reset_changed_whatsapp_permission() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.whatsapp_phone is distinct from old.whatsapp_phone
    and new.whatsapp_consent_at is not distinct from old.whatsapp_consent_at then
    new.whatsapp_consent_at := null;
  end if;
  if old.status = 'published' and (new.whatsapp_phone is distinct from old.whatsapp_phone
    or new.whatsapp_consent_at is distinct from old.whatsapp_consent_at) then
    new.status := 'in_review';
    new.moderation_status := 'pending';
  end if;
  return new;
end;
$$;
create trigger reset_changed_whatsapp_permission before update on profiles
for each row execute function reset_changed_whatsapp_permission();

create or replace view profiles_public with (security_invoker = false) as
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
