# Veritabanı

Supabase PostgreSQL. Şema: `supabase/migrations/20261016000001_init.sql`, seed: `supabase/seed.sql` (`npm run data:seed-sql` ile üretilir). Tüm tablolar UUID PK, FK ilişkileri ve RLS içerir.

## Tablolar

| Tablo | Amaç | Not |
| --- | --- | --- |
| `admins` | Yönetici hesapları (`auth.users` ile 1:1) | rol: owner/moderator |
| `cities`, `districts` | 81 il, 973 ilçe | herkese okunur |
| `interests`, `profile_interests` | ilgi alanları (N:N) | |
| `profiles` | profil | `birth_date` yalnızca yönetimde; kamuya yaş olarak yansır |
| `profile_images` | fotoğraflar | `rights_confirmed` olmadan kamuya çıkmaz |
| `profile_consents` | yayın / fotoğraf / veri işleme rızaları | `evidence_path` → özel bucket |
| `verification_records` | yaş / kimlik doğrulama | belge `retain_until` sonrası silinir |
| `moderation_reports` | şikâyetler | `reporter_hash` (tuzlu IP özeti), ham IP yok |
| `moderation_actions` | inceleme, kaldırma, itiraz kayıtları | |
| `membership_plans`, `subscriptions` | paketler ve abonelik kayıtları | `external_ref` ödeme için ayrılmış, null |
| `audit_logs` | değiştirilemez denetim kaydı | UPDATE/DELETE tetikleyiciyle engelli |
| `privacy_requests` | KVKK başvuruları | `due_at` = +30 gün |
| `seo_pages` | yol bazlı SEO override + özgün tanıtım | |
| `site_settings` | tek satır ayar | |
| `page_views_daily` | günlük profil görüntüleme sayacı | kişisel veri yok |

## Kamuya açık view'lar

`profiles_public`, `profile_images_public`, `profile_interests_public` — yalnızca **yayında + moderasyon onaylı + 18+ + aktif yayın rızası + en az bir hakkı doğrulanmış fotoğrafı olan** profiller. Doğum tarihi, rıza belgeleri, moderasyon notları view'da yoktur. `anon` rolü `profiles` tablosuna erişemez.

## RLS özeti

- Referans veriler (`cities`, `districts`, `interests`, aktif `membership_plans`, `seo_pages`): herkese SELECT.
- Diğer tüm tablolar: yalnızca `is_admin()` → `admins` kaydı **ve** JWT `aal = aal2` (MFA zorunlu).
- `audit_logs`: yönetici SELECT/INSERT; UPDATE/DELETE tetikleyiciyle yasak.
- Şikâyet / KVKK başvurusu `anon` tarafından doğrudan yazılamaz; sunucu doğrulama + oran sınırlamasından sonra service role ile eklenir.
- Storage: `profile-images` (public okuma, yalnızca yönetici yazma, yalnızca `image/webp`, 5 MB), `consent-documents` ve `verification-documents` (private, yalnızca yönetici).

## Veritabanı seviyesinde iş kuralları

- `enforce_publish_preconditions`: `status → published` geçişinde 18+, moderasyon onayı, yaş doğrulaması, yayın + fotoğraf rızası, tüm fotoğrafların hakkı ve açık kritik şikâyet yokluğunu kontrol eder.
- `unpublish_on_consent_revoke`: yayın veya fotoğraf rızası geri alınınca profil `unpublished` olur.
- `audit_logs_immutable`.

Bu kurallar `npm run test:db` ile geçici bir Postgres'te (Supabase auth/storage şemaları taklit edilerek) test edilir: `supabase/sql-tests/policies.test.sql`.

## Konum verisi

Kaynak: Türkiye API (turkiyeapi.dev, dataset 2025 — TÜİK ADNKS tabanlı). 81 il / 973 ilçe resmî sayılarla eşleşir. Slug'lar Türkçe karakter dönüşümüyle üretilir (`ı→i, ğ→g, ş→s, ç→c, ö→o, ü→u, İ→i`). **Production öncesi** TÜİK / İçişleri Bakanlığı listesiyle çapraz kontrol önerilir.

## Veri minimizasyonu, saklama ve silme

| Veri | Saklama | Silme mekanizması |
| --- | --- | --- |
| Doğrulama belgeleri | `VERIFICATION_DOC_RETENTION_DAYS` (varsayılan 30) | `/api/cron` günlük; kayıt kalır, belge silinir |
| Rıza belgeleri | rıza süresince | profil silinince |
| Profil, fotoğraflar | rıza geri alınana / silme talebine kadar | Yönetim → Profil → Veri → Kalıcı sil (dosyalar dahil) |
| Şikâyetçi bilgisi | e-posta isteğe bağlı; IP yalnızca tuzlu özet | profil silinince kaskad |
| Denetim kaydı | [hukuk incelemesiyle belirlenecek] | kişisel veri içermez |

KVKK erişim talepleri için profil verisi JSON olarak dışa aktarılabilir (belge yolları hariç).
