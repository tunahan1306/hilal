# Premium vibrant discovery — 2026-10-16

## Audit and execution plan

- Base: `redesign/premium-editorial`; work: `feature/premium-vibrant-discovery`.
- Read AGENTS, README, TASKS, DESIGN_SYSTEM, ARCHITECTURE, SECURITY, SEO and installed Next 16 cookies/proxy documentation.
- Existing routes: `/`, `/kesfet`, `/sehir/[il]`, `/sehir/[il]/[ilce]`, `/profil/[slug]`. Location dataset validates 81 provinces / 973 districts; canonical paths remain unchanged.
- Public hobby dependencies: homepage interest index, card captions, filter rail/sheet/chips, location summary and profile detail tags. Remove these UI paths while retaining admin management, historical records and legacy filter parser.
- Existing discovery used offset/numbered pages, sponsored/date ordering, cached repository reads. Replace visitor pagination with bounded keyset reads ordered by publication date descending then id descending. Sponsorship remains labeled; no service or referral ranking.
- No visitor age gate existed. Add a pre-render proxy gate and a same-origin POST declaration cookie. Keep document-based profile publication checks separate.
- Existing base has an incomplete media migration: repository, old admin image manager and tests still referenced removed APIs. Restore compatibility through the existing moderated media pipeline and the committed media schema without running a migration.
- Apply plum/raspberry/rose/gold/ivory OKLCH tokens, dark default, compact 2/3/4-column grids, concise homepage and media-led detail.
- Verify typecheck, lint, unit, production build, Playwright, screenshots and theme/accessibility at 360/390/768/1440px. Commit logical changes; no deployment.

## Access and SEO tradeoff

The proxy renders the declaration page before profile data or imagery is requested. Anonymous crawlers receive the same age gate (no bot bypass). Confirmed requests retain SSR, canonical, structured data and existing indexing rules; sitemap remains available. A cookie is a declaration, never age verification.

Application HTML, discovery API and local media responses are private/no-store. Repository data retains tagged server caches and existing immediate moderation invalidation. The gate prevents exposure through the application; existing Supabase public storage URLs remain public at the storage origin. Making those origin URLs private requires a separate storage-delivery migration and is not claimed here.

## Compatibility

No schema/data/security policy changes. Old admin image actions now enter the existing private upload → processing → rights record → moderation → public sync pipeline. Private previews require AAL2 admin authentication. Photo-count package UI now displays the already-defined storage quota. Existing tests are updated to the committed media model.

## Image delivery and bundlers

Next 16's built-in local image optimizer intentionally makes its internal source request without cookies. Directly gating the local source therefore blocked confirmed users too. A custom `next/image` loader now points at `/api/image`: it checks the declaration on the browser request, restricts sources to local synthetic/public media or the configured Supabase public-storage origin, bounds source sizes and dimensions, strips metadata and emits responsive WebP. No shared browser/CDN cache bypasses the gate; the bounded server transform cache checks source availability before reuse.

The repository originally configured Tailwind only as a Turbopack loader. Standard Tailwind 4 PostCSS compilation now supports both Next bundlers. The current environment rejects Turbopack's local worker port even on an approved run; production QA uses `npm run build -- --webpack`. Profile links use document navigation; SSR and Cache Components remain enabled.

Full-suite QA also reproduced a premature RSC connection close on client-side profile navigation after admin invalidation. Disabling partial prefetch alone did not resolve it; profile cards therefore use normal document links. Standard SSR, Cache Components/PPR, tagged queries and immediate moderation invalidation are retained. Tests scope repeated rows to visible content because Next may retain inactive pages in the DOM.
