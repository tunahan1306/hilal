-- 16) Modül E — moderasyon genelleştirmesi (yalnızca sentetik veri).
-- policies.test.sql içinden, aynı işlem içinde çalıştırılır (sonunda rollback).
-- content_id'nin FK'si yok (audit_logs.entity_id ile aynı gerekçe); bu testler yalnızca
-- moderation_reports/moderation_actions'ın kendi kısıt/tetikleyici davranışını doğrular.

-- 16.1 Eski çağrı şekli (yalnızca profile_id — content_type/content_id verilmez): tetikleyici
-- content_type='profile' varsayılanını ve content_id=profile_id türetimini uygular.
insert into moderation_reports (id, profile_id, category, description, reporter_hash)
values ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000b1', 'other', 'Eski çağrı şekli testi (demo, en az 10 karakter)', 'demo');
do $$
begin
  if not exists (
    select 1 from moderation_reports
     where id = '00000000-0000-0000-0000-0000000000ba'
       and content_type = 'profile' and content_id = '00000000-0000-0000-0000-0000000000b1'
  ) then
    raise exception 'TEST FAILED: eski çağrı şeklinde content_type/content_id türetilmedi';
  end if;
end $$;

-- 16.2 Yeni modül içeriği: profile_id null, content_type/content_id açıkça verilir.
insert into moderation_reports (id, profile_id, content_type, content_id, category, description, reporter_hash)
values ('00000000-0000-0000-0000-0000000000bb', null, 'post', '00000000-0000-0000-0000-0000000000bc', 'spam', 'Modül B içeriği için genelleştirilmiş şikâyet testi', 'demo');
do $$
begin
  if not exists (select 1 from moderation_reports where id = '00000000-0000-0000-0000-0000000000bb' and profile_id is null and content_type = 'post') then
    raise exception 'TEST FAILED: profil dışı içerik şikâyeti beklendiği gibi kaydedilmedi';
  end if;
end $$;

-- 16.3 content_type='profile' iken profile_id zorunludur (tetikleyici reddeder).
do $$
begin
  begin
    insert into moderation_reports (profile_id, content_type, content_id, category, description, reporter_hash)
    values (null, 'profile', '00000000-0000-0000-0000-0000000000b1', 'other', 'profile_id olmadan profil şikâyeti testi', 'demo');
    raise exception 'TEST FAILED: profile_id olmadan content_type=profile kabul edildi';
  exception when raise_exception then
    if sqlerrm not like 'profile_id%' then raise; end if;
  end;
end $$;

-- 16.4 content_ref_present: profil dışı bir türde content_id zorunludur (varsayılan türetim yok).
do $$
begin
  begin
    insert into moderation_reports (profile_id, content_type, content_id, category, description, reporter_hash)
    values (null, 'post', null, 'other', 'content_id olmadan post şikâyeti testi', 'demo');
    raise exception 'TEST FAILED: content_id olmadan profil dışı şikâyet kabul edildi';
  exception when check_violation then null;
  end;
end $$;

-- 16.5 moderation_actions aynı davranışı sergiler (eski çağrı şekli + yeni genelleştirilmiş).
insert into moderation_actions (id, profile_id, type, actor_id)
values ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-0000000000b1', 'review_started', '00000000-0000-0000-0000-0000000000a1');
do $$
begin
  if not exists (
    select 1 from moderation_actions
     where id = '00000000-0000-0000-0000-0000000000bd'
       and content_type = 'profile' and content_id = '00000000-0000-0000-0000-0000000000b1'
  ) then
    raise exception 'TEST FAILED: moderation_actions eski çağrı şeklinde content_type/content_id türetilmedi';
  end if;
end $$;

insert into moderation_actions (profile_id, content_type, content_id, type, actor_id, note)
values (null, 'post', '00000000-0000-0000-0000-0000000000bc', 'content_rejected', '00000000-0000-0000-0000-0000000000a1', 'Genelleştirilmiş triyaj testi');
do $$
begin
  if not exists (select 1 from moderation_actions where content_type = 'post' and content_id = '00000000-0000-0000-0000-0000000000bc' and type = 'content_rejected') then
    raise exception 'TEST FAILED: profil dışı moderasyon eylemi beklendiği gibi kaydedilmedi';
  end if;
end $$;

-- 16.6 Yeni kategori/eylem türü değerleri gerçekten kullanılabilir (enum genişlemesi doğrulaması).
insert into moderation_reports (profile_id, content_type, content_id, category, description, reporter_hash)
values (null, 'media_asset', '00000000-0000-0000-0000-0000000000be', 'csam_suspected', 'Yeni kategori değeri testi (demo, en az 10 karakter)', 'demo');
insert into moderation_actions (profile_id, content_type, content_id, type, actor_id)
values (null, 'media_asset', '00000000-0000-0000-0000-0000000000be', 'warning_issued', '00000000-0000-0000-0000-0000000000a1');

-- 16.7 RLS: yönetici olmayan authenticated rolü hiçbir moderasyon kaydını göremez (admin-all policy dışında erişim yok).
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
do $$
begin
  if exists (select 1 from moderation_reports where id = '00000000-0000-0000-0000-0000000000bb') then
    raise exception 'TEST FAILED: yönetici olmayan kullanıcı moderasyon şikâyetini görebiliyor';
  end if;
end $$;
reset role;
