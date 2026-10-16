# Görevler ve durum

Durum anahtarı: ✅ uygulandı **ve** otomatik testle doğrulandı · 🟡 uygulandı, kısmen/elle doğrulandı · ⬜ yapılmadı · ⚖️ hukuki onay bekliyor

Son doğrulama (2026-10-16): typecheck ✅ · ESLint ✅ · Vitest 64/64 ✅ · Supabase entegrasyon 3/3 ✅ · SQL politika testleri ✅ · Playwright 31/31 (demo) + 1/1 (Supabase auth) ✅ · production build ✅

## PHASE 1 — Tasarım ve frontend
- ✅ Proje kurulumu (Next 16, TS strict, Tailwind 4, shadcn/Radix)
- ✅ Tasarım sistemi (OKLCH tokenlar, açık/koyu tema, Geist) — [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- ✅ Header (sticky), footer, mobil alt navigasyon — E2E mobil
- ✅ Ana sayfa: hero, şehir seçici, ilgi alanları, öne çıkanlar (sponsorlu etiketli), popüler şehirler, nasıl çalışır, güvenlik, SSS (+FAQ JSON-LD)
- ✅ Profil kartları ve detay sayfası (galeri, doğrulama durumu, şikâyet, kaldırma başvurusu, güvenlik bilgilendirmesi, iletişim bilgisi yok)
- ✅ Şehir / ilçe sayfaları (81 il, 973 ilçe; geçersiz slug → 404)
- ✅ Arama ve filtreler (il, ilçe, yaş aralığı, ilgi alanı, doğrulanmış) — URL senkron, E2E
- ✅ Responsive (yatay taşma yok, dokunma hedefleri ≥44px — E2E)
- ✅ Skeleton ve boş durumlar

## PHASE 2 — Backend ve admin
- ✅ Supabase şeması, RLS, view'lar, tetikleyiciler — SQL testleri + gerçek Supabase'de `db reset`
- ✅ Repository soyutlaması (Supabase + bellek içi demo)
- ✅ Admin kimlik doğrulama + TOTP MFA (demo ve Supabase) + giriş rate limit
- ✅ Rol kontrolü: sunucu tarafı `requireAdmin`/`assertAdmin`, RLS `is_admin()` (AAL2)
- 🟡 Rol bazlı yetki matrisi: owner/moderator rolleri var, ayrıntılı ayrım ⬜
- ✅ Profil CRUD, taslak, yayın, yayından kaldırma, arşiv, taslağa alma
- ✅ Yayın ön koşulları (uygulama + DB)
- ✅ Fotoğraf yönetimi (yükleme, EXIF silme, sıralama, hak doğrulama, paket sınırı)
- ✅ Rıza ve doğrulama kayıtları, özel belge depolama, saklama süresi sonunda silme
- ✅ Moderasyon: şikâyet, inceleme, kaldırma, ret, itiraz, geçmiş; kritik kategoride otomatik kaldırma
- ✅ Abonelikler: oluşturma, çakışma engeli, yenileme, iptal, durum hesaplama (tahsilat yok)
- ✅ Denetim kayıtları (değiştirilemez)
- ✅ KVKK başvuru formu ve yönetimi, dışa aktarma, kalıcı silme
- ✅ İlgi alanı yönetimi, site ayarları, istatistikler

## PHASE 3 — SEO ve performans
- ✅ Dinamik metadata, canonical, OG/Twitter, JSON-LD, breadcrumb — E2E
- ✅ Sitemap (yalnızca indekslenebilir), robots — E2E
- ✅ İnce sayfa noindex kuralı, filtreli varyant noindex — unit + E2E
- ✅ SEO yönetim ekranı + profil bazında SEO alanları
- ✅ PPR/ISR, `"use cache"` + anında geçersiz kılma (kaldırmalar ilk istekte yansır — E2E)
- 🟡 Core Web Vitals: yapısal önlemler alındı; Lighthouse ölçümü yapılmadı ⬜
- ⬜ Dinamik OG görseli

## PHASE 4 — Güvenlik ve hukuk
- ✅ Güvenlik başlıkları (CSP, HSTS, XFO…) — E2E
- ✅ Girdi doğrulama, XSS önlemleri, honeypot
- ✅ İçerik politikası taraması — unit
- 🟡 Rate limiting: süreç içi + DB (şikâyet); dağıtık limit ⬜ (Vercel WAF önerilir)
- 🟡 CSP `'unsafe-inline'` içeriyor (PPR kısıtı)
- ⬜ Bağımsız sızma testi, `npm audit` incelemesi (scaffold 5 yüksek uyarı bildirdi; incelenmedi)
- ⚖️ [LEGAL_REVIEW_CHECKLIST.md](LEGAL_REVIEW_CHECKLIST.md) — tüm maddeler
- ⚖️ KVKK aydınlatma metni, kullanım koşulları, rıza metinleri (sitedekiler taslak)
- ⬜ Otomatik görsel moderasyonu (çıplaklık/yaş tahmini) — değerlendirilmeli
- ⬜ Reşit olmayan içerik için delil koruma + resmi bildirim prosedürü (hukukla birlikte)

## PHASE 5 — Test ve yayın
- ✅ Unit (domain kuralları), servis entegrasyon (bellek), Supabase entegrasyon, SQL politika, E2E (masaüstü + mobil), axe a11y
- ⬜ CI (GitHub Actions) — komutlar hazır, workflow yazılmadı
- ⬜ Vercel deployment — **açık onay gerektirir** (production yayını)
- ⬜ Supabase production projesi — **açık onay gerektirir** (gerçek veri)
- ⬜ Ödeme entegrasyonu — **hukuki inceleme + ödeme kuruluşu onayı sonrası**

## Bilinen sınırlamalar
- Demo modu verisi bellek içidir; yeniden başlatmada sıfırlanır ve çok instance'lı ortamda tutarsızdır (yalnızca geliştirme/demo).
- Kaldırılan profil, nadir durumda ilk istekte `200 + noindex` (soft 404) dönebilir; içerik gösterilmez. İl/ilçe 404'leri gerçek 404'tür.
- Yönetim işlemleri tüm rota önbelleğini temizler (`revalidatePath("/", "layout")`); yüksek hacimde daha hedefli etiketleme gerekir.
- Playwright public senaryoları demo verisine dayanır; Supabase modunda yalnızca kimlik doğrulama akışı E2E ile test edildi (repository ise entegrasyon testleriyle).
- İlgi alanı filtresi büyük veri setleri için RPC'ye taşınmalı.
