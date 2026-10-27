# Phase 2c — Module Architecture & API Contracts

Companion to `02a_DATA_MODEL.md` (schema) and `02b_UX_DESIGN.md` (journeys/screens). This document
covers module boundaries, the generalized Country Policy Engine, Server Action contracts, the
`PaymentProvider` extension, and background jobs. Grounded in the actual conventions in
`ARCHITECTURE.md`, `src/domain/`, `src/server/`, and `supabase/migrations/20261025000001_country_publication_gate.sql`
(read directly, not from memory). Module D (independent sex-worker advertising, service booking,
sexual-service payment brokering) has no interface, hook, or extension point anywhere below —
permanently excluded, not deferred.

## 1. Module boundaries within the monolith

Same dependency direction as today: `app → server/services → server/repositories → domain`,
`domain` importing nothing. Each module gets its own slice of each layer; modules talk to each
other only through small typed ports defined in `domain/`, never by importing another module's
service directly.

```
src/domain/
  identity.ts         # module A: account/session/age-verification types + pure rules
  social.ts           # module B: follow/block/post/message types + pure rules
  creator.ts          # module C: creator account, content rights, subscription-tier types
  moderation.ts        # module E: polymorphic report/action types (extends existing moderation types)
  billing.ts           # module F: transaction/payout types
  policy.ts             # module G: PolicyGate port + decision types (the cross-cutting one)

src/server/services/
  identity/            # registration, login, age-verification orchestration
  social/              # follow, block, message, post, notification
  creator/             # creator account, content upload+rights, subscription tiers
  moderation/           # report triage, polymorphic action application
  billing/              # checkout, ledger, payout (mock)
  policy/                # decision recording + the PolicyGate implementation

src/server/repositories/   # one interface + Supabase/memory impl per module, same pattern as today
```

**The `PolicyGate` port** (module G) is the one interface every other module depends on — it is
the only officially-sanctioned way to ask "is this allowed here":

```ts
// src/domain/policy.ts
export type PolicyFeature =
  | "social_profiles" | "private_messaging" | "digital_content"
  | "paid_subscriptions" | "paid_advertising" | "platform_payments";
// Note: no "independent_advertising" or "service_booking" feature exists in this enum — module D
// is not a disabled feature, it is not a feature at all in this codebase.

export interface PolicyGate {
  isPermitted(countryCode: string, feature: PolicyFeature): Promise<boolean>;
  // Batch form for list/feed rendering — one round trip, not N.
  isPermittedBatch(countryCode: string, features: PolicyFeature[]): Promise<Record<PolicyFeature, boolean>>;
}
```

`server/services/policy/gate.ts` implements `PolicyGate` by calling a single DB function (see §2),
mirroring how `country_publishable()` is called today. Modules B/C/F call `PolicyGate` at the top
of every write path and every read path that renders gated content — they never query
`feature_policies` directly, same discipline as `assertAdmin()` being the only door into admin
state.

## 2. The generalized Country Policy Engine (module G), in depth

### 2.1 Decision recording — mirrors `country_publication_decisions` exactly

New table `feature_policy_decisions` (full DDL in `02a_DATA_MODEL.md`), same shape as the existing
one plus a `feature` column: append-only, `permitted` requires `evidence_ref` + `review_due`,
immutable via a `before update or delete` trigger that raises, and an `after insert` trigger that
derives `feature_policies.status` the same way `apply_country_decision()` does today — a decision
row is the only write path, the derived table can't be touched directly (`guard_*` triggers,
copied pattern).

```ts
// src/server/services/policy/decisions.ts
export async function recordFeaturePolicyDecision(input: {
  countryCode: string;
  feature: PolicyFeature;
  status: "not_reviewed" | "permitted" | "prohibited";
  approverName: string;
  evidenceRef?: string;      // required by DB constraint when status = "permitted"
  reviewDue?: string;        // required by DB constraint when status = "permitted"
  restrictions?: string;
  note?: string;
}, decidedBy: string): Promise<FeaturePolicyDecision>;
```

Same owner-role-only RLS policy as `country_publication_decisions` (`is_admin() AND decided_by =
auth.uid() AND admins.role = 'owner'`) — feature-policy decisions are not a thing a regular
moderator can make.

### 2.2 Enforcement at every layer

| Layer | Mechanism | Failure mode if skipped |
|---|---|---|
| **Server Action entry** | Every module's write Server Actions call `policyGate.isPermitted()` before `assertAdmin()`-equivalent user checks even run business logic — fail fast, same message shape as `PublishBlockedError` | A malicious/buggy client-side check gets bypassed by calling the action directly — this layer exists so that doesn't matter |
| **Service layer** | Domain-level pure function `evaluateFeatureReadiness()` (same shape as `evaluatePublishReadiness()`) takes `countryPermitted: boolean` as a required input, computed by the service calling `PolicyGate` — services cannot "forget" to check because the type requires the boolean | A new service added without wiring the gate — caught by the type signature requiring the field, not by code review discipline |
| **DB RLS / trigger** | A single SQL function `feature_publishable(country text, feature text)` — exact analogue of `country_publishable()` — called inside every new `*_public` view's `where` clause and inside a new `enforce_feature_gate()` trigger on every gated table's publish-equivalent column | Even a service-role bug or a future direct-SQL admin tool can't bypass this — matches today's defense-in-depth rationale in `ARCHITECTURE.md` |
| **Cached query layer (`"use cache"`)** | Cache tags are **feature+country scoped**, not just entity-scoped: `cacheTag(\`policy:${country}:${feature}\`)` in addition to the existing entity tags. `recordFeaturePolicyDecision()` calls `revalidateTag()` for that composite tag synchronously in the same service call, same urgency as today's "kaldırma kararlarının gecikmeden yansıması performanstan önceliktir" rule for `invalidatePublic()`. Static-shell pages for a feature+country pair are **not** prebuilt via `generateStaticParams` the way province pages are today — gated content must always pass through a dynamic check, PPR's static shell can only contain the never-gated chrome (nav, footer), never gated content itself | A stale cached page serves content from a country whose review just expired — this is the single most dangerous cache bug possible here, called out explicitly per the brief's own instruction that this risk needs addressing, not assumed away |
| **Sitemap / SEO** | `sitemap.ts` and per-page `generateMetadata()` call `isPermittedBatch()` for the relevant feature before including a URL or setting `index`; same `noindex` convention already used for soft-404'd/removed profiles extends to policy-closed content | A closed country's content gets indexed by a search engine and is discoverable even though the gate is "closed" in-app |
| **Background jobs** | Every cron/background job that *acts* on gated content (payout computation, content re-publish after a flag clears, moderation auto-actions) re-checks `PolicyGate` immediately before acting, not just at the time the job item was enqueued — a review can expire between enqueue and execution | A country's review expires mid-queue-processing and a background job still pays out / republishes based on stale state |

### 2.3 Expiry behavior

Same as today: `feature_publishable()` requires `status = 'permitted' AND review_due >= current_date`
— a lapsed review closes the feature automatically, no cron needed for correctness (though a daily
cron job, §5, proactively flags expiring-soon decisions to admins so lapses are a managed event,
not a surprise).

## 3. API contracts (Server Actions)

Same `run()`-wrapper pattern as `src/app/admin/(panel)/actions.ts`, but a **new** wrapper for
end-user actions (`runAsUser()`) since the admin wrapper's `assertAdmin()` doesn't apply — it calls
`requireUser()` (module A's equivalent) instead, and does **not** unconditionally
`invalidatePublic()` on every call (that was fine for an admin-only, low-volume action set; a
social platform's message-send volume would thrash the cache tag). Each module gets its own
`actions.ts` under `src/app/(user)/` / `src/app/(creator)/`, not one shared file.

Zod schema shapes (field names + types only — see `02a_DATA_MODEL.md` for the backing columns):

```ts
// module A — identity
registerInputSchema = z.object({ email: z.string().email(), password: z.string().min(12) });
verifyEmailInputSchema = z.object({ token: z.string() });
loginInputSchema = z.object({ email: z.string().email(), password: z.string() });
submitAgeVerificationInputSchema = z.object({ providerSessionRef: z.string() });
  // ^ the app never receives raw ID documents — only a provider session reference it exchanges
  //   server-side for a pass/fail result, per 02a's design constraint
userProfileInputSchema = z.object({ displayName: z.string().min(1).max(60), bio: z.string().max(2000).optional() });

// module B — social
followInputSchema = z.object({ targetUserId: z.string().uuid() });
blockInputSchema = z.object({ targetUserId: z.string().uuid(), reason: z.string().max(500).optional() });
sendMessageInputSchema = z.object({ conversationId: z.string().uuid(), body: z.string().min(1).max(4000) });
createPostInputSchema = z.object({ body: z.string().max(4000), mediaAssetIds: z.array(z.string().uuid()).max(10) });

// module C — creator
applyCreatorAccountInputSchema = z.object({ legalName: z.string(), countryCode: z.string().length(2) });
uploadContentInputSchema = z.object({ mediaAssetId: z.string().uuid(), rightsConsentId: z.string().uuid() });
  // ^ upload and rights-recording are two steps on purpose — content cannot be marked ready
  //   for sale without a rights record exactly like photo_rights_consent gates profile publish today
createSubscriptionTierInputSchema = z.object({ name: z.string().max(60), priceMinorUnits: z.number().int().positive(), currency: z.string().length(3) });

// module F — billing
createMockCheckoutInputSchema = z.object({ tierId: z.string().uuid(), customerEmail: z.string().email() });

// module E — moderation (extends existing)
submitReportInputSchema = z.object({
  contentType: z.enum(["user", "post", "message", "creator_content"]),
  contentId: z.string().uuid(),
  category: z.string(),   // reuses existing category enum, extended with content-scoped values
});
triageReportInputSchema = z.object({ reportId: z.string().uuid(), action: z.enum(["dismiss", "warn", "remove_content", "suspend_account"]) });

// module G — policy
recordFeaturePolicyDecisionInputSchema = z.object({
  countryCode: z.string().length(2),
  feature: z.enum(["social_profiles", "private_messaging", "digital_content", "paid_subscriptions", "paid_advertising", "platform_payments"]),
  status: z.enum(["not_reviewed", "permitted", "prohibited"]),
  approverName: z.string().min(2).max(120),
  evidenceRef: z.string().max(500).optional(),
  reviewDue: z.string().date().optional(),
});
```

All return shapes follow the existing `ActionResult = { ok: boolean; message: string; errors?:
...; data?: unknown } | null` convention — one shared type, not a new one per module.

## 4. `PaymentProvider` interface extension

Current interface (`src/server/payments.ts`) is checkout + webhook + refund, keyed on an existing
admin-curated `subscriptionId`/`amountTry`. The creator-economy extension needs: a currency-aware
amount (not TRY-only — this is a global platform now), idempotent webhook handling, and payout —
proposed as additive methods on the same interface rather than a new one, so a future real
provider only has to implement one contract:

```ts
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    referenceId: string;          // was subscriptionId — renamed, now covers any payable (subscription tier, one-off PPV)
    amountMinorUnits: number;      // was amountTry — currency-aware
    currency: string;              // ISO 4217
    customerEmail: string;
    idempotencyKey: string;        // NEW — caller-generated, persisted before the provider call so a retried
                                    // Server Action never double-charges even on a crash between provider call and DB write
  }): Promise<{ redirectUrl: string; externalRef: string }>;

  verifyWebhook(rawBody: string, signature: string): Promise<{
    externalRef: string;
    status: "paid" | "failed" | "refunded";
    idempotencyKey: string;        // NEW — provider echoes it back; service layer upserts on this key, not externalRef alone
  }>;

  refund(externalRef: string, amountMinorUnits?: number): Promise<void>;

  initiatePayout(input: {            // NEW — module C/F payouts
    payeeId: string;                  // creator_accounts.id
    amountMinorUnits: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ externalRef: string; status: "initiated" | "paid" | "failed" }>;
}
```

`payment_transactions` (see `02a_DATA_MODEL.md`) has a **unique constraint on `idempotency_key`**,
not just on `external_ref` — the webhook handler does `insert ... on conflict (idempotency_key) do
nothing` before applying any balance change, so a provider's at-least-once webhook delivery can
never double-credit. `MockPaymentProvider implements PaymentProvider` is the only implementation
shipped in this phase; it never contacts a network, just transitions state synchronously for
local/demo use, same spirit as the `memory` repository.

## 5. Background jobs

Extends the existing independent-`step()` pattern in `src/app/api/cron/route.ts` (one step's
failure doesn't block the others) — new steps are added to the same `Promise.all`, not a new cron
entry, unless volume later demands a separate schedule:

- `flagExpiringFeaturePolicies` — daily; finds `feature_policy_decisions` with `review_due` within
  N days and not yet re-decided, writes an admin-visible notice (not a hard action — expiry itself
  is handled live by `feature_publishable()`, this step is purely so expiry is never a silent
  surprise).
- `processModerationSlaBreaches` — daily; flags reports past their triage SLA (new column on the
  polymorphic `moderation_reports`, see `02a_DATA_MODEL.md`) for escalation.
- `computeCreatorEarningsSnapshots` — daily; aggregates `payment_transactions` into a
  per-creator-per-period read model for the earnings-report screen, rather than computing it live
  on every dashboard load.
- `reconcilePendingPayouts` — daily; re-checks `PolicyGate` for `platform_payments` in the payee's
  country immediately before advancing any payout past "initiated" — the re-check-before-acting
  requirement from §2.2, made concrete.

All four re-use `step()`'s try/catch-and-continue wrapper and `logError()` convention; none of them
need their own `CRON_SECRET`-equivalent auth since they live inside the existing authenticated
route.

## Open question (flagging, not deciding)

The cache-invalidation design in §2.2 assumes a **composite** cache tag
(`policy:{country}:{feature}`) in addition to today's entity tags, so revoking a country's
`paid_subscriptions` permission can invalidate every cached subscription-tier listing in that
country in one `revalidateTag()` call without enumerating entities. I have not verified this
composes cleanly with Next.js 16's Cache Components invalidation semantics at scale (how many
distinct tags a single page can depend on before tag-based invalidation becomes a performance
problem) — this needs a spike against the actual Next.js 16 docs in `node_modules/next/dist/docs/`
before being treated as settled, not just assumed from the existing single-tag `"public-profiles"`
pattern which never had to compose two independent invalidation axes before.
