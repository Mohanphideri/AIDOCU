/**
 * nlp/keywords.js — keyword extraction via TF-IDF + frequency, and
 * key-point extraction via TextRank sentence ranking (a shorter,
 * higher-threshold cousin of the summarizer).
 */
const { tokenizeNoStop, splitSentences, stem } = require('./preprocess');
const { buildTfIdf } = require('./tfidf');
const { textRank } = require('./textrank');

function extractKeywords(text, count = 12) {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];

  const { vectors, idf } = buildTfIdf(sentences);

  // Aggregate TF-IDF weight per term across the whole document, plus raw
  // frequency, to surface terms that are both distinctive and common.
  const aggregate = new Map();
  const rawFreq = new Map();
  for (const token of tokenizeNoStop(text)) {
    const t = stem(token);
    rawFreq.set(t, (rawFreq.get(t) || 0) + 1);
  }
  for (const vec of vectors) {
    for (const [term, weight] of vec.entries()) {
      aggregate.set(term, (aggregate.get(term) || 0) + weight);
    }
  }

  // Recover a representative surface form (most frequent original token)
  // for each stem so the UI shows real words, not stems.
  const surfaceForms = new Map();
  for (const token of tokenizeNoStop(text)) {
    const t = stem(token);
    const bucket = surfaceForms.get(t) || new Map();
    bucket.set(token, (bucket.get(token) || 0) + 1);
    surfaceForms.set(t, bucket);
  }
  const bestSurface = (t) => {
    const bucket = surfaceForms.get(t);
    if (!bucket) return t;
    return [...bucket.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  const scored = [...aggregate.entries()]
    .map(([term, tfidfSum]) => ({
      term,
      display: bestSurface(term),
      score: tfidfSum * Math.log(2 + (rawFreq.get(term) || 0)),
      frequency: rawFreq.get(term) || 0,
    }))
    .filter((k) => k.display.length > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return scored.map((k) => ({ keyword: k.display, frequency: k.frequency }));
}

function extractKeyPoints(text, count = 5) {
  const sentences = splitSentences(text).filter((s) => s.split(' ').length >= 5);
  if (!sentences.length) return [];
  const scores = textRank(sentences);
  return scores
    .map((score, index) => ({ index, score, text: sentences[index] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((s, i) => ({ rank: i + 1, text: s.text }));
}

module.exports = { extractKeywords, extractKeyPoints };
