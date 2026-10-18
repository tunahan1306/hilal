# Dağıtım (Vercel + Supabase Free + GitHub)

> Production yayını, gerçek kişi verisi ve ödeme işlemleri **açık onay** gerektirir. Gerçek profiller yayınlanmadan önce [LEGAL_REVIEW_CHECKLIST.md](LEGAL_REVIEW_CHECKLIST.md) tamamlanmalıdır.

## 1. Supabase

1. supabase.com → yeni proje (bölge: `eu-central-1` Frankfurt önerilir — KVKK m.9 değerlendirmesine bakın).
2. Şemayı uygulayın:
   ```bash
   supabase link --project-ref <ref>
   supabase db push                  # migrations
   psql "$DATABASE_URL" -f supabase/seed.sql   # il/ilçe/ilgi/paket
   ```
3. Auth → Providers: yalnızca Email açık; **"Enable sign ups" kapalı**. Auth → MFA: TOTP açık.
4. Storage: migration bucket'ları oluşturur (`profile-images` public, iki private bucket).

### İlk yönetici

```sql
-- Supabase Dashboard → Authentication → Add user (e-posta + güçlü şifre) sonrası:
insert into admins (id, email, display_name, role)
select id, email, 'Ad Soyad', 'owner' from auth.users where email = 'yonetici@ornek.com';
```

İlk girişte uygulama TOTP kurulumunu zorunlu kılar (`/admin/giris?adim=mfa-kurulum`).

## 2. Vercel

1. GitHub reposunu Vercel'e bağlayın (framework: Next.js, Node 24).
2. Ortam değişkenleri (Production + Preview ayrı):
   | Değişken | Not |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://alanadi.com` |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
   | `SUPABASE_SERVICE_ROLE_KEY` | yalnızca Production/Preview, asla client |
   | `IP_HASH_SALT`, `CRON_SECRET` | `openssl rand -hex 32` — `IP_HASH_SALT` yoksa sunucu istekleri reddeder |
   | `VERIFICATION_DOC_RETENTION_DAYS` | hukuk incelemesine göre |
   | `CONTACT_PUBLIC_EMAIL` | isteğe bağlı; yalnızca doğrulanmış gerçek adres. Boşsa `/iletisim` e-posta göstermez |
   | `RESEND_API_KEY`, `CONTACT_NOTIFY_TO`, `CONTACT_NOTIFY_FROM` | isteğe bağlı; üçü birlikte tanımlanınca yeni iletişim mesajı bildirimi gönderilir |
   `ALLOW_DEMO_MODE` production'da **tanımlamayın**.
3. `vercel.json` günlük cron'u (`/api/cron`, 03:00 UTC) tanımlar; Vercel `Authorization: Bearer $CRON_SECRET` gönderir.
4. Firewall → Rate limiting: `/admin/giris` ve form POST'ları için kural ekleyin (uygulama içi limit instance başınadır).
5. Domain bağlayın; HSTS preload'u yalnızca tüm alt alan adları HTTPS olduğunda gönderin.

## 3. Yayın öncesi kontrol listesi

- [ ] `npm run check` ve `npm run test:e2e` yeşil
- [ ] `npm run test:db` yeşil; production şeması migration ile aynı
- [ ] Supabase: sign-up kapalı, MFA açık, RLS tüm tablolarda açık (Dashboard → Advisors)
- [ ] Demo verisi yok; `ALLOW_DEMO_MODE` tanımsız
- [ ] Hukuk kontrol listesi onaylandı; `/kvkk` ve `/kullanim-kosullari` nihai metinlerle değiştirildi
- [ ] Destek e-postası ve 5651 iletişim kanalı tanımlı
- [ ] Moderatörler eğitildi; kritik şikâyet prosedürü yazılı
- [ ] Yedekleme (Supabase Free günlük yedek sunmaz → Pro veya harici `pg_dump`)
- [ ] Search Console + sitemap

## 4. Profesyonel sunucuya taşıma

Uygulama standart Next.js'tir (`next build && next start`, Node 24). Supabase yerine başka bir Postgres kullanılacaksa:
- `supabase/migrations` içindeki `auth.*`/`storage.*` bağımlılıkları (admins FK, `is_admin()`, bucket politikaları) yeni kimlik/depolama çözümüne uyarlanmalı,
- `src/server/repositories/types.ts` arayüzü yeni bir uygulamayla karşılanmalıdır (iş mantığı değişmez).
Vercel dışında uygulamayı X-Forwarded-For başlığını ezen/ekleyen bir ters vekil arkasında çalıştırın veya `CLIENT_IP_HEADER` tanımlayın; aksi halde IP tabanlı oran sınırları atlatılabilir.
Çok instance'lı kurulumda Next.js `cacheHandlers` ile paylaşımlı önbellek ve paylaşımlı rate-limit deposu yapılandırılmalıdır.

## Etkin Hilal ortamı

- Vercel: `hilal` / `hilal-snowy.vercel.app`, Next.js, Node 24, Webpack build.
- Supabase: `hilal` / `yqlnjxnxwbbkxrtawxcx`, Frankfurt.
- Konum kataloğu ve paketler `supabase/seed.sql` ile veritabanına yüklenir; canlı ortamda sentetik profil yüklenmez.
- Vercel production, Supabase değişkenleri eksikse demo moduna geçmez; başlangıcı reddeder.
- Konum sayfaları, seçimler, sitemap ve yönetim formları veritabanındaki konum kataloğunu kullanır. Katalog bir saat önbelleklenir.
- Auth: `[auth].enable_signup=false`; email sağlayıcısı açık kalmalıdır (`[auth.email].enable_signup=true`). İkinci ayarı kapatmak mevcut yöneticilerin e-posta girişini de kapatır.
- Denetim kayıtları değişmezdir; silinen yönetici hesaplarının tarihsel UUID'si denetim kaydında korunur.
- Yerel `.env.deploy.local` dağıtım sırlarını içerir; Git ve Vercel kaynak yüklemelerinden hariç tutulur. Veritabanı şifresi uygulama ortamına yüklenmez.
- Gerçek Supabase tarayıcı kontrolleri: `E2E_SUPABASE=1` ve gerekli Supabase ortam değişkenleriyle `npx playwright test tests/e2e/database-discovery.spec.ts tests/e2e/supabase-auth.spec.ts --project=desktop`.
- Canlı tarayıcı kontrolleri için `E2E_BASE_URL=https://hilal-snowy.vercel.app` eklenebilir; yerel sunucu açılmaz.
