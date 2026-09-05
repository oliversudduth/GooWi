# GooWi v1.1.1 Release Notes

GooWi v1.1.1 is a focused polish release for the v1.1 navigation and link-context features.

## Toolbar refinements

- Moved **♡ Donate to Wikimedia** into the normal toolbar control row as the **leftmost icon**.
- Toolbar order is now:
  **Donate → Wikirace → Random → History → Back → Return → Expand → Collapse**.
- Replaced the elongated text Back arrow with a compact browser-style SVG arrow while keeping the same **Previous article** behavior and accessibility label.

## Smarter “View in GooWi” for links

- Selected text still takes precedence when the user invokes **View in GooWi**.
- For link-only invocations, GooWi now prefers a human-readable link label before attempting to derive a lookup from the destination URL.
- This fixes common opaque-link cases such as application routes whose visible title is useful (for example, **Achilles**) but whose URL ends in a random UUID or ID string.
- Complex links are now resolved from a ranked set of semantic labels rather than trusting one browser-provided/container string. GooWi prefers concise nested headings, `aria-label`, `title`, image alt text, and visible anchor text.
- This specifically fixes result-card links whose clickable anchor contains a short visible title plus a much longer hidden/combined text block that previously tripped the 75-character **“Sheesh, keep it brief 🫠”** guard.
- Firefox and Chromium both use the existing temporary `activeTab` + `scripting` grant after the user explicitly chooses **View in GooWi** to inspect only the matching link in that tab/frame. Firefox's browser-supplied `linkText` remains an additional fallback candidate.
- Candidate labels longer than 75 characters are skipped when a concise semantic label exists; arbitrary text is never silently truncated.
- If the recovered visible link title is clean but too SEO-specific to produce a confident Wikipedia match, GooWi now retries a conservative candidate sequence: **exact visible title → human-readable URL slug → title prefix before a spaced `-`, `|`, `–`, or `—` separator**.
- Each candidate is passed through the unchanged v1.0.0 relevance matcher; GooWi stops at the first confident match and still returns **No confident Wikipedia match found** if every candidate fails.
- This fixes common result titles such as **Achilles - Greek Hero, Trojan War & Facts**, **Albert Camus | Biography, Books, Philosophy…**, and similar Britannica/History-style SEO headlines without adding site-specific rules.
- Google `/url` redirect links are unwrapped before URL-slug fallback is derived.
- If no useful label can be recovered, GooWi retains the existing URL-derived fallback.
- No permanent `<all_urls>` access or new host permission is added.

## Preserved behavior

- The 75-character **View in GooWi** limit remains unchanged.
- The v1.0.0 relevance matcher remains unchanged.
- History remains session-local and non-persistent.
- Back, Return, Random Article, Wikirace, reading overlay, hatnotes, protected-reader handling, and Wikipedia link behavior remain as in v1.1.0.
- No analytics, telemetry, accounts, developer backend, or persistent browsing history were added.
