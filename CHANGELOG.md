# Changelog

## 1.0.0

- First stable general-public release of GooWi.
- Promotes the fully tested v0.8.1 codebase to 1.0.0.
- No functional code, matcher, permission, privacy, or UI behavior changes were introduced for the version promotion.
- Establishes the stable Firefox and Chromium builds for extension-market publication.

## 0.8.1

- Version synchronized with the Firefox v0.8.1 release.
- Chromium's existing **View in GooWi** injection behavior is unchanged; it already functioned alongside the built-in PDF viewer in manual testing.
- Preserved the v0.7.20 matcher and all v0.8.0 selection, donation, Wikirace, and reader behavior.
- No new Chromium permissions or data categories were added.

## 0.8.0

- Added **View in GooWi** to the browser context menu when text is selected.
- Selected-text lookup works on ordinary webpages without permanent `<all_urls>` access; GooWi uses `contextMenus`, `activeTab`, and `scripting` only after explicit user invocation.
- Selection mode uses the full GooWi reader, including internal Wikipedia navigation, Random Article, expand/restore, collapse, and Wikirace.
- Google selection lookups leave the underlying Google query unchanged; Return restores the query-associated article.
- On non-Google pages, Return restores the first selection that opened GooWi on that page.
- Cleaned selections are limited to 75 characters. Longer selections show **“Sheesh, keep it brief 🫠”** and are not sent to Wikipedia.
- Explicit selected-text lookups that produce no trustworthy match keep the reader open and show **“No confident Wikipedia match found.”**
- Added a centered outline-heart **♡ Donate to Wikimedia** toolbar link that opens `https://donate.wikimedia.org` in a new tab, visually separate from GooWi's functional controls.
- Preserved the v0.7.20 relevance matcher and Google automatic-companion behavior; no matcher thresholds or identity rules were changed.
- Updated privacy documentation for selected-text lookup and the new user-invoked permissions.
- No analytics, advertising, telemetry, accounts, persistent identifiers, developer backend, or permanent all-sites host permission.

All notable changes to GooWi are documented here.

## 0.7.20

- Preserved exact Wikipedia redirects into explicit `(disambiguation)` pages even when MediaWiki includes a section fragment.
- Fixes `The Bard` resolving to `The Bard (film)` after v0.7.19 discarded Wikipedia's section redirect into `Bard (disambiguation)`.
- Disambiguation-target section redirects are authoritative ambiguity evidence and cannot be replaced by a weaker Google-context interpretation.
- Ordinary section redirects remain excluded from identity matching.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.19

- Added MediaWiki exact-title redirect resolution to the normal non-exact matching path, using the same metadata request already used for search metadata and spelling assistance.
- Exact title redirects now provide first-party identity for cases such as `Big Blue` → IBM, `The Artist Formerly Known as Prince` → Prince (musician), and `Gaius Caesar Augustus Germanicus` → Caligula.
- Removed v0.7.18's one-extra-token near-complete redirect heuristic after it misclassified the parenthetical redirect `The Artist Formerly Known as Prince (album)` and produced `Love Symbol`.
- Search-result redirect aliases retain only conservative exact/appended-canonical handling; terminal parenthetical qualifiers can no longer masquerade as omitted name components.
- Exact title redirects outrank weak Google Wikipedia-result sense selection, while separately validated Google entity context can still identify a more specific intended entity such as `The Fab Four` → `The Fab Four (tribute)`.
- Literal exact titles and preserved disambiguation pages remain authoritative.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.18

- Promoted Wikipedia-declared redirect metadata into candidate ranking before GooWi commits to a non-exact raw or Google-canonical match.
- Exact article titles and explicit disambiguation pages remain authoritative and skip the additional redirect lookup.
- Added a conservative near-complete redirect rule for longer queries: every query token must appear in the same tight order in Wikipedia's redirect title, and exactly one meaningful redirect token may be omitted.
- This allows `Gaius Caesar Augustus Germanicus` to match Wikipedia's `Gaius Julius Caesar Augustus Germanicus` redirect to Caligula without restoring unsafe article-snippet identity inference.
- Exact Wikipedia redirects now outrank parenthetical lexical lookalikes, allowing `Big Blue` → IBM instead of `Big Blue (TV series)`.
- Explicit redirect identity is authoritative against weaker Google-context inference, while a literal exact article title or preserved disambiguation page still outranks a redirect.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.17

- Normalized spaced dotted initialisms such as `J. R. R.` to the same compact identity form as `JRR`, preserving existing handling for `D.C.`, `J.F.K.`, and similar abbreviations.
- Hardened the Google Wikipedia-result fallback so Wikipedia attribution must belong to the same bounded result card; neighboring results can no longer inherit another card's Wikipedia label.
- Added a conservative zero-overlap formal-name alias path for Google entity headings: the query must contain at least three meaningful tokens, Google must provide a recognized entity-type subtitle, and the entire query must appear tightly and in order in bounded entity evidence.
- Primary regression targets: `JRR Tolkien` → J. R. R. Tolkien and `Gaius Caesar Augustus Germanicus` → Caligula.
- Preserves the intentional `Big Blue` safeguard: broad Google/AI prose alone cannot force IBM.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.16

- Added Wikipedia-declared redirect-title identity rescue before spelling correction, allowing canonical aliases whose titles share no lexical overlap with the query.
- Tightened two-word fuzzy matching so one-token near-name mismatches are deferred to redirect/spelling rescue instead of being accepted immediately.
- Added partial generic name-list/disambiguation rejection so longer specific names cannot collapse to shorter generic name pages.
- Changed canonical parenthetical ranking so the strong sense bonus requires the parenthetical qualifier itself to match Google's entity type.
- Preserves `Prince` + musician → `Prince (musician)` while preventing `Abraham Lincoln (captain)` from outranking literal `Abraham Lincoln` merely because its text mentions a president.
- Primary regression targets: `Abe Lincoln` → Abraham Lincoln, `Samuel Clemens` → Mark Twain, and `François-Marie Arouet` → Voltaire.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.15

- Removed identity inference from Wikipedia REST search excerpts. Search excerpts are match-centered snippets and may begin around incidental mentions; they can no longer establish that a query names the article subject.
- Google context extraction now preserves multiple independent signals instead of collapsing them to one pre-validation candidate.
- The background validates those Google context signals independently and deduplicates canonical Wikipedia requests.
- Direct Google Wikipedia-result links now use the Wikipedia URL's canonical article title instead of decorative Google heading text.
- Added cleanup for visible Wikipedia cards whose headings end in `- Wikipedia`.
- Canonical ranking now prioritizes an exact canonical base plus the matching sense/type over a different entity that merely contains the same name token.
- Primary regression targets: `Abe Lincoln` → Abraham Lincoln and `The Artist Formerly Known as Prince` → Prince (musician).
- Preserves v0.7.13/v0.7.14 behavior for Fab Four/Beatles, Tolkien, acronym disambiguation, navigational suppression, typo protection, and related-page rejection.
- No new permissions, privacy categories, recipients, analytics, telemetry, accounts, or backend service.

## 0.7.14

- Carries Google's entity subtitle/type as a disambiguation hint rather than as a standalone topic.
- Uses compact semantic type hints when performing the optional canonical Wikipedia lookup, e.g. `Prince` + musician.
- Adds type-aware canonical candidate ranking so `Prince (musician)` can outrank the generic `Prince` title when Google identifies the musician.
- Stabilizes Google context briefly instead of accepting the first transient candidate rendered during page load.
- Adds a visible-Wikipedia-card fallback for Google layouts whose outbound link markup does not expose a direct wikipedia.org URL.
- Preserves v0.7.13's direct “See results about” extraction and related-page safeguards.
- No new permissions, data categories, data recipients, analytics, telemetry, or backend service.

## 0.7.13

- Separates Google entity names from nearby entity type/subtitle labels so generic labels such as `Band` cannot become canonical Wikipedia topics.
- Directly extracts Google “See results about” entity chips instead of inferring them from surrounding text.
- Strengthens explicit-query qualifier handling, including `The Fab Four Beatles` → The Beatles when Google exposes the matching Beatles entity chip.
- Adds a generalized related-page gate so an entity query such as `JRR Tolkien` cannot drift to `Influences on Tolkien` unless the relationship itself was requested.
- Adds bidirectional title/query coverage when validating Google entity headings, improving aliases such as `The Artist Formerly Known as Prince` → Prince.
- Preserves Wikipedia disambiguation behavior for `FDR`, `MLK`, `Ike`, and `NYC`.
- Preserves conservative handling for `Big Blue`, `Big Apple`, `Windy City`, and `The Bard`.
- No new permissions, data recipients, or privacy categories.

## 0.7.12

- Improved Google canonical-topic extraction with a validated visible-Wikipedia-result fallback for conventional aliases and formal names.
- Added explicit support for Google “See results about” entity chips when the entity is already represented by the user’s own query.
- Generic Google section headings such as `Description`, `Overview`, `Origin`, and similar UI labels can no longer become canonical topics.
- Increased the short wait for dynamically rendered Google entity context from 320 ms to 750 ms.
- Parenthetical Wikipedia titles are no longer treated as literal exact matches: `JFK` can be rescued from `JFK (film)` when stronger entity context exists.
- Parenthetical disambiguation pages remain authoritative for intentionally ambiguous acronyms such as `FDR` and `MLK`.
- Explicit query qualifiers can now outweigh related-title similarity, supporting cases such as `The Fab Four Beatles` → The Beatles.
- Preserves existing conservative behavior for `Ike`, `NYC`, `Big Apple`, `Windy City`, `The Bard`, Random Article, in-pane navigation, Wikirace, and responsive layouts.

## 0.7.11

- Incorporates relevance-matching improvements developed in unreleased 0.7.10.
- Added optional Google-context-assisted canonical-topic matching.
- Added secondary Wikipedia candidate lookup when Google exposes a validated high-confidence entity/topic.
- Preserved exact raw-query title authority and fail-closed relevance behavior.
- Updated Firefox transmitted-data declaration to `searchTerms` + `websiteContent`.
- Chrome Web Store `Web history` + `Website content` disclosures remain applicable.
- No changes to Random Article, in-pane navigation, expand/restore, Wikirace, responsive behavior, or stale-request protection.

## 0.7.10

**Unreleased development build.**

- Expanded navigational-intent suppression for `customer`, `service`, and `services`.
- Added semantic qualifier handling for `animal`, `car`, and `company`.
- Added lead-identity alias/formal-name matching.
- Added exact Roman-numeral identity protection.
- Added short-name matching inside longer formal personal titles.
- Consolidated seven relevance failures discovered during v0.7.9 regression testing.

## 0.7.9

- Tightened single-word relevance matching so incidental excerpt mentions cannot rescue unrelated articles.
- Added safer alternate/common-name phrase matching.
- Added glue-word handling for name particles such as `de`, `du`, `van`, and `von`.
- Added Damerau-Levenshtein typo validation for adjacent transpositions.
- Fixed false positives including `wiazrd` → Yoshiko.
- Preserved `Thomas de Marle` → Thomas, Lord of Coucy and earlier relevance safeguards.

## 0.7.8

- Corrected privacy documentation to reflect in-pane Wikipedia navigation.
- Added public support contact `goowi.extension@gmail.com`.
- No extension functionality changed.

## 0.7.7

- Improved title matching for punctuation/initial normalization such as `Washington DC` → `Washington, D.C.`.
- Added Wikipedia hatnotes and clarification links.
- Hatnote links navigate inside GooWi while the underlying Google query remains unchanged.

## 0.7.6

- Added Wikipedia hatnotes as a first-class rendered element.

## 0.7.5

- Tightened relevance handling for transactional/navigational intent such as `apple support`.

## 0.7.4

- Added compact half-screen desktop layout.
- GooWi hides below the deliberately unsupported narrow-width cutoff.

## 0.7.3

- Changed ordinary internal Wikipedia links to navigate inside GooWi rather than changing the underlying Google search.

## 0.7.2

- Added Mozilla/AMO data-transmission compliance metadata.
- Raised Firefox minimum version to 140.
- Added Firefox `searchTerms` disclosure and repository homepage metadata.

## 0.7.1

- Changed the in-panel **via GooWi** link to `https://github.com/oliversudduth/GooWi`.

## 0.7.0

- Added release-preparation authorship/licensing/privacy documentation.
- Added developer metadata and Apache-2.0 licensing/NOTICE materials.

## 0.6.9

- Changed the permanent Firefox extension ID to `goowi@oliversudduth.com`.

## 0.6.8

- Added the custom GooWi icon set.

## 0.6.7

- Wikirace now renders the full supported Wikipedia article.

## 0.6.6

- Improved Wikipedia section/subsection handling and disambiguation-page depth.

## 0.6.5

- Wikirace increased to a 10-click initial challenge with Continue/New Race overtime.

## 0.6.4

- Narrowed the normal side panel for improved Google-result spacing.

## 0.6.3

- `via GooWi` became a link to the project/developer destination.

## 0.6.2

- The **WIKIPEDIA** wordmark became a link to Wikipedia.

## 0.6.1

- Reordered the toolbar with Wikirace at the far left.

## 0.6.0

- Added Wikirace.

## 0.5.x

- Added Random Article.
- Added expanded reading mode.
- Added Wikipedia PageImages support.
- Added spelling correction, disambiguation list rendering, and conservative relevance improvements.
