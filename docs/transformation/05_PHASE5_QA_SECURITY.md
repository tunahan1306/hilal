# Phase 5 — QA / Security Review

## What Phase 5 actually is

Unlike Phase 4, Phase 5 has no scope sentence anywhere in this project's own planning docs.
This phase was scoped as: a structured security review plus a code-quality review over
everything built in Phase 3 (Module A identity/auth, Module B social, Module C creator
economy, Module E moderation generalization, Module F payments/billing, Module G country
policy engine), triage the findings, and fix the real/confirmed ones.

Review scope was `git diff feature/hilal-global-v2..HEAD` — 93 files, ~9300 insertions — not
`origin/main`, which would have pulled in the still-unmerged PR #3 (`feature/hilal-global-v2`
itself) as unrelated noise.

Method: 8 parallel review angles (line-by-line diff scan, removed-behavior audit, cross-file
call-site tracing, reuse, simplification, efficiency, altitude, CLAUDE.md conventions) plus a
dedicated security-focused pass, each candidate finding independently verified before being
accepted or refuted.

## Fixed

### Security

- **`sendMessage` fail-open PolicyGate bypass** — the sender's country/feature permission
  check was conditional on a profile lookup that could be absent, silently skipping the gate
  instead of denying. Made unconditional and fail-closed in
  [`src/server/services/social.ts`](../../src/server/services/social.ts).
- **Zero-media paid post bypassed rights review** — `allMediaRightsReviewed([])` is vacuously
  true for an empty array, so a paid post with no attached media skipped the content-rights
  gate entirely. Rejected at the service layer (`createPost`) and re-enforced as a second
  defense line in the `posts_public` view
  ([migration `20261027000007_phase5_security_fixes.sql`](../../supabase/migrations/20261027000007_phase5_security_fixes.sql)).
- **Suspended-account content stayed publicly visible** — `triageContentReport`'s
  `suspend_account` action only blocked login; it never hid the already-published profile or
  posts. `user_profiles_public` and `posts_public` views now join `app_users` and require
  `status = 'active'`.
- **Single-media-asset rejection didn't hide the post carrying it** — no read path checked
  `media_assets.moderation_status`; `posts_public` now excludes any post with a rejected
  media asset.
- **`creator_subscription_tiers` RLS gap** — the "authenticated read active tiers" policy
  only checked `active`, not `creator_accounts.status = 'active'` or
  `country_feature_publishable(..., 'paid_subscriptions')`, which the service layer enforces
  but RLS is the *only* real gate for anyone hitting Supabase's REST API directly with their
  own session JWT. Fixed via a `security definer` function
  `creator_tier_publicly_visible(p_creator_id uuid)` (required because the naive subquery was
  itself blocked by `creator_accounts`'s own RLS for non-owner viewers — same root cause as
  the pre-existing `is_conversation_participant()`/`enforce_message_not_blocked()` functions).
- **No `security_events` writer** — the table existed since Module A with zero code writing
  to it. Added `addSecurityEvent`/`listSecurityEvents` to the repository interface (Supabase +
  memory implementations) and a `logContentPolicyFindings` helper in `social.ts` that scans
  free-text user input (bios, messages, post bodies) through the existing
  `content-policy.ts` escalation scanner and logs findings there, non-blocking.
- **`CRITICAL_CONTENT_REPORT_CATEGORIES` was dead code** — defined but never read by the admin
  UI's "critical" badge/sort logic, which only checked the older profile-report category list.
  Added `isCriticalReport()` dispatching to the right list by content type; wired into both
  `src/app/admin/(panel)/page.tsx` and `.../sikayetler/page.tsx`.
- **No HTML/script injection guard on free-text fields** — bios, messages, and post bodies
  accepted raw HTML. Added a shared `noHtml` refinement (`src/domain/schemas.ts`) applied to
  `createUserProfileInputSchema`, `updateUserProfileInputSchema`, `sendMessageInputSchema`,
  `createPostInputSchema`, and `submitContentReportInputSchema.description`.
- **Case-sensitivity bug in two Supabase lookups** — `getAppUserByEmail` and
  `getUserProfileByHandle` used `.ilike`, which is substring-pattern matching, not an
  equality check; `.eq` is correct and avoids accidental partial matches.
- **`listMessages` didn't filter deleted/rejected messages** — added
  `.is("deleted_at", null).neq("moderation_status", "rejected")` (Supabase) and the
  equivalent predicate (memory repo).

### Correctness / reuse / quality

- **`followUser`/`blockUser` were not idempotent** — a second call threw a unique-constraint
  error instead of being a no-op; added existence checks before insert.
- **`submitContentReport`/`triageContentReport` duplicated content-existence + owner-lookup
  logic** — consolidated into one `resolveContentTarget(repo, contentType, contentId)` helper
  in `content-moderation.ts`.
- **Uncaught `ZodError` crashes in user-facing Server Actions** — found during manual
  browser verification of the `noHtml` fix above, *after* the structured review had already
  concluded: submitting a post body containing `<script>test</script>` crashed the whole
  `/hesap` route with a generic "A server error occurred" page instead of a graceful inline
  validation message. Root cause: `createPost`'s `.parse()` throws a raw `z.ZodError` on
  validation failure, and the `(user)` Server Action `run()` wrappers in
  [`social/actions.ts`](../../src/app/(user)/social/actions.ts) and
  [`creator/actions.ts`](../../src/app/(user)/creator/actions.ts) only caught `DomainError`,
  rethrowing everything else — unlike the admin panel's own `run()` wrapper
  (`src/app/admin/(panel)/actions.ts`), which already handled `z.ZodError` explicitly. This
  gap was latent pre-Phase-5 (none of these schemas' pre-existing constraints were reachable
  past client-side `maxLength`/`required` attributes), but the new `noHtml` refinement has no
  client-side equivalent, making it the first genuinely user-reachable trigger. Fixed by
  having both wrappers catch `z.ZodError` (surfacing `issues[0].message`) and fall back to a
  generic message + `logError` for any other unexpected error, matching the admin pattern.
  Verified live: resubmitting the same payload now returns `POST /hesap 200` with the inline
  "HTML karakterleri kullanılamaz" message instead of a 500.

## Deferred (documented, not fixed this phase)

- **Public `user-media` storage bucket** — flagged by the security review but not currently
  exploitable through any existing UI code path (no code constructs a guessable/enumerable
  URL to someone else's unpublished media today). Left as a known gap rather than rushed.
- **No auto-unpublish/auto-suspend circuit breaker for the 5 new content types** (posts,
  messages, profiles, media, subscription tiers) — the legacy profile product has this logic
  (N critical reports → automatic unpublish) but replicating it correctly for every new
  content type is substantial new logic in its own right; rushing it risks introducing new
  bugs. Left as a known, flagged gap for a future phase.

## Refuted (reviewed, not changed)

- **"Module G duplicates the country-policy engine"** (Reuse angle) — this reflects an
  explicit, user-approved Phase 2 architectural decision (country policy and feature policy
  are deliberately separate engines), not an oversight.
- **"`recordFeaturePolicyDecision` mirrors `recordCountryDecision`"** (Reuse angle) — same
  Phase 2 sign-off; not changed.

## Accepted as-is (minor, no action)

- Age-calculation discrepancy between two call sites (cosmetic, non-security).
- `reviewedBy`/`actorId` parameters accepted but not persisted in a couple of moderation
  helpers (noted, low impact).
- `setContentModerationStatus`'s if/else dispatch by content type (works correctly; a future
  refactor could table-drive it, not required now).

## Verification

Full loop run after every fix and again after the final `ZodError` fix:
`tsc --noEmit`, `npm run lint`, `npm test` (235/235 unit tests), `npm run test:db` (SQL policy
tests against disposable Postgres — all passed), `npm run build` (production build, clean),
and the `20261027000007_phase5_security_fixes.sql` migration applied to the real
`hilal-preview` Supabase project. The `noHtml`/`ZodError` fix was additionally verified live
in a dev server: submitting `<script>test</script>` as a post body now returns a graceful
inline error instead of crashing the route.
