# Phase 4 — Restricted Modules: Scope Note & Vendor-Selection Prep

## What Phase 4 actually is

The only place this project's own planning docs define Phase 4 is one sentence in
[`02_ARCHITECTURE.md`](02_ARCHITECTURE.md), §"Not designed in this phase, deliberately":

> real payment provider integration (mock only, per the brief), real age-verification vendor
> selection (the abstraction is designed; which vendor to actually contract with is a Phase
> 4+ operational decision informed by Phase 1's jurisdiction research), and anything for
> module D.

Phase 4 is **two business/legal decisions** — contracting a licensed payment processor, and
contracting an age-verification vendor — not a coding task, and not something an AI agent can
complete on the user's behalf: it requires signing a real commercial contract, passing that
vendor's own underwriting/compliance review, and accepting real legal exposure. (Module D has
no Phase 4 either way — it remains permanently out of scope per the decision recorded at the
start of this transformation.)

## What was actually done here

Rather than attempt to fabricate a vendor selection, this phase produced the two
decision-ready documents Phase 4 needs once the user is ready to act:

- [`docs/payments/PROVIDER_COMPARISON.md`](../payments/PROVIDER_COMPARISON.md) — Phase 1's
  four-processor research (CCBill, Segpay, Verotel, Epoch), now extended with a pros/cons
  shortlist, 8 direct vendor questions, and a procurement checklist. Also flags one small,
  still-open gap: the `PaymentProvider` interface actually shipped in Module F
  (`src/server/payments.ts`) didn't add the `chargeback`-as-distinct-from-`refund` status
  this doc's own earlier research recommended — worth folding in whenever a real processor is
  integrated, not before.
- [`docs/identity/AGE_VERIFICATION_PROVIDER_COMPARISON.md`](../identity/AGE_VERIFICATION_PROVIDER_COMPARISON.md)
  (new) — six age-assurance vendors (Yoti, Ondato, VerifyMy, AU10TIX, Veriff, Persona)
  researched against the ten already-legally-scoped jurisdictions, with the same pros/cons +
  questions + checklist shape. Headline findings:
  - **Germany is a hard pre-approval-list gate** (KJM), not a capability bar like every other
    jurisdiction researched — this is the single most consequential fact in that document.
  - **Ondato and Yoti are the two vendors with real evidence weight**, because
    `docs/research/COMPETITORS.md` (Phase 1) already established that OnlyFans, Fansly, and
    Fanvue use exactly these two vendors in production today — direct competitor evidence,
    not vendor marketing.
  - A 2024 Ofcom investigation into OnlyFans' own Yoti integration (a reported threshold
    misconfiguration) is recorded as a cautionary note: vendor choice doesn't substitute for
    verifying the actual configured implementation before launch.

Neither document picks a vendor. Both end in a checklist whose last item, in both cases, is
the same: the corresponding `*Disabled error` (`PaymentsDisabledError`,
`AgeVerificationDisabledError`) stays as the default until every item above it is checked —
not before.

## Where this leaves the project

Phases 0–3 (audit → research → design → core implementation, modules A/B/C/E/F/G) are
complete and merged into `feature/hilal-global-platform`. Phase 4 now has the research and
checklists it needs; executing it — contacting Yoti/Ondato and a shortlisted processor,
completing underwriting, and actually signing — is the user's own next step, on their own
timeline, outside this coding session. Phases 5 (QA/security) and 6 (delivery) remain
undefined in this repo's own docs (unlike Phase 4, they have no scope note anywhere at all)
and are the natural next thing to scope if work continues here.
