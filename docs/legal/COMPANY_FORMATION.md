# Cross-jurisdiction company formation synthesis

Scope: can a Turkish citizen remotely incorporate a company to operate the legitimate Hilal platform (digital content subscriptions, social, messaging — NOT module D) in each of the 10 priority countries, what's the fastest/cheapest viable structure, and which one or two countries make sense to pilot in first.

This file covers **New Zealand, Australia, US, Canada** in full (researched directly for this document — see `docs/legal/NEW_ZEALAND.md`, `AUSTRALIA.md`, `US.md`, `CANADA.md` for topic-by-topic detail and sources). For **Belgium, Netherlands, Germany, UK, Switzerland, Austria**, this document does not re-research company formation — see the corresponding `docs/legal/<COUNTRY>.md` files produced in parallel for this project's Phase 1, and treat anything below about those six as unsourced general orientation only, clearly marked as such.

Accessed date: 2026-10-27.

## Summary table — the 4 countries researched directly for this document

| Country | Foreign shareholder OK? | Resident director required? | Remote incorporation? | Key friction point |
|---|---|---|---|---|
| **US** (Delaware/Wyoming) | Yes, no restriction | **No** — no residency/citizenship requirement on members or managers | Yes, fully online | Opening a US bank account and IRS Form 5472 foreign-ownership reporting, not the formation itself |
| **New Zealand** | Yes, no restriction on shareholders | **Yes** — ≥1 director ordinarily resident in NZ, or resident in Australia + director of an Australian company | Yes, online, but blocked without a qualifying director | Sourcing a compliant resident/nominee director |
| **Australia** | Yes, no restriction on shareholders | **Yes** — ≥1 director "ordinarily resident" in Australia (Pty Ltd) | Yes, online, but blocked without a qualifying director | Sourcing a compliant resident/nominee director; also the most aggressive age-verification enforcement regime of the 10 countries (binding 9 March 2026) |
| **Canada** | Yes, no restriction on shareholders | **Yes at the federal level** (≥25% of directors, CBCA s.105) — **possibly avoidable by incorporating provincially instead** (one unverified secondary source claims most provinces other than Manitoba dropped the requirement) | Yes, online | Federal-vs-provincial choice is the actual open question — needs direct verification before relying on "no resident director needed," do not assume it from this document alone |

## The other 6 countries (Belgium, Netherlands, Germany, UK, Switzerland, Austria) — not independently researched here

For these, consult `docs/legal/BELGIUM.md`, `NETHERLANDS.md`, `GERMANY.md`, `UK.md`, `SWITZERLAND.md`, `AUSTRIA.md` directly — those files (produced by parallel research forks on this project) are authoritative on formation requirements for each, not this summary. As unsourced general orientation only (explicitly **not researched for this document**, do not rely on this paragraph for a decision): EU/EEA company formation for a non-EU founder commonly involves more friction than the US structures above — a local notarized deed (common in Belgium/Germany/Austria's standard corporate forms), minimum share capital requirements, and/or EU-resident-bank-account chicken-and-egg problems are typical patterns across continental European jurisdictions, while the UK is commonly understood (again, not verified in this research pass — check `docs/legal/UK.md`) to have no resident-director requirement for a private limited company, which if confirmed would make it structurally comparable in ease to the US. Switzerland and Austria are generally understood to require more capital and/or a resident managing officer for certain company forms — again, unverified here, check the dedicated files.

## Recommendation

Based only on what was directly researched for this document (NZ, Australia, US, Canada) plus the structural pattern above:

**The US (Delaware or Wyoming LLC) is the clearest low-friction formation choice of the 4 directly researched**, because it is the only one of the four with no resident-director requirement at all — a Turkish citizen can be the sole owner and sole manager with no local nominee needed. The real friction moves downstream to banking (EIN via paper Form SS-4, then a US bank account) and the Form 5472 foreign-ownership reporting obligation, both of which are known, solvable, well-documented problems rather than open legal questions.

**However, US company formation is a separate question from which country's *users* to launch to first** (per `docs/legal/US.md` topic 12, the US consumer-facing launch question is complicated by the 25+ state age-verification law patchwork and FOSTA-SESTA exposure — both real and active). A sensible pattern many digital-content businesses use: **incorporate in a low-friction jurisdiction (e.g. US/Delaware) while choosing a separate, simpler country to pilot the actual consumer-facing product in** — ideally one from this set with (a) no state-by-state legal patchwork, (b) a clear, single, currently-in-force age-verification regime (or clearly none yet), and (c) manageable data-protection obligations.

**Tentative top pilot-country candidates for the consumer-facing launch (not formation — pending confirmation against the other 6 countries' files)**:
1. **New Zealand** — smallest, clearest regulatory surface of the 4 directly researched (no confirmed age-verification law found, single national privacy regime, English-language, common-law), at the cost of needing a resident/nominee director for the operating entity if incorporated locally (avoidable by using a non-NZ parent entity and simply serving NZ users).
2. Whichever of Belgium/Netherlands/Germany/UK/Switzerland/Austria turns out (per its own file) to have the fewest open `REQUIRES_LEGAL_REVIEW` items and no imminent binding age-verification deadline — **Australia is explicitly NOT recommended as a first pilot market** despite being well-documented, because its age-assurance codes become binding 9 March 2026 with penalties up to AUD 49.5M, making it the highest near-term compliance deadline pressure of any country in this research set.

This recommendation is a research synthesis, not a legal or business decision — it requires the operator's own review against the full set of 10 country files plus actual counsel engagement before being acted on, consistent with the "no self-assigned APPROVED status" rule used throughout this research.
