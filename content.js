(() => {
  if (globalThis.__goowiContentLoaded) return;
  globalThis.__goowiContentLoaded = true;

  const PANEL_ID = "goowi-panel";
  const SURFACE = document.documentElement.dataset.goowiSurface || "page";
  const MAX_SELECTION_LENGTH = 75;

  function isNativeSidebarSurface() {
    return SURFACE === "native-sidebar";
  }

  function isReaderTabSurface() {
    return SURFACE === "reader-tab";
  }
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
  let selectionSession = null;

  function isGoogleSearchPage() {
    const host = location.hostname.toLowerCase();
    return (host === "google.com" || host === "www.google.com") && location.pathname === "/search";
  }

  function getQuery() {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }

  function getLanguage() {
    if (isGoogleSearchPage()) {
      const params = new URLSearchParams(location.search);
      const hl = params.get("hl");
      if (hl) return hl;
    }
    return document.documentElement.lang || navigator.language || "en";
  }

  function cleanSelectionText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function selectionLength(value) {
    return Array.from(String(value || "")).length;
  }

  function activeLookupQuery() {
    return selectionSession?.active ? selectionSession.currentQuery : getQuery();
  }

  function sourceQueryIsCurrent(query) {
    if (selectionSession?.active) {
      if (query !== selectionSession.currentQuery) return false;
      if (isGoogleSearchPage() && getQuery() !== selectionSession.googleQueryAtStart) return false;
      return true;
    }
    return query === getQuery();
  }

  function selectionModeActive() {
    return Boolean(selectionSession?.active);
  }

  const GOOGLE_GENERIC_HEADINGS = new Set([
    "ai overview", "overview", "description", "definition", "definition and origin",
    "origin", "people also ask", "people also search for", "images", "videos",
    "shopping", "news", "maps", "forums", "web results", "search results",
    "wikipedia", "ratings", "read now", "more results", "quick facts", "listen",
    "events", "books", "born", "died", "party", "spouse", "children", "parents",
    "siblings", "education", "awards", "works", "references", "see also"
  ]);

  // Google frequently renders an entity name and a short type/subtitle as
  // neighboring headings. The subtitle is useful evidence but must never become
  // the canonical Wikipedia topic by itself ("The Fab Four" / "Band").
  const GOOGLE_ENTITY_TYPE_LABELS = new Set([
    "band", "rock band", "musical group", "music group", "artist", "musician",
    "singer", "singer songwriter", "actor", "actress", "writer", "author",
    "writer and academic", "poet", "politician", "president", "emperor",
    "film", "movie", "tv series", "television series", "book", "novel",
    "album", "song", "company", "corporation", "organization", "organisation",
    "city", "town", "village", "country", "state", "province", "region",
    "software", "video game", "website", "school", "university"
  ]);

  // Broader vocabulary used only to recognize Google's short entity subtitle.
  // The subtitle is carried as a sense/disambiguation hint; it is never allowed
  // to become the canonical Wikipedia title by itself.
  const GOOGLE_ENTITY_TYPE_KEYWORDS = new Set([
    "academic", "activist", "actor", "actress", "album", "animal", "artist",
    "athlete", "author", "band", "book", "city", "company", "composer",
    "corporation", "country", "director", "emperor", "film", "footballer",
    "game", "group", "king", "musician", "novel", "organization",
    "organisation", "painter", "philosopher", "physicist", "player", "poet",
    "politician", "president", "producer", "province", "queen", "rapper",
    "region", "school", "scientist", "series", "singer", "song", "songwriter",
    "software", "species", "state", "town", "university", "village", "website",
    "writer"
  ]);

  const GOOGLE_RELATED_PAGE_PREFIXES = [
    "influences on", "influence of", "works of", "bibliography of",
    "legacy of", "history of", "list of", "timeline of", "discography of",
    "filmography of", "portrayal of", "reception of", "religious views of",
    "political views of", "personal life of", "early life of", "death of",
    "assassination of", "family of", "descendants of", "ancestry of",
    "cultural depictions of"
  ];

  function normalizeGoogleSignalText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      // Match Wikipedia/Google's spaced dotted initials to compact user input:
      // "J. R. R." -> "JRR", "J.F.K." -> "JFK", "U. S." -> "US".
      .replace(/\b(?:[A-Za-z]\.\s*)+[A-Za-z]\./g, (match) => match.replace(/[\s.]+/g, ""))
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

  function googleOrderedSubsequenceWithinSpan(needles, haystack, maxGap = 2, maxExtraSpan = 3) {
    if (!needles.length || !haystack.length) return false;
    let searchFrom = 0;
    let first = -1;
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
      if (first < 0) first = found;
      previous = found;
      searchFrom = found + 1;
    }

    return (previous - first + 1) <= (needles.length + maxExtraSpan);
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

  function titleTokensAreQuerySubset(query, title) {
    const querySet = new Set(googleSignalTokens(query));
    const titleTokens = googleSignalTokens(title);
    return titleTokens.length > 0 && titleTokens.every((token) => querySet.has(token));
  }

  function stripGoogleEntityTypeSuffix(value) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    const norm = normalizeGoogleSignalText(raw);
    if (!norm) return raw;

    const suffixes = [...GOOGLE_ENTITY_TYPE_LABELS].sort((a, b) => b.length - a.length);
    for (const suffix of suffixes) {
      if (norm === suffix) return raw;
      if (!norm.endsWith(` ${suffix}`)) continue;

      const normalizedStem = norm.slice(0, -(suffix.length + 1)).trim();
      if (!normalizedStem) continue;

      const rawWords = raw.split(/\s+/);
      const suffixWords = suffix.split(" ").length;
      if (rawWords.length > suffixWords) {
        return rawWords.slice(0, rawWords.length - suffixWords).join(" ").trim();
      }
    }
    return raw;
  }

  function looksLikeGoogleEntityType(value) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    if (!raw || raw.length > 110) return false;
    const norm = normalizeGoogleSignalText(raw);
    if (!norm ||
        GOOGLE_GENERIC_HEADINGS.has(norm) ||
        norm === "wikipedia" ||
        norm === "see results about") {
      return false;
    }

    const tokens = norm.split(" ").filter(Boolean);
    return tokens.some((token) => GOOGLE_ENTITY_TYPE_KEYWORDS.has(token));
  }

  function extractGoogleEntityType(element, titleValue = "") {
    if (!element) return "";

    const titleNorm = normalizeGoogleSignalText(titleValue);
    let node = element;

    for (let depth = 0; depth < 4 && node; depth += 1, node = node.parentElement) {
      if (node.closest?.(`#${PANEL_ID}`)) break;

      const lines = String(node.innerText || node.textContent || "")
        .split(/\n+/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 18);

      if (!lines.length) continue;

      let titleIndex = lines.findIndex(
        (line) => normalizeGoogleSignalText(line) === titleNorm
      );
      if (titleIndex < 0) {
        titleIndex = lines.findIndex((line) => {
          const norm = normalizeGoogleSignalText(line);
          return titleNorm && (norm.startsWith(`${titleNorm} `) || norm.endsWith(` ${titleNorm}`));
        });
      }

      const ordered = titleIndex >= 0
        ? [...lines.slice(titleIndex + 1, titleIndex + 5), ...lines.slice(0, titleIndex)]
        : lines;

      for (const line of ordered) {
        const norm = normalizeGoogleSignalText(line);
        if (!norm || norm === titleNorm || GOOGLE_GENERIC_HEADINGS.has(norm)) continue;
        if (looksLikeGoogleEntityType(line)) return line.slice(0, 110);
      }
    }

    return "";
  }

  function googleRelationWordRequested(query, prefix) {
    const queryTokens = googleSignalTokens(query).map((token) => token.replace(/s$/i, ""));
    const relationToken = googleSignalTokens(prefix)[0]?.replace(/s$/i, "");
    return Boolean(relationToken && queryTokens.includes(relationToken));
  }

  function googleRelatedPagePenalty(query, title) {
    const titleNorm = normalizeGoogleSignalText(title);
    for (const prefix of GOOGLE_RELATED_PAGE_PREFIXES) {
      if (!titleNorm.startsWith(`${prefix} `) && titleNorm !== prefix) continue;
      return googleRelationWordRequested(query, prefix) ? 0 : 65;
    }
    return 0;
  }

  function googleCanonicalScore(query, title, evidence, source, baseScore, entityType = "") {
    const queryNorm = normalizeGoogleSignalText(query);
    const titleNorm = normalizeGoogleSignalText(title);
    if (!queryNorm || !titleNorm) return 0;
    if (queryNorm === titleNorm && !entityType) return 0;
    if (GOOGLE_GENERIC_HEADINGS.has(titleNorm)) return 0;
    if (GOOGLE_ENTITY_TYPE_LABELS.has(titleNorm)) return 0;
    if (titleNorm.length < 2 || titleNorm.length > 160) return 0;

    const queryTokens = googleSignalTokens(query);
    const titleTokens = googleSignalTokens(title);
    const evidenceTokens = googleSignalTokens(evidence);
    if (!queryTokens.length || !titleTokens.length) return 0;

    const rawCompact = queryNorm.replace(/\s+/g, "");
    const titleAcronyms = googleTopicAcronymVariants(title);
    const acronymMatch = rawCompact.length >= 2 &&
      rawCompact.length <= 12 &&
      titleAcronyms.has(rawCompact);

    // "See results about" is Google's explicit entity-disambiguation UI. Use it
    // only when the chip entity is already represented by the user's own query.
    // This lets "The Fab Four Beatles" use "The Beatles" without forcing a broad
    // query such as "Mercury" into an arbitrary chip.
    if (source === "google-see-results-about") {
      if (queryTokens.length < 2 || !titleTokensAreQuerySubset(query, title)) return 0;
      baseScore += 90;
    }

    const titleCoverage = googleTokenCoverage(queryTokens, titleTokens);
    const titleInsideQueryCoverage = googleTokenCoverage(titleTokens, queryTokens);
    const evidenceCoverage = googleTokenCoverage(queryTokens, evidenceTokens);
    const tightOrderedEvidence = googleOrderedSubsequenceWithinSpan(
      queryTokens, evidenceTokens, 2, 3
    );

    // The generic large-heading fallback normally needs direct lexical
    // relationship to the query. A zero-overlap alias is allowed only when the
    // query is a longer name, Google supplies a genuine entity-type subtitle,
    // and every query token occurs tightly and in order in bounded entity
    // evidence. This is the formal-name path for cases like
    // "Gaius Caesar Augustus Germanicus" -> "Caligula".
    const strongZeroOverlapEntityAlias =
      source === "google-entity-heading" &&
      titleCoverage === 0 &&
      titleInsideQueryCoverage === 0 &&
      queryTokens.length >= 3 &&
      looksLikeGoogleEntityType(entityType) &&
      evidenceCoverage === 1 &&
      tightOrderedEvidence;

    if (source === "google-entity-heading" &&
        !acronymMatch &&
        titleCoverage === 0 &&
        titleInsideQueryCoverage === 0 &&
        !strongZeroOverlapEntityAlias) {
      return 0;
    }

    let score = baseScore;
    if (queryNorm === titleNorm && entityType) score += 35;
    if (entityType && looksLikeGoogleEntityType(entityType)) score += 8;
    if (acronymMatch) score += 45;
    score += titleCoverage * 30;
    score += titleInsideQueryCoverage * 25;
    score += evidenceCoverage * 25;

    if (googleOrderedSubsequence(queryTokens, evidenceTokens, 2)) score += 25;
    if (normalizeGoogleSignalText(evidence).includes(queryNorm)) score += 10;
    if (titleCoverage === 1) score += 10;

    if (source === "google-wikipedia-result") {
      score -= googleRelatedPagePenalty(query, title);
    }

    return score;
  }

  function wikipediaTitleFromGoogleHref(href) {
    try {
      let url = new URL(String(href || ""), location.href);

      // Some Google result layouts wrap outbound links in /url redirects. The
      // destination is still visible in the page markup; unwrap it locally so
      // the same conservative Wikipedia-result signal works in either layout.
      if (/(?:^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname === "/url") {
        const nested = url.searchParams.get("q") || url.searchParams.get("url");
        if (nested) url = new URL(nested, location.href);
      }

      if (!/(?:^|\.)wikipedia\.org$/i.test(url.hostname)) return "";
      const match = url.pathname.match(/^\/wiki\/(.+)$/);
      if (!match) return "";
      const title = decodeURIComponent(match[1])
        .replace(/_/g, " ")
        .split("#")[0]
        .trim();
      if (!title || /^(?:File|Special|Help|Template|Category|Portal|Wikipedia|Talk):/i.test(title)) {
        return "";
      }
      return title;
    } catch {
      return "";
    }
  }

  function sameResultWikipediaCard(heading) {
    if (!heading) return null;

    const headingText = String(heading.innerText || heading.textContent || "")
      .replace(/\s+/g, " ").trim();
    const headingNamesWikipedia = /\s(?:[-–—|]\s*)?Wikipedia$/i.test(headingText);

    let node = heading.parentElement;
    for (let depth = 0; depth < 5 && node; depth += 1, node = node.parentElement) {
      if (node.closest?.(`#${PANEL_ID}`)) break;

      const cardText = String(node.innerText || node.textContent || "")
        .replace(/\s+/g, " ").trim();
      if (!cardText) continue;
      if (cardText.length > 1800) break;

      // Crossing into a container with another result heading means we no
      // longer have reliable same-card attribution. Do not let one result's
      // Wikipedia label leak onto a neighboring heading.
      const peerHeadings = [...node.querySelectorAll("h3, [role='heading']")]
        .filter((candidate) =>
          candidate !== heading &&
          !candidate.contains(heading) &&
          !heading.contains(candidate) &&
          isVisibleGoogleElement(candidate)
        );
      if (peerHeadings.length) break;

      if (headingNamesWikipedia) return node;

      const attribution = [...node.querySelectorAll("cite, span, small, div")]
        .find((candidate) => {
          if (candidate === heading || candidate.contains(heading) || heading.contains(candidate)) {
            return false;
          }
          if (!isVisibleGoogleElement(candidate)) return false;

          const raw = String(candidate.innerText || candidate.textContent || "")
            .replace(/\s+/g, " ").trim();
          if (!raw || raw.length > 140) return false;
          const norm = normalizeGoogleSignalText(raw);
          return norm === "wikipedia" ||
            /^(?:https\s+)?(?:[a-z]{2,3}\s+)?wikipedia\s+org\b/.test(norm) ||
            /^wikipedia\s+(?:https\s+)?(?:[a-z]{2,3}\s+)?wikipedia\s+org\b/.test(norm);
        });

      if (attribution) return node;
    }

    return null;
  }

  function extractGoogleCanonicalContexts(query) {
    if (!query || !document.body) return null;

    const candidateMap = new Map();

    function addRawCandidate(titleValue, evidenceValue, source, baseScore, entityTypeValue = "") {
      const title = String(titleValue || "").replace(/\s+/g, " ").trim().slice(0, 160);
      const evidence = String(evidenceValue || "").replace(/\s+/g, " ").trim().slice(0, 2400);
      const entityType = String(entityTypeValue || "").replace(/\s+/g, " ").trim().slice(0, 110);
      if (!title) return;

      const titleKey = normalizeGoogleSignalText(title);
      if (!titleKey || GOOGLE_GENERIC_HEADINGS.has(titleKey) || GOOGLE_ENTITY_TYPE_LABELS.has(titleKey)) return;
      const key = `${titleKey}::${source}`;

      const score = googleCanonicalScore(query, title, evidence, source, baseScore, entityType);
      if (score < 75) return;

      const candidate = {
        title,
        entityType: looksLikeGoogleEntityType(entityType) ? entityType : "",
        evidence,
        source,
        confidence: Math.min(100, Math.round(score))
      };
      const prior = candidateMap.get(key);
      if (!prior ||
          candidate.confidence > prior.confidence ||
          (!prior.entityType && candidate.entityType && candidate.confidence >= prior.confidence - 4)) {
        candidateMap.set(key, candidate);
      }
    }

    function addCandidate(element, source, baseScore) {
      if (!isVisibleGoogleElement(element)) return;

      const nestedHeading = element.matches("h1, h2, h3, [role='heading']")
        ? element
        : element.querySelector("h1, h2, h3, [role='heading']");
      const rawTitle = String(
        element.getAttribute?.("data-entityname") ||
        nestedHeading?.innerText || nestedHeading?.textContent ||
        element.innerText || element.textContent || ""
      ).replace(/\s+/g, " ").trim();

      if (!rawTitle) return;
      const title = rawTitle.split(/\n/)[0].trim().slice(0, 160);
      const titleElement = nestedHeading || element;
      const evidence = boundedGoogleEvidence(titleElement);
      const entityType = extractGoogleEntityType(titleElement, title);
      addRawCandidate(title, evidence, source, baseScore, entityType);
    }

    // Extract Google's explicit "See results about" chip directly instead of
    // inferring it from nearby text. This keeps the entity name separate from
    // its subtitle/type and makes the signal reliable across card layouts.
    const seeResultsLabels = [...document.querySelectorAll("div, span, p")]
      .filter((element) =>
        isVisibleGoogleElement(element) &&
        normalizeGoogleSignalText(element.innerText || element.textContent || "") === "see results about"
      );

    for (const label of seeResultsLabels) {
      let container = label.parentElement;
      for (let depth = 0; depth < 5 && container; depth += 1, container = container.parentElement) {
        if (container.closest(`#${PANEL_ID}`)) break;
        const containerText = (container.innerText || container.textContent || "").trim();
        if (!containerText || containerText.length > 700) continue;

        const links = [...container.querySelectorAll("a[href], [role='link']")]
          .filter((element) => isVisibleGoogleElement(element));

        let found = false;
        for (const link of links) {
          const lines = String(link.innerText || link.textContent || "")
            .split(/\n+/)
            .map((line) => line.replace(/\s+/g, " ").trim())
            .filter(Boolean);

          for (const rawLine of lines) {
            const stripped = stripGoogleEntityTypeSuffix(rawLine);
            const norm = normalizeGoogleSignalText(stripped);
            if (!norm ||
                norm === "see results about" ||
                GOOGLE_GENERIC_HEADINGS.has(norm) ||
                GOOGLE_ENTITY_TYPE_LABELS.has(norm)) {
              continue;
            }

            const entityType = extractGoogleEntityType(link, stripped) ||
              (looksLikeGoogleEntityType(rawLine.replace(stripped, "").trim())
                ? rawLine.replace(stripped, "").trim()
                : "");
            addRawCandidate(
              stripped,
              boundedGoogleEvidence(container),
              "google-see-results-about",
              96,
              entityType
            );
            found = true;
            break;
          }
          if (found) break;
        }
        if (found) break;
      }
    }

    // Google's explicit entity/knowledge structures remain the preferred DOM
    // signal when available.
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
        addCandidate(element, "google-structured-entity", 70);
      }
    }

    // A visible Wikipedia result selected by Google is a useful high-confidence
    // fallback for aliases that are difficult to validate lexically, such as
    // "Abe Lincoln" -> "Abraham Lincoln" or "JFK" -> "John F. Kennedy".
    // This is still only a context signal: the background matcher validates it
    // and Wikipedia remains the content source.
    const wikiLinks = [...document.querySelectorAll("a[href]")]
      .filter((link) => isVisibleGoogleElement(link) && wikipediaTitleFromGoogleHref(link.href))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .slice(0, 5);

    wikiLinks.forEach((link, index) => {
      const urlTitle = wikipediaTitleFromGoogleHref(link.href);
      const heading = link.querySelector("h3, [role='heading']") ||
        link.closest("div")?.querySelector("h3, [role='heading']");
      const displayTitle = String(heading?.innerText || heading?.textContent || urlTitle)
        .replace(/\s+/g, " ").trim();
      const canonicalTitle = urlTitle || displayTitle;
      const titleElement = heading || link;
      const evidence = boundedGoogleEvidence(titleElement);
      const entityType = extractGoogleEntityType(titleElement, canonicalTitle);
      addRawCandidate(
        canonicalTitle,
        evidence,
        "google-wikipedia-result",
        78 - (index * 3),
        entityType
      );
    });

    // Some Google layouts display a Wikipedia result card while wrapping the
    // outbound link in markup that does not expose the final wikipedia.org URL
    // directly. Fall back only when Wikipedia attribution is proven inside the
    // same bounded result card. A broad ancestor containing neighboring results
    // is deliberately rejected so one result cannot inherit another's source.
    for (const heading of document.querySelectorAll("h3, [role='heading']")) {
      if (!isVisibleGoogleElement(heading) || heading.closest(`#${PANEL_ID}`)) continue;
      const title = String(heading.innerText || heading.textContent || "")
        .replace(/\s+/g, " ").trim()
        .replace(/\s+(?:[-–—|]\s*)?Wikipedia$/i, "")
        .trim();
      if (!title || title.length > 160) continue;

      const resultCard = sameResultWikipediaCard(heading);
      if (!resultCard) continue;

      const evidence = String(resultCard.innerText || resultCard.textContent || "")
        .replace(/\s+/g, " ").trim().slice(0, 1800);
      addRawCandidate(
        title,
        evidence,
        "google-wikipedia-result",
        76,
        ""
      );
    }

    // Fallback for redesigned result pages. Restrict candidates to prominent
    // upper-page headings and reject generic interface/section labels.
    for (const element of document.querySelectorAll(
      "h1, h2, [role='heading'][aria-level='1'], [role='heading'][aria-level='2']"
    )) {
      if (!isVisibleGoogleElement(element) || element.closest("a[href]")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.top > Math.max(1000, window.innerHeight * 1.15)) continue;
      const fontSize = parseFloat(getComputedStyle(element).fontSize || "0");
      if (fontSize && fontSize < 18) continue;
      addCandidate(element, "google-entity-heading", 62);
    }

    const candidates = [...candidateMap.values()]
      .sort((a, b) => {
        const sourceDelta = googleContextSourceRank(b) - googleContextSourceRank(a);
        if (sourceDelta) return sourceDelta;
        return Number(b.confidence || 0) - Number(a.confidence || 0);
      });
    return candidates.slice(0, 8);
  }

  function extractGoogleCanonicalContext(query) {
    return extractGoogleCanonicalContexts(query)[0] || null;
  }

  function googleContextSourceRank(context) {
    if (!context) return 0;
    if (context.source === "google-see-results-about") return 5;
    if (context.source === "google-structured-entity") return 4;
    if (context.source === "google-entity-heading" && context.entityType) return 4;
    if (context.source === "google-wikipedia-result") return 3;
    if (context.source === "google-entity-heading") return 2;
    return 1;
  }

  function mergeGoogleContexts(targetMap, candidates) {
    for (const candidate of candidates || []) {
      if (!candidate?.title || !candidate?.source) continue;
      const key = `${normalizeGoogleSignalText(candidate.title)}::${candidate.source}`;
      const prior = targetMap.get(key);
      if (!prior ||
          Number(candidate.confidence || 0) > Number(prior.confidence || 0) ||
          (!prior.entityType && candidate.entityType)) {
        targetMap.set(key, candidate);
      }
    }
  }

  function rankedGoogleContexts(contextMap) {
    return [...contextMap.values()]
      .sort((a, b) => {
        const sourceDelta = googleContextSourceRank(b) - googleContextSourceRank(a);
        if (sourceDelta) return sourceDelta;
        if (Boolean(b.entityType) !== Boolean(a.entityType)) return b.entityType ? 1 : -1;
        return Number(b.confidence || 0) - Number(a.confidence || 0);
      })
      .slice(0, 6);
  }

  function contextsContainIndependentSupport(contexts) {
    const byTitle = new Map();
    for (const context of contexts || []) {
      const key = normalizeGoogleSignalText(context.title);
      if (!key) continue;
      if (!byTitle.has(key)) byTitle.set(key, new Set());
      byTitle.get(key).add(context.source);
    }
    return [...byTitle.values()].some((sources) => sources.size >= 2);
  }

  function waitForGoogleCanonicalContexts(query, timeoutMs = 1750) {
    return new Promise((resolve) => {
      let settled = false;
      const collected = new Map();
      const startedAt = Date.now();

      const finish = () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearInterval(poller);
        clearTimeout(hardTimer);
        resolve(rankedGoogleContexts(collected));
      };

      const consider = () => {
        if (query !== getQuery()) {
          collected.clear();
          finish();
          return;
        }

        mergeGoogleContexts(collected, extractGoogleCanonicalContexts(query));
        const contexts = rankedGoogleContexts(collected);
        const elapsed = Date.now() - startedAt;

        if (contexts.some((context) => context.source === "google-see-results-about") &&
            elapsed >= 450) {
          finish();
          return;
        }
        if (contextsContainIndependentSupport(contexts) && elapsed >= 900) {
          finish();
          return;
        }
        if (contexts.length >= 3 && elapsed >= 1150) finish();
      };

      const observer = new MutationObserver(consider);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      const poller = setInterval(consider, 100);
      const hardTimer = setTimeout(() => {
        consider();
        finish();
      }, timeoutMs);

      consider();
    });
  }

  function waitForGoogleCanonicalContext(query, timeoutMs = 1750) {
    return waitForGoogleCanonicalContexts(query, timeoutMs)
      .then((contexts) => contexts[0] || null);
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
    const list = makeElement(tag, "goowi-list");
    let itemCount = 0;

    for (const sourceItem of sourceList.children) {
      if (sourceItem.tagName?.toLowerCase() !== "li") continue;
      if (itemCount >= remainingItems) break;

      const item = makeElement("li", "goowi-list-item");

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

    const container = makeElement("div", "goowi-hatnotes");
    let count = 0;

    for (const sourceNote of root.querySelectorAll(".hatnote")) {
      if (count >= 4) break;
      if (sourceNote.parentElement?.closest(".hatnote")) continue;
      if (isInsideArticleChrome(sourceNote)) continue;

      const note = makeElement("div", "goowi-hatnote");
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
            ? "goowi-section-heading"
            : "goowi-section-heading goowi-subsection-heading";
          output.appendChild(makeElement("h3", headingClass, headingText));
          if (tag === "h2") sectionCount += 1;
        }
      }
    }

    return output;
  }

  function renderParagraph(sourceParagraph, language, options = {}) {
    const p = makeElement("p", "goowi-paragraph");

    for (const child of sourceParagraph.childNodes) {
      appendSanitizedNode(p, child, options);
    }

    return p;
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
    document.documentElement.classList.remove(
      "goowi-visible",
      "goowi-overlay-open"
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

    const bar = panel.querySelector(".goowi-racebar");
    const raceButton = panel.querySelector(".goowi-race-button");
    const randomButton = panel.querySelector(".goowi-random-button");
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
    const label = makeElement("strong", "goowi-race-label", "WIKIRACE");
    const message = makeElement("span", "goowi-race-message");
    const action = makeElement("button", "goowi-race-action");
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

      const newRace = makeElement("button", "goowi-race-action", "New race");
      newRace.type = "button";
      newRace.title = "Start a new Wikirace from this article";
      newRace.addEventListener("click", () => startWikirace(panel, panel.querySelector(".goowi-body"), activeLookupQuery()));

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
      action.addEventListener("click", () => startWikirace(panel, panel.querySelector(".goowi-body"), activeLookupQuery()));
      raceButton.setAttribute("aria-pressed", "false");
      raceButton.title = "Start a new Wikirace from this article";
      raceButton.setAttribute("aria-label", raceButton.title);
      randomButton.disabled = false;
    }

    bar.append(label, message, action);
  }

  function cancelWikirace(panel) {
    raceState = null;
    panel?.classList.remove("goowi-race-loading");
    const body = panel?.querySelector(".goowi-body");
    if (body && currentResult?.found) {
      renderResult(body, currentResult, activeLookupQuery());
    }
    updateRaceUi(panel);
  }

  async function startWikirace(panel, body, query) {
    if (!panel?.isConnected || !body || !currentResult?.found) return;

    const raceButton = panel.querySelector(".goowi-race-button");
    if (raceButton) {
      raceButton.disabled = true;
      raceButton.textContent = "…";
      raceButton.setAttribute("aria-busy", "true");
    }

    const serial = ++requestSerial;
    const startTitle = currentResult.title;

    try {
      const target = await browser.runtime.sendMessage({
        type: "goowi:wikirace-target",
        language: currentResult.language || getLanguage(),
        excludeTitle: startTitle
      });

      if (serial !== requestSerial || !sourceQueryIsCurrent(query) || !panel.isConnected) return;
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
    const body = panel?.querySelector(".goowi-body");
    if (!panel?.isConnected || !body || raceIsEngaged()) return;

    if (normalizeRaceTitle(title) === normalizeRaceTitle(currentResult?.title)) {
      return;
    }

    const serial = ++requestSerial;
    const query = activeLookupQuery();

    try {
      const result = await browser.runtime.sendMessage({
        type: "goowi:page",
        title,
        language: currentResult?.language || getLanguage()
      });

      // Navigation inside GooWi belongs to the Google query that was visible when
      // the link was clicked. A later Google search must always win the race.
      if (serial !== requestSerial || !sourceQueryIsCurrent(query) || !panel.isConnected) {
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
    const body = panel?.querySelector(".goowi-body");
    if (!panel?.isConnected || !body || !raceIsActive() || raceState.loading) return;

    if (normalizeRaceTitle(title) === normalizeRaceTitle(currentResult?.title)) {
      return;
    }

    const state = raceState;
    state.loading = true;
    panel.classList.add("goowi-race-loading");
    updateRaceUi(panel);
    const serial = ++requestSerial;
    const query = activeLookupQuery();

    try {
      const result = await browser.runtime.sendMessage({
        type: "goowi:page",
        title,
        language: currentResult?.language || getLanguage()
      });

      if (serial !== requestSerial || !sourceQueryIsCurrent(query) || raceState !== state || !panel.isConnected) {
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
      panel?.classList.remove("goowi-race-loading");
    }
  }

  function returnToSource() {
    raceState = null;

    if (selectionModeActive()) {
      if (isGoogleSearchPage()) {
        const googleQuery = getQuery();
        selectionSession = null;
        currentResult = null;
        lastQuery = null;
        removePanel();
        loadForQuery(googleQuery);
        return;
      }

      const rootQuery = selectionSession?.rootQuery || "";
      if (rootQuery) {
        loadForSelection(rootQuery, { preserveRoot: true });
      }
      return;
    }

    loadForQuery(getQuery(), true);
  }

  function makeShell(query) {
    removePanel();

    const panel = makeElement("aside", "goowi-panel");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "GooWi Wikipedia reader");
    if (selectionModeActive()) panel.classList.add("goowi-selection-mode");

    const toolbar = makeElement("div", "goowi-toolbar");
    const brandGroup = makeElement("div", "goowi-brand-group");
    const brand = makeElement("a", "goowi-brand", "WIKIPEDIA");
    const wikiLanguage = String(getLanguage() || "en").toLowerCase().split("-")[0] || "en";
    brand.href = `https://${wikiLanguage}.wikipedia.org/wiki/Main_Page`;
    brand.target = "_blank";
    brand.rel = "noopener noreferrer";
    brand.title = "Open Wikipedia main page";
    brand.setAttribute("aria-label", "Open Wikipedia main page");
    const via = makeElement("a", "goowi-brand-via", "via GooWi");
    via.href = "https://github.com/oliversudduth/GooWi";
    via.target = "_blank";
    via.rel = "noopener noreferrer";
    via.title = "Open GooWi website";
    via.setAttribute("aria-label", "Open GooWi website");
    brandGroup.append(brand, via);

    const donate = makeElement("a", "goowi-icon-button goowi-donate-button", "♡");
    donate.href = "https://donate.wikimedia.org";
    donate.target = "_blank";
    donate.rel = "noopener noreferrer";
    donate.title = "Donate to Wikimedia";
    donate.setAttribute("aria-label", "Donate to Wikimedia");

    const controls = makeElement("div", "goowi-controls");

    const refresh = makeElement("button", "goowi-icon-button", "↻");
    refresh.type = "button";
    refresh.title = selectionModeActive()
      ? (isGoogleSearchPage()
          ? "Return to Wikipedia article for this Google search"
          : "Return to the first selection opened in GooWi")
      : "Return to Wikipedia article for this Google search";
    refresh.setAttribute("aria-label", refresh.title);
    refresh.addEventListener("click", returnToSource);

    const random = makeElement("button", "goowi-icon-button goowi-random-button", "⚄");
    random.type = "button";
    random.title = "Random Wikipedia article";
    random.setAttribute("aria-label", "Random Wikipedia article");
    random.addEventListener("click", () => loadRandomArticle(panel, body, activeLookupQuery(), random));

    const race = makeElement("button", "goowi-icon-button goowi-race-button", "⚑");
    race.type = "button";
    race.title = "Start Wikirace — reach a random article in ten clicks";
    race.setAttribute("aria-label", race.title);
    race.setAttribute("aria-pressed", "false");
    race.addEventListener("click", () => {
      if (raceIsEngaged()) {
        cancelWikirace(panel);
      } else {
        startWikirace(panel, body, activeLookupQuery());
      }
    });

    const overlay = makeElement("button", "goowi-icon-button goowi-overlay-button", "⛶");
    overlay.type = "button";
    const collapsedContext = selectionModeActive() ? "this page" : "Google";

    const collapse = makeElement("button", "goowi-icon-button", "›");
    collapse.type = "button";
    collapse.setAttribute("aria-expanded", "true");

    function setOverlay(expanded) {
      if (expanded) {
        panel.classList.remove("goowi-collapsed");
        collapse.textContent = "›";
        collapse.title = "Collapse Wikipedia panel";
        collapse.setAttribute("aria-expanded", "true");
      }

      panel.classList.toggle("goowi-expanded", expanded);
      document.documentElement.classList.toggle("goowi-overlay-open", expanded);
      overlay.textContent = expanded ? "⤡" : "⛶";
      overlay.title = expanded
        ? "Restore Wikipedia side panel"
        : `Expand Wikipedia over ${collapsedContext}`;
      overlay.setAttribute("aria-label", overlay.title);
      overlay.setAttribute("aria-pressed", expanded ? "true" : "false");
    }

    if (isNativeSidebarSurface()) {
      overlay.title = "Open full GooWi reader in a new tab";
      overlay.setAttribute("aria-label", overlay.title);
      overlay.setAttribute("aria-pressed", "false");
      overlay.addEventListener("click", () => {
        browser.runtime.sendMessage({
          type: "goowi:open-reader-tab",
          query: currentResult?.title || activeLookupQuery(),
          language: currentResult?.language || getLanguage()
        }).catch(() => {});
      });

      collapse.title = "Close GooWi sidebar";
      collapse.setAttribute("aria-label", collapse.title);
      collapse.addEventListener("click", () => {
        browser.runtime.sendMessage({ type: "goowi:close-native-sidebar" }).catch(() => {});
      });
    } else if (isReaderTabSurface()) {
      overlay.textContent = "⤡";
      overlay.title = "Full GooWi reader";
      overlay.setAttribute("aria-label", overlay.title);
      overlay.disabled = true;

      collapse.textContent = "×";
      collapse.title = "Close GooWi reader tab";
      collapse.setAttribute("aria-label", collapse.title);
      collapse.addEventListener("click", () => {
        browser.runtime.sendMessage({ type: "goowi:close-reader-tab" }).catch(() => {});
      });
    } else {
      overlay.title = `Expand Wikipedia over ${collapsedContext}`;
      overlay.setAttribute("aria-label", overlay.title);
      overlay.setAttribute("aria-pressed", "false");
      overlay.addEventListener("click", () => {
        setOverlay(!panel.classList.contains("goowi-expanded"));
      });

      collapse.title = "Collapse Wikipedia panel";
      collapse.setAttribute("aria-label", collapse.title);
      collapse.addEventListener("click", () => {
        if (panel.classList.contains("goowi-expanded")) {
          setOverlay(false);
        }
        const collapsed = panel.classList.toggle("goowi-collapsed");
        collapse.textContent = collapsed ? "‹" : "›";
        collapse.title = collapsed ? "Expand Wikipedia panel" : "Collapse Wikipedia panel";
        collapse.setAttribute("aria-label", collapse.title);
        collapse.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }

    controls.append(race, random, refresh, overlay, collapse);
    toolbar.append(brandGroup, donate, controls);

    const racebar = makeElement("div", "goowi-racebar");
    racebar.hidden = true;
    racebar.setAttribute("aria-live", "polite");

    const body = makeElement("div", "goowi-body");
    const loading = makeElement("div", "goowi-loading", `Looking up “${query}”…`);
    body.appendChild(loading);

    panel.append(toolbar, racebar, body);
    document.body.appendChild(panel);
    document.documentElement.classList.add("goowi-visible");
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
      const empty = makeElement("div", "goowi-empty");
      empty.appendChild(makeElement("strong", "", "No Wikipedia match found."));
      empty.appendChild(makeElement("p", "", `Wikipedia did not return a likely article for “${query}”.`));
      if (result?.error) {
        empty.appendChild(makeElement("p", "goowi-error-detail", result.error));
      }
      body.appendChild(empty);
      return;
    }

    const raceActive = raceIsEngaged();
    const header = makeElement("header", "goowi-article-header");
    const title = raceActive ? document.createElement("span") : document.createElement("a");
    title.className = "goowi-title";
    title.textContent = result.title;
    if (!raceActive) {
      title.href = result.pageUrl;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    header.appendChild(title);

    if (result.description) {
      header.appendChild(makeElement("div", "goowi-description", result.description));
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

    const article = makeElement("article", "goowi-article");

    // Use Wikipedia's designated representative image only. If Wikipedia does
    // not designate one for the page, leave the article image-free rather than
    // falling through to a secondary figure or interface icon.
    if (result.primaryImage) {
      const image = document.createElement("img");
      image.className = "goowi-article-image";
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
      const fallback = makeElement("p", "goowi-paragraph");
      if (result.excerpt) {
        const excerptDoc = new DOMParser().parseFromString(result.excerpt, "text/html");
        fallback.textContent = excerptDoc.body.textContent || result.excerpt;
      } else {
        fallback.textContent = "Wikipedia returned an article, but its preview could not be rendered.";
      }
      article.appendChild(fallback);
    }

    body.appendChild(article);

    const footer = makeElement("footer", "goowi-footer");
    if (raceActive) {
      footer.appendChild(makeElement(
        "span",
        "goowi-race-hint",
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

  function renderSelectionNotice(body, message, detail = "") {
    body.replaceChildren();
    const empty = makeElement("div", "goowi-empty");
    empty.appendChild(makeElement("strong", "", message));
    if (detail) empty.appendChild(makeElement("p", "goowi-error-detail", detail));
    body.appendChild(empty);
  }

  async function loadForSelection(rawSelection, options = {}) {
    const query = cleanSelectionText(rawSelection);
    if (!query) return;

    const googleQueryAtStart = isGoogleSearchPage() ? getQuery() : "";
    const existingSessionIsCurrent = Boolean(
      selectionSession?.active &&
      (!isGoogleSearchPage() || selectionSession.googleQueryAtStart === googleQueryAtStart)
    );
    const rootQuery = options.preserveRoot && selectionSession?.rootQuery
      ? selectionSession.rootQuery
      : (existingSessionIsCurrent ? selectionSession.rootQuery : query);

    selectionSession = {
      active: true,
      rootQuery,
      currentQuery: query,
      googleQueryAtStart
    };

    raceState = null;
    currentResult = null;
    const serial = ++requestSerial;
    const { panel, body } = makeShell(query);

    if (selectionLength(query) > MAX_SELECTION_LENGTH) {
      renderSelectionNotice(body, "Sheesh, keep it brief 🫠");
      return;
    }

    try {
      const result = await browser.runtime.sendMessage({
        type: "goowi:lookup",
        query,
        language: getLanguage(),
        googleContexts: [],
        googleContext: null
      });

      if (serial !== requestSerial || !sourceQueryIsCurrent(query) || !panel.isConnected) return;

      if (!result?.found) {
        currentResult = null;
        renderSelectionNotice(body, "No confident Wikipedia match found.");
        return;
      }

      currentResult = result;
      renderResult(body, result, query);
      updateRaceUi(panel);
      body.scrollTop = 0;
    } catch (error) {
      if (serial !== requestSerial || !panel.isConnected) return;
      currentResult = null;
      renderSelectionNotice(
        body,
        "No confident Wikipedia match found.",
        error instanceof Error ? error.message : String(error)
      );
    }
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
        type: "goowi:random",
        language: getLanguage()
      });

      // A random lookup must never outlive the Google search it belongs to.
      if (serial !== requestSerial || !sourceQueryIsCurrent(query) || !panel.isConnected) return;
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
    selectionSession = null;

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
    const existingBody = existingPanel?.querySelector(".goowi-body");

    raceState = null;
    if (!force) {
      currentResult = null;
      removePanel();
    }

    lastQuery = query;
    const serial = ++requestSerial;

    try {
      const googleContexts = await waitForGoogleCanonicalContexts(query);
      if (serial !== requestSerial || query !== getQuery()) return;

      const result = await browser.runtime.sendMessage({
        type: "goowi:lookup",
        query,
        language: getLanguage(),
        googleContexts,
        googleContext: googleContexts[0] || null
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
    if (!panel?.classList.contains("goowi-expanded")) return;

    panel.classList.remove("goowi-expanded");
    document.documentElement.classList.remove("goowi-overlay-open");

    const overlay = panel.querySelector(".goowi-overlay-button");
    if (overlay) {
      overlay.textContent = "⛶";
      overlay.title = selectionModeActive() ? "Expand Wikipedia over this page" : "Expand Wikipedia over Google";
      overlay.setAttribute("aria-label", overlay.title);
      overlay.setAttribute("aria-pressed", "false");
    }
  });

  function syncWithLocation() {
    if (!isGoogleSearchPage()) return;

    const query = getQuery();

    if (selectionModeActive()) {
      if (query !== selectionSession.googleQueryAtStart) {
        selectionSession = null;
        lastQuery = null;
        currentResult = null;
        raceState = null;
        removePanel();
        loadForQuery(query);
      }
      return;
    }

    if (query !== lastQuery) {
      loadForQuery(query);
    }
  }

  function receiveNativeSidebarSelection(rawSelection) {
    const query = cleanSelectionText(rawSelection);
    if (!query) return;
    if (selectionSession?.active && selectionSession.currentQuery === query) return;
    loadForSelection(query);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "goowi:view-selection") {
      loadForSelection(message.selection);
      return undefined;
    }

    if (message?.type === "goowi:native-sidebar-selection" && isNativeSidebarSurface()) {
      receiveNativeSidebarSelection(message.selection);
      return undefined;
    }

    return undefined;
  });

  if (isNativeSidebarSurface()) {
    browser.runtime.sendMessage({ type: "goowi:get-native-sidebar-selection" })
      .then((state) => {
        if (state?.selection) receiveNativeSidebarSelection(state.selection);
      })
      .catch(() => {});
  }

  if (isReaderTabSurface()) {
    const params = new URLSearchParams(location.search);
    const query = cleanSelectionText(params.get("query") || "");
    if (query) loadForSelection(query);
  }

  if (isGoogleSearchPage()) {
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
  }
})();
