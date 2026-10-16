# Mimari

## Teknoloji

Next.js 16 (App Router, Cache Components + Partial Prerendering, Turbopack) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui (Radix) · Framer Motion (yalnızca `MotionConfig reducedMotion="user"`) · Lucide · Supabase (Postgres, Auth, Storage) · Zod 4 · React Hook Form · TanStack Table v9 · sharp · Vitest · Playwright + axe.

## Katmanlar

```
src/
  domain/            Saf iş kuralları — framework/DB bağımsız, birim testli
    types.ts           Varlık tipleri, enum'lar, etiketler
    publishing.ts      Yayın ön koşulları (tek doğruluk kaynağı) + durum geçişleri
    content-policy.ts  Yasaklı hizmet / iletişim bilgisi / reşit olmayan taraması
    subscriptions.ts   Paketler, etkin durum, yenileme, sponsorluk
    filters.ts         URL query ⇄ filtre (doğrulamalı)
    seo.ts             İndeks kararı, JSON-LD kaçışı
    projection.ts      Yönetim verisi → kamuya açık profil (hassas alan sızdırmaz)
    locations.ts       81 il / 973 ilçe (src/data/locations.json)
  server/            Yalnızca sunucu (`server-only`)
    repositories/      Veri erişim sözleşmesi + 2 uygulama
      types.ts           Repository arayüzü
      supabase.ts        Kamu: anon anahtar + *_public view'ları; yönetim: service role
      memory.ts          Demo/test: bellek içi, sentetik seed
    services/          Uygulama servisleri (iş akışı + denetim kaydı)
    auth/              Oturum, MFA, requireAdmin/assertAdmin
    queries/           Kamuya açık, `"use cache"` ile önbelleğe alınmış okumalar
    cache.ts           Önbellek etiketleri ve geçersiz kılma
    rate-limit.ts      Oran sınırlama + IP özeti
    payments.ts        Ödeme soyutlaması (devre dışı)
  app/
    (site)/            Ziyaretçi arayüzü + public Server Actions
    admin/giris        Giriş (şifre + TOTP)
    admin/(panel)/     Yönetim paneli + admin Server Actions (actions.ts)
    api/cron           Günlük bakım (saklama süresi, abonelik durumu)
    media/[...path]    Demo modu yüklenen görseller
    sitemap.ts, robots.ts
  components/ui        shadcn/ui (Radix) — dokunma hedefleri büyütüldü
  components/site      Ziyaretçi bileşenleri
  components/admin     Yönetim bileşenleri
  proxy.ts             İyimser admin kontrolü, Supabase oturum yenileme, geçersiz il/ilçe 404
```

### Bağımlılık yönü

`app` → `server/services` → `server/repositories` → (`domain`). `domain` hiçbir katmanı import etmez. UI bileşenleri veritabanına doğrudan erişmez; yetkilendirme `server/auth` içinde, her Server Action'ın başında yapılır.

## Veri akışı

**Okuma (ziyaretçi):** sayfa → `server/queries/public.ts` (`"use cache"`, `cacheTag("public-profiles")`) → repository → Supabase `profiles_public` view (anon anahtar, RLS). Filtreler URL'den `parseFilters()` ile doğrulanır; sonuçlar `<Suspense>` içinde akıtılır.

**Yazma (yönetici):** istemci formu → Server Action (`app/admin/(panel)/actions.ts`) → `run()` sarmalayıcı: `assertAdmin()` (oturum + AAL2) → servis → repository → `audit()` → `invalidatePublic()` (`updateTag` + `revalidatePath("/", "layout")`).

**Yayın:** `publishProfile()` → `evaluatePublishReadiness()`; eksik koşul varsa `PublishBlockedError` + denetim kaydı. Veritabanında aynı kurallar `enforce_publish_preconditions` tetikleyicisiyle tekrar uygulanır (derinlemesine savunma).

## Önbellek ve render

- Statik shell + akış (PPR). İl sayfaları ve profil sayfaları `generateStaticParams` ile önceden üretilir; parametre okumaları `<Suspense>` içindedir (bilinmeyen parametrelerde App Shell + akış).
- Yönetim işlemleri tüm kamu önbelleğini **anında** geçersiz kılar. `updateTag` tek başına build-time statik sayfaları ilk istekte bayat sunabildiği için `revalidatePath("/", "layout")` de çağrılır; kaldırma kararlarının gecikmeden yansıması performanstan önceliklidir.
- Geçersiz il/ilçe adresleri proxy'de gerçek `404` döner. Kaldırılmış bir profil, akış başladıktan sonra `notFound()` olabileceği için ilk istekte `200 + noindex` ("soft 404") dönebilir; içerik hiçbir durumda gösterilmez.
- Yönetim sayfaları `instant = false`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`.

## Demo modu

Supabase değişkenleri yoksa `memory` repository kullanılır. Production'da `ALLOW_DEMO_MODE=true` olmadan uygulama başlatılamaz — yanlış yapılandırılmış canlı ortam sessizce sahte veriyle açılmaz. Demo verisi tamamen sentetiktir; görseller `scripts/generate-demo-images.mjs` ile üretilmiş soyut çizimlerdir.

## Ölçeklenme notları

- Kamu sorguları view üzerinden; filtrelenmiş kolonlar indeksli. İlgi alanı filtresi şu an iki aşamalı (id listesi + `in`); büyük veri setinde bir Postgres RPC'ye taşınmalı.
- Süreç içi rate limit sunucusuz ortamda instance başınadır; şikâyetler ayrıca DB sayacıyla sınırlanır. Ölçekte Vercel WAF / paylaşımlı depo eklenmeli.
- Ödeme sağlayıcı `PaymentProvider` arayüzüyle eklenecek (şu an devre dışı).
