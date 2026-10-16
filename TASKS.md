# Görevler ve durum

Durum anahtarı: ✅ uygulandı **ve** otomatik testle doğrulandı · 🟡 uygulandı, kısmen/elle doğrulandı · ⬜ yapılmadı · ⚖️ hukuki onay bekliyor

Son doğrulama (2026-10-16, denetim sonrası): typecheck ✅ · ESLint ✅ · Vitest 75/75 ✅ · Supabase entegrasyon 3/3 ✅ · SQL politika testleri ✅ · Playwright 38/38 (demo, 3 ardışık çalıştırma) + 1/1 (Supabase auth) ✅ · production build ✅ · axe (13 kamu + 13 yönetim sayfası × 3 görünüm): 0 ihlal

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
- ⬜ Bağımsız sızma testi. `npm audit --omit=dev`: 0 bulgu; geliştirme bağımlılıklarında (shadcn CLI zinciri) yüksek uyarılar var, çalışma zamanına girmiyor
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

## Denetim (2026-10-16) — düzeltilen ve doğrulanan bulgular
- 🔴 Production + demo modunda bilinen varsayılan sırla admin oturumu sahtelenebiliyordu → production'da sırlar zorunlu, açılış kontrolü (`instrumentation.ts`)
- 🟠 X-Forwarded-For ile IP tabanlı oran sınırı atlatılabiliyordu → güvenilir IP çözümleme + profil başına şikâyet tavanı + otomatik kaldırma devre kesici
- 🟠 6 MB üstü belge yüklemesi hiçbir geri bildirim vermeden başarısız oluyordu → 5 MB sınır + istemci tarafı kontrol
- 🟠 Doğrulama hatasında form alanları siliniyordu (KVKK, şikâyet, giriş, yönetim formları) → sıfırlama yalnızca başarıda
- 🟠 Mobil yönetim profil sekmeleri içeriğin üstüne taşıyordu → tek satır, kaydırılabilir
- 🟡 Yenileme süresine "2 ay" gibi girdiler "Beklenmeyen hata" veriyordu → ayrıştırma + anlaşılır doğrulama mesajı
- 🟡 Boş il sayfası olmayan filtreleri "sıfırla" öneriyordu → doğru boş durum
- 🟡 Yönetim sayfaları ve 404'te sayfaya özgü `<title>` yoktu
- 🟡 a11y: etiketsiz SEO form alanları, kontrast (uyarı/tehlike), klavyeyle kaydırılamayan tablolar, başlık sırası, <24px dokunma hedefleri
- 🟡 Performans: keşfet/şehir sayfalarında zod istemci paketinden çıkarıldı (370→333 KB gz), kullanılmayan mono font preload'u kaldırıldı (81→44 KB), admin prefetch'leri 9→2 istek/sayfa, admin profil listesinde N+1 sorgu → sabit 6 sorgu
- Metin: "Farketmez" → "Fark etmez"; mobil ana sayfa/footer yerleşimi; abonelik formunda buton sırası

## Bilinen sınırlamalar
- Yönetim işlemleri tüm rota önbelleğini temizlediği için sonraki ilk sayfa görüntülemesi ~0,8 s sürer (ölçüldü); hedefli yol bazlı geçersiz kılma ⬜
- İstemci tarafı geçişte profil JSON-LD'si nadiren DOM'da gözlenmedi (doğrudan yüklemede her zaman mevcut; kök neden doğrulanamadı)
- Sunucu logunda Next.js kaynaklı `MaxListenersExceededWarning` (ServerResponse) gözlendi; işlevsel etkisi tespit edilmedi
- Premium "kişiselleştirme" ve "ilave istatistik" paket özellikleri yalnızca bayrak düzeyinde; profil sahiplerinin hesabı olmadığından ürün kararı gerekli ⬜
- Yüklenen fotoğrafın alternatif metni sonradan düzenlenemiyor ⬜
- Demo modu verisi bellek içidir; yeniden başlatmada sıfırlanır ve çok instance'lı ortamda tutarsızdır (yalnızca geliştirme/demo).
- Kaldırılan profil, nadir durumda ilk istekte `200 + noindex` (soft 404) dönebilir; içerik gösterilmez. İl/ilçe 404'leri gerçek 404'tür.
- Yönetim işlemleri tüm rota önbelleğini temizler (`revalidatePath("/", "layout")`); yüksek hacimde daha hedefli etiketleme gerekir.
- Playwright public senaryoları demo verisine dayanır; Supabase modunda yalnızca kimlik doğrulama akışı E2E ile test edildi (repository ise entegrasyon testleriyle).
- İlgi alanı filtresi büyük veri setleri için RPC'ye taşınmalı.

## Premium vibrant discovery — yeni dal çalışması

Uygulama ve denetim notları [IMPLEMENTATION.md](IMPLEMENTATION.md) içinde. Kamu hobi arayüzü kaldırıldı; veri ve yönetim korunuyor. Sunucuda 18+ beyan kapısı, çerez denetimli responsive görsel teslimi, tarih+id cursor keşfi, 2/3/4 sütunlu kartlar, koyu öncelikli yeni palet ve kompakt sayfalar eklendi. Mevcut medya migration'ına uymayan eski adapter/çağrılar uyarlanmıştır; migration çalıştırılmamıştır. Son doğrulama sonucu ve dosya listesi [QA_REPORT.md](QA_REPORT.md) içindedir; yukarıdaki eski test adetleri bu dalın sonucu olarak yorumlanmamalıdır.
