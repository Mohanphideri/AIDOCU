/**
 * nlp/summarizer.js — extractive summarization (TextRank + TF-IDF).
 * Every summary sentence is copied verbatim from the source document.
 */
const { splitSentences } = require('./preprocess');
const { textRank } = require('./textrank');
const { buildTfIdf } = require('./tfidf');

const LENGTH_RATIOS = { short: 0.08, medium: 0.16, detailed: 0.28 };
const LENGTH_MIN = { short: 3, medium: 5, detailed: 8 };
const LENGTH_MAX = { short: 5, medium: 10, detailed: 18 };

function tfidfSentenceWeight(sentences) {
  const { vectors } = buildTfIdf(sentences);
  return vectors.map((v) => {
    let sum = 0;
    for (const w of v.values()) sum += w;
    return sum;
  });
}

function summarize(text, length = 'medium') {
  const sentences = splitSentences(text).filter((s) => s.split(' ').length >= 4);
  if (sentences.length === 0) {
    return { summary: '', sentences: [], usedSentenceIndexes: [] };
  }

  const rankScores = textRank(sentences);
  const tfidfScores = tfidfSentenceWeight(sentences);

  // Position bias: sentences near the start of a document/section carry
  // slightly more topical weight — a common, well-established heuristic
  // in extractive summarization (lead bias), applied gently.
  const combined = sentences.map((_, i) => {
    const posBoost = 1 / Math.sqrt(i + 1.4);
    const lengthBoost = Math.min(1, sentences[i].split(/\s+/).length / 18);
    return rankScores[i] * 0.52 + tfidfScores[i] * 0.28 + posBoost * 0.12 + lengthBoost * 0.08;
  });

  const ratio = LENGTH_RATIOS[length] ?? LENGTH_RATIOS.medium;
  const min = LENGTH_MIN[length] ?? LENGTH_MIN.medium;
  const max = LENGTH_MAX[length] ?? LENGTH_MAX.medium;
  const targetCount = Math.min(max, Math.max(min, Math.round(sentences.length * ratio)), sentences.length);

  const rankedCandidates = combined
    .map((score, index) => ({ index, score }))
    .sort((a, b) => b.score - a.score);

  const chosen = [];
  const chosenTokens = [];
  for (const candidate of rankedCandidates) {
    if (chosen.length >= targetCount) break;
    const tokens = new Set(sentences[candidate.index].toLowerCase().match(/[a-z0-9]+/g) || []);
    let tooSimilar = false;
    for (const prev of chosenTokens) {
      const overlap = [...tokens].filter((t) => prev.has(t)).length / Math.max(1, Math.min(tokens.size, prev.size));
      if (overlap > 0.72) { tooSimilar = true; break; }
    }
    if (!tooSimilar) {
      chosen.push(candidate);
      chosenTokens.push(tokens);
    }
  }
  // If diversity filtering was too aggressive, fill remaining slots.
  for (const candidate of rankedCandidates) {
    if (chosen.length >= targetCount) break;
    if (!chosen.some((x) => x.index === candidate.index)) chosen.push(candidate);
  }
  const ranked = chosen.sort((a, b) => a.index - b.index); // reading order

  const summarySentences = ranked.map((r) => sentences[r.index]);
  return {
    summary: summarySentences.join(' '),
    sentences: summarySentences,
    usedSentenceIndexes: ranked.map((r) => r.index),
  };
}

module.exports = { summarize };
