# Phase 2 — Product & System Design (Master Document)

Synthesizes [`02a_DATA_MODEL.md`](02a_DATA_MODEL.md), [`02b_UX_DESIGN.md`](02b_UX_DESIGN.md), and
[`02c_MODULE_ARCHITECTURE.md`](02c_MODULE_ARCHITECTURE.md). Read this file first for the whole
picture; drill into the three sub-documents for implementation-level detail. Builds directly on
[`00_AUDIT.md`](00_AUDIT.md)'s preserve/refactor findings.

## 1. Executive summary

This phase designs the additive build-out of modules A (Identity & Verification), B (Social
Platform), C (Creator Platform), E (Moderation & Trust extension), F (Payments & Billing
extension), and G (Country Policy Engine generalization) on top of the existing admin-curated
discovery product, which is **not modified or replaced** — it keeps its own tables, screens, and
country-publication gate exactly as they are today. **Module D (independent sex-worker
advertising, service booking, sexual-service payment brokering) has no design anywhere in this
phase** — no table, no screen, no interface, no "disabled by default" hook — because it directly
conflicts with this repository's existing product rule and was permanently excluded by decision
before Phase 1 research began.

## 2. Cross-document consistency check

The three sub-documents were produced independently and largely agree with each other: the
six `PolicyFeature` codes match exactly between `02a`'s seeded `platform_features` rows and
`02c`'s TypeScript union; every write-capable screen in `02b` has a corresponding Server Action
schema in `02c`; and `02b`'s own open question about whether `Mod` needs a schema-level role is
consistent with `02a` not having designed one yet — both documents independently arrived at
"not yet, defer it," which is agreement, not an oversight.

Two real inconsistencies were found and need resolution before Phase 3:

1. **Naming mismatch in the Country Policy Engine generalization.** `02a` names the new tables
   `country_feature_policies` and `country_feature_decisions`, with a DB function
   `country_feature_publishable()`. `02c` refers to the same concepts as `feature_policies`,
   `feature_policy_decisions`, and `feature_publishable()` — shorter names for the same design,
   not a different design (the column shapes, append-only/evidence-required behavior, and
   trigger pattern described in both are identical). **Resolution: adopt `02a`'s names as
   canonical** (they more explicitly signal lineage from the existing
   `country_publication_decisions` pattern, which matters for a reader scanning
   `supabase/migrations/`); `02c` should be read with that substitution in mind, and Phase 3
   migration/code work must use `02a`'s names, not `02c`'s.
2. **Scope gap: `02b`'s admin "Feature flags" screen has no backing design.** `02b`'s screen map
   lists a new admin screen to "toggle modules/features globally (distinct from per-country
   policy)," but neither `02a` (no table) nor `02c` (no Server Action, no mention in the
   `PolicyGate` design) designed anything for it. The per-country `PolicyGate` already provides
   the project's actual gating mechanism; a second, orthogonal global-toggle system wasn't asked
   for in the original brief and would be an unrequested abstraction. **Recommendation: cut this
   screen from the Phase 2 scope.** If a genuine need for a global (non-country-specific) kill
   switch emerges later, design it then, against a real requirement, rather than building it
   speculatively now.

Two minor, non-blocking gaps for Phase 3 to fill in rather than re-litigate: `02b`'s "Content
calendar" (post scheduling) screen has no corresponding Zod schema in `02c` yet (no
`scheduledAt`-bearing input), and `02a`'s `content_rights` table has no explicit
`recordContentRightsInputSchema` counterpart in `02c` (only implied via
`uploadContentInputSchema`'s `rightsConsentId` field). Neither changes the architecture — they're
just under-specified at the contract level.

## 3. Architecture overview (condensed from 02c)

Same layering as today: `app → server/services → server/repositories → domain`, with `domain/`
staying framework- and DB-free. Each module (A/B/C/E/F/G) gets its own slice of every layer and
modules talk to each other only through small typed ports in `domain/`, never by importing
another module's service directly.

The one interface every other module depends on is the **`PolicyGate` port** (module G):
`isPermitted(countryCode, feature)` / `isPermittedBatch(...)`. It is the only sanctioned way any
module asks "is this allowed here," enforced at **six layers**, not just the UI:

1. Server Action entry (fail fast, before business logic runs)
2. Service layer (a pure function requires the permission boolean as a typed input — can't be
   forgotten, the compiler enforces it)
3. DB RLS / trigger (`feature_publishable()`/`country_feature_publishable()` — naming per §2 — in
   every gated view's `where` clause; defense-in-depth even against a service-role bug)
4. Cached query layer — **the layer needing the most care**: cache tags must be
   feature+country-scoped (`policy:{country}:{feature}`) in addition to entity tags, so revoking
   one country's permission invalidates everything in one call; gated content is never part of a
   prebuilt static shell, only the never-gated chrome is
5. Sitemap/SEO — closed-country content is excluded from `sitemap.ts` and gets `noindex`, same
   convention the existing country-publication gate already uses
6. Background jobs — every job that *acts* on gated content re-checks the gate immediately before
   acting, not just at enqueue time, since a review can expire mid-queue

Decision recording mirrors `country_publication_decisions` line-for-line: append-only, `permitted`
requires evidence + a review-due date, immutable once written, owner-role-only RLS. This is a
genuine generalization of an already-proven pattern, not a new design.

**Flagged, not assumed:** whether the composite `policy:{country}:{feature}` cache tag scheme
composes cleanly with Next.js 16 Cache Components' invalidation semantics at scale needs a
technical spike against `node_modules/next/dist/docs/` before Phase 3 implementation treats it as
settled.

## 4. Data model summary (condensed from 02a)

~20 new tables across the six modules, plus one modified table (`privacy_requests` gains a
nullable `user_id` alongside its existing `profile_id`) and one altered pair
(`moderation_reports`/`moderation_actions`, generalized to be polymorphic). Nothing in the existing
admin-curated `profiles`/`profile_images`/`profile_consents`/`membership_plans`/`subscriptions`
tables changes.

The two riskiest schema decisions, both explicitly flagged by `02a` for sign-off rather than
silently decided:

- **A new "self-owned-row" RLS pattern** (`auth.uid() = owner_column`) runs alongside the existing
  admin-aal2 pattern, because end-users are a genuinely new, much larger population that isn't
  staff. This is additive and low-risk on its own.
- **Altering `moderation_reports`/`moderation_actions` in place** (nullable `profile_id` +
  new `content_type`/`content_id` columns + backfill) touches a live, DB-test-covered production
  table. The alternative — freezing those tables for profile-only use and adding a new parallel
  polymorphic pair with a read-time `UNION` view — was available and *not* chosen, because the
  brief asked for generalization in place. This is a real, non-trivial migration risk, not a
  routine additive change.

## 5. UX summary (condensed from 02b)

6 user journeys (visitor, new-user registration/verification, creator onboarding-to-payout,
the existing admin-curated flow coexisting unchanged, moderation report-to-appeal, and admin
management of the generalized policy engine), ~27 screens across Public/User/Creator/Admin groups,
and a 5-role (Anon/User/Creator/Mod/Admin) × 14-capability permission matrix enforced at every
layer — matching the existing project's proven stance that UI-only hiding is never the real
security boundary. Full detail, edge states, and the design-system extension (which needs **no new
accent colors** — the existing dark/bordeaux/purple/gold palette already satisfies the brief; what's
new is a second, more confident *usage context* for the same tokens on Creator Platform surfaces
only) are in `02b_UX_DESIGN.md`.

## 6. Three decisions needing your explicit sign-off before Phase 3 starts

**1. Design-system register split for the Creator Platform.** The existing discovery product's
design research explicitly bans "VIP"/luxury language and urgency indicators — written for a
product that is deliberately non-sexual. The brief's Creator Platform module is adult subscription
content, where tier/premium framing is the actual product category. *Recommendation:* keep the
discovery product's screens under their current, unchanged rule with zero exceptions, and give the
new Creator Platform surfaces their own component variants (same token system, new usage
context) that are clearly, structurally distinct — never a shared card type or feed. This is a
product-identity call, not a styling detail; please confirm or redirect before Phase 3 locks in
component names.

**2. In-place alteration of `moderation_reports`/`moderation_actions`.** *Recommendation:* proceed
with the in-place alteration as designed in `02a` (nullable-column + backfill + new
`content_type`/`content_id` columns), but require that the migration ships together with updated
`sql-tests/policies.test.sql` coverage and a documented rollback window, and that it lands early in
Phase 3 (before much new code depends on the new shape) rather than late. Please confirm this is
an acceptable risk to take on a live, tested table, versus the parallel-table escape hatch
mentioned above.

**3. Cut the "global feature flags" admin screen from scope** (§2 above) in favor of relying
entirely on the per-country `PolicyGate`. *Recommendation:* yes, cut it — it wasn't requested by
the original brief and the per-country engine already covers the real gating need. Flagging for
your confirmation rather than silently dropping something `02b` had included.

## 7. Phase 3 readiness

**Unblocked, can start once the above are confirmed:** Module G (Country Policy Engine
generalization) and Module A (Identity & Verification) have no open design questions beyond the
three sign-offs above and can begin migration + service implementation first, since every other
module depends on both (`PolicyGate` and `app_users` respectively) per `02a`'s migration ordering.

**Blocked pending sign-off:** Module E's schema change (item 2 above) should not be migrated until
explicitly confirmed, given it touches a live table. The Creator Platform's component layer
(Module C's UI, not its data model or services) should not start visual implementation until item 1
is confirmed, to avoid rework on component naming/class conventions.

**Not designed in this phase, deliberately:** real payment provider integration (mock only, per the
brief), real age-verification vendor selection (the abstraction is designed; which vendor to
actually contract with is a Phase 4+ operational decision informed by Phase 1's jurisdiction
research), and anything for module D.
