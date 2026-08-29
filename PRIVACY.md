# GooWi Privacy Policy

**Effective date:** August 29, 2026

GooWi is a Firefox extension created and maintained by Oliver Sudduth. GooWi is designed to place relevant Wikipedia content beside Google Search results while keeping Wikipedia as the destination for full articles.

## Short version

GooWi does **not** use analytics, advertising, telemetry, user accounts, or a developer-operated data collection service. The developer does not receive or store your Google search history through GooWi.

To provide its core feature, GooWi sends the current Google search query directly to the relevant Wikipedia language edition so that Wikipedia can return matching article information. Random Article and Wikirace likewise make requests directly to Wikipedia.

## Information GooWi reads locally

When GooWi runs on a supported Google Search results page, it reads:

- the search query from the page URL (`q` parameter);
- the requested/interface language when available (`hl`, the page language, or the browser language);
- Wikipedia article titles that you choose while using Wikirace.

This information is used in memory to provide GooWi's features. GooWi does not use Firefox's `storage` API to retain a history of searches, articles, or Wikirace activity.

## Information sent to Wikipedia

Depending on the feature being used, GooWi may send the following directly to a Wikipedia domain:

- the current Google search query, to search for a relevant Wikipedia article;
- the query again when requesting Wikipedia's spelling suggestion after an initial match fails;
- article titles, when retrieving an article selected during Wikirace;
- requests for random article titles for Random Article and Wikirace;
- requests for rendered article HTML and Wikipedia's designated page image.

These requests are necessary for GooWi to retrieve Wikipedia content. Like ordinary web requests, they may also expose normal network information such as your IP address and request headers to Wikimedia's servers. Wikimedia's handling of information is governed by Wikimedia's own privacy policies.

GooWi sends an identifying API user-agent string so Wikimedia can recognize requests as coming from the GooWi Firefox extension.

## Google

GooWi operates on Google Search results pages but does not send your query to a separate GooWi server. Google already receives the query as part of your use of Google Search.

Outside Wikirace, selecting an internal Wikipedia concept in the GooWi preview opens a Google search for that concept. This navigation is user-initiated and is handled by Google in the same way as another Google search.

## Developer access and retention

The developer does not operate a backend service for GooWi and does not receive, sell, rent, profile, or retain GooWi users' search queries or browsing activity through the extension.

GooWi does not include third-party analytics or advertising SDKs.

## Permissions

GooWi requests access only where needed for its current functionality:

- supported Google Search result pages, so it can display the GooWi interface and read the current query;
- Wikipedia domains, so it can search for and retrieve Wikipedia content.

## External links

GooWi includes links to Wikipedia and to the developer's website. Visiting an external site is subject to that site's own privacy practices.

## Changes to this policy

If GooWi's data practices materially change, this policy will be updated before or alongside the release that introduces the change.

## Developer

**Oliver Sudduth**  
https://oliversudduth.com/
