# Jurisdiction: Canada

Scope note: out of scope for this research — independent sex-worker advertising, service booking, sexual-service payment brokering (module D). Everything below concerns only the legitimate platform (digital content subscriptions, social profiles, messaging, general premium features, platform operator status). Accessed date for all items: 2026-10-27.

Research standards: no finding below is a legal opinion. `APPROVED` is never self-assigned by research; it requires actual counsel review, permits, and a recorded operator decision.

## 1. Legal status of adult digital content platforms (OnlyFans-style)
Legal as an ordinary business federally. The main emerging constraint is the pending federal age-verification bill (#12), not yet in force.
- Status: `REQUIRES_LEGAL_REVIEW`

## 2. Paid listing / premium feature publishing (general)
No sector-specific restriction found beyond general federal (Competition Act) and provincial consumer-protection law.
- Status: `REQUIRES_LEGAL_REVIEW`

## 3. VIP profile / sponsored ranking features
Same general consumer-protection framework as #2.
- Status: `UNKNOWN`

## 4. Private messaging between users
No Canada-specific statute found restricting private in-app messaging beyond general criminal law (harassment, child-exploitation material reporting duties under the Criminal Code and An Act respecting the mandatory reporting of Internet child pornography by persons who provide an Internet service).
- Status: `REQUIRES_LEGAL_REVIEW`

## 5. Platform operator licenses
No general federal "platform operator license" found for a social/content platform as such.
- Status: `UNKNOWN`

## 6. Foreign company ownership rules
No restriction found on foreign shareholding of a Canadian federal corporation. The constraint is on **directors**, not shareholders (see #7).
- Status: `REQUIRES_LEGAL_REVIEW`
- Source: Canada Business Corporations Act (R.S.C., 1985, c. C-44), s.105, [consolidated text](https://laws-lois.justice.gc.ca/eng/acts/c-44/section-105.html) — accessed 2026-10-27

## 7. Can a Turkish citizen form a company there?
Yes as shareholder, but **federal incorporation under the Canada Business Corporations Act requires at least 25% of directors to be resident Canadians** (and if the corporation has fewer than four directors, at least one must be a resident Canadian) — s.105(3) CBCA. A Turkish citizen with no Canadian residency cannot be the sole director of a federal corporation without a resident Canadian co-director. **This federal requirement is avoidable by incorporating provincially instead**: one secondary source (a commercial non-resident-incorporation guide, not independently verified against each province's statute) claims only the federal regime and Manitoba still require a resident director among 14 Canadian corporate jurisdictions, with provinces like British Columbia and Alberta having dropped the requirement, and some other provinces substituting a resident-agent requirement instead. **This claim should be verified against the specific target province's Business Corporations Act before relying on it** — if accurate, incorporating in e.g. British Columbia or Ontario rather than federally may avoid the resident-director problem entirely for this project.
- Status: `REQUIRES_LEGAL_REVIEW` (the province-vs-federal distinction is the key open question — verify before choosing a structure)
- Source: [Canada Business Corporations Act s.105](https://laws-lois.justice.gc.ca/eng/acts/c-44/section-105.html); [Substance Law, "Do Canadian Companies Need Local Directors, Officers or Shareholders?"](https://substancelaw.ca/do-canadian-companies-need-local-directors-officers-or-shareholders/) — accessed 2026-10-27

## 8. Remote / online company incorporation
Both federal (Corporations Canada) and most provincial registries support online incorporation; can be completed remotely by a foreign founder subject to the director-residency question in #7.
- Status: `REQUIRES_LEGAL_REVIEW`

## 9. Local address / registered-agent requirements
A Canadian corporation (federal or provincial) must maintain a registered office address in Canada (in the relevant province); some provinces that waive the resident-director rule substitute a requirement for a Canada-resident agent/attorney for service instead (per the same source flagged in #7 — verify directly).
- Status: `REQUIRES_LEGAL_REVIEW`

## 10. Taxes relevant to a digital platform business
Standard federal + provincial corporate income tax (combined rates vary significantly by province, not surveyed here) plus GST/HST on digital supplies — Canada's GST/HST registration rules were extended to require non-resident suppliers of digital products/services to register and collect tax on supplies to Canadian consumers above a threshold, a separate question from where the company is incorporated.
- Status: `REQUIRES_LEGAL_REVIEW`

## 11. Data protection obligations
**PIPEDA** (Personal Information Protection and Electronic Documents Act) is the federal law, covering commercial activity across Canada **except** where an organization's handling of personal information occurs entirely within Alberta, British Columbia, or Quebec, which have their own "substantially similar" provincial laws (Quebec's Law 25 is notably stricter, GDPR-like, and independently relevant if Quebec users are served). PIPEDA's consent model allows **express or implied consent** (not strictly GDPR-style opt-in), requires organizations to state their collection purpose and collect only what's necessary, and carries mandatory breach-notification duties to the Privacy Commissioner and affected individuals for breaches creating a real risk of significant harm.
- Status: `REQUIRES_LEGAL_REVIEW` (Quebec's Law 25 should be separately scoped if targeting Quebec users specifically)
- Source: [Office of the Privacy Commissioner of Canada, "Businesses and your personal information"](https://priv.gc.ca/en/privacy-topics/your-privacy-rights/businesses-and-your-personal-information); [Wikipedia, PIPEDA](https://www.wikipedia.org/wiki/PIPEDA) — accessed 2026-10-27

## 12. 18+ / age verification legal requirements
**Bill S-210 / its reintroduced successor** (federal age-verification bill for online pornography) is **not yet law**. Status found in this pass: the original Bill S-210 passed the Senate in December 2023 and cleared second reading in the House of Commons but was suspended in January 2025; it was reintroduced in a new form (one source calls it "Bill S-209") around May 2025, adding age-estimation as an allowed method and narrowing the sexually-explicit-content definition, and was reported still before the Senate as of March 2026 — **current status should be re-checked directly against the Senate of Canada's website before relying on any date in this summary, as parliamentary bill tracking moves and this research did not find anything more recent than March 2026.** Proposed enforcement includes ISP-level blocking orders for non-compliant sites and fines of C$250,000 (first offence) / C$500,000 (subsequent). No comprehensive existing Canadian federal law currently mandates age verification for adult content platforms generally, as far as this research pass found — but this is an active, moving target, not a settled "no."
- Status: `UNKNOWN` (legislative status is genuinely unsettled, not just under-researched — re-verify at launch time regardless of what this document says)
- Source: [Ondato, "Age Verification in Canada: Laws, Requirements, and Business Implications"](https://ondato.com/blog/age-verification-canada/); [Daily Hive, "Pornhub could be blocked in Canada"](https://dailyhive.com/canada/pornhub-could-be-blocked-canada) — accessed 2026-10-27

## 13. Bank account and payment infrastructure access
No Canada-specific finding in this pass beyond the general cross-jurisdiction high-risk-merchant pattern documented in `docs/payments/PROVIDER_COMPARISON.md`.
- Status: `UNKNOWN`

## 14. Anti-trafficking / anti-exploitation obligations (generic platform moderation/reporting duties)
Criminal Code trafficking/exploitation offences apply to any platform used to facilitate such conduct, as in any jurisdiction; the mandatory internet-child-pornography-reporting act (#4) is the closest Canada-specific platform-duty analogue found. No Canadian equivalent of FOSTA-SESTA's specific civil-liability carve-out was found in this pass.
- Status: `UNKNOWN`

## 15. Marketing / search-engine advertising restrictions for adult content
No Canada-specific statutory restriction found in this pass beyond general Competition Act advertising rules and third-party ad-platform policies.
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
| 7. Turkish citizen company formation (federal vs. provincial) | REQUIRES_LEGAL_REVIEW | Y — key open question |
| 8. Remote incorporation | REQUIRES_LEGAL_REVIEW | Y |
| 9. Local address/agent | REQUIRES_LEGAL_REVIEW | Y |
| 10. Taxes | REQUIRES_LEGAL_REVIEW | Y |
| 11. Data protection (PIPEDA + Quebec Law 25) | REQUIRES_LEGAL_REVIEW | Y |
| 12. Age verification (Bill S-210, not yet law) | UNKNOWN | Y |
| 13. Banking/payments access | UNKNOWN | Y |
| 14. Anti-trafficking/moderation duties | UNKNOWN | Y |
| 15. Ad/marketing restrictions | UNKNOWN | Y |

No topic in this file reaches `APPROVED` or `RESTRICTED` — every row requires counsel review before any launch decision for this jurisdiction.
