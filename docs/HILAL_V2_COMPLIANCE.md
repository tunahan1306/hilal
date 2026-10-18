# Hilal v2: ülke yayın kapısı, çok dilli moderasyon ve yayın güvenliği

Dal: `feature/hilal-global-v2` (taban: `feature/hilal-global`, PR #2).
Kapsam kararı: Hilal yetişkinlere yönelik bir **sosyal keşif** sitesi olarak kalır. Bu dal ilan veya hizmet
kategorisi, reklamveren hesabı, ödeme ya da VIP ilan modeli **eklemez**. Hukuki onay üretmez ve bir onay varmış
gibi göstermez.

## 1. Değişenler

| Alan | Değişiklik |
|---|---|
| Ülke yayın kapısı | `countries.publication_status` alanı eklendi (`not_reviewed` / `permitted` / `prohibited`, varsayılan `not_reviewed`). Karar kaydı `country_publication_decisions` tablosunda tutulur; kayıtlara yalnızca ekleme yapılabilir. Kapı veritabanında, sunucuda, sitemap'te, metadata'da ve arayüzde uygulanır. |
| Kamuya açıklık | Görünümler artık her sorguda yaş doğrulaması, yayın rızası, fotoğraf rızası ve ülke kararını kontrol eder. Bunlardan biri geri çekilirse profil anında kamuya kapanır; ayrıca bir arka plan işi gerekmez. |
| C-01 yayın kısıtı | Kurgusal kayıtlar her yerde görünür biçimde "Kurgusal örnek" olarak etiketlenir ve hiçbir iletişim numarası taşımaz. Bir numara yalnızca tek bir yayındaki profilde gösterilebilir. Kurgusal kayıtlar da ülke kapısına tabidir. |
| Moderasyon | TR/EN/NL/DE kuralları eklendi; Unicode, homoglif, l33t ve harf aralığı gizlemeleri çözülür. Reşit olmayan kişi ve istismar göstergeleri insan incelemesine yükseltilir. Tek başına yasal olabilen sözcükler yalnızca incelemeye düşer. |
| SEO | Hukuki sayfalar hreflang yayınlamaz; canonical tüm dillerde Türkçe asıl sayfadır. Kapalı ülkelerin sayfaları `noindex` işaretlenir ve sitemap'e girmez. |
| Performans | Görünür ilk görseller `loading="eager"` ve `fetchPriority="high"` ile yüklenir; Next 16'da `priority` kullanımdan kalktığı için değiştirildi. Ölçümler §7'de. |
| Yönetim | Yeni sayfa: `/admin/ulkeler`. Durum, karar geçmişi ve karar formu burada; formu yalnızca sahip rolü kullanabilir ve onay için ülke kodunun yeniden yazılması gerekir. Yayın kontrol listesine iki madde eklendi: "ülke yayına açık" ve "numara başka yayındaki profilde yok". |

## 2. Ülke kapısının uygulandığı katmanlar

| Katman | Nerede | Davranış |
|---|---|---|
| Veritabanı: kamu okuması | `profiles_public`, `profile_media_public`, `profile_interests_public`, `discovery_profiles` | `country_publishable(country_code)` sağlanmıyorsa satır döndürülmez. Bu kural kurgusal kayıtlar için de geçerlidir. |
| Veritabanı: yazma | `enforce_publish_preconditions` tetikleyicisi (`status`, `city_id` ve `whatsapp_phone` değişikliklerinde çalışır) | Kapalı ülkede yayın, yayındaki profilin kapalı ülkeye taşınması ve aynı numaranın ikinci bir yayında kullanılması reddedilir. |
| Veritabanı: karar | RLS, kısıtlar ve tetikleyiciler | Karar yalnızca MFA'lı sahip tarafından ve kendi adına eklenebilir. `permitted` kararı belge referansı ve gözden geçirme tarihi ister. Kararlar değiştirilemez ve silinemez; `countries` satırı doğrudan güncellenemez. Her karar `audit_logs` tablosuna yazılır. |
| Servis | `publishProfile` (kontrol listesi: `country_permitted`, `contact_unique`), `updateProfile`, `recordCountryDecision` | Veritabanı kurallarının aynısı, anlaşılır hata mesajlarıyla. Servis anahtarı RLS'i atladığı için sahip kontrolü burada zorunludur. |
| Kamu sayfaları | Ana sayfa, keşif filtresi, konum ve ülke sayfaları | Ülke sekmeleri ve filtre seçenekleri yalnızca açık ülkeleri gösterir. Kapalı ülkede profil listesi yerine bilgi notu çıkar. Politika her istekte okunur; önbelleğe alınmaz. |
| SEO | `locationMetadata`, ülke sayfası metadata'sı, `sitemap.ts` | Kapalı ülke `noindex` alır ve sitemap'te listelenmez. Sitemap önbelleği dakika ölçeğindedir ve karar kaydedilince geçersiz kılınır. |
| Keşif API'si, öne çıkanlar, sponsorlu alan, profil sayfası, WhatsApp bağlantısı | Hepsi görünümlerden okur | Kapalı ülkedeki profil hiçbir yolda görünmez. Numara yalnızca tek kullanımlıysa ve kayıt kurgusal değilse gösterilir. |
| Bellek (demo) deposu | `isPubliclyVisible` (`src/domain/projection.ts`) | Veritabanı görünümüyle birebir aynı kural uygulanır. Demo'da yalnızca TR açıktır ve bunu açan karar "DEMO — gerçek bir hukuki onay değildir" olarak etiketlidir. |

## 3. Operatör: migration ve Türkiye kararı (ZORUNLU, aynı bakım penceresinde)

`20261025000001_country_publication_gate.sql` uygulandığı anda **hiçbir ülke yayına açık değildir** ve
Türkiye'deki yayındaki profiller kamuya kapanır. Bu bilinçli bir tercih: migration hukuki onay uydurmaz.

1. Önce runbook §1'deki doğrulanmış yedek alınır (`docs/DEPLOY_RUNBOOK_2026-10-18.md`).
2. SQL Editor'da migration'lar şu sırayla uygulanır: `20261023000001` → `…02` → `…03` → `20261024000001` → `20261025000001`.
3. Türkiye için karar kaydedilir. Bunun yalnızca sorumlu kişi gerçekten bir değerlendirme yapmışsa yapılması gerekir. Değerler gerçek bilgilerle doldurulur; aşağıdaki yer tutucular örnek değildir:

   ```sql
   insert into public.country_publication_decisions
     (country_code, status, approver_name, evidence_ref, review_due, restrictions, note, decided_by)
   values ('tr', 'permitted', '<SORUMLU KİŞİ AD SOYAD / UNVAN>', '<HUKUKİ GÖRÜŞ DOSYA NO / TARİH>',
           '<YYYY-AA-GG gözden geçirme>', null, '<not>',
           (select id from public.admins where email = '<SAHİP YÖNETİCİ E-POSTASI>' and role = 'owner'));
   select code, publication_status, review_due from public.countries order by code;
   ```

   Değerlendirme yoksa Türkiye kapalı kalır ve site profil göstermez. Bu durum migration'ın hatası değil, beklenen sonuçtur.
4. NL ve DE için hukuki değerlendirme tamamlanana kadar karar **kaydedilmez**.
5. Doğrulama: `select count(*) from public.profiles_public;` sorgusu, karar öncesinde 0, karar sonrasında beklenen sayıyı vermelidir.

Prova: `scripts/runbook/rehearse-v2-migrations-local.sh` (yalnızca `127.0.0.1:54322`). Bu betik `main`
düzeyinden başlar, yayında bir sentetik profil oluşturur ve beş migration'ı sırayla uygular. Ardından TR kararını,
geri almayı ve yeniden uygulamayı dener. Sonuç §8'de.

## 4. Çok dilli moderasyon (`src/domain/content-policy.ts`)

- **Normalizasyon:** NFKC, görünmez karakterlerin silinmesi (sıfır genişlikli karakter, yumuşak tire, yön işaretleri), Kiril/Yunan homogliflerinin Latin karşılığına çevrilmesi, Türkçe karakterler, `ß→ss`, `ø`/`æ`/`œ` gibi harfler ve aksanların kaldırılması.
- **Gizleme çözme:** l33t (`3sc0rt`) ve harf aralıklı yazım (`e s c o r t`, `e.s.c.o.r.t`) çözülür. Bu yalnızca harf kurallarında yapılır; telefon ve fiyat kuralları rakamları korur.
- **Kurallar:**
  - Ücretli cinsel hizmet çağrışımı (dile göre).
  - Fiyat: tutar ve para birimi, "uurtarief", "Stundensatz", "per hour" gibi ifadeler.
  - Telefon: TR, NL (`06…`, `+31 6…`), DE (`015x–017x`, `+49 1…`) ve genel uluslararası biçim.
  - Mesajlaşma uygulamaları, e-posta ve bağlantılar.
  - Reşit olmayan kişiye işaret, istismar göstergeleri.
  - Yalnızca incelemeye düşenler: birden çok kişi sunumu, müstehcenlik, spam.
- **Seviyeler:**
  - `block` yayını ve moderasyon onayını engeller.
  - `review` yalnızca moderatöre gösterilir.
  - `escalate` (reşit olmayan, istismar) denetim kaydına `escalated: true` olarak yazılır.
- **Yanlış pozitif koruması:** "masaj", "minor details", "16 yıllık deneyim" gibi ifadeler engellenmez. Testler: `tests/unit/content-policy.test.ts` (35 yasaklı ve 10 izinli örnek, dört dilde).
- **Sınır:** Anahtar kelime ve kalıp eşleştirmesi insan moderasyonunun yerini tutmaz. Görsel içerik analizi yoktur.

## 5. C-01 (kurgusal profiller): uygulanan kısıt ve operatör planı

**Bu dalda uygulananlar:**

- Kurgusal kayıtlar kartta ve profil sayfasında "Kurgusal örnek" etiketiyle gösterilir. Profil sayfasında ayrıca "gerçek bir kişiyi temsil etmez, doğrulanmamıştır, iletişim bilgisi içermez" notu yer alır.
- Kurgusal kayıt için iletişim numarası kamuya hiçbir yoldan verilmez. Bu üç katmanda sağlanır: görünüm, repository eşlemesi ve kart/profil bileşeni.
- Bir WhatsApp numarası kurgusal bir kayıtta da kullanılıyorsa, aynı numaralı gerçek profilde de gösterilmez.
- Kurgusal kayıtlar ülke kapısına tabidir.
- Production verisine dokunulmadı. Kayıtlar silinmedi; `example_profiles.whatsapp_phone` alanı tabloda durur, yalnızca kamuya verilmez.

**Operatörün production'da yalnızca okuma amaçlı çalıştıracağı sorgular:**

```sql
-- Görünür kurgusal kayıt sayısı ve paylaşılan numaralar (numara değeri yazdırılmaz)
select count(*) filter (where visible) as gorunur, count(distinct whatsapp_phone) as farkli_numara,
       count(*) filter (where whatsapp_phone is not null) as numarali
from public.example_profiles;
-- Aynı numarayı kullanan yayındaki gerçek profil sayısı
select count(*) from public.profiles p
where p.status = 'published' and p.whatsapp_phone in (select whatsapp_phone from public.example_profiles);
```

**Karar bekleyenler:**

1. Kurgusal kayıtlar yayında kalacak mı? Kalmayacaksa gizleme yöntemi: `update public.example_profiles set visible = false;`. Bu geri alınabilir bir işlemdir ve operatör kararıyla yapılır.
2. Numaraların tablodan da silinip silinmeyeceği (geri alınamaz).
3. Görsellerin kaynağı ve kullanım hakkı.

## 6. Hukuki sayfalar ve SEO

- `legalPageMeta`: tüm dillerde canonical `/tr/kvkk` ve `/tr/kullanim-kosullari` adresleridir; hreflang yayınlanmaz. Türkçe dışındaki kopyalar `noindex, follow` alır. Sitemap'te bu sayfalar yalnızca `tr` olarak, dil alternatifi olmadan listelenir.
- Hukuki metinler çevrilmedi. NL/DE/EN sürümleri ve GDPR bilgilendirmesi hukuki onay gerektirir.

## 7. Performans (mobil, Lighthouse 12.8.2, demo derlemesi, 3 çalıştırmanın medyanı)

| Sayfa | Önce: simülasyon LCP | Sonra: simülasyon LCP | Sonra: uygulanan kısıtlama LCP | CLS | TBT |
|---|---|---|---|---|---|
| `/tr` | 3788 ms | 3785 ms | **2075 ms** | 0,000 | 42–62 ms |
| `/en/explore` | 3784 ms | 3859 ms | **2029 ms** | 0,000 | 30–59 ms |
| `/de/profil/…` | 3738 ms | 3716 ms | **1803 ms** | 0,000 | 23–46 ms |
| `/nl/ontdekken` | 3805 ms | 3792 ms | **1758 ms** | 0,000 | 32–47 ms |

Ölçüm notları:

- **İki ölçüm yöntemi:**
  - "Simülasyon", Lighthouse'un varsayılan Lantern modelidir.
  - "Uygulanan kısıtlama" ise `--throttling-method=devtools` ile ölçülür: 4× CPU, yaklaşık 1,6 Mbit/s, 150 ms RTT.
  - Gerçek Chrome'da aynı kısıtlamayla PerformanceObserver ölçümü 1016 ms LCP verdi.
- **Kök neden:**
  - LCP öğesi ilk profil görseli (3 KB). Görselin kendisi hızlı yükleniyor; gecikme render aşamasında.
  - Profil listesi istek anında okunur (kaldırma ve moderasyon kararları anında yansısın diye) ve Suspense akışıyla gelir.
  - Lantern modeli belgenin akışla gelen kısmını ve yaklaşık 265 KB'lık JS'i kritik yola koyuyor.
- **Denenen ve geri alınan:** Başlık fontunun önyüklemesini kaldırmak (`preload: false`) LCP'yi bazı sayfalarda biraz düşürdü ama FCP'yi 0,9 s'den 1,4–1,8 s'ye çıkardı. Bu yüzden geri alındı.
- **Sonuç:** Uygulanan kısıtlamayla hedef (LCP < 2,5 s, CLS < 0,1) karşılanıyor; simülasyon modelinde karşılanmıyor.
  - Simülasyonda da hedefe inmek mimari bir değişiklik gerektirir: listeyi statik ve önbellekli hale getirip kaldırma işlemlerinde etiketle geçersiz kılmak. Bu, kaldırma kararının anında yansıması ilkesiyle dengelenmesi gereken bir karar ve bu dalda yapılmadı.
  - INP laboratuvarda ölçülemez; TBT 23–62 ms ile düşük.
- **Ham veriler:** Oturum dizinindeki `lcp/before.txt`, `step1.txt` ve `devtools.txt` dosyaları. Ölçüm betiği PR açıklamasında.

## 8. Migration ve geri alma

| Migration | Geri alma |
|---|---|
| `20261025000001_country_publication_gate.sql` | `docs/rollback/20261025000001_country_publication_gate.rollback.sql`: görünümler, tetikleyici ve ülke yetkileri migration öncesi tanımlarına döner. Karar geçmişi önce dışa aktarılmalıdır; betikte komutu var. |
| `20261024000001_multi_country_locations.sql` | `docs/rollback/20261024000001_multi_country_locations.rollback.sql` (PR #2) |

**Önemli:** 20261024 geri alınacaksa önce 20261025 geri alınmalıdır, çünkü `countries` tablosuna bağımlıdır.

İzole yerel Supabase (PostgreSQL 17) provası:

| Adım | Sonuç |
|---|---|
| Başlangıç | `main` düzeyi: 7 migration; 1 yayında ve kamuya açık sentetik profil |
| 20261023000001–03, 20261024000001 | Her biri exit 0; doğrulamalar geçti; profil kamuya açık kaldı |
| 20261025000001 | Exit 0. Tüm ülkeler `not_reviewed`; profil kamuya kapalı (0), durumu `published` |
| TR kararı (prova) | Profil yeniden görünür (1). Kanıtsız izin `permitted_requires_evidence` ile, NL'ye taşıma tetikleyiciyle reddedildi |
| Tekrar çalıştırma | 20261025 hata verip işlemi geri aldı (değişiklik yok) |
| Geri alma | Exit 0. Karar tablosu ve sütunlar kaldırıldı; profil kararsız da görünür; `admin all countries` politikası geri geldi |
| Yeniden uygulama | Exit 0; profil kararsız kapalı (0) |

## 9. Preview ve production ayrımı (BLOCKED: hesap erişimi ve onay gerekir)

**Bulgu:** Vercel `hilal` projesinde 8 değişkenin tamamı "Production, Preview" hedefli. Buna
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `IP_HASH_SALT` ve `CRON_SECRET` dahil.
PR #1 ve PR #2 için otomatik oluşturulan preview'lar production veritabanına servis anahtarıyla bağlı.
Bu dal da push edildiğinde aynı yapılandırmayla bir preview oluşacak.

**Operatörün yapacakları** (sırların değerleri sohbete veya loglara yazılmaz):

1. Ayrı bir Supabase projesi oluşturun (ör. `hilal-preview`): ayrı veritabanı, ayrı depolama, ayrı anahtarlar. Migration'ları bu projeye uygulayın. Bu projede ülke kararı yalnızca "PREVIEW — gerçek onay değildir" notuyla kaydedilmelidir.
2. Vercel'de **production değerlerine dokunmadan**, her değişken için Preview hedefini ayırın:
   - Mevcut kaydı düzenleyip yalnızca "Production" hedefinde bırakın.
   - "Preview" hedefi için yeni bir kayıt ekleyin: preview Supabase URL'si, anon ve servis anahtarı, yeni `IP_HASH_SALT`, yeni `CRON_SECRET`, preview `NEXT_PUBLIC_SITE_URL`.
3. Karşılaştırma: işlemden önce ve sonra `vercel env ls` çıktısında yalnızca adları ve hedefleri karşılaştırın.
4. **Anahtar rotasyonu önerilir:** Production servis anahtarı preview dağıtımlarına girdiği için Supabase'de yeni bir secret key oluşturun. Production değişkenini güncelleyip doğruladıktan sonra eski anahtarı iptal edin. Bu bir production değişikliğidir ve ayrı onay gerektirir.
5. **Eski preview'lar:** Dağıtımlar oluşturuldukları andaki değişkenleri taşır. Ayrımdan önce oluşan bütün preview dağıtımları silinmeli ya da korumaya alınmalıdır (`vercel ls hilal` ile listelenip `vercel rm <deployment-url>` ile silinir). Bunlara PR #1 ve #2 preview'ları ve önceki iki eski preview dahildir.
6. **Doğrulama:** Yeni bir preview'ın preview veritabanına bağlandığını preview'daki veriyle kontrol edin (ör. preview'da sentetik bir profil görünmesi). Ardından preview ortamında e2e çalıştırın.

## 10. Pazar bazında hukuki hazırlık (hukuki inceleme gerekir; hiçbir pazar onaylı değildir)

| Konu | Türkiye | Hollanda | Almanya |
|---|---|---|---|
| Yayın kararı | Kayıtlı karar yok | Kayıtlı karar yok | Kayıtlı karar yok |
| Platformun niteliği ve aracılık riski | Değerlendirilmedi | Değerlendirilmedi | Değerlendirilmedi |
| Yaş doğrulama düzeyi | Beyan + belge (yönetici) | AB/NL beklentisi değerlendirilmedi | JMStV/KJM gereklilikleri değerlendirilmedi |
| Veri koruma | KVKK metni taslak (Türkçe) | GDPR bilgilendirmesi yok; AB temsilcisi gereksinimi değerlendirilmedi | GDPR bilgilendirmesi yok |
| DSA (bildirim ve itiraz, şeffaflık) | Uygulanmaz / değerlendirilmedi | Değerlendirilmedi | Değerlendirilmedi |
| Tüketici, reklam ve sponsorlu içerik etiketi | "Sponsorlu" etiketi var; uygunluğu değerlendirilmedi | Değerlendirilmedi | Değerlendirilmedi |
| Ödeme sağlayıcısı, vergi, fatura | Ödeme kapalı | Ödeme kapalı | Ödeme kapalı |
| Şikâyet ve kaldırma süreci | Var (TR). Delil saklama süresi değerlendirilmedi | Yerel dil süreci yok | Yerel dil süreci yok |
| Saklama ve silme | Doğrulama belgesi saklama süresi yapılandırılabilir | Değerlendirilmedi | Değerlendirilmedi |

## 11. Bilinen sınırlar

- Reklamveren hesabı, ilan yaşam döngüsü, ödeme ve itiraz takibi bu dalda yok (kapsam kararı).
- Doğrulamanın süresi dolmuyor: yaş ve kimlik doğrulaması bir bitiş tarihi taşımaz. Doğrulama iptal edilirse profil kamuya kapanır.
- WhatsApp numarası doğrulaması yalnızca Türkiye cep telefonu biçimini kabul ediyor; NL/DE numaraları desteklenmiyor. Numaranın gerçekten o kişiye ait olduğu doğrulanmıyor; yönetici beyanına dayanıyor.
- Paket adları, profil biyografileri ve yönetim panelinde girilen SEO metinleri Türkçe kalıyor.
- Görsel içerik moderasyonu otomatik değil.
