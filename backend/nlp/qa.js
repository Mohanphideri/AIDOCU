/**
 * nlp/qa.js — extractive question answering.
 *
 * Pipeline (matches the spec exactly):
 *   normalize question -> strip stopwords/keywords -> BM25 search over
 *   chunks -> TF-IDF cosine re-rank -> pick best chunk -> pick best
 *   sentence within that chunk -> return the sentence + its source page.
 *
 * No generation happens. If nothing clears the relevance threshold, the
 * engine returns null and the route responds with the required fallback
 * message instead of a fabricated answer.
 */
const { splitSentences, tokenizeNoStop } = require('./preprocess');
const { buildBm25Index, queryBm25 } = require('./bm25');
const { buildTfIdf, queryTfIdf } = require('./tfidf');

const RELEVANCE_FLOOR = 0.06;

function answerQuestion(question, chunks) {
  // chunks: [{ text, page, section }]
  if (!chunks.length) return null;
  const chunkTexts = chunks.map((c) => c.text);

  const bm25Index = buildBm25Index(chunkTexts);
  const bm25Scores = queryBm25(question, bm25Index);

  const tfidfIndex = buildTfIdf(chunkTexts);
  const tfidfScores = queryTfIdf(question, chunkTexts, tfidfIndex);

  const maxBm25 = Math.max(...bm25Scores.map((s) => s.score), 1e-6);
  const combined = chunkTexts.map((_, i) => ({
    index: i,
    score: (bm25Scores[i].score / maxBm25) * 0.6 + tfidfScores[i].score * 0.4,
  }));

  combined.sort((a, b) => b.score - a.score);
  const topChunks = combined.slice(0, 3).filter((c) => c.score > 0);
  if (!topChunks.length || topChunks[0].score < RELEVANCE_FLOOR) return null;

  // Within the strongest chunks, find the single best sentence via a
  // fresh TF-IDF pass at sentence granularity.
  const candidateSentences = [];
  for (const { index: chunkIdx, score: chunkScore } of topChunks) {
    const chunk = chunks[chunkIdx];
    const sentences = splitSentences(chunk.text);
    for (const sentence of sentences) {
      candidateSentences.push({ sentence, chunk, chunkScore });
    }
  }
  if (!candidateSentences.length) return null;

  const sentTexts = candidateSentences.map((c) => c.sentence);
  const sentTfIdf = buildTfIdf(sentTexts);
  const sentScores = queryTfIdf(question, sentTexts, sentTfIdf);

  const qKeywords = new Set(tokenizeNoStop(question));
  const ranked = candidateSentences
    .map((c, i) => {
      const overlap = tokenizeNoStop(c.sentence).filter((t) => qKeywords.has(t)).length;
      return {
        ...c,
        overlap,
        sentSim: sentScores[i].score,
        score: sentScores[i].score * 0.7 + c.chunkScore * 0.2 + overlap * 0.02,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  // Require the winning sentence to actually share vocabulary with the
  // question (direct keyword overlap or non-trivial TF-IDF similarity).
  // Without this, very short documents (few chunks) can pass the
  // chunk-level relevance floor by default and return an unrelated
  // sentence instead of the required "not found" fallback.
  if (!best || best.score <= 0 || (best.sentSim < 0.12 && best.overlap < 2)) {
    return null;
  }

  // Pull 1-2 neighboring sentences from the same chunk for context.
  const chunkSentences = splitSentences(best.chunk.text);
  const bestIdx = chunkSentences.indexOf(best.sentence);
  const contextSentences = chunkSentences.slice(
    Math.max(0, bestIdx),
    Math.min(chunkSentences.length, bestIdx + 2)
  );

  return {
    answer: contextSentences.join(' '),
    confidence: Math.min(1, best.score),
    sources: [...new Set(topChunks.map((c) => chunks[c.index]))].map((c) => ({
      page: c.page,
      section: c.section || null,
      excerpt: c.text.slice(0, 220),
    })),
  };
}

module.exports = { answerQuestion };
