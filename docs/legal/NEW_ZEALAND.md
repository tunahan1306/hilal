# Jurisdiction: New Zealand

Scope note: out of scope for this research — independent sex-worker advertising, service booking, sexual-service payment brokering (module D). New Zealand's Prostitution Reform Act 2003 decriminalizes sex work domestically; it is sometimes cited in this industry for that reason, but no feature built on it is in scope here. Everything below concerns only the legitimate platform (digital content subscriptions, social profiles, messaging, general premium features, platform operator status).

Research standards: no finding below is a legal opinion. `APPROVED` is never self-assigned by research; it requires actual counsel review, permits, and a recorded operator decision. Accessed date for all items: 2026-10-27.

## 1. Legal status of adult digital content platforms (OnlyFans-style)
New Zealand has no licensing regime specific to adult digital-content subscription platforms (unlike its licensed brothel/commercial-sex-work operator regime under the Prostitution Reform Act 2003, which is out of scope here). A subscription content business operates as an ordinary company subject to general consumer, tax, classification (Films, Videos, and Publications Classification Act 1993 — adult material must not be objectionable/illegal content, e.g. CSAM, and some material may require restriction), and privacy law.
- Status: `REQUIRES_LEGAL_REVIEW` (classification-law exposure for UGC content should be reviewed before launch)
- Source: general legislative framework, no single authoritative "adult platform license" page found in this research pass — flag for counsel to confirm no licensing gap exists.

## 2. Paid listing / premium feature publishing (general)
No NZ-specific restriction found on paid visibility/premium features as a general e-commerce practice; standard Fair Trading Act 1986 (misleading/deceptive conduct) and Consumer Guarantees Act apply to any paid feature sold to consumers.
- Status: `REQUIRES_LEGAL_REVIEW`

## 3. VIP profile / sponsored ranking features
Same general consumer-law framework as #2; no sector-specific rule found.
- Status: `UNKNOWN`

## 4. Private messaging between users
No NZ statute specifically regulating private in-app messaging between platform users beyond the Harmful Digital Communications Act 2015 (HDCA), which creates civil/criminal remedies for harmful digital communications and requires online content hosts to have a complaints process to qualify for a safe-harbor-style defense.
- Status: `REQUIRES_LEGAL_REVIEW`
- Source: Harmful Digital Communications Act 2015 (general knowledge, not independently re-verified this pass — counsel should confirm current complaints-process requirements)

## 5. Platform operator licenses
No general "platform operator license" regime found for a social/content platform as such. Classification Act obligations (#1) and HDCA (#4) are the closest analogues to platform-specific duties.
- Status: `UNKNOWN`

## 6. Foreign company ownership rules
No restriction found on foreign ownership of an NZ company's shares in this research pass. The constraint that exists is on **directors**, not shareholders (see #7/#8) — the NZ Companies Office's own guidance confirms the residency rule applies to directors only. Overseas Investment Act 2005 consent requirements could apply to some asset classes but are not expected to be triggered by a software platform company with no NZ land/significant-business-asset acquisition — flag for counsel to confirm this doesn't apply to the specific structure chosen.
- Status: `REQUIRES_LEGAL_REVIEW`
- Source: [NZ company director residency guidance, Sprintlaw NZ (2026)](https://sprintlaw.co.nz/articles/new-zealand-resident-director-requirements/) — accessed 2026-10-27

## 7. Can a Turkish citizen form a company there?
Yes, a Turkish citizen can be a 100%-owner/shareholder of an NZ company with no residency restriction on shareholders found. However, **every NZ-incorporated company needs at least one director who either (a) lives in New Zealand, or (b) lives in Australia and is also a director of an Australian-incorporated company** — a Turkish citizen with no NZ/Australia residency cannot be the sole director; a locally resident director (nominee/professional service) or an Australia-resident co-director with an Australian company directorship is required.
- Status: `REQUIRES_LEGAL_REVIEW` (confirm "ordinarily resident" test and nominee-director service terms with counsel before relying on it)
- Source: Companies Act 1993 (as amended by the Companies Amendment Act 2014, effective 1 May 2015), summarized in [Sprintlaw NZ, "New Zealand Resident Director Requirements"](https://sprintlaw.co.nz/articles/new-zealand-resident-director-requirements/), accessed 2026-10-27. Underlying detailed guidance found in this pass dates mostly to ~2015; current NZ Companies Office forms should be checked directly before acting.

## 8. Remote / online company incorporation
NZ company registration is done online via the NZ Companies Office (companiesoffice.govt.nz) and can be completed remotely by a foreign founder, subject to satisfying the resident-director requirement (#7) and providing identity verification for all directors/shareholders (AML/CFT obligations apply to the company's service providers, e.g. incorporation agents).
- Status: `REQUIRES_LEGAL_REVIEW`

## 9. Local address / registered-agent requirements
An NZ company must have a registered office address and an address for service in New Zealand; a resident director or a professional registered-office/nominee service can typically satisfy this.
- Status: `REQUIRES_LEGAL_REVIEW`

## 10. Taxes relevant to a digital platform business
Standard NZ company income tax (28% flat rate on company profits, current regime, not independently re-verified this pass) plus GST (15%) on supplies, including digital services — NZ's "remote services" GST rules can apply to a non-resident-operated platform selling digital content to NZ consumers even without a local presence, separately from the company-formation question above. This is a materially different question from "where the company is formed" and needs its own review if NZ consumers are served.
- Status: `REQUIRES_LEGAL_REVIEW`

## 11. Data protection obligations
The **Privacy Act 2020** is NZ's data-protection law (replacing the Privacy Act 1993, in force since 1 December 2020), enforced by the Office of the Privacy Commissioner, built around 13 Information Privacy Principles (one secondary source claims a 14th has been added; unconfirmed in this pass — verify against legislation.govt.nz). Notable: **IPP 12** restricts disclosure of personal information to an overseas agency unless that agency is subject to comparable safeguards — directly relevant if this platform's infrastructure (e.g. Supabase region) sits outside New Zealand. Mandatory breach notification applies when a breach causes or is likely to cause serious harm. The Act has extraterritorial reach over overseas agencies "carrying on business" in NZ regardless of local presence or profit.
- Status: `REQUIRES_LEGAL_REVIEW`
- Source: [Office of the Privacy Commissioner, "Comparing the Privacy Acts – 1993 and 2020"](https://www.privacy.org.nz/privacy-principles/comparing-the-privacy-acts-1993-and-2020/); [legislation.govt.nz, Privacy Act 2020 consolidated text](https://legislation.govt.nz/act/public/2020/31/en/2026-05-01.pdf) — accessed 2026-10-27

## 12. 18+ / age verification legal requirements
No NZ-specific statutory age-verification mandate for adult content platforms was found in this research pass (unlike Australia/UK/many US states — see their respective files). The Classification Act 1993 framework (#1) governs content restriction/objectionable-content risk rather than mandating a specific age-check mechanism for platform access. This should be confirmed directly, not inferred, before relying on "no AV law" as a product decision.
- Status: `UNKNOWN` — flag explicitly for counsel confirmation; absence of evidence found is not evidence of absence.

## 13. Bank account and payment infrastructure access
No NZ-specific finding in this research pass; see `docs/payments/PROVIDER_COMPARISON.md` for the cross-jurisdiction high-risk-merchant/adult-content payment-processor research (general finding across jurisdictions: mainstream banks/processors commonly decline or restrict adult-content merchants as "high risk," requiring specialized acquirers).
- Status: `UNKNOWN`

## 14. Anti-trafficking / anti-exploitation obligations (generic platform moderation/reporting duties)
No NZ-specific platform moderation mandate beyond general criminal law (Crimes Act provisions on trafficking/exploitation apply to any platform used to facilitate such offences, as in any jurisdiction) and the HDCA complaints-process incentive (#4). No NZ equivalent of US FOSTA-SESTA found in this pass.
- Status: `UNKNOWN`

## 15. Marketing / search-engine advertising restrictions for adult content
No NZ-specific statutory restriction found in this pass beyond general Fair Trading Act advertising-conduct rules and third-party ad-platform policies (Google/Meta policies on adult content are a practical constraint regardless of NZ law, but those are platform policy, not NZ law).
- Status: `UNKNOWN`

## Operator summary

| Topic | Status | Review needed |
|---|---|---|
| 1. Adult content platform legality | REQUIRES_LEGAL_REVIEW | Y |
| 2. Paid listing/premium features | REQUIRES_LEGAL_REVIEW | Y |
| 3. VIP/sponsored ranking | UNKNOWN | Y |
| 4. Private messaging | REQUIRES_LEGAL_REVIEW | Y |
| 5. Platform operator licenses | UNKNOWN | Y |
| 6. Foreign ownership | REQUIRES_LEGAL_REVIEW | Y |
| 7. Turkish citizen company formation | REQUIRES_LEGAL_REVIEW | Y |
| 8. Remote incorporation | REQUIRES_LEGAL_REVIEW | Y |
| 9. Local address/agent | REQUIRES_LEGAL_REVIEW | Y |
| 10. Taxes | REQUIRES_LEGAL_REVIEW | Y |
| 11. Data protection (Privacy Act 2020) | REQUIRES_LEGAL_REVIEW | Y |
| 12. Age verification | UNKNOWN | Y |
| 13. Banking/payments access | UNKNOWN | Y |
| 14. Anti-trafficking/moderation duties | UNKNOWN | Y |
| 15. Ad/marketing restrictions | UNKNOWN | Y |

No topic in this file reaches `APPROVED` or `RESTRICTED` — every row requires counsel review before any launch decision for this jurisdiction.
