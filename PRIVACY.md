# GooWi Privacy Policy

**Effective date:** August 29, 2026

GooWi is a Firefox extension created and maintained by Oliver Sudduth. GooWi places relevant Wikipedia context beside Google Search results while preserving Wikipedia as the destination for full articles.

## Short version

GooWi does **not** use analytics, advertising, telemetry, user accounts, persistent identifiers, or a developer-operated backend service. The developer does not receive or store users' Google search history through GooWi.

To provide its primary feature, GooWi transmits the current Google search term directly to the relevant Wikipedia language edition so Wikipedia can return matching encyclopedia content. This transmission is required for GooWi's core functionality and is declared to Firefox as the required data type **search terms** (`searchTerms`).

GooWi supports Firefox 140 and later and uses Firefox's built-in data collection and transmission consent experience. A user who does not accept the required search-term transmission can cancel installation.

## Information GooWi reads locally

When GooWi runs on a supported Google Search results page, it reads:

- the current search query from the page URL (`q` parameter);
- the requested/interface language when available (`hl`, the page language, or the browser language);
- Wikipedia article titles selected while using Wikirace.

This information is used in memory to provide GooWi's features. GooWi does not use Firefox's `storage` API to retain a history of searches, viewed articles, or Wikirace activity.

## Information transmitted to Wikipedia

Depending on the feature being used, GooWi may send requests directly to a Wikipedia domain containing:

- the current Google search term, to find a relevant Wikipedia article;
- the same search term when requesting Wikipedia's spelling suggestion after an initial match fails;
- an article title when retrieving a user-selected article during Wikirace;
- requests for a random article title for Random Article and Wikirace;
- requests for rendered article HTML and Wikipedia's designated page image.

These requests are necessary to retrieve Wikipedia content. Like ordinary HTTPS requests, they may expose normal network information such as an IP address and request headers to Wikimedia's servers. Wikimedia handles information under its own privacy policies.

GooWi sends an identifying API user-agent string so Wikimedia can recognize API traffic as originating from the GooWi Firefox extension.

## Google

GooWi operates on Google Search results pages but does not send the user's query to a GooWi server. Google already receives the query through the user's use of Google Search.

Navigating among Wikipedia article links inside GooWi does not change or resubmit the underlying Google search.

## Developer access and retention

The developer does not operate a backend service for GooWi and does not receive, sell, rent, profile, or retain GooWi users' search terms or browsing activity through the extension.

GooWi includes no third-party analytics or advertising SDKs.

## Permissions

GooWi requests only the access needed for its current functionality:

- supported Google Search result pages, so the extension can display its interface and read the current query;
- Wikipedia domains, so the extension can search for and retrieve Wikipedia content.

Firefox also discloses that GooWi requires transmission of **search terms** because the current Google query must be sent to Wikipedia to provide the extension's primary companion-article feature.

## External links

GooWi includes links to Wikipedia and to the public GooWi source repository on GitHub. Following an external link is subject to that site's own privacy practices.

## Changes to this policy

If GooWi's data practices materially change, this policy will be updated before or alongside the release that introduces the change, and the extension's Firefox data-collection declaration will be updated when required.

## Developer

**Oliver Sudduth**  
https://oliversudduth.com/

## Source code

https://github.com/oliversudduth/GooWi
