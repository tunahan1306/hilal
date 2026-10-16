# Hilal üretim yayını — 16 Ekim 2026

Canlı adres: https://hilal-snowy.vercel.app

Vercel projesi: hilal (`prj_twEinRQ0zTn6xkIQyevdPXJfMyCI`). Supabase: hilal (`yqlnjxnxwbbkxrtawxcx`, eu-central-1). GitHub bağlantısı: tunahan1306/hilal, main.

## Sonuç

- 5 migration uygulandı; 81 il, 973 ilçe ve 3 paket veritabanında.
- Yayında demo profil yok. Test sonrası profil, yönetici ve storage nesnesi sayıları sıfır.
- Konum kataloğu, filtreler, sitemap ve yönetim konum formları Supabase'den okunur. Üretimde bellek deposuna sessiz dönüş yasak.
- Genel kullanıcı kaydı kapalı, e-posta giriş sağlayıcısı ve TOTP açık.
- Yönetici silme, değişmez denetim kaydındaki tarihsel actor UUID'sini korur; RLS ve değişmezlik tetikleyicisi değişmedi.
- Uygulama sırları Vercel ortamında; veritabanı parolası uygulamaya yüklenmedi.

## Doğrulamalar

- `npm run typecheck`, `npm run lint`: başarılı.
- `npm test`: 84 başarılı.
- Gerçek Supabase entegrasyonu: 3 başarılı (yayın, rıza, moderasyon, anonim erişim, storage ve hesap temizliği).
- Gerçek Supabase yerel Playwright: 3 başarılı.
- Canlı Vercel Playwright: 3 başarılı (360/390/768/1440 px, yatay taşma, Ataşehir canonical, yanlış il/ilçe 404/400, yaş kabulü/yenileme/gezinme, zorunlu TOTP ve AAL2).
- Canlı yaş reddi, klavye ve Axe erişilebilirlik testi: 1 başarılı.
- Gerçek Supabase ile yerel Webpack üretim derlemesi ve Vercel üretim derlemesi: başarılı.
- `npm audit --omit=dev`: 0 açık. Geliştirme araçlarında braces zincirinden kaynaklı 9 high uyarısı var; önerilen zorunlu sürüm düşürmeleri uygulanmadı.
- İlk Vercel denemesinde yeni testte eksik NODE_ENV tipi derlemeyi durdurdu; düzeltildi ve sonraki dağıtım başarılı.
- İlk gerçek Auth kontrolünde email sağlayıcısı kapalıydı; global signup kapalı tutularak sağlayıcı açıldı ve MFA testleri geçti.
- İlk canlı testte localhost alan adına ait test çerezi ve ekran geçişi beklemesi düzeltildi. Paralel test çalıştırmalarının çıktı dizini çakışması ayrı dizinle giderildi. Son canlı testler başarılı.

## Sınırlar

- Kalıcı yönetici hesabı için sahibinin e-posta adresi gerekli; geçici test hesapları silindi.
- Gerçek profil henüz eklenmediği için canlı profil ekran görüntüsü yok; önceki tasarım QA'sındaki sentetik profil görüntüsü ayrı tutulur.
- Yeni üretim ekran görüntüleri `artifacts/production/` altında.
- Bu çalışmada tam demo E2E paketi tekrar çalıştırılmadı; önceki tasarım QA'sı 42 başarılı / 1 atlanmıştı. Güncel gerçek Supabase ve canlı kontroller yukarıda.

## Değiştirilen dosyalar

- `DEPLOYMENT.md`
- `playwright.config.ts`
- `scripts/build-seed-sql.mjs`
- `src/app/(site)/page.tsx`
- `src/app/(site)/sehir/[il]/[ilce]/page.tsx`
- `src/app/(site)/sehir/[il]/page.tsx`
- `src/app/(site)/sehirler/page.tsx`
- `src/app/admin/(panel)/istatistik/page.tsx`
- `src/app/admin/(panel)/layout.tsx`
- `src/app/admin/(panel)/profiller/[id]/page.tsx`
- `src/app/admin/(panel)/profiller/page.tsx`
- `src/app/admin/(panel)/profiller/yeni/page.tsx`
- `src/app/admin/(panel)/seo/page.tsx`
- `src/app/api/discovery/route.ts`
- `src/app/sitemap.ts`
- `src/components/admin/profile-form.tsx`
- `src/components/site/location-page.tsx`
- `src/components/site/profile-listing.tsx`
- `src/proxy.ts`
- `src/server/env.ts`
- `src/server/queries/public.ts`
- `src/server/repositories/memory.ts`
- `src/server/repositories/supabase.ts`
- `src/server/repositories/types.ts`
- `src/server/services/profiles.ts`
- `supabase/seed.sql`
- `test-results/.last-run.json`
- `tests/e2e/supabase-auth.spec.ts`
- `tests/integration/supabase.test.ts`
- `vercel.json`
- `vitest.integration.mts`
- `.vercelignore`
- `artifacts/production/age-gate.png`
- `artifacts/production/district.png`
- `artifacts/production/homepage.png`
- `src/domain/location-directory.ts`
- `src/server/location-path.ts`
- `src/server/queries/locations.ts`
- `supabase/migrations/20261019000001_location_catalog.sql`
- `supabase/migrations/20261020000001_immutable_audit_actor.sql`
- `tests/e2e/database-discovery.spec.ts`
- `tests/unit/location-directory.test.ts`

## Güncelleme — 10 görünür kurgusal profil

Kullanıcının açık isteğiyle 8 İstanbul, 1 Ankara ve 1 İzmir örneği ana profil listelerine eklendi. `example_profiles` yalnızca seçilmiş kurgusal içeriklerin halka açık kopyalarını tutar; özel taslak tablosu açılmadı. `discovery_profiles` gerçek yayın görünümü ile bu örnekleri birleştirir. Gerçek kişi yayınlama, rıza, yaş ve medya kuralları değişmedi.

Kart ve detaylarda örnek etiketi bulunur; fotoğraf yerine baş harf kullanılır. Örneklerde kimlik/yaş doğrulaması iddiası, sponsor rozeti veya telefon yoktur. Detaylar noindex'tir; sitemap'e ve doğrulanmış kişi filtresine girmez. Gerçek kişi JSON-LD'si ve görüntülenme sayacı örneklerde çalışmaz. Örnek görünürlüğü `example_profiles.visible=false` ile kapatılabilir; kaynak taslak silindiğinde kopya da silinir. Taslağın sonraki düzenlemeleri kendiliğinden halka açılmaz.

Kontroller: typecheck/lint/84 birim testi başarılı; gerçek Supabase entegrasyonu 4 başarılı; yerel Playwright konum/yaş 2 başarılı ve örnek liste/detay kontrolü 1 başarılı. Webpack üretim derlemesi başarılı. İlk örnek E2E denemesinde akışın gizli HTML kopyası seçiciyi çoğalttı; erişilebilir article seçicisiyle düzeltildi. Yeni şema: `20261021000001_public_examples.sql`.

## Güncelleme — doğrudan veritabanı okumaları

Kullanıcının isteğiyle profil listeleri, detayları ve konum profil sayıları için saatlik önbellek kaldırıldı. Sorgular request-time `connection()` sonrasında Supabase'den `no-store` ile okunur. Uzun süreli profil verisi prerender edilmez; SEO için sunucudan akışla render korunur. Referans konum kataloğu ve sitemap kendi önbelleklerini korur. Yayına uygun veritabanı kayıtlarının görünmesi için kod değişikliği veya deploy gerekmez; yeni sayfa isteği/yenileme güncel veriyi getirir. Açık sekmede kendiliğinden güncelleme için realtime aboneliği eklenmedi.

Kontroller: typecheck, lint, 84 birim testi ve Webpack üretim derlemesi başarılı. 4 yerel Playwright testi başarılı; bunlardan biri örnek görünürlüğünü doğrudan Supabase'de kapatıp açarak her iki değişikliğin de bir sonraki sayfa yenilemesinde yansıdığını doğrular. Kayıt test sonunda tekrar görünür durumuna getirildi. Gerçek kişi yayın koşulları aynıdır.
