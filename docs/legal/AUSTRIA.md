# Austria — Jurisdiction Legal Research

**Scope note:** Covers the legitimate platform only (digital content subscriptions, social profiles, messaging, general paid features, platform licensing). Excludes independent sex-worker advertising, service booking, and sexual-service payment brokering — permanently out of scope for this project.

**Research date:** 2026-10-27. No legal review has occurred; nothing below is `APPROVED`.

## 1. Legal status of adult digital content platforms

No blanket prohibition found on adult subscription-content platforms as a business model. The live regulatory development is a **pending age-verification mandate for adult platforms**, reported via Der Spiegel (via EFE wire, abc.com.py): the Austrian government has approved (per that report) reforms requiring adult video platforms operating in Austria to verify users are 18+ before access, expected to take effect **2027**; a simple self-declaration checkbox would no longer suffice; verification could run through **ID Austria** (the national eID) or a private provider, with the site receiving only an adult/non-adult confirmation, not underlying identity data ([abc.com.py, 2026-07-29](https://www.abc.com.py/internacionales/2026/07/29/austria-quiere-obligar-a-las-webs-porno-a-comprobar-que-sus-usuarios-son-mayores-de-edad/)). **Caveat:** a parallel, more specific source (Digital Policy Alert) describes a related draft — amending the Audiovisual Media Services Act and KommAustria Act — as still in **public consultation** (opened 27 July 2026, closing 21 September 2026), not yet enacted ([digitalpolicyalert.org](https://digitalpolicyalert.org/event/42270-federal-chancellery-opened-consultation-on-draft-law-amending-audiovisual-media-services-act-and-kommaustria-act)). Treat "government-approved" language with caution — the consultation-stage description is the more checkable, specific claim. **Status: REQUIRES_LEGAL_REVIEW**, and this is a **near-term moving target** — re-check closer to any Austria launch decision given the live 2026 legislative process.

## 2–3. Paid listing/premium features, VIP/sponsored ranking

Not separately researched beyond Austria's general E-Commerce Act (ECG) online-advertising framework, which sets restrictions for certain categories (alcohol, tobacco, content potentially harmful to minors) but no specific VIP/ranking rule was found. **Status: UNKNOWN — REQUIRES_LEGAL_REVIEW.**

## 4. Private messaging between users

Not separately researched beyond general GDPR/DSG data-protection baseline (§11), which governs message content as personal data. No Austria-specific messaging statute found. **Status: UNKNOWN — REQUIRES_LEGAL_REVIEW.**

## 5. Platform operator licenses

Austria's **Audiovisual Media Services Act (AMD-G)**, Art. 54b/54d, transposes AVMSD Article 28b and gives KommAustria (via the federal communications regulator) jurisdiction over video-sharing platforms, including prohibited content tied to Penal Code offences (pornographic representations of minors, terrorism content, hate speech). A 2023 European Audiovisual Observatory report lists at least two Austria-jurisdiction adult services (Amateurseite.com, sexmagazin.at) as falling under this regime — i.e., **operating an adult-content platform targeting Austrian users likely brings KommAustria jurisdiction into play as a video-sharing-platform regulator**, not a traditional "license" but a compliance/registration-adjacent regime. **Status: REQUIRES_LEGAL_REVIEW** — confirm whether the planned platform meets the AMD-G's "video-sharing platform" definition (likely yes, if creator video content is a feature).

## 6. Foreign company ownership rules

Shareholders may be any natural or legal person, Austrian or foreign — **no citizenship or Austrian residency/domicile requirement** to hold shares in a GmbH (multiple consistent commercial/legal sources). **Status: UNKNOWN pending official Firmenbuch confirmation**, but consistent across sources.

## 7. Can a Turkish citizen form a company here?

Yes, per §6 — citizenship is not a barrier to shareholding, and **managing directors are also not required to be Austrian residents** (though a local address for service of process, *Zustelladresse*, must be available). One source claims non-EEA companies (as opposed to individuals) must appoint an Austrian resident representative — **could not confirm against an official source**, flag as `UNVERIFIED`. **Status: REQUIRES_LEGAL_REVIEW**, low apparent barrier for an individual Turkish founder, but confirm the non-EEA-entity representative point if the Turkish side of this is structured as a company rather than an individual.

## 8. Remote / online company incorporation

Partial — articles of association typically require **notarization by an Austrian notary**, and foreign shareholders may need to attend in person or provide an authenticated power of attorney; foreign corporate shareholders must prove legal existence via a certified (and translated, if needed) confirmation from their home-country court/chamber of commerce. **Status: REQUIRES_LEGAL_REVIEW** — not a fully remote process based on sources found, unlike the UK.

## 9. Local address / registered-agent requirements

Yes — see §7 (*Zustelladresse* for managing directors; registered seat for the company itself). **Status: REQUIRES_LEGAL_REVIEW** for provider selection.

## 10. Taxes relevant to a digital platform business

- **Corporate income tax**: 23% (one consistent source); resident companies taxed on worldwide income, non-resident companies only on Austria-sourced income.
- **VAT**: standard rate **20%**, reduced rates 13%/10%; registration threshold **€55,000** from January 2025 per one source — **confirm against BMF/FinanzOnline directly**, not independently verified.
- **Status: REQUIRES_LEGAL_REVIEW** to confirm current figures with Austrian tax authority sources.

## 11. GDPR / DSG data protection obligations

Austria implements GDPR via the national **Datenschutzgesetz (DSG)**; not independently re-researched in depth this pass beyond confirming the regime's existence — searches surfaced the AVMSD/AMD-G minors-protection layer (§1, §5) more than DSG-specific platform guidance. A draft bill (separate from the adult-platform age-verification draft in §1) would require video-sharing platforms to implement **age-verification mechanisms that rank among the most data-minimising methods available** where protection of under-14s can't otherwise be guaranteed — notable because it ties a youth-protection duty directly to a GDPR-adjacent data-minimisation standard, applying regardless of whether the platform is established in Austria, elsewhere in the EU, or a third country. **Status: UNKNOWN (DSG specifics) / REQUIRES_LEGAL_REVIEW (age-verification data-minimisation design implication, which is concrete and should inform the age-verification-provider abstraction's design even before Austria is prioritized).**

## 12. 18+ / age verification legal requirements

See §1 (pending adult-platform mandate, expected 2027, ID Austria or private-provider verification, confirmation-only data to the site) and §11 (data-minimisation requirement in the parallel under-14 draft). Existing baseline: AMD-G Art. 54b already prohibits pornographic representations of minors on video-sharing platforms (a content rule, not an access-age-gate rule) as the pre-existing floor. **Status: REQUIRES_LEGAL_REVIEW**, and like Austria's §1 finding, this is **legislatively in motion** — re-verify close to any Austria launch decision.

## 13. Bank account and payment infrastructure access

Austrian banks apply strict AML checks (Commercial Register extract, managing-director/beneficial-owner ID, source-of-funds evidence) and **typically require in-person meetings for foreign-owned accounts**; account opening takes **2–4 weeks** after complete documentation per one source. Notably: a foreign parent company without its own Firmenbuch (Austrian commercial register) entry **cannot use major banks' online onboarding routes** (Erste Bank, Bank Austria cited) — many businesses first register an Austrian branch or subsidiary, then open the account in that local entity's name. No adult-content-specific acceptance policy found — treat as `UNVERIFIED` for this sector specifically. **Status: REQUIRES_LEGAL_REVIEW / commercial due diligence** (see `docs/payments/PROVIDER_COMPARISON.md`).

## 14. Anti-trafficking / anti-exploitation obligations

Not separately researched this pass. **Status: UNKNOWN — REQUIRES_LEGAL_REVIEW.**

## 15. Marketing / search-engine advertising restrictions for adult content

Austria's **E-Commerce Act (ECG)** is the general online-advertising framework, with restrictions/bans for specific categories (alcohol, tobacco, content potentially harmful to minors) — no adult-content-specific advertising clause was located in the Mediengesetz (MedienG) itself in this pass; a Carinthian **state-law** youth-protection provision (K-JSG) separately bars offering minors access to media depicting pornographic acts "liable to endanger young people's development," citing the federal MedienG as its anchor — this is state law, so coverage may vary by Bundesland. **Status: UNKNOWN (national MedienG ad-specific text not located) — REQUIRES_LEGAL_REVIEW**, check RIS (Austria's legal database) directly for the MedienG advertising provisions and note potential state-level (Land) variation.

## Operator summary

| Topic | Status | Review needed |
|---|---|---|
| 1. Adult content platform legality (pending age-verification mandate, ~2027) | REQUIRES_LEGAL_REVIEW | Y — re-check timing |
| 2. Paid listing/premium features | UNKNOWN | Y |
| 3. VIP/sponsored ranking | UNKNOWN | Y |
| 4. Private messaging | UNKNOWN | Y |
| 5. Platform operator licenses (AMD-G/KommAustria likely applies) | REQUIRES_LEGAL_REVIEW | Y |
| 6. Foreign company ownership | UNKNOWN (likely fully permitted) | Y |
| 7. Turkish citizen can incorporate | REQUIRES_LEGAL_REVIEW (low apparent barrier) | Y |
| 8. Remote incorporation | REQUIRES_LEGAL_REVIEW (notarization/in-person likely needed) | Y |
| 9. Local registered address required | REQUIRES_LEGAL_REVIEW | Y |
| 10. Taxes (23% CIT, 20% VAT) | REQUIRES_LEGAL_REVIEW | Y |
| 11. DSG/GDPR + age-verification data-minimisation draft | REQUIRES_LEGAL_REVIEW | Y |
| 12. Age verification (pending mandate, ~2027) | REQUIRES_LEGAL_REVIEW | Y — re-check timing |
| 13. Bank/payment access (branch/subsidiary may be needed first) | REQUIRES_LEGAL_REVIEW / commercial diligence | Y |
| 14. Anti-trafficking/moderation duties | UNKNOWN | Y |
| 15. Ad/marketing restrictions | UNKNOWN (ECG general, MedienG specifics not found) | Y |

**No topic is APPROVED.** Austria's §1/§12 findings are the most time-sensitive in this entire Phase 1 batch — the age-verification mandate is actively moving through the Austrian legislative process in mid/late 2026 and should be re-verified against the current RIS text immediately before any Austria launch decision, not relied on from this snapshot.
