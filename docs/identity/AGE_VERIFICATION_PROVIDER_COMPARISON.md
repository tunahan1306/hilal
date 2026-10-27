# Age-Verification Provider Comparison — Phase 4 Prep

Scope: real-world age-assurance vendors capable of serving the ten jurisdictions already
legally scoped in `docs/legal/` (US, UK, Germany, Netherlands, Austria, Belgium, Switzerland,
Canada, Australia, New Zealand), evaluated for gating adult (18+) content — the same role
`src/server/auth/age-verification.ts`'s `AgeVerificationProvider` interface is built for.
This is **research to inform a real vendor decision**, not a recommendation to contract
anyone — that decision, and the money/compliance commitment it carries, is the user's to
make (per Phase 4's own scope, see `docs/transformation/02_ARCHITECTURE.md` §"Not designed
in this phase, deliberately").

Research standard, same as `docs/payments/PROVIDER_COMPARISON.md`: official vendor pages and
regulator publications prioritized first; third-party/vendor-blog claims are explicitly
flagged as such and never presented as verified fact. No pricing or accuracy figure below is
invented — anything not found in a primary source is marked `UNVERIFIED` or `VENDOR CLAIM`.
Accessed: 2026-10-27.

---

## Read this first: Germany is a hard gate, not a checkbox

Every other jurisdiction researched treats age assurance as "use a method good enough to
satisfy a standard" (UK's Ofcom "highly effective" test, EU member-state equivalents). Germany
is structurally different: under the JMStV (Jugendmedienschutz-Staatsvertrag) §4(2), content
harmful to minors — pornography included — may only be offered inside a **geschlossene
Benutzergruppe** (closed user group), and the **KJM** (Kommission für Jugendmedienschutz)
pre-approves specific technical systems against a published evaluation grid (the
"AVS-Raster", current version effective since 12.05.2022). A KJM press release from 2021 cited
**over 70 positively-evaluated AVS concepts/modules** already on the books, and a 2026
biometric-age-estimation approval (Widas ID GmbH's "cidaas ID validator") was reported
alongside a figure of **102 KJM-approved systems on the market** — meaning the live list is
large and keeps changing. A vendor that works everywhere else can still be **non-compliant in
Germany specifically** if it isn't on (or can't get onto) that list.

**Practical implication for vendor selection:** before committing to any single vendor across
all ten countries, confirm in writing (a KJM decision reference, not a sales claim) that
their system is currently on the KJM's approved list, or budget time/cost for them to seek
approval. The KJM's own site (`kjm-online.de`, under "Technischer Jugendmedienschutz" /
Altersverifikationssysteme) is the only authoritative source for the current list — it was
not directly fetchable in this research pass and must be checked directly before any
commitment. Germany also requires **re-verification on every access**, not just at signup —
confirm any vendor's reusable-credential/session model still satisfies this per-access
requirement, not just a one-time check.

Age-*estimation* (facial scan, no ID) methods specifically carry an extra German
requirement: a **buffer above 18** to absorb estimation error. Sources conflict on the
current number — one 2026 vendor source (Yoti) states the buffer was **cut from 5 years to 3
years in September 2025** (i.e., the system must be confident the person is ≥21, not just
≥18); treat 3 years as current but confirm directly with the KJM before relying on it.

---

## UK: Ofcom's "highly effective age assurance" (HEAA) test

Since July 2025, UK-facing adult sites have a statutory duty under the Online Safety Act 2023
to use age checks Ofcom judges **accurate, robust, reliable, and fair** — self-declaration and
age-gates on payment methods that don't themselves require the user to be 18 (e.g. most debit
cards) do **not** qualify. There is **no Ofcom "approved vendor list"** (unlike Germany) — the
duty is evaluated against the four-criteria standard, not a pre-certified product list, so
"Ofcom-compliant" vendor marketing claims should be read as *"our method is of a type Ofcom's
guidance names as capable of being highly effective"*, not *"Ofcom endorses this vendor by
name"*. Ofcom's own **Use of Age Assurance Report 2026** records real enforcement teeth: **8
providers fined** (£80,000–£1.35M) and investigations opened into roughly 90 services, mostly
adult-content operators that had left the age gate off entirely. By Ofcom's July 2026 report,
all of the UK top-10 and most of the top-100 adult sites had checks in place; facial age
estimation and photo-ID matching were the most commonly deployed methods.

## Australia: no single mandated technology, but a large independent trial exists

The Australian government's **Age Assurance Technology Trial** (run by the Age Check
Certification Scheme with testing partner KJR, final report August 2025) assessed 60+
technologies from 48 vendors and concluded age assurance is *technically feasible* with *no
single solution fitting every use case* — it deliberately stops short of mandating a specific
vendor or method, leaving that to policy-makers. Treat any vendor's "trial-approved" framing
with caution — participation in the trial is not the same as a government endorsement.

---

## Signal from direct competitors (strongest evidence in this document)

`docs/research/COMPETITORS.md` (Phase 1) already established, with real sourcing, which
vendors the closest direct competitors to this platform actually use in production — this is
stronger evidence than any vendor's own marketing, because it's a live, at-scale,
same-business-model deployment:

- **OnlyFans** uses **Yoti** for viewer-facing age assurance (facial age estimation).
  Creator-side KYC vendor is reported inconsistently across sources as Yoti and/or
  **Ondato** — not fully reconciled in Phase 1's research.
- **Fansly** and **Fanvue** both use **Ondato** (Fansly confirmed via Ondato's own published
  case study; Fanvue confirmed via third-party reporting naming Ondato directly) —
  selfie-based age estimation with government-ID fallback when the automated result is
  inconclusive.
- **Cautionary data point:** a 2024 Ofcom investigation followed reports that OnlyFans' Yoti
  integration had a **threshold misconfiguration** — the age gate was effectively set to a
  different value than the platform claimed — which OnlyFans attributed to a "coding
  configuration issue," not a failure of Yoti's underlying technology. This is a reminder
  that **integration correctness matters as much as vendor selection**: whichever vendor is
  chosen, the actual configured threshold/buffer needs its own verification step before
  launch, independent of the vendor's own claims about its product.

This competitor evidence is the single best reason to put **Ondato** on the shortlist
alongside Yoti, even though Ondato wasn't in this pass's original search list — it has a
**named OnlyFans case study** (Ondato's own marketing quotes OnlyFans by name) in addition to
the Fansly/Fanvue usage, giving it the broadest same-industry track record of any vendor
found here.

## Vendors

### Yoti
- **Relevant product:** Yoti explicitly steers adult-industry integrators away from its
  general-purpose age-*estimation* API toward a dedicated **Age Verification Service** —
  the developer docs state: *"If you are in the adult industry, we strongly recommend you
  integrate our Age Verification Service instead to be compliant."*
- **Accuracy claim (vendor):** estimates the age of 13–24-year-olds within ~2 years, per
  Yoti's own marketing page. `VENDOR CLAIM`, not independently verified here.
- **Certifications (vendor-stated, third-party-reported):** approved by the UK Age Check
  Certification Scheme (ACCS), and by **both** German regulators named in this research —
  KJM and FSM — plus referenced by Ofcom. A third-party shortlist reports Yoti's Age
  Verification Service (v2026-2.1) as ACCS-registry-listed through 6 September 2029;
  **not independently confirmed against the ACCS registry itself in this pass.**
- **Pricing:** quote-based/enterprise only; no public rate card found. Yoti's free consumer
  Digital ID app is a separate product from the adult-industry Age Verification Service.
- **Germany fit:** of the vendors researched, Yoti has the clearest (though still
  vendor-reported) claim to KJM recognition specifically — worth prioritizing for direct
  confirmation.
- Sources: [Yoti age estimation docs](https://developers.yoti.com/age-estimation), [Yoti: Germany sets buffer for age estimation at 3 years](https://www.yoti.com/blog/age-estimation-approved-kjm-highest-age-assurance-level-18-adult-content/), [Yoti: age verification on adult websites](https://www.yoti.com/blog/age-verification-on-adult-websites/).

### VerifyMy (VerifyMyAge / VerifyMyContent)
- **Positioning:** the vendor most directly marketed at adult-content platforms specifically
  (as opposed to general IDV platforms that also offer age checks). Separate branding exists
  for **VerifyMyAge** (the consumer-facing check) and **VerifyMyContent** (content-platform
  integration, with a documented CCBill integration) — confirm which entity/contract you'd
  actually be signing with, the research found real brand-confusion risk here.
- **Methods:** facial age estimation from a short selfie video, email-based age inference,
  and government-ID scanning; plug-and-play, direct REST API, and iOS/Android WebView SDKs
  per its developer documentation.
- **Compliance claim:** a vendor-attributed LinkedIn post claims its solutions meet Ofcom's
  four HEAA criteria. `VENDOR CLAIM` — not an Ofcom endorsement by name (consistent with
  Ofcom not operating a named-vendor approval list at all, see above).
- **Pricing:** not publicly disclosed in pages reviewed.
- Sources: [VerifyMy developer documentation](https://verifymy.io/developer-documentation/), [CCBill × VerifyMyAge integration](https://ccbill.com/integration/verifymyage).

### AU10TIX
- **Relevant product:** selfie-based age estimation requiring no government ID, claimed
  ~2-second result time.
- **Positioning:** markets primarily toward social-media/child-safety age assurance (a free
  "readiness assessment tool" for that use case) rather than adult-content-specific
  compliance; adult-content fit would need direct confirmation with their sales team.
- **Cost claim (vendor):** skipping full ID checks "can reduce costs by up to 10x and boost
  completion rates by 27%" — `VENDOR CLAIM`, unverified, no baseline given.
- **Pricing:** no official rate card found; third-party aggregator figures seen in this
  research ($500 "starting from", a $25,000/user/month figure that appears to belong to an
  unrelated product in the same listing) are **not reliable** and are not repeated as fact.
- Sources: [AU10TIX age assurance landing page](https://www.au10tix.com/landing/does-your-social-media-platform-prioritize-the-digital-safety-of-minors/), [AU10TIX readiness-tool press release](https://www.au10tix.com/press-releases/au10tix-launches-free-assessment-tool-and-readiness-guide-to-help-organizations-navigate-child-safety-age-assurance-compliance/).

### Ondato
- **Track record (strongest in this comparison):** named case studies/references for
  **OnlyFans**, **Fansly**, and (per third-party reporting) **Fanvue** — see the competitor
  cross-reference above. This is the only vendor researched with direct, named,
  same-business-model production deployments.
- **Product:** "OnAge" — automatic age determination from a photo/video stream, marketed as
  not storing personal data ("100% anonymous with No Personal Data Storing"). Falls back to
  government-ID verification when the automated estimate is inconclusive, per Fansly's
  reported integration.
- **Accuracy claims (vendor, inconsistent across Ondato's own pages):** one Ondato page
  claims "98–100% accuracy in seconds"; a separate Ondato page states a 95% confidence level.
  The inconsistency is Ondato's own marketing, not a research gap — ask directly which figure
  is current and what it measures (accuracy vs. confidence are not the same statistic).
- **Pricing:** the only vendor in this comparison with an actual published per-verification
  price — but Ondato's own pages disagree with each other: one states "€0.30–€0.01 per
  verification," another "€0.11–€0.01 per verification," both volume/feature-dependent, and
  billed only for completed verifications. **Get the current number in writing**, this is not
  a vendor that's simply silent on pricing (unlike the other four), it's one whose own public
  pages conflict.
- **Germany:** a press headline reports Ondato's system received approval to provide
  age-verification services in Germany; a third-party listing separately claims ISO/IEC 27001
  certification and references to KJM-relevant and NIST-evaluated age-estimation
  performance. **None of this was verified against the issuing bodies (KJM, ISO, NIST) in
  this pass** — given Germany's hard-gate status (see above), this is the single most
  important claim on this page to verify directly before relying on it.
- Sources: [Ondato age-verification pricing page](https://ondato.com/age-verification-pricing/), [Ondato press: Germany age-verification approval](https://ondato.com/press/), [Ondato: best age verification providers 2026](https://ondato.com/blog/best-age-verification-providers/) (vendor's own comparison blog — self-interested, treat ranking claims about competitors with extra caution), `docs/research/COMPETITORS.md` (Phase 1, this repo).

### Veriff
- **Relevant product:** a tiered/"waterfall" age-assurance flow — starts with a low-friction
  database check and escalates to document/biometric verification only when needed, per
  Veriff's own age-assurance page.
- **Adult-content context:** Veriff's own blog on Virginia's 2023 adult-content
  age-verification law recommends ID-based or AI-estimation verification to meet it — this
  is Veriff positioning itself for that law, not a regulator naming Veriff.
- **Third-party signal:** named (without compliance assessment) in a Segpay industry article
  as one of the document-based verification providers used by adult sites.
- **Pricing/certifications:** no public rate card or Germany/UK-specific certification claim
  found in this pass — treat as a gap to close directly with Veriff, not an absence of
  capability.
- Sources: [Veriff age assurance](https://veriff.com/use-cases/age-assurance), [Veriff: Virginia age verification law explained](https://veriff.com/fraud/news/virginia-age-verification-law-explained).

### Persona
- **Methods:** selfie-based age estimation, email-based age inference, phone-carrier-record
  checks, credit-card checks, government-ID checks (extracting date of birth), and database
  checks — the broadest method menu of the six vendors researched.
- **Privacy claims (vendor):** collects only what's needed for a pass/fail age outcome,
  auto-redacts PII, does not train models on end-user personal data.
- **Recent development:** integrated with **ConnectID** (Australian banking-sector identity
  network) for bank-verified age checks in the Australian market (April 2026), and joined the
  **OpenAge** initiative pursuing passkey-based reusable age credentials across providers —
  worth watching if reusable, cross-platform credentials matter for UX.
- **Pricing:** a third-party tracker (PricingSaaS, unverified) lists an "Essential" tier at
  $250/month with Growth/Enterprise tiers undisclosed — **not confirmed directly with
  Persona**, do not rely on this figure for budgeting.
- **Caution:** reporting referenced privacy-language criticism tied to a Persona integration
  in Discord's age-verification rollout — worth raising directly with Persona as a diligence
  question (see checklist below), not disqualifying on its own from secondhand reporting.
- Sources: [Persona: age assurance help docs](https://help.withpersona.com/articles/6sBm3U81qDvDMyQ4bxTKVB/), [Persona × ConnectID](https://withpersona.com/blog/persona-integrates-with-connectid-to-expand-user-age-assurance-options), [Persona vs Yoti](https://withpersona.com/lp/persona-vs-yoti/).

---

## Comparison matrix

| | Yoti | Ondato | VerifyMy | AU10TIX | Veriff | Persona |
|---|---|---|---|---|---|---|
| Same-industry production use | Reported for OnlyFans (viewer-facing) | **Confirmed**: named OnlyFans case study; Fansly (vendor case study); Fanvue (3rd-party) | Not found | Not found | Not found | Not found |
| Adult-industry-specific product | Yes (dedicated Age Verification Service, steers adult integrators away from the generic API) | Yes ("OnAge") | Yes (VerifyMyAge/VerifyMyContent, CCBill-integrated) | No (social/child-safety framed; adult fit unconfirmed) | No (general IDV; blogs about adult-relevant US state laws) | No (general IDV; broadest method menu) |
| Germany/KJM claim | Strongest *directly reported* (vendor+3rd-party claim of KJM+FSM recognition) | Press claims German approval + KJM-relevant cert (unverified against KJM) | Not found in this pass | Not found | Not found | Not found |
| UK Ofcom framing | References Ofcom; ACCS-registry claim (unconfirmed directly) | Not found | Vendor claims HEAA-criteria fit (unconfirmed) | Not found | Not found | Not found |
| Methods offered | Facial estimation + dedicated AVS | Facial/video estimation + ID fallback when inconclusive | Facial estimation, email inference, ID scan | Facial estimation only (selfie, no ID) | Tiered: DB check → ID/biometric | Facial estimation, email, phone-carrier, card, ID, DB |
| Public pricing | No (quote-based) | **Yes** — per-verification (€0.01–€0.30, Ondato's own pages disagree on the range) | No | No (3rd-party figures unreliable) | No | No (3rd-party $250/mo "Essential" tier, unverified) |
| Per-access re-check (Germany requirement) | `UNVERIFIED` — confirm directly | `UNVERIFIED` | `UNVERIFIED` | `UNVERIFIED` | `UNVERIFIED` | `UNVERIFIED` |

**Bottom line on verifiability:** **Ondato and Yoti are the two vendors worth prioritizing** —
Ondato on the strength of real, named, same-business-model production use (OnlyFans, Fansly,
Fanvue) plus the only published per-verification pricing found anywhere in this research;
Yoti on the strength of its specific KJM/FSM/Ofcom-adjacent claims, which matter most given
Germany's unique pre-approval-list requirement. Neither claim should be treated as settled —
both need direct, written confirmation (Ondato's own pricing pages disagree with each other,
and no vendor's German-regulator claim here was checked against the KJM's own list). For
every other jurisdiction, the governing standard (UK's Ofcom HEAA, Australia's
trial-informed-but-unmandated approach) is a capability bar, not a named-vendor list, so the
remaining four (VerifyMy, AU10TIX, Veriff, Persona) stay viable alternatives worth a direct
pricing/diligence conversation, weighted by method coverage and existing integrations
(VerifyMy × CCBill is a real, documented one).

---

## Questions to ask every age-verification vendor directly

Gaps this research pass could not close from public sources — confirm in writing, not via a
sales call, before signing anything:

1. **Germany specifically:** current KJM decision reference number (or FSM certification
   reference) proving the exact product version is on the approved list *today* — a vendor
   blog post is not sufficient evidence. If not currently approved, what's the cost/timeline
   to seek approval, and who bears it.
2. Whether the product re-verifies on **every content access** (Germany's requirement) or
   only at signup/session-start, and how that maps to `expiresAt` on this platform's
   `age_verification_checks` table.
3. For facial age-estimation methods: the current accuracy/confidence-interval figures *and*
   the age buffer applied above 18 for German traffic specifically (confirm the "3 years"
   figure directly — this research found it stated but not independently verified).
4. Exact data retention policy for any captured selfie/document image — confirmed deleted
   after the check, not merely "processed" (this platform's own design principle, see
   `age-verification.ts`'s comment that raw documents never reach the application).
5. Per-check or per-seat pricing, at the actual expected volume, plus any minimum
   commitment/contract length.
6. Whether reusable/cross-platform credentials (e.g. OpenAge, a shared digital-ID wallet) are
   supported, and what happens to accounts if the vendor relationship ends — can checks be
   migrated or must every user re-verify with a new vendor.
7. Liability/indemnification terms if the vendor's check is later found non-compliant in a
   given jurisdiction — whose exposure is it.
8. For any vendor with a reported privacy-language controversy (Persona/Discord, this
   research pass) or any vendor being seriously shortlisted generally: ask directly what
   changed since, and get the current privacy/data-processing terms in writing.

### Procurement checklist (age verification)

- [ ] Germany KJM/FSM approval status confirmed via decision reference, not vendor marketing
      — checked directly against `kjm-online.de`, not a vendor's claim about it.
- [ ] Per-access re-verification behavior confirmed and mapped to this platform's
      `age_verification_checks.expires_at` configuration.
- [ ] Direct written answers to all 8 questions above.
- [ ] Data retention/deletion terms reviewed against `docs/legal/` per-country requirements
      (several already discuss document-retention limits).
- [ ] Legal review sign-off completed and recorded in
      `docs/legal/LAUNCH_APPROVAL_CHECKLIST.md`-style ceremony, same as payments.
- [ ] `src/server/auth/age-verification.ts`'s `getAgeVerificationProvider()` only changed from
      "always throws" to a real implementation after every item above is checked — not before.

---

## Mapping to `src/server/auth/age-verification.ts`

The existing `AgeVerificationProvider` interface (`verifySession(providerSessionRef):
Promise<{ providerRef, status, expiresAt }>`) is intentionally vendor-agnostic and already
matches the "exchange a session reference server-side" pattern every vendor above supports
(Yoti's Age Verification Service, VerifyMy's REST API, AU10TIX/Veriff/Persona's check-session
models all return a server-verifiable result keyed by a session/check ID). **No interface
change is anticipated regardless of which vendor is chosen** — this was designed correctly in
Phase 2. Germany's per-access re-verification requirement is the one finding here with a
real, if small, implementation implication: `age_verification_checks.expires_at` already
exists and is already checked in `isAgeVerified()` (`src/domain/identity.ts`), so enforcing a
short `expiresAt` (rather than a long-lived session) for German users is a configuration
decision for whichever vendor is chosen, not a schema change.
