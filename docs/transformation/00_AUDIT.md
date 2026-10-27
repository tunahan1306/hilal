# Phase 0 — Repository Audit

Branch: `feature/hilal-global-platform`, created from `feature/hilal-global-v2` (HEAD `faba6d9`) on 2026-10-27. No merges, no deploys, no migrations run against production as part of this audit.

## Summary

Hilal today is a Turkish-market, **admin-curated** social discovery site: visitors browse profiles that staff create and moderate (no self-service registration — [TASKS.md:79](../../TASKS.md) notes "profil sahiplerinin hesabı olmadığından ürün kararı gerekli", i.e. profile owners have no account at all). The transformation brief asks for a global, self-service, multi-sided platform (user accounts, creator accounts, paid digital-content subscriptions, social graph, messaging) built out from this base.

**Out of scope, by prior decision (this audit, confirmed by the user):** the brief's module D (independent advertising for sex workers, with service booking and sexual-service payment brokering) and any legal/payment research aimed at enabling it. This is not a gap to fill later — it directly contradicts this repo's existing, enforced product rule ([README.md:7](../../README.md): no paid sexual-service promotion, prostitution facilitation, or client referral — enforced via `content-policy.ts`, DB triggers, and auto-takedown per [SECURITY.md](../../SECURITY.md)), and PR #2/#3 already explicitly scoped out "sexual service categories, VIP/listing model, advertiser panel" ([PR #2](https://github.com/tunahan1306/hilal/pull/2) summary). Every module below (A, B, C, E, F, G) is scoped to exclude it.

## Branch & PR chain

```
main
 └─ PR #1  feat/site-audit-contact         (OPEN, mergeable) — site audit, contact module, security/SEO/perf fixes
     └─ PR #2  feature/hilal-global         (OPEN, mergeable) — tr/en/nl/de i18n, TR/NL/DE location index
         └─ PR #3  feature/hilal-global-v2  (OPEN, mergeable) — country publication gate, multilingual moderation, C-01 restriction
             └─ feature/hilal-global-platform  (this branch, HEAD = PR #3)
```

- **PR #1** (100 files, +3996/-1016): site-wide audit remediation + contact module. Explicitly flags and leaves unfixed: **C-01** (10 AI-generated fictional profiles all pointing to one WhatsApp number — scope-excluded, not this PR's job) and **V-01** (Preview/Production share one Supabase project — open, unfixed).
- **PR #2** (100 files, +4842/-1053): adds the tr/en/nl/de localized URL architecture and TR/NL/DE location catalog (migration `20261024000001_multi_country_locations.sql`, `countries` table). Explicitly scopes out "sexual service categories, jurisdiction/policy engine, VIP/listing model, advertiser panel" as a deliberate decision, not an oversight.
- **PR #3** (53 files, +2047/-121): adds the **country publication gate** — this is the existing seed of the brief's module G (country policy engine), see below. Also adds multilingual content-policy moderation and the C-01 contact-number restriction (fictional profiles still can't leak a usable contact channel). States again: no listing/service category, no advertiser account, no payment, no VIP model added.

All three PRs are currently mergeable against their stated base and none has been merged, deployed, or had migrations run against production.

## Current architecture snapshot

Stack: Next.js 16 (App Router, Cache Components + PPR, Turbopack) · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui (Radix) · Supabase (Postgres/Auth/Storage) · Zod 4 · Vitest · Playwright+axe. ([ARCHITECTURE.md](../../ARCHITECTURE.md))

Layering (strict, enforced by import direction): `app → server/services → server/repositories → domain`. `domain/` is framework/DB-free and unit tested; `server/` is `server-only`; UI never touches the DB directly, authorization happens at the top of every Server Action via `assertAdmin()`.

```
src/domain/        publishing.ts (publish preconditions, single source of truth),
                   content-policy.ts (banned-service/contact-info/minor-indicator scan),
                   subscriptions.ts, filters.ts, seo.ts, projection.ts, locations.ts
src/server/
  repositories/    Supabase (anon + *_public views / service role) and in-memory demo, same interface
  services/        workflow + audit logging
  auth/            session, MFA, requireAdmin/assertAdmin
  queries/         cached public reads ("use cache")
  payments.ts      PaymentProvider abstraction — disabled
src/app/[lang]/(site)/   visitor UI + public Server Actions (tr/en/nl/de)
src/app/admin/(panel)/   admin panel + Server Actions (Turkish only)
```

- **i18n/location model**: tr/en/nl/de locales with localized URL segments; location data is TR (81 il/973 ilçe, official TÜİK-based dataset) + NL (12 provinces/342 municipalities, CBS) + DE (16 states/400 Kreis, Destatis) via `countries`/`cities`/`districts`. This is already a *multi-country* model, not TR-only, but it's a closed, curated catalog (admin-entered reference data), not a model built for arbitrary self-reported locations.
- **Auth**: Supabase Auth + mandatory TOTP (AAL2) for admins only. There is no end-user auth system at all — visitors are anonymous; only staff authenticate.
- **RLS**: all non-reference tables require `is_admin()` **and** JWT `aal=aal2`. Public reads go through `profiles_public`/`profile_images_public`/`profile_interests_public` views that already bake in moderation/consent/age conditions — service role (used by admin writes) bypasses RLS entirely, so authorization for admin paths lives in the app layer, not the DB, and is unit/E2E tested.

## Current data model snapshot

Core tables per [DATABASE.md](../../DATABASE.md): `admins`, `cities`/`districts`/`countries`, `interests`/`profile_interests`, `profiles`, `profile_images`, `profile_consents`, `verification_records`, `moderation_reports`/`moderation_actions`, `membership_plans`/`subscriptions`, `audit_logs` (immutable), `privacy_requests`, `seo_pages`, `site_settings`, `page_views_daily`.

PR #3's migration (`20261025000001_country_publication_gate.sql`) is the most relevant existing building block for the brief's module G (country policy engine):
- `countries.publication_status` + `review_due` + `decision_id`, defaulting to `not_reviewed` (fail-closed).
- `country_publication_decisions`: append-only (no UPDATE/DELETE), RLS-restricted to the MFA'd owner acting on their own decision, `permitted` requires an evidence/document reference and a review date, every decision also writes to `audit_logs`.
- `country_publishable()` DB function — a country whose `review_due` has lapsed closes itself automatically (fail-closed on expiry, not just on initial state).
- The gate is enforced in the `profiles_public`/`discovery_profiles` views (so it can't be bypassed by querying around the app layer) **and** in the publish trigger **and** in the service layer **and** in the UI (closed countries show a notice + `noindex`, home/discovery filters hide them).

This is a single-feature gate (publication only). The brief's module G wants this generalized to a **per-feature** matrix (social profiles, messaging, digital content, paid subscriptions, paid advertising, platform payments, …) with evidence reference, reviewer, decision authority, review/expiry dates, and enforcement at backend/DB/API/cache/search/sitemap/background-job layers — which is a direct extension of this existing pattern, not a new one.

## Known open risks

- **V-01 (High, OPEN) — blocks any new Preview deployment.** Vercel Preview and Production currently use the *same* Supabase project (`hilal` / `yqlnjxnxwbbkxrtawxcx`, Frankfurt — [DEPLOYMENT.md:67](../../DEPLOYMENT.md)) and the same env var values for `NEXT_PUBLIC_SUPABASE_URL`, anon key, and `SUPABASE_SERVICE_ROLE_KEY` (confirmed via `vercel env ls` per [FULL_SITE_AUDIT_2026-10-18.md:147](../../FULL_SITE_AUDIT_2026-10-18.md)). Any admin action taken against a Preview deploy writes to the production database with service-role privileges. `vercel.json` already disables automatic Preview deployment for `feature/hilal-global-v2` specifically because of this; the same restriction should extend to this branch until fixed. **The brief's own instruction is explicit: do not start a new Preview deployment before this is resolved** — fixing it requires provisioning a separate Supabase project for Preview/dev and repointing Vercel's Preview-scope env vars, which touches shared cloud infrastructure and needs your explicit go-ahead before I act on it.
- **C-01 (Critical, scope-excluded, unchanged across PR #1–#3):** all 10 seed profiles are AI-generated fictional portraits, untagged at the DB level in earlier state, all resolving to one WhatsApp number. PR #3 fixes the "one number, one profile" invariant and tags them as fictional in the UI, but the underlying content (10 fictional profiles currently live in production per the audit) is still a pre-existing issue not created by this work.
- **C-03/C-04 (High, partially fixed):** orphaned public storage bucket files (script exists, dry-run validated locally, **must be run manually against production** — not something to automate blindly against live storage) and cron step isolation (fixed: steps no longer fail atomically as one `Promise.all`).
- Rate limiting is in-process (per-instance) in a serverless environment — noted as needing Vercel WAF / Upstash at scale; not a blocker for dev work but relevant once messaging/social features add more mutation surface.
- CSP carries `'unsafe-inline'` for scripts because of the PPR static shell; flagged as a known gap, not regressed by anything here.
- No independent penetration test has been performed on this codebase to date.

## Components to preserve as-is

- **Layering and dependency direction** (`app → services → repositories → domain`, domain importing nothing) — this discipline is exactly what makes a modular-monolith expansion tractable; don't violate it for new modules.
- **Publish-precondition pattern**: single source of truth in `domain/publishing.ts`, re-enforced by a DB trigger (`enforce_publish_preconditions`) as defense-in-depth. This pattern should be the template for every new gated action (content publish, subscription activation, creator payout eligibility, etc.), not just profile publication.
- **Country publication gate** (PR #3) — generalize, don't replace. It already has the append-only decision ledger, fail-closed defaults, auto-expiry, and multi-layer enforcement the brief's module G asks for.
- **Repository abstraction** (Supabase + in-memory demo behind one interface) — keep this for every new domain area so local/demo dev doesn't require a live Supabase project.
- **`PaymentProvider` abstraction** (currently disabled) — already matches the brief's "mock provider only, abstracted interface" requirement for module F; extend it, don't rebuild it.
- **Audit log immutability**, **content-policy scanner**, **rate limiting primitives**, **EXIF/GPS stripping on upload**, **security headers/CSP baseline** — all reusable as-is for the new modules.
- **Demo-mode / in-memory repository discipline** (production refuses to start in silent demo mode; `instrumentation.ts` enforces required secrets) — keep this exact posture as new secrets (creator payouts, age-verification provider keys, etc.) are added.

## Components requiring refactor/extension

- **Identity & Verification (module A):** today there is *no end-user auth at all* — only admin accounts exist. This is the single largest gap: adding user registration/login/session, email verification, MFA, account deletion/export, and an age-verification-provider abstraction is almost entirely greenfield, not an extension of `server/auth`. The existing admin auth (Supabase Auth + mandatory TOTP/AAL2) is a good template for session security but serves a completely different population (dozens of trusted staff vs. an open public user base).
- **Profiles model:** `profiles` currently means "a listing the admin curated," with `birth_date` admin-only and no owner/user FK. Introducing self-owned user profiles means either a new `user_profiles` table distinct from the existing admin-curated `profiles`, or a significant reshape of `profiles` to add ownership — the brief's suggested table list (`user_profiles`, `user_roles`) implies the former; recommend keeping the existing admin-curated discovery model and tables untouched and additive, rather than merging the two concepts, since they have different trust models (admin-attested vs. self-attested) and different legal postures (per [LEGAL_REVIEW_CHECKLIST.md](../../LEGAL_REVIEW_CHECKLIST.md) §1, the current model is itself an open TCK 227 legal question in Turkey around who "creates" a profile).
- **Social Platform (module B):** follows, blocks, messaging, notifications, posts, privacy controls are all new tables/services. `moderation_reports`/`moderation_actions` already exist and generalize well (currently profile-scoped, needs to become polymorphic — content/message/user-scoped).
- **Creator Platform (module C):** entirely new — `creator_accounts`, media upload for creator content, `content_rights`/consent records (can reuse the `profile_consents` evidence-document pattern), subscription data model (`membership_plans`/`subscriptions` exist but model admin-set visibility packages, not creator-defined paid content tiers — needs a parallel, creator-owned subscription model, not a repurposing of the existing one, since the existing one is tied to admin-curated profile visibility).
- **Moderation & Trust (module E):** extend existing `moderation_reports`/`moderation_actions` to be polymorphic across content types; existing multilingual content-policy scanner (PR #3) extends directly to new content types.
- **Payments & Billing (module F):** extend the existing disabled `PaymentProvider` interface with a mock checkout, transaction ledger, webhook idempotency, payout model — architecture already anticipates this.
- **Country Policy Engine (module G):** generalize PR #3's single-feature (publication) gate into a per-feature matrix as described above. This is a refactor-and-extend, not a rewrite.
- **i18n/location data:** the TR/NL/DE catalog is a curated reference-data model; going fully global (arbitrary countries beyond the three curated today) needs a decision on how far to extend curated location data vs. accepting less-structured location input — flagged as an open question below, not decided here.

## Explicitly out of scope

Module D (independent advertising for sex workers, including listing review queues, service booking, and sexual-service payment brokering) and any legal or payment-processor research specifically aimed at enabling it are excluded from this transformation. This was raised as a direct conflict with this repository's existing, enforced product rule before any implementation work started, and the user confirmed dropping it entirely rather than building it gated/disabled. No code, schema, or documentation in this transformation should add hooks, flags, or data models whose purpose is to support that functionality later.

## Open questions / assumptions for Phase 1

1. **V-01 fix ownership**: provisioning a separate Supabase project for Preview/dev and repointing Vercel env scopes is a cloud-infrastructure change with real cost/account implications — needs your explicit confirmation before I act (per the brief's own instruction and standing policy on infra-affecting actions).
2. **Admin-curated vs. self-service coexistence**: assuming the existing admin-curated discovery product stays as-is and the new user/creator/social features are additive (separate tables, separate auth), not a replacement — confirm this matches your intent before Phase 2 design locks it in.
3. **Location data scope**: assuming we keep curated TR/NL/DE/(+ new countries added the same documented way) rather than accepting arbitrary user-entered locations globally, to preserve the existing data-quality/attribution discipline — flag if you want a different approach.
4. **Research scope for Phase 1**: competitor research will cover OnlyFans/Fansly/Fanvue (digital-content subscription model) in depth; the explicitly-named escort/booking platforms (tryst.link, adultwork.com, kinky.nl, sexjobs.nl, redlights.nl, topescort.nl, getkinky.nl, grenddo.com) will not be researched as implementation references, consistent with dropping module D — say if you want a brief, non-implementation competitive-landscape note on them anyway (e.g. purely for market-awareness, not design input).
