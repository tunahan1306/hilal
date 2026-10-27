# Belgium — Jurisdiction Legal Research

Scope: digital content subscriptions, social profiles/messaging, general paid/premium features, platform operator licensing. **Out of scope by project decision:** independent sex-worker advertising, service booking, sexual-service payment brokering (module D). Note for clarity only: Belgium decriminalized sex work in 2022 (removed from the penal code, recognized as a profession with labour-law protections); this project does not build features for that activity and this fact was not researched further.

No item below is a permission to operate. `APPROVED` is never self-assigned by research — it requires actual legal counsel review, applicable permits, and a recorded operator decision.

---

### 1. Legal status of adult digital content platforms (OnlyFans-style)
**Finding:** No Belgium-specific statute was found targeting creator-subscription content platforms as a category; general e-commerce, consumer-protection, and the EU Digital Services Act (DSA) due-diligence rules apply to any platform operating in/accessible from Belgium. Relevant: the European Commission's 26 March 2026 preliminary findings that Pornhub and XNXX breach DSA Article 28 (minor protection) by relying on self-declared age/content warnings instead of privacy-preserving age verification — directly relevant precedent for any adult-content surface.
**Source:** [digitalpolicyalert.org — Commission preliminary findings vs Pornhub](https://digitalpolicyalert.org/event/38808-european-commission-preliminarily-found-pornhub-in-breach-of-the-digital-services-act-for-failing-to-protect-minors) (26 Mar 2026) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 2. Paid listing / premium-feature publishing (general, not escort-specific)
**Finding:** No specific prohibition found for general paid visibility/premium-tier features on a social platform; falls under standard Belgian consumer protection (Code de droit économique) and distance-selling rules for any paid digital service.
**Source:** UNVERIFIED — no official source directly checked for this specific point; inferred from general Belgian consumer law framework.
**Status:** UNKNOWN. **Review needed:** Yes.

### 3. VIP profile / sponsored ranking
**Finding:** Same framework as #2 — a monetized visibility feature is a paid digital service subject to consumer-protection/advertising transparency rules (must be disclosed as paid placement, per general EU unfair commercial practices rules).
**Source:** UNVERIFIED — general EU Unfair Commercial Practices Directive framework, not Belgium-specific source checked.
**Status:** UNKNOWN. **Review needed:** Yes.

### 4. Private messaging between users
**Finding:** No Belgium-specific messaging-platform statute found; general e-privacy (ePrivacy Directive implementation) and GDPR confidentiality-of-communications rules apply.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

### 5. Platform operator licenses
**Finding:** No general "platform operator license" regime found for a social/content platform in Belgium; payment-services and e-money activities (if the platform ever handles funds directly rather than via a licensed PSP) would trigger PSD2/National Bank of Belgium licensing — this project's payments are mock-only, so not currently triggered, but matters once module F goes live with a real provider.
**Source:** UNVERIFIED — general PSD2 knowledge, no Belgium-specific official source checked this pass.
**Status:** REQUIRES_LEGAL_REVIEW (once real payments are considered). **Review needed:** Yes.

### 6. Foreign company ownership
**Finding:** Commercial-guide consensus: no citizenship restriction on BV/SRL ownership; 100% foreign ownership permitted; founders/directors need not reside in Belgium.
**Source:** [globallawexperts.com — Private Limited Company Belgium](https://globallawexperts.com/private-limited-company-belgium/); [Expanship — Incorporation requirements in Belgium](https://www.expanship.com/be/blog/incorporation-requirements-in-belgium) · Accessed 2026-10-27. Both are commercial formation-service sites, not official sources.
**Status:** REQUIRES_LEGAL_REVIEW (commercial-source only, not confirmed against FPS Economy/notary-chamber text). **Review needed:** Yes.

### 7. Can a Turkish citizen form a company in Belgium
**Finding:** Non-EU/non-EEA nationals who will be *personally active* in running the business may need a "professional card" (beroepskaart/carte professionnelle), issued regionally (Flanders/Wallonia/Brussels have separate issuing bodies). Sources conflict on whether this applies to a passive foreign shareholder/non-resident director versus someone personally conducting self-employed activity in Belgium — one source (Deloitte) states no special qualification is needed to be appointed a director. This conflict was not resolved.
**Source:** [vlolawfirm.com — Belgium local partner required Q&A](https://vlolawfirm.com/long-tail-qa/belgium-local-partner-required) (commercial, unofficial); [Deloitte — Doing Business in Belgium](https://www2.deloitte.com/content/dam/Deloitte/global/Documents/Legal/dttl-legal-doing-business-in-belgium.pdf) · Accessed 2026-10-27.
**Status:** UNKNOWN (conflicting sources, no official FPS Economy page found). **Review needed:** Yes — this is the single most important open question for Belgium.

### 8. Remote / online company incorporation
**Finding:** Formation still generally requires a notarial deed; one commercial source claims a trend toward video-notary/digital filing in 2026 but this is unverified against an official source.
**Source:** Same commercial sources as #6, #7. UNVERIFIED for the "video-notary in 2026" claim specifically.
**Status:** UNKNOWN. **Review needed:** Yes.

### 9. Local address / registered-agent requirement
**Finding:** A Belgian company must have a registered office in Belgium (physical, or an accepted "virtual office" arrangement per commercial sources — not confirmed officially).
**Source:** Same commercial sources as #6. **Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 10. Taxes relevant to a digital platform business
**Finding:** Belgian standard VAT (BTW/TVA) rate is 21%, applying to B2C digital/SaaS services. Cross-border EU B2C digital sales use the EU-wide €10,000/year threshold before VAT is due in the customer's country, reportable via the EU One-Stop-Shop (OSS) instead of registering in every member state. A non-established business making taxable supplies in Belgium must register there (no threshold for non-established sellers). Corporate income tax rate not separately re-confirmed this pass (Belgium's standard CIT rate is commonly cited as 25%, SME-reduced rate ~20% on the first bracket — not verified against FPS Finance this pass).
**Source:** [Kintsugi — Belgium VAT Guide 2026](https://trykintsugi.com/sales-tax-guides/europe/belgium) (vendor guide, cites EU Commission/FPS Finance without direct links) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW (VAT mechanics reasonably confident; CIT rate and any Belgium-specific digital-services surtax not verified). **Review needed:** Yes.

### 11. GDPR / data protection obligations
**Finding:** GDPR applies directly (EU Regulation, no transposition needed for most provisions). Belgian supervisory authority: Autorité de la protection des données / Gegevensbeschermingsautoriteit (APD-GBA), Brussels. As a platform processing special-category considerations (adult content context, potential sensitive inferences) and handling EU residents' data, full GDPR compliance (DPIA, Art. 9 special-category handling if applicable, breach notification, DPO assessment) is required regardless of where Hilal is incorporated, if it serves Belgian users.
**Source:** [EDPB — Our members](https://www.edpb.europa.eu/about-edpb/our-members) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 12. 18+ / age verification legal requirements
**Finding:** No Belgium-specific statute beyond general EU DSA obligations found. The EU Commission's 2026 enforcement posture (see #1) explicitly states self-declared age, blurring, and "adults only" labels are **not** sufFicient age-verification measures under DSA Article 28; a privacy-preserving age-verification mechanism is expected (the Commission is distributing a white-label verification app pending the EU digital identity wallet, expected availability referenced through end of 2026). This is a live, actively enforced area — not a stable baseline to design against without re-checking at implementation time.
**Source:** [digitalpolicyalert.org](https://digitalpolicyalert.org/event/38808-european-commission-preliminarily-found-pornhub-in-breach-of-the-digital-services-act-for-failing-to-protect-minors) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW (high-priority, actively moving target). **Review needed:** Yes.

### 13. Bank account / payment infrastructure access
**Finding:** Not researched Belgium-specifically this pass; general EU pattern is that adult/high-risk-rated businesses face elevated KYB scrutiny from mainstream acquiring banks, hence the brief's interest in CCBill/Segpay/Verotel/Epoch-style high-risk PSPs (see `docs/payments/PROVIDER_COMPARISON.md`, separate research track).
**Source:** UNVERIFIED — not researched this pass.
**Status:** UNKNOWN. **Review needed:** Yes.

### 14. Anti-trafficking / anti-exploitation obligations (platform moderation/reporting duties, not sex-work licensing)
**Finding:** Not specifically researched this pass; general EU Child Sexual Abuse Material (CSAM) detection/reporting obligations and DSA notice-and-action duties apply to any platform hosting user content, regardless of adult/non-adult focus.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

### 15. Marketing / search-engine advertising restrictions for adult content
**Finding:** Not specifically researched this pass; Google Ads and Meta both have standing platform-level adult-content advertising restrictions independent of Belgian law, which will bind marketing strategy regardless of legal permissibility.
**Source:** UNVERIFIED (platform policy, not Belgian law).
**Status:** UNKNOWN. **Review needed:** Yes.

---

## Operator summary

| # | Topic | Status | Review needed |
|---|---|---|---|
| 1 | Adult digital content platform legal status | REQUIRES_LEGAL_REVIEW | Y |
| 2 | Paid listing / premium publishing | UNKNOWN | Y |
| 3 | VIP / sponsored ranking | UNKNOWN | Y |
| 4 | Private messaging | UNKNOWN | Y |
| 5 | Platform operator licenses | REQUIRES_LEGAL_REVIEW | Y |
| 6 | Foreign company ownership | REQUIRES_LEGAL_REVIEW | Y |
| 7 | Turkish citizen company formation | UNKNOWN (open conflict in sources) | Y |
| 8 | Remote incorporation | UNKNOWN | Y |
| 9 | Local address / registered agent | REQUIRES_LEGAL_REVIEW | Y |
| 10 | Taxes | REQUIRES_LEGAL_REVIEW | Y |
| 11 | GDPR | REQUIRES_LEGAL_REVIEW | Y |
| 12 | Age verification | REQUIRES_LEGAL_REVIEW (active enforcement area) | Y |
| 13 | Bank/payment access | UNKNOWN | Y |
| 14 | Anti-trafficking/moderation duties | UNKNOWN | Y |
| 15 | Ad platform restrictions | UNKNOWN | Y |

**Biggest open question:** whether a Turkish national (as a non-resident, non-EU founder not personally conducting business day-to-day in Belgium) needs a regional "professional card" to found/direct a Belgian BV — sources directly conflict and no official FPS Economy text was found confirming either reading.
