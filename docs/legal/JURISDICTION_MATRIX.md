# Jurisdiction Matrix — Feature × Country

Synthesis of the 10 country research files in `docs/legal/`. This is a **map of research
findings, not a permission grid.** No cell below is `APPROVED` — that status does not appear
anywhere in this document, by design, because it can only be set through actual legal counsel
review plus applicable permits plus a recorded operator decision (see "How this feeds the
Country Policy Engine" below). Accessed date for all underlying research: 2026-10-27.

## Legend

| Status | Meaning |
|---|---|
| `RESTRICTED` | A specific, named legal gate exists and is actively enforced — not a generic "get it reviewed" item. The feature cannot be served in that country until the named requirement (e.g. a specific age-verification method) is met. |
| `REQUIRES_LEGAL_REVIEW` | A relevant legal framework was identified and at least partially researched, but no counsel has reviewed it against this specific product and no decision has been recorded. |
| `UNKNOWN` | Research either found nothing specific, or found conflicting/low-confidence sources that could not be resolved. Absence of a finding is **not** evidence the feature is unrestricted. |
| `N/A — EXCLUDED` | Module D functionality (independent sex-worker advertising, service booking, sexual-service payment brokering). Permanently out of scope for this project; not researched for any country; included here only so the matrix isn't mistaken for having forgotten it. |

**Fail-closed default:** every cell defaults to behaving like `not_reviewed` in the existing
country-publication-gate design (`countries.publication_status`, see
[`docs/transformation/00_AUDIT.md`](../transformation/00_AUDIT.md)) until a real decision is
recorded. Nothing in this document changes that default for any country.

## Matrix

Each cell links to the relevant section of that country's file rather than restating the finding.
"§N" refers to the numbered topic in that file (topics 1–15 per file).

| Feature | Belgium | Netherlands | Germany | UK | Switzerland | Austria | New Zealand | Australia | US | Canada |
|---|---|---|---|---|---|---|---|---|---|---|
| **Social profiles & digital content** ([BE](BELGIUM.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [NL](NETHERLANDS.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [DE](GERMANY.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [UK](UK.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [CH](SWITZERLAND.md#1-legal-status-of-adult-digital-content-platforms) §1 / [AT](AUSTRIA.md#1-legal-status-of-adult-digital-content-platforms) §1 / [NZ](NEW_ZEALAND.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [AU](AUSTRALIA.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [US](US.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1 / [CA](CANADA.md#1-legal-status-of-adult-digital-content-platforms-onlyfans-style) §1) | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | **RESTRICTED** | REQUIRES_LEGAL_REVIEW | UNKNOWN | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW |
| **Private messaging** (§4 in each file) | UNKNOWN | UNKNOWN | UNKNOWN | REQUIRES_LEGAL_REVIEW | UNKNOWN | UNKNOWN | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | UNKNOWN | REQUIRES_LEGAL_REVIEW |
| **Paid digital subscriptions** (same legal basis as row 1 — subscription monetization doesn't change the underlying content-legality question) | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | **RESTRICTED** | REQUIRES_LEGAL_REVIEW | UNKNOWN | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW |
| **Paid advertising / premium features (VIP, sponsored ranking)** (§2–3 in each file) | UNKNOWN | UNKNOWN | UNKNOWN | REQUIRES_LEGAL_REVIEW | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| **Platform operator licensing** (§5 in each file) | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW / RESTRICTED (adult) | REQUIRES_LEGAL_REVIEW | UNKNOWN | REQUIRES_LEGAL_REVIEW (AMD-G/KommAustria) | UNKNOWN | REQUIRES_LEGAL_REVIEW | UNKNOWN | UNKNOWN |
| **Age verification (cross-cutting gate — blocks every row above until satisfied)** (§12 in each file) | REQUIRES_LEGAL_REVIEW (EU DSA, active) | REQUIRES_LEGAL_REVIEW (EU DSA, active) | **RESTRICTED** (JMStV §4(2), KJM-approved method required) | **RESTRICTED** (OSA, active, fines issued) | UNKNOWN (weakest sourcing — treat as priority, not low-risk) | REQUIRES_LEGAL_REVIEW (pending mandate, ~2027) | UNKNOWN (no law found — not the same as confirmed absence) | REQUIRES_LEGAL_REVIEW (binding **9 Mar 2026**) | REQUIRES_LEGAL_REVIEW (state patchwork, post-*Paxton*) | UNKNOWN (Bill S-210, not yet law) |
| **Platform payments / payout infrastructure** (module F — mock-only today; §13 in each file + [`docs/payments/PROVIDER_COMPARISON.md`](../payments/PROVIDER_COMPARISON.md)) | UNKNOWN | UNKNOWN | UNKNOWN | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | REQUIRES_LEGAL_REVIEW | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| **Independent advertising (module D)** | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED |
| **Service booking / payment brokering for sexual services (module D)** | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED | N/A — EXCLUDED |

## Company-formation feasibility (separate axis — see [`COMPANY_FORMATION.md`](COMPANY_FORMATION.md))

This is a different question from "can this country's *users* be served" above — a company can be
formed in one country while the product launches in another market first.

| Country | Resident director/signatory required? | Fully remote incorporation? |
|---|---|---|
| US (Delaware/Wyoming) | No | Yes — lowest friction of all 10 |
| UK | No (likely — not independently confirmed against gov.uk) | Yes, well-established |
| Belgium | Unresolved — conflicting sources on "professional card" | Unclear |
| Netherlands | No restriction found (single-vendor-sourced) | Unclear (vendor claims conflict) |
| Germany | No | Partial — notarization/proxy friction |
| Switzerland | **Yes** — resident signatory required by law | Partial |
| Austria | No for individuals (possible exception for non-EEA entities, unverified) | Partial — notarization likely |
| New Zealand | **Yes** — NZ- or Australia-resident director | Yes, if director requirement met |
| Australia | **Yes** — "ordinarily resident" director | Yes, if director requirement met |
| Canada | Yes federally (25%); **possibly avoidable provincially** (unverified) | Yes |

## Most time-sensitive items across all 10 countries (see `RISK_REGISTER.md` for full detail)

1. **Australia** — eSafety age-assurance porn codes bind **9 March 2026** (penalties to AUD 49.5M). The single nearest deadline in this entire research set.
2. **Germany** — JMStV §4(2) is already in force and enforced (ISP blocking orders issued). Not a future deadline — a present blocker.
3. **UK** — Online Safety Act age-assurance duty already in force since 25 July 2025, with real fines issued.
4. **Austria** — a similar mandatory age-verification law is in public consultation, expected to bind **~2027**.
5. **US** — state age-verification patchwork is actively growing post-*Paxton* (June 2025); re-verify the current state list before any US consumer launch decision, don't rely on this snapshot.

## How this feeds the Country Policy Engine

The existing `country_publication_decisions` table (migration
`20261025000001_country_publication_gate.sql`) already has the right shape for recording a real
decision once legal review happens: `status` (`not_reviewed`/`permitted`/`prohibited`),
`approver_name`, `evidence_ref` (required for `permitted`), `review_due` (required for
`permitted`), `restrictions`, `note`, `decided_by`, `decided_at` — append-only, auto-expiring,
multi-layer enforced. It is currently **single-feature** (publication only). Generalizing it to a
**per-feature** matrix (one decision row per country × feature, matching the rows above) is Phase
2 design work, not done in this document. Nothing in this matrix writes to that table or changes
any country's `publication_status` — it is reference material for the humans who will.
