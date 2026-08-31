# GooWi

**Wikipedia context beside Google Search — and on demand from selected text anywhere on the web.**

GooWi is an independent, open-source browser extension created by **Oliver Sudduth**. It places a concise, contextually relevant Wikipedia companion beside Google Search results and can also open the full GooWi reader for text selected on ordinary webpages. Wikipedia remains the encyclopedia source and destination for full articles.

GooWi follows a simple rule:

> **Show a useful Wikipedia companion when there is a sufficiently relevant match; otherwise stay out of the way.**

## Why GooWi exists

Search engines are often excellent at prioritizing official, transactional, local, or current sources. That can push Wikipedia's useful encyclopedic context far down the page—or off the first page entirely. GooWi restores that context without replacing the search results.

## Features

- Relevant Wikipedia previews beside Google Search results
- **View in GooWi** context-menu lookup for selected words and phrases on ordinary webpages
  - full GooWi reader injected only after explicit user invocation
  - 75-character cleaned-selection limit
  - selections over the limit show **“Sheesh, keep it brief 🫠”** without contacting Wikipedia
  - explicit lookups with no trustworthy result show **“No confident Wikipedia match found.”**
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
- Centered **♡ Donate to Wikimedia** toolbar link opening `https://donate.wikimedia.org` in a new tab

## Product philosophy

GooWi is intended to be a **gateway to Wikipedia, not a replacement for it**.

Normal mode deliberately presents a condensed preview. A link at the end sends the reader to the complete article on Wikipedia. Wikirace is the exception because gameplay requires access to the full supported article.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, persistent identifiers, or developer-operated backend service.

To provide its primary features, GooWi sends the current Google search term—or text the user explicitly selects with **View in GooWi**—directly to Wikipedia. When a high-confidence Google entity/topic interpretation is visible, GooWi may also use that context locally and send the inferred canonical topic directly to Wikipedia for an additional candidate lookup.

The developer does not receive or retain users' search terms or selected-text lookups through GooWi.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Permissions

GooWi runs automatically only on supported Google Search result pages. For **View in GooWi**, it uses `contextMenus`, `activeTab`, and `scripting` so the reader can be injected into the single page where the user explicitly invokes it. GooWi does **not** request permanent `<all_urls>` host access. Wikipedia-domain access is used to retrieve encyclopedia content.

## Project status

The current release candidate is **v0.8.0**.

v0.8.0 adds browser-wide **View in GooWi** selected-text lookup and the centered **♡ Donate to Wikimedia** toolbar link while preserving the v0.7.20 matcher. Selection mode reuses the full GooWi reader, including internal Wikipedia navigation, Random Article, expand/restore, and Wikirace.

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

## Temporary installation for testing — Firefox

Until the current Firefox build is distributed through Mozilla Add-ons:

1. Download or clone the `main` branch.
2. Open `about:debugging` in Firefox.
3. Choose **This Firefox**.
4. Click **Load Temporary Add-on…**.
5. Select `manifest.json` from the GooWi source directory.

Temporary add-ons loaded this way are removed when Firefox restarts.

## Firefox notes

- Minimum supported Firefox version: **140**
- The Firefox build declares required transmitted data types `searchTerms` and `websiteContent`.
