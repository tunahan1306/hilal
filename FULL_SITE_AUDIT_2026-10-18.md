# Hilal — Kapsamlı Site Denetimi (2026-10-18)

Dal: `feat/site-audit-contact` · Taban: `main` @ `46049a2` · Hazırlayan: Claude (Claude Code) · Production'a deploy veya migration **uygulanmadı**.

Durum etiketleri: **Düzeltildi** · **Kısmen** (bir kısmı düzeltildi, kalan kısmı açıkça yazıldı) · **Açık** (düzeltilmedi) · **Karar bekliyor** (ürün/hukuk kararı gerekiyor).

---

## 1. Yönetici özeti

- **69 benzersiz bulgu** kayda geçti (tablolarda 72 satır var; P-01=C-01, P-05=C-16, P-06=C-17 iki tabloda da görünüyor): **1 Critical, 9 High, 28 Medium, 29 Low, 2 Info**.
- **Düzeltilen:** 22 bulgu tamamen, 24 bulgu kısmen. **Açık:** 18. **Karar bekleyen:** 2 (C-01, C-02). **Bilgi:** 3 (değişiklik gerekmedi).
- **En önemli bulgu (Critical, C-01): yayındaki 10 profilin tamamı yapay zekâyla üretilmiş kurgusal kadın portreleri.**
  - Profillerde "kurgusal" etiketi yok.
  - Her profilde aynı telefon numarasına giden WhatsApp düğmesi var.
  - Bu durum `88f2aed` ("son kommit") ile bilinçli olarak getirildi.
  - Bu durum sitenin kendi Güvenlik ve Kullanım Koşulları metinleriyle ve README'deki "müşteri yönlendirme yasak" kuralıyla çelişiyor. Ayrıntı: §9.1.
  - Bu nedenle **ana sayfa, profil kartı ve profil galerisinin görsel yeniden tasarımı uygulanmadı.** Bu profillerin daha ikna edici görünmesine katkı vermedim. Karar sahibine üç seçenek sunuldu; yanıt gelene kadar bu madde açık.
- **Yeni iletişim modülü çalışıyor.** Kapsamı:
  - `/iletisim` sayfası.
  - Sunucu doğrulaması, honeypot, doldurma süresi kontrolü, iki katmanlı oran sınırı ve tekrar gönderim koruması.
  - Yalnızca MFA'lı yöneticinin okuyabildiği (RLS) `contact_messages` tablosu.
  - `/admin/iletisim` gelen kutusu: okundu/okunmadı, durum, kategori, arama, sayfalama, işlem geçmişi.
  - E-posta bildirimi yalnızca anahtar yapılandırılırsa gönderiliyor.
- **Gizlilik düzeltmeleri:**
  - Görsel vekili artık yalnızca şu an yayında ve onaylı medyayı sunuyor.
  - Eski herkese açık kovadaki dosyalar silme sırasında kaldırılıyor (migration).
  - Herkese açık yüklemelerin CDN önbelleği 1 yıldan 10 dakikaya indi.
- **Performans (mobil Lighthouse, yerel üretim derlemesi):**
  - Performans skoru 68–78'den 86–90'a çıktı.
  - LCP 5,9 sn'den 3,5–4,2 sn'ye indi.
  - Sayfa ağırlığı yaklaşık 873 KB'den yaklaşık 500 KB'ye indi.
  - Ana etken Fraunces italik stili ve SOFT ekseninin kaldırılması.
- **Testler:**
  - Typecheck, lint, 103/103 unit, DB politika testleri ve production build geçti.
  - E2E: 47 geçti, 5 atlandı. Atlananlar Supabase gerektiriyor.
  - Taramada 28 sayfa × 8 genişlik = 224 kontrol yapıldı: 0 konsol hatası, 0 taşma, 0 kırık görsel, 0 axe ihlali.
  - **Entegrasyon testleri çalıştırılamadı** (yerel Supabase yığını başlamadı; §13).

## 2. İncelenen sayfalar

| Alan | Rotalar |
|---|---|
| Public | `/`, `/?yaka=anadolu`, `/kesfet`, `/sehirler`, `/sehir/istanbul`, `/sehir/istanbul?yaka=avrupa`, `/sehir/istanbul/kadikoy`, `/sehir/ankara`, `/sehir/bayburt` (boş), `/sehir/xyz` (404), `/profil/[slug]`, `/paketler`, `/guvenlik`, `/kvkk`, `/kullanim-kosullari`, `/kaldirma-talebi`, `/yas-onayi` (kabul/ret), `/bildirim-alindi`, `/bulunamadi`, rastgele 404, `/iletisim` (yeni), `robots.txt`, `sitemap.xml` |
| Admin | `/admin/giris`, `/admin`, `/admin/profiller`, `/admin/profiller/yeni`, `/admin/profiller/[id]` (7 sekme), `/admin/sikayetler`, `/admin/sikayetler/[id]`, `/admin/talepler`, `/admin/abonelikler`, `/admin/seo`, `/admin/istatistik`, `/admin/ayarlar`, `/admin/denetim`, `/admin/ilgi-alanlari`, `/admin/iletisim` (yeni), `/admin/iletisim/[id]` (yeni) |

**Denetim yöntemi:**
- **Production (yalnızca okuma):** sadece GET istekleri ve yaş onayı yapıldı. Yaş onayı yalnızca çerez yazar. Hiçbir form gönderilmedi.
- **Yönetim paneli:** yerelde bellek içi demo modunda denetlendi. Supabase bağlantısı yoktu, production'a dokunulmadı.
- **Kod:** salt okuma denetimi.
- **Doğrulama:** yerel production build (`next start`, demo modu) üzerinde yapıldı.

## 3. Sayfa bazında sorunlar

Kimlikler: **P-** public tarayıcı denetimi, **A-** admin, **C-** kod denetimi, **M-** bu oturumdaki ek gözlem.

### Public

| ID | Önem | Sayfa | Bulgu ve kanıt | Dosya | Durum |
|---|---|---|---|---|---|
| P-01 / C-01 | **Critical** | `/`, `/kesfet`, `/profil/*` | 10 profilin tamamı YZ üretimi kurgusal kadın (`kurgu-kadin-*`, `assets/profile-portraits/generation.json`). Hiçbirinde "kurgusal" ibaresi yok. 10 kartın 10'u aynı `wa.me/90507…` numarasına gidiyor. Ayrıntı §9.1 | `profile-card.tsx`, `profil/[slug]/page.tsx`, migration `20261022000001` | **Karar bekliyor** |
| P-02 | High | genel metinler | Hiçbir profil doğrulanmamışken metinler "doğrulanmış profiller" diyordu (`/kesfet?dogrulanmis=1` → 0 sonuç). | `site.ts`, `kesfet`, `sehirler`, `location-seo.ts`, `site-footer.tsx` | **Kısmen**: genel metinlerden kaldırıldı; footer'daki "Profiller … açık rıza ile oluşturulur" cümlesi C-01 kararına bağlı |
| P-03 | Medium | `/kesfet` mobil filtre | Sheet'in X düğmesi sticky başlığın altında kalıyordu, tıklanamıyordu. Erişilebilir adı İngilizceydi ("Close"). | `ui/sheet.tsx`, `ui/dialog.tsx` | **Düzeltildi**: z-20, 40px hedef, "Kapat" |
| P-04 | Medium | `/kesfet` mobil filtre | Ana düğme ekranın alt kenarına yapışıktı (`pb-safe` → 0px). | `filter-bar.tsx` | **Düzeltildi**: `max(env(safe-area-inset-bottom),1rem)` |
| P-05 / C-16 | High | SEO | Çerezsiz tarayıcı `/`, `/kesfet`, `/sehir/*`, `/profil/*` adreslerinde `noindex` yaş kapısını görüyor; buna rağmen sitemap bu adresleri listeliyordu. | `proxy.ts`, `sitemap.ts` | **Kısmen**: sitemap artık yalnızca taranabilir sayfaları içeriyor; yaş kapısının tasarımı §15'te |
| P-06 / C-17 | Medium | `/` | Canonical yoktu; `/?yaka=anadolu` kopya olarak indekslenebiliyordu. | `(site)/page.tsx` | **Düzeltildi** |
| P-07 | Medium | tümü | og:image hiç yoktu (twitter kartı `summary_large_image` olduğu hâlde); og:url çoğu sayfada eksikti. | `app/layout.tsx` | **Kısmen**: marka OG görseli eklendi (kişi fotoğrafı yok); sayfa bazlı og:url açık |
| P-08 | Low | `/bulunamadi` | 200 dönüyor (soft 404); noindex ve robots ile engelli. | `proxy.ts` | **Açık** |
| P-09 | Low | metinler | "yaş aralığı göre" yazım hatası, site açıklamasında tekrar, Bayburt'ta "0 doğrulanmış…". | çeşitli | **Düzeltildi** |
| P-10 | Low | `/kullanim-kosullari` | Sayfaya özel açıklama yok. | sayfa | **Açık** |
| P-11 | Medium | `/` | 4 profil hem yaka listesinde hem "Öne çıkan" bölümünde görünüyordu. | `(site)/page.tsx` | **Düzeltildi** |
| P-12 | Low | lightbox | Masaüstünde 640px görsel ~694px'e büyütülüyor; tek fotoğrafta pasif oklar görünüyor. | `media-lightbox.tsx` | **Açık** (galeri tasarımı C-01 nedeniyle beklemede) |
| P-13 | Medium | kart/profil | WhatsApp düğmesi kartta yeşil, profilde pembe. | `profile-card.tsx` | **Açık** (C-01'e bağlı; bu düğmenin görünürlüğünü artırmadım) |
| P-14 | Medium | `/` | "Şehir şehir keşfet" bölümünde "0 profil" yazan, boş noindex sayfalara giden bağlantılar vardı. | `(site)/page.tsx` | **Düzeltildi** |
| P-15 | Low | genel | 10–11px metinler (mobil nav, konum etiketi, 18+ rozeti). | `age-badge.tsx` | **Kısmen**: 18+ rozeti 11px |
| P-16 | Low | header | Odak halkası %50 opaklıktaydı. | `ui/button.tsx` | **Düzeltildi** (%80) |
| P-17 | Low | `/paketler` | Pakete dahil olmayan özellik de soluk tik ve üstü çizili gösteriliyordu, "dahil" gibi okunuyordu. | `paketler/page.tsx` | **Kısmen**: çizgi (–) simgesi; sütun hizası ve CTA açık |
| P-18 | Low | profil | H1 erişilebilir adı "Selin31" olarak okunuyordu; sağ sütun boşluğu. | `profil/[slug]/page.tsx` | **Kısmen**: H1 "Selin, 31 yaşında"; yerleşim C-01 nedeniyle beklemede |
| P-19 | Info | — | `/iletisim` yoktu (404). | — | **Düzeltildi** (yeni modül) |
| M-01 | Low | header | Masaüstündeki "Şehir veya profil keşfet" kutusu arama alanı gibi görünüyordu ama yalnızca `/kesfet` bağlantısıydı; menüdeki Keşfet ile aynı yere gidiyordu. | `site-header.tsx` | **Düzeltildi**: kaldırıldı, simge bağlantısı kaldı |

### Admin

| ID | Önem | Rota | Bulgu ve kanıt | Dosya | Durum |
|---|---|---|---|---|---|
| A-01 | High | `profiller/[id]` | Sekme değiştirince "Genel bilgiler"deki kaydedilmemiş değişiklikler kayboluyordu ("Ceren DEĞİŞTİ" → "Ceren"). | `profiller/[id]/page.tsx` | **Düzeltildi** (`forceMount`) |
| A-02 | High | formlar | Kaydedilmemiş değişiklikler için hiçbir uyarı yoktu. | — | **Kısmen**: profil formunda `beforeunload` ve uygulama içi bağlantı onayı (`use-unsaved-changes.ts`); diğer formlar açık |
| A-03 | High | nav | Nav öğesi, palet ve `g m` kısayolu var olmayan `/admin/medya` rotasına gidiyordu (404). | `admin-nav.tsx`, `command-palette.tsx` | **Düzeltildi** (kaldırıldı; `g i` → iletişim) |
| A-04 | Medium | `/admin/seo` | `/sehir/` ve `/admin` yolları kabul ediliyordu. | `schemas.ts` | **Kısmen**: doğrulama düzeltildi; silme kontrolü açık |
| A-05 | Medium | ilgi alanları, abonelik | Hata yalnızca toast olarak çıkıyordu, alana bağlı değildi. | `actions.ts`, `subscription-form.tsx` | **Düzeltildi** |
| A-06 | Medium | `/admin/ayarlar` | İngilizce Zod mesajları görünüyordu. | `actions.ts` | **Düzeltildi** |
| A-07 | Medium | formlar | Hatalar alana `aria-describedby` ile bağlı değildi. | `profile-form.tsx` | **Kısmen** (profil formu) |
| A-08 | Medium (axe serious) | `/admin` | KPI şeridinde `<dl>` içinde `<a>` vardı (definition-list, dlitem ihlalleri). | `(panel)/page.tsx` | **Düzeltildi** (liste yapısı) |
| A-09 | Medium (axe serious) | abonelikler | Koyu temada "Sponsorlu" rozetinin kontrastı 4,27:1. | `status-badge.tsx` | **Düzeltildi** |
| A-10 | Medium | profil sekmeleri, 390 | Sekmeler taşıyordu ve bunun görsel ipucu yoktu. | `profiller/[id]/page.tsx` | **Kısmen** (kenar solma ipucu) |
| A-11 | Medium | tablolar, 390 | Tablolar yatay kaydırma gerektiriyor; mobilde kart düzeni yok. | çeşitli | **Açık** |
| A-12 | Medium | listeler | Arama, filtre ve sayfalama yoktu. | — | **Kısmen**: Şikâyetler (durum filtresi), Denetim (işlem/tür/kimlik), İletişim (tam); Abonelikler ve Talepler açık |
| A-13 | Low | profiller | Filtre URL'ye yazılmıyor, `aria-sort` yok. | `profiles-table.tsx` | **Açık** |
| A-14 | Medium | talepler | KVKK reddinde gerekçe istenmiyordu. | `talepler/page.tsx`, `privacy.ts` | **Düzeltildi** (zorunlu, ≥10 karakter, denetime yazılıyor) |
| A-15 | Medium | yıkıcı işlemler | Gerekçe zorunlu değildi; Arşivle düğmesi yıkıcı görünmüyordu. | `actions.ts`, `action-button.tsx` | **Kısmen**: yayından kaldırma, red ve şikâyet kararlarında gerekçe zorunlu (arayüz ve sunucu); Arşivle yıkıcı stilde; "Taslağa al" onayı açık |
| A-16 | Low | abonelik yenileme | Ay sayısı serbest metin kutusuna giriliyor. | `abonelikler/page.tsx` | **Açık** |
| A-17 | Low | profil Geçmiş | Ham enum kodları görünüyordu. | `profiller/[id]/page.tsx`, `types.ts` | **Düzeltildi** |
| A-18 | Low | mobil nav | Rozetler, demo işareti ve "Siteyi görüntüle" yoktu. | `mobile-admin-nav.tsx`, layout | **Düzeltildi** (`React.cache` ile tek sorgu) |
| A-19 | Low | `/admin`, 390 | KPI alt etiketi kırpılıyordu. | `(panel)/page.tsx` | **Kısmen** |
| A-20 | Low | tasarım | Tüm uyarılarda aynı renk kullanılıyor; onaylı profilde "Onayla" düğmesi görünüyordu. | — | **Kısmen** (onay düğmesi gizlendi) |
| A-21 | Low | dokunma hedefleri | Bazı hedefler 24px'in altında (WCAG 2.5.8). | — | **Açık** |

## 4. Tespit edilen teknik hatalar (kod denetimi)

| ID | Önem | Alan | Bulgu (file:line, HEAD `46049a2`) | Durum |
|---|---|---|---|---|
| C-01 | **Critical** | Hukuk | P-01'e bakın. Migration `20261022000001_example_assets_contact.sql:3-30`, "(Örnek)" ve "KURGUSAL ÖRNEK" zorlamasını kaldırıyor; `88f2aed` etiketleri ve WhatsApp korumasını kaldırıyor; `tests/e2e/examples.spec.ts:12,20` bu durumu test ediyor. | **Karar bekliyor** |
| C-02 | High | Moderasyon | Örnek profiller şikâyet edilemiyor (`moderation.ts:38-39` yalnızca `published` gerçek profil kabul ediyor). Yayından kalkan gerçek profilin örnek kopyası geri görünebiliyor (`20261021000001_public_examples.sql:35`). | **Karar bekliyor** |
| C-03 | High | KVKK | Eski `profile_images` kayıtlarının dosyaları herkese açık `profile-images` kovasında kalıyor; silme bu dosyalara hiç dokunmuyordu (`media.ts:315-330`). | **Kısmen**: migration `20261023000002` + `LEGACY_PREFIX`; hak onaysız eski dosyalar kayıttan ayırt edilemiyor, kovada elle denetlenmeli |
| C-04 | High | Gizlilik | Kaldırılan medya erişilebilir kalıyordu: 1 yıllık CDN önbelleği (`storage/supabase.ts:51`), `/api/image` her herkese açık URL'yi vekilliyordu. | **Kısmen**: vekil yayın kontrolü yapıyor (60 sn önbellek); yeni yüklemeler 10 dk önbellekleniyor; **mevcut dosyalar 1 yıllık başlıkla duruyor**; düzenli eşitleme işi yok |
| C-05 | Medium | Yanıltıcı içerik | Konum sayımları örnekleri de içeriyor ve meta açıklamaya "doğrulanmış" olarak yansıyordu. | **Kısmen**: "doğrulanmış" ibaresi kaldırıldı; sayım C-01'e bağlı |
| C-06 | Medium | Gizlilik | `/api/discovery` WhatsApp numaralarını sınırsız döndürüyordu. | **Kısmen**: süreç içi 60 istek/dk sınırı; instance'lar arası sınır (WAF/Redis) açık |
| C-07 | Low | KVKK | Kalıcı silme denetim kaydına slug (takma ad) yazıyor. | **Açık** |
| C-08 | Low | Test | E2E testinde gerçek telefon numarası sabit yazılı. | **Açık** (C-01'e bağlı) |
| C-09 | Medium | Güvenlik | KVKK formu ve giriş oran sınırı yalnızca süreç belleğinde. | **Açık** (iletişim formu veritabanı sayacı kullanıyor) |
| C-10 | Medium | Güvenlik/maliyet | `/api/image` her istekte sharp ile yeniden kodluyor, `no-store`. | **Kısmen** (yalnızca yayındaki URL'ler işleniyor) |
| C-11 | Medium | Medya | CSP'de `media-src` yoktu; Supabase videoları engelleniyordu. Posteri olmayan videolar görsel kaynağı olarak veriliyor. | **Kısmen**: `media-src` eklendi; poster sorunu açık |
| C-12 | Low | Güvenlik | Admin action argümanları çalışma anında doğrulanmıyor. | **Kısmen** (abonelik `op`, iletişim durumu) |
| C-13 | Low | Performans | Proxy, `/sehir/*` isteklerinde önbelleksiz veritabanı çağrısı yapıyor. | **Açık** |
| C-14 | Low | Sıralama | Keşifte sponsor önceliği yok; yalnızca "Öne çıkan" bölümü sponsor-öncelikli ve her kart etiketli. VIP katmanı kodda yok. İmleç yalnızca `{publishedAt,id}` taşıyor; sponsor sıralaması eklenirse sayfalama bozulur. | Bilgi (değişiklik gerekmedi) |
| C-15 | Low | Sayfalama | `published_at` boş bir kayıt "daha fazla" isteğini 400 ile bozar; demo deposu SQL'den farklı sıralıyor. | **Açık** |
| C-16 | High | SEO | P-05'e bakın. | **Kısmen** |
| C-17 | Medium | SEO | P-06'ya bakın. | **Düzeltildi** |
| C-18 | Medium | SEO | Sitemap kararları örnek profilleri de sayıyordu. | **Düzeltildi** (kapı arkasındaki adresler sitemap'te değil) |
| C-19 | Medium | SEO | Profil sayfasında `notFound()` Suspense içinde çalışıyor; bu yüzden 200 + noindex dönüyor. | **Açık** (tarayıcılar zaten yaş kapısını görüyor; insan ziyaretçi için düşük etki) |
| C-20 | Low | SEO | Sitemap önbellek etiketi yok; robots `/api` engelliyor. | **Kısmen** (sitemap statik listeye indi) |
| C-21 | High | Performans | Konum sayım taraması şehir sayfası başına yaklaşık 3 kez çalışıyordu. | **Düzeltildi** (`React.cache`) |
| C-22 | Medium | Performans | Profil, metadata ve sayfa için iki kez okunuyordu. | **Düzeltildi** (`React.cache`) |
| C-23 | Medium | Performans/gizlilik | Kart listeleri istemciye tam biyografi ve biyografi belgesi gönderiyor. | **Açık** |
| C-24 | Medium | Performans | Lightbox kütüphanesi profil sayfasında hemen yükleniyor. | **Açık** |
| C-25 | Low | Performans | Ekranın altındaki ızgarada `priority` kullanılıyordu. | **Kısmen** (Öne çıkan ızgarasında kaldırıldı) |
| C-26 | Low | Bağımlılık | `@base-ui/react`, `clsx`, `tailwind-merge` kullanılmıyordu. | **Düzeltildi** (kaldırıldı) |
| C-27 | Low | Ölü kod | `site/gallery.tsx`, `site/pagination.tsx` ve kullanılmayan `ui/*` bileşenleri. | **Kısmen** (ilk ikisi silindi) |
| C-28 | Low | Tekrar | `locations.ts` ve `location-directory.ts` içinde yinelenen API'ler. | **Açık** |
| C-29 | Low | Belgeler | QA_REPORT, SEO, SECURITY ve README belgeleri koddan sapmış. | **Açık** |
| M-02 | Low | Veri | `site_settings.support_email` varsayılanı `destek@example.com` (yer tutucu). İletişim sayfası bu alanı **kullanmıyor**; gerçek adres için `CONTACT_PUBLIC_EMAIL` gerekiyor. | Bilgi |
| M-03 | Info | Test altyapısı | E2E varsayılan portu 3217, yerelde açık bir sunucuyla çakışıyor; testler `E2E_PORT=3230` ile çalıştırıldı. | Bilgi |

## 5. UI/UX değerlendirmesi

**Güçlü yanlar:**
- Tutarlı OKLCH token sistemi (`globals.css`): gece eriği, ahududu, gül ve şampanya.
- Fraunces + Geist tipografi; akışkan display ölçeği.
- Saç çizgisi ayrımları; koyu ve açık temada eşit kalite.
- İyi boş durumlar (`/sehir/bayburt`) ve iyi yapılandırılmış yaş kapısı.

**Yapılan iyileştirmeler** (hepsi mevcut token ve bileşenlerle; sayfa bazlı rastgele CSS yazılmadı):
- **İletişim:** marka diliyle uyumlu yeni sayfa. Kategori seçimi radyo "çip" olarak tasarlandı ve `peer-focus-visible` ile klavyeyle görünür.
- **Header:** sahte arama kutusu kaldırıldı; menüye "İletişim" eklendi.
- **Odak halkası:** düğme odak halkası güçlendirildi.
- **Paketler:** hariç özellik dili netleştirildi.
- **Ana sayfa:** tekrar eden profiller ve boş şehir bağlantıları kaldırıldı.
- **Admin:** geçerli liste yapısı, Türkçe ve alana bağlı hatalar, zorunlu gerekçe, kaydedilmemiş değişiklik koruması, filtreler, mobil nav rozetleri.

**Uygulanmayanlar (bilinçli):** ana sayfa ilk ekranının yeniden düzenlenmesi, profil kartı modernizasyonu, profil galerisi ve WhatsApp CTA'sı.
- Sebep: yayında yalnızca etiketsiz kurgusal profiller var (C-01). Bu yüzeyleri "fotoğrafları ön plana çıkaracak" biçimde güçlendirmek, gerçek kişiymiş gibi görünen bir yönlendirmeyi daha ikna edici yapar.
- C-01 kararı verildikten sonra (etiketleme veya gizleme) bu iş ayrı bir PR'da yapılabilir. Bunun için planlanan değişiklikler §15'te.

## 6. Mobil uyumluluk

**Tarama sonucu:**
- 320, 360, 390, 430, 768, 1024, 1440 ve 1920 px genişliklerde, 28 sayfada (18 public + yaş kapısı + 9 admin) **yatay taşma 0**.
- Konsol hatası 0, kırık görsel 0. Ham sonuç `sweep.json` dosyasında (taramayı yapan betikle aynı klasörde).

**Mobil düzeltmeler:**
- Filtre sayfasının kapat düğmesi (P-03) ve güvenli alan boşluğu (P-04).
- Admin mobil nav rozetleri (A-18).
- Profil sekmelerinde kaydırma ipucu (A-10).

**Açık:** admin tablolarının mobil kart düzeni (A-11).

## 7. SEO analizi

- **Yaş kapısı ve indeksleme (en büyük yapısal sorun):** proxy, çerezsiz her isteği `noindex` yaş onayı sayfasına yönlendiriyor (`src/proxy.ts`). Bu yüzden arama motorları `/`, `/kesfet`, il/ilçe ve profil sayfalarını **göremiyor**.
  - Sitemap artık yalnızca taranabilir sayfaları içeriyor: `/sehirler`, `/guvenlik`, `/paketler`, `/kvkk`, `/kullanim-kosullari`, `/kaldirma-talebi`, `/iletisim`.
  - Böylece Search Console'da "gönderilen URL noindex" hatası oluşmaz.
  - Eski davranış `SITEMAP_INCLUDE_GATED=true` ile geri açılabilir.
  - Kalıcı çözüm bir ürün kararı: yaş kapısını, görsel içermeyen indekslenebilir bir metin katmanının üstüne bindirmek.
- **Canonical:** `/` canonical'ı `/`; `?yaka=` varyantları buraya işaret ediyor. `/sehir/istanbul?yaka=` zaten noindex + temiz canonical.
- **OG:** marka OG görseli eklendi (`app/opengraph-image.tsx`, 1200×630). Kişi fotoğrafı bilinçli olarak kullanılmadı.
- **Lighthouse SEO notu:** `/kesfet` ve `/profil/*` 92 aldı (`meta-description` eksik görünüyor).
  - Next 16, bot olmayan kullanıcı ajanlarında dinamik metadata'yı akışla `<body>` içinde gönderir; Lighthouse'un ajanı bot değil.
  - Bot olarak tanınan tarayıcılar metadata'yı `<head>` içinde alır. Bu bir ölçüm yanılgısı, eksik etiket değil.
- **Türkçe slug yapısı** (`/sehir/istanbul/kadikoy`) korunuyor; geçersiz il/ilçe gerçek 404 dönüyor.

## 8. Performans analizi

Mobil Lighthouse 12.8.2 (varsayılan yavaş 4G + 4× CPU), yerel üretim derlemesi, demo verisi, sayfa başına **tek ölçüm** (sapma olabilir):

| Sayfa | Önce: Perf / LCP / TBT / ağırlık | Sonra: Perf / LCP / TBT / ağırlık | A11y | Best practices |
|---|---|---|---|---|
| `/` | 68 / 5,9 sn / 430 ms / ~873 KB | **88 / 3,8 sn / 100 ms / 524 KB** | 100 | 100 |
| `/kesfet` | 74 / 6,1 sn / 230 ms | **90 / 3,6 sn / 70 ms / 514 KB** | 100 | 100 |
| `/iletisim` | 78 / 5,9 sn / 50 ms | **90 / 3,5 sn / 20 ms / 500 KB** | 100 | 100 |
| `/profil/[slug]` | 78 / 5,9 sn / 80 ms | **86 / 4,2 sn / 40 ms / 554 KB** | 100 | 100 |

- CLS her sayfada 0.
- **Teşhis:** LCP öğesi metindi, render gecikmesi %92'ydi. Tetikleyen, önceden yüklenen ~500 KB Fraunces dosyasıydı (normal + italik × latin/latin-ext, SOFT ekseniyle). İtalik ve SOFT kaldırıldıktan sonra toplam woff2 boyutu 293 KB.
- **Diğer:** konum sayımı ve profil okuması `React.cache` ile istek başına tek seferde yapılıyor.
- **Açık:** lightbox'ın geç yüklenmesi (C-24), kart yükünün küçültülmesi (C-23), görsel vekilinin önbelleği (C-10).

## 9. Güvenlik analizi

### 9.1 Yüksek riskli hukuki ve gizlilik bulguları (ayrı rapor)

**C-01: Kurgusal profiller gerçek kişi gibi sunuluyor ve tek numaraya yönlendiriyor.**
- **Kanıt:**
  - `git show 88f2aed` şu korumaları kaldırıyor:
    - `profile-card.tsx` içindeki `profile.isExample ? null : whatsAppHref(...)` koruması.
    - "Kurgusal örnek profil … İletişim kurulamaz." metni.
    - "Örnek profil" rozeti.
  - Migration `20261022000001`, `nickname`/`bio` üzerindeki "(Örnek)" ve "KURGUSAL ÖRNEK" kısıtlarını düşürüyor ve örnek satırlara `whatsapp_phone` ekliyor.
  - `tests/e2e/examples.spec.ts:12` 10 kartın aynı numaraya gitmesini bekliyor; `:20` "Kurgusal" ibaresinin bulunmamasını bekliyor.
  - Production'da 10/10 profil bu durumda.
- **Neden yüksek risk:**
  - Ziyaretçi gerçek kadınlar gördüğünü düşünüyor ve tek bir numaraya yönlendiriliyor.
  - Bu kayıtlar yayın ön koşullarını, rıza ve yaş doğrulamasını ve moderasyonu atlıyor.
  - Sitenin kendi Güvenlik metniyle ("Yalnızca 18 yaşını doldurmuş ve yaşı belge ile doğrulanmış kişiler", "ücretli hizmet ve yönlendirme yasak"), Kullanım Koşulları'yla ve README'deki "müşteri yönlendirme yasak" kuralıyla doğrudan çelişiyor.
  - Tüketicinin aldatılması ve yanıltıcı ticari uygulama açısından ciddi hukuki risk taşıyabilir.
  - Kesin hukuki değerlendirme bir avukata aittir; bu rapor hukuki garanti vermez.
- **Önerilen seçenekler** (biri seçilmeli; hiçbiri production'a uygulanmadı):
  1. **Etiketleri geri getir, WhatsApp'ı kaldır.**
     - Kart ve profilde "Kurgusal örnek profil" etiketi ve "görseller yapay zekâ ile üretilmiştir" notu.
     - View'dan örnek profillerin numarasını çıkarmak.
     - "(Örnek)" ve "KURGUSAL ÖRNEK" kısıtlarını geri koymak.
     - `examples.spec.ts` beklentilerini tersine çevirmek.
  2. **Örnekleri gizle:** migration ile `visible=false` ve view'daki örnek kolunun kaldırılması.
  3. Mevcut hâliyle bırakmak (önerilmez).

**Diğer gizlilik bulguları:**
- **C-03 ve C-04** (kaldırılan medyanın erişilebilir kalması) kısmen düzeltildi; kalanı:
  - `profile-images` ve `media-public` kovalarındaki, `profile_media` ile eşleşmeyen dosyalar production'da elle denetlenip silinmeli.
  - Mevcut dosyaların 1 yıllık önbellek başlığı ancak dosya yeniden yüklenince değişir.
- **C-06:** WhatsApp numarası toplu çekme riski süreç içi sınırla azaltıldı. Vercel WAF kuralı önerilir.

### 9.2 Doğrulanan kontroller

- **RLS:** tüm tablolarda açık. Anon yalnızca `*_public` ve `discovery_profiles` view'larını okuyabiliyor.
- **Yeni tablo:** `contact_messages` için anon okuma ve yazma engeli, MFA'sız oturumun 0 satır görmesi ve MFA'lı yöneticinin satırları görmesi SQL testleriyle doğrulandı (`supabase/sql-tests/policies.test.sql` §9).
- **Admin yetkisi:** 22 server action'ın tamamı `run()` → `assertAdmin()` (oturum + AAL2) üzerinden geçiyor, 15 sayfa `requireAdmin()` çağırıyor.
  - Oturumsuz `/admin*` istekleri 307 ile girişe yönleniyor.
  - Sahte `hilal_admin` çerezi işlem yapamıyor (admin denetiminde yeniden oynatma testiyle görüldü).
- **XSS:** form alanlarında `< >` sunucuda (zod) ve veritabanında (CHECK kısıtı) reddediliyor; mesaj metni React kaçışıyla düz yazı olarak gösteriliyor.
- **Yaş beyanı:** kimlik veya yaş doğrulaması olarak sunulmuyor (`age-confirmation.ts`); bu korundu.

## 10. İletişim sayfasının mimarisi

```
/iletisim (RSC) ── ContactForm (client)
   │  istemci ön kontrolü: zorunlu alanlar, e-posta biçimi, < > yasak, karakter sayacı, ilk hatalı alana odak
   │  gizli alanlar: website (honeypot), startedAt (mount sonrası yazılır → hydration farkı yok)
   ▼
contactAction (Server Action, src/app/(site)/actions.ts)
   ▼
submitContactMessage (src/server/services/contact.ts)
   1. zod: contactMessageSchema (kategori enum, ad 2–120, e-posta ≤200, konu 3–150, mesaj 20–3000, < > yok, aydınlatma onayı)
   2. honeypot dolu → reddet · doldurma < 2 sn → reddet
   3. oran sınırı: süreç içi 3 / 10 dk + veritabanı 5 / saat (ip_hash; sunucusuz instance'lar arası geçerli)
   4. aynı içerik 10 dk içinde tekrar → "zaten alındı" (çift gönderim)
   5. repo.createContactMessage → contact_messages (service role)
   6. audit("contact_message.create", yalnızca kategori; kişisel veri yok)
   7. RESEND_API_KEY + CONTACT_NOTIFY_TO + CONTACT_NOTIFY_FROM varsa bildirim
      (gövdede ad, e-posta ve mesaj yok; yalnızca kategori ve panel bağlantısı). Yoksa gönderim yapılmaz.
```

- **Veri modeli:** migration `supabase/migrations/20261023000001_contact_messages.sql`.
  - Alanlar: `category` ve `status` enum'ları, `read_at`, `ip_hash` (tuzlu IP özeti; ham IP yok), CHECK kısıtları, indeksler, `updated_at` tetikleyicisi.
  - RLS: `is_admin()` (MFA) dışında erişim yok; `revoke all … from anon`.
- **Yönetim:**
  - `/admin/iletisim`: arama, durum/kategori/okunmamış filtresi, 25'li sayfalama, okunmamış vurgusu, bildirim yapılandırma rozeti.
  - `/admin/iletisim/[id]`: açılınca okundu olur; durumlar İşlemde, Yanıtlandı (onaylı), Kapat, Spam (onaylı); "Okunmadı yap"; denetim kayıtlarından işlem geçmişi.
  - Nav rozeti, KPI kartı ("Okunmamış mesaj") ve `g i` kısayolu.
- **Herkese açık iletişim bilgisi:** yalnızca `CONTACT_PUBLIC_EMAIL` tanımlıysa gösteriliyor; `@example.*` adresleri reddediliyor. Uydurma telefon, adres veya unvan yok.
- **KVKK:** `/kvkk` metnine iletişim formu verileri eklendi. Saklama süresi "[hukuk incelemesi]" olarak işaretli. Talebi yanıtlamak için açık rıza değil aydınlatma onayı alınıyor; bu hukuki nitelendirme incelenmeli.
- **Testler:** `tests/unit/contact.test.ts` (19 test), `tests/e2e/contact.spec.ts` (5 test), SQL politika testleri.

## 11. Admin geliştirmeleri

- **Yeni:** İletişim talepleri gelen kutusu ve detay sayfası (§10).
- **Veri kaybına karşı:**
  - "Genel bilgiler" sekmesi bağlı kalıyor (A-01).
  - Kaydedilmemiş değişiklik koruması (A-02).
  - Gerekçesi zorunlu işlemlerde onay düğmesi, gerekçe yazılana kadar pasif ve sunucu da reddediyor (A-14, A-15).
  - Arşivle düğmesi yıkıcı stilde.
- **Gezinme:** ölü Medya bağlantısı kaldırıldı (A-03); mobil nav rozetleri ve demo işareti (A-18).
- **Formlar:** Türkçe ve alana bağlı hatalar (A-05, A-06); SEO yolu doğrulaması (A-04).
- **Listeler:** şikâyet durum filtresi; denetim kaydında işlem/tür/kimlik filtresi (A-12).
- **Erişilebilirlik:** KPI liste yapısı (A-08), rozet kontrastı (A-09), profil formunda `aria-describedby` (A-07).
- Mevcut yetkilendirme, MFA ve denetim kaydı akışı değiştirilmedi.

## 12. Düzeltilen hatalar (commit'ler)

| Commit | İçerik |
|---|---|
| `333c49c` | İletişim sayfası, `contact_messages` tablosu + RLS + SQL testleri, admin gelen kutusu |
| `cd9f10f` | İletişim e2e testleri |
| `0e3d37d` | Admin: kaydedilmemiş değişiklik koruması, zorunlu gerekçeler, ölü bağlantılar, erişilebilirlik |
| `3e14431` | Medya gizliliği, SEO sinyalleri, `React.cache`, filtre sayfası, ana sayfada tekrar/boş şehir, kullanılmayan bağımlılıklar |
| `f8f14bd` | Odak halkaları, H1 erişilebilir adı, header sadeleştirme, paketler, admin geçmiş etiketleri |
| `8a65c29` | Font: Fraunces italik ve SOFT kaldırıldı (LCP) |
| son commit | `/api/discovery` oran sınırı, bu rapor, ekran görüntüleri |

## 13. Test sonuçları (bu oturumda çalıştırıldı)

| Test | Komut | Sonuç |
|---|---|---|
| TypeScript | `npm run typecheck` | ✅ geçti |
| ESLint | `npm run lint` | ✅ geçti (0 uyarı) |
| Unit | `npx vitest run` | ✅ 103/103 (8 dosya; 19'u yeni iletişim testi) |
| DB/RLS | `npm run test:db` (geçici Postgres 16) | ✅ ALL DB TESTS PASSED (yeni iletişim politikaları dahil) |
| Production build | `npx next build` | ✅ geçti |
| E2E | `E2E_PORT=3230 npx playwright test` (demo modu) | ✅ 47 geçti, 5 atlandı (`E2E_SUPABASE` gerektirenler: database-discovery, examples, supabase-auth) |
| İletişim e2e | `tests/e2e/contact.spec.ts` | ✅ 5/5 (axe, istemci doğrulaması, XSS reddi, gönderim → admin okundu → durum → arama, oturumsuz yönlendirme) |
| Responsive + axe taraması | 28 sayfa × 8 genişlik (axe 390 ve 1440) | ✅ 224 kontrol, 0 sorun |
| Lighthouse | mobil, 4 sayfa | ✅ §8 tablosu |
| **Integration** | `npm run test:integration` | ❌ **çalıştırılmadı**: `supabase start` 10 dakikada hiçbir container oluşturamadı (eksik imajlar indiriliyordu), durduruldu |
| Production Playwright denetimi | yalnızca GET | ✅ 20 URL × 8 genişlik, axe 0 ihlal (değişiklikler öncesi production) |

Değiştirilen bir e2e testi var: `public-site.spec.ts` içindeki sitemap testi yeni kurala göre güncellendi (kapı arkasındaki adresler sitemap'te olmamalı).

## 14. Önce/sonra ekran görüntüleri

- **Önce** (production ve yerel admin, 70 dosya): `artifacts/audit-2026-10-18/before/`. Örnekler: `home-390-dark.webp`, `kesfet-390-filter-sheet-dark.webp`, `profil-1440-dark.webp`, `admin-dashboard-1440.webp`, `admin-profil-gecmis-raw-enums-1440.webp`.
- **Sonra** (yerel üretim derlemesi, demo verisi, 56 dosya): `artifacts/audit-2026-10-18/after/`. Örnekler: `_iletisim-1440.webp`, `_iletisim-390.webp`, `admin_admin_iletisim-390.webp`, `admin_admin-1440.webp`, `_kesfet-390.webp`.
- "Önce" görselleri production'daki kurgusal portreleri içeriyor. "Sonra" görselleri demo verisi kullanıyor, bu yüzden profil görselleri birebir karşılaştırılamaz.

## 15. Kalan problemler ve öneriler

1. **C-01 ve C-02 kararı** (en acil). Karardan sonra ayrı bir PR'da yapılacaklar:
   - Kart ve profil yeniden tasarımı.
   - Galeri: büyütme sınırı, tek fotoğrafta okların gizlenmesi, lightbox'ın geç yüklenmesi.
   - WhatsApp CTA'sının tek stile indirilmesi.
   - Ana sayfa ilk ekranının sadeleştirilmesi.
2. **Yaş kapısının SEO tasarımı:** indekslenebilir metin katmanı üzerine bindirilmiş kapı. Sonra `SITEMAP_INCLUDE_GATED=true`.
3. **Medya kovası denetimi** (C-03, C-04): eşleşmeyen dosyaları silmek ve düzenli eşitleme işi eklemek.
4. **Paylaşımlı oran sınırı:** giriş, KVKK formu ve `/api/discovery` için Vercel WAF veya Upstash (C-06, C-09).
5. **Kart yükünü küçültmek** (C-23): biyografi ve biyografi belgesini liste yanıtından çıkarmak.
6. **Admin:** mobil tablo kartları (A-11), Abonelikler ve Talepler filtreleri (A-12), diğer formlarda kaydedilmemiş değişiklik koruması (A-02).
7. **Belgeler:** QA_REPORT, SEO, SECURITY ve README güncellenmeli (C-29). Şu an C-01 ile çelişen iddialar içeriyorlar.
8. **Hukuk:** iletişim verisi saklama süresi, veri sorumlusu bilgileri (`/kvkk` içindeki yer tutucular) ve C-01.

## 16. Production'a alma kontrol listesi

- [ ] C-01 ve C-02 için karar verildi ve uygulandı (hukuk görüşü alındı).
- [ ] PR incelendi; **otomatik merge edilmedi**.
- [ ] Migration'lar önce staging'de, sonra production'da **elle** uygulandı (sırayla):
  - [ ] `20261023000001_contact_messages.sql`
  - [ ] `20261023000002_legacy_media_paths.sql`
- [ ] Migration'dan sonra `npm run test:db` yeşil; Supabase Advisors'da RLS uyarısı yok.
- [ ] Ortam değişkenleri (isteğe bağlı, gerçek değerlerle):
  - [ ] `CONTACT_PUBLIC_EMAIL` (doğrulanmış adres; boşsa e-posta gösterilmez).
  - [ ] `RESEND_API_KEY`, `CONTACT_NOTIFY_TO`, `CONTACT_NOTIFY_FROM` (üçü birlikte; yoksa bildirim gönderilmez ve panelde "yapılandırılmamış" görünür).
- [ ] Not: kod migration'dan önce yayına çıkarsa admin paneli çökmez (okunmamış sayacı tablo yoksa 0 döner), ama iletişim formu gönderimleri **hata verir**. Önce migration uygulanmalı.
- [ ] Vercel WAF: `/iletisim` POST, `/api/discovery`, `/admin/giris` için oran kuralları.
- [ ] Preview deploy'da kontrol: `/iletisim` gönderimi → `/admin/iletisim`'de görünüyor → durum değişiyor.
- [ ] Search Console: yeni sitemap gönderildi.
- [ ] `profile-images` ve `media-public` kovalarında eşleşmeyen dosya denetimi yapıldı.
