const EXTENSION_VERSION = browser.runtime.getManifest().version;
const API_USER_AGENT = `GooWi/${EXTENSION_VERSION} (browser extension; https://github.com/oliversudduth/GooWi)`;

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
  "in", "is", "it", "of", "on", "or", "the", "to", "was", "were", "with",
  // Common name particles / glue words. Treating these as non-semantic keeps
  // searches such as "Thomas de Marle" aligned with aliases such as
  // "Thomas of Marle" without making the substantive name tokens looser.
  "da", "de", "del", "della", "des", "di", "do", "dos", "du",
  "la", "le", "van", "von"
]);

// Query terms that usually express a user's intent to perform an action or
// reach an official/service page rather than learn about a broad entity.
// If one of these terms is absent from the candidate article title, it must
// not be "rescued" merely because the word appears incidentally in a snippet.
const INTENT_TERMS = new Set([
  "support", "help", "contact", "login", "signin", "account",
  "order", "orders", "tracking", "track", "download", "downloads",
  "buy", "purchase", "price", "pricing", "repair", "repairs",
  "store", "shop", "shopping", "phone", "hours",
  "customer", "service", "services"
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
    // Treat dotted initialisms as the compact form users normally type:
    // "D.C." -> "DC", "U.S." -> "US". This keeps titles such as
    // "Washington, D.C." aligned with queries such as "washington dc".
    .replace(/\b(?:[A-Za-z]\.){2,}/g, (match) => match.replace(/\./g, ""))
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

function orderedPhraseMatch(queryTokens, value) {
  if (!queryTokens.length) return false;
  const tokens = normalizeText(value)
    .split(" ")
    .filter((token) => token && (!STOP_WORDS.has(token) || /^\d+$/.test(token)));

  if (tokens.length < queryTokens.length) return false;

  for (let start = 0; start <= tokens.length - queryTokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < queryTokens.length; offset += 1) {
      if (tokens[start + offset] !== queryTokens[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

function titleAcronym(title) {
  const tokens = meaningfulTokens(title);
  return tokens.map((token) => {
    // Preserve compact Roman numerals so "World War II" -> "wwii".
    if (/^[ivxlcdm]+$/i.test(token)) return token;
    return token[0] || "";
  }).join("");
}

function damerauLevenshteinDistance(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );

      if (
        i > 1 && j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[left.length][right.length];
}

function plausibleSingleTermAlias(query, page) {
  const token = meaningfulTokens(query)[0] || "";
  if (!token) return false;

  const title = String(page?.title || "");
  const matchedTitle = String(page?.matched_title || "");
  const titleTokens = meaningfulTokens(`${title} ${matchedTitle}`);

  if (titleTokens.includes(token)) return true;

  // Redirect/matched-title evidence is safe when it exactly represents the
  // user's term, but arbitrary occurrences deep in an article snippet are not.
  if (normalizeText(matchedTitle) === normalizeText(query)) return true;

  const acronym = titleAcronym(title);
  if (acronym && normalizeText(acronym) === normalizeText(query)) return true;

  return false;
}


const SEMANTIC_QUALIFIERS = new Map([
  ["animal", new Set([
    "animal", "animals", "species", "mammal", "mammals", "cat", "cats",
    "feline", "felines", "bird", "birds", "reptile", "reptiles", "fish",
    "insect", "insects", "organism", "organisms", "wildlife"
  ])],
  ["car", new Set([
    "car", "cars", "automobile", "automobiles", "vehicle", "vehicles",
    "automotive", "automaker", "automakers"
  ])],
  ["company", new Set([
    "company", "companies", "corporation", "corporations", "business",
    "businesses", "firm", "firms"
  ])]
]);

function romanNumeralTokens(value) {
  return meaningfulTokens(value).filter((token) =>
    /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/i.test(token)
  );
}

function hasRomanNumeralConflict(query, page) {
  const queryNumerals = romanNumeralTokens(query);
  if (!queryNumerals.length) return false;

  const titleNumerals = romanNumeralTokens(
    `${page?.title || ""} ${page?.matched_title || ""}`
  );
  if (!titleNumerals.length) return false;

  const querySet = new Set(queryNumerals);
  return titleNumerals.some((token) => !querySet.has(token));
}

function orderedSubsequenceMatch(needles, haystack, maxGap = 2) {
  if (!needles.length || !haystack.length) return null;

  let searchFrom = 0;
  let firstIndex = -1;
  let previousIndex = -1;

  for (const needle of needles) {
    let found = -1;
    for (let index = searchFrom; index < haystack.length; index += 1) {
      if (haystack[index] === needle) {
        found = index;
        break;
      }
    }

    if (found < 0) return null;
    if (previousIndex >= 0 && found - previousIndex - 1 > maxGap) return null;

    if (firstIndex < 0) firstIndex = found;
    previousIndex = found;
    searchFrom = found + 1;
  }

  return { firstIndex, lastIndex: previousIndex };
}

function genericListLikePage(page) {
  const description = normalizeText(page?.description || "");
  const title = normalizeText(page?.title || "");

  return /\b(?:name list|given name|surname|disambiguation)\b/.test(description) ||
    /\bdisambiguation\b/.test(title);
}

function leadIdentityAliasMatch(queryTokens, page) {
  if (queryTokens.length < 2 || genericListLikePage(page)) return false;

  const excerptTokens = normalizeText(page?.excerpt || "")
    .split(" ")
    .filter((token) => token && (!STOP_WORDS.has(token) || /^\d+$/.test(token)));

  if (!excerptTokens.length) return false;

  // Identity aliases in Wikipedia's search excerpt normally occur right at the
  // beginning of the lead ("Samuel Langhorne Clemens ...", "Gaius Julius
  // Caesar ..."). Relationship mentions later in another person's article
  // should not qualify merely because every query token eventually appears.
  const lead = excerptTokens.slice(0, Math.max(14, queryTokens.length + 6));
  const match = orderedSubsequenceMatch(queryTokens, lead, 2);

  return Boolean(
    match &&
    match.firstIndex <= 2 &&
    match.lastIndex <= queryTokens.length + 5
  );
}

function shortNameTitleMatch(queryTokens, page) {
  if (queryTokens.length !== 2) return false;

  const groups = [page?.title || "", page?.matched_title || ""]
    .filter(Boolean)
    .map((title) => meaningfulTokens(title))
    .filter((tokens) => tokens.length >= 2);

  return groups.some((tokens) => {
    if (tokens[tokens.length - 1] !== queryTokens[queryTokens.length - 1]) {
      return false;
    }
    return Boolean(orderedSubsequenceMatch(queryTokens, tokens, 3));
  });
}

function semanticQualifierMatch(queryTokens, titleTokens, page) {
  if (queryTokens.length !== 2) return false;

  const titleSet = new Set(titleTokens);
  const matched = queryTokens.filter((token) => titleSet.has(token));
  const missing = queryTokens.filter((token) => !titleSet.has(token));

  if (matched.length !== 1 || missing.length !== 1) return false;

  const synonyms = SEMANTIC_QUALIFIERS.get(missing[0]);
  if (!synonyms) return false;

  const supportTokens = new Set(meaningfulTokens(
    `${page?.description || ""} ${page?.excerpt || ""}`
  ));

  return [...synonyms].some((token) => supportTokens.has(token));
}

function relevanceFor(query, page) {
  const queryNorm = normalizeText(query);
  const titleNorm = normalizeText(page?.title || "");
  const matchedTitleNorm = normalizeText(page?.matched_title || "");
  const titleCandidates = [titleNorm, matchedTitleNorm].filter(Boolean);

  if (!queryNorm || !titleNorm) {
    return { accepted: false, score: 0, reason: "empty" };
  }

  const queryTokens = meaningfulTokens(query);

  // Strongest signal: the query and article title are the same phrase.
  // Single-word queries may also expand safely to a longer title (for example
  // "Camus" -> "Albert Camus"). Multi-word queries are deliberately stricter:
  // "Washington DC" must not be treated as an exact concept match for the
  // unrelated longer title "Washington DC Open".
  for (const candidateTitle of titleCandidates) {
    if (candidateTitle === queryNorm) {
      return { accepted: true, score: 1, reason: "exact-title" };
    }

    if (queryTokens.length === 1 && queryNorm.length >= 4 &&
        candidateTitle.length >= 4 && candidateTitle.includes(queryNorm)) {
      return { accepted: true, score: 0.98, reason: "single-title-expansion" };
    }
  }

  // Roman numerals are identity-bearing tokens. A query for "Alexander III"
  // must never be allowed to drift to "Alexander IV". Alias titles that contain
  // no numeral (for example "Alexander the Great") remain eligible through the
  // lead-identity path below.
  if (hasRomanNumeralConflict(query, page)) {
    return {
      accepted: false,
      score: 0,
      reason: "roman-numeral-conflict"
    };
  }

  const titleTokenGroups = [page?.title || "", page?.matched_title || ""]
    .filter(Boolean)
    .map((title) => meaningfulTokens(title))
    .filter((tokens) => tokens.length);
  const shortestTitleTokenCount = titleTokenGroups.length
    ? Math.min(...titleTokenGroups.map((tokens) => tokens.length))
    : 0;
  const titleTokens = meaningfulTokens(`${page?.title || ""} ${page?.matched_title || ""}`);
  const supportText = `${page?.title || ""} ${page?.matched_title || ""} ${page?.description || ""} ${page?.excerpt || ""}`;
  const supportTokens = meaningfulTokens(supportText);

  const titleCoverage = coverage(queryTokens, titleTokens);
  const supportCoverage = coverage(queryTokens, supportTokens);
  const fuzzyTitle = Math.max(...titleCandidates.map((title) => diceCoefficient(queryNorm, title)), 0);

  // Transactional/navigational searches such as "apple support" should not
  // resolve to a broad product/entity article just because the article body
  // happens to contain the word "support". Exact/direct title matches above
  // remain valid, as do titles that explicitly contain the intent term.
  const missingIntentTerms = queryTokens.filter(
    (token) => INTENT_TERMS.has(token) && !titleTokens.includes(token)
  );
  if (missingIntentTerms.length && titleCoverage < 1) {
    return {
      accepted: false,
      score: 0,
      reason: "intent-term-missing-from-title"
    };
  }

  // A person's formal, birth, regnal, or pen name can differ radically from
  // the Wikipedia article title. Accept a full query that appears as an ordered
  // identity phrase right at the beginning of the search excerpt. Keeping this
  // to the lead avoids treating a relative or colleague mentioned later in an
  // article as the article's subject.
  const leadAlias = titleCoverage < 1 &&
    leadIdentityAliasMatch(queryTokens, page);
  if (leadAlias) {
    return {
      accepted: true,
      score: 0.94,
      reason: "lead-identity-alias"
    };
  }

  // Single-word searches are especially vulnerable to false positives because
  // Wikipedia search snippets may contain the typed word incidentally. For
  // example, a misspelling can appear deep in an unrelated article and should
  // never make that article relevant. Require title/redirect/acronym evidence
  // or a very strong title resemblance; otherwise allow the spelling-correction
  // path below to try again.
  if (queryTokens.length === 1) {
    const aliasMatch = plausibleSingleTermAlias(query, page);
    const accepted = titleCoverage === 1 ||
      aliasMatch ||
      fuzzyTitle >= 0.88;

    return {
      accepted,
      score: Math.max(titleCoverage, aliasMatch ? 0.90 : 0, fuzzyTitle * 0.9),
      reason: accepted ? "single-term-match" : "single-term-too-distant"
    };
  }

  // Two-word searches are common names, places, and disambiguated concepts.
  // Keep the ordinary tight-title rule, while adding two conservative rescue
  // paths:
  //   1. a short personal name whose first/last tokens are present in order in
  //      a longer formal title and whose surname remains the title's final token;
  //   2. a semantic qualifier such as "animal" that is supported by the
  //      candidate's description/excerpt ("species", "mammal", "cat", etc.).
  if (queryTokens.length === 2) {
    const tightTitle = shortestTitleTokenCount > 0 &&
      shortestTitleTokenCount <= queryTokens.length;
    const shortName = titleCoverage === 1 &&
      shortNameTitleMatch(queryTokens, page);
    const semanticQualifier = titleCoverage >= 0.5 &&
      semanticQualifierMatch(queryTokens, titleTokens, page);

    const accepted = (tightTitle && (
      titleCoverage === 1 ||
      (titleCoverage >= 0.5 && fuzzyTitle >= 0.82)
    )) || shortName || semanticQualifier;

    return {
      accepted,
      score: accepted
        ? Math.max(
            titleCoverage,
            fuzzyTitle * 0.9,
            shortName ? 0.92 : 0,
            semanticQualifier ? 0.86 : 0
          )
        : 0,
      reason: accepted
        ? (shortName
            ? "two-term-formal-title"
            : (semanticQualifier
                ? "two-term-semantic-qualifier"
                : "two-term-tight-match"))
        : "two-term-too-distant"
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



function titleAcronymVariants(value) {
  const rawTokens = normalizeText(value).split(" ").filter(Boolean);
  const variants = new Set();
  if (!rawTokens.length) return variants;

  const initials = (tokens) => tokens.map((token) =>
    /^[ivxlcdm]+$/i.test(token) ? token : (token[0] || "")
  ).join("");

  variants.add(initials(rawTokens));
  if (["a", "an", "the"].includes(rawTokens[0]) && rawTokens.length > 1) {
    variants.add(initials(rawTokens.slice(1)));
  }
  variants.add(titleAcronym(value));
  return variants;
}

function validatedGoogleCanonicalContext(query, context) {
  const title = String(context?.title || "").trim().slice(0, 160);
  const evidence = String(context?.evidence || "").trim().slice(0, 3000);
  const source = String(context?.source || "").trim().slice(0, 80);
  const confidence = Number(context?.confidence || 0);

  if (!title || confidence < 75) return null;

  const queryTokens = meaningfulTokens(query);
  const titleTokens = meaningfulTokens(title);
  const evidenceTokens = meaningfulTokens(evidence);
  if (!queryTokens.length || !titleTokens.length) return null;

  // A navigational search must not be converted back into a broad encyclopedia
  // entity. For example, Google may prominently identify Apple on a search for
  // "apple customer service", but the words "customer service" are precisely
  // why GooWi should stay out of the way.
  const missingIntent = queryTokens.filter(
    (token) => INTENT_TERMS.has(token) && !titleTokens.includes(token)
  );
  if (missingIntent.length) return null;

  const queryNorm = normalizeText(query);
  const titleNorm = normalizeText(title);
  const rawCompact = queryNorm.replace(/\s+/g, "");
  const acronymMatch = rawCompact.length >= 2 && rawCompact.length <= 12 &&
    titleAcronymVariants(title).has(rawCompact);
  const titleCoverage = coverage(queryTokens, titleTokens);
  const evidenceCoverage = coverage(queryTokens, evidenceTokens);
  const orderedEvidence = Boolean(orderedSubsequenceMatch(queryTokens, evidenceTokens, 2));
  const fuzzy = diceCoefficient(queryNorm, titleNorm);
  const editDistance = damerauLevenshteinDistance(queryNorm, titleNorm);
  const maxLength = Math.max(queryNorm.length, titleNorm.length);
  const typoLike = maxLength <= 16 && editDistance <= 2;

  const related = acronymMatch ||
    titleCoverage >= 0.75 ||
    evidenceCoverage >= 0.75 ||
    orderedEvidence ||
    fuzzy >= 0.82 ||
    typoLike;

  if (!related) return null;

  return { title, evidence, source, confidence };
}

function chooseSearchMatch(query, pages, canonicalContext = null, canonicalPages = []) {
  const primaryBest = rankRelevantPages(query, pages)[0] || null;

  // A literal exact Wikipedia title remains authoritative. Google context is a
  // rescue/disambiguation signal, not permission to override an exact concept
  // the user explicitly searched for.
  if (primaryBest?.relevance?.reason === "exact-title") {
    return { ...primaryBest, source: "query" };
  }

  const canonicalBest = canonicalContext
    ? (rankRelevantPages(canonicalContext.title, canonicalPages)[0] || null)
    : null;

  if (canonicalBest && canonicalBest.relevance.score >= 0.84) {
    const primaryScore = primaryBest?.relevance?.score || 0;
    const canonicalScore = canonicalBest.relevance.score + 0.08;
    if (!primaryBest || canonicalScore > primaryScore) {
      return { ...canonicalBest, source: "google-canonical" };
    }
  }

  return primaryBest ? { ...primaryBest, source: "query" } : null;
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
  // not a license to reinterpret the user's search. Dice similarity handles
  // ordinary substitutions well; Damerau-Levenshtein also catches adjacent
  // transpositions such as "wiazrd" -> "wizard" and "Geroge" -> "George".
  const similarity = diceCoefficient(original, corrected);
  const editDistance = damerauLevenshteinDistance(original, corrected);
  const maxLength = Math.max(original.length, corrected.length);
  const editSimilarity = maxLength ? 1 - (editDistance / maxLength) : 0;
  const lengthRatio = Math.min(original.length, corrected.length) /
    Math.max(original.length, corrected.length);
  const tokenDelta = Math.abs(originalTokens.length - correctedTokens.length);
  const shortTypo = maxLength <= 12 && editDistance <= 2;

  return (similarity >= 0.72 || editSimilarity >= 0.82 || shortTypo) &&
    lengthRatio >= 0.72 &&
    tokenDelta <= 1;
}

async function wikipediaSpellingSuggestion(query, language) {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  const suggestionUrl = `${base}/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=0&srlimit=5&srinfo=suggestion%7Crewrittenquery&srprop=snippet%7Credirecttitle&srsearch=${encodeURIComponent(query)}`;
  const data = await fetchJson(suggestionUrl);
  const suggestion = String(data?.query?.searchinfo?.suggestion || "").trim();
  return suggestion;
}

async function searchWikipedia(query, language, googleContext = null) {
  const lang = normalizeLanguage(language);
  const canonicalContext = validatedGoogleCanonicalContext(query, googleContext);

  const [pages, canonicalPages] = await Promise.all([
    fetchSearchPages(query, lang),
    canonicalContext && normalizeText(canonicalContext.title) !== normalizeText(query)
      ? fetchSearchPages(canonicalContext.title, lang).catch(() => [])
      : Promise.resolve([])
  ]);

  const best = chooseSearchMatch(query, pages, canonicalContext, canonicalPages);

  if (best?.page?.title) {
    return buildPageResult(best.page, lang, {
      score: best.relevance.score,
      reason: best.source === "google-canonical" ? "google-canonical-topic" : best.relevance.reason,
      matchedReason: best.source === "google-canonical" ? best.relevance.reason : undefined,
      originalQuery: best.source === "google-canonical" ? query : undefined,
      googleCanonicalTopic: best.source === "google-canonical" ? canonicalContext.title : undefined,
      googleContextSource: best.source === "google-canonical" ? canonicalContext.source : undefined
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

    return searchWikipedia(query, message.language, message.googleContext)
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
