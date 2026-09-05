# GooWi v1.1.0 Release Notes

GooWi v1.1.0 focuses on navigation, link behavior, and reading polish while deliberately leaving the validated v1.0.0 relevance matcher unchanged.

## Navigation

- Added **History** and **Back** controls.
- Toolbar order: **Wikirace → Random → History → Back → Return → Expand → Collapse**.
- **Back** returns to the immediately previous GooWi article.
- **History** opens an in-reader list of articles visited during the current GooWi session and allows direct navigation to an earlier entry.
- **Return** still jumps to the source article associated with the Google query or the first selected-text session; it is not repurposed as Back.
- History is ephemeral and memory-only. GooWi does not write article history to browser storage.
- History entries retain their reader scroll position so returning to an article restores the prior reading location.
- Wikirace navigation remains separate from ordinary history. A completed or ended race contributes only its landing article as a normal history step.

## Link behavior

- Internal Wikipedia links now use a Google search for the linked article title as their real `href`.
- A normal left-click is still intercepted so the Wikipedia article opens inside GooWi.
- Ctrl/Cmd-click, Shift-click, middle-click, and browser **Open Link in New Tab** behavior can follow the link's own Google-search destination instead of reusing the original Google query.
- This applies to ordinary article links and Wikipedia hatnote links.

## View in GooWi

- The browser context-menu command now appears when right-clicking a link as well as selected text.
- If selected text is supplied, the selection remains authoritative.
- Otherwise GooWi derives a concise lookup term from supported link destinations, including Wikipedia/Wiktionary article URLs, Google search URLs, and useful final URL path segments.
- The existing 75-character lookup limit and conservative relevance requirements remain unchanged.

## Reading-mode polish

- Fixed expanded-reader hatnotes so they share the same centered reading column as the article header, body, and footer.
- Added responsive toolbar adjustments for the two new controls, including compact and Firefox-sidebar layouts.

## Compatibility and scope

- Chromium build remains shared by Chrome and Edge.
- Firefox retains its native-sidebar and extension-reader fallback behavior for protected surfaces.
- No matcher thresholds or identity rules were changed.
- No new host permissions, remote code, analytics, telemetry, accounts, persistent identifiers, or developer-operated backend were added.
