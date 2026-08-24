/**
 * nlp/tfidf.js — classic TF-IDF over a set of "documents" (here: sentences
 * or chunks within one uploaded file). Pure statistics, no LLM.
 */
const { tokenizeNoStop, stem } = require('./preprocess');

function buildTermFrequency(tokens) {
  const tf = new Map();
  for (const raw of tokens) {
    const t = stem(raw);
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

/**
 * @param {string[]} docs raw text of each unit (sentence/paragraph/chunk)
 * @returns {{ vectors: Map[], idf: Map, vocab: Set }}
 */
function buildTfIdf(docs) {
  const tfList = docs.map((d) => buildTermFrequency(tokenizeNoStop(d)));
  const df = new Map();
  for (const tf of tfList) {
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const N = docs.length || 1;
  const idf = new Map();
  for (const [term, count] of df.entries()) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1); // smoothed idf
  }

  const vectors = tfList.map((tf) => {
    const vec = new Map();
    let normSq = 0;
    for (const [term, count] of tf.entries()) {
      const weight = count * (idf.get(term) || 0);
      vec.set(term, weight);
      normSq += weight * weight;
    }
    const norm = Math.sqrt(normSq) || 1;
    for (const [term, w] of vec.entries()) vec.set(term, w / norm);
    return vec;
  });

  return { vectors, idf, vocab: new Set(df.keys()) };
}

function cosineSimilarity(vecA, vecB) {
  const [small, big] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];
  let dot = 0;
  for (const [term, w] of small.entries()) {
    const w2 = big.get(term);
    if (w2) dot += w * w2;
  }
  return dot; // vectors are already L2-normalized
}

/** Score a free-text query against every doc vector using TF-IDF + cosine similarity. */
function queryTfIdf(query, docs, tfidfIndex) {
  const { idf } = tfidfIndex;
  const qTf = buildTermFrequency(tokenizeNoStop(query));
  const qVec = new Map();
  let normSq = 0;
  for (const [term, count] of qTf.entries()) {
    const weight = count * (idf.get(term) || 0);
    if (weight > 0) {
      qVec.set(term, weight);
      normSq += weight * weight;
    }
  }
  const norm = Math.sqrt(normSq) || 1;
  for (const [term, w] of qVec.entries()) qVec.set(term, w / norm);

  return tfidfIndex.vectors.map((vec, i) => ({
    index: i,
    score: cosineSimilarity(qVec, vec),
  }));
}

module.exports = { buildTfIdf, cosineSimilarity, queryTfIdf, buildTermFrequency };
