-- Modül G — Ülke Politika Motoru (genelleştirilmiş): her yeni modülün özelliği için
-- ülke bazlı yayın kapısı. `country_publication_decisions` (20261025000001) İLE AYNI DESEN,
-- tek fark: tek bir "yayın" alanı yerine, özellik başına bir satır.
--
-- Mevcut `countries.publication_status` / `country_publication_decisions` DOKUNULMAZ — yalnızca
-- yönetim tarafından küratörlüğü yapılan keşif ürününü yönetmeye devam eder. Bu migration ONUN
-- YANINDA, yeni modüllerin (B/C/F) özellikleri için paralel bir motor kurar.
--
-- DİKKAT (operatör): uygulandığı anda hiçbir ülke/özellik çifti "permitted" değildir
-- (`not_reviewed`, fail-closed varsayılan). Türkiye dahil hiçbir ülke için bu migration
-- kendiliğinden bir karar vermez; hukuki onay uydurulmaz (docs/legal/LAUNCH_APPROVAL_CHECKLIST.md).
--
-- Modül D (bağımsız seks işçisi ilanı, hizmet rezervasyonu/ödemesine aracılık) için
-- `platform_features` tablosuna KASITLI OLARAK hiçbir satır eklenmez — devre dışı bir
-- özellik değil, bu kod tabanında hiç var olmayan bir özelliktir.

-- ---------------------------------------------------------------------
-- 1. Özellik kataloğu (referans tablosu)
-- ---------------------------------------------------------------------
create table platform_features (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);
insert into platform_features (code, description) values
  ('social_profiles', 'Kullanıcı sosyal profilleri (user_profiles) kamuya görünürlüğü'),
  ('private_messaging', 'Kullanıcılar arası özel mesajlaşma'),
  ('digital_content', 'Creator dijital içerik yayını (posts/media_assets)'),
  ('paid_subscriptions', 'Creator ücretli abonelik satışı'),
  ('paid_advertising', 'Ücretli öne çıkarma/premium özellikler'),
  ('platform_payments', 'Platform üzerinden ödeme/payout akışı (mock)');
revoke insert, update, delete, truncate on platform_features from anon, authenticated;
grant select on platform_features to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Ülke × özellik durumu ve karar kaydı (country_publication_decisions ile birebir desen)
-- ---------------------------------------------------------------------
create table country_feature_policies (
  country_code text not null references countries (code),
  feature_code text not null references platform_features (code),
  status text not null default 'not_reviewed' check (status in ('not_reviewed', 'permitted', 'prohibited')),
  review_due date,
  decision_id uuid,
  primary key (country_code, feature_code)
);

create table country_feature_decisions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references countries (code),
  feature_code text not null references platform_features (code),
  status text not null check (status in ('not_reviewed', 'permitted', 'prohibited')),
  approver_name text not null check (char_length(btrim(approver_name)) between 2 and 120),
  evidence_ref text check (evidence_ref is null or char_length(evidence_ref) <= 500),
  review_due date,
  restrictions text check (restrictions is null or char_length(restrictions) <= 1000),
  note text check (note is null or char_length(note) <= 1000),
  decided_by uuid not null, -- audit_logs.actor_id ile aynı gerekçe: hesap silinse de kanıt korunur (FK yok)
  decided_at timestamptz not null default now(),
  constraint permitted_requires_evidence check (
    status <> 'permitted' or (evidence_ref is not null and char_length(btrim(evidence_ref)) >= 3 and review_due is not null)
  )
);
create index country_feature_decisions_idx on country_feature_decisions (country_code, feature_code, decided_at desc);
comment on table country_feature_decisions is 'Append-only ülke×özellik politika kararı; country_feature_policies.status yalnızca bu tablodan türetilir.';

alter table country_feature_policies enable row level security;
revoke all on country_feature_policies from anon, authenticated;
grant select on country_feature_policies to anon, authenticated;
grant all on country_feature_policies to service_role;

alter table country_feature_decisions enable row level security;
revoke all on country_feature_decisions from anon, authenticated;
grant select, insert on country_feature_decisions to authenticated;
grant all on country_feature_decisions to service_role;
create policy "admin read feature decisions" on country_feature_decisions
  for select to authenticated using (is_admin());
-- country_publication_decisions ile birebir: yalnızca sahip rolündeki yönetici (MFA ile)
-- ve yalnızca kendi adına karar ekleyebilir.
create policy "owner insert feature decisions" on country_feature_decisions
  for insert to authenticated
  with check (is_admin() and decided_by = auth.uid()
              and exists (select 1 from admins a where a.id = auth.uid() and a.role = 'owner'));

create or replace function country_feature_decisions_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Ülke×özellik politika kararları değiştirilemez veya silinemez; yeni karar ekleyin';
end $$;
create trigger country_feature_decisions_no_change before update or delete on country_feature_decisions
  for each row execute function country_feature_decisions_immutable();

-- Karar eklenince politika satırı upsert edilir (tek yazma yolu) — audit_logs'a admin eylemi
-- olarak yazılır (actor_id admins(id)'e referans verir, bu karar her zaman bir admin tarafından
-- verilir, country_publication_decisions ile aynı yetki modeli).
create or replace function apply_country_feature_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('hilal.feature_decision', 'on', true);
  insert into country_feature_policies (country_code, feature_code, status, review_due, decision_id)
  values (new.country_code, new.feature_code, new.status, new.review_due, new.id)
  on conflict (country_code, feature_code) do update
    set status = excluded.status, review_due = excluded.review_due, decision_id = excluded.decision_id;
  perform set_config('hilal.feature_decision', 'off', true);
  insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (new.decided_by, 'country_feature.policy_decision', 'country_feature_policy',
          new.country_code || ':' || new.feature_code,
          jsonb_build_object('decision_id', new.id, 'country_code', new.country_code,
            'feature_code', new.feature_code, 'status', new.status, 'review_due', new.review_due,
            'approver_name', new.approver_name));
  return new;
end $$;
revoke all on function apply_country_feature_decision() from public, anon, authenticated;
create trigger country_feature_decision_apply after insert on country_feature_decisions
  for each row execute function apply_country_feature_decision();

-- country_feature_policies yalnızca karar kaydı yoluyla (trigger) değiştirilebilir.
create or replace function guard_country_feature_policy() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('hilal.feature_decision', true), 'off') <> 'on' then
    raise exception 'country_feature_policies yalnızca country_feature_decisions kaydıyla değiştirilebilir';
  end if;
  return new;
end $$;
create trigger country_feature_policies_guard before insert or update on country_feature_policies
  for each row execute function guard_country_feature_policy();

-- ---------------------------------------------------------------------
-- 3. Fail-closed sorgu fonksiyonu — country_publishable() ile birebir desen
-- ---------------------------------------------------------------------
create or replace function country_feature_publishable(p_country text, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from country_feature_policies f
     where f.country_code = p_country and f.feature_code = p_feature
       and f.status = 'permitted' and f.review_due is not null and f.review_due >= current_date
  );
$$;
revoke all on function country_feature_publishable(text, text) from public;
grant execute on function country_feature_publishable(text, text) to anon, authenticated, service_role;
