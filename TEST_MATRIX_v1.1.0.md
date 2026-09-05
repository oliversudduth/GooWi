# GooWi v1.1.0 Regression Test Matrix

| Test | Expected behavior |
|---|---|
| Sophrosyne | Correct article and clean rendering |
| Internal link left-click | Linked Wikipedia article opens inside GooWi; Google query does not change |
| Internal link → Open Link in New Tab | New tab searches Google for the linked article title, not the original query |
| Internal link Ctrl/Cmd-click | Browser follows the linked term's Google-search URL without replacing GooWi's current article |
| Hatnote link left-click | Linked Wikipedia article opens inside GooWi |
| Expanded hatnotes | Hatnotes align with the centered article reading column |
| Back initial state | Back is visible but disabled on the first article |
| Article A → B → C → Back | Returns C → B and restores B's previous reader scroll position |
| History initial state | History is visible but disabled until a second article exists |
| History after navigation | Menu lists the current session's visited articles and marks the current article |
| History direct jump | Selecting an entry renders that article and restores its saved scroll position |
| Navigate after Back | Forward branch is discarded; new navigation continues from the current history position |
| Return after several articles | Jumps to the original query/selection source article |
| Long history | Source article remains preserved for Return while older non-source entries are capped |
| Random Article | Adds the random article as a normal history entry; Google query remains unchanged |
| Wikirace active | Back and History are disabled while the race is active/paused |
| Wikirace win/end | Race traversal is not added step-by-step; landing article becomes one normal history entry |
| View in GooWi on selected text | Existing behavior retained |
| View in GooWi on Wikipedia/Wiktionary link | Context menu appears and derives the linked article term |
| View in GooWi on Google search link | Context menu derives the link's `q` value |
| View in GooWi selection on link | Explicit selected text wins over link-derived text |
| >75-character View in GooWi lookup | Shows “Sheesh, keep it brief 🫠” and does not contact Wikipedia |
| Albert Camus | Correct article and clean rendering |
| Post-9/11 GI Bill | Resolves to formal act article |
| NFIP | Resolves to National Flood Insurance Program |
| Albet Camus | Corrects to Albert Camus |
| GooWi | No panel |
| Mississippi River and Tributaries Project | No misleading broad-topic panel |
| Mercury | Wikipedia disambiguation page |
| Georgia country | Georgia (country) |
| C++ | Punctuation preserved and correct article |
| ASU | Disambiguation page continues through university subsections |
| Expand → Restore | Underlying page and scroll state preserved |
| Collapse | Panel collapses and restores correctly with added controls |
