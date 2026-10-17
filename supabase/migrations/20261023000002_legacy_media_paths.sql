-- 20261017 taşımasında eski `profile_images` kayıtları, dosyaları herkese açık
-- `profile-images` kovasında kalacak şekilde ve boş `public_paths` ile kopyalandı.
-- Bu yüzden yayından kaldırma / kalıcı silme bu dosyaları hiç silmiyordu (KVKK).
-- Eski dosyalar artık `public_paths` içinde işaretlenir; uygulama bunları eski
-- kovadan siler (src/server/storage/supabase.ts → LEGACY_PREFIX).
update public.profile_media
set public_paths = array['legacy-profile-images:' || storage_path]
where public_url like '%/storage/v1/object/public/profile-images/%'
  and coalesce(array_length(public_paths, 1), 0) = 0;

-- Not: hak onayı olmadan taşınan eski kayıtların (public_url null) dosyaları da
-- `profile-images` kovasında olabilir ve kayıttan ayırt edilemez. Bu kova production'da
-- elle denetlenmeli; profile_media ile eşleşmeyen dosyalar silinmelidir
-- (FULL_SITE_AUDIT_2026-10-18.md → C-03).
