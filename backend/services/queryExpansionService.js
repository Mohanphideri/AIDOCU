/**
 * services/queryExpansionService.js
 *
 * Expands a query with a small, controlled set of related terms so
 * retrieval catches phrasing differences ("cancel" vs "termination")
 * without over-expanding and hurting precision. Expansion terms are
 * tagged with a lower weight downstream — they widen recall but never
 * outweigh a direct match.
 */
const { tokenizeNoStop, stem } = require('../nlp/preprocess');
const { relatedStems } = require('../nlp/synonyms');

/**
 * @param {string} query
 * @returns {{ originalStems: string[], expandedStems: string[] }}
 *   originalStems: stems of the literal query terms.
 *   expandedStems: additional related stems pulled in via the synonym
 *   dictionary (does not include originalStems, already deduped).
 */
function expandQuery(query) {
  const tokens = tokenizeNoStop(query);
  const originalStems = [...new Set(tokens.map(stem))];
  const expandedSet = new Set();

  for (const s of originalStems) {
    for (const related of relatedStems(s)) {
      if (!originalStems.includes(related)) expandedSet.add(related);
    }
  }

  const expandedStems = [...expandedSet];
  const expandedQueryText = [...originalStems, ...expandedStems].join(' ');
  return { originalStems, expandedStems, expandedQueryText };
}

/** Builds an expanded query string (original + synonyms) suitable for
 * feeding back into BM25/TF-IDF as an auxiliary signal. */
function buildExpandedQueryText(query) {
  return expandQuery(query).expandedQueryText;
}

module.exports = { expandQuery, buildExpandedQueryText };
