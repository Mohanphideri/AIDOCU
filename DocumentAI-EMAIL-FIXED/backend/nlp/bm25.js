/**
 * nlp/bm25.js — Okapi BM25 ranking over sentence/chunk-level documents.
 * Standard formula, k1 and b tunable. No LLM involved.
 */
const { tokenizeNoStop, stem } = require('./preprocess');

const K1 = 1.5;
const B = 0.75;

function buildBm25Index(docs) {
  const tokenized = docs.map((d) => tokenizeNoStop(d).map(stem));
  const df = new Map();
  let totalLen = 0;

  tokenized.forEach((tokens) => {
    totalLen += tokens.length;
    const seen = new Set(tokens);
    for (const term of seen) df.set(term, (df.get(term) || 0) + 1);
  });

  const N = docs.length || 1;
  const avgdl = totalLen / N || 1;
  const idf = new Map();
  for (const [term, n] of df.entries()) {
    idf.set(term, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  }

  const termFreqs = tokenized.map((tokens) => {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return tf;
  });

  return { termFreqs, idf, avgdl, lengths: tokenized.map((t) => t.length) };
}

function queryBm25(query, bm25Index) {
  const qTerms = tokenizeNoStop(query).map(stem);
  const { termFreqs, idf, avgdl, lengths } = bm25Index;

  return termFreqs.map((tf, i) => {
    let score = 0;
    const dl = lengths[i] || 1;
    for (const term of qTerms) {
      const f = tf.get(term) || 0;
      if (!f) continue;
      const termIdf = idf.get(term) || 0;
      score += termIdf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / avgdl))));
    }
    return { index: i, score };
  });
}

module.exports = { buildBm25Index, queryBm25 };
