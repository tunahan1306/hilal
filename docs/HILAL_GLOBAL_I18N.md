# Hilal Global: çok dilli ve çok ülkeli yapı

Dal: `feature/hilal-global` (taban: `feat/site-audit-contact`). Bu belge mimariyi, URL tablosunu,
yeni dil ekleme adımlarını, tehdit modelini ve migration geri alma planını anlatır.

## 1. Kapsam

**Bu dalda yapılanlar:**

- Ziyaretçi arayüzü dört dilde: Türkçe (tr, kaynak dil), İngilizce (en), Hollandaca (nl), Almanca (de).
- Bütün dillerde önekli ve yerelleştirilmiş adresler (`/tr/kesfet`, `/en/explore`, `/nl/ontdekken`, `/de/entdecken`).
- Konum dizini Türkiye (81 il, 973 ilçe), Hollanda (12 eyalet, 342 belediye) ve Almanya'yı (16 eyalet, 400 Kreis) kapsar.
- Eski öneksiz Türkçe adresler kalıcı olarak yeni adreslere yönlenir (301).

**Bilinçli olarak yapılmayanlar** (kapsam kararı):

- Cinsel hizmet kategorileri, yargı bölgesi/politika motoru (`jurisdiction_policies`), VIP/ilan modeli ve reklamveren paneli.
- Yönetim panelinin çevirisi. Panel Türkçe kalır.
- Hukuki metinlerin (KVKK, kullanım koşulları) çevirisi. Diğer dillerde Türkçe asıl metin gösterilir, üstte bir uyarı yer alır. Bu sayfaların canonical adresi `/tr/...`'dir ve diğer dillerde `noindex` uygulanır.
- Paket adları, paket açıklamaları ve profil biyografileri. Bunlar veritabanı içeriğidir ve Türkçe kalır. Profil sayfasında içeriğin dili belirtilir.

## 2. URL tablosu

Fiziksel klasörler İngilizce iç segmentlerle `src/app/[lang]/(site)/` altındadır. `src/proxy.ts`, ziyaretçinin gördüğü
yerel segmenti iç rotaya yeniden yazar (rewrite). Tanım: `src/i18n/routes.ts`.

| Rota | İç segment | tr | en | nl | de |
|---|---|---|---|---|---|
| Ana sayfa | – | `/tr` | `/en` | `/nl` | `/de` |
| Keşfet | explore | kesfet | explore | ontdekken | entdecken |
| Şehir indeksi | cities | sehirler | cities | steden | staedte |
| Konum | location | konum | location | locatie | ort |
| Profil | profile | profil | profile | profiel | profil |
| Paketler | packages | paketler | plans | pakketten | pakete |
| Güvenlik | safety | guvenlik | safety | veiligheid | sicherheit |
| Gizlilik (KVKK) | privacy | kvkk | privacy | privacy | datenschutz |
| Kullanım koşulları | terms | kullanim-kosullari | terms | voorwaarden | nutzungsbedingungen |
| Kaldırma talebi | removal-request | kaldirma-talebi | removal-request | verwijderverzoek | entfernungsantrag |
| İletişim | contact | iletisim | contact | contact | kontakt |
| Bildirim alındı | report-received | bildirim-alindi | report-received | melding-ontvangen | meldung-erhalten |
| Yaş onayı | age-check | yas-onayi | age-check | leeftijdscheck | altersbestaetigung |
| 404 | not-found-page | bulunamadi | not-found | niet-gevonden | nicht-gefunden |

Konum adresinin biçimi `/{dil}/{konum}/{ülke}/{bölge}[/{yer}]` şeklindedir, örneğin `/de/ort/de/bayern/landkreis-muenchen`
ve `/nl/locatie/nl/noord-holland/amsterdam`. Bölge kısaltmaları (slug) üç ülke genelinde benzersizdir.
Bunu bir unit testi denetler.

### İstek akışı (`src/proxy.ts`)

1. `/` adresi, `hilal_lang` çerezine, çerez yoksa `Accept-Language` başlığına göre dile 307 ile yönlenir. Varsayılan dil `tr`'dir. Eski ana sayfa sorgularında (`/?yaka=`) yönlendirme `/tr`'ye gider.
2. Eski adresler 301 ile yönlenir. Örnekler: `/kesfet` → `/tr/kesfet`; `/sehir/istanbul/kadikoy` → `/tr/konum/tr/istanbul/kadikoy`; `/profil/x` → `/tr/profil/x`.
3. Başka dilin segmenti veya iç segment kullanılırsa doğru yerel adrese 301 yapılır (ör. `/de/explore` → `/de/entdecken`). Tanınmayan bir segment ziyaretçinin dilinde gerçek 404 döndürür.
4. Konum adresleri doğrulanır. Ülke ve bölge eşleşmesi ile bölge ve yer eşleşmesi kontrol edilir; uyuşmazlık 404, veri kaynağı hatası 503 verir.
5. Yaş kapısı ana sayfa, keşfet, konum ve profil sayfalarında uygulanır. Ülke dizini sayfaları (`/tr/konum/nl`) kapının dışındadır.
6. Profil adresinde profil yoksa veya kaldırılmışsa gerçek 404 döner.
7. `/admin` adresleri dil sisteminin dışındadır. Ayrı bir kök layout kullanır ve Türkçedir.

### SEO

- Her sayfanın canonical adresi kendi dilindedir. `hreflang` alternatifleri dört dili ve `x-default`'u (`en`) içerir.
- Sitemap'teki her girdi dil alternatifleriyle birlikte yazılır. Hukuki sayfalar sitemap'te yalnızca `tr` olarak yer alır.
- Yönetim panelinde elle yazılan SEO metinleri Türkçedir ve yalnızca Türkçe sayfada kullanılır. SEO kaydı anahtarı Türkiye için `/sehir/{il}[/{ilce}]` (geriye dönük uyumlu), diğer ülkeler için `/konum/{ülke}/{bölge}[/{yer}]` biçimindedir.
- Next.js, `searchParams` okuyan sayfalarda (keşfet, konum, profil) metadata'yı tarayıcılar ve Googlebot için akışla `<body>` içine yazar. JavaScript çalıştıramayan botlar (ör. `facebookexternalhit`) metadata'yı `<head>` içinde alır. Bu davranış `main` dalında da aynıdır. Lighthouse'un "meta description" uyarısı bundan kaynaklanır.

## 3. Sözlükler

- `src/i18n/messages/tr.ts` kaynak dildir ve `Messages` tipini tanımlar.
- `en`, `nl` ve `de` sözlükleri `DeepPartial<Messages>` tipindedir. Eksik anahtar çalışma anında önce `en`, sonra `tr` değerine düşer. `missingKeys()` testi şu anda üç dilde de eksik anahtar olmadığını doğrular.
- Yer tutucular `{ad}` biçimindedir ve `fmt()` ile doldurulur. Tarih ve sayılar `Intl` ile dile göre biçimlenir (`formatDateIntl`, `formatNumberIntl`).
- Sunucuda `getI18n()` kullanılır (`next/root-params` üzerinden `lang`). İstemcide `useI18n()` kullanılır (`I18nProvider`).
- Server Action'lar dili form alanındaki `lang` değerinden alır ve hata kodlarını o dilde döndürür.

### Yeni dil ekleme

1. `src/i18n/config.ts`: `LOCALES`, `INTL_LOCALE`, `OG_LOCALE` ve `LOCALE_NAMES` listelerine dili ekleyin.
2. `src/i18n/routes.ts`: `SEGMENTS` içine o dilin segmentlerini yazın. Segmentler dil içinde benzersiz olmalıdır.
3. `src/i18n/messages/{dil}.ts` dosyasını oluşturup `messages/index.ts` içine kaydedin. `npm test` eksik anahtarları listeler.
4. `src/domain/countries.ts`: ülke adlarına yeni dildeki karşılığı ekleyin. Veritabanında `countries` tablosuna bir `name_{dil}` sütunu migration ile eklenmelidir.
5. Hukuki metin çevrilmeyecekse ek işlem gerekmez (Türkçe asıl metin ve uyarı otomatik gösterilir). Çevrilecekse önce hukuki onay alınmalıdır.
6. `tests/e2e/i18n.spec.ts` içindeki `LANGS` dizisine dili ekleyin.

## 4. Konum verisi

| Ülke | Bölge | Yer | Kaynak | Lisans |
|---|---|---|---|---|
| TR | 81 il | 973 ilçe | turkiyeapi.dev 2025 (TÜİK ADNKS) | mevcut veri, değişmedi |
| NL | 12 eyalet | 342 belediye | CBS StatLine 86247NED (indeling 1 jan. 2026) | CC BY 4.0 |
| DE | 16 eyalet | 400 Kreis | Destatis GV-ISys 04-kreise (Gebietsstand 31.12.2024) | dl-de/by-2-0 |
| NL/DE | koordinatlar | – | Wikidata | CC0 1.0 |

- Atıf, `/{dil}/{şehirler}` sayfasının altında kaynak, lisans bağlantısı ve "uyarlanmıştır" notuyla gösterilir. CC BY 4.0 ve dl-de/by-2-0 bunu zorunlu tutar.
- Ülke, konum kimliğinin (plate) aralığından türetilir: TR 1–999, NL 1000–1999, DE 2000–2999. Veritabanında bu kural `cities.country_code` üretilmiş sütunu olarak tutulur.
- Veri üretimi: `scripts/build-locations-intl.py` → `src/data/locations-intl.json` → `scripts/build-intl-locations-sql.py` → migration. Migration elle düzenlenmez.
- Bilinen sınırlar:
  - Almanya verisi 31.12.2024 tarihli bölge durumunu yansıtır.
  - Hollanda'da resmî adlar kullanılır (ör. `'s-Gravenhage`, "Den Haag" değil).
  - Kreis düzeyinin altındaki belediyeler (Gemeinden) dahil değildir.

## 5. Tehdit modeli (değişen yüzey)

| Tehdit | Önlem | Doğrulama |
|---|---|---|
| Açık yönlendirme (`returnTo`, dil değiştirici) | `safeReturnPath(value, lang)` yalnızca `parseLocalized` veya `legacyRedirect` ile çözülebilen yerel yolları kabul eder; diğer her şey o dilin ana sayfasına döner. Dil değiştirici yalnızca aynı origin içindeki yolu yeniden kurar. | unit: discovery.test.ts; e2e: i18n.spec.ts |
| Yaş kapısının yerel adresle atlatılması | Kapı iç rota üzerinden değil, ayrıştırılmış rota anahtarı (`home/explore/location/profile`) üzerinden uygulanır. Bu yüzden her dil ve iç segment (`/de/explore` → 301 → kapı) aynı kontrolden geçer. Medya (`/api/image`, `/demo`, `/media`, `/_next/image`) çerez olmadan 403 döner. | e2e: i18n.spec.ts (de reddi), premium-discovery.spec.ts |
| Konum adresiyle içerik numaralandırma veya soft-404 | Ülke, bölge ve yer üçlüsü dizine göre doğrulanır. Uyuşmazlık gerçek 404 döner, tanınmayan dil segmenti de 404'tür. | e2e: i18n.spec.ts (`/en/location/de/noord-holland` → 404) |
| Önbellek zehirlenmesi veya dil karışması | `/` yönlendirmesi `Vary: Accept-Language, Cookie` ve `private, no-store` başlıklarıyla döner. Dil URL'de taşındığı için sayfa çıktısı çereze bağlı değildir. Kapı arkasındaki yanıtlar `private, no-store` olarak işaretlenir. | elle: curl başlık kontrolü |
| Çerez (`hilal_lang`) | Yalnızca kök yönlendirme tercihi için kullanılır, kişisel veri değildir. `SameSite=Lax` ve HTTPS'te `Secure` ayarlıdır; değeri `isLocale` ile doğrulanır. | kod incelemesi |
| Yeni tablo `countries` | RLS açıktır: herkes okuyabilir, yalnızca yönetici yazabilir. Anonim kullanıcının ekleme denemesi reddedilir. | `npm run test:db` §11 |
| Çeviri metninde HTML veya script | Sözlük değerleri düz metin olarak render edilir (`dangerouslySetInnerHTML` yok). `fmt()` yalnızca metin yerleştirir. | kod incelemesi |
| Form hata mesajlarında bilgi sızıntısı | Sunucu hata kodları (`rate_limited`, `duplicate`, `spam`, `contact_unavailable`) yerel metne çevrilir. Ayrıntılı zod mesajı yalnızca `tr` dilinde gösterilir, diğer dillerde genel bir "geçersiz alan" metni döner. | unit, e2e: i18n.spec.ts iletişim doğrulaması |

Kapsam dışında kalan ve açık olan risk C-01 (kurgusal profiller ve tek WhatsApp numarası) bu dalda değişmedi.
Ayrıntı için `FULL_SITE_AUDIT_2026-10-18.md` belgesine bakın.

## 6. Migration ve geri alma

Migration: `supabase/migrations/20261024000001_multi_country_locations.sql`

- `countries` tablosu oluşturulur (RLS açık). `cities_plate_check` (1–81) kaldırılır ve yerine `cities_plate_range` gelir.
- `cities.country_code` üretilmiş sütunu eklenir (`countries` tablosuna referans verir).
- 28 bölge ve 742 yer eklenir (`on conflict do nothing`). Mevcut Türkiye satırları değişmez.

Geri alma betiği: `docs/rollback/20261024000001_multi_country_locations.rollback.sql`

- Betik migration klasöründe değildir, bu yüzden otomatik uygulanmaz. Tek bir işlem içinde çalışır.
- Hollanda veya Almanya konumuna bağlı profil ya da örnek profil varsa hiçbir şey değiştirmeden durur. Profillerin konum ilişkisi kademeli silinmediği için kayıt kaybı olmaz.
- NL/DE satırlarını siler; `country_code`, `cities_plate_range` ve `countries` nesnelerini kaldırır; `cities_plate_check` kısıtını geri getirir. Sonunda 81 il ve 973 ilçe kaldığını doğrular.
- Uygulama kodu geri alınmadan önce bu betik çalıştırılmamalıdır. Bu dalın kodu `country_code` sütununu okumaz (ülke plakadan hesaplanır), ancak NL/DE adresleri 404 vermeye başlar.

Yerel izole veritabanında (Supabase CLI, `127.0.0.1:54322`) doğrulandı:

1. NL konumunda sentetik bir profil varken betik "Geri alma durdu: NL/DE konumunda 1 profil var" hatasıyla durdu ve 109 bölge yerinde kaldı.
2. Temiz veritabanında sonuç: 81 il, 973 ilçe, `countries` yok, `country_code` yok, `cities_plate_check` geri geldi.
3. Migration ardından yeniden uygulandı: tr 81, nl 12, de 16.

Production'da uygulama sırası `docs/DEPLOY_RUNBOOK_2026-10-18.md` belgesindeki gibidir: doğrulanmış yedek, ardından
SQL Editor, ardından doğrulama sorguları. Bu dal hiçbir production veritabanına uygulanmadı.
