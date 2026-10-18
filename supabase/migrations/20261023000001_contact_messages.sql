-- İletişim formu mesajları. Kişisel veri içerir: yalnızca MFA'lı yöneticiler okuyabilir.
-- Ekleme yalnızca sunucu (service role) üzerinden; doğrulama, honeypot ve oran sınırından sonra.
create type public.contact_category as enum ('general', 'support', 'partnership', 'content_report', 'other');
create type public.contact_status as enum ('new', 'in_progress', 'answered', 'closed', 'spam');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  category public.contact_category not null,
  name text not null check (char_length(name) between 2 and 120 and name !~ '[<>]'),
  email citext not null check (char_length(email) <= 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  subject text not null check (char_length(subject) between 3 and 150 and subject !~ '[<>]'),
  message text not null check (char_length(message) between 20 and 3000 and message !~ '[<>]'),
  status public.contact_status not null default 'new',
  read_at timestamptz,
  -- Tuzlu IP özeti; ham IP saklanmaz. Yalnızca kötüye kullanım sınırı için.
  ip_hash text not null check (char_length(ip_hash) between 16 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contact_messages_inbox_idx on public.contact_messages (created_at desc, id desc);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index contact_messages_rate_idx on public.contact_messages (ip_hash, created_at);
create trigger contact_messages_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;
create policy "admin all contact_messages" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.contact_messages from anon;
