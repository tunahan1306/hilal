# Jurisdiction: United States

Scope note: out of scope for this research — independent sex-worker advertising, service booking, sexual-service payment brokering (module D). Everything below concerns only the legitimate platform (digital content subscriptions, social profiles, messaging, general premium features, platform operator status). Accessed date for all items: 2026-10-27.

Research standards: no finding below is a legal opinion. `APPROVED` is never self-assigned by research; it requires actual counsel review, permits, and a recorded operator decision. The US is 50+ separate state-law regimes layered under federal law — this file identifies the structure of the problem, not a complete 50-state survey; a real launch needs state-by-state counsel review, especially given active, fast-moving litigation.

## 1. Legal status of adult digital content platforms (OnlyFans-style)
Legal as an ordinary business at the federal level. The real complexity is the **state-law age-verification patchwork** (#12) and **FOSTA-SESTA platform-liability exposure** (#14), both of which are live, material, and still evolving as of this research pass.
- Status: `REQUIRES_LEGAL_REVIEW`

## 2. Paid listing / premium feature publishing (general)
No federal restriction found beyond general FTC Act Section 5 (unfair/deceptive practices) and state consumer-protection law (which varies by state and is not separately surveyed here).
- Status: `REQUIRES_LEGAL_REVIEW`

## 3. VIP profile / sponsored ranking features
Same general FTC/state consumer-protection framework as #2.
- Status: `UNKNOWN`

## 4. Private messaging between users
No federal statute specifically regulating private in-app messaging beyond general content-moderation law (Section 230, #14) and state-specific statutes some states have begun enacting around minors' access to messaging/social features — not separately surveyed per-state in this pass.
- Status: `UNKNOWN`

## 5. Platform operator licenses
No general federal "platform operator license" for a social/content platform. Some individual states have proposed or enacted social-media-specific regulatory regimes (separate from the adult-content age-verification laws in #12); not separately surveyed here.
- Status: `UNKNOWN`

## 6. Foreign company ownership rules
No general federal restriction on foreign ownership of a US LLC or corporation. Delaware and Wyoming (the two most commonly used states for non-resident founders) impose **no residency or citizenship requirement on LLC members/owners**.
- Status: `REQUIRES_LEGAL_REVIEW` (confirm no sector-specific federal ownership restriction applies to this business model — none found in this pass, but not independently exhaustive)
- Source: [Rho, "Delaware LLC for Non-US Residents"](https://www.rho.co/blog/delaware-llc-non-us-residents); [Zenind, "Forming a Wyoming LLC as a Foreigner"](https://www.zenind.com/help/post/forming-a-wyoming-llc-as-a-foreigner-a-complete-guide-to-requirements-benefits-and-filing-steps) — accessed 2026-10-27

## 7. Can a Turkish citizen form a company there?
Yes. A non-US person can own a Delaware or Wyoming LLC (or corporation) with **no US citizenship, residency, Green Card, SSN, or ITIN required to form the entity**. This is structurally simpler than Australia/NZ/Canada, which each require at least one locally resident director. The practical bottleneck is not formation but:
- **EIN**: a non-resident without an SSN/ITIN must apply via paper Form SS-4 (the IRS's online EIN application requires an SSN/ITIN) — the responsible party listed is the owner, not the registered agent.
- **US bank account**: described consistently across sources as the hardest step — banks generally want an EIN plus formation documents, an operating agreement, owner ID, and proof of business activity, and formation alone does not guarantee approval.
- **Foreign-owned single-member LLC reporting**: IRS Form 5472 filing is required for a foreign-owned disregarded-entity LLC, with a cited penalty around $25,000 for non-filing — this is a real, easily-missed compliance trap for exactly this structure (confirm current penalty amount with the IRS/a US tax advisor; one secondary source flagged it, not independently verified against current IRS guidance).
- Status: `REQUIRES_LEGAL_REVIEW` (formation itself is low-risk/well-trodden; banking and 5472 compliance are the real open questions)
- Source: [Rho, "Delaware LLC for Non-US Residents"](https://www.rho.co/blog/delaware-llc-non-us-residents); [terms.law, "US LLC for Non-Residents: Delaware vs Wyoming"](https://terms.law/insights/us-llc-non-residents-delaware-wyoming.html) — accessed 2026-10-27. Several supporting sources in this space are formation-service vendor blogs; treat fee/pricing claims as marketing, not fact.

## 8. Remote / online company incorporation
Delaware and Wyoming both support fully remote, online LLC/corporation formation via the Secretary of State, typically same-week turnaround through a registered agent service; no requirement to visit the US.
- Status: `REQUIRES_LEGAL_REVIEW`

## 9. Local address / registered-agent requirements
A registered agent with a physical in-state address is mandatory in both Delaware and Wyoming (standard for all US states); this is a commodity service, not a substantive barrier.
- Status: `REQUIRES_LEGAL_REVIEW`

## 10. Taxes relevant to a digital platform business
Federal: a single-member foreign-owned LLC is typically a "disregarded entity" for federal tax purposes but still has reporting obligations (Form 5472 + pro forma 1120, #7) even with no US tax liability if there's no US trade or business; this determination (whether the business constitutes a US trade or business) is fact-specific and needs direct tax counsel, not generic research. State-level: Delaware has a flat annual LLC franchise tax (~$300, not independently re-verified this pass); Wyoming has no state income tax. Sales/use tax on digital products varies significantly by the customer's state and is a separate, materially complex question (many states now tax digital subscriptions) not surveyed here.
- Status: `REQUIRES_LEGAL_REVIEW`

## 11. Data protection obligations
No single federal comprehensive privacy law; instead a patchwork of state laws (California CCPA/CPRA, and a growing list of other states with comprehensive privacy statutes), each with different thresholds and obligations, plus COPPA at the federal level for any service that could be directed to or knowingly collects data from children under 13 (relevant given the age-verification/minors-access concerns threading through #12). Not separately state-surveyed in this pass — flag as requiring a dedicated state-privacy-law review once target states are known.
- Status: `UNKNOWN`

## 12. 18+ / age verification legal requirements — material finding
This is the most consequential, fastest-moving legal fact for the US in this entire research pass:
- The **US Supreme Court upheld Texas's age-verification law (H.B. 1181) in *Free Speech Coalition v. Paxton*, 6-3, on June 27, 2025** (No. 23-1122), applying intermediate scrutiny and holding states may require age verification (via government ID or a "commercially reasonable" method based on transactional data) for websites where at least one-third of content is "sexual material harmful to minors." This reversed the stricter-scrutiny line from *Ashcroft v. ACLU* (2002) and *US v. Playboy* (2000) for this category of law. The Fifth Circuit separately struck the law's mandatory warning-label requirement on compelled-speech grounds (that holding was not before the Supreme Court).
- Following this ruling, **roughly 25–27 US states** now have adult-site age-verification laws in effect or imminent, with sources disagreeing on the exact current count/list as of this research pass (tracked lists include at minimum Louisiana, Utah, Mississippi, Virginia, Arkansas, Texas, Montana, North Carolina, Idaho, Kansas, Kentucky, Nebraska, Indiana, Alabama, Oklahoma, Florida, Tennessee, South Carolina, Georgia, Wyoming, South Dakota, North Dakota, Arizona, Ohio, Missouri, West Virginia, Iowa — not all confirmed current/in-force; some are enjoined in litigation, e.g. Arkansas reported under preliminary injunction by one source, Georgia reported as enjoined by another).
- **This is a genuine per-state compliance patchwork, not a single federal rule.** A real launch decision needs a current, counsel-verified state list (the Free Speech Coalition's own litigation tracker, or a state AG's office, are the most authoritative ongoing sources — not this research pass) before deciding which US states to serve adult content in and how.
- Status: `REQUIRES_LEGAL_REVIEW` — highest-priority finding for the US.
- Sources: [The FIRE, "Free Speech Coalition v. Paxton"](https://www.thefire.org/supreme-court/free-speech-coalition-v-paxton); [EFF, "Supreme Court's Decision...Tramples Free Speech and Undermines Privacy"](https://www.eff.org/pages/supreme-courts-decision-age-verification-tramples-free-speech-and-undermines-privacy); [Faegre Drinker summary](https://www.faegredrinker.com/zh/insights/publications/2025/6/supreme-court-decides-free-speech-coalition-inc-v-paxton); [Xident, "Age Verification Laws by State (2026)"](https://xident.io/blog/us-age-verification-compliance-patchwork-2026/); [AgeOnce, "US State Age Verification Laws 2026"](https://www.ageonce.com/blog/us-state-age-verification-laws-2026) — accessed 2026-10-27. State-list sources conflict with each other; treat none as a final authority.

## 13. Bank account and payment infrastructure access
Consistent cross-source finding: mainstream US banks and payment processors treat adult content as "high risk" and commonly decline these merchants outright, citing reputational risk and elevated chargeback rates; specialized high-risk acquirers (CCBill, Segpay, Epoch, Verotel — see `docs/payments/PROVIDER_COMPARISON.md`) exist specifically to serve this gap. One illustrative (single-source, unverified independently) fee listing for CCBill cites 3.9% + $0.55/transaction, a 2% recurring-billing surcharge, and a 5% rolling reserve held 8 weeks — do not treat as current/binding without direct confirmation from the provider.
- Status: `UNKNOWN` (general pattern well-documented; specific provider terms must be confirmed directly, see payment-processor research)
- Source: [PaymentCloud, "Is CCBill Safe?"](https://paymentcloudinc.com/blog/is-ccbill-safe/); [Merchant Maverick, "CCBill Review"](https://www.merchantmaverick.com/reviews/ccbill-review) — accessed 2026-10-27

## 14. Anti-trafficking / anti-exploitation obligations — material finding (FOSTA-SESTA)
**FOSTA-SESTA (2018)** amended Section 230 of the Communications Decency Act to carve out a **civil-liability exception for claims involving sex trafficking** — platforms lose Section 230 immunity for civil claims by trafficking victims where the platform violated federal sex-trafficking law. It also created a new federal crime (18 U.S.C. § 2421A) for operating a service "with the intent to promote or facilitate prostitution," and allows state attorneys general to bring civil penalties, with potential state criminal exposure where conduct would violate 18 U.S.C. § 1591.
- **Important nuance for this project**: FOSTA-SESTA is a liability carve-out tied to *intent to promote/facilitate* trafficking or prostitution — it does not impose an affirmative, general content-moderation duty on ordinary social/content platforms. Section 230's core immunity (including for good-faith moderation/editing) remains intact outside this carve-out. The practical implication for this platform is standard: maintain real moderation, reporting, and takedown processes (which this codebase already has via `moderation_reports`/`moderation_actions` and the content-policy scanner) so that it is never plausibly characterized as "intending to facilitate" prohibited conduct — this is exactly why module D (independent sex-worker advertising / service booking / payment brokering) was excluded from this project in the first place; building that functionality is precisely the fact pattern FOSTA-SESTA and its criminal provisions target.
- Status: `REQUIRES_LEGAL_REVIEW` (the general compliance posture is already directionally correct per the exclusion of module D; counsel should still confirm the platform's moderation/reporting practices are adequate before launch)
- Source: [Lexplug, "Sex Trafficking (FOSTA-SESTA)"](https://www.lexplug.com/outlines/sex-trafficking-fosta-sesta); statutory basis 47 U.S.C. § 230(e), 18 U.S.C. §§ 1591, 1595, 2421A (statutory text not independently re-read this pass — confirm directly) — accessed 2026-10-27

## 15. Marketing / search-engine advertising restrictions for adult content
No federal statute specifically restricting adult-content marketing found in this pass beyond general FTC advertising rules; the practical constraint is third-party platform policy (Google Ads, Meta, Apple/Google app-store policies all restrict or prohibit adult-content advertising/apps), not US law per se.
- Status: `UNKNOWN`

## Operator summary

| Topic | Status | Review needed |
|---|---|---|
| 1. Adult content platform legality | REQUIRES_LEGAL_REVIEW | Y |
| 2. Paid listing/premium features | REQUIRES_LEGAL_REVIEW | Y |
| 3. VIP/sponsored ranking | UNKNOWN | Y |
| 4. Private messaging | UNKNOWN | Y |
| 5. Platform operator licenses | UNKNOWN | Y |
| 6. Foreign ownership | REQUIRES_LEGAL_REVIEW | Y |
| 7. Turkish citizen company formation | REQUIRES_LEGAL_REVIEW | Y |
| 8. Remote incorporation | REQUIRES_LEGAL_REVIEW | Y |
| 9. Local address/agent | REQUIRES_LEGAL_REVIEW | Y |
| 10. Taxes | REQUIRES_LEGAL_REVIEW | Y |
| 11. Data protection (state patchwork + COPPA) | UNKNOWN | Y |
| 12. Age verification (state patchwork, post-Paxton) | REQUIRES_LEGAL_REVIEW | Y — highest priority |
| 13. Banking/payments access | UNKNOWN | Y |
| 14. FOSTA-SESTA / anti-trafficking liability | REQUIRES_LEGAL_REVIEW | Y — second-highest priority |
| 15. Ad/marketing restrictions | UNKNOWN | Y |

No topic in this file reaches `APPROVED` or `RESTRICTED` — every row requires counsel review before any launch decision for this jurisdiction. **Items 12 and 14 together mean a US launch should be scoped state-by-state, not treated as one national decision.**
