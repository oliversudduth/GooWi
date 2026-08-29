## v0.7.2 — Mozilla/AMO compliance preparation

- Raised the minimum supported Firefox version to 140 so GooWi can use Firefox's built-in data collection and transmission consent experience.
- Declared required `searchTerms` transmission in `browser_specific_settings.gecko.data_collection_permissions`.
- Added the public GitHub repository as `homepage_url`.
- Updated the Wikimedia API user-agent to derive the extension version dynamically and identify the public source repository.
- Updated `PRIVACY.md` and README privacy disclosures to match the manifest and actual behavior.
- No product features changed.

## v0.7.1 — GitHub attribution link

- Changed the in-panel **via GooWi** link to the public source repository:
  `https://github.com/oliversudduth/GooWi`
- Developer metadata continues to identify Oliver Sudduth and oliversudduth.com.
- No functional behavior changed.

# Changelog

All notable changes to GooWi will be documented here.

GooWi is currently in pre-1.0 development.

## [0.7.0] - 2026-08-29

### Added
- Public developer metadata identifying Oliver Sudduth and oliversudduth.com.
- Apache License 2.0 licensing.
- `NOTICE` attribution file identifying Oliver Sudduth as GooWi's original creator/developer.
- Public privacy policy.
- Public-facing project README and formal changelog.

### Changed
- Updated GooWi's Wikimedia API user-agent string for release preparation.

### Functional behavior
- No intended user-facing feature changes from v0.6.9.

## [0.6.9] - 2026-08-29
- Set the permanent Firefox extension ID to `goowi@oliversudduth.com`.

## [0.6.8] - 2026-08-29
- Added GooWi's custom extension icon set and high-resolution master artwork.

## [0.6.7] - 2026-08-29
- Wikirace now renders the full supported Wikipedia article so a valid navigation route is not hidden by GooWi's normal preview limits.

## [0.6.6] - 2026-08-29
- Corrected major-section and subsection handling.
- Expanded disambiguation-page rendering so grouped entries are not prematurely truncated.

## [0.6.5] - 2026-08-29
- Increased Wikirace's initial allowance to 10 clicks.
- Added Continue/New race choice at the 10-click checkpoint, with unlimited overtime when Continue is selected.

## Earlier 0.x development
- Added contextual Wikipedia results beside Google Search.
- Added conservative relevance filtering and Wikipedia-assisted typo correction.
- Added disambiguation support and PageImages-based primary images.
- Added Random Article, expand/restore reading mode, and Wikirace.
- Added responsive layout refinements and clickable Wikipedia/GooWi attribution links.
