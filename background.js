const EXTENSION_VERSION = browser.runtime.getManifest().version;
const API_USER_AGENT = `GooWi/${EXTENSION_VERSION} (Firefox extension; https://github.com/oliversudduth/GooWi)`;

function normalizeLanguage(language) {
  const candidate = String(language || "en").toLowerCase().split("-")[0];
  return /^[a-z]{2,3}$/.test(candidate) ? candidate : "en";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "Api-User-Agent": API_USER_AGENT,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Wikipedia request failed (${response.status})`);
  }

  return response.json();
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "the", "to", "was", "were", "with"
]);

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function normalizeText(value) {
  return stripHtml(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value) {
  return [...new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token && (!STOP_WORDS.has(token) || /^\d+$/.test(token)))
  )];
}

function compact(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function diceCoefficient(a, b) {
  const left = compact(a);
  const right = compact(b);

  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const pairs = new Map();
  for (let i = 0; i < left.length - 1; i += 1) {
    const pair = left.slice(i, i + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }

  let overlap = 0;
  for (let i = 0; i < right.length - 1; i += 1) {
    const pair = right.slice(i, i + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      overlap += 1;
      pairs.set(pair, count - 1);
    }
  }

  return (2 * overlap) / ((left.length - 1) + (right.length - 1));
}

function coverage(queryTokens, haystackTokens) {
  if (!queryTokens.length) return 0;
  const haystack = new Set(haystackTokens);
  const matches = queryTokens.filter((token) => haystack.has(token)).length;
  return matches / queryTokens.length;
}

function relevanceFor(query, page) {
  const queryNorm = normalizeText(query);
  const titleNorm = normalizeText(page?.title || "");
  const matchedTitleNorm = normalizeText(page?.matched_title || "");
  const titleCandidates = [titleNorm, matchedTitleNorm].filter(Boolean);

  if (!queryNorm || !titleNorm) {
    return { accepted: false, score: 0, reason: "empty" };
  }

  // Strongest signal: the query and article title are the same phrase, or one
  // is a direct expansion of the other (for example "Camus" -> "Albert Camus").
  for (const candidateTitle of titleCandidates) {
    if (candidateTitle === queryNorm) {
      return { accepted: true, score: 1, reason: "exact-title" };
    }

    // A longer article title that contains the complete query is normally a
    // safe expansion ("Camus" -> "Albert Camus"). The reverse is NOT
    // automatically safe: a specific query such as "Mississippi River and
    // Tributaries Project" contains the broader title "Mississippi River",
    // but those are different concepts. Longer queries are judged below using
    // token coverage and supporting metadata instead.
    if (queryNorm.length >= 4 && candidateTitle.length >= 4 &&
        candidateTitle.includes(queryNorm)) {
      return { accepted: true, score: 0.98, reason: "title-expands-query" };
    }
  }

  const queryTokens = meaningfulTokens(query);
  const titleTokens = meaningfulTokens(`${page?.title || ""} ${page?.matched_title || ""}`);
  const supportText = `${page?.title || ""} ${page?.matched_title || ""} ${page?.description || ""} ${page?.excerpt || ""}`;
  const supportTokens = meaningfulTokens(supportText);

  const titleCoverage = coverage(queryTokens, titleTokens);
  const supportCoverage = coverage(queryTokens, supportTokens);
  const fuzzyTitle = Math.max(...titleCandidates.map((title) => diceCoefficient(queryNorm, title)), 0);

  // A single-term query can legitimately expand to a longer title ("NFIP" ->
  // "National Flood Insurance Program"), but the term must actually occur in
  // Wikipedia's returned metadata/snippet. Mere character resemblance is not enough.
  if (queryTokens.length === 1) {
    const token = queryTokens[0];
    const supportHasToken = new Set(supportTokens).has(token);
    const accepted = titleCoverage === 1 ||
      (token.length >= 3 && supportHasToken) ||
      fuzzyTitle >= 0.88;

    return {
      accepted,
      score: Math.max(titleCoverage, supportHasToken ? 0.82 : 0, fuzzyTitle * 0.9),
      reason: accepted ? "single-term-match" : "single-term-too-distant"
    };
  }

  // Two-word searches are common names. Normally both words should be present;
  // a very close fuzzy title is allowed to rescue a typo.
  if (queryTokens.length === 2) {
    const accepted = titleCoverage === 1 ||
      (titleCoverage >= 0.5 && fuzzyTitle >= 0.82) ||
      (supportCoverage === 1 && titleCoverage >= 0.5);

    return {
      accepted,
      score: Math.max(titleCoverage, fuzzyTitle * 0.9, supportCoverage * 0.75),
      reason: accepted ? "two-term-match" : "two-term-too-distant"
    };
  }

  // For longer searches, require most of the concept to be represented in the
  // article title. This deliberately favors false negatives over clutter. It
  // accepts "Post-9/11 GI Bill" -> "Post-9/11 Veterans Educational Assistance
  // Act of 2008" (3/5 title tokens), while rejecting "Mississippi River and
  // Tributaries Project" -> "Mississippi River System" (2/4 title tokens).
  const accepted = titleCoverage >= 0.60 ||
    (titleCoverage >= 0.50 && supportCoverage === 1) ||
    (titleCoverage >= 0.50 && fuzzyTitle >= 0.82);

  return {
    accepted,
    score: Math.max(
      titleCoverage,
      (titleCoverage * 0.65) + (supportCoverage * 0.25) + (fuzzyTitle * 0.10)
    ),
    reason: accepted ? "multi-term-match" : "multi-term-too-distant"
  };
}

async function fetchSearchPages(query, language) {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  const searchUrl = `${base}/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=5`;
  const searchData = await fetchJson(searchUrl);
  return Array.isArray(searchData?.pages) ? searchData.pages : [];
}

function rankRelevantPages(query, pages) {
  return pages
    .map((page, index) => ({
      page,
      index,
      relevance: relevanceFor(query, page)
    }))
    .filter(({ relevance }) => relevance.accepted)
    .sort((a, b) => {
      if (b.relevance.score !== a.relevance.score) {
        return b.relevance.score - a.relevance.score;
      }
      return a.index - b.index;
    });
}

function plausibleSpellingSuggestion(originalQuery, suggestion) {
  const original = normalizeText(originalQuery);
  const corrected = normalizeText(suggestion);
  if (!original || !corrected || original === corrected) return false;

  const originalTokens = meaningfulTokens(originalQuery);
  const correctedTokens = meaningfulTokens(suggestion);
  if (!originalTokens.length || !correctedTokens.length) return false;

  // Wikipedia's suggestion is only a rescue path for likely spelling errors,
  // not a license to reinterpret the user's search. Require the strings to be
  // very similar and keep token-count changes small.
  const similarity = diceCoefficient(original, corrected);
  const lengthRatio = Math.min(original.length, corrected.length) /
    Math.max(original.length, corrected.length);
  const tokenDelta = Math.abs(originalTokens.length - correctedTokens.length);

  return similarity >= 0.72 && lengthRatio >= 0.72 && tokenDelta <= 1;
}

async function wikipediaSpellingSuggestion(query, language) {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  const suggestionUrl = `${base}/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=0&srlimit=5&srinfo=suggestion%7Crewrittenquery&srprop=snippet%7Credirecttitle&srsearch=${encodeURIComponent(query)}`;
  const data = await fetchJson(suggestionUrl);
  const suggestion = String(data?.query?.searchinfo?.suggestion || "").trim();
  return suggestion;
}

async function searchWikipedia(query, language) {
  const lang = normalizeLanguage(language);
  const pages = await fetchSearchPages(query, lang);
  const ranked = rankRelevantPages(query, pages);
  const best = ranked[0];

  if (best?.page?.title) {
    return buildPageResult(best.page, lang, {
      score: best.relevance.score,
      reason: best.relevance.reason
    });
  }

  // Normal matching failed. Ask Wikipedia itself whether the query looks like
  // a misspelling, then apply GooWi's relevance gate again to the corrected
  // query. This catches cases such as "Albet Camus" -> "Albert Camus" without
  // reading Google's correction UI or making GooWi more eager to guess.
  const suggestion = await wikipediaSpellingSuggestion(query, lang).catch(() => "");
  if (!suggestion || !plausibleSpellingSuggestion(query, suggestion)) {
    return {
      found: false,
      language: lang,
      reason: pages.length ? "no-relevant-match" : "no-search-results"
    };
  }

  const correctedPages = await fetchSearchPages(suggestion, lang);
  const correctedRanked = rankRelevantPages(suggestion, correctedPages);
  const correctedBest = correctedRanked[0];

  if (!correctedBest?.page?.title) {
    return {
      found: false,
      language: lang,
      reason: "no-relevant-corrected-match"
    };
  }

  return buildPageResult(correctedBest.page, lang, {
    score: correctedBest.relevance.score,
    reason: "wikipedia-spelling-suggestion",
    matchedReason: correctedBest.relevance.reason,
    originalQuery: query,
    correctedQuery: suggestion
  });
}

async function buildPageResult(page, language, relevance = null) {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  const title = String(page?.title || "").trim();
  if (!title) return { found: false, language: lang };

  const encodedTitle = encodeURIComponent(title.replace(/ /g, "_"));
  const pageUrl = `${base}/wiki/${encodedTitle}`;
  const htmlUrl = `${base}/w/rest.php/v1/page/${encodedTitle}/with_html`;
  const imageUrl = `${base}/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&titles=${encodeURIComponent(title)}&piprop=thumbnail%7Coriginal%7Cname&pithumbsize=800`;

  // PageImages is Wikipedia's own choice of a representative page image. This
  // is deliberately preferable to scraping the first <img> from article HTML:
  // UI icons can appear before real content, while later figures may be merely
  // secondary illustrations. If PageImages returns nothing, GooWi shows no
  // image rather than substituting an unrelated one.
  const [pageData, imageData] = await Promise.all([
    fetchJson(htmlUrl),
    fetchJson(imageUrl).catch(() => null)
  ]);

  const imagePage = imageData?.query?.pages?.[0] || null;
  const primaryImage = imagePage?.thumbnail?.source || "";

  return {
    found: true,
    language: lang,
    title,
    description: page.description || "",
    excerpt: page.excerpt || "",
    primaryImage,
    pageImageName: imagePage?.pageimage || "",
    pageUrl,
    html: pageData?.html || "",
    relevance
  };
}

async function metadataForExactTitle(title, language) {
  const lang = normalizeLanguage(language);
  const pages = await fetchSearchPages(title, lang);
  const wanted = normalizeText(title);
  return pages.find((page) => normalizeText(page?.title || "") === wanted) ||
    pages.find((page) => normalizeText(page?.matched_title || "") === wanted) ||
    { title };
}

async function wikipediaPageByTitle(title, language, reason = "direct-title") {
  const lang = normalizeLanguage(language);
  const cleanTitle = String(title || "").trim().slice(0, 500);
  if (!cleanTitle) return { found: false, language: lang, reason: "empty-title" };

  const metadata = await metadataForExactTitle(cleanTitle, lang);
  return buildPageResult(metadata, lang, { score: 1, reason });
}

async function randomWikipediaTitle(language, excludeTitle = "") {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  const excluded = normalizeText(excludeTitle);

  // Ask for several candidates so a new Wikirace never starts and ends on the
  // same page merely because Special:Random happened to return the start page.
  const randomUrl = `${base}/w/api.php?action=query&format=json&formatversion=2&list=random&rnnamespace=0&rnlimit=5&rnfilterredir=nonredirects`;
  const randomData = await fetchJson(randomUrl);
  const candidates = Array.isArray(randomData?.query?.random) ? randomData.query.random : [];
  const chosen = candidates.find((page) => {
    const title = String(page?.title || "").trim();
    return title && (!excluded || normalizeText(title) !== excluded);
  });

  const title = String(chosen?.title || "").trim();
  return title
    ? { found: true, language: lang, title }
    : { found: false, language: lang, reason: "no-random-article" };
}

async function randomWikipedia(language) {
  const target = await randomWikipediaTitle(language);
  if (!target?.found) return target;
  return wikipediaPageByTitle(target.title, target.language, "random-article");
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "googlepedia:lookup") {
    const query = String(message.query || "").trim().slice(0, 500);
    if (!query) {
      return Promise.resolve({ found: false });
    }

    return searchWikipedia(query, message.language)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "googlepedia:random") {
    return randomWikipedia(message.language)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "googlepedia:wikirace-target") {
    return randomWikipediaTitle(message.language, message.excludeTitle)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "googlepedia:page") {
    const title = String(message.title || "").trim().slice(0, 500);
    if (!title) return Promise.resolve({ found: false });

    return wikipediaPageByTitle(title, message.language, "wikirace-link")
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  return undefined;
});
