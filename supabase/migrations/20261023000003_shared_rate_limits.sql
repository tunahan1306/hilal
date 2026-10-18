-- Sunucusuz instance'lar arasında paylaşılan oran sınırı (sabit pencere).
-- Süreç içi sayaç her instance'ta ayrı tutulduğu için tek başına güvenilir değildir.
-- Anahtarlar uygulamada özetlenir (ham IP/e-posta saklanmaz). Yalnızca service role erişir.
create table public.rate_limit_buckets (
  key text primary key check (char_length(key) between 1 and 200),
  count integer not null check (count >= 0),
  reset_at timestamptz not null
);
create index rate_limit_buckets_reset_idx on public.rate_limit_buckets (reset_at);
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare b public.rate_limit_buckets;
begin
  if p_limit < 1 or p_window_seconds < 1 then raise exception 'rate_limit_hit: geçersiz parametre'; end if;
  insert into public.rate_limit_buckets as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning * into b;
  return query select b.count <= p_limit, greatest(0, ceil(extract(epoch from b.reset_at - now())))::integer;
end $$;

create or replace function public.rate_limit_clear(p_key text) returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limit_buckets where key = p_key;
$$;

create or replace function public.rate_limit_purge() returns integer
language sql security definer set search_path = public as $$
  with d as (delete from public.rate_limit_buckets where reset_at < now() - interval '1 hour' returning 1)
  select count(*)::integer from d;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer), public.rate_limit_clear(text), public.rate_limit_purge() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer), public.rate_limit_clear(text), public.rate_limit_purge() to service_role;
