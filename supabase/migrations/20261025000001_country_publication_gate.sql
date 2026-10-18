-- Ülke yayın kapısı, rıza geri çekme ve paylaşılan iletişim numarası koruması.
--
-- 1. Her ülkenin yayın durumu vardır: not_reviewed (varsayılan) | permitted | prohibited.
--    Konum verisinin var olması bir ülkeyi yayına açmaz. "permitted" yalnızca sorumlu kişi,
--    kanıt referansı ve bir sonraki gözden geçirme tarihiyle kaydedilmiş bir kararla verilir.
--    Gözden geçirme tarihi geçen ülke kendiliğinden kapanır.
-- 2. Kararlar yalnızca eklenir (değiştirilemez/silinemez). countries satırındaki durum yalnızca
--    karar kaydından türetilir; doğrudan güncellenemez.
-- 3. Kamuya açık görünümler (profiles_public → profile_media_public, profile_interests_public,
--    discovery_profiles) ülke kapısını, yaş doğrulamasını ve geçerli rızaları her sorguda uygular:
--    onay geri çekilirse ilgili profiller arka plan işi olmadan anında kamuya kapanır.
-- 4. Yayın tetikleyicisi kapalı ülkede yayını, yayındaki profilin kapalı ülkeye taşınmasını ve
--    başka bir yayındaki profille aynı WhatsApp numarasını reddeder.
-- 5. Kurgusal örnek kayıtlar (example_profiles) aynı ülke kapısına tabidir ve kamuya hiçbir zaman
--    iletişim numarası taşımaz.
--
-- DİKKAT (operatör): Uygulandığı anda hiçbir ülke "permitted" değildir; Türkiye dahil tüm profiller
-- kamuya kapanır. Türkiye için karar, migration ile aynı bakım penceresinde, gerçek sorumlu kişi ve
-- kanıt referansıyla kaydedilmelidir (docs/HILAL_V2_COMPLIANCE.md §3). Migration bu kararı kendisi
-- vermez: hukuki onay uydurulmaz.

-- ---------------------------------------------------------------------
-- 1. Ülke yayın durumu ve karar kaydı
-- ---------------------------------------------------------------------
alter table public.countries
  add column if not exists publication_status text not null default 'not_reviewed'
    check (publication_status in ('not_reviewed', 'permitted', 'prohibited')),
  add column if not exists review_due date,
  add column if not exists decision_id uuid;

create table if not exists public.country_publication_decisions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries (code),
  status text not null check (status in ('not_reviewed', 'permitted', 'prohibited')),
  -- Kararı veren sorumlu kişi (ör. hukuk danışmanı) ve dayanak belge referansı.
  approver_name text not null check (char_length(btrim(approver_name)) between 2 and 120),
  evidence_ref text check (evidence_ref is null or char_length(evidence_ref) <= 500),
  review_due date,
  restrictions text check (restrictions is null or char_length(restrictions) <= 1000),
  note text check (note is null or char_length(note) <= 1000),
  -- Kaydı giren yönetici. audit_logs gibi: hesap silinse de kanıt korunur (FK yok).
  decided_by uuid not null,
  decided_at timestamptz not null default now(),
  constraint permitted_requires_evidence check (
    status <> 'permitted' or (evidence_ref is not null and char_length(btrim(evidence_ref)) >= 3 and review_due is not null)
  )
);
create index if not exists country_decisions_country_idx on public.country_publication_decisions (country_code, decided_at desc);
comment on table public.country_publication_decisions is 'Append-only record of country publication decisions; countries.publication_status is derived from the latest row.';

alter table public.country_publication_decisions enable row level security;
revoke all on public.country_publication_decisions from anon, authenticated;
grant select, insert on public.country_publication_decisions to authenticated;
grant all on public.country_publication_decisions to service_role;
create policy "admin read decisions" on public.country_publication_decisions
  for select to authenticated using (public.is_admin());
-- Yalnızca sahip rolündeki yönetici (MFA ile) ve yalnızca kendi adına karar ekleyebilir.
create policy "owner insert decisions" on public.country_publication_decisions
  for insert to authenticated
  with check (public.is_admin() and decided_by = auth.uid()
              and exists (select 1 from public.admins a where a.id = auth.uid() and a.role = 'owner'));

create or replace function public.country_decisions_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Ülke yayın kararları değiştirilemez veya silinemez; yeni karar ekleyin';
end $$;
drop trigger if exists country_decisions_no_change on public.country_publication_decisions;
create trigger country_decisions_no_change before update or delete on public.country_publication_decisions
  for each row execute function public.country_decisions_immutable();

-- Karar eklenince ülke satırı güncellenir (tek yazma yolu).
create or replace function public.apply_country_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('hilal.country_decision', 'on', true);
  update public.countries
     set publication_status = new.status, review_due = new.review_due, decision_id = new.id
   where code = new.country_code;
  perform set_config('hilal.country_decision', 'off', true);
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  select a.id, 'country.publication_decision', 'country', new.country_code,
         jsonb_build_object('decision_id', new.id, 'status', new.status, 'review_due', new.review_due, 'approver_name', new.approver_name)
    from (select new.decided_by as id) x left join public.admins a on a.id = x.id;
  return new;
end $$;
revoke all on function public.apply_country_decision() from public, anon, authenticated;
drop trigger if exists country_decision_apply on public.country_publication_decisions;
create trigger country_decision_apply after insert on public.country_publication_decisions
  for each row execute function public.apply_country_decision();

-- countries.publication_status / review_due / decision_id karar kaydı dışında değiştirilemez.
create or replace function public.guard_country_publication() returns trigger
language plpgsql as $$
begin
  if (new.publication_status, new.review_due, new.decision_id) is distinct from (old.publication_status, old.review_due, old.decision_id)
     and coalesce(current_setting('hilal.country_decision', true), 'off') <> 'on' then
    raise exception 'Ülke yayın durumu yalnızca country_publication_decisions kaydıyla değiştirilebilir';
  end if;
  return new;
end $$;
drop trigger if exists countries_publication_guard on public.countries;
create trigger countries_publication_guard before update on public.countries
  for each row execute function public.guard_country_publication();
create or replace function public.guard_country_insert() returns trigger
language plpgsql as $$
begin
  if new.publication_status <> 'not_reviewed' or new.review_due is not null or new.decision_id is not null then
    raise exception 'Yeni ülke not_reviewed olarak eklenir; yayın kararı ayrıca kaydedilir';
  end if;
  return new;
end $$;
drop trigger if exists countries_insert_guard on public.countries;
create trigger countries_insert_guard before insert on public.countries
  for each row execute function public.guard_country_insert();

-- Ülkeler yönetici tarafından da doğrudan yazılamaz (konum dizini migration ile yönetilir).
drop policy if exists "admin all countries" on public.countries;
revoke insert, update, delete, truncate on public.countries from anon, authenticated;

create or replace function public.country_publishable(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.countries c
     where c.code = p_code and c.publication_status = 'permitted' and c.review_due is not null and c.review_due >= current_date
  );
$$;
revoke all on function public.country_publishable(text) from public;
grant execute on function public.country_publishable(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. Kamuya açık görünümler
-- ---------------------------------------------------------------------
-- Sütun listesi ve sırası değişmez (bağımlı görünümler korunur); yalnızca koşullar sıkılaşır.
create or replace view public.profiles_public with (security_invoker = false) as
select
  p.id, p.slug, p.nickname,
  date_part('year', age(current_date, p.birth_date))::int as age,
  c.plate as city_plate, c.name as city_name, c.slug as city_slug,
  d.name as district_name, d.slug as district_slug,
  p.bio, p.bio_doc, p.published_at, p.updated_at,
  p.seo_title, p.seo_description, p.noindex,
  exists (select 1 from public.verification_records v
           where v.profile_id = p.id and v.type = 'identity' and v.status = 'approved') as verified,
  coalesce((select s.sponsored and mp.sponsored_eligible
              from public.subscriptions s join public.membership_plans mp on mp.id = s.plan_id
             where s.profile_id = p.id and s.status = 'active' and now() between s.starts_at and s.ends_at
             order by s.ends_at desc limit 1), false) as sponsored,
  -- Numara yalnızca açık paylaşım izni varsa ve başka hiçbir yayındaki profil / örnek kayıt
  -- aynı numarayı kullanmıyorsa gösterilir (birden çok profilin tek numaraya yönlenmesi engellenir).
  case when p.whatsapp_consent_at is not null
        and not exists (select 1 from public.profiles o where o.whatsapp_phone = p.whatsapp_phone and o.id <> p.id and o.status = 'published')
        and not exists (select 1 from public.example_profiles e where e.whatsapp_phone = p.whatsapp_phone and e.id <> p.id)
       then p.whatsapp_phone else null end as whatsapp_phone
from public.profiles p
join public.cities c on c.id = p.city_id
left join public.districts d on d.id = p.district_id
where p.status = 'published'
  and p.moderation_status = 'approved'
  and p.birth_date <= current_date - interval '18 years'
  and public.country_publishable(c.country_code)
  and exists (select 1 from public.verification_records v where v.profile_id = p.id and v.type = 'age' and v.status = 'approved')
  and exists (select 1 from public.profile_consents pc where pc.profile_id = p.id and pc.type = 'publication' and pc.revoked_at is null)
  and exists (select 1 from public.profile_consents pc where pc.profile_id = p.id and pc.type = 'photo_rights' and pc.revoked_at is null)
  and exists (select 1 from public.profile_media m
               where m.profile_id = p.id and m.kind = 'image' and m.status = 'ready'
                 and m.rights_confirmed and m.moderation = 'approved' and m.public_url is not null);

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
  -- Kurgusal kayıt gerçek bir kişiye ait iletişim kanalı taşıyamaz.
  null::text as whatsapp_phone,
  true as is_example, e.image_url, e.image_width, e.image_height
from public.example_profiles e
join public.cities c on c.id = e.city_id
left join public.districts d on d.id = e.district_id and d.city_id = e.city_id
where e.visible
  and public.country_publishable(c.country_code)
  and not exists (select 1 from public.profiles_public pp where pp.id = e.id);

-- Görünümler salt okunurdur.
revoke insert, update, delete, truncate on public.profiles_public, public.profile_media_public,
  public.profile_interests_public, public.discovery_profiles from anon, authenticated;
grant select on public.profiles_public, public.profile_media_public, public.profile_interests_public, public.discovery_profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Yayın tetikleyicisi
-- ---------------------------------------------------------------------
create or replace function public.enforce_publish_preconditions()
returns trigger language plpgsql set search_path = public as $$
declare
  v_country text;
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

  -- Yayında olan (veya yayına alınan) profil için: ülke kapısı ve iletişim numarası tekliği.
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published'
      or new.city_id is distinct from old.city_id or new.whatsapp_phone is distinct from old.whatsapp_phone) then
    select c.country_code into v_country from cities c where c.id = new.city_id;
    if not public.country_publishable(v_country) then
      raise exception 'Yayın engellendi: % için yayın onayı yok veya süresi dolmuş', upper(coalesce(v_country, '?'));
    end if;
    if new.whatsapp_phone is not null and (
         exists (select 1 from profiles o where o.whatsapp_phone = new.whatsapp_phone and o.id <> new.id and o.status = 'published')
      or exists (select 1 from example_profiles e where e.whatsapp_phone = new.whatsapp_phone and e.id <> new.id)) then
      raise exception 'Yayın engellendi: bu WhatsApp numarası başka bir profilde kullanılıyor';
    end if;
  end if;
  return new;
end $$;

-- Yayındaki profilin ili veya numarası değişince de denetlenir.
drop trigger if exists profiles_publish_guard on public.profiles;
create trigger profiles_publish_guard before insert or update of status, city_id, whatsapp_phone on public.profiles
  for each row execute function public.enforce_publish_preconditions();
