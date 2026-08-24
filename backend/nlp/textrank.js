/**
 * nlp/textrank.js — TextRank (PageRank over a sentence similarity graph)
 * for fully extractive summarization. Sentences are scored and selected
 * verbatim from the source document; nothing is generated.
 */
const { buildTfIdf, cosineSimilarity } = require('./tfidf');

function buildSimilarityGraph(sentences) {
  const { vectors } = buildTfIdf(sentences);
  const n = sentences.length;
  const graph = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(vectors[i], vectors[j]);
      graph[i][j] = sim;
      graph[j][i] = sim;
    }
  }
  return graph;
}

/** Power-iteration PageRank over the sentence similarity graph. */
function textRank(sentences, { damping = 0.85, iterations = 40, tolerance = 1e-5 } = {}) {
  const n = sentences.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  const graph = buildSimilarityGraph(sentences);
  const outSums = graph.map((row) => row.reduce((a, b) => a + b, 0));
  let scores = new Array(n).fill(1 / n);

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j || graph[j][i] === 0 || outSums[j] === 0) continue;
        next[i] += damping * (graph[j][i] / outSums[j]) * scores[j];
      }
    }
    const delta = next.reduce((sum, v, i) => sum + Math.abs(v - scores[i]), 0);
    scores = next;
    if (delta < tolerance) break;
  }
  return scores;
}

module.exports = { textRank, buildSimilarityGraph };
