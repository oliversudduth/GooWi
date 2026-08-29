# GooWi — Draft AMO Reviewer Notes

## What the extension does

GooWi runs on Google Search result pages and displays a concise Wikipedia companion article when Wikipedia has a sufficiently relevant match. It also provides Random Article and an in-pane Wikirace mode.

## Data transmission

The content script reads the current Google query from the `q` URL parameter. The query is passed by extension messaging to `background.js`, which sends it over HTTPS directly to the relevant Wikipedia language edition to search for matching content. This is the extension's primary function.

The manifest declares `searchTerms` as required transmitted data using Firefox's built-in consent mechanism. GooWi supports Firefox 140+ only so no separate pre-140 custom consent flow is needed.

GooWi has no developer-operated backend, analytics, telemetry, advertising, accounts, persistent identifiers, or search-history storage. No search terms are sent to the developer.

Random Article and Wikirace make direct HTTPS requests to Wikipedia for random or selected article content. During Wikirace, article links navigate inside GooWi and the selected article title is used to retrieve that Wikipedia article.

## Permissions

- Content scripts run only on `https://www.google.com/search*` and `https://google.com/search*`.
- Host permission is limited to `https://*.wikipedia.org/*` for Wikipedia API/content requests.
- No broad `<all_urls>`, tabs, history, cookies, storage, webRequest, or native messaging permissions are requested.

## Source and build

The extension consists of plain, readable JavaScript and CSS. There is no minification, transpilation, bundling, remote executable code, or third-party JavaScript library. There is no build step required to review the source.

## Suggested functional tests

1. Search Google for `Albert Camus`: GooWi should show the Albert Camus article.
2. Search for `GooWi`: no Wikipedia pane should appear because there is no sufficiently relevant article.
3. Search for `Mercury`: GooWi should show Wikipedia's disambiguation page.
4. Search for `Post-9/11 GI Bill`: GooWi should resolve the formal Wikipedia article title.
5. Use Random Article: only the GooWi pane changes; the Google query remains unchanged.
6. Start Wikirace with the flag control: internal article links navigate inside GooWi and the underlying Google page remains unchanged.

## Public source and privacy policy

Source: https://github.com/oliversudduth/GooWi

Privacy policy: `PRIVACY.md` in the repository.
