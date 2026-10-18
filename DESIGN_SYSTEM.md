# Tasarım sistemi

Premium gece editoryali; fotoğraf öncelikli kartlar, Fraunces başlıklar, Geist arayüz metni. Varsayılan koyu tema; açık ve sistem seçenekleri korunur.

## OKLCH tokenlar

`src/app/globals.css` renkleri OKLCH üzerinden tanımlar. Ana palet: gece eriği `#190D1B`, bordo `#512039`, ahududu `#9E315F`, gül `#E66A9B`, şampanya `#D9A76B`, fildişi `#FFF1F5`. Açık temada metin vurgusu koyu ahududu, koyu temada gül; altın açık temada okunabilirlik için koyulaştırılır. Nötr yüzeyler aynı ton ailesindedir.

## Bileşenler

- Profil kartı: 4:5 optimize fotoğraf; ad, yaş, il/ilçe, gerçek kimlik doğrulama rozeti ve sponsor etiketi. Hobi, biyografi ve tekrarlanan metadata kartta yer almaz.
- Izgara: mobil 2, tablet 3, masaüstü 4 sütun; yükleme iskeletleri aynı oranları korur.
- Listeleme: sunucuda ilk 12 sonuç, sonraki sonuçlarda cursor ve “Daha fazla göster”; hata halinde tekrar deneme.
- Yaş kapısı: sunucuda içerik öncesi tam ekran; klavye odağı, diyalog etiketi, iki açık karar. Self-declaration belgesel doğrulama yerine geçmez.
- Kontroller: 6px köşe, görünür odak halkası, 44–48px ana dokunma alanları. Reduced motion CSS kuralı korunur.
- Galeri: mobil medya şeridi, masaüstü kapak ve mozaik, tam ekran medya görünümü. Şikâyet ve rıza kaldırma bağlantıları korunur.

## Token ve kurallar (2026-10-18 güncellemesi)

Tüm değerler `src/app/globals.css` içindeki tokenlardan gelir; sayfa bazlı renk/ölçü yazılmaz.

| Alan | Kural |
|---|---|
| Boşluk | Tailwind 4px ölçeği, 8px ritim: bileşen içi `gap-1.5/2/3`, bölüm içi `gap-5/6`, bölümler arası `py-8`–`py-12`. Sayfa kabı `container-page` (16 → 24 → 48px yan boşluk, en fazla 1376px). |
| Tipografi | Başlıklar `font-display` (Fraunces, yalnızca normal stil + `opsz` ekseni; italik sentezlenir), arayüz Geist. Ölçek: `text-display-xl/lg/md/sm`, `text-lede`, `text-prose`, `eyebrow` (11px, büyük harf). Gövde metni en az 14px; yardımcı etiketler en az 11px. |
| Köşe | Görseller 2px (`rounded-xs`), kontroller 6–8px, kartlar/paneller `rounded-lg`, çipler `rounded-full`. |
| Odak | Tüm etkileşimli öğeler görünür odak alır: global `:focus-visible` 2px `--ring`; düğmeler `ring-3 ring-ring/80`. |
| Dokunma | Birincil hedefler ≥44px (`min-h-11`), liste bağlantıları mobilde ≥40px. |
| Güvenli alan | Sabit alt öğeler `env(safe-area-inset-bottom)` ile en az 1rem boşluk bırakır (`pb-[max(env(safe-area-inset-bottom),1rem)]`); footer mobil alt menü yüksekliği + güvenli alan kadar boşluk bırakır. |
| Hareket | `--ease-out-soft`; `prefers-reduced-motion` tüm animasyonları kapatır. |

### Ortak bileşenler

- **Seçim çipleri** (yaka sekmeleri, iletişim kategorileri, admin `FilterChips`): `min-h-11` (admin `min-h-9`), etkin durum `aria-current`/`peer-checked` ile; bağlantı tabanlı filtreler URL'de saklanır.
- **Formlar**: alan etiketi + girdi + hata metni; hata `aria-invalid` ve `aria-describedby` ile bağlanır, gönderimde ilk hatalı alana odaklanılır. Ziyaretçi formları istemci ön kontrolü + sunucu (zod) doğrulaması kullanır; admin formları `ActionForm` ile kaydedilmemiş değişiklik koruması alır.
- **Yıkıcı işlemler**: `ActionButton` onay penceresi; gerekçe zorunluysa `minLength` ile onay düğmesi pasif kalır, sunucu da aynı kuralı uygular.
- **Galeri**: lightbox kütüphanesi ilk açılışta yüklenir; doğal genişliği aşan kaynak istenmez; tek öğede gezinme okları yoktur; posteri olmayan video nötr yer tutucuyla gösterilir.
- **Header**: logo, ana menü (Keşfet, Şehirler, Topluluk, İletişim), 18+ işareti, tema. Mobilde gezinme alt menüdedir; header'da yinelenen bağlantı yoktur.
