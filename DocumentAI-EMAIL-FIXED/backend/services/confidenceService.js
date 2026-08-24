/**
 * services/confidenceService.js
 *
 * Turns retrieval signals into a HIGH/MEDIUM/LOW confidence label.
 * Purely arithmetic — no model involved. Used to decide the answer
 * fallback wording (section 17/21 of the spec): low/near-zero
 * confidence must surface the "couldn't find" message rather than a
 * shaky guess.
 */

const THRESHOLDS = { high: 0.55, medium: 0.28 };

/**
 * @param {object} signals
 * @param {number} signals.bm25 normalized 0-1
 * @param {number} signals.tfidf 0-1 cosine similarity
 * @param {number} signals.phraseMatch 0-1
 * @param {number} signals.questionTypeMatch 0-1
 * @param {number} signals.entityMatch 0-1
 * @param {number} signals.keywordOverlap 0-1
 * @param {number} signals.expandedRetrieval 0-1 — auxiliary BM25/TF-IDF
 *   retrieval score from controlled synonym expansion.
 * @param {number} signals.synonymOverlap count of expansion-only terms found
 *   in the selected answer sentence.
 */
function scoreConfidence(signals = {}) {
  const {
    bm25 = 0,
    tfidf = 0,
    phraseMatch = 0,
    questionTypeMatch = 0,
    entityMatch = 0,
    keywordOverlap = 0,
    expandedRetrieval = 0,
    synonymOverlap = 0,
  } = signals;

  const composite =
    bm25 * 0.23 +
    tfidf * 0.22 +
    phraseMatch * 0.13 +
    questionTypeMatch * 0.13 +
    entityMatch * 0.09 +
    keywordOverlap * 0.08 +
    expandedRetrieval * 0.12;

  let level = 'LOW';
  if (composite >= THRESHOLDS.high) level = 'HIGH';
  else if (composite >= THRESHOLDS.medium) level = 'MEDIUM';

  // A controlled synonym hit can legitimately have little literal BM25/TF-IDF
  // overlap. If the expanded retriever is strong and the candidate contains
  // at least half of the original query's evidence, do not discard it solely
  // because the literal-vocabulary confidence composite is below the floor.
  if (level === 'LOW' && expandedRetrieval >= 0.85 && synonymOverlap >= 1) {
    level = 'MEDIUM';
  }

  return { level, composite: Math.min(1, composite) };
}

function fallbackMessage(level, hasRelatedButWeak) {
  if (level === 'LOW') {
    return hasRelatedButWeak
      ? "I found related information, but the document doesn't provide enough evidence to answer that question confidently."
      : "I couldn't find that information in the uploaded document.";
  }
  return null;
}

module.exports = { scoreConfidence, fallbackMessage, THRESHOLDS };
