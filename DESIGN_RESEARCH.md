# Hilal: Tasarım araştırması

> Hedef estetik: premium editoryal / lüks dijital dergi / fotoğraf portfolyosu. Bunun yanında modern sosyal keşif UX'i ve yönetim panelinde minimalist SaaS kullanılabilirliği.
> Kapsam: yalnızca yasal, cinsel içerik taşımayan sosyal profiller (şehir/ilçe ve ortak ilgi alanlarına göre keşif).
> Tarih: 2026-10-16. Bu belge mevcut `DESIGN_SYSTEM.md` dosyasını tamamlar; onun yerine geçmez.

Etiketler:
- **[K]**: Bu oturumda gerçekten erişilip okunan kaynaktan alınan bulgu.
- **[G]**: Genel tasarım bilgisi veya uzman yargısı. Bu oturumda bir kaynakla doğrulanmadı.
- **[D]**: Bu oturumda doğrudan ölçülen veya doğrulanan teknik veri (font API'si, `next/font` verisi).

---

## 1. Kapsam ve yöntem

### Yöntem
1. Google Fonts CSS2 API'si `curl` ile çağrıldı (Chrome User-Agent ile). Her aday fontun `latin-ext` `unicode-range` bloğu olup olmadığı kontrol edildi.
2. Projede kurulu `next@16.4.2` paketindeki `next/font` verisi (`font-data.json`) okundu. Buradan her fontun ağırlıkları, stilleri, değişken eksenleri (axes) ve alt kümeleri (subsets) alındı.
3. Türkçe glif testi yapıldı. Google Fonts `&text=ğşıİçöüĞŞÇÖÜ` parametresiyle her aday için alt küme woff2 dosyası istendi ve hepsi geçerli WOFF2 olarak döndü. Bu yalnızca **gösterge niteliğinde** bir testtir. Glif tablosu fontTools ile incelenmedi, çünkü fontTools kurulu değil.
4. WebFetch ve WebSearch ile tasarım galerileri, UX araştırma makaleleri ve bileşen belgeleri tarandı. Hiçbir görsel indirilmedi. Hiçbir düzen, marka varlığı veya kod kopyalanmadı.

### Erişilebilen kaynaklar
| Kaynak | Durum | Ne alındı |
|---|---|---|
| Google Fonts CSS2 API (13 aile) | Erişildi | Alt küme ve unicode-range blokları |
| `next/font` font-data.json (yerel) | Erişildi | Ağırlık, stil, değişken eksenler |
| Awwwards, "magazine" kategorisi | Erişildi, sınırlı | Yalnızca site adları ve ödül etiketleri vardı; tasarım açıklaması yoktu |
| Kinfolk ana sayfası | Erişildi, yalnızca metin ve işaretleme | Bilgi mimarisi ve kart anatomisi. CSS ve font bilgisi yoktu |
| NN/g: Bottom sheets | Erişildi | Alt sayfa kuralları |
| NN/g: Mobile navigation patterns | Erişildi | Sekme çubuğu ve hamburger menü |
| NN/g: Infinite scrolling tips | Erişildi | Sonsuz kaydırma, "Daha fazla yükle" ve sayfalama |
| NN/g: Applying filters | Erişildi | Toplu ve etkileşimli filtre |
| NN/g: Data tables | Erişildi | Tablo desenleri |
| NN/g: Image-focused design | Erişildi | Büyük görselin riskleri |
| W3C WAI-ARIA APG: Dialog (modal) | Erişildi | Klavye ve odak yönetimi |
| PhotoSwipe ana sayfası | Erişildi | Lightbox özellikleri (klavye detayı sayfada yok) |
| cmdk (GitHub README) | Erişildi | Komut paleti davranışı |
| Pencil & Paper: Enterprise data tables | Erişildi | Satır yoğunluğu, hizalama, toplu işlem |
| Practical Typography: Line length | Erişildi | Satır uzunluğu |
| Utopia fluid type calculator | Erişildi | Akışkan tip ölçeği ve clamp formülü |
| web.dev: aspect-ratio, optimize-cls | Erişildi | Oran, object-fit, CLS ve font fallback |
| fontalternatives.com: editoryal font eşleştirmeleri | Erişildi | Boyut ve satır aralığı önerileri |
| WebSearch: editoryal tipografi trendleri | Erişildi (yalnızca arama özeti) | Pangram Pangram, weandthecolor, fontalternatives özetleri |
| WebSearch: masonry ve düzgün ızgara | Erişildi (yalnızca arama özeti) | Satıcı belgeleri. NN/g veya Smashing kaynaklı araştırma **bulunamadı** |

### Erişilemeyen kaynaklar
| Kaynak | Neden |
|---|---|
| Behance (arama) | HTTP 403 |
| Land-book | HTTP 403 |
| Dribbble (arama) | İçerik boş geldi (yalnızca JS ile yükleniyor) |
| Refero | `www.` alan adı çözümlenmedi. Kök alan adında yalnızca başlık ve slogan vardı (JS ile yükleniyor) |
| Mobbin | Yalnızca pazarlama metni ve kategori adları alındı (Dialogs, Navigation, Forms, Tables, Empty states). Kütüphane giriş gerektiriyor |
| Material Design 3 (layout ve breakpoints) | 404 veya yalnızca başlık geldi (JS ile yükleniyor) |
| Apple HIG: Tab bars | Yalnızca başlık geldi (JS ile yükleniyor). Araç genel bilgiyle doldurdu; bu belgede **[G]** olarak kullanıldı |

> Sonuç: Görsel galerilerin (Behance, Dribbble, Land-book, Refero, Mobbin) içeriği **görülemedi**. Bu belgedeki görsel yön önerileri bu galerilere dayanmıyor. Önerilerin dayanakları şunlar: erişilen UX araştırmaları, Kinfolk'un bilgi mimarisi, tipografi kaynakları ve genel editoryal tasarım bilgisi **[G]**.

---

## 2. Bulgular

### 2.1 Tipografi

- **[K]** Trend kaynakları, editoryal ve lüks markalarda keskin ama yaklaşılabilir serif ailelerinin geri döndüğünü yazıyor (weandthecolor 2025, fontalternatives 2026). Bu kaynaklar yüksek kontrastlı display seriflerin editoryal yayınlarda yeniden kullanıldığını belirtiyor.
- **[K]** Pangram Pangram'ın 2025 rehberine göre eşleştirmenin temel ilkesi **kontrast**: sade bir grotesk ile güçlü bir serif yan yana gerilim yaratır. Örnek eşleşmeler Neue Montreal + Editorial New. Bu fontlar ticari olduğu için Hilal'de kullanılmayacak; yalnızca ilke olarak alındı.
- **[K]** fontalternatives editoryal ölçüleri şöyle: makale başlığı 36–48px, H2 24–28px (satır yüksekliği 1.3), gövde 18–20px (satır yüksekliği 1.7, serif gövdede 1.8), açıklama ve meta 14px, alıntı yaklaşık 22px italik. Satır uzunluğu 65–75 karakter (yaklaşık 680px). Koyu modda harf aralığına +0.01em eklenmesi ve gövde ağırlığının bir kademe düşürülmesi öneriliyor.
- **[K]** Practical Typography satır uzunluğu için 45–90 karakter öneriyor (boşluklar dahil). Ölçü olarak `ch` birimi doğru seçim, çünkü punto değişse de karakter sayısı korunur.
- **[K]** Utopia akışkan tip ölçeğinin varsayılanları şöyle: 360px genişlikte 18px taban ve 1.2 oran, 1240px genişlikte 20px taban ve 1.25 oran. Her basamak `clamp(min, rem + vw, max)` biçiminde üretiliyor; örneğin `--step-0: clamp(1.125rem, 1.0739rem + 0.2273vw, 1.25rem)`. Büyük ekranda oranın artması, display başlıkların dramatik büyümesini sağlar.
- **[K]** web.dev'e göre fontlar CLS'e (düzen kaymasına) yol açabilir. Önerilenler: uygun fallback, `size-adjust` ve ascent/descent override ile metrik eşleme. `next/font` bunu `adjustFontFallback` ile otomatik yapar **[G]**.

**[D] Türkçe destek doğrulaması.** Google Fonts CSS2 API'sinin döndürdüğü alt kümeler aşağıda. Tüm `latin-ext` blokları `U+0100-02BA` aralığını içeriyor. Bu aralıkta ğ (U+011F), Ğ (U+011E), ş (U+015F), Ş (U+015E), ı (U+0131) ve İ (U+0130) var. ç, ö ve ü temel `latin` alt kümesinde.

| Aile | Alt kümeler (API) | `next/font` ağırlık ve eksenler | Not |
|---|---|---|---|
| **Instrument Serif** | latin, latin-ext | yalnızca 400, normal + italik | Dar ve zarif display. Tek ağırlıklı olduğu için yalnızca başlıklar için uygun |
| **Fraunces** | latin, latin-ext, vietnamese | 100–900 değişken; `opsz` 9–144, `SOFT`, `WONK` | Optik boyut ekseni var; büyük puntoda keskinleşir |
| **Newsreader** | latin, latin-ext, vietnamese | 200–800 değişken; `opsz` 6–72 | Gövde ve başlıkta tek aile olarak kullanılabilir; editoryal okuma serifi |
| Playfair Display | cyrillic, latin, latin-ext, vietnamese | 400–900 | Çok yaygın, "hazır şablon" izlenimi verebilir |
| Cormorant / Cormorant Garamond | cyrillic(+ext), latin, latin-ext, vietnamese | 300–700 | Çok ince; küçük puntoda ve koyu temada okunurluğu zayıf |
| DM Serif Display | latin, latin-ext | — | Alternatif display |
| Libre Caslon Display | latin, latin-ext | — | Alternatif display |
| Bodoni Moda | latin, latin-ext, math, symbols | — | Moda dergisi tonu; aşırı kontrastlı |
| **Inter Tight** | cyrillic(+ext), greek(+ext), latin, latin-ext, vietnamese | 100–900 değişken | Sıkı grotesk; UI ve küçük başlık için |
| **Geist** (mevcut) | cyrillic(+ext), latin, latin-ext, vietnamese | 100–900 değişken | Zaten projede var |
| Geist Mono | … latin-ext … | 100–900 | Yönetim panelinde ID ve sayılar için |
| Inter | … latin-ext … | 100–900; `opsz` 14–32 | Alternatif |

Türkçe için dikkat edilmesi gerekenler **[G]**:
- `text-transform: uppercase` yalnızca `lang="tr"` doğru ayarlıysa i harfini İ'ye çevirir. `<html lang="tr">` zorunludur. Büyük harfli üst başlıklarda (eyebrow/kicker) "İSTANBUL" ve "ISPARTA" doğru çıkmalıdır.
- Display serif fontlarda İ'nin noktası ile Ğ ve Ş'nin şapka ve çengelleri sıkı satır aralığında (`line-height` < 1.0) bir üst satıra çarpabilir. Display başlıklarda `line-height`'ı **1.05**'in altına indirmeyin ve "İĞ" içeren gerçek Türkçe başlıklarla test edin.
- Negatif harf aralığı (`-0.02em` ve altı) dar fontlarda "ıl" ve "ğı" çiftlerini birbirine yapıştırabilir. Instrument Serif'te en fazla `-0.01em` kullanın.

### 2.2 Düzen ve ızgara (layout, grid)

- **[K]** Kinfolk ana sayfasının bilgi mimarisi (yalnızca metin ve işaretleme okundu): bir sayı (issue) hero karuseli ("1 / 10" sayacı, başlık ve tek satır dek), ardından "Son hikayeler" listesi (kategori + başlık), kart ızgaraları, bir öne çıkan tema bloğu, "Sohbette" röportaj kartları ve "Yeniden göz atın" bölümü geliyor. Kart anatomisi: görsel, kategori etiketleri, sayı etiketi, başlık ve kısa dek. Bu **bilgi hiyerarşisi** ilkesi Hilal'e uyarlanabilir: üst başlık (kicker) olarak şehir/ilçe, başlık olarak ad, dek olarak tek satır biyografi.
- **[G]** Editoryal sitelerde tipik ızgara 12 sütunluk, asimetrik bölünmüş bir yapıdır (örneğin 7/5 ve 8/4). Uzun metin 6–7 sütuna sığar, kenar boşluğundaki dar sütun meta bilgi ve alt yazı taşır. Bölümler arası boşluk cömerttir: masaüstünde 96–160px, mobilde 56–80px.
- **[G]** Ritim için bölüm başlıkları ince bir çizgi (1px hairline) ve numaralı veya küçük büyük harfli (small-caps) bir üst başlıkla açılır. Bu "dergi" hissini görsel efektten değil tipografiden üretir.
- **[K]** Akışkan ölçek (Utopia) aralıklara da uygulanabilir: aynı `clamp` mantığı boşluk basamakları için de kullanılır.

### 2.3 Görsel, oran ve kırpma

- **[K]** web.dev'e göre `aspect-ratio` alanı önceden ayırır ve CLS'i önler. `object-fit: cover` düzeni korur ama önemli içeriği kırpabilir. Fotoğrafta yaygın oranlar 4:3 ve 3:2. `srcset` varyantlarının hepsi aynı oranda olmalıdır. `<picture>` ile sanat yönetimi (art direction) yapılıyorsa her `<source>` için de `width/height` verilmelidir.
- **[K]** Masonry ve düzgün ızgara karşılaştırması (yalnızca satıcı belgeleri; kontrollü kullanılabilirlik verisi bulunamadı):
  - Masonry görsellerin özgün oranlarını korur ama sıralamayı belirsizleştirir.
  - Düzgün ızgara daha düzenli bir genel bakış sunar.
  - Masonry görsel ağırlıklı sayfalarda yeniden boyama (repaint) sorunlarına yol açabilir (W3C CSS posta listesi).
- **[K]** NN/g'nin görsel odaklı tasarım makalesine göre büyük görseller gezinmeyi, aramayı ve çağrı düğmelerini (CTA) bastırabilir. Görselin görsel ağırlığı sayfa hedefinin önemine göre verilmelidir.
- **[G]** Portre fotoğrafçılığında 4:5 (Instagram portre standardı) ve 3:4 oranları yüz ile omuz kadrajına en uygun oranlardır. 2:3 daha "dergi kapağı" hissi verir ama mobil ızgarada çok uzun kalır.
- **[G]** Odak noktası (focal point) gerekli: kullanıcı yüklemesinde yüz bölgesi `object-position` ile korunmalı. Varsayılan `50% 30%` portrelerde yüzü merkezden daha iyi tutar.

### 2.4 Keşif ve kartlar

- **[K]** NN/g'ye göre sonsuz kaydırma amaçsız ve homojen göz atmaya uyar. Belirli bir öğeyi bulma, karşılaştırma ve footer'a erişim için kötüdür. "Daha fazla yükle" footer'a erişimi korur ve kontrolü kullanıcıya verir. Öneriler: kaydırma konumunu sakla (detaydan dönüşte), yükleme göstergesi koy ve "X / Y gösterildi" bilgisini göster.
- **[K]** NN/g filtre önerileri:
  - Mobilde **toplu (batch) filtre ve "Uygula" düğmesi** önerilir (bağlantılar yavaş olduğu için).
  - Etkileşimli filtre yalnızca 1 saniyenin altındaki yanıtlarda anlamlıdır.
  - Seçenek başına sonuç sayısı göstermek "0 sonuç" durumunu önler.
  - Güncelleme sırasında sonuç alanını soluklaştır ve ilerleme göster; kartlar tek tek titremesin.
  - Kullanıcı filtrelerle çalışırken sayfayı başa kaydırma.
- **[K]** NN/g data tables makalesinden genellenebilir bir ilke: etkin filtreler açıkça gösterilmeli ki kullanıcı filtrelenmiş veriye baktığını bilsin. Bunu keşif ekranında "seçili filtre çipleri ve Temizle" olarak uygulayın.
- **[G]** Kart anatomisi (editoryal): görsel 4:5, altında üst başlık (İLÇE · ŞEHİR, küçük büyük harf, harf aralığı +0.08em), display serif ad, tek satır ilgi alanı veya dek. Görsel üstünde metin, gradyan ve rozet yığını yerine **metni görselin altına koymak** daha "portfolyo" bir his verir ve kontrastı garanti eder.

### 2.5 Profil detay sayfası

- **[K]** NN/g'ye göre büyük görsel birincil eylemleri bastırmamalı. Hero görseli büyük olabilir, ama "Mesaj / Takip / Raporla" gibi eylemler ilk ekranda görünmeli.
- **[K]** Uzun metin için 45–90 karakter, editoryal hedef olarak 65–75 karakter (yaklaşık 680px).
- **[G]** Önerilen yapı:
  - Masaüstünde 7/5 bölünmüş hero kullanın: solda 4:5 ana fotoğraf, sağda yapışkan (sticky) bir künye bloğu (ad, ilçe/şehir, ilgi alanı çipleri, doğrulama, eylemler).
  - Altında tek sütun biyografi (`max-width: 68ch`). Alıntı (pull-quote) ve "Hakkında / İlgi alanları / Galeri" bölümleri hairline ve numaralı başlıklarla ayrılır.
  - Mobilde tam genişlik 4:5 görsel, altında künye ve yapışkan alt eylem çubuğu.

### 2.6 Galeri ve lightbox

- **[K]** WAI-ARIA APG modal dialog kuralları:
  - Tab ve Shift+Tab odağı dialog içinde döngüde tutar. Esc kapatır.
  - Görünür bir kapatma düğmesi olmalı.
  - Açılışta odak ilk öğeye ya da büyük içerikte `tabindex="-1"` verilmiş başlığa gider.
  - Kapanışta odak tetikleyici öğeye döner.
- **[K]** PhotoSwipe v5 notları:
  - Açılış ve kapanış animasyonu kırpılmış küçük resimden (thumbnail) başlayabilir.
  - Yakınlaştırırken `srcset` ile daha büyük kaynak yüklenir (örnekte yaklaşık 300px küçük resim, yaklaşık 2500px tam boy).
  - History/hash tabanlı gezinme **v5'te kaldırıldı**, bu yüzden geri tuşu davranışı uygulamaya kalmış.
  - Dahili caption özelliği erişilebilirlik sorunları yüzünden kaldırıldı.
  - Klavye detayı ana sayfada yazmıyor.
- **[K]** NN/g'nin alt sayfa makalesinden genellenen ilke: mobilde sistem geri hareketi kaplamayı (overlay) kapatmalı; yalnızca kaydırma (swipe) ile kapatma erişilemez.
- **[G]** Uygulama önerileri:
  - ← → ile önceki/sonraki, Esc ile kapat, Home/End ile ilk/son.
  - Ekran okuyucular için `aria-live="polite"` ile "3 / 8" sayacı duyurulmalı.
  - Mobilde yatay kaydırma ile geçiş ve aşağı kaydırma ile kapatma, ama yanında **mutlaka** görünür bir X düğmesi.
  - Açıkken URL'ye `?foto=3` yazın (Next.js `router.push` ve shallow). Böylece geri tuşu önce lightbox'ı kapatır.
  - `prefers-reduced-motion` açıksa geçişlerde yalnızca opaklık (fade) kullanın.
  - Komşu iki görseli önceden yükleyin.

### 2.7 Mobil

- **[K]** NN/g'ye göre sekme çubuğu 4–5 öğeye kadar uygundur; fazlasında dokunma hedefleri küçülür. Hamburger menü keşfedilebilirliği düşürür ve içerik ağırlıklı sitelere uyar.
- **[G]** Apple HIG (sayfa okunamadı; genel bilgi): 3–5 sekme, kısa tek kelimelik etiket, rozetleri ölçülü kullanma.
- **[K]** NN/g alt sayfa kuralları:
  - Kısa ve geçici etkileşimler için kullanın; ana akışın yerine koymayın (profil detayı alt sayfa olmamalı).
  - Görünür X düğmesi koyun ve geri hareketini destekleyin.
  - Alt sayfaları üst üste yığmayın.
  - Kaydırma hareketiyle yanlışlıkla kapanmayı önleyin.
  - "Alt kısım daha kolay ulaşılır" varsayımı büyük ölçüde yanlış; ekranın ortası daha erişilebilir.
- **[G]** Mevcut 4 öğeli alt navigasyon (Ana sayfa, Keşfet, Şehirler, Güvenlik) NN/g aralığında. Editoryal bir his için ikonla birlikte etiket kullanın; etiketler 11–12px ve küçük harfle yazılsın.

### 2.8 Yönetim paneli (SaaS)

- **[K]** Pencil & Paper:
  - Satır yüksekliği 40px (sıkışık), 48px (normal) veya 56px (rahat). Yoğunluk anahtarı tablonun dışında durmalı ve tercih kaydedilmeli.
  - Metin sola, sayılar sağa ve **tabular rakamlarla** hizalanır. Ortalamaya asla izin verilmez. Başlık hizası içerikle aynı olur.
  - Yapışkan başlık kullanılır; yatay kaydırmada ilk sütun sabitlenir.
  - Satır onay kutuları hover'da belirir. Toplu işlemler yalnızca seçim yapılınca görünür, tercihen alt kenara sabitlenmiş bir araç çubuğunda.
  - Satır içi (inline) düzenleme düşük riskli işler içindir. Yüksek riskli işler drawer, modal veya yan panelde yapılır.
- **[K]** NN/g:
  - İlk sütun okunabilir bir kimlik olmalı (otomatik ID değil).
  - Sütunlar önem sırasına göre dizilmeli.
  - Sütun gizleme ve sıralama kolay olmalı.
  - Satır içinde 1–2 eylemden fazlası olmamalı; fazlası menüye taşınmalı.
  - Etkin filtre göstergesi bulunmalı.
  - Hover vurgusu veya zebra satırlar kullanılmalı.
- **[K]** cmdk:
  - Ok tuşlarıyla gezinme ve `loop` desteği var.
  - Gruplar ve `Command.Empty` mevcut.
  - Özel `filter` ve `keywords` (eş anlamlılar) tanımlanabilir. Sunucu tarafı arama için `shouldFilter={false}` kullanılır.
  - ⌘K kısayolu **dahili değil**, kendiniz eklemelisiniz.
  - Sanallaştırma yok; yaklaşık 2–3 bin öğeye kadar iyi çalışıyor.
  - Radix Dialog tabanlı, erişilebilir.
- **[G]** Moderasyon akışı için önerilen desen: liste, sağdan açılan drawer (yaklaşık 480–560px) ve klavye ile sonraki kayda geçiş (J/K). Onay ve ret gerekçeleri drawer içinde verilir; geri alınamaz işlemlerde onay istenir.

---

## 3. Önerilen yön

### 3.1 Fontlar (`next/font/google`)

**Birincil öneri:**
- **Display:** `Fraunces` (değişken). Ayarlar: `axes: ['opsz','SOFT']`, `subsets: ['latin','latin-ext']`, `display: 'swap'`.
  - Büyük başlıkta `font-variation-settings: "opsz" 144, "SOFT" 0`, `font-weight: 300–400`. İnce ve keskin bir lüks dergi tonu verir.
  - Neden: Türkçe [D], optik boyut ekseni sayesinde hem 72px hero hem 24px başlık için tek dosya, italik mevcut.
- **Metin ve UI:** `Geist` (mevcut). Değişiklik maliyeti sıfır, latin-ext [D].
- **Sayılar ve ID'ler (yönetim paneli):** `Geist Mono`, ya da Geist ile `font-variant-numeric: tabular-nums`.

**Alternatif A (daha "moda"):** Display için `Instrument Serif` (yalnızca 400 + italik), metin için `Inter Tight` veya Geist. Dikkat: Instrument Serif'i yalnızca 32px ve üstünde kullanın; ağırlık kademesi yok.

**Alternatif B (uzun okuma ağırlıklı):** Gövde için `Newsreader` (opsz 6–72), UI için Geist. Uzun biyografilerde serif gövde. Bu durumda gövdede satır yüksekliği 1.7–1.8 olmalı.

**Kaçınılacak:** Playfair Display (fazla yaygın), Cormorant (ince; küçük puntoda ve koyu temada okunurluğu zayıf).

> Toplam font yükü: en fazla 2 aile, 1 değişken dosya + 1 italik. `preload` yalnızca display ve gövde için.

### 3.2 Tip ölçeği (akışkan, Utopia mantığı, 360→1280px)

| Token | Mobil | Masaüstü | Font / ayar |
|---|---|---|---|
| `--step--2` (meta, kicker) | 12px | 12px | Geist 500, büyük harf, `letter-spacing: .08em` |
| `--step--1` (caption) | 14px | 14px | Geist 400 |
| `--step-0` (gövde) | 16px | 18px | Geist 400, `line-height: 1.65` |
| `--step-1` (lead/dek) | 19px | 22px | Fraunces italik 300 veya Geist 400 |
| `--step-2` (H3) | 22px | 28px | Fraunces 400, lh 1.2 |
| `--step-3` (H2) | 27px | 36px | Fraunces 350, lh 1.12 |
| `--step-4` (H1) | 32px | 56px | Fraunces 300, lh 1.06, `-0.015em` |
| `--step-5` (hero/display) | 40px | 88px | Fraunces 300 opsz 144, lh 1.05, `-0.02em` |

Örnek: `--step-5: clamp(2.5rem, 1.33rem + 5.2vw, 5.5rem);`

### 3.3 Ölçü ve satır uzunluğu
- Biyografi ve uzun metin: `max-width: 68ch`. Sınırlar 60–72ch.
- Dek ve lead: `max-width: 40ch`. Display başlık: `max-width: 18ch` ve `text-wrap: balance`.

### 3.4 Izgara ve boşluk
- 12 sütunlu ızgara, kanal (gutter) 16px (mobil) / 24px (tablet) / 32px (masaüstü).
- Kenar boşluğu 16 / 24 / 48px. Maksimum içerik genişliği 1280px; okuma bloğu 680px.
- Profil ızgarası: 2 sütun (<640px), 3 sütun (≥768px), 4 sütun (≥1280px). Kart aralığı 12 / 20 / 24px.
- Boşluk basamakları (4px tabanlı): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160.
- Bölüm dikey boşluğu: mobilde `py-14` (56px), masaüstünde `py-24`–`py-32`.

### 3.5 Görsel oranları
| Kullanım | Oran | Not |
|---|---|---|
| Keşif kartı | **4:5** | Mevcut sistemle aynı. Tüm ızgarada tek oran (düzgün ızgara) |
| Profil hero | **4:5** (masaüstü sol sütun), mobilde 4:5 tam genişlik | Gerekirse `<picture>` ile 3:4 |
| Galeri küçük resim | 1:1 veya 4:5 | Lightbox'ta özgün oran, `object-fit: contain` |
| Şehir/ilçe kapağı | 3:2 (masaüstü), 4:5 (mobil) | Fotoğrafik peyzaj |
| Editoryal öne çıkarma | 16:9 veya 21:9 | Yalnızca ana sayfa bölüm açılışı |

- `object-position: 50% 30%` varsayılan olsun. Yüklemede kullanıcıya odak noktası seçtirmeyi değerlendirin.
- `next/image` için `sizes` örneği: `(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw`.

### 3.6 Keşif UX'i
- Düzgün ızgara (masonry değil): sıra öngörülebilir, CLS yok, tek oran.
- Sayfalama: "Daha fazla yükle" ve "24 / 312 profil" göstergesi. Detaydan dönüşte kaydırma konumu geri yüklensin.
- Mobil filtre: alt sayfa, toplu (batch) filtre ve yapışkan "Sonuçları göster (128)" düğmesi.
- Masaüstü filtre: sol yapışkan panel ya da üstte çip satırı.
- Filtre bilgisi: etkin filtre çipleri, ✕ ile tekil silme ve "Tümünü temizle".

### 3.7 Renk ve yüzey (mevcut OKLCH tokenlarına ek)
- Editoryal zemin: sıcak kırık beyaz (`oklch(0.975 0.008 85)` civarı). Koyu temada sıcak antrasit.
- Vurgu rengi tek kalsın (mevcut petrol). Gölge yerine 1px hairline (`--border` %8–12 kontrast).
- Köşe yarıçapı: editoryal yüzeylerde (kart görseli, hero) `0`–`4px`, UI kontrollerinde mevcut `0.75rem`. Bu fark "dergi ve uygulama" ayrımını görsel olarak kurar **[G]**.

### 3.8 Lightbox
- Radix Dialog tabanlı. Odak döngüsü, Esc ile kapatma ve tetikleyiciye odak dönüşü olsun.
- ← → ile gezinme, kaydırma (swipe) ve görünür X düğmesi.
- `aria-live` sayaç.
- URL parametresiyle geri tuşu desteği.
- Komşu görsel ön yüklemesi.
- Reduced-motion açıksa yalnızca fade.

### 3.9 Yönetim paneli
- Tablo yoğunluğu 40 / 48 / 56px (varsayılan 48) ve tercih kaydı.
- Tabular rakamlar, sağa hizalı sayılar.
- Yapışkan başlık ve ilk sütun.
- Hover'da onay kutusu ve seçimle birlikte alt kenarda toplu işlem çubuğu.
- Sağ drawer (yaklaşık 520px) ile moderasyon.
- ⌘K komut paleti (shadcn `Command` = cmdk). ⌘K dinleyicisini elle ekleyin. Kullanıcı aramasında `shouldFilter={false}` ve sunucu tarafı sorgu.
- Yönetim panelinde serif kullanmayın: yalnızca Geist ve Geist Mono.

---

## 4. Kaçınılacaklar

- Görsel üstüne yoğun gradyan, rozet ve metin yığını. Kontrast riski taşır ve ucuz bir "ilan" görünümü verir.
- Masonry keşif ızgarası: sıra belirsizliği, CLS ve farklı oranların "katalog" hissi.
- Sonsuz kaydırmada footer'ı (yasal bağlantılar, güvenlik) erişilemez bırakmak.
- Alt sayfayı profil detayı gibi ana akışlarda kullanmak, sayfaları üst üste yığmak, yalnızca kaydırmayla kapatma.
- Lightbox'ı geri tuşuyla kapatamamak ve odağı kaybetmek.
- Display fontta `line-height < 1.05` ve aşırı negatif harf aralığı: Türkçe İ, Ğ ve Ş çarpışır.
- `lang="tr"` olmadan `uppercase` kullanmak ("ISTANBUL" hatası).
- 3'ten fazla font ailesi; ince serifleri (Cormorant vb.) 18px altında kullanmak.
- Cinselleştirici kadraj ve poz, "çevrimiçi / şimdi müsait" gibi aciliyet göstergeleri, fiyat ve "VIP" çağrışımlı lüks dili. "Premium" his tipografi ve boşlukla verilmeli, içerikle değil.
- Galerilerden (Behance, Dribbble vb.) düzen veya varlık kopyalamak. Ticari fontlarda (Editorial New, Neue Montreal) lisans olmadan "benzerini" aramak yerine ilkeyi uygulayın.
- Yönetim panelinde ortalanmış hücreler, 3'ten fazla satır içi eylem ve otomatik ID'yi ilk sütun yapmak.

---

## 5. Kaynaklar (bu oturumda gerçekten erişilenler)

- https://fonts.googleapis.com/css2?family=Fraunces (ve aynı uç noktada: Instrument+Serif, Newsreader, Playfair+Display, Cormorant, Cormorant+Garamond, Inter+Tight, Geist, Inter, DM+Serif+Display, Libre+Caslon+Display, Bodoni+Moda, Geist+Mono)
- `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` (yerel, next 16.4.2)
- https://www.awwwards.com/websites/magazine/
- https://www.kinfolk.com/
- https://www.nngroup.com/articles/bottom-sheet/
- https://www.nngroup.com/articles/mobile-navigation-patterns/
- https://www.nngroup.com/articles/infinite-scrolling-tips/
- https://www.nngroup.com/articles/applying-filters/
- https://www.nngroup.com/articles/data-tables/
- https://www.nngroup.com/articles/image-focused-design/
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://photoswipe.com/
- https://github.com/dip/cmdk
- https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- https://practicaltypography.com/line-length.html
- https://utopia.fyi/type/calculator/
- https://web.dev/articles/aspect-ratio
- https://web.dev/articles/optimize-cls
- https://fontalternatives.com/blog/font-pairings-editorial-magazine-design/
- https://refero.design/ (yalnızca başlık geldi)
- https://mobbin.com/ (yalnızca pazarlama metni geldi)
- WebSearch sonuç özetleri (sayfalar ayrıca açılmadı): https://pangrampangram.com/blogs/journal/best-font-pairings-2025, https://weandthecolor.com/most-popular-typefaces-2025-update-new-fonts-and-design-trends-you-need-to-know/205279, https://www.designyourway.net/blog/typography-trends/, https://support.clickbooq.com/hc/en-us/articles/211264263-Images-appear-out-of-order-Grid-Masonry, https://www.picdrop.com/web/?p=555, https://lists.w3.org/Archives/Public/public-css-archive/2024Apr/1059.html

**Erişilemeyenler:** behance.net (403), land-book.com (403), dribbble.com (boş, JS ile yükleniyor), www.refero.design (DNS hatası), m3.material.io (404 veya yalnızca başlık), developer.apple.com HIG Tab bars (yalnızca başlık).
