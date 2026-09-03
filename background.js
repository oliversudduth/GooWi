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
    // Treat dotted initialisms as the compact form users normally type,
    // including the spaced punctuation Wikipedia commonly uses in titles:
    // "D.C." -> "DC", "J. R. R." -> "JRR", "U. S." -> "US".
    // The final dot is consumed but the following word separator is preserved.
    .replace(/\b(?:[A-Za-z]\.\s*)+[A-Za-z]\./g, (match) => match.replace(/[\s.]+/g, ""))
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
  const redirectTitle = String(page?.redirect_title || "");
  const titleTokens = meaningfulTokens(`${title} ${matchedTitle} ${redirectTitle}`);

  if (titleTokens.includes(token)) return true;

  // Redirect/matched-title evidence is safe when it exactly represents the
  // user's term, but arbitrary occurrences deep in an article snippet are not.
  if (normalizeText(matchedTitle) === normalizeText(query) ||
      normalizeText(redirectTitle) === normalizeText(query)) return true;

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

function orderedSubsequenceWithinSpan(needles, haystack, maxGap = 2, maxExtraSpan = 3) {
  const match = orderedSubsequenceMatch(needles, haystack, maxGap);
  if (!match) return false;
  return (match.lastIndex - match.firstIndex + 1) <= (needles.length + maxExtraSpan);
}

function genericListLikePage(page) {
  const description = normalizeText(page?.description || "");
  const title = normalizeText(page?.title || "");

  return /\b(?:name list|given name|surname|disambiguation)\b/.test(description) ||
    /\bdisambiguation\b/.test(title);
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

const GOOGLE_CONTEXT_GENERIC_TITLES = new Set([
  "ai overview", "overview", "description", "definition", "definition and origin",
  "origin", "people also ask", "people also search for", "images", "videos",
  "shopping", "news", "maps", "forums", "web results", "search results",
  "wikipedia", "ratings", "read now", "more results", "quick facts", "listen",
  "events", "books", "born", "died", "party", "spouse", "children", "parents",
  "siblings", "education", "awards", "works", "references", "see also"
]);

const GOOGLE_CONTEXT_ENTITY_TYPE_TITLES = new Set([
  "band", "rock band", "musical group", "music group", "artist", "musician",
  "singer", "singer songwriter", "actor", "actress", "writer", "author",
  "writer and academic", "poet", "politician", "president", "emperor",
  "film", "movie", "tv series", "television series", "book", "novel",
  "album", "song", "company", "corporation", "organization", "organisation",
  "city", "town", "village", "country", "state", "province", "region",
  "software", "video game", "website", "school", "university"
]);

const ENTITY_TYPE_HINTS = [
  ["musician", ["musician", "singer", "songwriter", "rapper", "composer", "performer"]],
  ["band", ["band", "group", "ensemble"]],
  ["writer", ["writer", "author", "novelist", "poet", "academic", "philologist"]],
  ["president", ["president", "statesman"]],
  ["emperor", ["emperor"]],
  ["king", ["king", "monarch"]],
  ["queen", ["queen", "monarch"]],
  ["actor", ["actor", "actress"]],
  ["director", ["director", "filmmaker"]],
  ["film", ["film", "movie"]],
  ["series", ["series", "television"]],
  ["book", ["book", "novel"]],
  ["album", ["album"]],
  ["song", ["song"]],
  ["company", ["company", "corporation", "business", "firm"]],
  ["city", ["city"]],
  ["country", ["country", "nation"]],
  ["software", ["software"]],
  ["game", ["game"]],
  ["animal", ["animal", "species", "mammal", "cat", "feline"]]
];

function entityTypeHint(value) {
  const tokens = new Set(meaningfulTokens(value));
  for (const [hint, synonyms] of ENTITY_TYPE_HINTS) {
    if (synonyms.some((word) => tokens.has(word))) return hint;
  }
  return "";
}

function pageMatchesEntityType(value, page) {
  const hint = entityTypeHint(value);
  if (!hint) return 0;

  const text = normalizeText([
    page?.title || "",
    page?.matched_title || "",
    page?.description || "",
    stripHtml(page?.excerpt || "")
  ].join(" "));
  const tokens = new Set(meaningfulTokens(text));
  const entry = ENTITY_TYPE_HINTS.find(([key]) => key === hint);
  if (!entry) return 0;

  const [, synonyms] = entry;
  return synonyms.some((word) => tokens.has(word)) ? 1 : 0;
}

function canonicalLookupQuery(context) {
  const title = String(context?.title || "").trim();
  if (!title) return "";

  const hint = entityTypeHint(context?.entityType || "");
  if (!hint) return title;

  const titleTokens = new Set(meaningfulTokens(title));
  return titleTokens.has(hint) ? title : `${title} ${hint}`;
}

const RELATED_PAGE_PREFIXES = [
  "influences on", "influence of", "works of", "bibliography of",
  "legacy of", "history of", "list of", "timeline of", "discography of",
  "filmography of", "portrayal of", "reception of", "religious views of",
  "political views of", "personal life of", "early life of", "death of",
  "assassination of", "family of", "descendants of", "ancestry of",
  "cultural depictions of"
];

function relationWordRequested(query, prefix) {
  const queryTokens = meaningfulTokens(query).map((token) => token.replace(/s$/i, ""));
  const relationToken = meaningfulTokens(prefix)[0]?.replace(/s$/i, "");
  return Boolean(relationToken && queryTokens.includes(relationToken));
}

function relatedPageNotRequested(query, page) {
  const queryNorm = normalizeText(query);
  for (const candidate of [page?.title || "", page?.matched_title || ""]) {
    const titleNorm = normalizeText(candidate);
    for (const prefix of RELATED_PAGE_PREFIXES) {
      if (!titleNorm.startsWith(`${prefix} `) && titleNorm !== prefix) continue;
      if (queryNorm === titleNorm || relationWordRequested(query, prefix)) return false;
      return true;
    }
  }
  return false;
}

function terminalParenthetical(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return null;
  return {
    base: normalizeText(match[1]),
    qualifier: normalizeText(match[2])
  };
}

function parentheticalBaseMatch(query, page) {
  const queryNorm = normalizeText(query);
  for (const candidate of [page?.title || "", page?.matched_title || ""]) {
    const parsed = terminalParenthetical(candidate);
    if (parsed && parsed.base === queryNorm) return parsed;
  }
  return null;
}

function isDisambiguationTitle(value) {
  return terminalParenthetical(value)?.qualifier === "disambiguation";
}

function explicitRedirectAliasMatch(query, page) {
  const redirectTitle = String(page?.redirect_title || "").trim();
  if (!redirectTitle) return false;

  const queryNorm = normalizeText(query);
  const redirectNorm = normalizeText(redirectTitle);
  if (!queryNorm || !redirectNorm) return false;
  if (queryNorm === redirectNorm) return true;

  // Search-result redirect metadata is weaker than an exact title redirect.
  // Keep only the older conservative appended-canonical form here. A redirect
  // such as "The Artist Formerly Known as Prince (album)" must not establish
  // identity for the unqualified person query merely because one extra token
  // was omitted. Exact title redirects are resolved separately by MediaWiki's
  // redirects=1 title resolver.
  const queryTokens = meaningfulTokens(query);
  const redirectTokens = meaningfulTokens(redirectTitle);
  const pageTitleTokens = new Set(meaningfulTokens(page?.title || ""));
  if (queryTokens.length < 2 || redirectTokens.length <= queryTokens.length) return false;
  if (coverage(queryTokens, redirectTokens) !== 1) return false;
  if (!orderedSubsequenceMatch(queryTokens, redirectTokens, 2)) return false;

  const querySet = new Set(queryTokens);
  const extras = [...new Set(redirectTokens.filter((token) => !querySet.has(token)))];
  return extras.length > 0 && extras.length <= 3 &&
    extras.every((token) => pageTitleTokens.has(token));
}

function relevanceFor(query, page) {
  const queryNorm = normalizeText(query);
  const titleNorm = normalizeText(page?.title || "");
  const matchedTitleNorm = normalizeText(page?.matched_title || "");
  const redirectTitleNorm = normalizeText(page?.redirect_title || "");
  const titleCandidates = [titleNorm, matchedTitleNorm].filter(Boolean);

  if (!queryNorm || !titleNorm) {
    return { accepted: false, score: 0, reason: "empty" };
  }

  const queryTokens = meaningfulTokens(query);

  // Strongest ordinary signal: the query and article title are the same phrase.
  for (const candidateTitle of titleCandidates) {
    if (candidateTitle === queryNorm) {
      return { accepted: true, score: 1, reason: "exact-title" };
    }
  }

  // MediaWiki's direct title resolver can explicitly state that the exact
  // title the user entered redirects to a canonical page. This is stronger
  // identity evidence than search snippets or search-result redirect aliases.
  // It is still allowed to yield to a separately validated Google entity signal
  // when Google is identifying a specific entity rather than merely exposing a
  // neighboring Wikipedia result.
  const directRedirectNorm = normalizeText(page?.direct_redirect_from || "");
  if (directRedirectNorm && directRedirectNorm === queryNorm) {
    return { accepted: true, score: 1.04, reason: "direct-title-redirect" };
  }

  // Wikipedia's search API can also report redirect titles attached to search
  // results. These remain useful, but they are deliberately weaker than an
  // exact title redirect and cannot infer identity from a parenthetical sense
  // that the user did not type.
  if (redirectTitleNorm && explicitRedirectAliasMatch(query, page)) {
    return { accepted: true, score: 0.99, reason: "explicit-redirect-alias" };
  }

  // A parenthetical title whose base exactly matches the query is relevant, but
  // it is not equivalent to a literal exact title. "JFK" must not make
  // "JFK (film)" authoritative when Google clearly identifies John F. Kennedy.
  // A disambiguation parenthetical is different: preserving ambiguity is a
  // deliberate encyclopedic result, so "FDR" may remain "FDR (disambiguation)".
  const parenthetical = parentheticalBaseMatch(query, page);
  if (parenthetical) {
    if (parenthetical.qualifier === "disambiguation") {
      return { accepted: true, score: 1, reason: "base-disambiguation" };
    }
    return { accepted: true, score: 0.90, reason: "parenthetical-base-match" };
  }

  // A query naming an entity should not drift to a page merely about one aspect
  // of that entity. "JRR Tolkien" must not become "Influences on Tolkien";
  // "Rome" should not become "History of Rome". If the user actually requests
  // the relationship ("Tolkien influences", "history of Rome"), it remains valid.
  if (relatedPageNotRequested(query, page)) {
    return {
      accepted: false,
      score: 0,
      reason: "related-page-not-requested"
    };
  }

  // Generic name lists and disambiguation-like pages are useful when the user
  // actually searched that generic title, but they should not win merely by
  // containing part of a longer, more specific name. Example:
  // "François-Marie Arouet" must not collapse to the "François-Marie" name
  // list simply because two of three name tokens overlap. Exact-title and
  // exact-base disambiguation cases were already accepted above.
  if (genericListLikePage(page)) {
    const genericTitleTokens = meaningfulTokens(`${page?.title || ""} ${page?.matched_title || ""}`);
    const genericCoverage = coverage(queryTokens, genericTitleTokens);
    if (genericCoverage < 1) {
      return {
        accepted: false,
        score: 0,
        reason: "generic-list-partial-match"
      };
    }
  }

  // Single-word queries may expand safely to a longer non-parenthetical title
  // (for example "Camus" -> "Albert Camus"). Parenthetical expansions were
  // already handled above so a work/film qualifier cannot masquerade as exact.
  for (const candidateTitle of titleCandidates) {
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

  // Wikipedia REST search excerpts are match-centered snippets, not
  // guaranteed article leads. They may start around an incidental mention of
  // the query, so excerpts may support a plausible title match but can never
  // establish that the query is the identity of the article subject.

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

    // A one-token mismatch in a two-word name is not enough to establish
    // identity, even when the strings are very similar. That pattern is also
    // exactly what an ordinary typo looks like (Samuel Clemens/Clement,
    // Albet/Albert Camus), so defer it to Wikipedia's spelling/redirect rescue
    // instead of accepting the nearest title immediately.
    const accepted = (tightTitle && titleCoverage === 1) ||
      shortName || semanticQualifier;

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
  const entityType = String(context?.entityType || "").trim().slice(0, 110);
  const evidence = String(context?.evidence || "").trim().slice(0, 3000);
  const source = String(context?.source || "").trim().slice(0, 80);
  const confidence = Number(context?.confidence || 0);

  if (!title || confidence < 75) return null;

  const titleNorm = normalizeText(title);
  if (!titleNorm ||
      GOOGLE_CONTEXT_GENERIC_TITLES.has(titleNorm) ||
      GOOGLE_CONTEXT_ENTITY_TYPE_TITLES.has(titleNorm)) {
    return null;
  }

  const queryTokens = meaningfulTokens(query);
  const titleTokens = meaningfulTokens(title);
  const evidenceTokens = meaningfulTokens(evidence);
  if (!queryTokens.length || !titleTokens.length) return null;

  // A navigational search must not be converted back into a broad encyclopedia
  // entity. For example, Google may identify Apple on "apple customer service",
  // but that is precisely a case where GooWi should stay out of the way.
  const missingIntent = queryTokens.filter(
    (token) => INTENT_TERMS.has(token) && !titleTokens.includes(token)
  );
  if (missingIntent.length) return null;

  const queryNorm = normalizeText(query);
  const rawCompact = queryNorm.replace(/\s+/g, "");
  const acronymMatch = rawCompact.length >= 2 && rawCompact.length <= 12 &&
    titleAcronymVariants(title).has(rawCompact);
  const titleCoverage = coverage(queryTokens, titleTokens);
  const titleInsideQueryCoverage = coverage(titleTokens, queryTokens);
  const evidenceCoverage = coverage(queryTokens, evidenceTokens);
  const orderedEvidence = Boolean(orderedSubsequenceMatch(queryTokens, evidenceTokens, 2));
  const tightOrderedEvidence = orderedSubsequenceWithinSpan(queryTokens, evidenceTokens, 2, 3);
  const fuzzy = diceCoefficient(queryNorm, titleNorm);
  const editDistance = damerauLevenshteinDistance(queryNorm, titleNorm);
  const maxLength = Math.max(queryNorm.length, titleNorm.length);
  const typoLike = maxLength <= 16 && editDistance <= 2;

  if (source === "google-see-results-about") {
    // Treat an explicit Google entity chip as a qualifier signal only when its
    // meaningful title tokens are already present in the user's own query.
    // "The Fab Four Beatles" may therefore resolve through "The Beatles",
    // while plain "Mercury" is not forced into a more specific entity chip.
    const querySet = new Set(queryTokens);
    const titleIsQuerySubset = titleTokens.every((token) => querySet.has(token));
    if (queryTokens.length >= 2 && titleIsQuerySubset) {
      return { title, evidence, source, confidence };
    }
    return null;
  }

  if (source === "google-wikipedia-result") {
    // Google has explicitly selected a Wikipedia page on the visible result
    // page. Require at least partial lexical/lead support, but allow this path
    // to bridge conventional aliases such as Abe/Abraham or formal names whose
    // identity appears in the snippet rather than the page title.
    const related = acronymMatch ||
      titleCoverage >= 0.50 ||
      titleInsideQueryCoverage >= 0.50 ||
      evidenceCoverage >= 0.50 ||
      orderedEvidence ||
      fuzzy >= 0.74 ||
      typoLike;
    return related ? { title, entityType, evidence, source, confidence } : null;
  }

  if (source === "google-entity-heading") {
    // A large Google entity heading is useful when the entity name is contained
    // in the user's phrase ("The Artist Formerly Known as Prince" -> "Prince")
    // or otherwise shares enough identity evidence ("JRR Tolkien" -> the full
    // Tolkien name). For zero-overlap aliases, require a longer name, a real
    // Google entity-type subtitle, and the entire query tightly embedded in the
    // bounded entity evidence. This permits formal-name aliases such as
    // "Gaius Caesar Augustus Germanicus" -> "Caligula" without making broad
    // prose (for example an AI Overview mentioning "Big Blue") authoritative.
    const strongZeroOverlapAlias =
      titleCoverage === 0 &&
      titleInsideQueryCoverage === 0 &&
      queryTokens.length >= 3 &&
      Boolean(entityTypeHint(entityType)) &&
      evidenceCoverage === 1 &&
      tightOrderedEvidence;

    if (titleCoverage === 0 &&
        titleInsideQueryCoverage === 0 &&
        !acronymMatch &&
        !strongZeroOverlapAlias) {
      return null;
    }

    const related = acronymMatch ||
      strongZeroOverlapAlias ||
      titleCoverage >= 0.25 ||
      titleInsideQueryCoverage >= 0.50 ||
      evidenceCoverage >= 0.50 ||
      orderedEvidence ||
      fuzzy >= 0.78 ||
      typoLike;
    return related ? { title, entityType, evidence, source, confidence } : null;
  }

  const related = acronymMatch ||
    titleCoverage >= 0.75 ||
    titleInsideQueryCoverage >= 0.75 ||
    evidenceCoverage >= 0.75 ||
    orderedEvidence ||
    fuzzy >= 0.82 ||
    typoLike;

  return related ? { title, entityType, evidence, source, confidence } : null;
}


function googleContextSourcePriority(source) {
  if (source === "google-see-results-about") return 5;
  if (source === "google-structured-entity") return 4;
  if (source === "google-entity-heading") return 3;
  if (source === "google-wikipedia-result") return 2;
  return 1;
}

function validatedGoogleCanonicalContexts(query, contexts) {
  const input = Array.isArray(contexts) ? contexts : (contexts ? [contexts] : []);
  const validated = [];
  const seen = new Set();

  for (const rawContext of input.slice(0, 8)) {
    const context = validatedGoogleCanonicalContext(query, rawContext);
    if (!context) continue;
    const key = `${normalizeText(context.title)}::${context.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    validated.push(context);
  }

  return validated
    .sort((a, b) => {
      const sourceDelta =
        googleContextSourcePriority(b.source) - googleContextSourcePriority(a.source);
      if (sourceDelta) return sourceDelta;
      if (Boolean(b.entityType) !== Boolean(a.entityType)) return b.entityType ? 1 : -1;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    })
    .slice(0, 5);
}

function canonicalBaseIdentity(context, page) {
  const wanted = normalizeText(context?.title || "");
  if (!wanted) return { kind: "none", score: 0 };

  for (const candidate of [page?.title || "", page?.matched_title || ""]) {
    if (normalizeText(candidate) === wanted) {
      return { kind: "literal", score: 1.25 };
    }
    const parsed = terminalParenthetical(candidate);
    if (parsed?.base === wanted) {
      return {
        kind: parsed.qualifier === "disambiguation" ? "disambiguation" : "parenthetical",
        qualifier: parsed.qualifier,
        // A parenthetical base is relevant, but it is not stronger than the
        // literal canonical article unless the qualifier itself is corroborated
        // by Google's entity type. rankCanonicalPages applies that sense bonus.
        score: parsed.qualifier === "disambiguation" ? 1.05 : 1.08
      };
    }
  }
  return { kind: "none", score: 0 };
}

function parentheticalSenseMatchesEntityType(context, qualifier) {
  const contextHint = entityTypeHint(context?.entityType || "");
  if (!contextHint) return 0;
  const qualifierHint = entityTypeHint(qualifier || "");
  return qualifierHint && qualifierHint === contextHint ? 1 : 0;
}

function rankCanonicalPages(context, pages) {
  if (!context) return [];
  const lookupQuery = canonicalLookupQuery(context);

  return pages
    .map((page, index) => {
      const identity = relevanceFor(context.title, page);
      const lookup = lookupQuery && normalizeText(lookupQuery) !== normalizeText(context.title)
        ? relevanceFor(lookupQuery, page)
        : identity;
      const typeMatch = pageMatchesEntityType(context.entityType, page);
      const baseIdentity = canonicalBaseIdentity(context, page);
      const parentheticalSenseMatch = baseIdentity.kind === "parenthetical"
        ? parentheticalSenseMatchesEntityType(context, baseIdentity.qualifier)
        : 0;
      const identityScore = identity.accepted ? identity.score : 0;
      const lookupScore = lookup.accepted ? lookup.score : 0;

      let score = 0;
      if (baseIdentity.kind === "parenthetical") {
        // Do not let incidental type words in an article description make a
        // parenthetical namesake outrank the literal canonical article. The
        // strong bonus is reserved for a qualifier that itself expresses the
        // Google sense: Prince + musician -> Prince (musician), while Abraham
        // Lincoln + president does not promote Abraham Lincoln (captain).
        score = baseIdentity.score + (parentheticalSenseMatch * 0.64);
      } else if (baseIdentity.kind === "literal") {
        score = baseIdentity.score + (typeMatch * 0.30);
      } else if (baseIdentity.kind === "disambiguation") {
        score = baseIdentity.score + (typeMatch * 0.10);
      } else if (identity.accepted || lookup.accepted) {
        score = Math.max(identityScore, lookupScore * 0.96) + (typeMatch * 0.16);
      }

      return {
        page, index,
        relevance: identity.accepted ? identity : lookup,
        canonicalScore: score,
        typeMatch,
        parentheticalSenseMatch,
        baseIdentity
      };
    })
    .filter((item) => item.canonicalScore > 0)
    .sort((a, b) => {
      if (b.canonicalScore !== a.canonicalScore) return b.canonicalScore - a.canonicalScore;
      return a.index - b.index;
    });
}

function canonicalSourceBonus(context) {
  if (context?.source === "google-see-results-about") return 0.28;
  if (context?.source === "google-structured-entity") return 0.18;
  if (context?.source === "google-entity-heading") return 0.14;
  if (context?.source === "google-wikipedia-result") return 0.12;
  return 0.08;
}

function chooseSearchMatchFromContexts(query, pages, canonicalEntries = []) {
  const primaryBest = rankRelevantPages(query, pages)[0] || null;

  if (["exact-title", "base-disambiguation"].includes(primaryBest?.relevance?.reason) ||
      (primaryBest?.relevance?.reason === "direct-title-redirect" &&
        primaryBest?.page?.direct_redirect_is_disambiguation)) {
    return { ...primaryBest, source: "query", canonicalContext: null };
  }

  let bestCanonical = null;
  for (const entry of canonicalEntries || []) {
    const context = entry?.context;
    const candidate = context
      ? (rankCanonicalPages(context, Array.isArray(entry?.pages) ? entry.pages : [])[0] || null)
      : null;
    if (!candidate || candidate.canonicalScore < 0.84) continue;
    const totalScore = candidate.canonicalScore + canonicalSourceBonus(context);
    if (!bestCanonical || totalScore > bestCanonical.totalScore) {
      bestCanonical = {
        ...candidate,
        source: "google-canonical",
        canonicalContext: context,
        totalScore
      };
    }
  }

  if (primaryBest?.relevance?.reason === "direct-title-redirect") {
    // An exact Wikipedia title redirect is stronger than a visible Google
    // Wikipedia result for one particular parenthetical sense. However, a
    // separately validated Google entity signal (entity heading, structured
    // entity, or explicit See-results-about chip) may still identify a more
    // specific intended entity, as with "The Fab Four" -> the tribute band.
    const weakWikipediaOnlyContext = bestCanonical?.canonicalContext?.source === "google-wikipedia-result";
    if (bestCanonical && !weakWikipediaOnlyContext && bestCanonical.totalScore > 1.08) {
      return bestCanonical;
    }
    return { ...primaryBest, source: "query", canonicalContext: null };
  }

  if (bestCanonical) {
    const primaryScore = primaryBest?.relevance?.score || 0;
    if (!primaryBest || bestCanonical.totalScore > primaryScore) return bestCanonical;
  }

  return primaryBest
    ? { ...primaryBest, source: "query", canonicalContext: null }
    : null;
}

function chooseSearchMatch(query, pages, canonicalContext = null, canonicalPages = []) {
  return chooseSearchMatchFromContexts(
    query,
    pages,
    canonicalContext ? [{ context: canonicalContext, pages: canonicalPages }] : []
  );
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

async function wikipediaSearchMetadata(query, language) {
  const lang = normalizeLanguage(language);
  const base = `https://${lang}.wikipedia.org`;
  // One MediaWiki query supplies both search metadata and the exact-title
  // redirect chain. The latter is substantially safer than trying to infer an
  // alias from a search snippet or from a near-complete redirect title.
  const metadataUrl = `${base}/w/api.php?action=query&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(query)}&list=search&srnamespace=0&srlimit=5&srinfo=suggestion%7Crewrittenquery&srprop=snippet%7Credirecttitle&srsearch=${encodeURIComponent(query)}`;
  const data = await fetchJson(metadataUrl);
  const queryData = data?.query || {};
  const redirects = Array.isArray(queryData.redirects) ? queryData.redirects : [];
  const pages = Array.isArray(queryData.pages) ? queryData.pages : [];
  const finalPage = pages.find((page) => page && !page.missing && page.ns === 0) || null;
  const firstRedirect = redirects[0] || null;
  // A redirect into a specific section is normally navigational structure, not
  // clean identity evidence. The exception is an explicit redirect into a
  // disambiguation page: Wikipedia is then telling us the entered phrase is
  // ambiguous, which is safer to preserve than accepting a weaker namesake
  // such as "The Bard (film)".
  const directTargetIsDisambiguation = isDisambiguationTitle(finalPage?.title || "");
  const directRedirect = firstRedirect && finalPage?.title &&
      (!firstRedirect.tofragment || directTargetIsDisambiguation)
    ? {
        from: String(firstRedirect.from || query).trim(),
        to: String(finalPage.title || "").trim(),
        isDisambiguation: directTargetIsDisambiguation
      }
    : null;

  return {
    suggestion: String(queryData?.searchinfo?.suggestion || "").trim(),
    search: Array.isArray(queryData?.search) ? queryData.search : [],
    directRedirect
  };
}

function pagesWithRedirectMetadata(pages, metadataSearch, directRedirect = null) {
  const metadata = Array.isArray(metadataSearch) ? metadataSearch : [];
  const redirectByTitle = new Map();

  for (const item of metadata) {
    const title = normalizeText(item?.title || "");
    const redirectTitle = String(item?.redirecttitle || "").trim();
    if (!title || !redirectTitle) continue;
    redirectByTitle.set(title, {
      title: String(item?.title || "").trim(),
      redirectTitle,
      snippet: String(item?.snippet || "")
    });
  }

  const directTarget = normalizeText(directRedirect?.to || "");
  const directFrom = String(directRedirect?.from || "").trim();
  const directIsDisambiguation = Boolean(directRedirect?.isDisambiguation);

  const merged = (Array.isArray(pages) ? pages : []).map((page) => {
    const key = normalizeText(page?.title || "");
    const item = redirectByTitle.get(key);
    const next = item ? { ...page, redirect_title: item.redirectTitle } : { ...page };
    if (directTarget && key === directTarget && directFrom) {
      next.direct_redirect_from = directFrom;
      if (directIsDisambiguation) next.direct_redirect_is_disambiguation = true;
    }
    return next;
  });

  // REST search and MediaWiki search usually overlap, but not always. A
  // Wikipedia-declared search redirect may still compete if its canonical
  // target fell just outside the REST result window. Ordinary metadata search
  // hits are not introduced as a second, looser retrieval source.
  const seen = new Set(merged.map((page) => normalizeText(page?.title || "")));
  for (const item of redirectByTitle.values()) {
    const key = normalizeText(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({
      title: item.title,
      matched_title: item.title,
      excerpt: item.snippet,
      redirect_title: item.redirectTitle,
      ...(directTarget && key === directTarget && directFrom
        ? {
            direct_redirect_from: directFrom,
            ...(directIsDisambiguation ? { direct_redirect_is_disambiguation: true } : {})
          }
        : {})
    });
  }

  // The exact title resolver is authoritative first-party identity evidence and
  // must not depend on the target also appearing in the search result window.
  if (directTarget && directFrom && !seen.has(directTarget)) {
    merged.push({
      title: String(directRedirect.to || "").trim(),
      matched_title: String(directRedirect.to || "").trim(),
      direct_redirect_from: directFrom,
      ...(directIsDisambiguation ? { direct_redirect_is_disambiguation: true } : {})
    });
  }

  return merged;
}

async function searchWikipedia(query, language, googleContexts = []) {
  const lang = normalizeLanguage(language);
  const canonicalContexts = validatedGoogleCanonicalContexts(query, googleContexts);
  const rawPages = await fetchSearchPages(query, lang);

  const queryPromises = new Map();
  for (const context of canonicalContexts) {
    const canonicalQuery = canonicalLookupQuery(context);
    const normalized = normalizeText(canonicalQuery);
    if (!normalized || normalized === normalizeText(query)) continue;
    if (!queryPromises.has(normalized)) {
      queryPromises.set(normalized, fetchSearchPages(canonicalQuery, lang).catch(() => []));
    }
  }

  // Exact article titles and explicit disambiguation pages remain authoritative
  // and do not need an extra metadata request. For every less-direct case,
  // MediaWiki's exact-title redirect resolver and conservative search redirect
  // metadata enter the ranking before GooWi commits to a weaker lexical or
  // Google-canonical candidate. This gives aliases such as "Big Blue" -> IBM
  // and "Gaius Caesar Augustus Germanicus" -> Caligula first-party identity
  // evidence without inferring identity from search snippets.
  const preliminaryBest = rankRelevantPages(query, rawPages)[0] || null;
  const preliminaryAuthoritative = ["exact-title", "base-disambiguation"]
    .includes(preliminaryBest?.relevance?.reason);

  let metadata = { suggestion: "", search: [], directRedirect: null };
  let pages = rawPages;
  if (!preliminaryAuthoritative) {
    metadata = await wikipediaSearchMetadata(query, lang).catch(() => ({
      suggestion: "",
      search: [],
      directRedirect: null
    }));
    pages = pagesWithRedirectMetadata(rawPages, metadata.search, metadata.directRedirect);
  }

  const resolvedCanonicalPages = new Map();
  await Promise.all([...queryPromises.entries()].map(async ([key, promise]) => {
    resolvedCanonicalPages.set(key, await promise);
  }));

  const canonicalEntries = canonicalContexts.map((context) => {
    const key = normalizeText(canonicalLookupQuery(context));
    return {
      context,
      pages: key === normalizeText(query) ? pages : (resolvedCanonicalPages.get(key) || [])
    };
  });

  const best = chooseSearchMatchFromContexts(query, pages, canonicalEntries);

  if (best?.page?.title) {
    const canonicalContext = best.canonicalContext || null;
    const searchRedirectIdentity = best.source === "query" &&
      best.relevance?.reason === "explicit-redirect-alias";
    const directRedirectIdentity = best.source === "query" &&
      best.relevance?.reason === "direct-title-redirect";
    const redirectIdentity = searchRedirectIdentity || directRedirectIdentity;
    let resultPage = best.page;
    if (directRedirectIdentity && !resultPage?.description && !resultPage?.excerpt) {
      const enriched = await metadataForExactTitle(resultPage.title, lang).catch(() => null);
      if (enriched?.title) {
        resultPage = {
          ...enriched,
          direct_redirect_from: best.page.direct_redirect_from,
          ...(best.page.direct_redirect_is_disambiguation
            ? { direct_redirect_is_disambiguation: true }
            : {})
        };
      }
    }
    return buildPageResult(resultPage, lang, {
      score: best.relevance?.score ?? best.canonicalScore ?? 0,
      reason: best.source === "google-canonical"
        ? "google-canonical-topic"
        : (directRedirectIdentity
            ? "wikipedia-direct-title-redirect"
            : (searchRedirectIdentity ? "wikipedia-redirect-alias" : best.relevance.reason)),
      matchedReason: best.source === "google-canonical" || redirectIdentity
        ? best.relevance?.reason
        : undefined,
      originalQuery: best.source === "google-canonical" || redirectIdentity ? query : undefined,
      googleCanonicalTopic: best.source === "google-canonical" ? canonicalContext?.title : undefined,
      googleContextSource: best.source === "google-canonical" ? canonicalContext?.source : undefined,
      redirectedFrom: directRedirectIdentity
        ? resultPage.direct_redirect_from
        : (searchRedirectIdentity ? resultPage.redirect_title : undefined)
    });
  }

  // If no metadata request was needed above (normally because an authoritative
  // direct result would already have returned), obtain it now only for typo
  // recovery. In normal no-match cases metadata has already been collected and
  // its redirect evidence has already participated in ranking.
  if (preliminaryAuthoritative) {
    metadata = await wikipediaSearchMetadata(query, lang).catch(() => ({
      suggestion: "",
      search: [],
      directRedirect: null
    }));
  }

  const suggestion = metadata.suggestion;
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
    return { found: false, language: lang, reason: "no-relevant-corrected-match" };
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

const GOOWI_SELECTION_MENU_ID = "goowi-view-selection";
let pendingNativeSidebarSelection = null;

function cleanContextSelection(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

async function installSelectionContextMenu() {
  try {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
      id: GOOWI_SELECTION_MENU_ID,
      title: "View in GooWi",
      contexts: ["selection"]
    });
  } catch {
    // Context menus may be unavailable on some browser-controlled surfaces.
  }
}

function isLikelyProtectedReaderSurface(info, tab) {
  const urls = [info?.pageUrl, info?.frameUrl, tab?.url]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return urls.some((rawUrl) => {
    const lower = rawUrl.toLowerCase();

    if (/^(?:about:|resource:|chrome:|view-source:)/.test(lower)) return true;
    if (lower.includes("pdf.js")) return true;
    if (/\.pdf(?:$|[?#])/.test(lower)) return true;

    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname === "addons.mozilla.org";
    } catch {
      return false;
    }
  });
}

async function openNativeSidebar(selection, tabId) {
  pendingNativeSidebarSelection = {
    selection,
    tabId,
    updatedAt: Date.now()
  };

  try {
    await browser.sidebarAction.open();
  } catch {
    return false;
  }

  // If the sidebar was already open this updates it immediately. If it is just
  // being created, sidebar content also requests the pending selection on load.
  try {
    await browser.runtime.sendMessage({
      type: "goowi:native-sidebar-selection",
      selection,
      tabId
    });
  } catch {
    // The newly opened sidebar may not have registered its listener yet.
  }

  return true;
}

async function showSelectionInTab(tabId, selection, info, tab) {
  const message = {
    type: "goowi:view-selection",
    selection
  };

  // Firefox's PDF.js viewer, Reader View, AMO, and other privileged surfaces
  // may expose the selection context menu while refusing extension injection.
  // Prefer the native sidebar immediately when the current surface is known to
  // be one of those cases so sidebarAction.open() remains directly tied to the
  // user's context-menu action.
  if (isLikelyProtectedReaderSurface(info, tab)) {
    await openNativeSidebar(selection, tabId);
    return;
  }

  try {
    await browser.tabs.sendMessage(tabId, message);
    return;
  } catch {
    // The reader is not loaded on this page yet. activeTab lets us inject it
    // only because the user explicitly invoked GooWi from the context menu.
  }

  try {
    await browser.scripting.insertCSS({
      target: { tabId },
      files: ["goowi.css"]
    });
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    // Fall back to the extension-owned Firefox sidebar if injection is refused.
    await openNativeSidebar(selection, tabId);
  }
}

browser.runtime.onInstalled.addListener(installSelectionContextMenu);
browser.runtime.onStartup.addListener(installSelectionContextMenu);
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info?.menuItemId !== GOOWI_SELECTION_MENU_ID || !tab?.id) return;
  const selection = cleanContextSelection(info.selectionText);
  if (!selection) return;
  showSelectionInTab(tab.id, selection, info, tab);
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "goowi:get-native-sidebar-selection") {
    return Promise.resolve(pendingNativeSidebarSelection);
  }

  if (message?.type === "goowi:close-native-sidebar") {
    return browser.sidebarAction.close()
      .then(() => ({ ok: true }))
      .catch(() => ({ ok: false }));
  }

  if (message?.type === "goowi:open-reader-tab") {
    const query = String(message.query || "").trim().slice(0, 500);
    if (!query) return Promise.resolve({ ok: false });

    const language = String(message.language || "en").trim().slice(0, 16);
    const url = new URL(browser.runtime.getURL("reader.html"));
    url.searchParams.set("query", query);
    url.searchParams.set("language", language);

    return browser.tabs.create({ url: url.href })
      .then((tab) => ({ ok: true, tabId: tab?.id ?? null }))
      .catch(() => ({ ok: false }));
  }

  if (message?.type === "goowi:close-reader-tab") {
    const tabId = sender?.tab?.id;
    if (!tabId) return Promise.resolve({ ok: false });
    return browser.tabs.remove(tabId)
      .then(() => ({ ok: true }))
      .catch(() => ({ ok: false }));
  }

  if (message?.type === "goowi:lookup") {
    const query = String(message.query || "").trim().slice(0, 500);
    if (!query) {
      return Promise.resolve({ found: false });
    }

    const googleContexts = Array.isArray(message.googleContexts)
      ? message.googleContexts
      : (message.googleContext ? [message.googleContext] : []);

    return searchWikipedia(query, message.language, googleContexts)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "goowi:random") {
    return randomWikipedia(message.language)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "goowi:wikirace-target") {
    return randomWikipediaTitle(message.language, message.excludeTitle)
      .catch((error) => ({
        found: false,
        error: error instanceof Error ? error.message : String(error)
      }));
  }

  if (message?.type === "goowi:page") {
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
