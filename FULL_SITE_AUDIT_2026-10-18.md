# Hilal — Kapsamlı Site Denetimi (2026-10-18, 2. tur)

Dal: `feat/site-audit-contact` (PR #1) · Taban: `main` @ `46049a2` · Hazırlayan: Claude (Claude Code)

**Bu dalda yapılmayanlar:** PR merge edilmedi, production'a deploy yapılmadı, production migration'ı çalıştırılmadı, production veritabanında test çalıştırılmadı.

**Durum etiketleri:**
- **Düzeltildi**
- **Kısmen:** kalan kısım açıkça yazılmıştır.
- **Açık**
- **Kapsam dışı:** C-01, kullanıcı kararıyla.
- **Bilgi**

---

## 1. Yönetici özeti

- **Toplam:** 73 benzersiz bulgu.
- **Önem:** 1 Critical, 10 High, 30 Medium, 30 Low, 2 Info. Bulgular ilk turda 69, bu turda 4 yeni bulgu eklendi (V-01–V-04).
- **Durum:**

  | Durum | Sayı |
  |---|---|
  | Tamamen düzeltildi | 47 |
  | Kısmen | 13 |
  | Açık | 5 |
  | Kapsam dışı (C-01, C-02, C-05, C-08, P-13; hepsi C-01'e bağlı) | 5 |
  | Bilgi | 3 |

- **Açık kalan Critical/High/Medium:**

  | Bulgu | Önem | Durum | Not |
  |---|---|---|---|
  | **C-01** | Critical | Kapsam dışı, **çözülmedi** | Kurgusal profiller etiketsiz ve tek WhatsApp numarasına gidiyor |
  | **C-02** | High | Kapsam dışı | C-01'e bağlı |
  | **V-01** | High | Açık | Preview ortamı production veritabanını kullanıyor; Vercel yapılandırması gerekiyor |
  | **C-03** | High | Kısmen | Kod ve migration hazır; production kova taraması elle yapılacak |
  | **C-04** | High | Kısmen | Kod hazır; mevcut dosyaların 1 yıllık önbellek başlığı kalıyor |
  | **C-16** | High | Kısmen | Yaş kapısı ve indeksleme ürün kararı gerektiriyor |
  | **P-02** | High | Kısmen | `/guvenlik` sayfasındaki doğrulama ve rıza kural metinleri C-01 nedeniyle olduğu gibi kaldı |
  | **C-05** | Medium | Kapsam dışı | C-01'e bağlı |
  | **P-13** | Medium | Kapsam dışı | WhatsApp CTA stili, C-01'e bağlı |

- **Performans (mobil Lighthouse, 5 tekrar, medyan):**
  - Performans skoru 76–79'dan 89–92'ye çıktı.
  - LCP 5,7–6,1 sn'den 3,4–3,8 sn'ye indi.
  - Sayfa ağırlığı yaklaşık 850–930 KB'den yaklaşık 480–550 KB'ye indi.
  - INP yaklaşığı 80 ms; `main` ile aynı. Bu turda bulunan bir INP gerilemesi düzeltildi (§8).
- **Testler:**
  - Typecheck, lint, unit (110/110), DB/RLS, **entegrasyon (11/11, yerel yalıtılmış Supabase)** ve build geçti.
  - E2E demo modunda 61 geçti, 7 atlandı. Supabase modunda 11 geçti, 2 başarısız (`examples.spec`; yalnızca production'da bulunan kurgusal profil verisini bekliyor).
  - Responsive ve axe taraması: 224 kontrol, 0 sorun.

## 2. İncelenen sayfalar

| Alan | Rotalar |
|---|---|
| Public | `/`, `/?yaka=anadolu`, `/kesfet`, `/sehirler`, `/sehir/istanbul`, `/sehir/istanbul?yaka=avrupa`, `/sehir/istanbul/kadikoy`, `/sehir/ankara`, `/sehir/bayburt`, `/sehir/xyz` (404), `/profil/[slug]`, olmayan profil (404), `/paketler`, `/guvenlik`, `/kvkk`, `/kullanim-kosullari`, `/kaldirma-talebi`, `/iletisim`, `/yas-onayi`, `/bildirim-alindi`, `/bulunamadi`, `robots.txt`, `sitemap.xml`, `opengraph-image` |
| Admin | `/admin/giris`, `/admin`, `profiller`, `profiller/yeni`, `profiller/[id]` (7 sekme), `sikayetler` ve detayı, `talepler`, `abonelikler`, `seo`, `istatistik`, `ayarlar`, `denetim`, `ilgi-alanlari`, `iletisim` ve detayı |

## 3. Sayfa bazında sorunlar

### Public

| ID | Önem | Bulgu | Dosya | Durum |
|---|---|---|---|---|
| P-01 / C-01 | **Critical** | 10/10 profil yapay zekâyla üretilmiş kurgusal kadın, "kurgusal" etiketi yok, hepsi aynı WhatsApp numarasına yönlendiriyor (§9.1) | `profile-card.tsx`, `profil/[slug]/page.tsx`, migration `20261022000001` | **Kapsam dışı (çözülmedi)** |
| P-02 | High | Doğrulanmış profil yokken genel metinler "doğrulanmış" diyordu | `site.ts`, `kesfet`, `sehirler`, `location-seo.ts`, `site-footer.tsx` | **Kısmen**: genel metinler ve footer'daki "açık rıza ile oluşturulur" iddiası kaldırıldı; `/guvenlik` sayfasındaki kural metinleri C-01 nedeniyle olduğu gibi kaldı |
| P-03 | Medium | Filtre sayfasının kapat düğmesi görünmüyordu, adı İngilizceydi | `ui/sheet.tsx`, `ui/dialog.tsx` | **Düzeltildi** |
| P-04 | Medium | Filtre sayfasının ana düğmesi ekranın alt kenarına yapışıktı | `filter-bar.tsx` | **Düzeltildi** |
| P-05 / C-16 | High | Arama motorları yaş kapısını (noindex) görüyordu, sitemap ise kapı arkasındaki adresleri listeliyordu | `proxy.ts`, `sitemap.ts` | **Kısmen** (§7) |
| P-06 / C-17 | Medium | Ana sayfada canonical yoktu | `(site)/page.tsx` | **Düzeltildi** |
| P-07 | Medium | og:image ve og:url eksikti | `opengraph-image.tsx`, `lib/site.ts → ogFor`, tüm statik sayfalar | **Düzeltildi** (e2e testiyle doğrulandı) |
| P-08 | Low | `/bulunamadi` 200 dönüyor (noindex, robots ile engelli) | — | **Açık** |
| P-09 | Low | Türkçe yazım hataları | çeşitli | **Düzeltildi** |
| P-10 | Low | Kullanım koşulları sayfasına özel açıklama yoktu | `kullanim-kosullari/page.tsx` | **Düzeltildi** |
| P-11 | Medium | Ana sayfada aynı profiller iki kez gösteriliyordu | `(site)/page.tsx` | **Düzeltildi** |
| P-12 | Low | Lightbox küçük görseli büyütüyordu; tek fotoğrafta da oklar görünüyordu | `media-lightbox-view.tsx` | **Düzeltildi** |
| P-13 | Medium | WhatsApp düğmesinin rengi kartta ve profilde farklı | `profile-card.tsx` | **Kapsam dışı** (C-01) |
| P-14 | Medium | "0 profil" yazan şehir bağlantıları | `(site)/page.tsx` | **Düzeltildi** |
| P-15 | Low | 10–11px metinler | `age-badge.tsx` | **Kısmen** |
| P-16 | Low | Odak halkası soluktu | `ui/button.tsx` | **Düzeltildi** |
| P-17 | Low | Paketler sayfasında dahil olmayan özellik yanlış gösteriliyordu | `paketler/page.tsx` | **Kısmen** (sütun hizası ve CTA açık) |
| P-18 | Low | Profil H1'i ekran okuyucuda "Selin31" okunuyordu; yerleşim sorunları | `profil/[slug]/page.tsx` | **Kısmen**: H1 düzeltildi; yerleşim yeniden tasarlanmadı (§5) |
| P-19 | Info | `/iletisim` sayfası yoktu | — | **Düzeltildi** |
| M-01 | Low | Header'da sahte arama kutusu ve yinelenen Keşfet bağlantıları vardı | `site-header.tsx` | **Düzeltildi** (2. tur: mobil yineleme de kaldırıldı) |

### Admin

| ID | Önem | Bulgu | Durum |
|---|---|---|---|
| A-01 | High | Sekme değişince kaydedilmemiş değişiklikler kayboluyordu | **Düzeltildi** |
| A-02 | High | Kaydedilmemiş değişiklik koruması yoktu | **Düzeltildi**: profil formu ve tüm `ActionForm`'lar |
| A-03 | High | Ölü `/admin/medya` bağlantısı | **Düzeltildi** |
| A-04 | Medium | SEO formu geçersiz yolları kabul ediyordu; silme kontrolü yoktu | **Düzeltildi** (doğrulama + silme + geçersiz varsayılan kaldırıldı) |
| A-05 | Medium | Hatalar alana bağlı değildi, yalnızca toast | **Düzeltildi** |
| A-06 | Medium | İngilizce Zod mesajları | **Düzeltildi** |
| A-07 | Medium | `aria-describedby` yoktu | **Düzeltildi**: `ActionForm` hatalı alanı bağlar ve odaklar; profil formu da |
| A-08 | Medium | KPI şeridinde `<dl>` ihlali (axe) | **Düzeltildi** |
| A-09 | Medium | Rozet kontrastı | **Düzeltildi** |
| A-10 | Medium | Sekme taşmasında görsel ipucu yoktu | **Düzeltildi** |
| A-11 | Medium | Mobilde tablolar kesiliyordu | **Düzeltildi**: ad, durum ve işlem sütunları görünür, ayrıntılar md ve üstünde |
| A-12 | Medium | Listelerde filtre ve arama yoktu | **Düzeltildi**: şikâyet, talep ve abonelik durum filtreleri; denetim filtreleri; iletişim için arama, filtre ve sayfalama |
| A-13 | Low | Profil filtresi URL'ye yazılmıyor | **Açık** |
| A-14 | Medium | KVKK reddinde gerekçe yoktu | **Düzeltildi** |
| A-15 | Medium | Yıkıcı işlemlerde gerekçe ve onay eksikti | **Düzeltildi** ("Taslağa al" onayı dahil) |
| A-16 | Low | Yenileme süresi serbest metin kutusuna giriliyordu | **Düzeltildi** (sayı girişi, 1–24) |
| A-17 | Low | Ham enum değerleri gösteriliyordu | **Düzeltildi** |
| A-18 | Low | Mobil menüde rozetler yoktu | **Düzeltildi** |
| A-19 | Low | KPI alt etiketi kırpılıyordu | **Kısmen** |
| A-20 | Low | Uyarı renkleri ayırt edilmiyordu | **Kısmen** |
| A-21 | Low | 24px altı dokunma hedefleri | **Açık** |

## 4. Teknik bulgular (kod denetimi + 2. tur)

| ID | Önem | Bulgu | Durum |
|---|---|---|---|
| C-01 | **Critical** | §9.1 | **Kapsam dışı (çözülmedi)** |
| C-02 | High | Örnek profiller şikâyet edilemiyor; yayından kalkan gerçek profilin örneği geri gelebiliyor | **Kapsam dışı** (C-01) |
| C-03 | High | Eski herkese açık kova dosyaları silinmiyordu | **Kısmen**: migration `…0002` + `LEGACY_PREFIX` + `scripts/media-orphans.mjs` (yerelde doğrulandı: kurulan sahipsiz dosya bulundu, `--delete` ile silindi); **production'da elle çalıştırılmalı** |
| C-04 | High | Kaldırılan medya erişilebilir kalıyordu | **Kısmen**: vekil yayın kontrolü yapıyor; yeni yüklemeler 10 dk önbellekleniyor; günlük cron eşitlemesi (`reconcilePublicMedia`); **mevcut dosyaların 1 yıllık önbellek başlığı** ancak dosya yeniden yüklenince ya da silinince düşer |
| C-05 | Medium | Sayımlara örnek profiller dahil | **Kapsam dışı** (C-01; "doğrulanmış" ibaresi kaldırıldı) |
| C-06 | Medium | `/api/discovery` üzerinden WhatsApp numaraları toplu çekilebiliyordu | **Düzeltildi**: paylaşılan veritabanı sınırı, 60 istek/dk, tüm sunucu örneklerinde |
| C-07 | Low | Silme denetim kaydında slug tutuluyordu | **Düzeltildi** |
| C-08 | Low | Testte gerçek telefon numarası var | **Kapsam dışı** (C-01) |
| C-09 | Medium | Giriş ve KVKK oran sınırı yalnızca süreç belleğindeydi | **Düzeltildi**: `rate_limit_hit` (migration `…0003`) |
| C-10 | Medium | Görsel vekili her istekte yeniden kodluyordu | **Düzeltildi**: yalnızca yayındaki URL; 5 dk özel tarayıcı önbelleği; süreç önbelleği |
| C-11 | Medium | CSP'de `media-src` yoktu; posteri olmayan video görsel olarak veriliyordu | **Düzeltildi** |
| C-12 | Low | Admin argümanları çalışma anında doğrulanmıyordu | **Kısmen** |
| C-13 | Low | Proxy her istekte veritabanını çağırıyordu | **Düzeltildi** (konum 10 dk, profil 30 sn önbellek) |
| C-14 | Low | Sıralama ve sponsorluk | **Bilgi** |
| C-15 | Low | `published_at` boş kayıt imleci bozuyordu | **Düzeltildi** (NULLS LAST + imleç koruması) |
| C-16 | High | Yaş kapısı ve SEO | **Kısmen** (§7) |
| C-17 | Medium | Ana sayfa canonical | **Düzeltildi** |
| C-18 | Medium | Sitemap örnekleri sayıyordu | **Düzeltildi** |
| C-19 | Medium | Profilde soft 404 | **Düzeltildi**: proxy gerçek 404 dönüyor (e2e testi) |
| C-20 | Low | Sitemap önbelleği; robots `/api` | **Kısmen** |
| C-21 | High | Konum sayımı birden çok kez çalışıyordu | **Düzeltildi** |
| C-22 | Medium | Profil iki kez okunuyordu | **Düzeltildi** |
| C-23 | Medium | Kart verisi çok büyüktü | **Düzeltildi**: `CardProfile` (biyografi, zengin metin, SEO ve video yok) |
| C-24 | Medium | Lightbox hemen yükleniyordu | **Düzeltildi**: ilk yüke dahil değil, tarayıcı boştayken ön yükleniyor |
| C-25 | Low | Ekran altı görsellerde `priority` | **Kısmen** |
| C-26 | Low | Kullanılmayan bağımlılıklar | **Düzeltildi** |
| C-27 | Low | Ölü bileşenler | **Düzeltildi** (9 dosya silindi) |
| C-28 | Low | İki ayrı konum API'si | **Düzeltildi** (tek `createLocationDirectory`, istek başına bellek) |
| C-29 | Low | Belgeler koddan sapmış | **Kısmen**: DESIGN_SYSTEM, DEPLOYMENT ve .env.example güncel; QA_REPORT, SECURITY ve README güncellenmedi |
| **V-01** | **High** | **Preview ve Production aynı Supabase değişkenlerini kullanıyor.** `vercel env ls` çıktısında `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` ve anon key tek kayıt hâlinde "Production, Preview" olarak tanımlı. PR #1'in preview deploy'u (`hilal-dtz5abesc…`) production veritabanına service role ile bağlı. Preview Vercel Authentication arkasında, yani herkese açık değil (302 → SSO); ama ekip üyelerinin preview'da yaptığı her yönetim işlemi production verisini değiştirir. | **Açık**: Preview için ayrı bir Supabase projesi (veya branch) tanımlanmalı. Vercel yapılandırmasını değiştirmedim. |
| **V-02** | Medium | `ALLOW_DEMO_MODE` production ortamında tanımlı (DEPLOYMENT.md "tanımlamayın" diyor). | **Düzeltildi (doğrulandı)**: değer `false`; demo modu yalnızca `true` ile açılır. Değişken temizlik için kaldırılabilir. |
| **V-03** | Low | Admin'de bilinmeyen kimlik 200 + "bulunamadı" dönüyor; admin layout'unun Suspense akışı yüzünden. Veri sızmıyor, sayfa noindex (e2e testi var). | **Açık** |
| **V-04** | Medium | 2. turdaki lightbox tembel yüklemesi ilk açılışta INP gerilemesine yol açtı: 64 → 352 ms. | **Düzeltildi**: boşta ön yükleme ve kapalı bağlama, tekrar 64 ms |
| M-02 | Low | `site_settings.support_email` yer tutucu | **Bilgi** (iletişim sayfası kullanmıyor) |
| M-03 | Info | E2E varsayılan portu yerel sunucuyla çakışıyor | **Bilgi** |

## 5. UI/UX değerlendirmesi ve tasarım kapsamı

**Yapılan iyileştirmeler** (hepsi ortak token ve bileşenlerle):
- Header sadeleşti: sahte arama kutusu ve yinelenen Keşfet bağlantıları kaldırıldı.
- Footer kompakt: güvenli alan boşluğu, mobilde 40px bağlantı hedefleri, doğrulanmamış iddia yok.
- Ortak `FilterChips` bileşeni.
- `ActionForm`: kaydedilmemiş değişiklik koruması, erişilebilir hata bağlama, ilk hataya odak.
- Mobil admin tabloları.
- Galeri doğruluğu: büyütme yok, tek öğede ok yok, posteri olmayan videoda nötr yer tutucu, tembel yükleme ve ön yükleme.
- `DESIGN_SYSTEM.md` güncellendi: 8px ritim, tipografi, köşe, odak, dokunma, güvenli alan ve bileşen kuralları.

**Bilinçli olarak yapılmayanlar:** ana sayfanın görsel hiyerarşisi, profil kartlarının "görsel kalitesinin yükseltilmesi" ve galerinin çekiciliğini artıran yeniden tasarım.
- Sitedeki tek içerik C-01 kapsamındaki etiketsiz kurgusal kadın profilleri ve hepsi aynı WhatsApp numarasına yönlendiriyor.
- Bu yüzeyleri daha ikna edici hâle getirmek, gerçek kişi izlenimi veren bir yönlendirmeyi güçlendirir. Bu nedenle bu kısım C-01 çözülene kadar beklemede.
- Erişilebilirlik ve doğruluk düzeltmeleri bu sınırın dışında tutuldu ve yapıldı.

## 6. Mobil uyumluluk

- 320, 360, 390, 430, 768, 1024, 1440 ve 1920 px genişliklerde × 28 sayfa = **224 kontrol**: yatay taşma 0, konsol hatası 0, kırık görsel 0, axe ihlali 0 (axe 390 ve 1440 px'te; ham veri `sweep-r2.json`).
- INP ölçümü 390 px'te, 4× CPU yavaşlatmayla gerçek dokunuşlarla yapıldı (§8).

## 7. SEO analizi

**Yaş doğrulama ekranının etkisi (teknik değerlendirme):**
- Çerezsiz her istek (arama motoru dahil) `/`, `/kesfet`, `/sehir/*` ve `/profil/*` adreslerinde `noindex` yaş onayı sayfasını alıyor.
- **Googlebot'a farklı içerik sunulmuyor (cloaking yok).** Bot ve çerezsiz kullanıcı aynı yanıtı alıyor. Bunu `seo.spec.ts` yaş çerezi olmadan doğruluyor.
- Sonuç: bu sayfalar indekslenmiyor. Sitemap yalnızca gerçekten taranabilen 7 sayfayı listeliyor; her birinin çerezsiz 200 döndüğü, indekslenebilir olduğu, kendi canonical'ı, og:url'si ve benzersiz başlığı olduğu e2e testiyle doğrulandı.

**Hukuki değerlendirme** (kesin değildir; hukuk görüşü gerekir):
- Yetişkin içerikli sayfaların kapı arkasında tutulması reşit olmayanların korunması açısından savunulabilir.
- Kapıyı arama motorları için atlatmak, ya da kapı arkasındaki profilleri metin olarak indekslenebilir yapmak, kapının amacını zayıflatır.
- C-01 çözülmeden profil içeriğinin indekslenmesi kurgusal profillerin erişimini de büyütür.
- **Öneri:** C-01 çözülene kadar profil ve şehir sayfalarını indekslemeye açmamak. Sonra yalnızca görselsiz, doğrulanmış içerik taşıyan şehir sayfaları için kapıyı içerik üstüne bindirilmiş katman olarak yeniden tasarlamak; bot ve kullanıcıya aynı HTML gitmeli. `SITEMAP_INCLUDE_GATED=true` bu karardan sonra açılabilir.

**Doğrulananlar:**
- Canonical: ana sayfa ve `?yaka` varyantı `/` gösteriyor; `/sehir/istanbul?yaka` için temiz canonical + noindex.
- Boş il sayfası (bayburt) noindex.
- Olmayan profil gerçek 404.
- robots.txt `/admin`, `/api`, `/media` adreslerini engelliyor ve sitemap'i bildiriyor.
- JSON-LD üç sayfada geçerli JSON.
- og:url ve og:image tüm indekslenebilir sayfalarda var.

**Kopya içerik ve boş sayfalar:**
- İl/ilçe sayfaları yalnızca 3 veya daha fazla profil ya da özgün tanıtım metni varsa indekslenebiliyor (`shouldIndexListing`); filtreli varyantlar her zaman noindex.
- Doğrulanmamış iddialar ("doğrulanmış profiller", "açık rıza ile oluşturulur") genel metinlerden kaldırıldı.

**İç bağlantılar:** indekslenebilir sayfalar footer üzerinden birbirine ve `/sehirler` → il sayfalarına bağlı. Il sayfaları kapı arkasında, bu yüzden bağlantı değeri sınırlı.

## 8. Performans analizi

Ortam: mobil Lighthouse 12.8.2, varsayılan yavaşlatma, yerel üretim derlemesi, demo verisi. `main` @ `46049a2` ayrı bir worktree'de, dal aynı makinede ölçüldü. Sayfa başına **5 tekrarın medyanı** alındı; profil satırındaki dal ölçümü son düzeltmeden sonra yeniden 5 tekrarla yapıldı.

| Sayfa | main: Perf (min–max) / LCP / TBT / KB | dal: Perf (min–max) / LCP / TBT / KB | CLS (main → dal) |
|---|---|---|---|
| `/` | 76 (73–76) / 6085 ms / 177 ms / 893 | **89 (86–90) / 3780 ms / 92 ms / 520** | 0 → 0 |
| `/kesfet` | 76 (76–77) / 6082 / 154 / 883 | **89 (86–90) / 3708 / 71 / 509** | 0 → 0 |
| `/sehir/istanbul` | 76 (76–76) / 6084 / 169 / 874 | **90 (89–90) / 3636 / 78 / 502** | 0 → 0 |
| `/profil/[slug]` | 78 (74–78) / 5781 / 99 / 928 | **90 (86–91) / 3691 / 43 / 550** | 0 → 0 |
| `/sehirler` | 79 (79–79) / 5706 / 64 / 850 | **92 (92–95) / 3403 / 32 / 479** | 0 → 0 |
| `/iletisim` | (main'de yok) | 91 (89–91) / 3556 / 24 / 498 | — → 0 |

**INP yaklaşığı:**
- Lighthouse laboratuvarında INP ölçülmez. Bu yüzden ayrı bir Playwright ölçümü yapıldı: 390 px, 4× CPU yavaşlatma, gerçek dokunma ile, Event Timing girdilerine göre, 5 tekrarın medyanı.

| Etkileşim | main | dal |
|---|---|---|
| Filtre aç / kapat | 80 / 24 ms | 80 / 24 ms |
| Tema değiştir | 56 ms | 64 ms |
| Galeri aç / kapat | 64 / 16 ms | 64 / 16 ms (düzeltmeden önce 352 ms, V-04) |
| Form yazma / kategori seçimi | — | 16 / 32 ms |
| **INP yaklaşığı (en kötü etkileşim)** | **80 ms** | **80 ms** |

**İyileştirmenin nedenleri:**
- Fraunces italik ve SOFT ekseni kaldırıldı (~250 KB font).
- Kartlar ince veriyle gönderiliyor (C-23).
- Lightbox ilk yüke dahil değil (C-24).
- Konum ve profil okumaları `React.cache` ile istek başına bir kez yapılıyor (C-21, C-22).
- Proxy sorguları önbellekleniyor (C-13).

**Supabase sorguları:**
- Liste hidrasyonu toplu yapılıyor; N+1 yok.
- Sayımlar istek başına tek sefer okunuyor.
- Kart yanıtları biyografi ve zengin metin taşımıyor.

## 9. Güvenlik analizi

### 9.1 Yüksek riskli hukuki bulgu: C-01 (kapsam dışı, çözülmedi)

- **Bulgu:** production'daki 10 profilin tamamı yapay zekâyla üretilmiş kurgusal kadın portreleri.
- **Etiket yok:** "Kurgusal örnek" etiketi ve veritabanı kısıtları `88f2aed` ve migration `20261022000001` ile kaldırılmış.
- **Tek numara:** 10 profilin hepsi aynı WhatsApp numarasına yönlendiriyor.
- **Kontroller atlanıyor:** bu kayıtlar rıza, yaş doğrulaması ve moderasyon kontrollerinden geçmiyor.
- **Çelişki:** sitenin Güvenlik ve Kullanım Koşulları metinleriyle ve README'deki "müşteri yönlendirme yasak" kuralıyla çelişiyor.
- **Risk:** tüketicinin aldatılması ve yanıltıcı uygulama açısından ciddi hukuki risk taşıyabilir. Hukuki değerlendirme bir avukata aittir.
- **Durum:** kullanıcı talimatıyla bu turda davranış değiştirilmedi. Bulgu **açık ve çözülmemiş** olarak kalıyor.
- **Önerilen çözüm:** etiketleri geri getirmek ve WhatsApp'ı kaldırmak, ya da örnek profilleri gizlemek.

### 9.2 Doğrulanan kontroller (2. tur)

| Kontrol | Yöntem | Sonuç |
|---|---|---|
| RLS: `contact_messages`, `rate_limit_buckets` | SQL testi (anon/MFA'sız/MFA'lı) + yerel Supabase REST üzerinden anon okuma, yazma ve RPC denemesi | ✅ anon erişemiyor; MFA'sız oturum 0 satır görüyor |
| Yetki yükseltme | e2e: aal1, imzası bozuk, süresi dolmuş, yönetici olmayan ve rastgele oturum; Supabase modunda zorunlu TOTP → AAL2 | ✅ hepsi reddediliyor |
| CSRF / tekrar oynatma | Yakalanan Server Action oturumsuz ve sahte oturumla tekrar gönderildi | ✅ işlem yapılmadı, durum değişmedi |
| IDOR | Bilinmeyen mesaj kimliği | ✅ veri sızmıyor (V-03: durum kodu 200) |
| SSRF | Görsel vekili yalnızca yapılandırılmış Supabase origin'i + `/storage/v1/object/public/` + yayında olan URL; `redirect: "error"`, 25 MB / 40 MP sınırı | ✅ kod incelemesi + entegrasyon testi |
| Dosya yükleme | Magic byte (JPEG/PNG/WebP, MP4/WebM), boyut sınırları, sharp ile yeniden kodlama (EXIF temizlenir), imzalı yükleme | ✅ kod incelemesi |
| XSS | `< >` zod'da ve DB CHECK'te reddediliyor; tek ham HTML noktası JSON-LD (`<` kaçışlı) | ✅ e2e + entegrasyon testi |
| Gizli anahtarlar | `.next/static` içinde 10 anahtar adı ve test sırrı arandı; istemci bileşenlerinde `process.env` yok | ✅ 0 eşleşme |
| Loglar | `logError` yalnızca kapsam, kod ve maskelenmiş mesaj yazıyor; ham hata nesnesi loglanmıyor | ✅ unit testi (e-posta ve mesaj metni logda yok) |
| Oran sınırı (production güvenilirliği) | `rate_limit_hit` atomik upsert; anahtarlar özetli; yerel Supabase'de veritabanı sayacı sunucu yeniden başlatmalarında korundu (e2e sırasında gözlendi) | ✅ |

### 9.3 Vercel WAF ve oran sınırı yapılandırması (önerilen; uygulanmadı)

Uygulama içi sınırlar artık paylaşılan bir sayaçla çalışıyor. Ek savunma olarak Vercel Firewall → Rate limiting kuralları önerilir:

| Yol | Yöntem | Önerilen sınır | Uygulama içi sınır |
|---|---|---|---|
| `/admin/giris` | POST | IP başına 20 / 15 dk | IP başına 10, hesap başına 5 / 15 dk |
| `/iletisim` | POST | IP başına 10 / saat | 3 / 10 dk + 5 / saat (DB) + tekrar engeli |
| `/kaldirma-talebi` | POST | IP başına 10 / saat | 3 / saat |
| `/profil/*` (şikâyet) | POST | IP başına 20 / saat | saatlik + profil başına sınır |
| `/api/discovery` | GET | IP başına 120 / dk | 60 / dk |
| `/api/image` | GET | IP başına 600 / dk | yalnızca yayındaki URL |

## 10. İletişim modülü

**Akış:**

| Adım | Ayrıntı |
|---|---|
| 1. İstemci ön kontrolü | Zorunlu alanlar, `< >` reddi, karakter sayacı |
| 2. Sunucu doğrulaması | zod şeması |
| 3. Bot kontrolü | Honeypot alanı + 2 sn en kısa doldurma süresi |
| 4. Oran sınırı | Paylaşılan sayaç: 3 / 10 dk |
| 5. Tekrar engeli | Aynı içerik 10 dk içinde gönderilemez (paylaşılan) |
| 6. Saatlik sınır | Veritabanı sayacı: 5 / saat |
| 7. Kayıt | `contact_messages` tablosuna yazılır |
| 8. Denetim kaydı | Yalnızca kategori; kişisel veri yok |
| 9. Bildirim | İsteğe bağlı (Resend); kişisel veri içermez |

- **Hata yönetimi:** veritabanı hatasında ve tablo yokken kullanıcı yalnızca "İletişim formu şu anda kullanılamıyor…" mesajını görür. Bu, yerel Supabase'de tablo geçici olarak yeniden adlandırılarak e2e ile doğrulandı. Log kişisel veri içermez.
- **Saklama ve silme politikası** (varsayılanlar hukuk incelemesiyle kesinleştirilmeli):
  - Yanıtlanan ve kapatılan mesajlar son güncellemeden **365 gün** sonra silinir (`CONTACT_RETENTION_DAYS`).
  - Spam **30 gün** sonra silinir (`CONTACT_SPAM_RETENTION_DAYS`).
  - Yeni ve işlemdeki mesajlar otomatik silinmez.
  - Değer `0` olursa otomatik silme kapanır.
  - Silme günlük cron ile yapılır ve toplu silme sayısı denetim kaydına yazılır.
  - KVKK silme talepleri için yönetim panelinde gerekçeli **kalıcı silme** var; denetim kaydında yalnızca kategori ve gerekçe tutulur.

**Test sonuçları:**

| Seviye | Kapsam | Sonuç |
|---|---|---|
| Unit (`contact.test.ts`, 26 test) | Şema, honeypot, hız, tekrar, süreç ve DB sınırları, durum ve okunma, spam sayacı, bildirim yapılandırması, yer tutucu e-posta, DB hatasında nötr mesaj + PII'siz log, saklama, silme, paylaşılan sınır geri düşüşü | ✅ |
| Entegrasyon (yerel Supabase, 7 test) | CRUD + denetim, CHECK kısıtları, anon REST/RPC reddi, DB tabanlı sınır, saklama, medya kontrolü, SEO silme | ✅ |
| E2E demo (`contact.spec`, `security.spec`) | Erişilebilirlik, istemci doğrulaması, XSS reddi, gönderim → admin'de okundu → durum → arama, oturumsuz yönlendirme, tekrar ve oran uyarısı, teknik ayrıntı sızmaması | ✅ 13/13 |
| E2E Supabase (`supabase-contact.spec`) | Gerçek insert, ham IP saklanmaması, tablo yokken nötr mesaj | ✅ 2/2 |
| Admin MFA (Supabase) | `supabase-auth.spec`: zorunlu TOTP, aal1 ile panel engeli | ✅ |

## 11. Admin geliştirmeleri

§3'teki A- satırlarına bakın. Bu turda eklenenler:
- Tüm `ActionForm`'larda kaydedilmemiş değişiklik koruması ve erişilebilir hata bağlama.
- SEO ayarı silme.
- Abonelik ve KVKK talebi durum filtreleri.
- Mobil tablo sütunları.
- "Taslağa al" onayı.
- Sayısal yenileme süresi.
- İletişim mesajı kalıcı silme.

## 12. 2. tur değişiklik kaydı

| # | Sorun | Kök neden | Düzeltme | Dosyalar | Test | Kalan risk |
|---|---|---|---|---|---|---|
| 1 | Oran sınırları sunucusuz ortamda güvenilmezdi (C-06, C-09) | Sayaç her instance'ın belleğindeydi | Atomik Postgres sayacı (`rate_limit_hit`, yalnızca service role), özetli anahtarlar, yerel sayaca geri düşüş | `migrations/…0003`, `rate-limit.ts`, `supabase.ts`, giriş, KVKK, şikâyet, iletişim, discovery | SQL, unit, entegrasyon, e2e | Migration yoksa yerel sayaca düşer (bir kez loglanır) |
| 2 | Hatalarda kişisel veri loglanabilir ve kullanıcı teknik ayrıntı görebilirdi | `console.error(e)` ve `res.error` ham nesneyle yazılıyordu | `logError` + `redact`; `DbError` yalnızca kod ve mesaj taşır; iletişimde `ContactUnavailableError` | `log.ts`, actions, `contact.ts`, `supabase.ts` | unit, Supabase e2e | — |
| 3 | Saklama politikası yoktu | — | Env ile yapılandırılabilir otomatik silme + gerekçeli kalıcı silme | `contact.ts`, cron, admin detay | unit, entegrasyon | Süreler hukukça onaylanmalı |
| 4 | Cron'da bir adımın hatası tümünü düşürüyordu; medya eşitlemesi yoktu (C-04) | Tek `Promise.all` | Adımlar bağımsız; `reconcilePublicMedia`; oran tablosu temizliği; hata olursa 500 | `api/cron/route.ts`, `media.ts` | build | Production cron logları izlenmeli |
| 5 | Kaldırılan profil 200 dönüyordu (C-19); proxy her istekte DB'ye gidiyordu (C-13) | Suspense içinde `notFound()`; önbellek yoktu | Proxy'de profil doğrulaması (30 sn) ve konum önbelleği (10 dk) | `proxy.ts`, `location-path.ts` | `seo.spec` 404 testi | Profil kaldırıldıktan sonra 30 sn'ye kadar not-found içeriği 200 ile görünebilir |
| 6 | Kart verisi büyüktü (C-23) | Tam `PublicProfile` istemciye gidiyordu | `CardProfile` / `toCardProfile` | `types.ts`, `public.ts`, kart, ızgara, progressive | unit, e2e | — |
| 7 | Lightbox ilk yükteydi (C-24); büyütme, oklar (P-12); poster (C-11) | Eager import; genişlik filtresi | `media-lightbox-view.tsx` dinamik; boşta ön yükleme ve bağlama; doğal genişlik sınırı | profile/* | Lighthouse, INP | — |
| 8 | INP gerilemesi (V-04) | İlk dokunuşta modül indiriliyordu | Boşta ön yükleme ve kapalı bağlama | `media-lightbox.tsx` | INP 352 → 64 ms | — |
| 9 | Admin formları (A-02, A-07, A-04, A-11, A-12, A-15, A-16) | Ortak form katmanı yoktu | `ActionForm` koruma ve erişilebilirlik; `FilterChips`; SEO silme; mobil sütunlar; onaylar; sayı girişi | `action-form.tsx`, `action-button.tsx`, admin sayfaları | e2e (61) | A-13, A-21 açık |
| 10 | og:url eksikti (P-07); doğrulanmamış footer iddiası (P-02) | Alt sayfa `openGraph` kökü değiştiriyordu | `ogFor()` | `lib/site.ts`, statik sayfalar, footer | `seo.spec` | — |
| 11 | Kod tekrarı ve ölü kod (C-27, C-28); denetimde slug (C-07); NULL imleç (C-15) | — | Tek konum dizini, 7 UI bileşeni silindi, PII'siz denetim, NULLS LAST | `locations.ts`, `location-directory.ts`, `profiles.ts`, `supabase.ts` | unit | — |
| 12 | Sahipsiz medya dosyaları (C-03) | Eski kova kayıtla eşleşmiyordu | `scripts/media-orphans.mjs` (varsayılan dry-run) | script | yerel Supabase'de bulma ve silme doğrulandı | Production'da elle çalıştırılmalı |
| 13 | Testler eksikti | — | `seo.spec`, `security.spec`, `supabase-contact.spec`, `contact-security.test` | tests/* | ✅ | `examples.spec` C-01 verisine bağlı |
| 14 | Header ve footer tekrarları | — | Arama bağlantısı kaldırıldı, footer kompakt; DESIGN_SYSTEM güncellendi | header, footer, `DESIGN_SYSTEM.md` | sweep 224/0 | Görsel yeniden tasarım §5'e göre beklemede |

## 13. Test sonuçları (bu turda çalıştırıldı)

| Test | Komut | Sonuç |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ |
| ESLint | `npm run lint` | ✅ 0 hata, 0 uyarı |
| Unit | `npx vitest run` | ✅ 110/110 (8 dosya) |
| DB/RLS | `npm run test:db` (geçici Postgres 16) | ✅ ALL DB TESTS PASSED (iletişim + oran sınırı politikaları dahil) |
| **Entegrasyon** | `npm run test:integration` (yerel yalıtılmış Supabase, 127.0.0.1:54321, tüm migration'lar uygulandı) | ✅ **11/11** (2 dosya) |
| Production build | `npx next build` (demo ve Supabase modu) | ✅ |
| E2E demo | `E2E_PORT=3230 npx playwright test` | ✅ 61 geçti · 7 atlandı (Supabase gerektirenler) |
| E2E Supabase | `E2E_SUPABASE=1` + yerel Supabase: supabase-auth, database-discovery, supabase-contact, seo | ✅ 11/11 (iki kez çalıştırıldı) |
| E2E Supabase: `examples.spec` | aynı ortam | ❌ **2 başarısız**: yerel veritabanında örnek profil verisi yok (0 kayıt); test yalnızca production'daki C-01 verisiyle geçer. Production'da çalıştırılmadı. |
| Mobil responsive + axe | 28 sayfa × 8 genişlik | ✅ 224 kontrol, 0 sorun |
| SEO doğrulama | `seo.spec.ts` (çerezsiz tarayıcı görünümü) | ✅ 6/6 (demo ve Supabase modu) |
| Lighthouse | 6 sayfa × 5 tekrar, main ve dal | ✅ §8 |
| INP | 5 tekrar, main ve dal | ✅ §8 |

## 14. Ekran görüntüleri

- **Önce:** `artifacts/audit-2026-10-18/before/` (70 dosya, production ve yerel admin).
- **1. tur sonrası:** `artifacts/audit-2026-10-18/after/` (56 dosya).
- **2. tur sonrası:** `artifacts/audit-2026-10-18/after-r2/` (56 dosya, 390 ve 1440 px; `/`, `/kesfet` ve `/iletisim` için 390 px tam sayfa).

## 15. Kalan problemler ve öneriler

1. **C-01 ve C-02** (kapsam dışı, çözülmedi). Çözüldükten sonra ana sayfa, kart ve galeri tasarımı yapılabilir; `examples.spec` yeni davranışa göre güncellenmeli.
2. **V-01:** Preview ortamı için ayrı bir Supabase projesi tanımlanmalı; Preview'dan production service role anahtarı kaldırılmalı.
3. **V-02:** `ALLOW_DEMO_MODE` production'dan kaldırılmalı.
4. **C-03 ve C-04:** production'da `node scripts/media-orphans.mjs` (önce rapor, yedekten sonra `--delete`).
5. **C-16:** yaş kapısı ve indeksleme ürün/hukuk kararı (§7).
6. **Low açıklar:** A-13, A-21, P-08, V-03, C-12, C-20, C-25, P-15, P-17, A-19, A-20.
7. **Belgeler:** QA_REPORT, SECURITY ve README güncellenmeli (C-29).
8. **Hukuk:** iletişim saklama süreleri, `/kvkk` içindeki veri sorumlusu yer tutucuları, aydınlatma/rıza nitelendirmesi.

## 16. Production'a geçiş kontrol listesi

**Karar ve onay**
- [ ] C-01 için karar verildi; hukuk görüşü alındı.
- [ ] PR #1 incelendi ve onaylandı (otomatik merge yok).

**Ortam (Vercel)**
- [ ] Preview ortamı ayrı bir Supabase projesine bağlandı; Preview'da production `SUPABASE_SERVICE_ROLE_KEY` yok (V-01).
- [x] `ALLOW_DEMO_MODE` production'da `false` (V-02, doğrulandı).
- [ ] `IP_HASH_SALT` ve `CRON_SECRET` tanımlı (zaten var).
- [ ] İsteğe bağlı: `CONTACT_PUBLIC_EMAIL`, `RESEND_API_KEY` + `CONTACT_NOTIFY_TO` + `CONTACT_NOTIFY_FROM`, `CONTACT_RETENTION_DAYS`, `CONTACT_SPAM_RETENTION_DAYS`.

**Veritabanı** (önce staging, sonra production; elle ve sırayla)
- [ ] Yedek alındı.
- [ ] `20261023000001_contact_messages.sql`
- [ ] `20261023000002_legacy_media_paths.sql`
- [ ] `20261023000003_shared_rate_limits.sql`
- [ ] Staging'de `npm run test:integration` yeşil (yalnızca staging URL'iyle; production'a karşı değil).
- [ ] Supabase Advisors: RLS uyarısı yok.

**Deploy**
- [ ] Önce migration'lar, sonra kod. Kod önce giderse: iletişim formu nötr hata gösterir, oran sınırı yerel sayaca düşer, yönetim paneli çökmez.
- [ ] Preview'da kontrol: `/iletisim` gönderimi → `/admin/iletisim` → durum → silme; olmayan profil 404; `/sitemap.xml`.
- [ ] Vercel WAF oran kuralları (§9.3).
- [ ] İlk cron çalışmasından sonra `/api/cron` yanıtında `ok: true` (log).

**Sonrası**
- [ ] `node scripts/media-orphans.mjs` raporu incelendi; gerekirse yedekten sonra `--delete`.
- [ ] Search Console'a yeni sitemap gönderildi.

## 17. Deploy hazırlığı (son kontrol turu)

### 17.1 Çalışma durumu
- Commit edilmemiş değişiklik yok.
- Alt oturumların tamamı bitti.
- PR #1 mergeable/CLEAN durumda; Vercel kontrolleri geçti.
- Production'a gidecek kod: PR #1'in başı (bu bölümü ekleyen commit). Merge'den sonraki SHA `main` üzerinde oluşacak.

### 17.2 Testler (istenen sırayla)

| Test | Sonuç |
|---|---|
| `npm run lint` | ✅ |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 110/110 |
| `npm run test:db` | ✅ |
| `npm run test:integration` | ✅ 11/11 (önce `reset.sh` çalıştı; içeriği kontrol edildi, yalnızca `supabase db reset --local`, proje link'li değil) |
| `npm run build` | ✅ |
| E2E demo modu | ✅ 61 geçti, 7 atlandı |
| E2E Supabase modu, Supabase'e özgü spec'ler | ✅ 11/11 |
| E2E Supabase modu, `examples.spec` | ❌ 2 başarısız (yerelde C-01 verisi yok) |

E2E paketinin tamamı Supabase modunda çalıştırıldığında 27 test başarısız oldu. Bunlar demo giriş bilgileri, demo verisi ve demo oturum çerezi kullanan, tasarım gereği demo moduna özgü testler. Ayrıca bu testlerin başarısız giriş denemeleri yeni paylaşılan giriş sınırını (10 / 15 dk) doldurdu ve `supabase-auth.spec`'i geçici olarak engelledi. Bu, oran sınırının sunucu yeniden başlatmalarından bağımsız çalıştığını gösteriyor; yerel sayaçlar temizlenince test geçti.

### 17.3 Production veritabanı (yalnızca okuma; PostgREST şeması ve sayımlar)

| Migration | Production'da | Veri kaybı riski | RLS |
|---|---|---|---|
| `20261023000001_contact_messages` | **Yok** (`contact_messages` tablosu yok) | Yok: yalnızca yeni tip ve tablo | Yalnızca MFA'lı admin; anon `revoke all` |
| `20261023000002_legacy_media_paths` | Bilinmiyor (geçmiş tablosu REST'te görünmüyor); hedef satır **0** (`profile_media` boş) | Yok: 0 satır güncellenir; idempotent | — |
| `20261023000003_shared_rate_limits` | **Yok** (tablo ve RPC yok) | Yok: yalnızca yeni nesneler | RLS açık, politika yok (yalnızca service role); fonksiyonlar yalnızca `service_role` |

- **Production verisi:** 0 yayında gerçek profil, 0 medya, 0 KVKK talebi, 10 görünür kurgusal örnek profil.
- **Yedek: doğrulanamadı.** Supabase yönetim erişimi yok (`supabase login` / erişim token'ı yok). DEPLOYMENT.md'ye göre Free planda günlük yedek de yok.
- **Migration uygulama: yapılamadı.** Veritabanı bağlantı dizesi veya şifresi ortamda yok; migration'lar REST üzerinden uygulanamaz.

### 17.4 Preview ortamı
- **Değişkenler:** Preview ve Production'da `NEXT_PUBLIC_SUPABASE_URL`, anon anahtarı, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`, `CRON_SECRET` ve diğerleri **aynı** (özet karşılaştırması). Preview production veritabanına service role ile yazabilir (V-01).
- **Önizleme okuma testleri** (`hilal-efk04jbmn…`, `vercel curl`):
  - `/`, `/kesfet`, `/sehir/istanbul`, `/sehir/istanbul/kadikoy`, profil ve `/iletisim` 200 dönüyor.
  - Olmayan profil 404, `/admin` 307 (giriş) dönüyor.
  - Sitemap 7 taranabilir adres içeriyor.
  - Keşif yanıtında biyografi alanı yok.
- **İletişim formu ve gelen kutusu önizlemede test edilmedi.** Gönderim production veritabanına yazar; ayrıca tablo yok ve form nötr hata verir.

### 17.5 Geri dönüş planı (hazır; uygulanmadı)

**Uygulama:** Vercel → Deployments → önceki production deploy'u (`hilal-7z89qvjiz…`, commit `46049a2`) → "Promote to Production" (anında geri alma). Eski kod yeni tabloları kullanmaz; migration'lar geri alınmasa da çalışır.

**Veritabanı** (yalnızca gerekirse, ters sırayla; Supabase SQL Editor):
```sql
-- 0003 geri al (veri kaybı yok: yalnızca geçici sayaçlar)
drop function if exists public.rate_limit_purge();
drop function if exists public.rate_limit_clear(text);
drop function if exists public.rate_limit_hit(text, integer, integer);
drop table if exists public.rate_limit_buckets;
-- 0002 geri al (bugün 0 satır etkilenir)
update public.profile_media set public_paths = '{}'
where array_length(public_paths, 1) = 1 and public_paths[1] like 'legacy-profile-images:%';
-- 0001 geri al (DİKKAT: gelen iletişim mesajlarını siler; önce dışa aktarın)
drop table if exists public.contact_messages;
drop type if exists public.contact_status;
drop type if exists public.contact_category;
```

### 17.6 Karar: production deploy DURDURULDU

Talimattaki durdurma koşullarından dördü sağlanıyor:
1. **Doğrulanamayan yedek:** production yedeği ve geri yükleme yöntemi doğrulanamadı.
2. **Uygulanamayan migration:** 0001 ve 0003 eksik ve benim uygulayabileceğim bir kanal yok.
3. **Preview production veritabanını kullanıyor** (V-01, High): "preview production'a test verisi yazmasın" koşulu sağlanmıyor; iletişim formu ve gelen kutusu preview'da güvenle test edilemiyor.
4. **Başarısız test:** `examples.spec` (2), C-01 verisine bağlı.

C-01 (Critical) açık risk olarak duruyor (kapsam dışı).
