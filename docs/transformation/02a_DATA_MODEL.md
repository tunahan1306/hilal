# Phase 2a — Data Model & Migration Plan

Additive schema for modules A (Identity & Verification), B (Social Platform), C (Creator
Platform), E (Moderation & Trust extension), F (Payments & Billing extension), G (Country
Policy Engine generalization). Builds on [00_AUDIT.md](00_AUDIT.md)'s preserve/refactor split;
conventions taken from `supabase/migrations/20261016000001_init.sql`,
`20261025000001_country_publication_gate.sql`, and [DATABASE.md](../../DATABASE.md).

**Not touched:** `profiles`, `profile_images`, `profile_consents`, `verification_records`,
`membership_plans`/`subscriptions`, `countries.publication_status` /
`country_publication_decisions` (the admin-curated discovery product and its existing gate
keep working exactly as they do today). **Not designed:** anything for module D (independent
sex-worker advertising, service booking, sexual-service payment brokering) — permanently
excluded, no table/column/flag anywhere below exists for it.

## New RLS paradigm this introduces

Every existing non-reference table requires `is_admin() AND aal2` — because only staff use the
app today. End-users are a new `authenticated` population who must be able to read/write *their
own* rows without being admins. Every table below therefore uses a **self-owned-row** policy
shape (`auth.uid() = owner_column`) alongside the existing admin-aal2 override for moderation
access, as a new, parallel RLS pattern — not a replacement of the existing one.

```sql
-- shape used throughout below
create policy "owner rw" on public.<table> for all to authenticated
  using (auth.uid() = <owner_column>) with check (auth.uid() = <owner_column>);
create policy "admin read" on public.<table> for select to authenticated
  using (public.is_admin()); -- no aal2 requirement for read-only moderation visibility
```

---

## Module A — Identity & Verification

### `app_users`
End-user account, 1:1 with `auth.users`, deliberately separate from `admins`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `email` | citext unique | |
| `email_verified_at` | timestamptz | |
| `status` | enum `app_user_status` (`active`,`suspended`,`deleted`) | default `active` |
| `created_at`, `updated_at` | timestamptz | `set_updated_at()` trigger, existing convention |

RLS: owner select/update own row; admin `is_admin()` select (no aal2 — support needs read access
to investigate reports; admin cannot write this table directly, only via moderation actions).
Index: `app_users (status)` partial where `status <> 'active'` (moderation queue).
Retention: on `status = 'deleted'`, a scheduled job (same `/api/cron` pattern as
`VERIFICATION_DOC_RETENTION_DAYS`) nulls `email`, cascades per-table deletion rules below.
Audit: every status transition writes `audit_logs (actor_id, action='user.status_change',
entity_type='app_user', entity_id, metadata)`.

### `user_roles`
| Column | Type |
|---|---|
| `user_id` | uuid → `app_users(id)` on delete cascade |
| `role` | enum `user_role` (`member`, `creator`) |

PK `(user_id, role)`. A user becomes `creator` via `creator_accounts` approval (below), which
inserts the role row — the two are kept in sync at the service layer, not by a DB trigger, to
keep approval logic (and its audit trail) in `server/services`, consistent with how
`enforce_publish_preconditions` is DB-level but *approval decisions* (e.g. country decisions)
are app-initiated inserts.

### `age_verification_checks`
Result-only — **no raw document or biometric columns exist on this table, by design**, matching
the brief's requirement that verification artifacts live with the vendor.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `app_users(id)` on delete cascade | |
| `provider` | text | vendor name (e.g. `"yoti"`, `"ondato"`) — not a code enum, vendors will change |
| `provider_ref` | text | vendor's own case/session reference, opaque to us |
| `status` | enum `verification_status` (reuse existing type: `pending`,`approved`,`rejected`) | |
| `checked_at`, `expires_at` | timestamptz | re-verification cadence, vendor-defined |
| `note` | text | |

Index `(user_id, status, checked_at desc)`. No document retention column needed — there's nothing
retained here to delete. RLS: owner select-only (cannot write — only the service layer, via
`age_verification_provider` abstraction call result, inserts rows using service role).

### `consent_records`
Generalizes `profile_consents` for the new user population (ToS acceptance, data-processing
consent, marketing opt-in — NOT publication/photo-rights, which stay on `profile_consents` for
the admin-curated product).

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid → `app_users(id)` on delete cascade |
| `type` | text (`tos`, `privacy_policy`, `marketing`, `age_attestation`) |
| `granted_at` | timestamptz |
| `revoked_at` | timestamptz nullable |
| `method` | text |
| `evidence_ref` | text nullable |

Index `(user_id, type) where revoked_at is null` — same partial-index shape as
`profile_consents_profile_idx`.

### `privacy_requests` (modify, not new)
Add nullable `user_id uuid references app_users(id) on delete set null` alongside the existing
`profile_id`, plus `check (num_nonnulls(profile_id, user_id) = 1)` so one request always resolves
to exactly one subject. This is the one genuinely non-additive change in this document — flagged
explicitly, low risk (single nullable column + a check constraint, no data rewrite).

### Session security / MFA
No new table. End-users authenticate via Supabase Auth exactly like admins do; MFA state lives in
`auth.mfa_factors` (Supabase-managed). `app_users` needs no mirror column beyond what's already
derivable from the JWT — resist the urge to duplicate Supabase's own state.

---

## Module B — Social Platform

### `user_profiles`
Self-owned profile, separate from the admin-curated `profiles` table (different trust model,
per 00_AUDIT.md §"Components requiring refactor/extension").

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid unique → `app_users(id)` on delete cascade | |
| `handle` | citext unique | url-safe, validated at app layer |
| `display_name` | text | |
| `bio` | text | run through the existing multilingual content-policy scanner |
| `birth_date` | date | **not** exposed publicly; same posture as `profiles.birth_date` |
| `country_code` | text → `countries(code)` | self-declared; gates visibility, see Module G |
| `visibility` | enum `profile_visibility` (`public`,`followers_only`,`private`) | |
| `moderation_status` | enum (reuse admin product's `moderation_status` domain: `pending`,`approved`,`rejected`) | |
| `created_at`, `updated_at` | | |

RLS: owner all; admin read (no aal2, parity with `app_users`). A `user_profiles_public` view
mirrors `profiles_public`'s shape: `moderation_status = 'approved' AND visibility = 'public' AND
age >= 18 AND public.country_feature_publishable(country_code, 'social_profiles')` (new function,
Module G). Indexes: `handle` (unique, already indexed), `(country_code) where visibility =
'public'`.

### `follows`
`(follower_id, followee_id)` PK, both → `app_users(id)` on delete cascade, `created_at`, check
`follower_id <> followee_id`. Index on `followee_id` (follower-count queries). RLS: insert/delete
where `auth.uid() = follower_id`; select where `auth.uid() in (follower_id, followee_id)` or
target profile is public.

### `user_blocks`
`(blocker_id, blocked_id)` PK, same shape as `follows`. Enforced at the **query layer**
(repository functions exclude blocked pairs from message/follow/discovery results) — not just
RLS — mirroring how `profiles_public` bakes business rules into the view rather than trusting
callers to filter.

### `conversations` / `conversation_participants` / `messages`
- `conversations (id, created_at)`.
- `conversation_participants (conversation_id, user_id, joined_at, last_read_at)`, PK both cols.
- `messages (id, conversation_id, sender_id, body, created_at, deleted_at, moderation_status)`.
  `body` scanned by the existing content-policy scanner before insert (extended, Module E).

RLS: a user may select/insert into a conversation only if they appear in
`conversation_participants` for it (standard Supabase "membership" RLS pattern — `exists (select 1
from conversation_participants cp where cp.conversation_id = messages.conversation_id and
cp.user_id = auth.uid())`). Indexes: `messages (conversation_id, created_at)`,
`conversation_participants (user_id, conversation_id)`.

### `posts`
`(id, author_id → app_users, body, visibility, paid boolean default false, moderation_status,
created_at, updated_at)`. `paid` flags module-C paywalled posts; the actual paywall check joins to
`creator_subscriptions` at read time, not a column here.

### `media_assets`
`(id, owner_id → app_users, storage_path unique, url, kind enum('image','video'), width, height,
duration_seconds nullable, status enum('processing','ready','rejected'), rights_confirmed boolean
default false, moderation_status, created_at)`. Reuses the existing upload pipeline's EXIF/GPS
stripping and signed-URL conventions (`profile_images`'s pattern) — same bucket discipline, new
bucket name (e.g. `user-media`) since it's a distinct ownership/retention domain from
`profile-images`.

### `notifications`
`(id, user_id → app_users, type text, payload jsonb, read_at nullable, created_at)`. Index
`(user_id, read_at, created_at desc)`. Retention: hard-delete after e.g. 90 days read — exact
window is a product decision, not researched here; flagged open.

---

## Module C — Creator Platform

### `creator_accounts`
`(id, user_id unique → app_users, status enum('pending','active','suspended'), approved_by →
admins nullable, approved_at, created_at)`. Insert triggers the `user_roles` creator-role sync
(service layer, per Module A note above).

### `content_rights`
Per-media-asset rights evidence — models `profile_consents`/`verification_records`'s
evidence-pointer pattern exactly.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `media_asset_id` | uuid → `media_assets(id)` on delete cascade |
| `rights_type` | text (`self_generated`, `licensed`) |
| `evidence_path` | text nullable — private bucket, same as `consent-documents` |
| `confirmed_at` | timestamptz (creator self-attestation) |
| `reviewed_by` | uuid → `admins(id)` nullable |
| `reviewed_at` | timestamptz nullable |

A paid post's publish path should require `content_rights.reviewed_by is not null` before going
live, mirroring `enforce_publish_preconditions`'s pattern — implement as a trigger on `posts` once
Module C's publish rules are finalized in Phase 3, not specified further here.

### `creator_subscription_tiers` / `creator_subscriptions`
Deliberately **not** a reuse of `membership_plans`/`subscriptions` (those model admin-set
visibility packages for the discovery product; these model creator-defined paid content tiers —
different owner, different trust model, per 00_AUDIT.md).

- `creator_subscription_tiers (id, creator_id → creator_accounts, name, price_amount numeric,
  price_currency text default 'try', description, active boolean, created_at)`.
- `creator_subscriptions (id, subscriber_id → app_users, tier_id → creator_subscription_tiers,
  status enum('active','cancelled','expired'), starts_at, ends_at, auto_renew, external_ref text
  nullable — payment ledger ref, null until Module F goes live, created_at)`. Check `ends_at >
  starts_at` (same as `subscriptions`).

### `creator_payouts`
`(id, creator_id → creator_accounts, period_start date, period_end date, gross_amount numeric,
platform_fee_amount numeric, net_amount numeric, status enum('pending','paid','failed'),
external_ref text nullable, created_at)`.

---

## Module E — Moderation & Trust (generalize existing tables)

Per the binding decision, **alter** `moderation_reports`/`moderation_actions` in place rather than
building parallel tables — this is the one migration in this document that touches a live,
tested, production table, so it's written carefully:

```sql
-- moderation_reports
alter table moderation_reports
  alter column profile_id drop not null,
  add column content_type text not null default 'profile'
    check (content_type in ('profile','user_profile','post','message','media_asset','creator_account')),
  add column content_id uuid; -- no FK: spans multiple tables, same convention as audit_logs.entity_id
update moderation_reports set content_id = profile_id where content_type = 'profile';
alter table moderation_reports add constraint content_ref_present
  check (content_id is not null);
create index moderation_reports_content_idx on moderation_reports (content_type, content_id);

-- moderation_actions: same shape, same backfill
alter table moderation_actions
  alter column profile_id drop not null,
  add column content_type text not null default 'profile'
    check (content_type in ('profile','user_profile','post','message','media_asset','creator_account')),
  add column content_id uuid;
update moderation_actions set content_id = profile_id where content_type = 'profile';
alter table moderation_actions add constraint content_ref_present check (content_id is not null);
create index moderation_actions_content_idx on moderation_actions (content_type, content_id);
```

`profile_id` stays on both tables (nullable now) purely for backward-compat read paths already in
the codebase; new code should read/write through `content_type`/`content_id` exclusively. The
`report_category` enum gains new values for non-profile content (`harassment`, `spam`,
`csam_suspected`, keeping all existing values). The multilingual content-policy scanner (PR #3)
extends to scan `posts.body`, `messages.body`, and `user_profiles.bio` using its existing
interface — no schema change needed for that, it's a service-layer call site addition.

### `security_events`
`(id, event_type text, actor_type enum('user','admin','anon','system'), actor_id uuid nullable —
no FK, same cross-table reasoning as above, ip_hash text nullable, metadata jsonb default '{}',
created_at)`. Indexes `(event_type, created_at desc)`, `(actor_id, created_at desc) where actor_id
is not null`.

---

## Module F — Payments & Billing (extend, mock-only)

`PaymentProvider` (`src/server/payments.ts`) gains two methods beyond today's
`createCheckout`/`verifyWebhook`/`refund`: `initiatePayout(creatorId, amount)` and
`chargeOneOff(input)` (for tips/PPV, vs. `createCheckout`'s subscription framing) — interface
change only, still throws `PaymentsDisabledError` until a provider is approved, per existing
posture.

### `payment_transactions`
`(id, kind enum('subscription_charge','tip','ppv_purchase','payout','refund'), payer_id → app_users
nullable, payee_creator_id → creator_accounts nullable, amount numeric, currency text,
status enum('pending','succeeded','failed','refunded'), provider_name text, external_ref text,
metadata jsonb, created_at)`. This is the ledger — append-mostly; a `refunded` transaction is a
new row referencing the original via `metadata`, not an update to it (same immutability instinct
as `audit_logs`, enforced by convention here rather than a hard trigger since `status` does need
one real transition pending→succeeded/failed).

### `webhook_events`
`(id, provider_name text, external_event_id text, payload jsonb, processed_at timestamptz
nullable, created_at)`, **unique `(provider_name, external_event_id)`** — this unique constraint
*is* the idempotency guarantee the brief asks for.

---

## Module G — Country Policy Engine (generalize, run alongside the existing gate)

The existing `countries.publication_status` / `country_publication_decisions` mechanism
(PR #3) is **kept exactly as-is** — it governs the admin-curated discovery product only. A new,
parallel, generic engine governs every *new* module's features, built by literally copying that
migration's shape:

### `platform_features` (reference table)
`(code text PK, description text, created_at)`. Seed rows: `social_profiles`,
`private_messaging`, `digital_content`, `paid_subscriptions`, `paid_advertising`,
`platform_payments`. (Module D's two candidate rows — independent advertising, service
booking/payment brokering — are deliberately never seeded here.)

### `country_feature_policies`
`(country_code text → countries(code), feature_code text → platform_features(code), status text
not null default 'not_reviewed' check (status in ('not_reviewed','permitted','prohibited')),
review_due date, decision_id uuid)`, PK `(country_code, feature_code)`.

### `country_feature_decisions`
Line-for-line the same shape as `country_publication_decisions`: append-only (immutability
trigger identical), `permitted_requires_evidence` check identical, an `apply_country_feature_decision()`
trigger that updates `country_feature_policies` and writes `audit_logs` (same two-phase
`set_config` guard pattern to let the trigger — and only the trigger — write the derived table),
same owner-only (`admins.role = 'owner'`, aal2) insert RLS policy. `country_feature_publishable(country_code,
feature_code)` mirrors `country_publishable(country_code)` exactly, including the
`review_due >= current_date` fail-closed-on-expiry check.

Every new public view in Modules B/C (`user_profiles_public`, creator content read paths) calls
this function in its `where` clause, the same way `profiles_public` calls `country_publishable()`
— enforced at the view layer, not just in application code.

---

## Migration ordering

1. `app_users`, `user_roles`, `age_verification_checks`, `consent_records`, `privacy_requests`
   column addition (Module A) — everything else depends on `app_users` existing.
2. `platform_features`, `country_feature_policies`, `country_feature_decisions` + functions
   (Module G) — Modules B/C's public views depend on `country_feature_publishable()` existing.
3. `user_profiles`, `follows`, `user_blocks`, `conversations`/`conversation_participants`/
   `messages`, `posts`, `media_assets`, `notifications` (Module B).
4. `creator_accounts`, `content_rights`, `creator_subscription_tiers`, `creator_subscriptions`,
   `creator_payouts` (Module C) — depends on `media_assets` (step 3) and `app_users` (step 1).
5. `moderation_reports`/`moderation_actions` alteration, `security_events` (Module E) — depends on
   content tables existing in steps 3-4 so `content_type` values are meaningful (though the columns
   themselves could land earlier; doing it last avoids a window where `content_type` values
   reference not-yet-existing tables).
6. `payment_transactions`, `webhook_events` (Module F) — no dependents, can move earlier if useful,
   placed last here only because it's lowest-risk/most-isolated.

Each step is one migration file per existing one-concern-per-file convention. Rollback: every
migration here is additive (new tables, or nullable-column + check-constraint additions to
existing tables) except the `moderation_reports`/`moderation_actions` alteration, whose rollback
is `alter column profile_id set not null` + drop the new columns + drop the backfilled data —
safe only before any new-content-type report exists; document this window explicitly in that
migration's own comment, same style as the country-gate migration's operator warning comment.

## Open question (least certain decision in this document)

Whether to alter `moderation_reports`/`moderation_actions` in place (as designed above, per the
binding instruction) or freeze them for profile-only use and add a *new* parallel polymorphic pair
with a read-time `UNION` view for a unified admin queue. The in-place alteration is what was asked
for and is what's designed above, but it's a real ALTER on a live, DB-test-covered table
(`sql-tests/policies.test.sql` currently asserts things about these tables) — the migration must
ship alongside updated SQL tests, and the `profile_id`-vs-`content_id` dual-write during the
transition window is the kind of thing that's easy to get subtly wrong. Flagging for explicit
sign-off before Phase 3 implementation starts, not silently picking the parallel-table escape
hatch instead.
