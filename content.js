(() => {
  const PANEL_ID = "googlepedia-reborn-panel";
  const MAX_PARAGRAPHS = 8;
  const MAX_SECTIONS = 3;
  const MAX_LISTS = 8;
  const MAX_LIST_ITEMS = 36;
  const DISAMBIG_MAX_PARAGRAPHS = 24;
  const DISAMBIG_MAX_SECTIONS = 24;
  const DISAMBIG_MAX_LISTS = 40;
  const DISAMBIG_MAX_LIST_ITEMS = 240;
  const RACE_MAX_CLICKS = 10;
  let lastQuery = null;
  let requestSerial = 0;
  let currentResult = null;
  let raceState = null;

  function getQuery() {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }

  function getLanguage() {
    const params = new URLSearchParams(location.search);
    const hl = params.get("hl");
    if (hl) return hl;
    return document.documentElement.lang || navigator.language || "en";
  }



  const GOOGLE_GENERIC_HEADINGS = new Set([
    "ai overview", "overview", "people also ask", "people also search for",
    "images", "videos", "shopping", "news", "maps", "forums", "web results",
    "search results", "wikipedia", "ratings", "read now", "more results"
  ]);

  function normalizeGoogleSignalText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " and ")
      .replace(/[’']/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function googleSignalTokens(value) {
    const stopWords = new Set([
      "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
      "in", "is", "it", "of", "on", "or", "the", "to", "was", "were", "with",
      "da", "de", "del", "della", "des", "di", "do", "dos", "du", "la", "le",
      "van", "von"
    ]);
    return [...new Set(
      normalizeGoogleSignalText(value)
        .split(" ")
        .filter((token) => token && (!stopWords.has(token) || /^\d+$/.test(token)))
    )];
  }

  function googleTokenCoverage(needles, haystack) {
    if (!needles.length) return 0;
    const set = new Set(haystack);
    return needles.filter((token) => set.has(token)).length / needles.length;
  }

  function googleOrderedSubsequence(needles, haystack, maxGap = 2) {
    if (!needles.length || !haystack.length) return false;
    let searchFrom = 0;
    let previous = -1;
    for (const needle of needles) {
      let found = -1;
      for (let index = searchFrom; index < haystack.length; index += 1) {
        if (haystack[index] === needle) {
          found = index;
          break;
        }
      }
      if (found < 0) return false;
      if (previous >= 0 && found - previous - 1 > maxGap) return false;
      previous = found;
      searchFrom = found + 1;
    }
    return true;
  }

  function googleTopicAcronymVariants(value) {
    const rawTokens = normalizeGoogleSignalText(value).split(" ").filter(Boolean);
    const variants = new Set();
    if (!rawTokens.length) return variants;

    const initials = (tokens) => tokens.map((token) =>
      /^[ivxlcdm]+$/i.test(token) ? token : (token[0] || "")
    ).join("");

    variants.add(initials(rawTokens));
    if (["a", "an", "the"].includes(rawTokens[0]) && rawTokens.length > 1) {
      variants.add(initials(rawTokens.slice(1)));
    }
    variants.add(initials(googleSignalTokens(value)));
    return variants;
  }

  function isVisibleGoogleElement(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest(`#${PANEL_ID}`)) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 12) return false;
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
  }

  function boundedGoogleEvidence(element) {
    let node = element;
    let best = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();

    for (let depth = 0; depth < 5 && node?.parentElement; depth += 1) {
      node = node.parentElement;
      if (node.closest(`#${PANEL_ID}`)) break;
      const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (text.length > 2400) break;
      if (text.length > best.length) best = text;
    }

    return best.slice(0, 2400);
  }

  function googleCanonicalScore(query, title, evidence, baseScore) {
    const queryNorm = normalizeGoogleSignalText(query);
    const titleNorm = normalizeGoogleSignalText(title);
    if (!queryNorm || !titleNorm || queryNorm === titleNorm) return 0;
    if (GOOGLE_GENERIC_HEADINGS.has(titleNorm)) return 0;
    if (titleNorm.length < 2 || titleNorm.length > 140) return 0;

    const queryTokens = googleSignalTokens(query);
    const titleTokens = googleSignalTokens(title);
    const evidenceTokens = googleSignalTokens(evidence);
    if (!queryTokens.length || !titleTokens.length) return 0;

    let score = baseScore;
    const rawCompact = queryNorm.replace(/\s+/g, "");
    const titleAcronyms = googleTopicAcronymVariants(title);
    if (rawCompact.length >= 2 && rawCompact.length <= 12 && titleAcronyms.has(rawCompact)) {
      score += 45;
    }

    const titleCoverage = googleTokenCoverage(queryTokens, titleTokens);
    const evidenceCoverage = googleTokenCoverage(queryTokens, evidenceTokens);
    score += titleCoverage * 30;
    score += evidenceCoverage * 25;

    if (googleOrderedSubsequence(queryTokens, evidenceTokens, 2)) score += 25;
    if (normalizeGoogleSignalText(evidence).includes(queryNorm)) score += 10;
    if (titleCoverage === 1) score += 10;

    return score;
  }

  function extractGoogleCanonicalContext(query) {
    if (!query || !document.body) return null;

    const candidates = [];
    const seen = new Set();

    function addCandidate(element, source, baseScore) {
      if (!isVisibleGoogleElement(element)) return;

      const nestedHeading = element.matches("h1, h2, [role='heading']")
        ? element
        : element.querySelector("h1, h2, h3, [role='heading']");
      const rawTitle = String(
        element.getAttribute?.("data-entityname") ||
        nestedHeading?.innerText || nestedHeading?.textContent ||
        element.innerText || element.textContent || ""
      ).replace(/\s+/g, " ").trim();

      if (!rawTitle) return;
      const title = rawTitle.split(/\n/)[0].trim().slice(0, 140);
      const key = normalizeGoogleSignalText(title);
      if (!key || seen.has(key) || GOOGLE_GENERIC_HEADINGS.has(key)) return;

      const evidence = boundedGoogleEvidence(nestedHeading || element);
      const score = googleCanonicalScore(query, title, evidence, baseScore);
      if (score < 75) return;

      seen.add(key);
      candidates.push({ title, evidence, source, confidence: Math.min(100, Math.round(score)) });
    }

    // Google's entity/knowledge modules have used several stable semantic
    // attributes and a handful of long-lived title classes. These are treated
    // as high-confidence signals when present, but GooWi does not depend on any
    // one of them.
    const structuredSelectors = [
      "[data-attrid='title']",
      "[data-entityname]",
      ".SPZz6b",
      ".qrShPb",
      ".kno-ecr-pt",
      ".PZPZlf"
    ];
    for (const selector of structuredSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        addCandidate(element, "google-structured-entity", 50);
      }
    }

    // Fallback for redesigned result pages: consider only prominent, non-link
    // level-one/two headings. Ordinary organic result titles are normally h3s
    // inside anchors and are deliberately excluded so a result snippet cannot
    // masquerade as Google's interpretation of the query.
    for (const element of document.querySelectorAll(
      "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']"
    )) {
      if (element.closest("a[href]")) continue;
      const fontSize = parseFloat(getComputedStyle(element).fontSize || "0");
      if (fontSize && fontSize < 22) continue;
      addCandidate(element, "google-prominent-heading", 25);
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates[0] || null;
  }

  function waitForGoogleCanonicalContext(query, timeoutMs = 320) {
    const immediate = extractGoogleCanonicalContext(query);
    if (immediate) return Promise.resolve(immediate);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value || null);
      };

      const observer = new MutationObserver(() => {
        if (query !== getQuery()) return finish(null);
        const context = extractGoogleCanonicalContext(query);
        if (context) finish(context);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => finish(extractGoogleCanonicalContext(query)), timeoutMs);
    });
  }


  function makeElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function googleSearchUrl(text) {
    return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  }

  function cleanTitleFromWikiHref(href) {
    try {
      const raw = String(href || "");
      const normalized = raw.startsWith("./")
        ? `/wiki/${raw.slice(2)}`
        : raw;
      const url = new URL(normalized, "https://en.wikipedia.org/");
      const match = url.pathname.match(/^\/wiki\/(.+)$/);
      if (!match) return null;

      const title = decodeURIComponent(match[1])
        .replace(/_/g, " ")
        .split("#")[0]
        .trim();

      // MediaWiki namespaces are utility pages rather than article concepts.
      if (!title || /^(?:File|Special|Help|Template|Category|Portal|Wikipedia|Talk):/i.test(title)) {
        return null;
      }

      return title;
    } catch {
      return null;
    }
  }

  const DROP_TAGS = new Set([
    "style", "script", "noscript", "template", "link", "meta",
    "iframe", "object", "embed"
  ]);

  const DROP_CLASSES = [
    "reference",
    "mw-editsection",
    "mw-cite-backlink",
    "mw-cite-target",
    "mw-ref",
    "noprint",
    "mw-empty-elt"
  ];

  function shouldDropElement(element) {
    const tag = element.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return true;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return true;
    if (DROP_CLASSES.some((className) => element.classList.contains(className))) return true;
    if ((element.id || "").startsWith("cite_ref-")) return true;
    return false;
  }

  function appendSanitizedNode(target, sourceNode, options = {}) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(sourceNode.textContent || ""));
      return;
    }

    if (sourceNode.nodeType !== Node.ELEMENT_NODE) return;

    const element = sourceNode;
    const tag = element.tagName.toLowerCase();
    if (shouldDropElement(element)) return;

    // References are normally <sup class="reference">. Keep genuine superscript
    // text, but discard citation superscripts even if MediaWiki omits the class.
    if (tag === "sup" && /^(?:\[?\d+[a-z]?\]?|\[citation needed\])$/i.test((element.textContent || "").trim())) {
      return;
    }

    if (tag === "br") {
      target.appendChild(document.createElement("br"));
      return;
    }

    let destination = target;

    if (tag === "a") {
      const label = (element.textContent || "").trim();
      if (!label) return;

      const title = cleanTitleFromWikiHref(element.getAttribute("href") || "");

      // During Wikirace, genuine article links navigate inside GooWi and count
      // toward the Wikirace click counter. Non-article links become plain text rather
      // than opening Google or Wikipedia and accidentally escaping the race.
      if (options.raceActive) {
        if (title) {
          const a = document.createElement("a");
          a.href = "#";
          a.title = `Open ${title} in Wikirace`;
          a.dataset.wikiTitle = title;
          a.addEventListener("click", (event) => {
            event.preventDefault();
            options.onWikiNavigate?.(title);
          });
          target.appendChild(a);
          destination = a;
        }
      } else if (title) {
        // Normal GooWi navigation stays inside the Wikipedia pane. The underlying
        // Google query must remain untouched; the return-to-query control restores
        // the article associated with that Google search at any time.
        const a = document.createElement("a");
        a.href = "#";
        a.title = `Open ${title} in GooWi`;
        a.dataset.wikiTitle = title;
        a.addEventListener("click", (event) => {
          event.preventDefault();
          options.onWikiNavigate?.(title);
        });
        target.appendChild(a);
        destination = a;
      } else {
        // External/non-article links must never replace the current Google page.
        // Preserve safe HTTP(S) destinations by opening them in a new tab.
        try {
          const rawHref = element.getAttribute("href") || "";
          const externalUrl = new URL(rawHref, `https://${options.language || "en"}.wikipedia.org/`);
          if (["http:", "https:"].includes(externalUrl.protocol)) {
            const a = document.createElement("a");
            a.href = externalUrl.href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.title = `Open ${label} in a new tab`;
            target.appendChild(a);
            destination = a;
          }
        } catch {
          // Leave unsupported destinations as plain text.
        }
      }
    } else if (["b", "strong", "i", "em", "small", "sub", "sup", "abbr"].includes(tag)) {
      const inline = document.createElement(tag);
      target.appendChild(inline);
      destination = inline;
    }

    // Walk descendants instead of using textContent. This is the important
    // distinction: textContent includes CSS from nested <style> tags.
    for (const child of element.childNodes) {
      appendSanitizedNode(destination, child, options);
    }
  }

  function isInsideArticleChrome(node) {
    return Boolean(node.closest(
      "table, .infobox, .sidebar, .navbox, nav, aside, figure, .toc, .metadata, .vertical-navbox"
    ));
  }

  function renderList(sourceList, remainingItems = MAX_LIST_ITEMS, depth = 0, options = {}) {
    const maxDepth = options.raceActive ? 8 : 2;
    if (!sourceList || remainingItems <= 0 || depth > maxDepth) {
      return { element: null, itemCount: 0 };
    }

    const tag = sourceList.tagName.toLowerCase() === "ol" ? "ol" : "ul";
    const list = makeElement(tag, "gp-list");
    let itemCount = 0;

    for (const sourceItem of sourceList.children) {
      if (sourceItem.tagName?.toLowerCase() !== "li") continue;
      if (itemCount >= remainingItems) break;

      const item = makeElement("li", "gp-list-item");

      for (const child of sourceItem.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE &&
            ["ul", "ol"].includes(child.tagName.toLowerCase())) {
          const nested = renderList(child, remainingItems - itemCount, depth + 1, options);
          if (nested.element) {
            item.appendChild(nested.element);
            itemCount += nested.itemCount;
          }
          continue;
        }
        appendSanitizedNode(item, child, options);
      }

      const text = (item.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      list.appendChild(item);
      itemCount += 1;
    }

    return {
      element: list.childElementCount ? list : null,
      itemCount
    };
  }

  function buildHatnotes(html, language, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const root = doc.querySelector(".mw-parser-output") || doc.body;
    if (!root) return null;

    const container = makeElement("div", "gp-hatnotes");
    let count = 0;

    for (const sourceNote of root.querySelectorAll(".hatnote")) {
      if (count >= 4) break;
      if (sourceNote.parentElement?.closest(".hatnote")) continue;
      if (isInsideArticleChrome(sourceNote)) continue;

      const note = makeElement("div", "gp-hatnote");
      for (const child of sourceNote.childNodes) {
        appendSanitizedNode(note, child, { ...options, language });
      }

      const text = (note.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      container.appendChild(note);
      count += 1;
    }

    return container.childElementCount ? container : null;
  }

  function buildReadableArticle(html, language, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const output = document.createDocumentFragment();

    const root = doc.querySelector(".mw-parser-output") || doc.body;
    if (!root) return output;

    // Wikirace must never become unwinnable because GooWi truncated the page.
    // Normal and disambiguation views remain intentionally bounded, while race
    // mode renders the full supported article structure.
    const unlimited = Number.POSITIVE_INFINITY;
    const maxParagraphs = options.raceActive
      ? unlimited
      : options.isDisambiguation
        ? DISAMBIG_MAX_PARAGRAPHS
        : MAX_PARAGRAPHS;
    const maxSections = options.raceActive
      ? unlimited
      : options.isDisambiguation
        ? DISAMBIG_MAX_SECTIONS
        : MAX_SECTIONS;
    const maxLists = options.raceActive
      ? unlimited
      : options.isDisambiguation
        ? DISAMBIG_MAX_LISTS
        : MAX_LISTS;
    const maxListItems = options.raceActive
      ? unlimited
      : options.isDisambiguation
        ? DISAMBIG_MAX_LIST_ITEMS
        : MAX_LIST_ITEMS;

    let paragraphCount = 0;
    let sectionCount = 0;
    let listCount = 0;
    let listItemCount = 0;
    let hasReadableContent = false;
    const readableNodes = root.querySelectorAll(
      options.raceActive ? "p, h2, h3, h4, h5, h6, ul, ol" : "p, h2, h3, ul, ol"
    );

    for (const node of readableNodes) {
      const tag = node.tagName.toLowerCase();
      if (isInsideArticleChrome(node)) continue;

      // Nested lists are rendered recursively with their parent list.
      if ((tag === "ul" || tag === "ol") && node.parentElement?.closest("ul, ol")) {
        continue;
      }

      if (tag === "p") {
        const paragraph = renderParagraph(node, language, options);
        const text = (paragraph.textContent || "").replace(/\s+/g, " ").trim();
        const minimumLength = options.raceActive ? 1 : 25;
        if (!text || text.length < minimumLength) continue;
        output.appendChild(paragraph);
        paragraphCount += 1;
        hasReadableContent = true;
        if (paragraphCount >= maxParagraphs) break;
        continue;
      }

      if (tag === "ul" || tag === "ol") {
        if (listCount >= maxLists || listItemCount >= maxListItems) break;
        const rendered = renderList(node, maxListItems - listItemCount, 0, options);
        if (rendered.element) {
          output.appendChild(rendered.element);
          listCount += 1;
          listItemCount += rendered.itemCount;
          hasReadableContent = true;
        }
        continue;
      }

      if ((["h2", "h3", "h4", "h5", "h6"].includes(tag)) && hasReadableContent) {
        // Count only top-level Wikipedia sections toward GooWi's normal
        // section budget. Subheadings belong to the current major section
        // and should not prematurely truncate pages such as disambiguation
        // lists grouped by country or category.
        if (tag === "h2" && sectionCount >= maxSections) break;

        const headingText = node.textContent?.replace("[edit]", "").trim();
        if (headingText) {
          const headingClass = tag === "h2"
            ? "gp-section-heading"
            : "gp-section-heading gp-subsection-heading";
          output.appendChild(makeElement("h3", headingClass, headingText));
          if (tag === "h2") sectionCount += 1;
        }
      }
    }

    return output;
  }

  function renderParagraph(sourceParagraph, language, options = {}) {
    const p = makeElement("p", "gp-paragraph");

    for (const child of sourceParagraph.childNodes) {
      appendSanitizedNode(p, child, options);
    }

    return p;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
    document.documentElement.classList.remove(
      "googlepedia-reborn-visible",
      "googlepedia-reborn-overlay-open"
    );
  }

  function normalizeRaceTitle(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function raceIsActive() {
    return raceState?.status === "active";
  }

  function raceIsEngaged() {
    return raceState && ["active", "paused"].includes(raceState.status);
  }

  function updateRaceUi(panel) {
    if (!panel?.isConnected) return;

    const bar = panel.querySelector(".gp-racebar");
    const raceButton = panel.querySelector(".gp-race-button");
    const randomButton = panel.querySelector(".gp-random-button");
    if (!bar || !raceButton || !randomButton) return;

    bar.replaceChildren();

    if (!raceState) {
      bar.hidden = true;
      raceButton.setAttribute("aria-pressed", "false");
      raceButton.title = "Start Wikirace — reach a random article in ten clicks";
      raceButton.setAttribute("aria-label", raceButton.title);
      randomButton.disabled = false;
      return;
    }

    bar.hidden = false;
    const label = makeElement("strong", "gp-race-label", "WIKIRACE");
    const message = makeElement("span", "gp-race-message");
    const action = makeElement("button", "gp-race-action");
    action.type = "button";

    if (raceState.status === "active") {
      if (raceState.extended) {
        message.textContent = `Reach “${raceState.targetTitle}” · ${raceState.clicksUsed} click${raceState.clicksUsed === 1 ? "" : "s"} used${raceState.loading ? " · loading…" : ""}`;
      } else {
        const remaining = Math.max(0, raceState.maxClicks - raceState.clicksUsed);
        message.textContent = `Reach “${raceState.targetTitle}” · ${remaining} click${remaining === 1 ? "" : "s"} left${raceState.loading ? " · loading…" : ""}`;
      }
      action.textContent = "End";
      action.title = "End Wikirace";
      action.addEventListener("click", () => cancelWikirace(panel));
      raceButton.setAttribute("aria-pressed", "true");
      raceButton.title = "End Wikirace";
      raceButton.setAttribute("aria-label", "End Wikirace");
      randomButton.disabled = true;
    } else if (raceState.status === "paused") {
      message.textContent = `10-click limit reached · ${raceState.clicksUsed} clicks used · target: “${raceState.targetTitle}”`;

      action.textContent = "Continue";
      action.title = "Keep racing and continue counting clicks";
      action.addEventListener("click", () => {
        if (!raceState || raceState.status !== "paused") return;
        raceState.status = "active";
        raceState.extended = true;
        updateRaceUi(panel);
      });

      const newRace = makeElement("button", "gp-race-action", "New race");
      newRace.type = "button";
      newRace.title = "Start a new Wikirace from this article";
      newRace.addEventListener("click", () => startWikirace(panel, panel.querySelector(".gp-body"), getQuery()));

      raceButton.setAttribute("aria-pressed", "true");
      raceButton.title = "End Wikirace";
      raceButton.setAttribute("aria-label", "End Wikirace");
      randomButton.disabled = true;

      bar.append(label, message, action, newRace);
      return;
    } else if (raceState.status === "won") {
      message.textContent = `Reached “${raceState.targetTitle}” in ${raceState.clicksUsed} click${raceState.clicksUsed === 1 ? "" : "s"}.`;
      action.textContent = "New race";
      action.title = "Start a new Wikirace from this article";
      action.addEventListener("click", () => startWikirace(panel, panel.querySelector(".gp-body"), getQuery()));
      raceButton.setAttribute("aria-pressed", "false");
      raceButton.title = "Start a new Wikirace from this article";
      raceButton.setAttribute("aria-label", raceButton.title);
      randomButton.disabled = false;
    }

    bar.append(label, message, action);
  }

  function cancelWikirace(panel) {
    raceState = null;
    panel?.classList.remove("gp-race-loading");
    const body = panel?.querySelector(".gp-body");
    if (body && currentResult?.found) {
      renderResult(body, currentResult, getQuery());
    }
    updateRaceUi(panel);
  }

  async function startWikirace(panel, body, query) {
    if (!panel?.isConnected || !body || !currentResult?.found) return;

    const raceButton = panel.querySelector(".gp-race-button");
    if (raceButton) {
      raceButton.disabled = true;
      raceButton.textContent = "…";
      raceButton.setAttribute("aria-busy", "true");
    }

    const serial = ++requestSerial;
    const startTitle = currentResult.title;

    try {
      const target = await browser.runtime.sendMessage({
        type: "googlepedia:wikirace-target",
        language: currentResult.language || getLanguage(),
        excludeTitle: startTitle
      });

      if (serial !== requestSerial || query !== getQuery() || !panel.isConnected) return;
      if (!target?.found || !target.title) return;

      raceState = {
        status: "active",
        startTitle,
        targetTitle: target.title,
        clicksUsed: 0,
        maxClicks: RACE_MAX_CLICKS,
        extended: false,
        loading: false
      };

      renderResult(body, currentResult, query);
      updateRaceUi(panel);
      body.scrollTop = 0;
    } catch (error) {
      // Keep the current article unchanged if a target cannot be selected.
    } finally {
      if (raceButton?.isConnected) {
        raceButton.disabled = false;
        raceButton.textContent = "⚑";
        raceButton.removeAttribute("aria-busy");
      }
      updateRaceUi(panel);
    }
  }

  async function navigateNormalArticle(title) {
    const panel = document.getElementById(PANEL_ID);
    const body = panel?.querySelector(".gp-body");
    if (!panel?.isConnected || !body || raceIsEngaged()) return;

    if (normalizeRaceTitle(title) === normalizeRaceTitle(currentResult?.title)) {
      return;
    }

    const serial = ++requestSerial;
    const query = getQuery();

    try {
      const result = await browser.runtime.sendMessage({
        type: "googlepedia:page",
        title,
        language: currentResult?.language || getLanguage()
      });

      // Navigation inside GooWi belongs to the Google query that was visible when
      // the link was clicked. A later Google search must always win the race.
      if (serial !== requestSerial || query !== getQuery() || !panel.isConnected) {
        return;
      }

      if (!result?.found) return;

      currentResult = result;
      renderResult(body, currentResult, query);
      updateRaceUi(panel);
      body.scrollTop = 0;
    } catch {
      // Keep the current article in place if pane navigation fails.
    }
  }

  async function navigateWikirace(title) {
    const panel = document.getElementById(PANEL_ID);
    const body = panel?.querySelector(".gp-body");
    if (!panel?.isConnected || !body || !raceIsActive() || raceState.loading) return;

    if (normalizeRaceTitle(title) === normalizeRaceTitle(currentResult?.title)) {
      return;
    }

    const state = raceState;
    state.loading = true;
    panel.classList.add("gp-race-loading");
    updateRaceUi(panel);
    const serial = ++requestSerial;
    const query = getQuery();

    try {
      const result = await browser.runtime.sendMessage({
        type: "googlepedia:page",
        title,
        language: currentResult?.language || getLanguage()
      });

      if (serial !== requestSerial || query !== getQuery() || raceState !== state || !panel.isConnected) {
        return;
      }

      if (!result?.found) {
        state.loading = false;
        updateRaceUi(panel);
        return;
      }

      state.clicksUsed += 1;
      currentResult = result;

      if (normalizeRaceTitle(result.title) === normalizeRaceTitle(state.targetTitle)) {
        state.status = "won";
      } else if (!state.extended && state.clicksUsed >= state.maxClicks) {
        state.status = "paused";
      }

      state.loading = false;
      renderResult(body, currentResult, query);
      updateRaceUi(panel);
      body.scrollTop = 0;
    } catch (error) {
      if (raceState === state) {
        state.loading = false;
        updateRaceUi(panel);
      }
    } finally {
      panel?.classList.remove("gp-race-loading");
    }
  }

  function makeShell(query) {
    removePanel();

    const panel = makeElement("aside", "gp-panel");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Wikipedia result");

    const toolbar = makeElement("div", "gp-toolbar");
    const brandGroup = makeElement("div", "gp-brand-group");
    const brand = makeElement("a", "gp-brand", "WIKIPEDIA");
    const wikiLanguage = String(getLanguage() || "en").toLowerCase().split("-")[0] || "en";
    brand.href = `https://${wikiLanguage}.wikipedia.org/wiki/Main_Page`;
    brand.target = "_blank";
    brand.rel = "noopener noreferrer";
    brand.title = "Open Wikipedia main page";
    brand.setAttribute("aria-label", "Open Wikipedia main page");
    const via = makeElement("a", "gp-brand-via", "via GooWi");
    via.href = "https://github.com/oliversudduth/GooWi";
    via.target = "_blank";
    via.rel = "noopener noreferrer";
    via.title = "Open GooWi website";
    via.setAttribute("aria-label", "Open GooWi website");
    brandGroup.append(brand, via);
    const controls = makeElement("div", "gp-controls");

    const refresh = makeElement("button", "gp-icon-button", "↻");
    refresh.type = "button";
    refresh.title = "Return to Wikipedia article for this Google search";
    refresh.setAttribute("aria-label", "Return to Wikipedia article for this Google search");
    refresh.addEventListener("click", () => {
      raceState = null;
      loadForQuery(query, true);
    });

    const random = makeElement("button", "gp-icon-button gp-random-button", "⚄");
    random.type = "button";
    random.title = "Random Wikipedia article";
    random.setAttribute("aria-label", "Random Wikipedia article");
    random.addEventListener("click", () => loadRandomArticle(panel, body, query, random));

    const race = makeElement("button", "gp-icon-button gp-race-button", "⚑");
    race.type = "button";
    race.title = "Start Wikirace — reach a random article in ten clicks";
    race.setAttribute("aria-label", race.title);
    race.setAttribute("aria-pressed", "false");
    race.addEventListener("click", () => {
      if (raceIsEngaged()) {
        cancelWikirace(panel);
      } else {
        startWikirace(panel, body, query);
      }
    });

    const overlay = makeElement("button", "gp-icon-button gp-overlay-button", "⛶");
    overlay.type = "button";
    overlay.title = "Expand Wikipedia over Google";
    overlay.setAttribute("aria-label", "Expand Wikipedia over Google");
    overlay.setAttribute("aria-pressed", "false");

    function setOverlay(expanded) {
      if (expanded) {
        panel.classList.remove("gp-collapsed");
        collapse.textContent = "›";
        collapse.title = "Collapse Wikipedia panel";
        collapse.setAttribute("aria-expanded", "true");
      }

      panel.classList.toggle("gp-expanded", expanded);
      document.documentElement.classList.toggle("googlepedia-reborn-overlay-open", expanded);
      overlay.textContent = expanded ? "⤡" : "⛶";
      overlay.title = expanded ? "Restore Wikipedia side panel" : "Expand Wikipedia over Google";
      overlay.setAttribute(
        "aria-label",
        expanded ? "Restore Wikipedia side panel" : "Expand Wikipedia over Google"
      );
      overlay.setAttribute("aria-pressed", expanded ? "true" : "false");
    }

    overlay.addEventListener("click", () => {
      setOverlay(!panel.classList.contains("gp-expanded"));
    });

    const collapse = makeElement("button", "gp-icon-button", "›");
    collapse.type = "button";
    collapse.title = "Collapse Wikipedia panel";
    collapse.setAttribute("aria-expanded", "true");
    collapse.addEventListener("click", () => {
      if (panel.classList.contains("gp-expanded")) {
        setOverlay(false);
      }
      const collapsed = panel.classList.toggle("gp-collapsed");
      collapse.textContent = collapsed ? "‹" : "›";
      collapse.title = collapsed ? "Expand Wikipedia panel" : "Collapse Wikipedia panel";
      collapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    controls.append(race, random, refresh, overlay, collapse);
    toolbar.append(brandGroup, controls);

    const racebar = makeElement("div", "gp-racebar");
    racebar.hidden = true;
    racebar.setAttribute("aria-live", "polite");

    const body = makeElement("div", "gp-body");
    const loading = makeElement("div", "gp-loading", `Looking up “${query}”…`);
    body.appendChild(loading);

    panel.append(toolbar, racebar, body);
    document.body.appendChild(panel);
    document.documentElement.classList.add("googlepedia-reborn-visible");
    updateRaceUi(panel);

    return { panel, body };
  }

  function isLikelyDisambiguation(result) {
    if (!result) return false;

    const description = String(result.description || "").toLowerCase();
    if (description.includes("topics referred to by the same term") ||
        description.includes("disambiguation page")) {
      return true;
    }

    // Parsoid/MediaWiki output commonly carries disambiguation markers even
    // when the short description is localized or absent.
    const html = String(result.html || "");
    return /(?:mw-disambig|disambiguation)/i.test(html);
  }

  function renderResult(body, result, query) {
    body.replaceChildren();

    if (!result?.found) {
      const empty = makeElement("div", "gp-empty");
      empty.appendChild(makeElement("strong", "", "No Wikipedia match found."));
      empty.appendChild(makeElement("p", "", `Wikipedia did not return a likely article for “${query}”.`));
      if (result?.error) {
        empty.appendChild(makeElement("p", "gp-error-detail", result.error));
      }
      body.appendChild(empty);
      return;
    }

    const raceActive = raceIsEngaged();
    const header = makeElement("header", "gp-article-header");
    const title = raceActive ? document.createElement("span") : document.createElement("a");
    title.className = "gp-title";
    title.textContent = result.title;
    if (!raceActive) {
      title.href = result.pageUrl;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    header.appendChild(title);

    if (result.description) {
      header.appendChild(makeElement("div", "gp-description", result.description));
    }

    body.appendChild(header);

    const navigationOptions = {
      raceActive,
      language: result.language,
      onWikiNavigate: raceActive ? navigateWikirace : navigateNormalArticle
    };

    // Preserve Wikipedia's own clarification/ambiguity hatnotes (for example,
    // "This article is about the fruit. For the technology company, see Apple
    // Inc."). They let Wikipedia explain alternate meanings without GooWi
    // second-guessing Wikipedia's primary-topic choice.
    const hatnotes = buildHatnotes(result.html, result.language, navigationOptions);
    if (hatnotes) body.appendChild(hatnotes);

    const article = makeElement("article", "gp-article");

    // Use Wikipedia's designated representative image only. If Wikipedia does
    // not designate one for the page, leave the article image-free rather than
    // falling through to a secondary figure or interface icon.
    if (result.primaryImage) {
      const image = document.createElement("img");
      image.className = "gp-article-image";
      image.src = result.primaryImage.startsWith("//") ? `https:${result.primaryImage}` : result.primaryImage;
      image.alt = result.pageImageName ? result.pageImageName.replace(/^File:/i, "") : "";
      article.appendChild(image);
    }

    const readable = buildReadableArticle(result.html, result.language, {
      ...navigationOptions,
      isDisambiguation: isLikelyDisambiguation(result)
    });

    if (readable.childNodes.length) {
      article.appendChild(readable);
    } else {
      const fallback = makeElement("p", "gp-paragraph");
      if (result.excerpt) {
        const excerptDoc = new DOMParser().parseFromString(result.excerpt, "text/html");
        fallback.textContent = excerptDoc.body.textContent || result.excerpt;
      } else {
        fallback.textContent = "Wikipedia returned an article, but its preview could not be rendered.";
      }
      article.appendChild(fallback);
    }

    body.appendChild(article);

    const footer = makeElement("footer", "gp-footer");
    if (raceActive) {
      footer.appendChild(makeElement(
        "span",
        "gp-race-hint",
        "Wikirace mode: article links stay inside GooWi and count toward your race total."
      ));
    } else {
      const readMore = document.createElement("a");
      readMore.href = result.pageUrl;
      readMore.target = "_blank";
      readMore.rel = "noopener noreferrer";
      readMore.textContent = `Read the full article on ${result.language}.wikipedia.org →`;
      footer.appendChild(readMore);
    }
    body.appendChild(footer);
  }

  async function loadRandomArticle(panel, body, query, button) {
    if (!panel?.isConnected || !body || raceIsActive()) return;

    const serial = ++requestSerial;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "…";
    button.setAttribute("aria-busy", "true");

    try {
      const result = await browser.runtime.sendMessage({
        type: "googlepedia:random",
        language: getLanguage()
      });

      // A random lookup must never outlive the Google search it belongs to.
      if (serial !== requestSerial || query !== getQuery() || !panel.isConnected) return;
      if (!result?.found) return;

      raceState = null;
      currentResult = result;
      renderResult(body, result, query);
      updateRaceUi(panel);
      body.scrollTop = 0;
    } catch (error) {
      // Keep the current article in place if a random lookup fails.
    } finally {
      if (panel.isConnected) {
        button.disabled = false;
        button.textContent = originalText;
        button.removeAttribute("aria-busy");
      }
      updateRaceUi(panel);
    }
  }

  async function loadForQuery(query, force = false) {
    if (!query) {
      removePanel();
      lastQuery = null;
      currentResult = null;
      raceState = null;
      return;
    }

    if (!force && query === lastQuery) {
      return;
    }

    // On a new query, remove the previous article immediately, but do not show
    // a loading shell. If Wikipedia has no sufficiently relevant article, the
    // extension should leave Google's page completely alone. A forced refresh
    // reuses the existing shell so expanded/collapsed state is preserved.
    const existingPanel = document.getElementById(PANEL_ID);
    const existingBody = existingPanel?.querySelector(".gp-body");

    raceState = null;
    if (!force) {
      currentResult = null;
      removePanel();
    }

    lastQuery = query;
    const serial = ++requestSerial;

    try {
      const googleContext = await waitForGoogleCanonicalContext(query);
      if (serial !== requestSerial || query !== getQuery()) return;

      const result = await browser.runtime.sendMessage({
        type: "googlepedia:lookup",
        query,
        language: getLanguage(),
        googleContext
      });

      if (serial !== requestSerial || query !== getQuery()) return;

      if (!result?.found) {
        currentResult = null;
        removePanel();
        return;
      }

      currentResult = result;

      if (force && existingPanel?.isConnected && existingBody) {
        renderResult(existingBody, result, query);
        updateRaceUi(existingPanel);
        existingBody.scrollTop = 0;
        return;
      }

      const { panel, body } = makeShell(query);
      renderResult(body, result, query);
      updateRaceUi(panel);
    } catch (error) {
      if (serial !== requestSerial) return;
      currentResult = null;
      raceState = null;
      removePanel();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const panel = document.getElementById(PANEL_ID);
    if (!panel?.classList.contains("gp-expanded")) return;

    panel.classList.remove("gp-expanded");
    document.documentElement.classList.remove("googlepedia-reborn-overlay-open");

    const overlay = panel.querySelector(".gp-overlay-button");
    if (overlay) {
      overlay.textContent = "⛶";
      overlay.title = "Expand Wikipedia over Google";
      overlay.setAttribute("aria-label", "Expand Wikipedia over Google");
      overlay.setAttribute("aria-pressed", "false");
    }
  });

  function syncWithLocation() {
    const query = getQuery();
    if (query !== lastQuery) {
      loadForQuery(query);
    }
  }

  // Google updates search pages dynamically, so watch both DOM churn and URL changes.
  let observedUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== observedUrl) {
      observedUrl = location.href;
      syncWithLocation();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", syncWithLocation);
  setInterval(() => {
    if (location.href !== observedUrl) {
      observedUrl = location.href;
      syncWithLocation();
    }
  }, 1000);

  syncWithLocation();
})();
