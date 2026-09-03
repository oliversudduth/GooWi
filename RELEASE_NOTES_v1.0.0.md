# GooWi v1.0.0 — First Stable Public Release

GooWi v1.0.0 is the first stable general-public release of GooWi.

This release promotes the fully tested v0.8.1 codebase to 1.0.0 **without changing extension behavior**. The matcher, permissions, user interface, browser integration, privacy model, and reader behavior are unchanged from the stable v0.8.1 builds.

## What 1.0 means

The 0.x series served as GooWi's development and pre-1.0 testing cycle. By v0.8.1, the project had reached the intended stable feature set:

- Wikipedia context beside Google Search
- conservative relevance filtering
- redirect, alias, disambiguation, and typo-handling refinements
- Wikipedia hatnotes and representative images
- internal Wikipedia navigation without changing the Google query
- Random Article
- expand/restore reading mode
- Wikirace
- **View in GooWi** selected-text lookup
- centered **♡ Donate to Wikimedia** link
- Firefox native-sidebar fallback for protected reader surfaces, including the built-in PDF viewer
- Chrome PDF support through the existing injected-reader path
- privacy documentation, licensing, automated validation, and public source distribution

## Browser support

### Firefox

- Automatic GooWi companion on supported Google Search pages
- **View in GooWi** on ordinary webpages
- Native Firefox-sidebar fallback for the built-in PDF viewer and compatible protected reader surfaces
- The sidebar appears on whichever side the user has configured Firefox's browser sidebar

### Chrome / Chromium

- Automatic GooWi companion on supported Google Search pages
- **View in GooWi** on ordinary webpages
- Chrome's built-in PDF viewer supports the existing injected-reader path in current testing

### Microsoft Edge

- The shared Chromium build works on ordinary Edge webpages
- **Known limitation:** View in GooWi does not currently function inside Edge's built-in PDF viewer because Edge does not dispatch the extension context-menu action there in current testing

## Matching

The manually validated v0.7.20 matcher remains unchanged in v1.0.0.

## Privacy

GooWi has no analytics, ads, telemetry, accounts, persistent identifiers, or developer-operated backend.

Google search terms and text explicitly selected with **View in GooWi** are sent directly to Wikipedia only as needed to retrieve encyclopedia content. The developer does not receive or retain those lookups through GooWi.

## Version note

v1.0.0 is a release-number promotion of the stable v0.8.1 codebase. No functional code changes were introduced solely for the 1.0 promotion.

---

# Pre-1.0 development history

# GooWi v0.8.1 — Firefox protected-reader support and cumulative history

## Summary

v0.8.1 extends **View in GooWi** to Firefox surfaces where WebExtensions can receive a selected-text context-menu action but cannot inject the normal in-page GooWi reader.

The primary target is Firefox's built-in PDF viewer. The same fallback is designed to work on other compatible Firefox-protected reading surfaces, including Reader View, when the browser supplies the selected text but blocks script injection.

### Firefox

- On ordinary webpages and Google Search, **View in GooWi** keeps using the familiar injected GooWi sidebar.
- On Firefox's built-in PDF viewer and other protected reader surfaces, GooWi opens a **native Firefox extension sidebar** instead.
- The native sidebar uses the same Wikipedia matcher and reader features:
  - internal Wikipedia navigation
  - Random Article
  - Return to the first selected lookup
  - Wikirace
  - Wikipedia hatnotes and PageImages
  - the 75-character selection limit
  - **“Sheesh, keep it brief 🫠”**
  - **“No confident Wikipedia match found.”**
  - centered **♡ Donate to Wikimedia**
- The native sidebar's Expand control opens the current GooWi article in a full GooWi reader tab because Firefox does not permit GooWi to overlay privileged PDF/Reader UI.
- The native sidebar's Collapse control closes the Firefox sidebar.
- `sidebar_action` is configured with `open_at_install: false`, so upgrading GooWi does not open the sidebar unexpectedly.

### Chromium

Chromium is also versioned as **v0.8.1** for release parity. Chrome/Chromium already allowed GooWi's existing selected-text injection path to function alongside the built-in PDF viewer in testing, so the Chromium reader architecture is intentionally unchanged in this release.

## Permissions and privacy

v0.8.1 adds no new transmitted-data category, analytics, telemetry, advertising, account system, backend, or permanent all-sites host access.

Firefox's native sidebar is an extension-owned surface. Selected text is still sent directly to Wikipedia only after the user explicitly chooses **View in GooWi**, under the same 75-character rule and privacy model introduced in v0.8.0.

## Matching

The manually validated v0.7.20 matcher remains unchanged. This release changes where Firefox can render an explicitly requested GooWi reader; it does not alter relevance thresholds, redirect handling, Google-context ranking, alias logic, typo correction, or disambiguation behavior.

---

# Previous v0.8.0 release record

# GooWi v0.8.0 — View in GooWi, Wikimedia support, and cumulative changes since v0.7.11

## Summary

v0.8.0 expands GooWi beyond automatic Google Search integration while preserving the v0.7.20 matcher.

The release adds two user-facing features:

1. **View in GooWi** — highlight a word or phrase on an ordinary webpage, right-click, and open the full GooWi Wikipedia reader for that selection.
2. **♡ Donate to Wikimedia** — a centered support link in the GooWi header, visually separate from the functional toolbar controls.

No relevance thresholds, redirect rules, alias logic, Google-context ranking, or typo logic were changed in this release.

## View in GooWi

When text is selected, GooWi adds the browser context-menu command:

**View in GooWi**

Invoking it opens the full GooWi reader directly on the current page. Selection mode supports the same reader features as Google mode:

- internal Wikipedia navigation
- Random Article
- Return
- expand / restore
- collapse / expand
- Wikirace, including the 10-click checkpoint and overtime
- Wikipedia hatnotes and clarification links
- Wikipedia PageImages
- dark/light appearance behavior

GooWi remains dormant on ordinary webpages until the user explicitly invokes this command.

## No permanent all-sites access

v0.8.0 adds the permissions:

- `contextMenus`
- `activeTab`
- `scripting`

These allow GooWi to inject its packaged reader into the single active tab where the user explicitly chooses **View in GooWi**.

GooWi does **not** request permanent `<all_urls>` host access and does not continuously run on arbitrary webpages.

Browser-protected pages may refuse extension injection. GooWi respects those restrictions and fails quietly on those surfaces.

## 75-character selection limit

Selected text is cleaned by trimming leading/trailing whitespace and collapsing repeated whitespace.

The cleaned selection may contain at most **75 characters**.

Selections over that limit are not sent to Wikipedia. GooWi opens the reader and displays:

**Sheesh, keep it brief 🫠**

Meaningful punctuation is preserved for valid selections, including terms such as `C++`.

## Explicit no-match feedback

Automatic Google mode remains fail-closed: if GooWi cannot identify a trustworthy Wikipedia result, it stays out of the way.

Selection mode is different because the user explicitly asked GooWi to perform a lookup. If the matcher finds no sufficiently trustworthy result, the reader remains open and displays:

**No confident Wikipedia match found.**

The selection lookup does not lower GooWi's relevance threshold simply because the action was user-invoked.

## Return behavior

### On Google Search

A selected-text lookup temporarily replaces the query-associated article inside GooWi without modifying the Google query.

Pressing Return restores the Wikipedia article associated with the underlying Google search.

### On other webpages

The first selection that opens GooWi becomes the page session's return point.

Later **View in GooWi** selections reuse the reader. Pressing Return restores that first selected lookup.

## Donate to Wikimedia

A neutral outline heart **♡** is centered relative to the GooWi sidebar header, independently of the right-side control group.

The header layout is conceptually:

**WIKIPEDIA via GooWi** — **♡** — **⚑  ⚄  ↻  ⛶  ›**

The heart:

- has the tooltip / accessible label **Donate to Wikimedia**;
- opens `https://donate.wikimedia.org` in a new tab;
- does not embed the donation page in GooWi;
- uses the same neutral toolbar styling rather than an advertising-style treatment.

At unusually narrow sidebar widths the centered heart may hide to prevent collision with the functional control group.

## Privacy

Selected text is sent directly to Wikipedia only after the user explicitly invokes **View in GooWi** and only when the cleaned selection is 75 characters or fewer.

GooWi still has:

- no analytics
- no advertising
- no telemetry
- no user accounts
- no persistent identifiers
- no developer-operated backend
- no permanent all-sites host permission

The developer does not receive or retain selected-text lookups.

The existing Firefox transmitted-data declarations `searchTerms` and `websiteContent` remain applicable. Privacy documentation has been updated to describe selected-text lookup and the new user-invoked permissions.

## Matcher preservation

v0.8.0 is intentionally built on the manually validated v0.7.20 matcher without changing its relevance architecture.

Carry-forward expectations include:

- `Big Blue` → IBM
- `The Artist Formerly Known as Prince` → Prince (musician)
- `prince` → Prince / royal-title treatment
- `Gaius Caesar Augustus Germanicus` → Caligula
- `The Bard` → Bard disambiguation treatment
- `JRR Tolkien` → J. R. R. Tolkien
- `Samuel Clemens` → Mark Twain
- `François-Marie Arouet` → Voltaire
- `Abe Lincoln` → Abraham Lincoln
- `FDR`, `MLK`, `Ike`, `NYC` → preferred ambiguity/disambiguation behavior
- `apple customer service`, `apple support` → no automatic panel
- `Washington DC` → Washington, D.C.
- `wiazrd` → Wizard or no panel, never Yoshiko

## Recommended manual regression

### New feature — ordinary webpage

1. Select `Albert Camus` on a non-Google webpage.
2. Right-click → **View in GooWi**.
3. Confirm the full GooWi sidebar appears with Albert Camus.
4. Follow an internal Wikipedia link; confirm navigation stays inside GooWi.
5. Use Random Article.
6. Press Return; confirm the original `Albert Camus` lookup returns.
7. Test expand/restore and collapse/expand.
8. Start Wikirace and confirm in-pane race navigation works.
9. Select a second phrase and invoke **View in GooWi** again; confirm the existing reader is reused and Return restores the first selection.

### Selection limits / feedback

10. Select a cleaned phrase of exactly 75 characters; confirm GooWi attempts the lookup.
11. Select 76+ cleaned characters; confirm **Sheesh, keep it brief 🫠** and no Wikipedia lookup.
12. Select an intentionally obscure/nonmatching phrase; confirm **No confident Wikipedia match found.**
13. Select `C++`; confirm meaningful punctuation survives the handoff.

### Google selection mode

14. Search Google for `Albert Camus` and confirm normal automatic GooWi behavior.
15. Highlight a different phrase on the Google page and choose **View in GooWi**.
16. Confirm GooWi shows the selected-topic article without changing the Google query.
17. Press Return and confirm Albert Camus is restored.

### Donate link

18. Confirm **♡** is visually centered in the sidebar header and separate from the right-side controls.
19. Hover it; confirm **Donate to Wikimedia**.
20. Click it; confirm `https://donate.wikimedia.org` opens in a new tab.
21. Confirm the heart remains centered in expanded mode and does not collide with controls at normal desktop widths.

### Existing features / matcher

22. Re-run the high-risk v0.7.20 matcher cases listed above.
23. Re-test Random, Return, expand/restore, Wikirace, responsive layout, dark/light appearance, Back/Forward, refresh, rapid Google query switching, and Chrome service-worker wake after idle.


## Internal namespace cleanup

Before the v0.8.0 public update, legacy implementation names inherited from GooWi's earlier internal namespace were renamed to GooWi-native identifiers. This includes the stylesheet filename, internal DOM/CSS namespaces, and extension message names. The cleanup is internal only and does not change GooWi's matching, permissions, interface, or behavior.

---

# Development history since the last GitHub upload

The previous version confirmed on GitHub was **v0.7.11**. Versions **v0.7.12 through v0.7.20** were developed and manually tested as intermediate local builds rather than uploaded individually. Their changes are therefore included in this v0.8.0 release record so the GitHub history does not jump over the work that produced the final matcher.

Where an intermediate technique was later replaced, that is called out explicitly below. The behavior shipped in **v0.8.0** is the final v0.7.20 matcher plus the new v0.8.0 features described above.

## v0.7.12 — Google-context reliability refinement

- Strengthened extraction of high-confidence Google entity context, including a conservative fallback based on visible Wikipedia results selected by Google.
- Rejected generic Google structural headings such as `Description`, `Overview`, and `Origin` as canonical topics.
- Added direct handling for Google's **See results about** signal when the proposed entity is already represented by the user's query.
- Demoted parenthetical Wikipedia titles from literal-exact status while preserving parenthetical disambiguation pages as authoritative ambiguity.
- Targeted alias/formal-name cases including `Abe Lincoln`, `JRR Tolkien`, `JFK`, `Teddy Roosevelt`, `GRRM`, `The Artist Formerly Known as Prince`, `Macedonian Alexander III`, and `Gaius Caesar Augustus Germanicus`.
- Preserved conservative handling for `FDR`, `MLK`, `Ike`, `NYC`, `Big Apple`, `Windy City`, `The Bard`, navigational Apple queries, `Washington DC`, and typo protection.

## v0.7.13 — Entity-name and related-page refinement

- Separated Google **entity names** from nearby **entity-type labels**, preventing labels such as `Band`, `Writer`, `Film`, `Company`, or `City` from becoming canonical Wikipedia topics.
- Changed **See results about** handling to extract the visible entity chip directly rather than infer it from surrounding text.
- Penalized relationship/derivative pages such as `Influences on ...`, `Works of ...`, `Legacy of ...`, `History of ...`, and `List of ...` when the relationship itself was not requested.
- Improved bidirectional alias validation for Google entity headings.
- Primary targets included `The Fab Four Beatles` → The Beatles, `The Fab Four` → The Fab Four (tribute), `The Artist Formerly Known as Prince` → Prince (musician), and `JRR Tolkien` → J. R. R. Tolkien rather than `Influences on Tolkien`.

## v0.7.14 — Type-aware canonical matching and context stabilization

- Began carrying Google's entity subtitle/type as a **sense hint**, rather than allowing it to become a topic by itself.
- Added compact semantic type hints such as musician, president, writer, band, film, company, and city for optional canonical Wikipedia searches.
- Added type-aware canonical ranking so a candidate such as `Prince (musician)` can beat the generic `Prince` article when Google clearly identifies the musician.
- Stabilized Google-context collection briefly so stronger late-rendering entity signals could replace weaker transient ones.
- Added a visible-Wikipedia-card fallback for Google layouts whose outbound link markup does not expose a direct Wikipedia URL.

## v0.7.15 — Multi-signal Google context and safe identity matching

- Removed identity inference from Wikipedia REST search excerpts after confirming that those excerpts are match-centered snippets, not guaranteed article leads.
- Preserved multiple independent Google context signals through background validation instead of collapsing them to one candidate too early.
- Parsed canonical Wikipedia article titles from visible Google Wikipedia URLs and stripped decorative `- Wikipedia` heading text where needed.
- Refined canonical ranking so an exact canonical base plus a corroborated sense can outrank a different entity that merely contains the same name.
- This architecture specifically addressed the `Abe Lincoln` → `Sam & Max Save the World` and Prince/William Prince failures without query-specific exceptions.

## v0.7.16 — Redirect identity and sense-safe canonical ranking

- Added narrowly validated Wikipedia redirect-title metadata as first-party identity evidence before spelling correction.
- Tightened near-name fuzzy matching so cases such as `Samuel Clemens` do not drift to `Samuel Clement`.
- Rejected partial generic name-list/disambiguation-like pages when a longer specific personal name is being searched.
- Required the parenthetical qualifier itself to corroborate Google's entity sense before granting the strongest parenthetical canonical bonus.
- Primary targets included `Abe Lincoln` → Abraham Lincoln, `Samuel Clemens` → Mark Twain, `François-Marie Arouet` → Voltaire, while preserving `The Artist Formerly Known as Prince` → Prince (musician).

## v0.7.17 — Initialism normalization and bounded entity attribution

- Normalized spaced dotted initialisms such as `J. R. R.` to the same identity form as `JRR`.
- Bounded Google's text-based Wikipedia-result fallback to the same individual result card so neighboring results cannot inherit another card's Wikipedia attribution.
- Added a narrowly constrained formal-name alias path for genuine Google entity headings when a long query has little or no title overlap but is tightly corroborated by entity evidence and a recognized type.
- Primary regression targets were `JRR Tolkien` → J. R. R. Tolkien and `Gaius Caesar Augustus Germanicus` → Caligula.
- AI Overview prose remained non-authoritative.

## v0.7.18 — First-class Wikipedia redirect identity

- Moved Wikipedia-declared redirect evidence into the normal candidate-selection stage so it could compete before GooWi committed to a weaker lexical or Google-canonical result.
- Added an intermediate **one-extra-token** near-complete redirect rule for long formal names, intended to support `Gaius Caesar Augustus Germanicus` through Wikipedia's fuller redirect name.
- This build also attempted to make `Big Blue` → IBM outrank `Big Blue (TV series)` through explicit redirect evidence.

**Superseded in v0.7.19:** the one-extra-token heuristic was removed after it incorrectly treated the parenthetical redirect `The Artist Formerly Known as Prince (album)` as a near-complete alias and produced `Love Symbol`.

## v0.7.19 — Exact-title redirect resolution and parenthetical redirect safety

- Replaced the v0.7.18 near-complete heuristic with MediaWiki's **exact-title redirect resolver**.
- Exact user-entered redirects became first-party identity evidence for cases including:
  - `Big Blue` → IBM
  - `The Artist Formerly Known as Prince` → Prince (musician)
  - `Gaius Caesar Augustus Germanicus` → Caligula
  - `Samuel Clemens` → Mark Twain
  - `François-Marie Arouet` → Voltaire
  - `Abe Lincoln` → Abraham Lincoln
- Removed the one-extra-token redirect heuristic so terminal qualifiers such as `(album)` cannot masquerade as omitted name components.
- Exact redirects outrank weak Google Wikipedia-result sense selection, while separately validated Google entity context can still identify a more specific intended entity such as `The Fab Four` → The Fab Four (tribute).
- Ordinary redirects that jump directly into a page section remained excluded from clean identity handling.

## v0.7.20 — Preserve disambiguation redirects with section fragments

- Added one narrow exception to the section-redirect safeguard: if MediaWiki's exact redirect lands on an explicit `(disambiguation)` page, GooWi preserves that ambiguity even when the redirect includes a section fragment.
- Fixed `The Bard` resolving to `The Bard (film)` by honoring Wikipedia's redirect into `Bard (disambiguation)`.
- Ordinary non-disambiguation section redirects remain ignored as identity evidence.
- This became the manually validated matcher carried unchanged into v0.8.0.

# Final behavior carried into v0.8.0

The cumulative matcher work above was manually regression-tested before v0.8.0 was frozen. Representative final expectations include:

- `Big Blue` → **IBM**
- `The Artist Formerly Known as Prince` → **Prince (musician)**
- `prince` → **Prince** / royal-title treatment
- `Gaius Caesar Augustus Germanicus` → **Caligula**
- `The Bard` → **Bard (disambiguation)**
- `The Fab Four` → **The Fab Four (tribute)** when Google identifies that entity
- `The Fab Four Beatles` → **The Beatles**
- `JRR Tolkien` → **J. R. R. Tolkien**
- `Samuel Clemens` → **Mark Twain**
- `François-Marie Arouet` → **Voltaire**
- `Abe Lincoln` → **Abraham Lincoln**
- `FDR`, `MLK`, `Ike`, and `NYC` → preferred ambiguity/disambiguation behavior
- `Washington DC` → **Washington, D.C.**
- `wiazrd` → **Wizard or no panel**, never Yoshiko
- `apple customer service` / `apple support` → **no automatic panel**

The final browser/state regression also covered Random Article, Return, internal Wikipedia navigation, expand/restore, Wikirace, responsive behavior, dark/light appearance, browser Back/Forward, refresh, rapid query switching/stale-response protection, tab isolation, and Chrome service-worker wake after idle.
