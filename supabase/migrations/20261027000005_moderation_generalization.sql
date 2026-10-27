-- Modül E — Moderasyon ve Güven (genelleştirme). Bağlayıcı karara göre moderation_reports/
-- moderation_actions YERİNDE değiştirilir (bkz. docs/transformation/02a_DATA_MODEL.md
-- "Open question" ve Phase 2 §8 onay kaydı) — paralel bir tablo çifti yerine.
--
-- profile_id HER İKİ tabloda da nullable olarak KALIR (geri uyumluluk için — mevcut,
-- test edilmiş, canlı admin-küratörlü ürün akışı src/server/services/moderation.ts VE
-- enforce_publish_preconditions tetikleyicisi (20261016000001) hâlâ profile_id okur/yazar,
-- DEĞİŞMEDEN). content_type/content_id YENİ tek yazma yoludur ve her satırda zorunludur;
-- 'profile' kategorisi için ikisi birden (profile_id VE content_id=profile_id) yazılır —
-- bkz. enforce_moderation_content_ref() tetikleyicisi, servis katmanının unutması
-- durumunda bile tutarlılığı garanti eder.
--
-- GERİYE DÖNÜŞ PENCERESİ: bu migration'ın geri alınması (content_id/content_type
-- sütunlarının kaldırılması + profile_id'nin yeniden NOT NULL yapılması), yalnızca YENİ
-- modüllerin (B/C) içeriği için HİÇ rapor/eylem oluşturulmamışsa güvenlidir — oluşturulduysa
-- bu satırlar profile_id=null taşıdığından geri dönüş veri kaybına yol açar. Bu pencere
-- 02a_DATA_MODEL.md'nin "Migration ordering" bölümünde açıkça belirtilmiştir.

-- ---------------------------------------------------------------------
-- 1. Yeni modüllerin içeriği için kategori/eylem türü genişletmesi (mevcut değerler KALIR)
-- ---------------------------------------------------------------------
alter type report_category add value if not exists 'spam';
alter type report_category add value if not exists 'csam_suspected';
alter type moderation_action_type add value if not exists 'warning_issued';
alter type moderation_action_type add value if not exists 'content_rejected';
alter type moderation_action_type add value if not exists 'account_suspended';

-- ---------------------------------------------------------------------
-- 2. moderation_reports — polymorphic content_type/content_id
-- ---------------------------------------------------------------------
alter table moderation_reports
  alter column profile_id drop not null,
  add column content_type text not null default 'profile'
    check (content_type in ('profile', 'user_profile', 'post', 'message', 'media_asset', 'creator_account')),
  add column content_id uuid; -- FK yok: birden çok tabloya yayılır, audit_logs.entity_id ile aynı gerekçe
update moderation_reports set content_id = profile_id where content_type = 'profile';
alter table moderation_reports add constraint content_ref_present check (content_id is not null);
create index moderation_reports_content_idx on moderation_reports (content_type, content_id);

-- ---------------------------------------------------------------------
-- 3. moderation_actions — aynı şekil, aynı backfill
-- ---------------------------------------------------------------------
alter table moderation_actions
  alter column profile_id drop not null,
  add column content_type text not null default 'profile'
    check (content_type in ('profile', 'user_profile', 'post', 'message', 'media_asset', 'creator_account')),
  add column content_id uuid;
update moderation_actions set content_id = profile_id where content_type = 'profile';
alter table moderation_actions add constraint content_ref_present check (content_id is not null);
create index moderation_actions_content_idx on moderation_actions (content_type, content_id);

-- ---------------------------------------------------------------------
-- 4. Tutarlılık güvencesi: 'profile' satırları her zaman profile_id VE content_id=profile_id
--    taşır — servis katmanının unutması durumunda bile (defense-in-depth, messages_block_guard
--    ile aynı desen). Her iki tabloda da aynı fonksiyon kullanılır.
-- ---------------------------------------------------------------------
create or replace function enforce_moderation_content_ref() returns trigger
language plpgsql as $$
begin
  if new.content_type = 'profile' then
    if new.profile_id is null then
      raise exception 'profile_id, content_type=profile olan moderasyon kayıtları için zorunludur';
    end if;
    if new.content_id is null then
      new.content_id := new.profile_id;
    end if;
  end if;
  return new;
end $$;
create trigger moderation_reports_content_ref before insert on moderation_reports
  for each row execute function enforce_moderation_content_ref();
create trigger moderation_actions_content_ref before insert on moderation_actions
  for each row execute function enforce_moderation_content_ref();

comment on column moderation_reports.content_type is 'Tek yazma yolu buradan itibaren content_type/content_id; profile_id yalnızca geriye uyumluluk için okunur.';
comment on column moderation_actions.content_type is 'Tek yazma yolu buradan itibaren content_type/content_id; profile_id yalnızca geriye uyumluluk için okunur.';

-- ---------------------------------------------------------------------
-- 5. enforce_publish_preconditions() — GÜNCEL tanım 20261025000001_country_publication_gate.sql'de
--    (init.sql'deki İLK sürüm değil — orada profile_media/ülke kapısı/whatsapp tekliği de var).
--    Tek satır değişir: kritik kategori listesine csam_suspected eklenir (bkz. domain/types.ts
--    CRITICAL_REPORT_CATEGORIES yorumu). Fonksiyonun geri kalanı BİREBİR AYNI kalır; trigger
--    bağlaması değişmez (create or replace, aynı isimle çağrılmaya devam eder).
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
               and r.category in ('suspected_minor','paid_sexual_services','impersonation','unauthorized_photo','csam_suspected')) then
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
