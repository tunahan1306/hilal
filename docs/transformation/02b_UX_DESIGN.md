# Phase 2b — User Journeys, Screen Map, Permission Matrix, Design System Extension

Grounded in [`00_AUDIT.md`](00_AUDIT.md), [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md), and [`DESIGN_RESEARCH.md`](../../DESIGN_RESEARCH.md). The existing admin-curated discovery product and its screens (`src/app/[lang]/(site)/*`, `src/app/admin/(panel)/*`) stay as-is and untouched; everything below is additive. Module D (independent sex-worker advertising, service booking, sexual-service payment brokering) has no screen, flow, or UI affordance anywhere in this document — not even a disabled one.

## 0. A design-system tension to resolve before Phase 3, not silently

`DESIGN_RESEARCH.md` §4 ("Kaçınılacaklar") explicitly tells this codebase to **avoid**: sexualizing framing/posing, "online now / available now"-style urgency indicators, and "price and 'VIP'-connoting luxury language" — because the existing product's own scope note (§0) is "yalnızca yasal, cinsel içerik taşımayan sosyal profiller" (only legal, non-sexual social profiles). That constraint was written for the admin-curated discovery product specifically.

The master brief's module C (Creator Platform) is, by definition, adult digital content with paid subscription tiers — "VIP" and premium framing is not a stylistic indulgence there, it's the actual product category the brief's module G jurisdiction research (Phase 1) is gating. Applying the existing "no VIP language" rule to the creator platform would contradict the brief; silently dropping the rule would contradict the existing, deliberately-written design research.

**Resolution proposed here (flag for your confirmation, not decided unilaterally):** the existing discovery product's screens and components keep every current constraint exactly as written — no VIP badges, no urgency indicators, no sexualized framing, full stop. The new Creator Platform surfaces get their **own** component variants (reusing the same token system, typography, and interaction patterns — §4 below) where VIP/premium-tier badges, subscription pricing, and adult-content framing are allowed because they describe a genuinely different, clearly-labeled product area a user has explicitly entered (not the discovery product bleeding into adult content). The two must never visually merge into one card type or one feed.

## 1. User journeys

### 1.1 Visitor (anonymous)
1. Lands on home/discover (existing, unchanged) or a new public creator-landing surface.
2. Browses creator previews (blurred/teaser media per `content_rights` visibility rules — never full paid content without auth).
3. Taps a creator profile → sees bio, public posts, subscription tiers, **not** paid content.
4. Hits a paywall on gated content → signup/login prompt, with the specific tier price shown (a Creator Platform screen, not a discovery-product one).
5. Edge states: creator account suspended → generic "unavailable" page (never a 404 that leaks the suspension reason); country policy closed for "digital content" in the visitor's detected country → noindex + a neutral "not available in your region" notice, same pattern as the existing country-publication-gate UI for discovery profiles.

### 1.2 New user (registration → first action)
1. Register (email + password or email magic link) → explicit age attestation at signup (checkbox) is **not** the age-verification gate itself — it's a placeholder until the real provider check runs, exactly like the existing "yaş kapısı" component already states self-declaration ≠ document verification.
2. Email verification (blocking — no further action until verified).
3. Age-verification step: redirect to/embed the pluggable age-verification provider (per Phase 2a's `age_verification_checks` design). Pending/failed/passed are three distinct, clearly-messaged states; failed does not say *why* in detail (avoid revealing verification-vendor internals) but gives a retry path and a support contact.
4. Profile setup (display name, avatar, optional bio) — note this is a **new, separate** `user_profiles` row, not the existing admin-curated `profiles` table.
5. First follow/discover action on the new social graph.
6. Edge states: age-verification pending for >X time → user can browse public/non-adult areas but every gated action re-prompts; account created in a country where "social profiles" itself is `RESTRICTED` or `UNKNOWN` per the Phase 1 jurisdiction matrix → registration itself should fail closed with a clear, non-judgmental message, not silently succeed into a half-working account.

### 1.3 Creator
1. Apply for a creator account from an existing verified user account (not a separate signup path — creators are users first). Application collects identity-verification confirmation (already done at user level) plus content-rights/consent attestation.
2. Admin/moderator review queue (human-in-the-loop, per the brief's explicit "no AI-only verdict" rule for risk-sensitive decisions) approves or requests more info.
3. Creator profile setup: display info, subscription tier definitions (name, price, description — mock billing only).
4. Content upload: media + a mandatory rights/consent record per item before it can be marked for sale (the `content_rights` table from Phase 2a is the enforcement point, mirroring the existing `publishing.ts` precondition pattern).
5. Content review queue (content-policy scanner + human moderation for anything flagged) before it's purchasable, not just before it's "published" in a generic sense.
6. First sale → mock checkout → transaction ledger entry → (mock) payout accrual.
7. Edge states: content rejected → specific, actionable reason surfaced in the creator dashboard, not a silent disappearance; creator account suspended mid-subscription-cycle → existing subscribers see a clear "creator account under review" state, not broken/missing content; a feature (e.g. "paid digital subscriptions") is `RESTRICTED`/`UNKNOWN` for the creator's declared country → creator onboarding stops at that step with the reason, doesn't let them configure pricing for a jurisdiction that can't legally serve it yet.

### 1.4 Existing admin-curated profile flow
Unchanged. Coexists as a separate, parallel surface (`profiles` + `profiles_public` view + existing admin panel under `/admin/profiller`). A visitor can encounter both an admin-curated profile and a self-service creator profile; the UI must make which kind of profile they're looking at unambiguous (different card/detail template, not just a badge) so the existing product's "no VIP/urgency language" rule is never accidentally violated by a creator-platform component reused in the wrong context.

### 1.5 Moderation (report → triage → action → appeal)
1. Any user/creator/content can be reported (polymorphic report, per Phase 2a's generalized `moderation_reports`) with a reason category.
2. Report lands in a moderator queue (extends the existing admin `sikayetler` pattern, generalized to new content types) — triaged by severity, not FIFO-only.
3. Human moderator action: dismiss, warn, remove content, suspend account, or (for anything with a trafficking/exploitation signal) escalate to a separate, higher-priority queue per the brief's explicit rule that such cases are never resolved by AI judgment alone.
4. Actioned party is notified with the reason and an appeal path.
5. Appeal reopens the case for a *different* moderator (not the original actor) to review.
6. Edge states: repeat-offender pattern across multiple reports → surfaced as a priority signal in the queue, not just counted; appeal windows expiring → auto-resolve to the original decision, logged, not silently dropped.

### 1.6 Admin: managing the generalized country policy engine
1. Admin opens the (extended) `/admin/ulkeler`-style screen, now per-feature instead of publication-only.
2. For a given country × feature cell currently `not_reviewed`, admin attaches an evidence reference (document/link), sets reviewer, decision authority, review date, and expiry — mirroring the exact existing `country_publication_decisions` fields (append-only, no silent edits).
3. Setting a feature to `permitted` requires the evidence reference field to be non-empty (DB-enforced, same pattern as today) — the UI should make it structurally impossible to approve without evidence, not just conventionally discouraged.
4. On `review_due` lapsing, the feature auto-reverts to closed for that country (fail-closed), and the admin sees this clearly represented, not as a silent background change.
5. Reviewing a creator payout (mock): admin sees the transaction ledger, flags anomalies, approves/holds (mock-only, no real money movement in this phase).

## 2. Screen map

Legend for "Reachable by": `Anon` = anonymous visitor, `User` = verified registered user, `Creator` = user with an approved creator account, `Mod` = moderator admin sub-role, `Admin` = full admin (existing `admins` table).

### Public
| Screen | Purpose | Key states | Reachable by |
|---|---|---|---|
| Home / Discover (existing) | Unchanged | — | Anon, User |
| Creator discover (new) | Browse creator previews | loading skeleton, empty (no creators in region yet), error-retry, country-closed notice | Anon, User |
| Creator profile detail (new) | Public bio, posts, tier list, paywalled-content teaser | loading, suspended-creator, country-closed | Anon, User |
| Social feed (new) | Posts from followed users/creators | loading, empty ("follow someone to see posts here"), error-retry | User |
| Login / Register (new, separate from admin `/admin/giris`) | Account entry | validation errors, rate-limited, account-locked | Anon |
| Age verification (new) | Provider hand-off/embed | pending, failed+retry, passed | User (post-registration) |
| Security center (existing `safety`) | Unchanged | — | Anon |
| Report/complaint (new, generalized) | File a report on any content/user type | submitted confirmation, duplicate-report notice | Anon (limited), User |
| Membership plans (existing `packages`) | Unchanged (admin-curated product's plans) | — | Anon |

### User
| Screen | Purpose | Key states | Reachable by |
|---|---|---|---|
| Dashboard | Overview: follows, notifications, subscriptions | empty-state per widget | User |
| Profile settings | Edit `user_profiles` row | unsaved-changes guard (reuse existing `ActionForm` pattern) | User |
| Messages | Conversations list + thread | empty, blocked-counterpart notice, rate-limited | User |
| Following / Followers | Social graph management | empty, blocked-user filtering | User |
| Notifications | Activity feed | empty, mark-all-read | User |
| Privacy settings | Visibility, blocks, data export/delete request (reuse existing `privacy_requests` pattern) | export-in-progress, delete-confirmation (destructive-action pattern per `DESIGN_SYSTEM.md`) | User |

### Creator
| Screen | Purpose | Key states | Reachable by |
|---|---|---|---|
| Creator application | Apply for creator status | pending-review, rejected+reason, approved | User (pre-creator) |
| Content management | Upload/manage posts & paid content | upload-progress, scan-pending, rejected+reason | Creator |
| Content calendar | Schedule posts | empty, conflict warnings | Creator |
| Subscription tier management | Define/edit paid tiers | validation (can't price below floor, can't publish tier if jurisdiction blocks "paid digital subscriptions" for declared country) | Creator |
| Finance / payout reports (mock) | Earnings, mock payout status | empty (no sales yet), reconciliation-pending | Creator |
| Verification/identity status | Shows current age/identity verification state | pending, passed, failed+retry — never shows raw verification data, only status | Creator |
| Content rights | Per-item consent/rights record | missing-consent blocks publish (hard gate, not a warning) | Creator |

### Admin (extends existing `/admin/(panel)/*`)
| Screen | Purpose | Key states | Reachable by |
|---|---|---|---|
| User management (new) | Manage `user_accounts`/`user_profiles` | suspend/reinstate with reason (destructive-action pattern) | Admin |
| Profile/creator verification queue (new) | Approve/reject creator applications | empty queue, escalated-case highlighting | Mod, Admin |
| Moderation queue (extends `sikayetler`) | Polymorphic report triage | severity sort, repeat-offender flag, escalation path | Mod, Admin |
| Country policy engine (extends `ulkeler`) | Per-feature country decisions | evidence-required validation, expiry countdown, fail-closed indicator | Admin (decision authority only — not Mod) |
| Feature flags (new) | Toggle modules/features globally (distinct from per-country policy) | — | Admin |
| Payments (mock) dashboard (new) | Transaction ledger, payout review | anomaly flags | Admin |
| Finance reports (new) | Aggregate mock revenue reporting | — | Admin |
| Complaints (extends `iletisim`/`sikayetler`) | Unchanged pattern, generalized content types | — | Mod, Admin |
| Audit logs (extends `denetim`) | Unchanged, now covers new mutation paths too | — | Admin |
| System health (new) | Cron/job status, error rates | — | Admin |

## 3. Permission matrix

Rows = capability, columns = role. `✅` allow, `—` deny, `cond.` = conditional (see note). This must be enforced at **every** layer per the existing pattern (service-layer assertion + RLS + `*_public` views for anonymous reads), not just hidden in the UI — the existing admin model already proves UI-only hiding is not the security boundary here.

| Capability | Anon | User | Creator | Mod | Admin |
|---|---|---|---|---|---|
| View public discovery (existing product) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View public creator previews | ✅ | ✅ | ✅ | ✅ | ✅ |
| View/purchase paid creator content | — | cond.¹ | cond.¹ | — | — |
| Follow / message / block | — | ✅ | ✅ | — | — |
| Upload creator content | — | — | ✅ | — | — |
| Define subscription tiers / pricing | — | — | ✅ | — | — |
| File a report | cond.² | ✅ | ✅ | ✅ | ✅ |
| Triage/action moderation reports | — | — | — | ✅ | ✅ |
| Escalate a trafficking/exploitation-signal case | — | — | — | ✅ | ✅ |
| Resolve an escalated case (final call) | — | — | — | — | ✅ |
| Change a country's feature policy decision | — | — | — | — | ✅ |
| View audit logs | — | — | — | cond.³ | ✅ |
| Manage existing admin-curated `profiles` | — | — | — | — | ✅ (unchanged) |
| Manage `admins`/role assignment | — | — | — | — | ✅ |

¹ Conditional on: age-verification passed, the creator's declared country having "Paid digital subscriptions" not `RESTRICTED`/`not_reviewed`-closed for the purchaser's detected country, and mock-payment success.
² Anonymous reporting allowed for safety-critical categories only (e.g. "this appears to be a minor," "this appears to be non-consensual") — rate-limited harder than authenticated reporting to resist abuse, per existing rate-limiting conventions.
³ Moderators see audit log entries relevant to their own actions and escalation chain, not the full admin-wide log (least-privilege, distinct from `Admin`'s full view).

**Open design question:** does `Mod` need to be a real new row in an `admins`-adjacent table (a proper least-privilege role) or can it launch as "all current `admins` act as both Mod and Admin" until the moderation queue's volume justifies the split? Recommend the latter for an initial build (matches the audit's note that today's admin population is "dozens of trusted staff," not yet large enough to need the split) but the schema (Phase 2a) should not make adding the split later expensive.

## 4. Design system extension

Everything below **extends** `DESIGN_SYSTEM.md`'s existing OKLCH token set and `DESIGN_RESEARCH.md`'s typography/layout system — it does not replace them, and the existing discovery product's screens pull zero new tokens from this section.

### 4.1 The brief's palette request is already mostly satisfied
The brief asks for "dark theme, controlled bordeaux/purple/gold accents." The existing palette (`DESIGN_SYSTEM.md` §OKLCH tokens) already is: gece eriği (night-plum, a dark purple-black) as base, bordo (burgundy) and ahududu (raspberry, reads as magenta/purple) as primary accents, and şampanya (champagne/gold) as a tertiary accent. **No new accent hues are needed.** What's missing is a second *usage context* for the same tokens:

- **Discovery-product usage (existing, unchanged):** restrained — accents used sparingly for focus rings, verification badges, and sponsor tags only, per the existing "no VIP luxury language" rule.
- **Creator-platform usage (new):** the same tokens get a more confident treatment for tier badges, paywall framing, and premium-tier call-to-actions — because this surface is explicitly describing a paid product tier, which the discovery product deliberately is not. Define this as a new token layer, e.g. `--creator-accent-*` aliasing the same OKLCH values as `--accent-*` so a future palette change stays in one place, with usage rules documented separately from the discovery product's "restrained" rule.

### 4.2 New component variants needed (additive to existing component list in `DESIGN_SYSTEM.md` §Bileşenler)
- **Tier badge / price chip** — for subscription tiers, uses `--creator-accent-gold` background, follows existing chip radius/sizing conventions (`rounded-full`, `min-h-11` touch target).
- **Paywall card** — a blurred/teased media card with a lock affordance and tier price; must use the *same* 4:5 photo-card aspect-ratio discipline already established (`DESIGN_SYSTEM.md` "Izgara" rule) so creator-platform grids don't visually fragment from the rest of the product's grid language.
- **Creator dashboard shell** — per the brief's "professional dashboard" ask: follow the existing admin panel's data-table density/typography conventions from `DESIGN_RESEARCH.md` §2.8/§3.9 (Geist/Geist Mono only, no serif, tabular numerals for earnings figures) rather than inventing a third visual register. A creator dashboard is a SaaS surface, not an editorial one, same as the admin panel.
- **Verification status indicator** — passed/pending/failed states, reusing the existing "yaş kapısı" full-screen gate's visual language (it already establishes how this product communicates a hard, document-backed gate vs. a soft checkbox).
- **Content-rights/consent checklist** — a form pattern, not a new visual language; reuse existing form conventions (`aria-invalid`/`aria-describedby`, first-error-focus) from `DESIGN_SYSTEM.md` §Ortak bileşenler.
- **Country-closed notice** — already effectively exists as the discovery product's country-gate notice pattern; extend it to be feature-aware ("Paid subscriptions aren't available in your region yet" vs. a generic message) rather than inventing a new component.

### 4.3 Mobile/PWA
Existing mobile bottom-nav (4 items, per `DESIGN_RESEARCH.md` §2.7) should **not** grow past 5 items when creator-platform entries are added — recommend a 5th item ("You"/account hub) that itself branches to messages/notifications/creator-dashboard, rather than adding separate top-level tabs for each new module. This matches the existing NN/g-sourced guidance already in the research doc about tab-bar item limits.

### 4.4 What this section explicitly does not do
It does not redesign the admin panel's existing look, does not introduce a third font family, does not add urgency/"online now" indicators anywhere (brief's module C doesn't ask for them, and the existing research explicitly flags them as to-avoid), and does not create any screen or component for module D.

## Open question for the user

The §0 tension (existing "no VIP/luxury language" discovery-product rule vs. the brief's adult creator-platform needing exactly that framing) is a real product-identity decision, not a styling detail — confirm the proposed resolution (two clearly-separated visual registers sharing one token system) before Phase 3 implementation locks in component names and class conventions.
