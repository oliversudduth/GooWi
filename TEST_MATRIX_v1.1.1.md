# GooWi v1.1.1 Regression Test Matrix

## New v1.1.1 tests

| Test | Expected behavior |
|---|---|
| Toolbar order | ♡ Donate → Wikirace → Random → History → Back → Return → Expand → Collapse |
| Back icon | Compact browser-style left arrow; same circular icon-button footprint as neighboring controls |
| Back behavior | Navigates to the immediately previous GooWi article and restores saved reading position |
| Donate behavior | Heart is the leftmost control and opens Wikimedia donation page in a new tab |
| Opaque link / Firefox | Right-click a link whose visible text is `Achilles` but whose href ends in a UUID; View in GooWi looks up `Achilles`, not the UUID |
| Opaque link / Chromium | Same test; visible link label is recovered locally after explicit context-menu invocation |
| Complex Google result / Firefox | Right-click a result such as `Achilles - Greek Hero, Trojan War & Facts`; GooWi uses the concise result title instead of an oversized combined anchor label |
| Complex Google result / Chromium | Same test; semantic label ranking prefers the nested result heading and does not trigger `Sheesh, keep it brief 🫠` |
| SEO-title fallback / Firefox | `Achilles - Greek Hero, Trojan War & Facts` first tries the exact headline; if rejected, `/articles/achilles` supplies `Achilles`, which resolves through the unchanged matcher |
| SEO-title fallback / Chromium | Same candidate sequence and outcome |
| SEO-title separator fallback | A verbose title such as `Albert Camus | Biography, Books, Philosophy & Facts` can retry `Albert Camus` after exact-title/URL candidates fail |
| Google redirect URL fallback | A `google.com/url?q=<target>` link is unwrapped before deriving the readable target slug |
| Failed SEO candidates | If exact title, URL slug, and conservative title-prefix fallback all fail, GooWi still shows `No confident Wikipedia match found.` |
| Oversized browser link text | An over-75-character browser/container label is skipped when a concise heading/ARIA/title/alt/visible-text candidate exists; no arbitrary truncation |
| Selected text on link | Explicit selection remains the lookup source even when the selection is inside a link |
| Human-readable URL fallback | If a useful link label is unavailable, existing URL parsing still derives a concise lookup where possible |
| Generic link text | Generic labels such as `click here` do not override a more useful URL-derived term |
| 75-character limit | Long selected/link-derived lookup still shows `Sheesh, keep it brief 🫠` and is not sent to Wikipedia |
| Non-link element | View in GooWi is not expected in link context for ordinary non-link text unless text is explicitly selected |
| Permissions | No new permissions or host permissions compared with v1.1.0 |

## v1.1.0 navigation regression

| Test | Expected behavior |
|---|---|
| History | Displays session-local visited GooWi articles |
| Back | Returns one article at a time through GooWi history |
| Return | Jumps to the article associated with the original Google query or first View in GooWi selection |
| History scroll restoration | Returning through History/Back restores the stored reading position |
| Expanded hatnotes | Hatnotes align with the centered expanded reading column |
| GooWi article left-click | Linked Wikipedia article opens inside GooWi |
| GooWi article new tab | Browser new-tab/modifier behavior opens a Google search for that linked article title |

## Stable matcher regression

| Test | Expected behavior |
|---|---|
| Albert Camus | Correct article and clean rendering |
| George Washington | Correct article and primary portrait |
| Provanna chevalieri | Article renders with no image |
| Post-9/11 GI Bill | Resolves to formal act article |
| NFIP | Resolves to National Flood Insurance Program |
| Albet Camus | Corrects to Albert Camus |
| Geroge Washington | Corrects to George Washington |
| GooWi | No misleading Wikipedia panel |
| Mississippi River and Tributaries Project | No misleading broad-topic panel |
| Mercury | Wikipedia disambiguation page |
| Mercury planet | Mercury (planet) |
| Georgia | Wikipedia disambiguation page |
| Georgia country | Georgia (country) |
| C++ | Punctuation preserved and correct article |
| ASU | Disambiguation page continues through university subsections |
| Random Article | Changes only Wikipedia pane |
| Random → Return | Returns to source article |
| Expand → Restore | Underlying page/query and scroll state preserved |
| Wikirace | Full supported article navigation available |
| Wikirace click 10 | Offers Continue or New race |
| Wikirace Continue | Counter continues beyond 10 |

## Manual validation recorded during v1.1.1 testing

- Firefox opaque-ID ChatGPT link labeled **Achilles** resolved from the visible label rather than the UUID-like destination.
- Firefox Google result for History.com **Achilles - Greek Hero, Trojan War & Facts** resolved to **Achilles** through the conservative resolver pipeline.
- Firefox Google result for Britannica **Achilles' heel - Greek mythology - Britannica** preserved the more specific **Achilles' heel** result rather than collapsing to Achilles.
- Google result-link context-menu behavior was confirmed after the final resolver revision.

A final packaged-build smoke test on Chromium remains recommended before store submission.
