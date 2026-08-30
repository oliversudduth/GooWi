# GooWi Privacy Policy

**Effective date:** August 30, 2026

GooWi is a browser extension for Firefox and Chromium-based browsers, created and maintained by Oliver Sudduth. GooWi places relevant Wikipedia context beside Google Search results while preserving Google for search and Wikipedia as the destination for full articles.

## Short version

GooWi does **not** use analytics, advertising, telemetry, user accounts, persistent identifiers, or a developer-operated backend service.

The developer does **not** receive, sell, rent, profile, or retain users' Google search terms, browsing history, viewed Wikipedia articles, or Wikirace activity through GooWi.

To provide its primary feature, GooWi sends the current Google search term directly to the relevant Wikipedia language edition so Wikipedia can return matching encyclopedia content. When a user follows a Wikipedia article link inside GooWi, GooWi may also send the selected Wikipedia article title directly to Wikipedia to retrieve that article.

These transmissions are necessary for GooWi's user-facing functionality.

## Information GooWi reads locally

When GooWi runs on a supported Google Search results page, it may read:

- the current search query from the page URL (`q` parameter);
- the requested or interface language when available (`hl`, the page language, or the browser language);
- Wikipedia article titles selected by the user while navigating inside GooWi, including during Wikirace.

This information is used in memory to provide GooWi's features.

GooWi does not maintain a browsing-history database and does not use browser storage to retain a history of Google searches, viewed Wikipedia articles, or Wikirace activity.

## Information transmitted to Wikipedia

Depending on the feature being used, GooWi may send HTTPS requests directly to a Wikipedia domain containing:

- the current Google search term, to find a relevant Wikipedia article;
- the same search term when requesting Wikipedia's spelling suggestion after an initial match fails;
- a Wikipedia article title selected by the user while navigating inside GooWi;
- requests for a random article title for Random Article or Wikirace;
- requests for rendered article content;
- requests for Wikipedia's designated page image and related article metadata.

These requests are necessary to retrieve Wikipedia content.

Like ordinary HTTPS requests, requests to Wikipedia may expose normal network information such as an IP address and request headers to Wikimedia's servers. Wikimedia handles information under its own privacy policies.

GooWi sends an identifying API user-agent string so Wikimedia can recognize API traffic as originating from the GooWi browser extension.

## Google Search

GooWi operates on supported Google Search results pages so it can read the current search query and display the Wikipedia companion interface alongside the results.

GooWi does not send the user's Google query to a GooWi server. Google already receives the query through the user's use of Google Search.

Navigating among Wikipedia article links inside GooWi does **not** change or resubmit the underlying Google search.

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

- access to supported Google Search results pages, so GooWi can display its interface and read the current query;
- access to Wikipedia domains, so GooWi can search for and retrieve Wikipedia content.

GooWi does not request access to browser history, cookies, stored passwords, authentication credentials, native messaging, or all websites generally.

## Firefox-specific disclosure

On Firefox, GooWi supports Firefox 140 and later.

Because GooWi must transmit the current Google query to Wikipedia to provide its primary companion-article feature, the Firefox build declares the required transmitted data type **search terms** (`searchTerms`) and uses Firefox's built-in data-collection and transmission consent experience.

A Firefox user who does not accept that required transmission can cancel installation.

## Chrome Web Store disclosure

For the Chrome Web Store, GooWi conservatively discloses handling of:

- **Web history**, because GooWi reads the current Google Search URL/query in order to provide its user-facing feature;
- **Website content**, because GooWi reads and displays Wikipedia article text, images, links, titles, hatnotes, and related encyclopedia content.

These disclosures do **not** mean that GooWi stores a browsing-history database or sends browsing history to the developer. GooWi does not retain a history of sites visited or searches performed.

GooWi does not use remote executable code. All JavaScript and CSS executed by the extension are included in the extension package. Wikipedia is accessed only for content and data needed for GooWi's features.

## External links and services

GooWi interacts with Google Search and Wikipedia as described above and may provide links to Wikipedia and the public GooWi source repository on GitHub.

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
