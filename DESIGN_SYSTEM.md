# Tasarım sistemi

Minimal, premium, mobil öncelikli. Tek vurgu rengi, bol boşluk, sakin hareket.

## Tokenlar (`src/app/globals.css`)

| Token | Açık | Koyu | Kullanım |
| --- | --- | --- | --- |
| `--background` | kırık beyaz `oklch(0.988 0.003 95)` | antrasit `oklch(0.165 0.006 260)` | sayfa zemini |
| `--card` | beyaz | `oklch(0.205 …)` | kartlar, paneller |
| `--foreground` | `oklch(0.2 0.012 260)` | `oklch(0.955 …)` | metin |
| `--muted-foreground` | `oklch(0.47 …)` | `oklch(0.73 …)` | ikincil metin (AA) |
| `--primary` | koyu mürekkep | açık | birincil butonlar |
| `--brand` | petrol yeşili `oklch(0.47 0.085 190)` | `oklch(0.78 0.085 190)` | vurgu, rozet, odak halkası |
| `--brand-soft` | açık petrol | koyu petrol | rozet zeminleri |
| `--success` / `--warning` / `--destructive` | — | — | durum rozetleri |
| `--radius` | `0.75rem` | | sm/md/lg/xl/2xl türetilir |
| `--shadow-card`, `--shadow-raised` | | koyu temada güçlendirilmiş | kart yüksekliği |
| `--ease-out-soft` | `cubic-bezier(0.22,1,0.36,1)` | | geçişler |

Tüm renkler OKLCH; metin/zemin çiftleri WCAG AA (≥4.5:1) hedefler ve axe ile test edilir.

## Tipografi

Geist Sans (latin + latin-ext — ğ, ş, ı, İ), `font-display: swap`. Başlıklarda `letter-spacing: -0.02em` ve `text-wrap: balance`, paragraflarda `text-wrap: pretty`. Ölçek: H1 `text-3xl → sm:text-4xl → lg:text-6xl (hero)`, bölüm başlığı `text-2xl`, gövde `text-sm/base`.

## Aralık ve ızgara

`container-page` = `max-w-6xl px-4 sm:px-6`. Bölümler `py-14/16`. Profil ızgarası: mobil 2, masaüstü 4 sütun. Kart oranı 4:5.

## Bileşen kuralları

- Dokunma hedefleri: buton `h-10` (lg `h-12`), select/input `h-10`, mobil alt menü öğeleri `min-h-14`.
- Her etkileşimli öğe hover / focus-visible (2px `--ring` outline) / active / disabled durumlarına sahiptir.
- Gradient yalnızca hero arka planında tek bir yumuşak radyal ışık olarak kullanılır.
- Animasyon: `prefers-reduced-motion` CSS ile sıfırlanır; Framer Motion `reducedMotion="user"`. Kart görsellerinde 1.03 ölçekli hover dışında hareket yoktur.
- Sponsorlu içerik her zaman görünür bir “Sponsorlu” etiketi taşır.
- Doğrulama rozeti (`BadgeCheck`) yalnızca onaylı kimlik doğrulaması varsa gösterilir.
- Skeleton: her `<Suspense>` için içerik boyutunda iskelet (`ProfileGridSkeleton`, `LocationPageSkeleton`, panel iskeleti).
- Boş durum: `EmptyState` (ikon + başlık + açıklama + eylem).

## Mobil

Alt navigasyon (Ana sayfa, Keşfet, Şehirler, Güvenlik), `safe-area-inset` desteği, filtreler alt sayfa (sheet) içinde, yatay kaydırma yok (E2E testli).

## Temalar

`next-themes` (`class` stratejisi), varsayılan sistem. Tema seçici: Açık / Koyu / Sistem.
