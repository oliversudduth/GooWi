# GooWi

**Wikipedia context beside Google Search — and on demand from selected text across the web.**

GooWi is an independent, open-source browser extension created by **Oliver Sudduth**. It places a concise, contextually relevant Wikipedia companion beside Google Search results and can also open the full GooWi reader for text the user explicitly selects elsewhere in the browser.

GooWi follows a simple rule:

> **Show a useful Wikipedia companion when there is a sufficiently relevant match; otherwise stay out of the way.**

## Install

| Browser | Availability |
| --- | --- |
| **Firefox** | [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/goowi/) |
| **Google Chrome** | Chrome Web Store — v0.8.1 publication pending |
| **Microsoft Edge** | Microsoft Edge Add-ons — v0.8.1 publication pending |

**Current stable release: v0.8.1**

The Firefox and Chromium builds are maintained separately:

- `main` — Firefox / Gecko
- `chrome-port` — Chrome / Chromium, including Microsoft Edge

## Why GooWi exists

Search engines are often excellent at prioritizing official, transactional, local, or current sources. That can push Wikipedia's useful encyclopedic context far down the page—or off the first page entirely. GooWi restores that context without replacing the search results.

## Features

- Relevant Wikipedia previews beside Google Search results
- **View in GooWi** context-menu lookup for selected words and phrases
  - ordinary webpages use the familiar injected GooWi sidebar
  - Firefox's built-in PDF viewer and compatible protected reader surfaces use a native Firefox sidebar fallback
  - the reader is injected only after explicit user invocation
  - cleaned selections are limited to 75 characters
  - selections over the limit show **“Sheesh, keep it brief 🫠”** without contacting Wikipedia
  - explicit lookups with no trustworthy result show **“No confident Wikipedia match found.”**
- Conservative relevance filtering that favors silence over misleading matches
- High-confidence Google-context-assisted matching when useful
- Wikipedia-assisted spelling correction for likely typos
- Wikipedia redirects and disambiguation handling
- Wikipedia hatnotes and clarification links
- Wikipedia PageImages representative-image support
- Internal Wikipedia navigation that leaves the underlying Google query unchanged
- Random Article
- Expand/restore reading overlay
- Wikirace
  - random target article
  - 10-click initial challenge
  - Continue or New Race at the checkpoint
  - unlimited overtime when Continue is chosen
- Responsive full-width and half-screen desktop layouts
- Light/dark appearance support
- Centered **♡ Donate to Wikimedia** link opening `https://donate.wikimedia.org` in a new tab

## Browser support

### Firefox

- Minimum supported version: **Firefox 140**
- Automatic GooWi companion on supported Google Search pages
- **View in GooWi** on ordinary webpages
- Native Firefox-sidebar fallback for the built-in PDF viewer and compatible protected-reader surfaces
- The native sidebar opens on whichever side the user has configured Firefox's browser sidebar

### Chromium

The Chromium build is maintained on the `chrome-port` branch.

- Minimum supported Chrome version declared by the extension: **Chrome 99**
- Automatic GooWi companion on supported Google Search pages
- **View in GooWi** on ordinary webpages
- Chrome's built-in PDF viewer supports the existing injected-reader path in current testing
- Microsoft Edge uses the same Chromium build

**Known limitation:** in current Microsoft Edge testing, **View in GooWi does not function inside Edge's built-in PDF viewer**. Normal Edge webpages continue to work.

## Product philosophy

GooWi is intended to be a **gateway to Wikipedia, not a replacement for it**.

Normal mode deliberately presents a condensed preview. A link at the end sends the reader to the complete article on Wikipedia. Wikirace is the exception because gameplay requires access to the full supported article.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, persistent identifiers, or developer-operated backend service.

To provide its primary features, GooWi sends the current Google search term—or text the user explicitly selects with **View in GooWi**—directly to Wikipedia. When a high-confidence Google entity/topic interpretation is visible, GooWi may also use that context locally and send the inferred canonical topic directly to Wikipedia for an additional candidate lookup.

The developer does not receive or retain users' search terms or selected-text lookups through GooWi.

See [PRIVACY.md](PRIVACY.md) for the complete policy.

## Permissions

GooWi runs automatically only on supported Google Search result pages.

For **View in GooWi**, it uses:

- `contextMenus` to provide the selection command;
- `activeTab` to receive temporary access only after the user explicitly invokes GooWi;
- `scripting` to inject the packaged reader into that active tab when the browser permits it.

GooWi does **not** request permanent `<all_urls>` host access. Wikipedia-domain access is used to retrieve encyclopedia content.

## Development and manual installation

### Firefox

1. Clone or download the `main` branch.
2. Open `about:debugging`.
3. Choose **This Firefox**.
4. Click **Load Temporary Add-on…**.
5. Select `manifest.json` from the GooWi source directory.

Temporary add-ons loaded this way are removed when Firefox restarts.

### Chrome / Chromium

Use the `chrome-port` branch:

1. Open `chrome://extensions/` (or `edge://extensions/` in Microsoft Edge).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the GooWi source directory containing `manifest.json`.

## Releases and history

See [CHANGELOG.md](CHANGELOG.md) for version-by-version changes and [RELEASE_NOTES_v0.8.1.md](RELEASE_NOTES_v0.8.1.md) for the cumulative v0.8.1 release record.

## Authorship and license

GooWi was conceived and developed by **Oliver Sudduth**.

Copyright 2026 Oliver Sudduth.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Independence and trademarks

GooWi is an independent project and is not affiliated with, sponsored by, or endorsed by Google LLC, Microsoft Corporation, the Wikimedia Foundation, or Wikipedia.

Google, Microsoft Edge, Wikipedia, and other names or marks referenced by the project remain the property of their respective owners and are used only to identify the services or browsers with which GooWi interoperates.

## Support

Email: `goowi.extension@gmail.com`

Issues: https://github.com/oliversudduth/GooWi/issues

## Source repository

https://github.com/oliversudduth/GooWi
