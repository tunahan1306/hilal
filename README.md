# Hilal — sosyal keşif platformu (MVP)

Türkiye'nin 81 ilinde ve 973 ilçesinde, 18 yaş üstü yetişkinlerin **yönetim tarafından, açık rıza ile oluşturulan** sosyal profillerini şehir/ilçe ve yaş aralığına göre keşfetmesini sağlayan web uygulaması.

> **Kesin ürün kuralı:** Platform ücretli cinsel hizmet tanıtımı, fuhşa aracılık veya müşteri yönlendirme amacıyla kullanılamaz. Bu kural yalnızca metinle değil; içerik taraması, yayın ön koşulları, iletişim bilgisi yasağı, otomatik yayından kaldırma ve veritabanı tetikleyicileriyle uygulanır (bkz. [SECURITY.md](SECURITY.md)).

> **Gerçek profil yayınlanmadan önce** [LEGAL_REVIEW_CHECKLIST.md](LEGAL_REVIEW_CHECKLIST.md) içindeki maddeler bir hukuk uzmanı tarafından değerlendirilmelidir. Bu depo hiçbir mevzuata otomatik uyum sağlandığını iddia etmez.

## Hızlı başlangıç (demo modu)

Supabase olmadan, bellek içi **sentetik** verilerle çalışır (veriler süreç yeniden başlayınca sıfırlanır).

```bash
npm install
npx playwright install chromium     # E2E testleri için
echo "ALLOW_DEMO_MODE=true" > .env.local
npm run dev                          # http://localhost:3000
```

Yönetim paneli: `http://localhost:3000/admin`

| Alan | Demo değeri (yalnızca yerel) |
| --- | --- |
| E-posta | `admin@demo.local` |
| Şifre | `demo-admin-2026!` |
| TOTP kodu | `npm run demo:totp` çıktısı |

Bu varsayılanlar yalnızca `npm run dev` içindir. Production derlemesinde (`npm run build && npm start`) varsayılan sır kullanılmaz: `SESSION_SECRET`, `IP_HASH_SALT`, `DEMO_ADMIN_PASSWORD`, `DEMO_ADMIN_TOTP_SECRET` tanımlanmalıdır (bkz. `.env.example`). Production'da Supabase Auth + TOTP MFA kullanılır.

## Supabase ile çalıştırma

```bash
supabase start                       # yerel Supabase (Docker)
supabase db reset                    # migration + seed (81 il, 973 ilçe, ilgi alanları, paketler)
cp .env.example .env.local           # URL/anahtarları `supabase status` çıktısından doldurun
npm run dev
```

İlk yöneticiyi oluşturma: Supabase Auth'ta kullanıcı oluşturun, ardından SQL ile `admins` tablosuna ekleyin (bkz. [DEPLOYMENT.md](DEPLOYMENT.md#ilk-yönetici)). İlk girişte TOTP kurulumu zorunludur.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` / `build` / `start` | Geliştirme, production build, production sunucu |
| `npm run typecheck` | Route tipleri + TypeScript strict |
| `npm run lint` | ESLint (Next + React Compiler kuralları) |
| `npm test` | Vitest — domain kuralları + servis entegrasyon testleri |
| `npm run test:e2e` | Playwright — masaüstü + mobil (önce `npm run build`) |
| `npm run test:db` | Geçici Postgres'te migration + seed + RLS/yayın kuralı SQL testleri |
| `npm run test:integration` | Yerel Supabase'e karşı repository/servis entegrasyon testleri (`supabase start && supabase db reset` sonrası) |
| `E2E_SUPABASE=1 npx playwright test tests/e2e/supabase-auth.spec.ts` | Supabase Auth + zorunlu TOTP akışı (Supabase env ile build gerekir) |
| `npm run check` | typecheck + lint + unit + build |
| `npm run data:locations` | İl/ilçe JSON'unu kaynak dökümlerden yeniden üretir |
| `npm run data:seed-sql` | `supabase/seed.sql` üretir |

## Dokümantasyon

- [ARCHITECTURE.md](ARCHITECTURE.md) — katmanlar, veri akışı, önbellek
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — tokenlar, tema, bileşen kuralları
- [DATABASE.md](DATABASE.md) — şema, RLS, saklama/silme
- [SEO.md](SEO.md) — programatik SEO ve indeks kuralları
- [SECURITY.md](SECURITY.md) — tehdit modeli ve kontroller
- [LEGAL_REVIEW_CHECKLIST.md](LEGAL_REVIEW_CHECKLIST.md) — hukuk incelemesi gereken konular
- [DEPLOYMENT.md](DEPLOYMENT.md) — Vercel + Supabase kurulumu
- [TASKS.md](TASKS.md) — aşama durumu ve açık işler

## Premium keşif arayüzü

Varsayılan koyu tema, 2/3/4 sütunlu fotoğraf kartları, konum filtresi ve cursor tabanlı “Daha fazla göster” akışı. Kamuya açık hobi filtreleri kaldırılmıştır; yönetim ve tarihsel veriler korunur. İlk ziyarette sunucu tarafında 18+ beyanı istenir (30 günlük HttpOnly / SameSite=Lax çerez). Bu beyan belgeyle yaş doğrulaması değildir.

Uygulama planı, medya uyumluluk düzeltmeleri ve SEO/depolama sınırları: [IMPLEMENTATION.md](IMPLEMENTATION.md). Canonical konum yolları `/sehir/istanbul/atasehir` biçiminde korunur.
