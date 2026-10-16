# Yeniden tasarım öncesi denetim (Faz 0)

Tarih: 2026-10-16 · Dal: `redesign/premium-editorial` · Taban: `48fed78` (main ile aynı)

Bu belge mevcut kodun, tasarımın ve kısıtların yeniden tasarımdan önceki durumunu kaydeder. Bulgular kod okuması, önceki denetimin otomatik taramaları (axe, taşma, dokunma hedefi, paket analizi) ve ekran görüntüleri üzerinden çıkarılmıştır.

## 1. Mimari — korunacaklar

| Katman | Durum | Karar |
| --- | --- | --- |
| `src/domain/*` (yayın kuralları, içerik politikası, filtreler, SEO kuralları, projeksiyon) | Saf, birim testli (75 test) | Korunur; yalnızca medya ve zengin metin için genişletilir |
| `src/server/repositories` (Supabase + bellek içi) | Arayüz tabanlı, entegrasyon testli | Korunur; medya için arayüz genişletilir |
| `src/server/services` | Denetim kaydı + yetki kontrollü iş akışları | Korunur |
| Supabase şeması, RLS, yayın tetikleyicisi, değiştirilemez denetim kaydı | SQL testli | Korunur; yeni migration'larla genişletilir, mevcut kısıtlar **kaldırılmaz** |
| Güvenlik (production sır zorunluluğu, MFA, oran sınırları, devre kesici, CSP) | Testli | Korunur |
| Programatik SEO (81 il/973 ilçe, noindex kuralları, sitemap) | Testli | Korunur |

## 2. Görsel denetim — sorunlar

1. **Jenerik görünüm:** Arayüz shadcn varsayılan diline çok yakın — her şey yuvarlak köşeli, gölgeli kart; tek font (Geist); tek vurgu rengi (petrol yeşili). Markaya özgü bir kimlik yok.
2. **Hiyerarşi zayıf:** Ana sayfa bölümleri aynı ağırlıkta; başlık tipografisi gövdeyle aynı aileden, editoryal karakter yok.
3. **Kart tasarımı kalabalık:** Kartta görsel + ad + yaş + konum + biyografi + 3 etiket + rozet; mobilde 2 sütunda sıkışık. Sponsorlu etiketi fazla sık görünüyor (demo verisinde ilk 4 kartın hepsi).
4. **Görseller:** Demo görselleri düz renkli siluetler — profil keşfi deneyimini temsil etmiyor, "premium" hissi vermiyor. Görsel oranı tek (4:5), sunum varyasyonu yok.
5. **Profil detayı:** Galeri küçük, biyografi tek paragraf (600 karakter), içerik bilgi kutularıyla (iletişim/güvenlik) bölünüyor; editoryal okuma deneyimi yok.
6. **Filtreler:** Masaüstünde sayfanın üstünde yatay form satırı; keşfet akışını görsel olarak bölüyor.
7. **Admin:** İşlevsel ama dekoratif kartlarla dolu; tablo yoğunluğu düşük, klavye kısayolu, çekmece (drawer), medya kütüphanesi yok.
8. **18+ deneyimi:** Sitede tutarlı bir 18+ işareti yok; yalnızca metinlerde geçiyor.
9. **Boş/yükleniyor durumları** var ama tasarım dili jenerik.

## 3. Medya ve içerik — sınırlamalar

| Alan | Mevcut | Eksik |
| --- | --- | --- |
| Biyografi | Düz metin, 20–600 karakter | Uzun metin, başlık/liste/alıntı, önizleme, otomatik kaydetme |
| Fotoğraf | Tek tek yükleme, paket başına 3/6/10 sınır, EXIF silme, WebP | Çoklu/sürükle-bırak yükleme, kapak seçimi, varyant boyutları, tekrar tespiti, lightbox, mobil kaydırma |
| Video | **Yok** | Tüm video akışı |
| Yükleme | Server Action gövdesi (6 MB sınır) | İmzalı doğrudan yükleme, ilerleme, işleme durumu |
| Depolama | Yayın onayı öncesi de public bucket'a yazılıyor (rastgele yol ile) | Onaysız medya için **private** depolama; onayda yayın |
| Sahiplik | Profil düzeyinde "fotoğraf kullanım izni" + görsel bazında hak onayı | Video için aynı kayıtlar, medya bazında kaynak/sahiplik beyanı |
| Kota | Paket bazlı adet sınırı | Bayt bazlı yapılandırılabilir kota |

Araç kısıtı: yerel ortamda ve Vercel fonksiyonlarında ffmpeg yok. Sunucuda video dönüştürme bu MVP'de yapılmaz; konteyner doğrulaması + boyut/süre sınırı + poster görseli uygulanır, yönetilen video servisi ayrıca değerlendirilir.

## 4. Güvenlik ve uyum kısıtları (değişmeyecek)

- Profillerde kişisel iletişim bilgisi yasağı ve içerik taraması (telefon, e-posta, URL, mesajlaşma uygulamaları) — zengin metindeki bağlantılar da bu taramadan geçmelidir.
- Yayın ön koşulları (yaş doğrulaması, yayın rızası, fotoğraf hakları, moderasyon) uygulama ve veritabanında.
- İçerik değişince yeniden moderasyon; yeni medya hak doğrulanana kadar görünmez.
- Kritik şikâyette otomatik yayından kaldırma + devre kesici.
- Harici iletişim (ör. WhatsApp) özelliği: ayrı hukuki/güvenlik değerlendirmesi gerektirir (bkz. `CONTACT_FEATURE_REVIEW.md`).

## 5. Test boşlukları

- Görsel regresyon testi yok.
- Medya yükleme akışı yalnızca tek görsel için test edilmiş.
- 320 / 430 / 768 / 1024 / 1440 / 1920 genişliklerinde otomatik taşma testi yok (yalnızca 360/390).
- Lighthouse ölçümü yapılmadı.

## 6. Teknik borç

- Yönetim işlemleri tüm rota önbelleğini temizliyor (~0,8 s soğuk açılış).
- Demo modu bellek içi; yüklenen dosyalar süreç yeniden başlayınca kaybolur.
- `framer-motion` bağımlılığı kullanılmıyor.
- Kaldırılmış profil sayfası nadiren "soft 404".

## 7. Yeniden tasarım planı

| Faz | Kapsam |
| --- | --- |
| 1 | Marka yönü, tokenlar (renk/tipografi/aralık/ızgara), temsilî ana sayfa + kart + detay + mobil keşfet + admin panosu |
| 2 | Tüm kamu rotalarına ve admin'e yayma; 18+ sistemi |
| 3 | Zengin biyografi (güvenli JSON şeması, HTML yok), medya modeli (görsel + video), çoklu yükleme, lightbox |
| 4 | Admin medya kütüphanesi, moderasyon kuyruğu, iletişim özelliği değerlendirmesi |
| 5 | SEO/performans (medya teslimi, Lighthouse) |
| 6 | Tüm testler + görsel regresyon + çoklu genişlik QA |
