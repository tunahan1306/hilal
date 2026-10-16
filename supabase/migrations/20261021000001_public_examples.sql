-- Explicitly selected fictional examples are independent public snapshots.
-- Real profile publication/consent/verification policies remain unchanged.
create table public.example_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug like 'kurgu-kadin-%'),
  nickname text not null check (nickname like '%(Örnek)'),
  birth_date date not null check (birth_date <= date '2008-01-01'),
  city_id uuid not null references public.cities(id),
  district_id uuid references public.districts(id),
  bio text not null check (bio like 'KURGUSAL ÖRNEK%'),
  bio_doc jsonb,
  visible boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.example_profiles enable row level security;
revoke all on public.example_profiles from anon, authenticated;
grant all on public.example_profiles to service_role;
comment on table public.example_profiles is 'Explicitly public fictional examples; no real identity, contact, verification or photo data.';

create view public.discovery_profiles with (security_invoker = false) as
select pp.*, false as is_example from public.profiles_public pp
union all
select
  e.id, e.slug, e.nickname,
  date_part('year', age(current_date, e.birth_date))::int as age,
  c.plate, c.name, c.slug, d.name, d.slug,
  e.bio, e.bio_doc, e.published_at, e.updated_at,
  null::text as seo_title, null::text as seo_description, true as noindex,
  false as verified, false as sponsored, null::text as whatsapp_phone,
  true as is_example
from public.example_profiles e
join public.cities c on c.id = e.city_id
left join public.districts d on d.id = e.district_id and d.city_id = e.city_id
where e.visible and not exists (select 1 from public.profiles_public pp where pp.id = e.id);
grant select on public.discovery_profiles to anon, authenticated;
