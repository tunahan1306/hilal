-- 13) Modül G — genelleştirilmiş ülke×özellik politika motoru (yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).
-- country_publication_decisions (test 12) İLE KARIŞTIRILMAMALI: bu motor tamamen ayrı,
-- yeni modüllerin (B/C/F) özelliklerini yönetir.

do $$
begin
  -- 13.1 Varsayılan: hiçbir ülke×özellik çifti incelenmedi; fail-closed.
  if country_feature_publishable('de', 'digital_content') then
    raise exception 'TEST FAILED: DE/digital_content varsayılan olarak açık';
  end if;
  if exists (select 1 from country_feature_policies where country_code = 'de' and feature_code = 'digital_content') then
    raise exception 'TEST FAILED: karar verilmeden country_feature_policies satırı var';
  end if;

  -- 13.2 Kanıtsız veya gözden geçirme tarihsiz "permitted" kararı reddedilir.
  begin
    insert into country_feature_decisions (country_code, feature_code, status, approver_name, review_due, decided_by)
    values ('de', 'digital_content', 'permitted', 'Biri', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: kanıtsız izin kararı kabul edildi';
  exception when check_violation then null;
  end;
  begin
    insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, decided_by)
    values ('de', 'digital_content', 'permitted', 'Biri', 'REF-1', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: gözden geçirme tarihsiz izin kararı kabul edildi';
  exception when check_violation then null;
  end;

  -- 13.3 country_feature_policies karar kaydı dışında doğrudan değiştirilemez.
  begin
    insert into country_feature_policies (country_code, feature_code, status) values ('de', 'digital_content', 'permitted');
    raise exception 'TEST FAILED: country_feature_policies doğrudan yazılabildi';
  exception when raise_exception then
    if sqlerrm not like 'country_feature_policies yalnızca%' then raise; end if;
  end;
end $$;

-- 13.4 Yetki: anon karar ekleyemez/okuyamaz; MFA'lı moderatör karar ekleyemez; sahip ekleyebilir.
set local role anon;
do $$
begin
  begin
    insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
    values ('de', 'digital_content', 'permitted', 'Anon', 'REF', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: anon ülke×özellik kararı ekleyebildi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from country_feature_decisions;
    raise exception 'TEST FAILED: anon ülke×özellik kararlarını okuyabildi';
  exception when insufficient_privilege then null;
  end;
  -- Politika durumu (country_feature_policies) kamuya açık okunabilir olmalı (fail-closed
  -- varsayılanı istemci tarafında da göstermek için); karar kaydı (decisions) ise değil.
  if not has_table_privilege('anon', 'public.country_feature_policies', 'select') then
    raise exception 'TEST FAILED: anon country_feature_policies''i okuyamıyor';
  end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select set_config('request.jwt.claims', '{"aal":"aal2"}', true);
do $$
begin
  begin
    insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
    values ('de', 'digital_content', 'permitted', 'Mod', 'REF', current_date + 10, '00000000-0000-0000-0000-0000000000a2');
    raise exception 'TEST FAILED: moderatör ülke×özellik kararı ekleyebildi';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('de', 'digital_content', 'permitted', 'Sentetik Hukuk Test', 'TEST-DE-FEATURE-1', current_date + 10, '00000000-0000-0000-0000-0000000000a1');
reset role;

do $$
declare n int;
begin
  -- 13.5 Karar politika satırına yansır ve denetim kaydı düşer; karar değiştirilemez/silinemez.
  if not country_feature_publishable('de', 'digital_content') then
    raise exception 'TEST FAILED: sahip kararı DE/digital_content''i açmadı';
  end if;
  -- Aynı ülkenin başka bir özelliği (private_messaging) hâlâ kapalı olmalı — özellik bazlı izolasyon.
  if country_feature_publishable('de', 'private_messaging') then
    raise exception 'TEST FAILED: bir özelliğin izni diğerine sızdı';
  end if;
  select count(*) into n from audit_logs where action = 'country_feature.policy_decision' and entity_id = 'de:digital_content';
  if n <> 1 then raise exception 'TEST FAILED: karar denetim kaydı %', n; end if;
  begin
    update country_feature_decisions set status = 'prohibited' where country_code = 'de' and feature_code = 'digital_content';
    raise exception 'TEST FAILED: karar güncellenebildi';
  exception when raise_exception then
    if sqlerrm not like 'Ülke×özellik politika kararları%' then raise; end if;
  end;
  begin
    delete from country_feature_decisions where country_code = 'de' and feature_code = 'digital_content';
    raise exception 'TEST FAILED: karar silinebildi';
  exception when raise_exception then
    if sqlerrm not like 'Ülke×özellik politika kararları%' then raise; end if;
  end;
end $$;

-- 13.6 Gözden geçirme tarihi geçen onay kendiliğinden kapanır (cron beklemeden).
insert into country_feature_decisions (country_code, feature_code, status, approver_name, evidence_ref, review_due, decided_by)
values ('de', 'digital_content', 'permitted', 'Sentetik Hukuk Test', 'TEST-DE-FEATURE-2', current_date - 1, '00000000-0000-0000-0000-0000000000a1');
do $$
begin
  if country_feature_publishable('de', 'digital_content') then
    raise exception 'TEST FAILED: süresi geçmiş ülke×özellik onayı hâlâ geçerli';
  end if;
end $$;

-- 13.7 "prohibited" kararı özelliği kapalı tutar (kanıt zorunlu değil, sorumlu kişi zorunlu).
insert into country_feature_decisions (country_code, feature_code, status, approver_name, note, decided_by)
values ('nl', 'paid_subscriptions', 'prohibited', 'Sentetik Hukuk Test', 'Yasak kararı', '00000000-0000-0000-0000-0000000000a1');
do $$
begin
  if (select status from country_feature_policies where country_code = 'nl' and feature_code = 'paid_subscriptions') <> 'prohibited' then
    raise exception 'TEST FAILED: NL/paid_subscriptions yasak kararı yansımadı';
  end if;
  if country_feature_publishable('nl', 'paid_subscriptions') then raise exception 'TEST FAILED: yasak özellik açık'; end if;
  begin
    insert into country_feature_decisions (country_code, feature_code, status, approver_name, decided_by)
    values ('nl', 'paid_subscriptions', 'prohibited', '', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'TEST FAILED: sorumlu kişisiz karar kabul edildi';
  exception when check_violation then null;
  end;
end $$;

-- 13.8 Modül D için hiçbir özellik kodu yoktur (seçmeli: devre dışı değil, hiç yok).
do $$
begin
  if exists (select 1 from platform_features where code in ('independent_advertising', 'service_booking')) then
    raise exception 'TEST FAILED: Modül D için özellik kodu katalogda bulundu';
  end if;
end $$;
