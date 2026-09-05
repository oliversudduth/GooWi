# GooWi

**Wikipedia context beside Google Search — with session navigation and on-demand lookup from selected text or links.**

GooWi is an independent, open-source browser extension created by **Oliver Sudduth**. It places a concise, contextually relevant Wikipedia companion beside Google Search results and can also open the full GooWi reader from selected text or useful link targets on ordinary webpages. Wikipedia remains the encyclopedia source and destination for full articles.

GooWi follows a simple rule:

> **Show a useful Wikipedia companion when there is a sufficiently relevant match; otherwise stay out of the way.**


> **v1.1.1** refines the v1.1 navigation release with a compact Back icon, a left-aligned toolbar heart, and smarter **View in GooWi** link-label lookup for opaque/ID-based URLs while preserving the v1.0.0 matcher.

## Why GooWi exists

Search engines are often excellent at prioritizing official, transactional, local, or current sources. That can push Wikipedia's useful encyclopedic context far down the page—or off the first page entirely. GooWi restores that context without replacing the search results.

## Features

- Relevant Wikipedia previews beside Google Search results
- **View in GooWi** context-menu lookup for selected words/phrases and useful link targets
  - ordinary webpages use the familiar injected GooWi sidebar
  - Firefox's built-in PDF viewer and compatible protected reader surfaces use a native Firefox sidebar fallback
  - full GooWi reader injected only after explicit user invocation
  - 75-character cleaned-selection limit
  - selections over the limit show **“Sheesh, keep it brief 🫠”** without contacting Wikipedia
  - link-only lookups retry conservative SEO-title fallbacks (exact visible title → readable URL slug → title prefix before a spaced separator) without weakening GooWi's relevance matcher
  - explicit lookups with no trustworthy result show **“No confident Wikipedia match found.”**
- Conservative relevance filtering that favors silence over misleading matches
- Optional high-confidence Google-context-assisted matching
- Wikipedia-assisted spelling correction for likely typos
- Wikipedia disambiguation pages for genuinely ambiguous searches
- Wikipedia hatnotes and clarification links
- Wikipedia PageImages representative-image support
- Internal Wikipedia navigation that leaves the underlying Google query unchanged
- Session-local **History** menu and **Back** navigation with reading-position restoration
- Linked terms retain their own Google-search destination for browser new-tab/modifier-click behavior
- Random Article
- Expand/restore reading overlay
- Wikirace with full supported article navigation
  - random target article
  - 10-click initial challenge
  - Continue or New Race at the checkpoint
  - unlimited overtime when Continue is chosen
- Responsive full-width and half-screen desktop layouts
- Light/dark appearance support
- **♡ Donate to Wikimedia** as the leftmost toolbar icon, opening `https://donate.wikimedia.org` in a new tab

## Product philosophy

GooWi is intended to be a **gateway to Wikipedia, not a replacement for it**.

Normal mode deliberately presents a condensed preview. A link at the end sends the reader to the complete article on Wikipedia. Wikirace is the exception because gameplay requires access to the full supported article.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, persistent identifiers, or developer-operated backend service.

To provide its primary features, GooWi sends the current Google search term—or a lookup the user explicitly invokes with **View in GooWi** from selected text or a link—directly to Wikipedia. When a high-confidence Google entity/topic interpretation is visible, GooWi may also use that context locally and send the inferred canonical topic directly to Wikipedia for an additional candidate lookup.

The developer does not receive or retain users' search terms or selected-text lookups through GooWi.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Permissions

GooWi runs automatically only on supported Google Search result pages. For **View in GooWi**, it uses `contextMenus`, `activeTab`, and `scripting` so the reader can be injected into the single page where the user explicitly invokes it. GooWi does **not** request permanent `<all_urls>` host access. Wikipedia-domain access is used to retrieve encyclopedia content.

## Project status

The current release is **v1.1.1**. It builds on v1.1.0's session-local History and Back navigation with toolbar polish and a more robust **View in GooWi** link resolver. Link-only lookups now prefer concise semantic labels and can conservatively retry readable URL slugs or SEO-title prefixes without weakening GooWi's established relevance matcher.

Firefox and Chromium builds are maintained and validated as separate browser targets where their APIs differ. Chrome and Edge use the same Chromium package whenever their code is identical; separate packages are produced only if the browser builds diverge.

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
