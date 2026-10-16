-- Owner-managed presentation/contact for the explicitly selected character records.
-- These fields do not assert real-person identity or documentary age verification.
alter table public.example_profiles drop constraint example_profiles_nickname_check;
alter table public.example_profiles drop constraint example_profiles_bio_check;
alter table public.example_profiles add constraint example_nickname_length check (char_length(nickname) between 2 and 40);
alter table public.example_profiles add constraint example_bio_length check (char_length(bio) between 20 and 600);
alter table public.example_profiles add column image_url text;
alter table public.example_profiles add column image_width integer check (image_width > 0);
alter table public.example_profiles add column image_height integer check (image_height > 0);
alter table public.example_profiles add column whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^905[0-9]{9}$');
alter table public.example_profiles add column contact_authorized_at timestamptz;
alter table public.example_profiles add constraint example_contact_permission check (whatsapp_phone is null or contact_authorized_at is not null);

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
