# Bağımlılık Değerlendirmesi: Medya / Frontend (hilal)

Tarih: 2026-10-16. Hedef: Next 16.4.2, React 19.3.0, TS strict, Tailwind 4, Turbopack, App Router + Cache Components.

## Yöntem ve doğrulama düzeyi

- **Doğrulandı:** Sürüm, yayın tarihi, lisans, peer bağımlılıkları ve `dependencies` bilgileri `npm view` ile alındı. Haftalık indirme sayıları `api.npmjs.org/downloads/point/last-week` ile alındı (2026-10-06 ile 10-12 arası).
- **Uyumluluk testi:** Scratch projede `react@19.3.0`, `react-dom@19.3.0`, `next@16.4.2` ve `sharp@0.35.5` ile birlikte tüm adaylar `npm i --ignore-scripts` ile kuruldu. Peer çakışması çıkmadı (ERESOLVE yok). `npm audit` sonucu **0 açık**.
- **Güvenlik geçmişi:** Advisory geçmişi GitHub Advisory DB'den alındı (`gh api /advisories?ecosystem=npm&affects=…`).
- **Boyut:** Gzip boyutları için iki kaynak kullanıldı:
  - (B) bundlephobia API: yalnızca bir kısmı yanıt verdi.
  - (E) Yerel esbuild 0.28.2 ölçümü: `--bundle --minify --format=esm --platform=browser`, react ve react-dom external, `gzip -9`. Bu ölçüm **tahmindir**. Next/Turbopack çıktısı tree-shaking ve chunk ayrımı nedeniyle farklı olabilir.
- **Proje gözlemi:** `framer-motion@^14.3.0` package.json'da var, ancak `src/` altında hiçbir dosya `framer-motion` ya da `motion/react` import etmiyor. Yani şu an **kullanılmayan bir bağımlılık**. Projede `toHaveScreenshot` kullanımı da yok.

## Özet tablo

| Kategori | Paket | Son sürüm (yayın) | Lisans | Haftalık indirme | React 19 / Next 16 | Bilinen açık (güncel sürüm) | ~gzip | Karar |
|---|---|---|---|---|---|---|---|---|
| Zengin metin | @tiptap/react + pm + starter-kit | 3.32.0 (2026-10-13) | MIT | ~18,7M / 19,2M | peer `react ^17‖^18‖^19` ✔ | yok | ~126 KB (E, editor + StarterKit) | **Benimse** (yalnızca admin, dynamic import) |
| Zengin metin | @tiptap/extension-link | 3.32.0 | MIT | – | ✔ | eski: GHSA-vhrc (<2.10.4, low) | StarterKit v3 içinde | Ayrı kurulum gerekmez (StarterKit v3 bağımlılığı) |
| Render | @tiptap/static-renderer | 3.32.0 (2026-10-13) | MIT | ~380K | peer react ^19 ✔ | yok | `json/react`: ~0,5 KB (E); `pm/react` + StarterKit: ~117 KB (E) | **Benimse** (sunucu tarafı, JSON → React) |
| Render | @tiptap/html (generateHTML) | 3.32.0 | MIT | ~1,7M | Node import'u **happy-dom** çeker (zorunlu peer `^20.8.9`, 18 MB) | happy-dom'da 2024-26 arası 3 kritik + 2 yüksek açık (güncelde düzeltilmiş) | – | **Kaçın** |
| Sanitizer | sanitize-html | 2.18.1 (2026-10-14) | MIT | ~11,8M | sunucu ✔ | 2026'da 1 kritik + 4 orta açık (hepsi ≤2.17.x, düzeltilmiş) | 49 KB (B) | Gerekirse yalnızca sunucuda |
| Sanitizer | isomorphic-dompurify | 4.6.0 (2026-10-16) | MIT | ~5,9M | jsdom 30 çeker (7 MB) | – | – | Kaçın (JSON yaklaşımında gereksiz) |
| Sanitizer | dompurify | 3.4.17 (2026-10-12) | MPL-2.0 OR Apache-2.0 | ~71,6M | sunucuda DOM gerekir | 2026'da 13+ advisory (≤3.4.15, düzeltilmiş) | 11,5 KB (B) | Gerek yok |
| Lightbox | yet-another-react-lightbox | 3.32.2 (2026-07-30) | MIT | ~664K | peer react ^19 ✔, `"use client"` var | yok | ~10,8 KB (E, çekirdek) | **Benimse** |
| Lightbox | photoswipe | 5.4.4 (**2024-05-24**) | MIT | ~593K | React bağımsız, DOM gerekir | yok | lightbox 4,5 KB + core 20 KB (E); 16,6 KB (B) | Alternatif. ~2,5 yıldır sürüm yok |
| Carousel | embla-carousel-react | 8.6.0 (**2025-04-04**); `next` = 9.0.0-rc04 | MIT | ~28,6M | peer react ^19 ✔; `"use client"` yok | yok | ~7,9 KB (E), 7,1 KB (B) | Gerekirse benimse (shadcn carousel) |
| Upload | react-dropzone | 20.1.3 (2026-10-10) | MIT | ~14M | peer `react >= 18` ✔ | yok | ~6,2 KB (E) | Opsiyonel. Native tercih edilir |
| Upload | @uppy/core + react + dashboard + tus | 6.3.0 / 6.1.0 / 6.0.2 / 6.0.0 | MIT | core ~1,4M | peer react ^19 ✔ | yok | core+tus ~33 KB; +Dashboard ~92 KB (E) | Kaçın (ağır) |
| Upload | tus-js-client | 4.3.1 (2025-01-16) | MIT | ~2,1M | framework bağımsız | yok | 12,5 KB (B) | Yalnızca büyük video için benimse |
| Sanallaştırma | @tanstack/react-virtual | 3.14.21 (2026-10-16) | MIT | ~28M | peer react ^19 ✔ | yok | ~10 KB (E/B) | **Benimse** (gerektiğinde) |
| Video | native `<video>` | – | – | – | ✔ | – | 0 | **Benimse** (varsayılan) |
| Video | media-chrome | 4.19.3 (2026-09-28) | MIT | ~4,2M | web components | yok | ~41 KB (E, tüm elemanlar) | Opsiyonel (özel kontroller gerekirse) |
| Video | video.js | 10.1.0 (2026-10-13). v10 yeni mimari, **10.0.0: 2026-10-01** | Apache-2.0 | ~1,16M (`@videojs/react` ~124K) | `@videojs/react` peer react ^19 ✔ | eski: 7.x XSS | ölçülmedi | Şimdilik kaçın (çok yeni major) |
| Video | hls.js | 1.7.3 (2026-09-11) | Apache-2.0 | ~10,3M | yalnızca client | yok | full ~179 KB, light ~114 KB (E) | Yalnızca HLS gerekirse, dynamic import |
| Video işleme | ffmpeg-static | 5.3.0 (2025-11-14) | **GPL-3.0-or-later** | ~2,5M | install script binary indirir | – | binary büyük (tahmin, ölçülmedi) | Vercel'de kaçın |
| Video işleme | fluent-ffmpeg | 2.1.3 (2024-05-19) | MIT | ~2,5M | – | npm'de **deprecated** | – | **Kaçın** |
| Animasyon | framer-motion | 14.3.0 (2026-10-15) | MIT | ~51M | peer react ^19 ✔ | yok | ~46 KB (E, `motion`+`AnimatePresence`) | Mevcut. Kullanılmıyor |
| Animasyon | motion | 14.3.0 (2026-10-15) | MIT | ~25M | peer react ^19 ✔ | yok | ~46 KB; `LazyMotion`+`m` ~32 KB (E) | **Benimse** (framer-motion yerine) |
| pHash | sharp-phash | 2.2.0 (2024-10-31) | MIT | ~143K | peer `sharp >= 0.32` ✔ | yok | sunucu | Kaçın. Özel dHash yeterli |
| pHash | blockhash-core | 0.1.0 (**2019-12-07**) | MIT | ~97K | – | yok | sunucu | Kaçın |
| Görsel regresyon | @playwright/test `toHaveScreenshot` | 1.64.1 (mevcut) | Apache-2.0 | – | ✔ | – | 0 (devDep) | **Benimse** |

---

## 1. Zengin metin editörü (yalnızca admin)

**Doğrulananlar:**
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` ve `@tiptap/extension-link` 3.32.0 sürümünde. Hepsi 2026-10-13'te yayınlandı ve MIT lisanslı.
- `@tiptap/react` peer bağımlılıkları: `react`, `react-dom` ve `@types/*` için `^17 || ^18 || ^19`. Bu nedenle React 19.3 ile uyumlu.
- `@tiptap/pm` ve `@tiptap/core` peer'ları **birebir sürüm** (`3.32.0`) istiyor. Tüm `@tiptap/*` paketleri aynı sürüme pinlenmeli.
- **StarterKit v3, `@tiptap/extension-link` ve `@tiptap/extension-underline` paketlerini kendi bağımlılığı olarak içeriyor.** Link'i ayrıca kurmak gerekmez. `StarterKit.configure({ link: { openOnClick: false, autolink: true, protocols: [...] } })` ile yapılandırılabilir. Bu son ayrıntı Tiptap v3 API bilgisine dayanıyor; kurulumda doğrulanmalı.
- `@tiptap/react` dist dosyası `"use client"` ile başlıyor. `immediatelyRender` varsayılanı `true`. SSR tespit edildiğinde dev modda uyarı veriyor. Next'te `useEditor({ immediatelyRender: false, … })` verilmeli. Bu ayarı vermek, editörü `next/dynamic` ile `ssr: false` olarak yüklemekten daha güvenli.
- Boyut (E): `useEditor` + `EditorContent` + StarterKit yaklaşık **126 KB gzip**. Bu yalnızca admin rotalarında yüklenmeli; public bundle'a hiç girmemeli.
- Advisory: `@tiptap/extension-link` için yalnızca eski GHSA-vhrc-hgrq-x75r (<2.10.4, low) var. Güncel sürümde açık yok.

**Karar:** Benimse. Kurulacak paketler `@tiptap/react@3.32.0`, `@tiptap/pm@3.32.0` ve `@tiptap/starter-kit@3.32.0`. `@tiptap/core` StarterKit üzerinden gelir; tip importları için açıkça eklemek isteğe bağlı.

## 2. Sunucu tarafı sanitizasyon ve render

**`@tiptap/html` (generateHTML) Node'da DOM çekiyor (doğrulandı):**
- Paket `exports` alanında `import.node` hedefi `./dist/server/index.js`.
- Bu dosya `from "happy-dom"` import ediyor. `happy-dom@^20.8.9` **zorunlu** bir peer; `peerDependenciesMeta` yok.
- Kurulu boyutu 18 MB. GitHub advisory geçmişinde 3 kritik ve 2 yüksek açık var (en sonuncusu 2026-03, hepsi düzeltilmiş).
- Sonuç: Sunucu tarafında generateHTML kullanmaktan kaçınılmalı.

**`@tiptap/static-renderer` (doğrulandı):**
- `./json/react` entry'si yalnızca `react` import ediyor. ProseMirror ve DOM bağımlılığı yok, boyutu yaklaşık 0,5 KB (E).
- `./pm/react` entry'si `@tiptap/core` ve `@tiptap/pm/model` kullanıyor. Extension şemasıyla render yapıyor; DOM gerektirmiyor.
- Bu iki entry RSC içinde, Cache Components ile önbelleğe alınabilir şekilde çalışmaya uygun. Tek koşul `@tiptap/pm`'in sunucu bundle'ına girmesi; bu bir tasarım çıkarımı, çalıştırılarak test edilmedi.

**Önerilen yaklaşım ("HTML'siz" render):**
1. Tiptap JSON'u yazma anında sunucuda **zod ile katı biçimde doğrula**:
   - Node tipleri için beyaz liste: `doc`, `paragraph`, `heading` (yalnızca 2–4), `bulletList`, `orderedList`, `listItem`, `blockquote`, `hardBreak`, `horizontalRule`, `text`.
   - Mark'lar için beyaz liste: `bold`, `italic`, `underline`, `strike`, `link`.
   - `link.href` için `https:`, `mailto:` ve göreli yol dışında her şey reddedilmeli. `javascript:` ve `data:` engellenmeli.
   - `attrs` bilinmeyen anahtar içeremez. Bunun için `z.strictObject` kullanılmalı.
   - Derinlik ve uzunluk sınırları konmalı.
2. Render için iki seçenek var:
   - Küçük bir özel React renderer (node tipine göre switch, yaklaşık 80 satır).
   - `@tiptap/static-renderer/json/react` içinde `nodeMapping` ve `markMapping` kullanmak.

   React çıktısı metni otomatik escape ediyor ve `dangerouslySetInnerHTML` kullanılmıyor. Bu nedenle sanitizer gerekmiyor. Link'lere `rel="noopener noreferrer nofollow"` eklenmeli.
3. Bu yaklaşımda dompurify, sanitize-html veya jsdom'a **gerek kalmaz**. Bu bir artı, çünkü advisory geçmişi yoğun:
   - DOMPurify'de 2026 içinde 13'ten fazla advisory yayımlandı.
   - sanitize-html'de 2026-05'te bir kritik açık (GHSA-rpr9-rxv7-x643) ve ardından birkaç orta seviye açık yayımlandı.
   - Güncel sürümlerin ikisi de düzeltilmiş durumda.

**Kalan sanitizer seçenekleri** (ileride HTML yapıştırma veya içe aktarma gerekirse):
- `sanitize-html@2.18.1`: Node-native (htmlparser2) ve DOM gerektirmiyor. Sunucuda en hafif seçenek bu; 49 KB (B), ancak yalnızca sunucuda kullanılacağı için client bundle'a etkisi yok. Yalnızca sunucuda kullanılmalı.
- `isomorphic-dompurify@4.6.0`: jsdom 30 çekiyor (7 MB). Serverless'ta cold start ve function boyutu maliyeti var. Kaçın.

## 3. Lightbox / galeri

- **yet-another-react-lightbox 3.32.2** (2026-07-30, MIT, haftalık ~664K):
  - Peer `react ^16.8 … ^19` ✔.
  - Dist `"use client"` ile başlıyor, yani bir client component.
  - Çekirdek boyutu yaklaşık 10,8 KB gzip (E). Zoom, Thumbnails, Captions ve Video ayrı plugin olarak geliyor ve her biri boyutu artırır.
  - Klavye (ok tuşları, Esc), swipe ve pinch-zoom (Zoom plugin), focus trap ve ARIA özellikleri paketin belgelerinde anlatılıyor; bu çalışmada test edilmedi.
  - Gerekirse `next/image` ile özel `render.slide` kullanılabiliyor.
  - Advisory yok.
- **photoswipe 5.4.4**:
  - Son sürüm **2024-05-24**; yaklaşık 2,5 yıldır yeni sürüm yok. MIT, advisory yok.
  - Boyut: lightbox 4,5 KB, core 20 KB (E). Bundlephobia değeri 16,6 KB (B).
  - React wrapper'ı yok; `useEffect` içinde imperative olarak kullanılıyor ve DOM gerektiriyor. Yine de core'u tıklamada dynamic import ettiği için SSR açısından sorun çıkarmıyor.
  - Görsel kalitesi çok iyi, ancak bakım ritmi zayıf.
- **embla-carousel-react 8.6.0**:
  - Son stabil sürüm 2025-04-04. 9.0.0-rc04 `next` tag'inde.
  - MIT, haftalık ~28,6M, peer react ^19 ✔.
  - Yaklaşık 7,9 KB (E).
  - `"use client"` direktifi yok; client component içinde kullanılmalı.
  - Bu bir lightbox değil, carousel. shadcn'nin carousel bileşeni Embla tabanlı.

**Karar:**
- Lightbox için `yet-another-react-lightbox@3.32.2`, yalnızca galeri sayfasında ve dynamic import ile kullanılmalı.
- Grid native olarak `next/image` ile kurulmalı.
- Carousel ancak ürün ihtiyacı netleşirse Embla 8.6.0 ile eklenmeli. v9 RC kullanılmamalı.
- Erişilebilirlik testi mevcut `@axe-core/playwright` ile yapılmalı.

## 4. Upload

**Supabase resumable upload (resmi dokümandan doğrulandı):**
- Supabase Storage TUS protokolünü destekliyor. Endpoint: `https://<project-id>.storage.supabase.co/storage/v1/upload/resumable`. Doküman, büyük dosyalarda performans için `project-id.supabase.co` yerine bu doğrudan storage hostname'inin kullanılmasını öneriyor.
- Chunk boyutu 6 MB olmalı. Doküman bunu "do not change it" diye vurguluyor.
- **Signed upload URL ile birlikte kullanılabiliyor:** `createSignedUploadUrl` ile alınan token, TUS isteğinde `x-signature` header'ına konuyor. Upload URL'leri en fazla 24 saat geçerli.

**Vercel kısıtı (resmi dokümandan doğrulandı):** Function request ve response body sınırı **4,5 MB**. Bu nedenle dosyalar mutlaka client'tan doğrudan Supabase'e gitmeli. Mevcut signed-URL tasarımı bu açıdan doğru.

**Seçenekler:**
- **Native** `<input type="file" multiple accept>` + `onDragOver`/`onDrop` + `supabase.storage.from(b).uploadToSignedUrl()`. Ek bağımlılık gerektirmiyor. Erişilebilirlik için gerçek bir `<input>` ve `<label>` kullanılmalı.
- `react-dropzone@20.1.3` (MIT, ~14M/hafta, ~6,2 KB (E), peer `react >= 18`): Klasör, drag-and-drop ve `accept` normalizasyonu kolaylığı sağlıyor. Getirisi az, maliyeti de az. Opsiyonel.
- `@uppy/*` v6: core + tus yaklaşık 33 KB, Dashboard ile birlikte yaklaşık 92 KB (E). `@uppy/react` webcam, screen-capture ve status-bar için opsiyonel peer bekliyor. Kendi UI'ımız (radix/shadcn) varken bu ağırlık gereksiz. Kaçın.
- `tus-js-client@4.3.1`: 12,5 KB (B). Son sürüm 2025-01, MIT. 6 MB'ı aşan dosyalarda, özellikle video için gerekiyor. Görseller için standart signed upload yeterli.

**Karar:** Native input + drag olayları kullanılmalı. Video veya büyük dosya akışında `tus-js-client` dynamic import edilmeli.

## 5. Sanallaştırma

`@tanstack/react-virtual@3.14.21`:
- 2026-10-16'da yayınlandı. MIT, ~28M/hafta.
- Peer react ^19 ✔. Yaklaşık 10 KB.
- Mevcut `@tanstack/react-table@9` ile aynı ekosistemde.
- Kendi dist dosyasında `"use client"` yok; hook, client component içinde kullanılmalı.

**Karar:** Liste veya grid gerçekten yüzlerce satırı aştığında benimse. Admin medya kütüphanesi için mantıklı. Public sayfalarda pagination ve `content-visibility: auto` tercih edilmeli.

## 6. Video

**Oynatıcı:**
- **Native `<video controls preload="metadata" playsInline poster>`:** MP4 (H.264/AAC) için yeterli. Bağımlılık gerektirmiyor. Altyazı `<track>` ile ekleniyor.
- **media-chrome 4.19.3:** MIT, ~4,2M/hafta. Tek bağımlılığı `ce-la-react`. Tüm elemanlar yaklaşık 41 KB (E); yalnızca gerekli elemanlar import edilerek küçültülebilir. Web component olduğu için client-only. Özel ve tutarlı kontrol tasarımı gerekirse kullanılabilir.
- **video.js 10.1.0:** v10 tamamen yeni bir mimari. `video.js` paketi artık yalnızca kullanıcıyı `@videojs/react` / `@videojs/html` paketlerine yönlendiren bir "pointer" paketi (README'de doğrulandı). `@videojs/react` peer react ^19 ✔ ve sağlayıcı paketleri (hls, mux, youtube…) opsiyonel peer olarak tanımlı. **10.0.0 2026-10-01'de, yani 2 hafta önce yayınlandı.** Olgunluk riski nedeniyle şimdilik kaçın.
- **hls.js 1.7.3:** Apache-2.0, ~10,3M/hafta. Full yaklaşık 179 KB, light yaklaşık 114 KB gzip (E). Bu ağırlık nedeniyle yalnızca HLS kaynakları için, Safari dışında ve dynamic import ile kullanılmalı. Mux, Cloudflare ve Bunny HLS sunuyor; Safari HLS'i native oynatıyor.

**Sunucu tarafı işleme (Vercel, resmi limitler 2026-08-24 tarihli dokümandan):**
- Maksimum süre: Hobby 300 s. Pro/Enterprise'da varsayılan 300 s, maksimum 800 s. 1800 s değeri beta olarak sunuluyor.
- Bellek: Hobby 2 GB / 1 vCPU, Pro 4 GB / 2 vCPU.
- Bundle: 250 MB (sıkıştırılmamış). "Large functions" beta ile 5 GB'a kadar çıkıyor.
- Body: 4,5 MB.
- Ücretlendirme: Aktif CPU süresi ve provisioned bellek süresi.
- `ffmpeg-static@5.3.0` **GPL-3.0-or-later** lisanslı. Binary'yi install script ile indiriyor; `--ignore-scripts` ile binary gelmez, bu da CI ve Vercel build'inde ek bir dikkat noktası. Binary boyutu bu çalışmada ölçülmedi; onlarca MB olması bekleniyor (tahmin).
- `fluent-ffmpeg@2.1.3` npm'de **deprecated**.
- Sonuç: 1–2 vCPU'da 800 s içinde kısa klipler işlenebilir, ancak uzun videolar, ABR ladder ve maliyet öngörülemez. GPL lisansı ve binary dağıtımı da hukuki ve operasyonel yük getiriyor. **Önerilmez.**

**Yönetilen servisler** (resmi fiyat sayfalarından, 2026-10-16; fiyatlar değişebilir):

| Servis | Model |
|---|---|
| Cloudflare Stream | Depolama $5 / 1.000 dk (önceden ödemeli, 1.000 dk'lık adımlarla). Teslimat $1 / 1.000 dk izlenme. Encoding ve ingress ücretsiz. Sayfada belirtilmiş bir minimum ücret yok. |
| Mux | Pay-as-you-go. 1080p basic için encoding ücretsiz. Depolama $0,003/dk/ay. Teslimat $0,001/dk; her ay ilk 100.000 dk ücretsiz, ayrıca aylık $20 kredi. Platform ücreti yok. |
| Bunny Stream | Encoding ücretsiz. Depolama $0,01/GB'tan başlıyor. CDN $0,005/GB'tan başlıyor. Aylık minimum $1. |

- Nitel değerlendirme: Düşük hacimde (dernek içeriği, birkaç yüz dakika) üçü de aylık birkaç dolar düzeyinde.
  - Mux geliştirici deneyimi ve analitik açısından güçlü.
  - Cloudflare dakika bazlı, öngörülebilir fiyatlandırma sunuyor.
  - Bunny GB bazlı ve en ucuz seçenek gibi görünüyor.
- Belirsizlik: KDV, bölgesel fiyatlar ve kur etkisi doğrulanmadı.

**Karar:**
- Kısa ve az sayıda video için:
  - Supabase Storage'da MP4 tutulur ve native `<video>` ile oynatılır.
  - Upload sırasında client'ta süre ve boyut sınırı uygulanır.
  - Poster görselleri `sharp` ile ayrı olarak üretilir.
- Video hacmi büyürse Cloudflare Stream veya Mux kullanılır: direct creator upload + HLS, Safari dışında hls.js ya da media-chrome. Sunucuda ffmpeg kullanılmamalı.

## 7. Animasyon

- `framer-motion@14.3.0` ve `motion@14.3.0` aynı gün yayınlandı (2026-10-15).
- `motion` paketinin tek bağımlılığı `framer-motion@14.3.0` (ve tslib). Yani `motion` ince bir yeniden-ihracat katmanı.
- **framer-motion hâlâ aktif olarak yayımlanıyor.** Yaklaşık 51M/hafta indiriliyor; bu sayı motion'ın bağımlılığı olarak gelen kurulumları da içeriyor.
- Her ikisi de peer `react ^18 || ^19` ✔.
- Boyut aynı: `motion` + `AnimatePresence` yaklaşık 46 KB (E). `LazyMotion` + `domAnimation` + `m` ile yaklaşık 32 KB (E).
- Projede `src/` altında hiçbir import yok.

**Karar:**
- Animasyon gerçekten gerekiyorsa `motion@14.3.0` kullanılmalı, import yolu `motion/react` olmalı. Bu, üst projenin önerdiği güncel isim. `framer-motion` kaldırılmalı.
- Public sayfalarda `LazyMotion` + `m` kullanılmalı.
- Basit geçişler için `tw-animate-css` (mevcut) ve CSS yeterli. Hiç kullanılmayacaksa her iki paket de kaldırılabilir.

## 8. Kopya görsel tespiti

- `sharp-phash@2.2.0`:
  - Son sürüm 2024-10-31, MIT, peer `sharp >= 0.32` ✔.
  - Kodu yaklaşık 100 satır, CommonJS. Saf JS ile 32×32 DCT yapıyor ve hash'i bit-string olarak döndürüyor.
  - Bakımı seyrek.
- `blockhash-core@0.1.0`: Son sürüm **2019-12-07**; artık bakım görmüyor.
- `sharp` zaten projede (`^0.35.5`). Not: sharp için 2026'da 3 yüksek açık yayımlandı. Hepsi 0.35.5 ve altında düzeltildi; proje güncel düzeltme sürümünde. Lockfile'ın ≥0.35.5'i çözdüğü korunmalı.

**Karar:** Özel bir dHash yazılmalı (yaklaşık 20 satır, TypeScript):

```ts
const { data } = await sharp(buf)
  .rotate()                 // EXIF yönlendirme
  .greyscale()
  .resize(9, 8, { fit: "fill" })
  .raw()
  .toBuffer({ resolveWithObject: true });
// her satırda bitişik pikselleri karşılaştır → 64 bit → BigInt / hex
```

- Hamming mesafesi ≤ 5–10 olanlar "olası kopya" sayılır. Eşik test verisiyle kalibre edilmeli.
- Ek olarak birebir kopya için SHA-256 kullanılmalı.
- Hash'ler DB'de `bigint` ya da `bit(64)` olarak saklanmalı.

## 9. Görsel regresyon

- `@playwright/test@1.64.1` zaten devDependency. `expect(page).toHaveScreenshot()` yerleşik olarak geliyor ve ek maliyet yok.
- Dikkat noktaları:
  - Baseline'lar OS ve font farkına duyarlı. Snapshot üretimi ve karşılaştırması aynı ortamda yapılmalı; CI'da Linux, gerekirse resmi Playwright Docker imajı.
  - `animations: "disabled"`, `mask` (dinamik içerik), `maxDiffPixelRatio` ve sabit viewport kullanılmalı.
  - Gerekirse `snapshotPathTemplate` ile platforma özel klasör tanımlanmalı.
- Harici servisler (Chromatic, Percy, Argos vb.) PR'da görsel inceleme arayüzü ve bulut render sağlıyor, ancak ücretli ya da kotalı ve harici bağımlılık getiriyor. Fiyatları bu çalışmada doğrulanmadı.

**Karar:** Playwright'ın yerleşik özelliği kullanılmalı. Ekip büyür ve PR'da görsel onay akışı gerekirse Argos veya Chromatic yeniden değerlendirilebilir.

---

## Uyumluluk engelleri

- **Bulunan engel yok.** Tüm adaylar React 19.3.0 ve Next 16.4.2 ile peer çakışması olmadan kuruldu. Scratch projede `npm audit` 0 açık verdi.
- **Dikkat noktaları:**
  1. `@tiptap/html` Node'da `happy-dom`'u zorunlu peer olarak çekiyor. Kullanılmamalı.
  2. Tüm `@tiptap/*` paketleri birebir aynı sürüme pinlenmeli.
  3. `@tiptap/react` için `immediatelyRender: false` verilmeli.
  4. `embla-carousel-react`, `@tanstack/react-virtual` ve `react-dropzone` dist'inde `"use client"` yok (`react-dropzone` için dist yolu kontrol edilemedi). Hepsi kendi client component'imizde sarılmalı.
  5. `fluent-ffmpeg` deprecated, `ffmpeg-static` GPL lisanslı.
  6. video.js v10 iki haftalık yeni bir major sürüm.
  7. `@uppy/react` birçok opsiyonel peer bekliyor.

## Önerilen set

| Paket | Sürüm | Tür | Gerekçe |
|---|---|---|---|
| `@tiptap/react` | 3.32.0 (exact) | dep | Admin editörü. React 19 peer ✔, MIT |
| `@tiptap/pm` | 3.32.0 (exact) | dep | Tiptap'in zorunlu peer'ı |
| `@tiptap/starter-kit` | 3.32.0 (exact) | dep | Link ve Underline dahil; ayrı link paketi gereksiz |
| `@tiptap/static-renderer` | 3.32.0 (exact) | dep | JSON → React sunucu render. DOM ve sanitizer gerektirmiyor. Alternatif: yaklaşık 80 satırlık özel renderer, bu durumda bağımlılık hiç eklenmez |
| `yet-another-react-lightbox` | 3.32.2 | dep | React 19 ✔, `"use client"`, yaklaşık 11 KB, aktif bakım |
| `@tanstack/react-virtual` | 3.14.21 | dep (ihtiyaç anında) | Admin medya kütüphanesi. Mevcut TanStack ile uyumlu |
| `motion` | 14.3.0 | dep (yalnızca animasyon gerekiyorsa) | Önerilen isim. `framer-motion` kaldırılmalı (şu an kullanılmıyor) |
| `tus-js-client` | 4.3.1 | dep (yalnızca 6 MB üstü / video upload) | Supabase TUS + `x-signature` ile resumable upload |

**Eklenmeyecekler ve native alternatifleri:**

| Eklenmeyecek | Yerine |
|---|---|
| sanitizer paketleri | zod ile şema doğrulama + React render |
| react-dropzone / uppy | native input + drag olayları + `uploadToSignedUrl` |
| video oynatıcı kütüphaneleri | native `<video>`. Ölçek büyürse Cloudflare Stream veya Mux + dynamic hls.js |
| ffmpeg paketleri | yönetilen servis |
| sharp-phash / blockhash-core | `sharp` ile özel dHash |
| harici görsel regresyon servisi | Playwright `toHaveScreenshot` |
| embla | yalnızca carousel ihtiyacı doğarsa 8.6.0 |

**Net bundle etkisi (E, tahmin):**
- Public sayfalara yalnızca lightbox (yaklaşık 11 KB, galeride lazy) ve isteğe bağlı motion (`LazyMotion` ile yaklaşık 32 KB) eklenir.
- Tiptap (yaklaşık 126 KB) yalnızca admin chunk'ında kalır.
- `@tiptap/static-renderer/json/react` sunucuda çalışır; client'a gönderilmez.
