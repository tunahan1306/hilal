# Germany — Jurisdiction Legal Research

Scope: digital content subscriptions, social profiles/messaging, general paid/premium features, platform operator licensing. **Out of scope by project decision:** independent sex-worker advertising, service booking, sexual-service payment brokering (module D). Note for clarity only: Germany regulates sex work separately via the Prostituiertenschutzgesetz (Prostitute Protection Act, 2017, registration/permit-based); this project does not build features for that activity and this fact was not researched further.

No item below is a permission to operate. `APPROVED` is never self-assigned by research — it requires actual legal counsel review, applicable permits, and a recorded operator decision.

---

### 1. Legal status of adult digital content platforms (OnlyFans-style)
**Finding:** Germany has a specific, actively-enforced statutory regime for this exact category — see §12 (age verification) below, which is the controlling law, not a generic EU rule. Any paid adult-content subscription surface serving German users falls under the Jugendmedienschutz-Staatsvertrag (JMStV) §4(2) "pornographic telemedia" rule, independent of and stricter than the general EU DSA baseline.
**Source:** [merlin.obs.coe.int — JMStV age verification analysis](https://merlin.obs.coe.int/article/9561); [computerbase.de — xHamster blocking order coverage](https://www.computerbase.de/2020-06/jugendschutz-pornografische-inhalte-netzsperre/) · Accessed 2026-10-27.
**Status:** RESTRICTED (a specific statutory gate exists and must be satisfied before any adult-content feature serves German users — not a simple "review and proceed" item). **Review needed:** Yes.

### 2. Paid listing / premium-feature publishing (general, not escort-specific)
**Finding:** Not Germany-specifically researched; general German consumer-protection/distance-selling law (BGB, implementing EU Consumer Rights Directive) applies to any paid digital feature not itself pornographic telemedia.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

### 3. VIP profile / sponsored ranking
**Finding:** Same framework as #2; paid placement disclosure rules under German unfair-competition law (UWG) likely apply.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

### 4. Private messaging between users
**Finding:** Not Germany-specifically researched; Telemediengesetz (TMG)/Telekommunikation-Telemedien-Datenschutz-Gesetz (TTDSG) confidentiality-of-communications rules plus GDPR apply to any messaging feature.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

### 5. Platform operator licenses
**Finding:** No general social/content-platform operator license found beyond the JMStV age-verification gate (#1/#12) for adult content specifically. If the platform ever directly handles/holds funds rather than via a licensed PSP, BaFin payment-institution/e-money licensing under PSD2 would apply — not currently triggered (module F is mock-only).
**Source:** UNVERIFIED for BaFin specifics — general PSD2 knowledge, not independently checked this pass.
**Status:** REQUIRES_LEGAL_REVIEW (once real payments are considered); RESTRICTED for the adult-content-specific JMStV gate (see #1). **Review needed:** Yes.

### 6. Foreign company ownership
**Finding:** Commercial-formation-provider consensus: no citizenship requirement to be a GmbH/UG shareholder or Geschäftsführer (managing director); a foreign national living anywhere can hold both roles.
**Source:** [clevver.io — Business Germany foreigner](https://clevver.io/en/blog/business-germany-foreigner) · Accessed 2026-10-27. Commercial source, not independently confirmed against Handelsregister/IHK official text.
**Status:** REQUIRES_LEGAL_REVIEW (vendor-source only). **Review needed:** Yes.

### 7. Can a Turkish citizen form a company in Germany
**Finding:** Per the same commercial sources, yes — no residency/citizenship bar found on GmbH/UG formation. Practical hurdle flagged by multiple vendor sources is **opening a German bank account**: German banks apply strict KYC and reportedly often reject non-resident applicants, which can stall the whole incorporation even if the legal formation itself has no citizenship bar.
**Source:** Same as #6; [buse.de — Remote GmbH formation](https://buse.de/en/insights/remote-gmbh-formation-now-and-in-the-future/) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 8. Remote / online company incorporation
**Finding:** Sources conflict on practicality: one source says online/video notarization is now technically possible for GmbH formation in some cases, another says remote notary appointments are possible "in theory" but hard to obtain in practice, requiring a notarized power-of-attorney and a proxy instead. Neither claim independently verified against the Bundesnotarkammer (Federal Chamber of Notaries).
**Source:** [buse.de](https://buse.de/en/insights/remote-gmbh-formation-now-and-in-the-future/); [firma.de — GmbH formation guide](https://www.firma.de/en/company-formation/how-to-set-up-a-gmbh-the-definitive-guide-to-starting-a-limited-liability-company-in-germany/) · Accessed 2026-10-27.
**Status:** UNKNOWN (conflicting vendor claims). **Review needed:** Yes.

### 9. Local address / registered-agent requirement
**Finding:** A GmbH/UG needs a German business address for Handelsregister (commercial register) registration; translations/apostilles of foreign documents add cost and time per vendor sources.
**Source:** Same vendor sources as #6-8.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 10. Taxes relevant to a digital platform business
**Finding:** Not independently re-verified this pass beyond general knowledge; Germany's standard VAT (Umsatzsteuer) rate is commonly cited at 19%, with the same EU-wide €10,000 cross-border B2C threshold and One-Stop-Shop (OSS) mechanism as other EU states. Vendor-quoted solo-founder GmbH formation cost: approx. €708 plus statutory minimum share capital (GmbH: €25,000, of which at least €12,500 must be paid in at formation — this specific capital figure is general GmbH-law knowledge, not re-verified against a fresh official source this pass).
**Source:** [firma.de](https://www.firma.de/en/company-formation/how-to-set-up-a-gmbh-the-definitive-guide-to-starting-a-limited-liability-company-in-germany/) · Accessed 2026-10-27.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 11. GDPR / data protection obligations
**Finding:** GDPR applies directly, layered with Germany's Bundesdatenschutzgesetz (BDSG) and the TTDSG for telecom/telemedia-specific cookie/consent rules. Germany is unusual among EU states in having **both** a federal authority (Bundesbeauftragte für den Datenschutz und die Informationsfreiheit, BfDI) **and** separate state-level (Länder) data protection authorities with overlapping jurisdiction depending on the sector/controller — this split means identifying the *correct* competent authority for a given service requires its own legal assessment, not just "GDPR applies."
**Source:** General EDPB member-list structure (BfDI listed as Germany's EDPB representative) — [EDPB — Our members](https://www.edpb.europa.eu/about-edpb/our-members) · Accessed 2026-10-27. Federal/Länder split stated from general knowledge, not re-verified against a fresh official source this pass.
**Status:** REQUIRES_LEGAL_REVIEW. **Review needed:** Yes.

### 12. 18+ / age verification legal requirements
**Finding:** This is Germany's most consequential, concrete, and currently-enforced requirement for this entire project. JMStV §4(2): pornographic telemedia may only be offered to a "closed user group" of verified adults. The Commission for the Protection of Minors in the Media (KJM) evaluates and approves specific age-verification systems against this standard — historically requiring a **face-to-face identification step** (e.g. Postident); ID-number checks, uploaded ID photos, or plain webcam checks alone have been explicitly rejected as insufficient. Since 2022 the KJM has approved **biometric age-estimation** systems (ML-based, no ID document needed); in **January 2026** it approved a newer hybrid method combining automated ID-document check + biometric facial scan + AI-assisted comparison. Non-compliance has led to **ISP-level blocking orders** (e.g. xHamster) as a last-resort enforcement measure; one source (single, not cross-verified) cites administrative fines up to €500,000.
**Source:** [merlin.obs.coe.int](https://merlin.obs.coe.int/article/9561); [computerbase.de](https://www.computerbase.de/2020-06/jugendschutz-pornografische-inhalte-netzsperre/) · Accessed 2026-10-27.
**Status:** RESTRICTED — this is an affirmative, specific legal gate (not just "needs review") that must be satisfied with a KJM-recognized age-verification method before any pornographic/adult content is served to German users. **Review needed:** Yes, urgently, before any adult-content feature targets Germany — this should directly inform the Identity & Verification module's (A) age-verification-provider abstraction, since a generic self-declared/18+-checkbox approach is known to be legally insufficient in this jurisdiction specifically.

### 13. Bank account / payment infrastructure access
**Finding:** Vendor sources flag German bank KYC as a practical bottleneck for non-resident company founders generally (see #7); not researched specifically for adult/high-risk-rated merchant categories this pass.
**Source:** Same as #7.
**Status:** UNKNOWN. **Review needed:** Yes.

### 14. Anti-trafficking / anti-exploitation obligations (moderation/reporting duties)
**Finding:** Not specifically researched this pass; general EU CSAM detection/reporting and DSA notice-and-action duties apply, layered on Germany's own network-enforcement law (NetzDG) notice-and-takedown obligations for certain unlawful content categories on larger platforms.
**Source:** UNVERIFIED — NetzDG applicability stated from general knowledge, not re-verified this pass.
**Status:** UNKNOWN. **Review needed:** Yes.

### 15. Marketing / search-engine advertising restrictions for adult content
**Finding:** Not Germany-specifically researched; Google Ads/Meta platform-level adult-content ad restrictions apply regardless of German law, and German youth-protection advertising rules (JMStV advertising provisions) may separately restrict how adult-content services can be marketed.
**Source:** UNVERIFIED.
**Status:** UNKNOWN. **Review needed:** Yes.

---

## Operator summary

| # | Topic | Status | Review needed |
|---|---|---|---|
| 1 | Adult digital content platform legal status | RESTRICTED | Y |
| 2 | Paid listing / premium publishing | UNKNOWN | Y |
| 3 | VIP / sponsored ranking | UNKNOWN | Y |
| 4 | Private messaging | UNKNOWN | Y |
| 5 | Platform operator licenses | REQUIRES_LEGAL_REVIEW / RESTRICTED (adult content) | Y |
| 6 | Foreign company ownership | REQUIRES_LEGAL_REVIEW | Y |
| 7 | Turkish citizen company formation | REQUIRES_LEGAL_REVIEW | Y |
| 8 | Remote incorporation | UNKNOWN | Y |
| 9 | Local address / registered agent | REQUIRES_LEGAL_REVIEW | Y |
| 10 | Taxes | REQUIRES_LEGAL_REVIEW | Y |
| 11 | GDPR (+ BDSG/TTDSG, federal/Länder split) | REQUIRES_LEGAL_REVIEW | Y |
| 12 | Age verification (JMStV §4(2)) | **RESTRICTED — concrete statutory gate, not just a review item** | Y |
| 13 | Bank/payment access | UNKNOWN | Y |
| 14 | Anti-trafficking/moderation duties | UNKNOWN | Y |
| 15 | Ad platform restrictions | UNKNOWN | Y |

**Biggest open question / blocker:** Germany is the one jurisdiction researched this pass with a **concrete, currently-enforced, named legal gate** (JMStV §4(2), KJM-approved age verification, closed user group) standing between this project and serving adult content to German users at all — this is categorically different from the "general review needed" status of most other findings, and should be treated as a hard launch blocker for Germany specifically until a KJM-recognized verification method is selected and implemented.
