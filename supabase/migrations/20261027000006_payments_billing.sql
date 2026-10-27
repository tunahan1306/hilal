-- Modül F — Ödemeler ve Faturalama (yalnızca defter şeması — bkz. src/server/payments.ts
-- başlığındaki tasarım kararı notu). PaymentProvider her zaman PaymentsDisabledError
-- fırlattığı için bu tabloları yazan hiçbir Server Action yoktur; bu migration yalnızca
-- gerçek bir sağlayıcı sözleşme imzalandığında kullanılacak defter altyapısını kurar.
--
-- Modül D için hiçbir tablo/sütun/bayrak yoktur — kalıcı olarak kapsam dışı.

-- ---------------------------------------------------------------------
-- 1. Ödeme defteri — büyük ölçüde yalnızca eklenir (append-mostly). Bir iade, orijinal
--    satırın güncellenmesi değil, metadata'sında orijinali referans veren yeni bir satırdır
--    (bkz. 02a_DATA_MODEL.md "payment_transactions" notu) — uygulama katmanında uygulanan
--    bir kural, DB kısıtı değil (status pending→succeeded/failed gerçek bir geçiş olduğu
--    için tam bir immutability tetikleyicisi burada uygun değil).
-- ---------------------------------------------------------------------
create type payment_transaction_kind as enum ('subscription_charge', 'tip', 'ppv_purchase', 'payout', 'refund');
create type payment_transaction_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  kind payment_transaction_kind not null,
  payer_id uuid references app_users (id) on delete set null,
  payee_creator_id uuid references creator_accounts (id) on delete set null,
  amount_minor_units bigint not null check (amount_minor_units > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status payment_transaction_status not null default 'pending',
  provider_name text not null check (char_length(provider_name) between 2 and 60),
  external_ref text,
  -- Sağlayıcı çağrısından ÖNCE üretilir ve kaydedilir; bir Server Action'ın çökme sonrası
  -- tekrar denenmesi veya sağlayıcının en-az-bir-kez webhook teslimatı asla çift bakiye
  -- değişikliğine yol açmaz — bkz. 02c_MODULE_ARCHITECTURE.md §4.
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint payment_transactions_payer_or_payee check (payer_id is not null or payee_creator_id is not null)
);
create index payment_transactions_payer_idx on payment_transactions (payer_id, created_at desc);
create index payment_transactions_payee_idx on payment_transactions (payee_creator_id, created_at desc);

alter table payment_transactions enable row level security;
revoke all on payment_transactions from anon, authenticated;
grant select on payment_transactions to authenticated;
grant all on payment_transactions to service_role;
-- Gerçek yazma yolu yok (bkz. migration başlığı): insert RLS'i kasıtlı olarak yoktur,
-- creator_subscriptions ile aynı gerekçe.
create policy "payer read own transactions" on payment_transactions for select to authenticated
  using (auth.uid() = payer_id);
create policy "creator read own payee transactions" on payment_transactions for select to authenticated
  using (exists (select 1 from creator_accounts c where c.id = payee_creator_id and c.user_id = auth.uid()));
create policy "admin read transactions" on payment_transactions for select to authenticated using (is_admin());

comment on table payment_transactions is 'Ödeme defteri — PaymentProvider gerçek bir sağlayıcıyla değiştirilene kadar hiçbir satır gerçek bir satın almayla oluşamaz.';

-- ---------------------------------------------------------------------
-- 2. Sağlayıcı webhook olayı — (provider_name, external_event_id) tekilliği idempotency
--    garantisinin ta kendisidir (bkz. 02c_MODULE_ARCHITECTURE.md §4).
-- ---------------------------------------------------------------------
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null check (char_length(provider_name) between 2 and 60),
  external_event_id text not null check (char_length(external_event_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_name, external_event_id)
);

alter table webhook_events enable row level security;
revoke all on webhook_events from anon, authenticated;
grant select on webhook_events to authenticated;
grant all on webhook_events to service_role;
create policy "admin read webhook events" on webhook_events for select to authenticated using (is_admin());

comment on table webhook_events is 'Sağlayıcı webhook teslimatlarının idempotency kaydı; (provider_name, external_event_id) tekil olduğu için aynı olay iki kez işlenemez.';
