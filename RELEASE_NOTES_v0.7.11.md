# GooWi v0.7.11 — Google-context-assisted matching

## Summary

v0.7.11 is the next public release candidate after v0.7.9.

It incorporates the consolidated relevance-matching improvements developed and tested in the **unreleased v0.7.10 development build**, then adds an optional Google Search context signal to GooWi's existing Wikipedia matcher.

Wikipedia remains the source of encyclopedia candidates and article content. Google result-page context is used only when a high-confidence entity/topic interpretation is visibly present, and GooWi remains fail-closed: when no candidate is sufficiently trustworthy, it shows nothing rather than displaying an unrelated article.

## Development history

### v0.7.10 — unreleased development build

v0.7.10 followed a four-batch regression pass against v0.7.9.

- Batch 1 identified three matcher failures.
- Batch 2 passed all typo-torture tests.
- Batch 3 identified four personal-name / alias failures.
- Batch 4 passed all feature and browser-regression tests.

Because v0.7.10 was not published to GitHub or either browser store, its matching improvements are incorporated into v0.7.11.

### v0.7.11 — current release candidate

v0.7.11 retains all v0.7.10 matcher improvements and adds high-confidence Google-context-assisted canonical-topic matching.

## Matching improvements carried forward from unreleased v0.7.10

### Navigational intent

Expanded navigational-intent suppression to include `customer`, `service`, and `services`.

Regression target:
- `apple customer service` → **no GooWi panel**

Exact encyclopedic titles such as `Customer service` remain eligible because exact-title matching occurs before navigational suppression.

### Semantic disambiguators

Added a conservative semantic-qualifier path for two-term queries where one term identifies the title and the other clarifies the intended sense.

Initial qualifier families include:
- `animal` → species, mammal, cat, feline, bird, reptile, fish, insect, organism, wildlife
- `car` → car, automobile, vehicle, automotive, automaker
- `company` → company, corporation, business, firm

Regression target:
- `jaguar animal` → **Jaguar**

### Formal personal names and aliases

Added a lead-identity alias rule. A query may resolve to an article with a very different title when the complete meaningful query appears in order near the beginning of Wikipedia's search excerpt.

Regression targets:
- `Samuel Clemens` → **Mark Twain**
- `François-Marie Arouet` → **Voltaire**
- `Gaius Caesar Augustus Germanicus` → **Caligula**
- `Alexander III of Macedon` → **Alexander the Great**

Negative regression target:
- `Samuel Clemens` must **not** resolve to **Clara Clemens**

### Roman numerals

Roman numerals in candidate titles are identity-bearing. If the query contains a Roman numeral and a candidate title contains a different numeral, the candidate is rejected.

Regression target:
- `Alexander III of Macedon` must **not** resolve to **Alexander IV of Macedon**

### Short names inside longer formal titles

A two-term personal name may resolve to a longer formal title when the meaningful query tokens remain in order and the final/surname token remains the final meaningful title token.

Regression target:
- `Thomas de Lorimier` → **François-Marie-Thomas Chevalier de Lorimier**

### Existing conservative safeguards retained

- `Washington DC` must not resolve to `Washington DC Open`
- `wiazrd` must not resolve to `Yoshiko (wrestler)` merely because the misspelling appears in an article excerpt
- `wiazrd` → `wizard` remains a valid spelling-correction path
- `Thomas de Marle` and `Thomas Marle` continue to resolve to `Thomas, Lord of Coucy`
- `apple support` remains suppressed
- Random Article, in-pane links, reset, expand/restore, Wikirace, responsive behavior, stale-request protection, and Chrome service-worker wake behavior remain unchanged

## New in v0.7.11 — Google-context-assisted matching

### Matching flow

1. GooWi reads the user's existing Google `q` search term.
2. GooWi locally looks for a high-confidence Google entity/topic heading and nearby explanatory text.
3. GooWi searches Wikipedia for the raw query as before.
4. If a validated Google canonical topic exists and differs from the raw query, GooWi also searches Wikipedia for that canonical topic.
5. GooWi applies the same conservative relevance gate to both candidate sets.
6. An exact Wikipedia title match for the raw query remains authoritative.
7. Otherwise, a strongly matching canonical-topic result may outrank a weaker raw-query result.
8. If neither path yields a relevant article, GooWi retains its Wikipedia spelling-suggestion fallback.
9. If no candidate is trustworthy, GooWi shows nothing.

### Why this exists

Acronyms and alternate names can be lexically misleading in Wikipedia search.

Primary regression example:
- `LOTR` could previously resolve to **LoTr 4**, a planetary nebula, because the letters matched strongly.
- Google visibly resolves the query to **The Lord of the Rings**.
- v0.7.11 can use that high-confidence interpretation as an additional Wikipedia lookup signal.

### Safety and conservatism

Google context is an optional confidence signal, not an authority.

- GooWi still works if Google changes its markup or no entity signal is available.
- Ordinary organic-result titles are excluded from the generic context extractor.
- Navigational intent such as `support`, `customer service`, and `login` prevents a broad Google entity from rescuing the query.
- An exact raw-query Wikipedia title is not overridden by a Google-derived topic.
- Both candidate sets still pass through GooWi's conservative relevance gate.
- Request serials prevent stale responses from overwriting newer searches.
- GooWi continues to prefer a false negative over displaying an unrelated article.

## Privacy and disclosure

GooWi may now read visible Google result-page context locally and may transmit an inferred high-confidence canonical topic directly to Wikipedia for an additional candidate lookup.

No GooWi backend is involved.

### Chrome

Existing Chrome Web Store disclosures remain applicable:
- **Web history**
- **Website content**

### Firefox

The Firefox build declares the following required transmitted data types:
- `searchTerms`
- `websiteContent`

## Recommended v0.7.11 regression

Priority:
1. `LOTR` → The Lord of the Rings
2. `Samuel Clemens` → Mark Twain
3. `François-Marie Arouet` → Voltaire
4. `Gaius Caesar Augustus Germanicus` → Caligula
5. `Alexander III of Macedon` → Alexander the Great
6. `Thomas de Lorimier` → François-Marie-Thomas Chevalier de Lorimier
7. `jaguar animal` → Jaguar
8. `apple customer service` → no panel

Carry-forward:
9. `Thomas de Marle` → Thomas, Lord of Coucy
10. `wiazrd` → Wizard or no panel, never Yoshiko
11. `Washington DC` → Washington, D.C.
12. `Mercury` → disambiguation
13. `Mercury planet` → Mercury (planet)
14. `apple support` → no panel
15. `NFIP` → National Flood Insurance Program

Feature/browser:
16. Random Article
17. internal Wikipedia navigation
18. reset/return to Google-query article
19. expand/restore
20. Wikirace
21. full-width/half-screen responsive behavior
22. narrow-width hide behavior
23. rapid query switching/stale-response protection
24. browser Back/Forward
25. search-page refresh
26. Chrome service-worker wake after idle
27. cross-browser core-case parity

## Release status

v0.7.10 was an **unreleased internal development build**.

v0.7.11 incorporates all v0.7.10 matcher improvements and is the current multi-browser release candidate for Firefox and Chrome.
