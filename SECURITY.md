# Güvenlik

## Ürün düzeyinde kötüye kullanım önlemleri

Amaç: platformun ücretli cinsel hizmet tanıtımı, fuhşa aracılık veya müşteri yönlendirme için kullanılmasını **tasarım gereği** zorlaştırmak.

| Önlem | Uygulama |
| --- | --- |
| Profilleri yalnızca yönetim oluşturur | Ziyaretçi kaydı / profil oluşturma yoktur |
| Kişisel iletişim bilgisi yayınlanmaz | Telefon, e-posta, URL, mesajlaşma uygulaması tespitinde yayın engellenir; profilde iletişim alanı yoktur; ziyaretçiler arası mesajlaşma/iletişim aktarma özelliği **bilinçli olarak yoktur** |
| Yasaklı hizmet taraması | `content-policy.ts`: ücretli hizmet çağrışımı, fiyat, reşit olmayana işaret eden ifadeler → yayını engeller |
| Yayın ön koşulları | 18+ ve yaş doğrulaması, açık yayın rızası, fotoğraf kullanım izni ve hak doğrulaması, moderasyon onayı, içerik politikası, açık kritik şikâyet yokluğu — uygulama **ve** veritabanı tetikleyicisinde |
| Değişiklikte yeniden moderasyon | Yayındaki profilin metni/ilgi alanları değişirse profil yayından kalkar, moderasyona döner; yeni fotoğraflar hak doğrulanana kadar görünmez |
| Otomatik kaldırma | Reşit olmayan şüphesi, ücretli hizmet, izinsiz fotoğraf, kimlik taklidi şikâyetlerinde profil anında yayından kalkar |
| Rıza geri alma | Yayın/fotoğraf rızası geri alınınca profil anında yayından kalkar |
| Sponsorluk şeffaflığı | Sponsorlu profiller her yerde etiketli; sponsorluk yalnızca uygun pakette |
| Tahsilat yok | Ödeme altyapısı devre dışı; gizli/kayıt dışı ödeme işlevi yoktur |

> Anahtar kelime taraması insan moderasyonunun yerini tutmaz; atlatılabilir. Moderatör eğitimi ve düzenli denetim gerekir.

## Teknik kontroller

| Kontrol | Uygulama | Test |
| --- | --- | --- |
| Sunucu tarafı yetkilendirme | Her sayfa `requireAdmin()`, her Server Action `assertAdmin()` (`run()` sarmalayıcı); proxy yalnızca iyimser kontrol | E2E: yetkisiz erişim, sahte çerez |
| Admin MFA | Supabase: TOTP zorunlu, AAL2 olmadan `requireAdmin` reddeder; RLS `is_admin()` AAL2 ister. Demo: TOTP zorunlu | E2E + SQL testi |
| Oturum | Supabase: httpOnly çerezler, proxy'de yenileme. Demo: HMAC-SHA256 imzalı, 8 saat, httpOnly, `SameSite=Strict` | E2E sahte çerez |
| Rate limiting | Giriş: IP başına 10 / e-posta başına 5 deneme / 15 dk (başarıda sıfırlanır). Şikâyet: 5/saat (bellek + DB). KVKK formu 3/saat. Görüntüleme sayacı saatte 1 | E2E kaba kuvvet, unit |
| Girdi doğrulama | Zod şemaları (sunucuda), HTML karakterleri reddedilir, slug regex'leri, URL filtre ayrıştırması | unit |
| XSS | React kaçışı; tek `dangerouslySetInnerHTML` JSON-LD için ve `<` kaçışlı; CSP | unit |
| CSRF | Server Actions Origin/Host eşleşmesi (Next.js), `SameSite` çerezler, `form-action 'self'` | — |
| Güvenlik başlıkları | CSP, HSTS, X-Frame-Options DENY, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, COOP | E2E |
| Güvenli dosya yükleme | Magic-byte kontrolü (JPEG/PNG/WebP), 5 MB, sharp ile yeniden kodlama, **EXIF/GPS silme**, 1600px sınırı, rastgele UUID yolları; belgeler private bucket | unit |
| Denetim kaydı | Tüm yönetim işlemleri; DB'de değiştirilemez; kişisel veri içermez | unit + SQL |
| Veri silme/dışa aktarma | Kalıcı silme (dosyalar dahil), JSON dışa aktarma | unit |
| Gizli bilgiler | Service role yalnızca sunucuda; `.env*` git dışında; production'da zayıf/eksik sırlar başlatmayı durdurur | — |
| Bot | Görünmez honeypot alanları | unit |

## Bilinen sınırlamalar / yapılacaklar

- CSP `'unsafe-inline'` script içerir (PPR statik shell nonce kullanamaz). Hash tabanlı CSP veya nonce + dinamik render değerlendirilmeli.
- Süreç içi rate limit sunucusuz ortamda instance başınadır → Vercel WAF rate limit kuralları ve/veya Upstash ekleyin.
- Supabase yönetim işlemleri service role ile yapılır; RLS derinlemesine savunma olarak tanımlıdır ama service role onu atlar. Yetki kontrolü uygulama katmanındadır (testli).
- Görsellerde yüz/çıplaklık/yaş tahmini gibi otomatik görsel moderasyon yoktur.
- Yönetici rolleri (owner/moderator) için ayrıntılı yetki matrisi henüz yoktur.
- Bağımsız sızma testi yapılmamıştır.
- `npm audit` çıktısı yayın öncesi incelenmelidir.

## Olay müdahalesi

Reşit olmayan kişiye ait içerik şüphesinde: profil otomatik kaldırılır → içerik silinmeden delil olarak korunur → hukuk birimi ve yetkili makamlara (ör. EGM Siber, İhbar Web) bildirim süreci hukuk danışmanıyla tanımlanmalıdır.
