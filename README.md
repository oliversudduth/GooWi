# GooWi

**Wikipedia context beside Google Search.**

GooWi is an independent, open-source browser extension created by **Oliver Sudduth**. It places a concise, contextually relevant Wikipedia companion beside Google Search results while preserving Google as the search interface and Wikipedia as the destination for full articles.

GooWi follows a simple rule:

> **Show a useful Wikipedia companion when there is a sufficiently relevant match; otherwise stay out of the way.**

## Why GooWi exists

Search engines are often excellent at prioritizing official, transactional, local, or current sources. That can push Wikipedia's useful encyclopedic context far down the page—or off the first page entirely. GooWi restores that context without replacing the search results.

## Features

- Relevant Wikipedia previews beside Google Search results
- Conservative relevance filtering that favors silence over misleading matches
- Optional high-confidence Google-context-assisted matching
- Wikipedia-assisted spelling correction for likely typos
- Wikipedia disambiguation pages for genuinely ambiguous searches
- Wikipedia hatnotes and clarification links
- Wikipedia PageImages representative-image support
- Internal Wikipedia navigation that leaves the underlying Google query unchanged
- Random Article
- Expand/restore reading overlay
- Wikirace with full supported article navigation
  - random target article
  - 10-click initial challenge
  - Continue or New Race at the checkpoint
  - unlimited overtime when Continue is chosen
- Responsive full-width and half-screen desktop layouts
- Light/dark appearance support

## Product philosophy

GooWi is intended to be a **gateway to Wikipedia, not a replacement for it**.

Normal mode deliberately presents a condensed preview. A link at the end sends the reader to the complete article on Wikipedia. Wikirace is the exception because gameplay requires access to the full supported article.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, persistent identifiers, or developer-operated backend service.

To provide its primary feature, GooWi sends the current Google search term directly to Wikipedia. When a high-confidence Google entity/topic interpretation is visible, GooWi may also use that context locally and send the inferred canonical topic directly to Wikipedia for an additional candidate lookup.

The developer does not receive or retain users' search terms through GooWi.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Permissions

GooWi runs only on supported Google Search result pages and requests Wikipedia-domain access only to retrieve encyclopedia content.

## Project status

The current release candidate is **v0.7.11**.

v0.7.10 was an unreleased development build whose matching improvements were incorporated into v0.7.11. v0.7.11 adds Google-context-assisted matching while retaining GooWi's conservative Wikipedia relevance filtering.

Firefox and Chrome builds are maintained and validated independently before store release.

## Authorship and license

GooWi was originally conceived and developed by **Oliver Sudduth**.

Copyright 2026 Oliver Sudduth.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Independence and trademarks

GooWi is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC, the Wikimedia Foundation, or Wikipedia.

Google, Wikipedia, and other names or marks referenced by the project remain the property of their respective owners and are used only to identify the services with which GooWi interoperates or the content it presents.

## Support

Email: `goowi.extension@gmail.com`

Issues: https://github.com/oliversudduth/GooWi/issues

## Source repository

https://github.com/oliversudduth/GooWi

## Temporary installation for testing — Chrome/Chromium

Until the current Chrome build is distributed through the Chrome Web Store:

1. Download or clone the `chrome-port` branch.
2. Open `chrome://extensions` in Chrome or another Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the GooWi source directory containing `manifest.json`.

Extensions loaded this way remain installed until removed, but may need to be reloaded after source changes.

## Chrome notes

- Manifest V3 background processing uses a service worker.
- The Chrome Web Store privacy disclosures conservatively include **Web history** and **Website content**.
