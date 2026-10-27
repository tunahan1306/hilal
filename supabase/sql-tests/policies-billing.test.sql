-- 17) Modül F — ödeme defteri (yalnızca şema; yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).
-- PaymentProvider her zaman PaymentsDisabledError fırlattığı için bu satırlar hiçbir
-- gerçek Server Action tarafından oluşturulmaz — bu testler yalnızca defterin kendi
-- kısıt/RLS davranışını doğrular (f1/c1 policies-creator.test.sql'den, aynı işlemde).

insert into payment_transactions (id, kind, payer_id, amount_minor_units, currency, status, provider_name, idempotency_key)
values ('00000000-0000-0000-0000-0000000000c6', 'tip', '00000000-0000-0000-0000-0000000000f2', 500, 'try', 'succeeded', 'test-provider', 'idem-key-1');

-- 17.1 idempotency_key tekilliği.
do $$
begin
  begin
    insert into payment_transactions (kind, payer_id, amount_minor_units, currency, status, provider_name, idempotency_key)
    values ('tip', '00000000-0000-0000-0000-0000000000f2', 500, 'try', 'succeeded', 'test-provider', 'idem-key-1');
    raise exception 'TEST FAILED: aynı idempotency_key ile ikinci işlem eklenebildi';
  exception when unique_violation then null;
  end;
end $$;

-- 17.2 payer_id veya payee_creator_id'den en az biri zorunludur.
do $$
begin
  begin
    insert into payment_transactions (kind, amount_minor_units, currency, status, provider_name, idempotency_key)
    values ('payout', 100, 'try', 'pending', 'test-provider', 'idem-key-2');
    raise exception 'TEST FAILED: ne ödeyen ne alıcı olmadan işlem eklenebildi';
  exception when check_violation then null;
  end;
end $$;

insert into payment_transactions (id, kind, payee_creator_id, amount_minor_units, currency, status, provider_name, idempotency_key)
values ('00000000-0000-0000-0000-0000000000c7', 'payout', '00000000-0000-0000-0000-0000000000c1', 1000, 'try', 'pending', 'test-provider', 'idem-key-3');

-- 17.3 RLS: ödeyen yalnızca kendi işlemini görür; creator yalnızca kendi payout'unu görür; ilgisiz kullanıcı hiçbirini göremez.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
do $$
begin
  if not exists (select 1 from payment_transactions where id = '00000000-0000-0000-0000-0000000000c6') then
    raise exception 'TEST FAILED: ödeyen kendi işlemini göremiyor';
  end if;
  if exists (select 1 from payment_transactions where id = '00000000-0000-0000-0000-0000000000c7') then
    raise exception 'TEST FAILED: ilgisiz kullanıcı başkasının payout''unu görebiliyor';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
begin
  if not exists (select 1 from payment_transactions where id = '00000000-0000-0000-0000-0000000000c7') then
    raise exception 'TEST FAILED: creator kendi payout''unu göremiyor';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if exists (select 1 from payment_transactions where id in ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c7')) then
    raise exception 'TEST FAILED: ilgisiz kullanıcı başkasının işlemlerini görebiliyor';
  end if;
end $$;
reset role;

-- 17.4 webhook_events: (provider_name, external_event_id) tekilliği.
insert into webhook_events (provider_name, external_event_id, payload) values ('test-provider', 'evt-1', '{}'::jsonb);
do $$
begin
  begin
    insert into webhook_events (provider_name, external_event_id, payload) values ('test-provider', 'evt-1', '{"retry": true}'::jsonb);
    raise exception 'TEST FAILED: aynı (provider_name, external_event_id) ile ikinci olay eklenebildi';
  exception when unique_violation then null;
  end;
end $$;

-- 17.5 RLS: yönetici olmayan authenticated rolü webhook_events'i hiç göremez (yalnızca admin).
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
begin
  if exists (select 1 from webhook_events where provider_name = 'test-provider' and external_event_id = 'evt-1') then
    raise exception 'TEST FAILED: yönetici olmayan kullanıcı webhook olayını görebiliyor';
  end if;
end $$;
reset role;
