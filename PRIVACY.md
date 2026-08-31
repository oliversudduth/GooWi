# GooWi Privacy Policy

**Effective date:** August 30, 2026

GooWi is a browser extension for Firefox and Chromium-based browsers, created and maintained by Oliver Sudduth. GooWi places relevant Wikipedia context beside Google Search results and, when the user explicitly chooses **View in GooWi**, can open the GooWi reader for selected text on an ordinary webpage. Wikipedia remains the encyclopedia source and destination for full articles.

## Short version

GooWi does **not** use analytics, advertising, telemetry, user accounts, persistent identifiers, or a developer-operated backend service.

The developer does **not** receive, sell, rent, profile, or retain users' Google search terms, browsing history, viewed Wikipedia articles, or Wikirace activity through GooWi.

To provide its primary features, GooWi sends either the current Google search term or text the user explicitly selected with **View in GooWi** directly to the relevant Wikipedia language edition so Wikipedia can return matching encyclopedia content. When a user follows a Wikipedia article link inside GooWi, GooWi may also send the selected Wikipedia article title directly to Wikipedia to retrieve that article.

These transmissions are necessary for GooWi's user-facing functionality.

## Information GooWi reads locally

Depending on which feature the user invokes, GooWi may read:

- the current search query from the page URL (`q` parameter);
- the requested or interface language when available (`hl`, the page language, or the browser language);
- high-confidence Google Search result-page context, such as a prominent entity/topic heading and nearby explanatory text, when available;
- text explicitly selected by the user when they invoke **View in GooWi**;
- Wikipedia article titles selected by the user while navigating inside GooWi, including during Wikirace.

This information is used in memory to provide GooWi's features.

GooWi does not maintain a browsing-history database and does not use browser storage to retain a history of Google searches, viewed Wikipedia articles, or Wikirace activity.

## Information transmitted to Wikipedia

Depending on the feature being used, GooWi may send HTTPS requests directly to a Wikipedia domain containing:

- the current Google search term, to find a relevant Wikipedia article;
- text the user explicitly selected with **View in GooWi**, to find a relevant Wikipedia article;
- an optional high-confidence canonical topic inferred locally from visible Google Search result-page context, used for a second Wikipedia candidate lookup when it can clarify the user's intended entity;
- the same search term when requesting Wikipedia metadata for exact-title redirect resolution, redirect identity, and, when needed, spelling suggestions;
- a Wikipedia article title selected by the user while navigating inside GooWi;
- requests for a random article title for Random Article or Wikirace;
- requests for rendered article content;
- requests for Wikipedia's designated page image and related article metadata.

These requests are necessary to retrieve Wikipedia content.

Like ordinary HTTPS requests, requests to Wikipedia may expose normal network information such as an IP address and request headers to Wikimedia's servers. Wikimedia handles information under its own privacy policies.

GooWi sends an identifying API user-agent string so Wikimedia can recognize API traffic as originating from the GooWi browser extension.

## Google Search

GooWi operates automatically on supported Google Search results pages so it can read the current search query and display the Wikipedia companion interface alongside the results. When Google visibly presents a high-confidence entity/topic interpretation, GooWi may also read that nearby page context locally and use the inferred topic as an additional Wikipedia lookup signal. GooWi does not rely on this signal; if it is absent or uncertain, the ordinary Wikipedia-only matcher remains in control.

GooWi does not send the user's Google query to a GooWi server. Google already receives the query through the user's use of Google Search.

Navigating among Wikipedia article links inside GooWi does **not** change or resubmit the underlying Google search.


## View in GooWi on ordinary webpages

When the user highlights text and explicitly chooses **View in GooWi** from the browser context menu, GooWi receives the selected text and temporarily injects its packaged reader interface into that one active tab. GooWi does not continuously read arbitrary webpages in the background and does not request permanent `<all_urls>` host access.

Before a selected-text lookup, GooWi trims leading/trailing whitespace and collapses repeated whitespace. If the cleaned selection is longer than 75 characters, GooWi displays **“Sheesh, keep it brief 🫠”** and does not send that selection to Wikipedia.

For selections of 75 characters or fewer, GooWi sends the selected text directly to Wikipedia using the same conservative matching system used by the Google companion. If no sufficiently trustworthy match is found, GooWi leaves the explicitly opened reader visible and displays **“No confident Wikipedia match found.”**

On non-Google pages, the extension uses `activeTab` and `scripting` only after the user invokes the context-menu command. Browser-protected or restricted pages may prevent injection; GooWi does not attempt to bypass those restrictions.

## Developer access, retention, and sale of data

The developer does not operate a backend service for GooWi and does not receive GooWi users' search terms or browsing activity through the extension.

GooWi does not:

- sell user data;
- rent user data;
- use user data for advertising;
- use user data for profiling;
- use user data for creditworthiness or lending decisions;
- transfer user data for purposes unrelated to GooWi's single purpose;
- include third-party analytics, advertising SDKs, or tracking libraries.

The only external transmission of search-related information performed by GooWi is the direct transmission to Wikipedia that is necessary to retrieve the Wikipedia content requested by GooWi's features.

## Permissions

GooWi requests only the access needed for its current functionality:

- access to supported Google Search results pages, so GooWi can display its automatic companion interface and read the current query;
- `contextMenus`, so **View in GooWi** appears when the user selects text;
- `activeTab`, so GooWi receives temporary access only to the tab where the user explicitly invokes **View in GooWi**;
- `scripting`, so the packaged GooWi reader and stylesheet can be injected into that explicitly invoked tab;
- access to Wikipedia domains, so GooWi can search for and retrieve Wikipedia content.

GooWi does not request access to browser history, cookies, stored passwords, authentication credentials, native messaging, or permanent access to all websites generally. The `activeTab` permission is temporary and user-invoked.

## Firefox-specific disclosure

On Firefox, GooWi supports Firefox 140 and later.

Because GooWi transmits search text to Wikipedia to provide its core lookup features, the Firefox build declares the required transmitted data type **search terms** (`searchTerms`). Because GooWi may also transmit a canonical topic inferred from visible Google result-page context, or text the user explicitly selected from a webpage with **View in GooWi**, the Firefox build also declares **website content** (`websiteContent`). Firefox's built-in data-collection and transmission consent experience covers these required transmissions.

A Firefox user who does not accept that required transmission can cancel installation.

## Chrome Web Store disclosure

For the Chrome Web Store, GooWi conservatively discloses handling of:

- **Web history**, because GooWi reads the current Google Search URL/query in order to provide its user-facing feature;
- **Website content**, because GooWi reads and displays Wikipedia article text, images, links, titles, hatnotes, and related encyclopedia content; may locally read high-confidence Google result-page context to infer the intended topic; and receives text the user explicitly selects with **View in GooWi**.

These disclosures do **not** mean that GooWi stores a browsing-history database or sends browsing history to the developer. GooWi does not retain a history of sites visited or searches performed.

GooWi does not use remote executable code. All JavaScript and CSS executed by the extension are included in the extension package. Wikipedia is accessed only for content and data needed for GooWi's features.

## External links and services

GooWi interacts with Google Search and Wikipedia as described above and may provide links to Wikipedia, the public GooWi source repository on GitHub, and `https://donate.wikimedia.org` through the toolbar's **♡ Donate to Wikimedia** link.

Following an external link is subject to that site's own privacy practices.

## Changes to this policy

If GooWi's data practices materially change, this policy will be updated before or alongside the release that introduces the change. Browser-store privacy declarations will also be updated when required.

## Developer

**Oliver Sudduth**  
https://oliversudduth.com/

## Source code

https://github.com/oliversudduth/GooWi

## Support

goowi.extension@gmail.com
