# SEO

## Uygulananlar

| Özellik | Nerede |
| --- | --- |
| Dinamik metadata (title/description/OG/Twitter) | `generateMetadata` — profil, il, ilçe; `server/queries/location-seo.ts` |
| Canonical | Her sayfada; filtreli varyantlar temiz yola canonical verir |
| XML sitemap | `app/sitemap.ts` — yalnızca indekslenebilir sayfalar |
| robots.txt | `app/robots.ts` — `/admin`, `/api`, `/media`, filtreli keşfet engelli |
| Breadcrumb + JSON-LD | `BreadcrumbList`, `ProfilePage`, `WebSite`, `FAQPage` (`<` kaçışlı) |
| SSR / ISR / PPR | Cache Components; il/profil sayfaları önceden üretilir |
| Görsel optimizasyonu | `next/image` (AVIF/WebP, `sizes`), yüklemeler sunucuda WebP'ye dönüştürülür |
| Core Web Vitals | Statik shell, ilk 2 kart `priority`, font `swap`, CLS'siz oranlı görseller |
| Admin yönetimi | `/admin/seo`: başlık, açıklama, canonical, index override, özgün tanıtım; profil bazında SEO başlığı/açıklaması/noindex |

## İndeks kuralları (doorway önlemi)

`shouldIndexListing()` (`src/domain/seo.ts`):

1. Filtrelenmiş veya sayfalanmış varyant → **her zaman noindex**.
2. Admin override varsa ona uyulur.
3. Profil yoksa → noindex.
4. ≥3 profil **veya** (≥1 profil + elle yazılmış özgün tanıtım) → index.

Sitemap aynı kuralı kullanır; boş/ince il-ilçe sayfaları sitemap'e girmez. Geçersiz il/ilçe adresleri gerçek 404 döner.

## Özgün içerik ilkesi

Şehir sayfalarında "yalnızca şehir adı değişen" şablon metin **üretilmez**. İçerik:
- Admin'in `/admin/seo` üzerinden yazdığı şehre özgü tanıtım metni,
- O şehirdeki gerçek profillerden türetilen veriler (profil/doğrulanmış sayısı, en sık ilgi alanları, profil bulunan ilçeler),
- TÜİK kaynaklı il bilgileri (bölge, nüfus, plaka).

Tanıtım metni olmayan ve yeterli profili bulunmayan sayfalar otomatik noindex'tir. Google'ın doorway ve "scaled content abuse" politikaları gereği tanıtım metinleri toplu/otomatik üretilmemelidir.

## Yapılacaklar

- Search Console doğrulaması ve sitemap gönderimi (domain belli olunca).
- `opengraph-image` ile dinamik OG görseli (profil fotoğrafı kullanımı rıza kapsamında değerlendirilmeli).
- Lighthouse CI ile CWV bütçesi.
