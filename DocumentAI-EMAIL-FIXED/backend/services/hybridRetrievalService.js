/**
 * services/hybridRetrievalService.js
 *
 * Extends (does not replace) the existing BM25 + TF-IDF retrieval with
 * additional deterministic signals, combined into one final score:
 *
 *   finalScore = bm25*w1 + tfidf*w2 + phrase*w3 + keyword*w4
 *              + section*w5 + entity*w6 + questionType*w7 + table*w8
 *
 * All signals are 0-1 normalized before weighting so the weights below
 * are directly interpretable as relative importance.
 */
const { tokenizeNoStop, stem } = require('../nlp/preprocess');
const { buildBm25Index, queryBm25 } = require('../nlp/bm25');
const { buildTfIdf, queryTfIdf } = require('../nlp/tfidf');
const { extractEntities } = require('../nlp/entities');
const { expandQuery } = require('./queryExpansionService');

const WEIGHTS = {
  bm25: 0.24,
  tfidf: 0.18,
  expandedRetrieval: 0.12,
  phrase: 0.11,
  keyword: 0.12,
  section: 0.05,
  entity: 0.07,
  questionType: 0.07,
  fuzzyKeyword: 0.05,
  table: 0.03,
};

// Which entity buckets matter for a given question type — used to
// compute the "questionType" and "entity" signals.
const TYPE_ENTITY_MAP = {
  WHEN: 'dates', DATE: 'dates',
  HOW_MUCH: 'money', TABLE_LOOKUP: 'money',
  HOW_MANY: 'numbers', NUMERIC: 'numbers',
  WHO: 'person', WHERE: 'location',
};

function normalizeArray(scores) {
  const max = Math.max(...scores, 1e-9);
  return scores.map((s) => (max > 0 ? s / max : 0));
}

function phraseMatchScore(question, text) {
  const qStems = tokenizeNoStop(question).map(stem);
  if (qStems.length < 2) return 0;
  const tStems = tokenizeNoStop(text).map(stem);
  const tStr = ' ' + tStems.join(' ') + ' ';
  // Look for the longest contiguous run of question stems appearing in
  // order within the text's stem sequence (cheap n-gram containment).
  let longestRun = 0;
  for (let start = 0; start < qStems.length; start++) {
    for (let len = qStems.length - start; len > longestRun; len--) {
      const gram = ' ' + qStems.slice(start, start + len).join(' ') + ' ';
      if (tStr.includes(gram)) { longestRun = len; break; }
    }
  }
  return longestRun / qStems.length;
}

function keywordOverlapScore(qStems, chunkStems) {
  if (!qStems.length) return 0;
  const chunkSet = new Set(chunkStems);
  const hits = qStems.filter((t) => chunkSet.has(t)).length;
  return hits / qStems.length;
}


function editDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function fuzzyKeywordScore(qStems, chunkStems) {
  if (!qStems.length || !chunkStems.length) return 0;
  let hits = 0;
  for (const q of qStems) {
    if (chunkStems.includes(q)) { hits += 1; continue; }
    let matched = false;
    for (const c of chunkStems) {
      const maxLen = Math.max(q.length, c.length);
      if (maxLen >= 5 && editDistance(q, c) <= (maxLen >= 8 ? 2 : 1)) { matched = true; break; }
    }
    if (matched) hits += 0.65;
  }
  return Math.min(1, hits / qStems.length);
}

function sectionRelevanceScore(qStems, section) {
  if (!section) return 0;
  const sStems = new Set(tokenizeNoStop(section).map(stem));
  if (!sStems.size) return 0;
  const hits = qStems.filter((t) => sStems.has(t)).length;
  return Math.min(1, hits / Math.max(1, qStems.length) * 1.5);
}

function entityRelevanceScore(questionType, chunkText) {
  const bucket = TYPE_ENTITY_MAP[questionType];
  if (!bucket) return 0;
  const ents = extractEntities(chunkText);
  if (bucket === 'dates') return ents.dates.length ? 1 : 0;
  if (bucket === 'money') return ents.money.length || ents.percents.length ? 1 : 0;
  if (bucket === 'numbers') return ents.numbers.length ? 1 : 0;
  if (bucket === 'person') return ents.hasPersonHint || ents.properNouns.length ? 1 : 0;
  if (bucket === 'location') return ents.hasLocationHint ? 1 : 0;
  return 0;
}

/**
 * Score every chunk against the question using the full hybrid signal
 * set. Returns chunks ranked best-first with a per-signal breakdown
 * (useful for confidenceService and for debugging/tests).
 *
 * @param {string} question
 * @param {Array<{text:string, section?:string, chunkType?:string}>} chunks
 * @param {string} questionType from questionClassifier
 */
function hybridRetrieve(question, chunks, questionType = 'WHAT') {
  if (!chunks.length) return [];
  const chunkTexts = chunks.map((c) => c.text);

  const bm25Index = buildBm25Index(chunkTexts);
  const bm25Raw = queryBm25(question, bm25Index).map((s) => s.score);
  const bm25Norm = normalizeArray(bm25Raw);

  const tfidfIndex = buildTfIdf(chunkTexts);
  const tfidfScores = queryTfIdf(question, chunkTexts, tfidfIndex).map((s) => Math.min(1, s.score));

  // Run the same retrieval engines against a controlled synonym-expanded
  // query. This is an auxiliary recall signal: a synonym match can lift a
  // genuinely relevant chunk above the floor, but the literal query keeps
  // the stronger weight so expansion cannot dominate direct evidence.
  // Normalize common natural-language phrases before synonym expansion.
  // This improves questions such as "how do I get my money back?" when the
  // document uses the term "refund", without introducing a generative model.
  const normalizedQuestion = String(question || '')
    .replace(/\bget (?:my|your|the) money back\b/gi, 'refund')
    .replace(/\bpay (?:my|the) money back\b/gi, 'refund')
    .replace(/\bgive (?:me|us) (?:a )?refund\b/gi, 'refund')
    .replace(/\bend (?:my|the) subscription\b/gi, 'cancel subscription')
    .replace(/\bstop (?:my|the) subscription\b/gi, 'cancel subscription')
    .replace(/\bhow long does it take\b/gi, 'processing duration')
    .replace(/\bhow much time\b/gi, 'duration time')
    .replace(/\bproof of purchase\b/gi, 'purchase receipt')
    .replace(/\bmust i\b/gi, 'do i need')
    .replace(/\bdo i have to\b/gi, 'requirement');

  const { originalStems, expandedStems, expandedQueryText } = expandQuery(normalizedQuestion);
  const expandedBm25 = queryBm25(expandedQueryText, bm25Index).map((s) => s.score);
  const expandedBm25Norm = normalizeArray(expandedBm25);
  const expandedTfIdf = queryTfIdf(expandedQueryText, chunkTexts, tfidfIndex)
    .map((s) => Math.min(1, s.score));

  const allQStems = originalStems;
  const expandedQStems = [...originalStems, ...expandedStems];

  const results = chunks.map((chunk, i) => {
    const chunkStems = tokenizeNoStop(chunk.text).map(stem);
    const chunkStemSet = new Set(chunkStems);

    const keyword = keywordOverlapScore(allQStems, chunkStems);
    const expandedHits = expandedQStems.filter((t) => chunkStemSet.has(t)).length;
    // Keep the denominator tied to the original query. Otherwise a large
    // synonym group dilutes a single valid synonym hit almost to zero.
    const keywordExpanded = allQStems.length
      ? Math.min(1, expandedHits / allQStems.length)
      : 0;
    // Literal overlap remains strongest; synonym overlap is deliberately
    // capped so expansion widens recall without overpowering direct matches.
    const keywordScore = Math.max(keyword, keywordExpanded * 0.6);
    const expandedRetrieval = Math.max(expandedBm25Norm[i], expandedTfIdf[i]);

    const phrase = phraseMatchScore(normalizedQuestion, chunk.text);
    const section = sectionRelevanceScore(allQStems, chunk.section);
    const entity = entityRelevanceScore(questionType, chunk.text);
    const table = chunk.chunkType === 'table' && questionType === 'TABLE_LOOKUP' ? 1 : 0;
    const questionTypeScore = entity; // question-type match is expressed via entity presence

    const finalScore =
      bm25Norm[i] * WEIGHTS.bm25 +
      tfidfScores[i] * WEIGHTS.tfidf +
      expandedRetrieval * WEIGHTS.expandedRetrieval +
      phrase * WEIGHTS.phrase +
      keywordScore * WEIGHTS.keyword +
      fuzzyKeyword * WEIGHTS.fuzzyKeyword +
      section * WEIGHTS.section +
      entity * WEIGHTS.entity +
      questionTypeScore * WEIGHTS.questionType +
      table * WEIGHTS.table;

    return {
      index: i,
      chunk,
      score: finalScore,
      signals: { bm25: bm25Norm[i], tfidf: tfidfScores[i], expandedRetrieval, phrase, keyword: keywordScore, fuzzyKeyword, section, entity, questionType: questionTypeScore, table },
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}

module.exports = { hybridRetrieve, phraseMatchScore, keywordOverlapScore, WEIGHTS };
