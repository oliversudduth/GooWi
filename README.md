# GooWi

**Wikipedia context beside Google Search.**

GooWi is an independent, open-source Firefox WebExtension created by **Oliver Sudduth**. It places a concise, contextually relevant Wikipedia preview beside Google Search results while preserving Google as the search interface and Wikipedia as the destination for full articles.

GooWi is currently in **pre-1.0 development**.

## Why GooWi exists

Search engines are often excellent at prioritizing official, transactional, local, or current sources. That can push Wikipedia's useful encyclopedic context far down the page—or off the first page entirely. GooWi restores that context without replacing the search results.

The extension follows a simple rule: **show a useful Wikipedia companion when there is a sufficiently relevant match; otherwise stay out of the way.**

## Features

- Relevant Wikipedia article preview beside Google Search results
- Conservative relevance filtering that favors silence over misleading matches
- Wikipedia-assisted spelling correction for likely typos
- Wikipedia disambiguation pages for genuinely ambiguous searches
- Representative images selected through Wikipedia's PageImages API
- Random Article without changing the underlying Google query
- Expand/restore reading overlay that leaves the Google page loaded underneath
- Wikirace mode with full supported article navigation
  - random target article
  - 10-click initial challenge
  - Continue or New race at the 10-click checkpoint
  - unlimited overtime if the player chooses Continue
- Light/dark appearance support
- Clickable Wikipedia and developer attribution in the GooWi toolbar

## Product philosophy

GooWi is intended to be a **gateway to Wikipedia, not a replacement for it**. Normal mode deliberately presents a condensed preview. A link at the end of the preview sends the reader to the complete article on Wikipedia.

Wikirace is the exception: gameplay requires access to the full supported article so GooWi does not hide a valid navigation route.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, or developer-operated backend service.

To retrieve Wikipedia content, GooWi sends the current search query directly to the relevant Wikipedia language edition. Random Article and Wikirace also communicate directly with Wikipedia. The developer does not receive or retain those queries through GooWi.

See [`PRIVACY.md`](PRIVACY.md) for the complete policy.

## Permissions

GooWi requires Firefox 140 or later. It runs only on supported Google Search result pages and requests host access to Wikipedia domains so it can retrieve article content. Firefox discloses and obtains consent for the required transmission of search terms to Wikipedia during installation.

## Mozilla data disclosure

GooWi declares `searchTerms` as required transmitted data under Firefox's built-in data collection consent system. The current Google query is sent directly to Wikipedia solely to retrieve the encyclopedia content that is GooWi's primary function. GooWi does not operate a server that receives these queries.

## Temporary installation for testing

Until GooWi is publicly distributed through Mozilla Add-ons:

1. Download or clone the source.
2. Open `about:debugging` in Firefox.
3. Select **This Firefox**.
4. Choose **Load Temporary Add-on…**.
5. Select `manifest.json` from the GooWi source directory.

Temporary extensions loaded this way are removed when Firefox restarts.

## Project status

The current release-preparation build is **v0.7.2**. The last frozen beta baseline is **v0.6.9**.

Before public v1.0 release, the project will complete Mozilla/AMO privacy and packaging review, final icon/branding review, regression testing, and public repository setup.

## Authorship and license

GooWi was originally conceived and developed by **Oliver Sudduth**.

Copyright 2026 Oliver Sudduth.

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

## Independence and trademarks

GooWi is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC, the Wikimedia Foundation, or Wikipedia.

Google, Wikipedia, and other names or marks referenced by the project remain the property of their respective owners and are used only to identify the services with which GooWi interoperates or the content it presents.

## Source repository

https://github.com/oliversudduth/GooWi
