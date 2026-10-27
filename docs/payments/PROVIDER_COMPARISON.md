# Payment Processor Comparison — Digital Adult Content / Subscriptions

Scope: high-risk/adult payment processors evaluated **only** for the digital-content-subscription business model (OnlyFans/Fansly/Fanvue-style creator subscriptions, PPV content, tips). Escort advertising and payment for in-person/physical sexual services were deliberately **not researched** — that functionality (module D) is permanently out of scope for this project, per an earlier decision (conflicts with this repo's existing product rule).

Research standard: official processor terms/policy pages prioritized first; where those were unavailable (paywalled behind sales contact, blocked to automated fetch, or simply not published), third-party sources are used and explicitly flagged as lower-confidence. No fee or pricing figure below is invented — anything not found in an official source is marked `NOT PUBLICLY DISCLOSED`. Accessed: 2026-10-27.

---

## CCBill

- **Supported merchant countries:** Not listed on the pages reviewed. Markets itself broadly to "adult businesses" internationally; country eligibility is handled at application/underwriting time, not published as a list.
- **Country-of-incorporation requirement:** `UNVERIFIED` — not stated on public pages reviewed.
- **Digital adult-content policy:** Conditional, not a blanket allowance. Explicitly **prohibited**: any depiction of persons under 18 (clothed or not), marketing terms implying minors ("kids," "lolita," "pedo," "underage" — including in URLs/meta tags), extreme violence/incest/snuff/scat/mutilation/rape depicted sexually or erotically, bestiality, obscene material, gambling promotion. CCBill's own hosted **payment page** content must be non-sexual and show no nudity (content itself is delivered post-payment; the payment page is treated as a separate, more restrictive surface). Celebrity/likeness content needs a documented rights basis. Source: [Acceptable Use Policy](https://ccbill.com/cs/client/policies/ccbill/acceptable_use.html).
- **Digital adult-advertising policy:** Not separately addressed in the AUP reviewed; general prohibition on minor-implying marketing terms applies to advertising copy too.
- **Escort/in-person service payment:** Not explicitly named as prohibited or permitted in the AUP — it's simply not addressed; CCBill's positioning (content platforms, cam, fan sites) does not describe facilitating in-person service bookings. `UNVERIFIED` either way — not researched further, out of scope.
- **Visa/Mastercard:** Supported (CCBill is a long-standing card-association-registered high-risk acquirer/processor for adult).
- **SEPA / local methods:** Not detailed on pages reviewed. `UNVERIFIED`.
- **API/webhook:** CCBill has a documented API/webhook (postback/notification) system per its developer docs (not fetched in depth here — flag for Phase 2 technical integration research).
- **Fees/setup:** `NOT PUBLICLY DISCLOSED` on the pages reviewed — third-party reviews (Merchant Maverick) describe sign-up "packages" with their own T&C/AUP overlays, implying negotiated/tiered pricing rather than a flat public rate card.
- **Rolling reserve:** Not mentioned in the AUP. A related mechanism exists: CCBill states it may **hold all funds** until card-association fines, chargebacks and refunds are resolved, and after a suspension may hold funds **6–12 months**. This is a hold/freeze mechanism, not a disclosed standing reserve percentage.
- **Chargeback policy:** No numeric threshold published; violating card-network chargeback rules can lead to termination. Treat chargeback tolerance as determined at underwriting/case-by-case.
- **Payout period:** Not stated on pages reviewed. `UNVERIFIED`.
- **KYC/KYB / documents required:** Not listed on the AUP. Merchants are individually responsible for their own 18 U.S.C. §2257 record-keeping compliance (US federal age/identity record-keeping law for sexually explicit content producers) — this is a merchant obligation CCBill requires awareness of, not a CCBill-performed check.
- **Termination:** Either party may cancel with 10 days' written notice (per third-party review, Merchant Maverick — not independently confirmed against the primary contract text).
- Sources: [CCBill Acceptable Use Policy](https://ccbill.com/cs/client/policies/ccbill/acceptable_use.html), [CCBill Terms and Conditions](https://www.ccbill.com/cs/client/policies/ccbill/terms_and_conditions_cc.html), [CCBill EU Acceptable Use](https://ccbill.com/cs/client/policies/cceu/acceptable_use-eu.html), [Merchant Maverick CCBill Review](https://www.merchantmaverick.com/reviews/ccbill-review) (third-party, lower confidence).

## Segpay

- **Supported merchant countries:** `UNVERIFIED` — not confirmed from a source that loaded; Segpay's FAQ page returned HTTP 403 to automated fetch, so this is from search-result summaries only, not a directly read primary source.
- **Licensing:** Per search-result summary of Segpay's own FAQ: licensed by the **UK FCA** and the **Central Bank of Ireland**. `PLAUSIBLE, NOT DIRECTLY VERIFIED` — the underlying page could not be fetched directly in this research pass; re-verify before relying on it.
- **Digital adult-content policy:** Not independently reviewed in this pass — Segpay markets itself for adult, dating, cam, and nutraceutical merchants. `UNVERIFIED` in detail.
- **Visa/Mastercard:** Supported — per the same FAQ summary, a **$500/year/card-brand high-risk registration fee** applies for adult/dating/nutraceutical merchants (this is the clearest concrete, attributable figure found for any processor in this research pass, though still only from a search summary, not a direct page read).
- **SEPA/local methods:** Not confirmed. `UNVERIFIED`.
- **API/webhook:** Segpay publishes merchant-facing technical/API documentation on a separate support subdomain; not reviewed in depth here.
- **3DS:** Supports 3D Secure 2.0 per the FAQ summary; Segpay's own blog claims this has reduced chargebacks for its merchants (vendor claim, not independently verified).
- **Fees:** `NOT PUBLICLY DISCLOSED` beyond the $500/brand/year high-risk registration fee above. Third-party blogs estimate "3.5–5.5% average processing fee, 8–10% reserve rate" for Segpay — these are **secondary-source estimates, not confirmed**, flagged explicitly as lower-confidence.
- **Rolling reserve:** No official percentage found; see estimate above (unconfirmed).
- **Chargeback policy:** No official threshold/fee found. General high-risk-industry chargeback-risk commentary exists in secondary sources but isn't Segpay-specific data worth relying on.
- **Payout period:** `UNVERIFIED` — not found.
- **KYC/KYB:** `UNVERIFIED` — not found in this pass; expect standard high-risk KYB (incorporation docs, beneficial ownership, content samples, bank statements) based on industry norms, but this is an inference, not a sourced fact.
- Sources: [Segpay Client Information & FAQ](https://segpay.com/?p=10339) (fetch blocked, used via search summary only — re-verify directly), [Segpay blog: cam site payments](https://segpay.com/blog/solving-payment-challenges-for-cam-sites) (vendor blog).

## Verotel

- **Company background:** Founded 1998, headquartered Amsterdam, Netherlands. One third-party source states Verotel holds a license from the Central Bank of the Netherlands (De Nederlandsche Bank) — `PLAUSIBLE, NOT DIRECTLY VERIFIED` against a primary regulatory register in this pass.
- **Supported merchant countries:** Not listed as a country list on the official page reviewed. One third-party (competitor) source claims nationality/incorporation country of the merchant or its founders is "irrelevant" to Verotel — `UNVERIFIED`, sourced from a competitor comparison page, treat with caution.
- **Company/individual eligibility:** Targets "high-risk and adult businesses" generally; doesn't state on the page reviewed whether sole proprietors/individuals (vs. only registered companies) are accepted. `UNVERIFIED`.
- **Digital adult-content policy:** Page acknowledges "the risks involved in supplying digital content" but does not enumerate allowed/prohibited content on the page reviewed; defers to a linked Merchant Agreement not fetched in this pass.
- **Visa/Mastercard/other cards:** Visa, MasterCard, Discover, Diners Club, and JCB all listed as supported.
- **SEPA/local methods:** SEPA is not named by that term on the page reviewed. Verotel offers **"Direct Debit Europe"** — online-banking-based debit — for customers in Germany, Austria, Switzerland, Belgium, France, Netherlands, Italy, Spain, and Slovakia. Also offers **US Check** for US customers without a credit card.
- **API/webhook:** "Verotel FlexPay API" is named; a "Control Center" dashboard, "Remote User Management" (automated customer login provisioning), and "QuickCharge" (stored-credential rebilling) are mentioned. No webhook-specific documentation surfaced in this pass.
- **Fees:** `NOT PUBLICLY DISCLOSED` on the page reviewed.
- **Rolling reserve / chargeback policy:** Not addressed on the page reviewed; deferred to a linked Merchant Agreement not fetched.
- **Payout period:** Stated as **daily** on the official page ("Verotel has never missed a payment").
- **KYC/KYB:** `UNVERIFIED` — not listed on the page reviewed.
- Sources: [Verotel — Welcome](https://www.verotel.com/en/welcometoverotel.html) (official, fetched directly), [Akurateco Verotel profile](https://akurateco.com/payment-providers/verotel) (third-party, lower confidence), [Corepay Verotel comparison](https://corepay.net/?p=1422) (competitor source, lower confidence — notes complaints re: frozen payments/account cancellations, unverified).

## Epoch

- **Company background:** US-based (commonly cited as Santa Monica, CA), specializing in billing for digital/adult/membership content since the 1990s. Founding year is disputed between sources (1996 vs. 2003 cited in different low-confidence pages) — `UNVERIFIED`, not confirmed against Epoch's own site in this pass (epoch.com did not surface usable content through search/fetch in this research pass).
- **Merchant services:** Card processing, recurring billing, multilingual support, fraud prevention — per third-party (Corefy) description only.
- **Consumer billing descriptor:** Charges reportedly appear as "EPOCH.COM*" or "Customer service - Epoch" on statements, per lookup-site sources.
- **Supported countries, KYC/KYB, content policy, fees, rolling reserve, chargeback policy, payout period, API/webhook:** All `UNVERIFIED` / `NOT FOUND` in this research pass — Epoch's official site did not yield usable, fetchable content through the search and fetch tools available here. **This is the weakest-verified processor in this comparison; before considering Epoch, go directly to epoch.com and/or contact their sales/onboarding team, since nothing here should be relied on.**
- Sources (all third-party, low confidence): [Corefy Epoch profile](https://corefy.com/integrations/payment-providers/epoch), [SaaSHub Epoch vs PayPal](https://www.saashub.com/compare-epoch-vs-paypal), [letsweel Epoch billing lookup](https://merchants.letsweel.com/merchants/epoch).

---

## Comparison matrix

| | CCBill | Segpay | Verotel | Epoch |
|---|---|---|---|---|
| HQ / founded | US, long-established | US/UK-linked, FCA + Central Bank of Ireland licensed (unconfirmed direct) | Amsterdam, NL, 1998 | US (CA), founding year disputed |
| Merchant country list published | No | No | No | No |
| Digital adult content policy detail | **Best documented** of the four (explicit prohibited list) | Not reviewed in depth | Deferred to unfetched Merchant Agreement | Not found |
| Visa/Mastercard | Yes | Yes (+$500/brand/yr high-risk reg. fee) | Yes (+Discover, Diners, JCB) | Likely (not confirmed) |
| SEPA / EU local debit | `UNVERIFIED` | `UNVERIFIED` | Yes — "Direct Debit Europe" (9 countries named) | `UNVERIFIED` |
| Payout period | `UNVERIFIED` | `UNVERIFIED` | **Daily** (stated) | `UNVERIFIED` |
| Rolling reserve | Not disclosed as %; fund-hold mechanism on disputes (6–12mo after suspension) | Est. 8–10% (3rd-party, unconfirmed) | Not disclosed (deferred to Merchant Agreement) | Not found |
| Fees | Not publicly disclosed | $500/brand/yr high-risk reg. fee (confirmed-ish); 3.5–5.5% processing (3rd-party est., unconfirmed) | Not publicly disclosed | Not found |
| Public verifiability overall | **Medium** — official AUP/T&C readable | **Low-medium** — FAQ blocked to fetch, summary-only | **Medium** — official page fetched directly | **Low** — no usable official content surfaced |

**Bottom line on verifiability:** none of the four processors publishes a full public rate card. CCBill and Verotel have the most substantively readable official policy/terms pages; Segpay's clearest number ($500/brand/year high-risk fee) came through search-result summary rather than a direct fetch (page blocked automated access) and should be re-confirmed directly; Epoch yielded essentially nothing verifiable from its own site in this pass and needs direct contact before being considered further.

---

## Proposed `PaymentProvider` interface extension

The existing interface in [`src/server/payments.ts`](../../src/server/payments.ts) is Turkish-lira-specific and disabled pending legal/provider approval:

```ts
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: { subscriptionId: string; amountTry: number; customerEmail: string }): Promise<{ redirectUrl: string; externalRef: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<{ externalRef: string; status: "paid" | "failed" | "refunded" }>;
  refund(externalRef: string, amountTry?: number): Promise<void>;
}
```

For the global/digital-content-subscription use case, the main gap is the hardcoded `amountTry` (Turkish lira only) — everything else (checkout/webhook/refund shape) already generalizes cleanly to a CCBill/Segpay/Verotel-style hosted-payment-page processor. Proposed shape (interface only — no implementation, no real credentials, matches the existing disabled-by-default posture):

```ts
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: {
    subscriptionId: string;
    amountMinorUnits: number;   // smallest currency unit, e.g. cents
    currency: string;           // ISO 4217, e.g. "USD" | "EUR" | "TRY"
    customerEmail: string;
  }): Promise<{ redirectUrl: string; externalRef: string }>;
  verifyWebhook(rawBody: string, signature: string): Promise<{
    externalRef: string;
    status: "paid" | "failed" | "refunded" | "chargeback";
  }>;
  refund(externalRef: string, amountMinorUnits?: number): Promise<void>;
}
```

Changes from the current shape: (1) `amountTry` → `amountMinorUnits` + `currency`, since every processor above is multi-currency and none is TRY-specific; (2) added `"chargeback"` to the webhook status union, since all four processors treat chargebacks as a distinct event from a customer-initiated refund, and the existing audit-log/idempotency pattern in this codebase should record them separately. No other shape change needed — `getPaymentProvider()` should keep throwing `PaymentsDisabledError` until a real processor is contracted and legally reviewed, per the existing disabled-by-default posture.
