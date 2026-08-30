# Changelog

All notable changes to GooWi are documented here.

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
