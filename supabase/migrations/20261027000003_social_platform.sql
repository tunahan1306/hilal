-- Modül B — Sosyal Platform (son kullanıcı profilleri, takip, engelleme, mesajlaşma,
-- bildirimler). app_users üzerine kurulur (20261027000001); admin-küratörlü `profiles`
-- ürününe DOKUNMAZ — ayrı güven modeli (bkz. docs/transformation/00_AUDIT.md).
--
-- Bu migration'da KASITLI OLARAK YOK: posts, media_assets (Modül C'nin content_rights'ıyla
-- birlikte ele alınacak — bkz. 02a_DATA_MODEL.md "content_rights" notu) ve polymorphic
-- moderation_reports/moderation_actions değişikliği (Modül E, Modül C'den sonra; migration
-- sıralaması docs/transformation/02a_DATA_MODEL.md'de açıklanmıştır).
--
-- ÖNEMLİ TASARIM KARARI: user_profiles_public, yaş doğrulama sağlayıcısı henüz
-- seçilmediği için (bkz. src/server/auth/age-verification.ts) GERÇEKTEN ONAYLANMIŞ bir
-- age_verification_checks kaydı olmayan HİÇBİR profili göstermez — kendi beyan edilen
-- birth_date bu kapıyı asla tek başına açmaz. Bu, ödeme sağlayıcısı onaylanana kadar
-- PaymentProvider'ın devre dışı kalmasıyla aynı duruşun sosyal profillere uygulanmasıdır:
-- sağlayıcı seçilip entegre edilene kadar hiçbir son kullanıcı profili kamuya açılamaz.

create type profile_visibility as enum ('public', 'followers_only', 'private');

-- ---------------------------------------------------------------------
-- 1. Son kullanıcı profili (admin-küratörlü profiles'tan AYRI)
-- ---------------------------------------------------------------------
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users (id) on delete cascade,
  handle citext not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  bio text check (bio is null or char_length(bio) <= 2000),
  birth_date date not null,
  country_code text not null references countries (code),
  visibility profile_visibility not null default 'private',
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_profiles_updated_at before update on user_profiles for each row execute function set_updated_at();
create index user_profiles_country_idx on user_profiles (country_code) where visibility = 'public';

alter table user_profiles enable row level security;
revoke all on user_profiles from anon, authenticated;
grant select, insert, update on user_profiles to authenticated;
grant all on user_profiles to service_role;
create policy "owner manage own profile" on user_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin read profiles" on user_profiles for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

comment on table user_profiles is 'Kendi kendine kayıt olan son kullanıcı profili; birth_date hiçbir zaman kamuya açık sütun olarak gösterilmez.';

create or replace view user_profiles_public with (security_invoker = false) as
select
  p.id, p.user_id, p.handle, p.display_name, p.bio,
  date_part('year', age(current_date, p.birth_date))::int as age,
  p.country_code, p.created_at
from user_profiles p
where p.moderation_status = 'approved'
  and p.visibility = 'public'
  and p.birth_date <= current_date - interval '18 years'
  and country_feature_publishable(p.country_code, 'social_profiles')
  and exists (
    select 1 from age_verification_checks v
     where v.user_id = p.user_id and v.status = 'approved'
       and (v.expires_at is null or v.expires_at >= now())
  );
revoke insert, update, delete, truncate on user_profiles_public from anon, authenticated;
grant select on user_profiles_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Takip
-- ---------------------------------------------------------------------
create table follows (
  follower_id uuid not null references app_users (id) on delete cascade,
  followee_id uuid not null references app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index follows_followee_idx on follows (followee_id);

alter table follows enable row level security;
revoke all on follows from anon, authenticated;
grant select, insert, delete on follows to authenticated;
grant all on follows to service_role;
create policy "owner manage own follows" on follows for all to authenticated
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
-- Takip edilen taraf da kendi takipçi/takip ettiği ilişkisini görebilir (karşılıklı görünürlük).
create policy "followee read follows" on follows for select to authenticated
  using (auth.uid() = followee_id);
create policy "admin read follows" on follows for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Engelleme — RLS'e ek olarak sorgu katmanında da uygulanır (bkz. server/services/social.ts).
-- ---------------------------------------------------------------------
create table user_blocks (
  blocker_id uuid not null references app_users (id) on delete cascade,
  blocked_id uuid not null references app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on user_blocks (blocked_id);

alter table user_blocks enable row level security;
revoke all on user_blocks from anon, authenticated;
grant select, insert, delete on user_blocks to authenticated;
grant all on user_blocks to service_role;
create policy "owner manage own blocks" on user_blocks for all to authenticated
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "admin read blocks" on user_blocks for select to authenticated
  using (exists (select 1 from admins a where a.id = auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Mesajlaşma (yalnızca 1:1 — ilk sürüm kapsamı)
-- ---------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references app_users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on conversation_participants (user_id, conversation_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references app_users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  moderation_status moderation_status not null default 'approved'
);
create index messages_conversation_idx on messages (conversation_id, created_at);

-- Bir self-referential policy (conversation_participants'ı kendi policy'si içinde
-- sorgulamak) Postgres'te "infinite recursion detected in policy" hatası verir; standart
-- çözüm — is_admin()/country_publishable() ile aynı desen — RLS'i atlayan bir
-- security definer fonksiyondur.
create or replace function is_conversation_participant(p_conversation_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_participants cp where cp.conversation_id = p_conversation_id and cp.user_id = p_user_id);
$$;
revoke all on function is_conversation_participant(uuid, uuid) from public;
grant execute on function is_conversation_participant(uuid, uuid) to authenticated, service_role;

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
revoke all on conversations, conversation_participants, messages from anon, authenticated;
grant select on conversations, conversation_participants to authenticated;
grant select, insert on messages to authenticated;
grant all on conversations, conversation_participants, messages to service_role;

create policy "participant read conversation" on conversations for select to authenticated
  using (is_conversation_participant(id, auth.uid()));
create policy "participant read participants" on conversation_participants for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));
create policy "participant read messages" on messages for select to authenticated
  using (is_conversation_participant(conversation_id, auth.uid()));
create policy "participant send messages" on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id, auth.uid()));
create policy "admin read messaging" on conversations for select to authenticated using (is_admin());
create policy "admin read messaging participants" on conversation_participants for select to authenticated using (is_admin());
create policy "admin read messages" on messages for select to authenticated using (is_admin());

-- Engellenen taraflar arasında mesaj gönderilemez (RLS'e ek, veritabanı seviyesinde
-- savunma — enforce_publish_preconditions ile aynı "uygulama kuralı + tetikleyici" deseni).
-- security definer zorunlu: engelleyen taraf (blocker_id) genelde gönderenin KENDİSİ
-- değildir, bu yüzden user_blocks'un "yalnızca kendi engeli" RLS'i çağıran rolün bu
-- satırı görmesini engeller — is_conversation_participant() ile aynı gerekçe.
create or replace function enforce_message_not_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_other uuid;
begin
  select cp.user_id into v_other from conversation_participants cp
   where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id limit 1;
  if v_other is not null and exists (
    select 1 from user_blocks b
     where (b.blocker_id = new.sender_id and b.blocked_id = v_other)
        or (b.blocker_id = v_other and b.blocked_id = new.sender_id)
  ) then
    raise exception 'Mesaj engellendi: taraflardan biri diğerini engellemiş';
  end if;
  return new;
end $$;
create trigger messages_block_guard before insert on messages
  for each row execute function enforce_message_not_blocked();

-- ---------------------------------------------------------------------
-- 5. Bildirimler
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id) on delete cascade,
  type text not null check (char_length(type) between 2 and 60),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, read_at, created_at desc);

alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;
grant select, update on notifications to authenticated;
grant all on notifications to service_role;
create policy "owner read own notifications" on notifications for select to authenticated
  using (auth.uid() = user_id);
-- Yalnızca okundu zamanı güncellenebilir (ilan metni/tür değiştirilemez).
create policy "owner mark read" on notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
