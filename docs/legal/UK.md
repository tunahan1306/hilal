# United Kingdom — Jurisdiction Legal Research

**Scope note:** This document covers the legitimate platform only — digital content subscriptions, social profiles, private messaging, general paid/premium features, and platform operator licensing. It does **not** cover independent sex-worker advertising, service booking, or sexual-service payment brokering — that module is permanently out of scope for this project (conflicts with the project's existing product rule; see `docs/transformation/00_AUDIT.md`). No status below should be read as authorizing that excluded functionality.

**Research date:** 2026-10-27. **No legal review has occurred.** Every status below is a research finding, not a legal opinion, and `APPROVED` is never self-assigned by research — it requires actual counsel review, any required permits, and a recorded operator decision (see `docs/legal/JURISDICTION_MATRIX.md` for the decision-ledger pattern).

## 1. Legal status of adult digital content platforms (OnlyFans-style)

No UK statute bans adult digital-content subscription platforms as a business model; OnlyFans itself is UK-regulated precedent (operated by Fenix International Ltd, a UK company). The live regulatory exposure is the **Online Safety Act 2023 (OSA)** age-assurance regime for services that publish or host pornographic content.
- Since 25 July 2025, services with a UK link that publish/host pornographic content must use "highly effective age assurance" — Ofcom has been actively enforcing this, with fines ranging £80,000–£1.35m against named providers as of early 2026 ([inforrm.org](https://inforrm.org/2026/03/11/ofcom-steps-up-online-safety-act-enforcement-with-two-further-age-assurance-fines-for-pornographic-platforms-alexandros-antoniou/), [Ofcom Use of Age Assurance Report 2026](https://www.ofcom.org.uk/online-safety/protecting-children/use-of-age-assurance-report-2026)). Ongoing investigations (Aylo/Pornhub, ZD Media) are public ([Reed Smith](https://www.reedsmith.com/topics/uk-online-safety-act-2023/)).
- Ofcom's preferred model for dedicated pornography services is a "front gate" — no content visible pre-verification ([Ofcom](https://www.ofcom.org.uk/online-safety/protecting-children/age-checks-why-their-placement-matters-in-pornography)).
- **Status: REQUIRES_LEGAL_REVIEW.** The duty is clear and active; what's unresolved is whether a creator-subscription platform (content gated behind a paid/verified account, not openly published) falls inside "publishes or displays" under OSA the same way an open porn-tube site does. Counsel review needed before launch.

## 2. Paid listing / premium feature publishing (general)

No UK-specific licensing for paid visibility/premium features as a generic SaaS mechanic. Falls under ordinary consumer-protection law (Consumer Rights Act 2015, CMA digital markets guidance on fake/paid prominence disclosure) — paid promotion must be disclosed as such. **Status: UNKNOWN** (not separately researched beyond general consumer law baseline) — **REQUIRES_LEGAL_REVIEW** before implementation of specific mechanics (disclosure copy, cancellation flow).

## 3. VIP profile / sponsored ranking features

Same general consumer-protection/advertising-disclosure baseline as §2; ASA CAP Code requires clear marking of paid-for prominence in consumer-facing contexts. No sector-specific VIP/ranking rule found. **Status: REQUIRES_LEGAL_REVIEW.**

## 4. Private messaging between users

In scope of OSA's "user-to-user service" definition, which is broad — covers any service where user-generated content may be seen by other users; one-to-one email/aural communication is carved out, but in-app DM/messaging is not uniformly excluded ([Taylor Wessing OSA overview](https://www.taylorwessing.com/-/media/taylor-wessing/files/uk/online-safety-act---overview.pdf), [Ofcom categorised-duties page](https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/additional-duties-for-categorised-online-services)). Baseline duties (illegal-content risk assessment, child-safety duties if likely accessed by children) apply regardless of scale. Enhanced "Category 1" duties (identity verification option, non-verified-user filtering, etc.) only bite at very large UK user counts (34m MAU threshold with a recommender system, or 7m with resharing+recommender — [Ofcom 2024 advice](https://www.ofcom.org.uk/news-centre/2024/additional-duties-for-categorised-online-services)), unlikely to apply at launch scale. **Status: REQUIRES_LEGAL_REVIEW** for baseline duties; categorisation thresholds are a later-stage concern.

## 5. Platform operator licenses

No standalone "platform operator license" regime found for a social/content-subscription service as such. The operative framework is OSA registration/compliance (Ofcom is the regulator, not a licensor in the traditional sense — compliance is self-assessed with Ofcom enforcement after the fact) plus standard company/consumer law. **Status: REQUIRES_LEGAL_REVIEW** to confirm no sector-specific licence applies to the planned feature set.

## 6. Foreign company ownership rules

No residency requirement for directors or shareholders under the Companies Act 2006 — a non-resident (including a Turkish citizen) can be sole director and sole shareholder of a UK company ([LegalVision](https://legalvision.co.uk/corporations/permanent-resident-citizen-company-director/), [1st Formations](https://help.1stformations.co.uk/non-uk-residents/how-to-register-a-uk-limited-company-as-a-non-uk-resident/article)). **Status: UNKNOWN pending full verification against gov.uk**, but multiple independent commercial sources agree — low-risk finding, still flag for counsel sign-off before relying on it for the actual incorporation.

## 7. Can a Turkish citizen form a company here?

Yes, per §6 — no citizenship/residency bar. Practical requirement: identity verification with Companies House is now mandatory for all directors (effective date not confirmed in sources found — verify current Companies House guidance directly before relying on it). **Status: REQUIRES_LEGAL_REVIEW** (to confirm current ID-verification procedure, not the underlying permission).

## 8. Remote / online company incorporation

Yes — UK company formation is routinely done fully remotely via formation agents or Companies House's own online service; no requirement to be physically present. **Status: UNKNOWN** pending gov.uk verification, but well-established commercial practice.

## 9. Local address / registered-agent requirements

A UK company **must** have a registered office address in England/Wales, Scotland or Northern Ireland — a home-country (e.g. Turkish) address does not satisfy this; commercial registered-office services are the standard solution ([1office.co](https://1office.co/blog/uk-registered-office-address-non-resident/), [Rapid Formations](https://help.rapidformations.co.uk/overseas-residents/how-to-register-a-uk-limited-company-as-a-non-uk-resident)). A director's personal *service* address can be anywhere (publicly visible on the register) and is distinct from the registered office. **Status: REQUIRES_LEGAL_REVIEW** only to the extent of picking a specific registered-office provider; the requirement itself is clear.

## 10. Taxes relevant to a digital platform business

- **Corporation tax**: not separately re-verified this pass; UK main rate is public knowledge (25% main rate, small-profits rate for low-profit companies) — **UNKNOWN/not verified this research pass**, confirm against HMRC/gov.uk before use in financial modelling.
- **VAT on digital services**: UK VAT is charged based on customer location for B2C automated digital services (standard rate 20%); the test is automation/minimal human intervention, not content type ([avask.com](https://avask.com/?p=26661), [Tipalti](https://tipalti.com/blog/vat-on-digital-services-uk/)). A UK-established business selling to UK/overseas consumers must register and account for VAT; thresholds and marketplace "deemed supplier" rules need direct HMRC confirmation.
- **Status: REQUIRES_LEGAL_REVIEW** — confirm current rates/thresholds and whether platform/marketplace VAT rules (deemed-supplier obligations like Switzerland's, see below) apply to a UK-based creator-subscription platform.

## 11. GDPR / data protection obligations

UK GDPR + Data Protection Act 2018 apply as the direct successor regime to EU GDPR post-Brexit; ICO is the regulator. Not separately re-researched this pass beyond confirming the regime exists and is the applicable UK baseline — **Status: UNKNOWN (not researched in depth this pass) → REQUIRES_LEGAL_REVIEW.** Given the platform will process special-category data (likely — age-verification results, potentially sexual-orientation-adjacent profile data), a DPIA (Data Protection Impact Assessment) is almost certainly required before launch; confirm with counsel.

## 12. 18+ / age verification legal requirements

This is the single most material UK finding. See §1 — OSA age-assurance duty is **active, enforced, and carries real fines**. Key points:
- Duty applies since 25 July 2025 to services with a UK link publishing/hosting pornographic content ([phb.co.uk](https://www.phb.co.uk/article/online-safety-act-age-checks-individuals-2026/)).
- Ofcom favors "front gate" verification (no content visible pre-check) for dedicated adult services.
- Ofcom is due to report by end of October 2026 on reliably verifying age at 16 (separate, harder technical question than adult/minor) — relevant if any non-adult-but-restricted tier is ever contemplated (not currently planned here).
- **Status: RESTRICTED pending compliant age-assurance implementation** — this is not optional and not "requires review," it is an active, enforced legal duty that must be designed in from day one for any UK-facing adult content.

## 13. Bank account and payment infrastructure access

Adult content is universally classed as a "high-risk" merchant category by acquirers/processors — virtually every payment processor treats it this way ([decta.com](https://www.decta.com/company/media/what-is-a-high-risk-merchant-account), [Merchant Maverick](https://www.merchantmaverick.com/?p=113370)). Named UK-relevant high-risk acquirers/processors in vendor comparisons (unverified beyond the vendor's own claim): Axcess, Worldpay (adult among other sectors), Fibonatix, ECOMMPAY for "restricted/licensed operators." **All of this is `UNVERIFIED`** — these are marketing claims from formation/payment brokers, not confirmed acceptance policies; must be confirmed directly with each processor (see `docs/payments/PROVIDER_COMPARISON.md`, which covers CCBill/Segpay/Verotel/Epoch specifically). **Status: REQUIRES_LEGAL_REVIEW / commercial due diligence**, not a legal-status question per se.

## 14. Anti-trafficking / anti-exploitation obligations (generic moderation duties)

UK Modern Slavery Act 2015 §54 requires qualifying commercial organisations (revenue threshold applies) to publish an annual transparency statement on steps taken against slavery/trafficking in the business and supply chain — this is a **reporting obligation**, not a content-moderation mandate, and nothing found ties it directly to platform content-moderation duties ([gov.uk guidance via business-humanrights.org](https://business-humanrights.org/en/latest-news/uk-home-office-guidance-on-modern-slavery-act-transparency-requirements)). Separately, the OSA's illegal-content duties (§1/§4 above) require risk-assessing and acting on illegal content broadly, which would include trafficking-related content if present — this is the more directly relevant lever for a social/content platform's moderation obligations, not the Modern Slavery Act specifically. **Status: REQUIRES_LEGAL_REVIEW** to confirm whether the §54 revenue threshold will apply to this business and to design moderation/reporting duties against OSA illegal-content requirements.

## 15. Marketing / search-engine advertising restrictions for adult content

ASA (Advertising Standards Authority) CAP Code governs non-broadcast ads: bars sexual portrayal of anyone under or appearing under 18 (2018 rule), requires age-restricted ads not be directed at under-18s and not appear where under-16/17s are >25% of the audience, and requires evidence of age-verification tooling where adult-themed ads could reach minors ([ASA guidance PDF](https://www.asa.org.uk/static/44dc1935-0766-4378-91171e6954ae560a/Age-restricted-ads-online-targeting-guidance.pdf)). Broadcast (BCAP Code) separately lists pornography among prohibited categories outright — not relevant unless TV/radio advertising is ever planned. **Status: REQUIRES_LEGAL_REVIEW** for actual ad-copy/targeting compliance design.

## Operator summary

| Topic | Status | Review needed |
|---|---|---|
| 1. Adult content platform legality | REQUIRES_LEGAL_REVIEW | Y |
| 2. Paid listing/premium features | REQUIRES_LEGAL_REVIEW | Y |
| 3. VIP/sponsored ranking | REQUIRES_LEGAL_REVIEW | Y |
| 4. Private messaging | REQUIRES_LEGAL_REVIEW | Y |
| 5. Platform operator licenses | REQUIRES_LEGAL_REVIEW | Y |
| 6. Foreign company ownership | UNKNOWN (likely permissive) | Y |
| 7. Turkish citizen can incorporate | UNKNOWN (likely yes) | Y |
| 8. Remote incorporation | UNKNOWN (well-established practice) | Y |
| 9. Local registered office required | REQUIRES_LEGAL_REVIEW (requirement confirmed, provider TBD) | Y |
| 10. Taxes (corp tax, VAT) | REQUIRES_LEGAL_REVIEW | Y |
| 11. GDPR/UK-GDPR | REQUIRES_LEGAL_REVIEW | Y |
| 12. Age verification (OSA) | **RESTRICTED pending compliant implementation** | Y — mandatory, not optional |
| 13. Bank/payment access | REQUIRES_LEGAL_REVIEW / commercial diligence | Y |
| 14. Anti-trafficking/moderation duties | REQUIRES_LEGAL_REVIEW | Y |
| 15. Ad/marketing restrictions | REQUIRES_LEGAL_REVIEW | Y |

**No topic is APPROVED.** Nothing in this document authorizes publishing to UK users; it is input to the Country Policy Engine's decision record, which requires an actual legal reviewer, evidence reference, and recorded decision before any `permitted` status is set.
