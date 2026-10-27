# Launch Approval Checklist

**This document is not a substitute for legal review. Nothing in Phase 1's research
(`docs/legal/*.md`, `docs/payments/PROVIDER_COMPARISON.md`, `docs/research/COMPETITORS.md`)
satisfies any item below by itself — it only tells counsel what to look at.** A country's
`publication_status` may move off `not_reviewed` **only** after every applicable item for that
country is checked and a real decision is recorded in `country_publication_decisions`.

## How this maps to the existing schema

Each checklist item below corresponds to a field the decision record already requires
(`supabase/migrations/20261025000001_country_publication_gate.sql`):

| Decision record field | What it must contain |
|---|---|
| `status` | `permitted` or `prohibited` — never set by research alone |
| `approver_name` | The named individual accepting responsibility for the decision (2–120 chars, required) |
| `evidence_ref` | A reference to the actual legal review / permit / counsel memo — **required** if `status = permitted`, minimum 3 characters, must point to something real, not this research |
| `review_due` | A concrete re-review date — **required** if `status = permitted`; the gate auto-closes the country if this lapses (fail-closed on expiry, not just on initial state) |
| `restrictions` | Any country-specific limits the decision imposes (e.g. "digital content only, no video-sharing-platform classification triggered") |
| `note` | Free-text context for future reviewers |
| `decided_by` | Must be an owner-role admin acting on their own decision (enforced by RLS) |

**Current limitation:** this table is single-feature (publication only) today. The checklist below
is organized per-feature per-country in anticipation of the Phase 2 generalization (per-feature
decision rows) described in `docs/transformation/00_AUDIT.md` and `JURISDICTION_MATRIX.md`; until
that generalization ships, a country can only be gated as a whole, not per-feature.

## Universal prerequisites (every country, before any `permitted` status)

- [ ] Engage actual legal counsel licensed in that jurisdiction (or with demonstrated competence in it) — not a research pass, not a commercial formation-vendor's blog
- [ ] Counsel has reviewed this project's actual product (not a generic "OnlyFans-style platform" description) against the country's adult-content, platform-operator, and age-verification rules
- [ ] Counsel memo or permit obtained and stored as the `evidence_ref`
- [ ] Age-verification method is selected and matches the strictest applicable requirement found for that country (see `JURISDICTION_MATRIX.md`'s cross-cutting age-verification row) — not a generic self-declaration checkbox, which is explicitly insufficient in Belgium/Netherlands/Germany (EU DSA) and UK
- [ ] Payment processor contract actually executed (not just researched) if real payments are to go live for that country — mock-only until then
- [ ] `review_due` set to a date before any known regulatory deadline for that country (see below)
- [ ] Company-formation entity chosen and actually incorporated (not just researched as feasible) if the operating entity will be domiciled there

## Per-country items

### Germany — hard blocker, not a routine review
- [ ] KJM-recognized age-verification method selected and **integrated and tested** (biometric/hybrid per Jan 2026 approval, or face-to-face per older-approved methods) — self-declaration will not satisfy this
- [ ] Counsel confirms the platform is correctly scoped under JMStV §4(2) "pornographic telemedia"
- [ ] `review_due` set — this is an active, enforced regime; do not set a distant date
- Source: [`GERMANY.md`](GERMANY.md)

### UK
- [ ] Counsel opinion obtained on whether a paywalled creator-subscription model falls within OSA's "publishes or displays" pornographic content duty the same way an open site does
- [ ] Ofcom's "front gate" age-assurance model (no content visible pre-verification) implemented if counsel concludes OSA applies
- [ ] DPIA completed for UK-GDPR (special-category data likely in scope)
- Source: [`UK.md`](UK.md)

### Australia — nearest hard deadline in this set
- [ ] Age-assurance measures compliant with the eSafety-registered industry codes **before 9 March 2026**
- [ ] Legal scoping of whether the Social Media Minimum Age (SMMA) regime also captures this platform, separate from the porn-specific codes
- [ ] Privacy Act 1988 small-business exemption status confirmed (do not assume it applies)
- [ ] Resident director sourced (nominee service or relocating founder) if incorporating locally
- Source: [`AUSTRALIA.md`](AUSTRALIA.md)

### Austria — time-sensitive, moving target
- [ ] Re-check RIS (Austria's legal database) for the current status of the pending adult-platform age-verification law (was in public consultation through 21 Sept 2026 as of this research) immediately before any launch decision
- [ ] KommAustria/AMD-G "video-sharing platform" classification scoped with counsel if creator video content is a feature
- Source: [`AUSTRIA.md`](AUSTRIA.md)

### United States — scope state-by-state, not nationally
- [ ] Current, counsel-verified list of states with in-force adult-site age-verification laws obtained (not this research pass's list — re-verify via the Free Speech Coalition litigation tracker or a state AG's office)
- [ ] Per-state launch decision made (serve all US states, or geofence out non-compliant/uncertain ones) with counsel sign-off
- [ ] Counsel confirms existing moderation/reporting practices (`moderation_reports`/`moderation_actions`, content-policy scanner) are adequate under FOSTA-SESTA's facilitation-liability standard
- [ ] Entity formed (Delaware or Wyoming), EIN obtained (paper Form SS-4 for non-resident founder), US bank account opened, Form 5472 foreign-ownership reporting process established
- Source: [`US.md`](US.md)

### Canada
- [ ] Federal-vs-provincial incorporation choice resolved with counsel (provincial may avoid the resident-director requirement — unverified claim, confirm against the target province's Business Corporations Act)
- [ ] Bill S-210 / successor's current status re-checked against the Senate of Canada's website — not yet law as of this research pass, but do not assume it stays that way
- [ ] Quebec Law 25 scoped separately if Quebec users will be served (stricter than federal PIPEDA)
- Source: [`CANADA.md`](CANADA.md)

### New Zealand
- [ ] Resident or Australia-linked co-director sourced if incorporating locally
- [ ] Counsel confirms whether any NZ age-verification obligation actually exists (absence of a finding in this research pass is not confirmed absence of a law)
- [ ] Classification Act 1993 exposure for user-generated content reviewed
- Source: [`NEW_ZEALAND.md`](NEW_ZEALAND.md)

### Switzerland — weakest-sourced, do not deprioritize
- [ ] Direct counsel review of Criminal Code Art. 197 as applied to a consensual, paywalled adult-content platform (not inferred from secondary sources, several of which were found to be unreliable in this research pass)
- [ ] Resident signatory secured for AG/GmbH incorporation
- [ ] Age-verification mechanics confirmed directly — this came back `UNKNOWN`, treat as a priority gap, not a low-risk one
- Source: [`SWITZERLAND.md`](SWITZERLAND.md)

### Belgium
- [ ] "Professional card" question resolved directly with FPS Economy or a Belgian notary (sources conflict and no official text was found either way in this research pass)
- [ ] EU DSA Article 28 age-verification baseline met (see Universal prerequisites)
- Source: [`BELGIUM.md`](BELGIUM.md)

### Netherlands
- [ ] Company-formation facts (ownership, incorporation route, fees, tax rates) independently re-verified against KVK/Belastingdienst — this research pass's findings all trace to a single commercial vendor
- [ ] EU DSA Article 28 age-verification baseline met (see Universal prerequisites)
- Source: [`NETHERLANDS.md`](NETHERLANDS.md)

## Explicitly excluded — never on this checklist

Module D (independent sex-worker advertising, service booking, sexual-service payment brokering)
has no checklist entry for any country, in any phase. This is not an omission to fill in later.
