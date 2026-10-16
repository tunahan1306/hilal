# Güvenlik

## Ürün düzeyinde kötüye kullanım önlemleri

Amaç: platformun ücretli cinsel hizmet tanıtımı, fuhşa aracılık veya müşteri yönlendirme için kullanılmasını **tasarım gereği** zorlaştırmak.

| Önlem | Uygulama |
| --- | --- |
| Profilleri yalnızca yönetim oluşturur | Ziyaretçi kaydı / profil oluşturma yoktur |
| İzinli WhatsApp dışında iletişim bilgisi yayınlanmaz | Biyografi/metinlerde telefon, e-posta, URL ve mesajlaşma bilgisi taraması korunur. Ayrı WhatsApp alanı yalnızca profil sahibinin açık yazılı paylaşım izni kaydedildiğinde kamuya açılır; numara/izin değişikliği yeniden moderasyon gerektirir. Ücretli hizmet veya müşteri yönlendirme yasaktır. |
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
| Rate limiting | Giriş: IP başına 10 / e-posta başına 5 deneme / 15 dk (başarıda sıfırlanır). Şikâyet: IP başına 5/saat (bellek + DB) **ve IP'den bağımsız profil başına 10/saat**. KVKK formu 3/saat. Görüntüleme sayacı saatte 1 | E2E kaba kuvvet, unit |
| İstemci IP'si | `resolveClientIp`: `CLIENT_IP_HEADER` → Vercel platform başlıkları → X-Forwarded-For zincirinin son değeri. İstemcinin yazdığı ilk değere güvenilmez | unit |
| Toplu sahte şikâyet koruması | Site genelinde saatte en fazla 10 otomatik yayından kaldırma; aşılırsa yeni kritik şikâyetler kaldırma yapmaz, kuyruğa düşer ve `report.auto_unpublish_suppressed` denetim kaydı oluşur | unit |
| Production sırları | `SESSION_SECRET`, `IP_HASH_SALT`, demo şifresi/TOTP için production'da varsayılan yok; `instrumentation.ts` açılışta doğrular, eksikse tüm istekler reddedilir | unit + elle doğrulandı |
| Girdi doğrulama | Zod şemaları (sunucuda), HTML karakterleri reddedilir, slug regex'leri, URL filtre ayrıştırması | unit |
| XSS | React kaçışı; tek `dangerouslySetInnerHTML` JSON-LD için ve `<` kaçışlı; CSP | unit |
| CSRF | Server Actions Origin/Host eşleşmesi (Next.js), `SameSite` çerezler, `form-action 'self'` | — |
| Güvenlik başlıkları | CSP, HSTS, X-Frame-Options DENY, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, COOP | E2E |
| Güvenli dosya yükleme | İstemci tarafında boyut kontrolü; magic-byte kontrolü (JPEG/PNG/WebP), görsel ve belgelerde 5 MB (Server Action gövde sınırı 6 MB), sharp ile yeniden kodlama, **EXIF/GPS silme**, 1600px sınırı, rastgele UUID yolları; belgeler private bucket | unit |
| Denetim kaydı | Tüm yönetim işlemleri; DB'de değiştirilemez; kişisel veri içermez | unit + SQL |
| Veri silme/dışa aktarma | Kalıcı silme (dosyalar dahil), JSON dışa aktarma | unit |
| Gizli bilgiler | Service role yalnızca sunucuda; `.env*` git dışında; production'da zayıf/eksik sırlar başlatmayı durdurur | — |
| Bot | Görünmez honeypot alanları | unit |

## Bilinen sınırlamalar / yapılacaklar

- CSP `'unsafe-inline'` script içerir (PPR statik shell nonce kullanamaz). Hash tabanlı CSP veya nonce + dinamik render değerlendirilmeli.
- Süreç içi rate limit sunucusuz ortamda instance başınadır → Vercel WAF rate limit kuralları ve/veya Upstash ekleyin.
- Uygulama ters vekil olmadan doğrudan internete açılırsa X-Forwarded-For istemci tarafından yazılabilir; IP tabanlı sınırlar atlatılabilir (profil başına tavan ve devre kesici yine geçerlidir).
- Tek bir anonim kritik şikâyet bir profili yayından kaldırır (güvenlik öncelikli ürün kararı). Devre kesici toplu saldırıyı sınırlar ama tekil kötü niyetli bildirimleri engellemez; moderatörün geri yayına alması gerekir.
- Demo oturumu durumsuzdur (imzalı çerez): çıkış çerezi siler ancak çalınmış bir çerez 8 saat geçerlidir. Production'da Supabase Auth kullanılır.
- Supabase yönetim işlemleri service role ile yapılır; RLS derinlemesine savunma olarak tanımlıdır ama service role onu atlar. Yetki kontrolü uygulama katmanındadır (testli).
- Görsellerde yüz/çıplaklık/yaş tahmini gibi otomatik görsel moderasyon yoktur.
- Yönetici rolleri (owner/moderator) için ayrıntılı yetki matrisi henüz yoktur.
- Bağımsız sızma testi yapılmamıştır.
- `npm audit` çıktısı yayın öncesi incelenmelidir.

## Olay müdahalesi

Reşit olmayan kişiye ait içerik şüphesinde: profil otomatik kaldırılır → içerik silinmeden delil olarak korunur → hukuk birimi ve yetkili makamlara (ör. EGM Siber, İhbar Web) bildirim süreci hukuk danışmanıyla tanımlanmalıdır.

## Ziyaretçi yaş beyanı

`src/proxy.ts`, onay yoksa kamu profil sayfalarını yaş onayı sayfasına yeniden yazar; profil HTML/RSC verisi üretilmez. Yerel demo/medya ve görsel optimizasyon istekleri 403 döner. `/api/discovery` ayrıca kendi çerez kontrolünü uygular. Same-origin POST onayı `hilal_adult` HttpOnly, SameSite=Lax, HTTPS'te Secure, 30 günlük çerezini yazar. Ret çerezi siler ve içeriksiz sayfa gösterir. Bu kontrol kişinin yaşının doğrulandığı anlamına gelmez; yayın ön koşulları ve AAL2 yönetim kontrolleri ayrıdır.

Mevcut Supabase public bucket adresleri depolama kaynağında hâlâ herkese açıktır. Uygulama yaş kapısı, daha önce bilinen bu adresler için kaynak düzeyinde erişim kontrolü değildir. Bunun değiştirilmesi ayrı bir özel medya teslim mimarisi gerektirir.

Görseller, çerezi taşıyan tarayıcı isteğini denetleyen `/api/image` üzerinden responsive WebP olarak sunulur. Kaynaklar yapılandırılmış Supabase public-storage origin'i ve yerel demo/kamu medyasıyla sınırlıdır; yönlendirmeler izlenmez, gövde boyutu ve çözünürlük sınırlıdır. Kaldırılmış medyanın dönüştürülmüş kopyası sunulmadan önce kaynağın hâlâ mevcut olduğu kontrol edilir. Özel yönetim önizlemeleri bu uç noktadan geçmez ve AAL2 oturumu gerektirir.

## İzinli WhatsApp iletişimi

Yönetim telefon numarasını ve açık yazılı paylaşım iznini kaydeder. Numara değiştiğinde arayüz eski izin seçimini sıfırlar. Sunucu Türkiye cep numarasını normalize/doğrular; kamu projeksiyonu ve SQL view izin tarihi yoksa numarayı döndürmez. İzin geri alındığında profil yeniden moderasyona alınır ve kamu önbelleği mevcut action akışıyla geçersizleşir. Link sabit `https://wa.me/` origin’iyle üretilir; keyfi URL kabul edilmez. Eski profiller varsayılan olarak numarasız/izinsizdir. Migration dosyası hazırlanmıştır; canlı veritabanında çalıştırılmamıştır.
