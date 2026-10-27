# Competitor Research — Digital Content Subscription Platforms

**Scope note:** This research covers only the digital-content creator subscription model
(OnlyFans, Fansly, Fanvue). Escort/independent-advertising platforms (tryst.link, AdultWork,
kinky.nl, sexjobs.nl, redlights.nl, topescort.nl, getkinky.nl, grenddo.com) were explicitly
excluded — they implement the "module D" functionality (service booking / payment brokering
for sexual services) that this project has decided not to build. See
[docs/transformation/00_AUDIT.md](../transformation/00_AUDIT.md).

All facts below were checked via web search on **2026-10-27**. Payment METHOD (how a user pays,
e.g. Visa) is kept distinct from payment PROCESSOR (who processes it, e.g. CCBill). Where a
processor could not be verified from a credible source, it is marked `UNVERIFIED` rather than
guessed.

---

## OnlyFans

| | |
|---|---|
| **Legal operating entity** | Fenix International Limited |
| **Incorporation country** | United Kingdom (England & Wales) |
| **Registry** | Companies House, company no. **10354575**, incorporated 1 Sept 2016, registered office 9th Floor, 107 Cheapside, London EC2V 6DN ([Companies House filing history](https://find-and-update.company-information.service.gov.uk/company/10354575/filing-history)) |
| **Ownership** | Leonid Radvinsky listed as person with significant control (≥75% shares/votes); Lee David Taylor also a director ([source](https://find-and-update.company-information.service.gov.uk/company/10354575)). A later unverified tracker claims a 2026 ownership change following Radvinsky's reported death — **UNVERIFIED**, not confirmed by Companies House or major press, flag for re-check before relying on it. |
| **Data protection registration** | UK ICO, reference ZA281296 ([ICO register](https://ico.org.uk/ESDWebPages/Entry/ZA281296)) |
| **Business model** | Creator-set monthly subscriptions + pay-per-view (PPV) unlockable messages/content + tips; platform controls all checkout. |
| **Fees/commission** | **80/20** split (creator/platform), reported consistently across sources and consistent with Fenix International's FY2024 reported gross revenue of $7.22B against $5.8B paid to creators. Treat the exact percentage as well-established; the supporting sources themselves are low-quality SEO content, so this should be cross-checked against OnlyFans' current terms of service before being cited as authoritative. |
| **Payment methods** | Card payments (Visa/Mastercard); OnlyFans controls checkout end-to-end, creators cannot choose their own processor. |
| **Payment processor** | **UNVERIFIED.** One vendor-marketing source claims a mix of Stripe, CCBill, Merrick, and Harris; another says Stripe's role is likely limited given OnlyFans' bespoke high-volume arrangement. No authoritative confirmation found. |
| **Age/identity verification** | Viewer-facing age assurance via **Yoti** (facial age estimation); a 2024-era UK Ofcom investigation followed reports that a threshold misconfiguration set the age gate at a different value than claimed, which OnlyFans attributed to a "coding configuration issue." Creator-side KYC: conflicting reports name **Ondato** and/or Yoti as vendors for government-ID + selfie-liveness checks and periodic re-verification — **sources conflict, could not fully reconcile.** |
| **Messaging** | Direct messages, including paid PPV unlocks within DMs. |
| **Security features** | Watermarking/DRM-style screenshot protections (client-side, limited effectiveness per general industry reporting), 2FA, creator ID verification. |
| **Mobile experience** | No native iOS/Android app in official app stores for the adult-content surface (progressive web app / mobile web is the typical path); this is a widely reported app-store-policy constraint across the category, not unique to OnlyFans. |
| **User acquisition** | Dominant brand recognition; heavy creator-driven, off-platform (social media) traffic funneling — the platform itself does little paid acquisition. |
| **SEO** | Creator profile pages are largely not search-indexed in a way that drives discovery; acquisition is overwhelmingly off-platform/referral-driven, not SEO-driven. |
| **Strengths** | Category-defining brand recognition; proven high-volume payment operations; large existing creator base. |
| **Weaknesses** | High publicized payment-processor/banking friction historically; recurring age-verification regulatory scrutiny (UK Ofcom); no official mobile app; single-processor dependency risk. |

Sources: [Companies House](https://find-and-update.company-information.service.gov.uk/company/10354575), [ICO register](https://ico.org.uk/ESDWebPages/Entry/ZA281296), [UK Tech News — Ofcom/Yoti](https://www.uktech.news/news/government-and-policy/ofcom-onlyfans-yoti-20240502), [Factually — creator ID](https://factually.co/fact-checks/technology/onlyfans-age-identity-verification-documents-technologies-155e12).

---

## Fansly

| | |
|---|---|
| **Legal operating entity** | **Select Media LLC** (Baltimore, Maryland, US), with a second associated entity **CY Media LTD** (Kamares, Cyprus, est. May 2021) |
| **Incorporation** | Select Media LLC incorporated Feb 2020 (US); CY Media LTD registered in Cyprus. Ownership reported (via incorporation records cited by a third party) as Michael Etelis for both entities — **this ownership claim is third-party-sourced, not independently verified against a primary registry in this pass.** |
| **Business model** | Same core model as OnlyFans: creator subscriptions + PPV + tips; also pays **referral commissions** (reported: 1% on referred subscribers, 5% on referred creators — unverified against Fansly's own terms). |
| **Fees/commission** | **80/20** split, reported as matching OnlyFans; no seller/listing subscription fee reported. |
| **Payment methods** | Card payments; region-dependent payout methods reported, exact methods unconfirmed. |
| **Payment processor** | **UNVERIFIED.** No source found naming Fansly's actual processor or billing company; one low-quality source vaguely says "reputable companies" without naming them. |
| **Age/identity verification** | Verified vendor: **Ondato**, via its own published case study — AI-based age estimation with liveness/spoofing checks; document verification requested only when the automated result is inconclusive. Creator-side ID: a government-ID requirement before posting is reported by a parental-control review site (lower-credibility source, not confirmed against Fansly's own help center). |
| **Content policy note** | Reported to have banned photorealistic AI-generated content in June 2025 (third-party reporting, not independently confirmed against Fansly's current content policy). |
| **Mobile experience** | Same app-store constraints as the category generally; no official native app for adult content confirmed. |
| **Strengths** | Lower/no extra seller fees reported vs. some competitors; multi-entity (US + Cyprus) structure may reflect deliberate payment/regulatory routing, though the reasoning behind it is not documented in available sources. |
| **Weaknesses** | Thinner public documentation overall than OnlyFans; payment processor and several operational details could not be verified from credible sources in this pass. |

Sources: [Wikipedia — Fansly](https://en.wikipedia.org/wiki/Fansly), [Ondato case study](https://ondato.com/case-studies/fansly-case-study/) (vendor marketing material — treat accuracy claims cautiously).

---

## Fanvue

| | |
|---|---|
| **Legal operating entity** | **Shift Holdings Ltd** (per third-party-reported Creator Terms) |
| **Incorporation country** | United Kingdom (England & Wales), company no. **12729677** per a third-party guide — **this company-number detail is third-party-sourced (a blog), not independently confirmed directly against Companies House in this pass; re-verify before relying on it.** No evidence found of a separate "Fanvue Inc." US entity. |
| **Business model** | Creator subscriptions + PPV + tips, same category model; notably positions itself as the most permissive major platform for **fully AI-generated creators** — third-party estimate (Sacra) puts AI-generated-influencer content at ~15% of Fanvue's GMV, which is an analyst estimate, not a platform disclosure. |
| **Fees/commission** | Reported **85/15 split for a new-creator introductory period** (sources disagree on length: some say 3 months, one says a full year), reverting to the standard **80/20** afterward. Some older/lower-quality sources cite a flat 15%, which appears outdated. **Confirm against Fanvue's current, live creator fee page before using any number here as a design input.** |
| **Payment methods / processor** | Not independently confirmed in this pass — **UNVERIFIED**. |
| **Age/identity verification** | Verified vendor: **Ondato**, per Fanvue naming it directly as its verification provider in third-party reporting; selfie-based age estimation for viewers accessing NSFW content (region-dependent triggering), government ID requested when needed; creator KYC also via Ondato. Fanvue's own content-moderation policy (dated Nov 2023) separately describes an "18+ confirmation" interstitial for all new visitors regardless of content type. |
| **AI content policy** | Distinctly more permissive than OnlyFans (which requires AI content to resemble a verified real creator) and Fansly (reported to ban photorealistic AI content); this is Fanvue's clearest point of competitive differentiation in available reporting. |
| **Strengths** | Deliberate, publicly leaned-into AI-creator permissiveness as differentiation; UK regulatory home market shared with OnlyFans (similar compliance precedent available). |
| **Weaknesses** | Much thinner independent/primary-source documentation than OnlyFans; several figures in circulation (fee splits, entity details) only sourced from marketing/affiliate blogs rather than primary filings or the platform's own current terms. |

Sources: [Fanvue content-moderation policy, Nov 2023](https://fanvue.notion.site/Content-moderation-protection-policy-5fbc6f54d53d48bc8e7fe0da95d58855), third-party guides (Sirency, ecommercefastlane, Sacra) — flagged throughout as lower-credibility where used.

---

## Feature Comparison Matrix

| Feature | OnlyFans | Fansly | Fanvue |
|---|---|---|---|
| Operating entity | Fenix International Ltd (UK) | Select Media LLC (US) + CY Media LTD (Cyprus) | Shift Holdings Ltd (UK, unverified co. no.) |
| Standard creator split | 80/20 | 80/20 | 80/20 (after intro period) |
| Intro-rate for new creators | None reported | None reported | 85/15 reported (length disputed across sources) |
| Referral commissions | Not reported | 1% subscriber / 5% creator referral (unverified) | Not found |
| Age/ID vendor | Yoti (viewer) + Yoti/Ondato (creator, conflicting reports) | Ondato (confirmed via vendor case study) | Ondato (confirmed via third-party reporting) |
| Payment processor | `UNVERIFIED` (Stripe/CCBill/other claimed, unconfirmed) | `UNVERIFIED` | `UNVERIFIED` |
| AI-generated content policy | Must resemble a verified real creator | Reportedly banned (photorealistic), June 2025 | Most permissive; actively leans into AI creators |
| Native mobile app | No official adult-content app confirmed | No official adult-content app confirmed | No official adult-content app confirmed |
| Regulatory scrutiny found | UK Ofcom investigation re: age-gate threshold (2024) | None found in this pass | None found in this pass |

### Standout takeaway for Hilal's design

All three platforms converge on the same **80/20 creator/platform split** as the category norm —
useful as a monetization-model anchor. All three rely on **third-party identity/age-verification
vendors** (Yoti and/or Ondato) rather than building verification in-house, which validates this
project's own module-A design choice (age-verification-provider abstraction, doc retention
minimized, verification result — not raw documents — kept in the app). **No platform's actual
payment processor could be verified from a credible primary source** — treat this as a real gap,
not a research shortcut; do not assume OnlyFans/Fansly/Fanvue's processor relationships as a
reference for which high-risk processors will accept Hilal without doing Hilal's own direct outreach
(see [docs/payments/PROVIDER_COMPARISON.md](../payments/PROVIDER_COMPARISON.md)).
