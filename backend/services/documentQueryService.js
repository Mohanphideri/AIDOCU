/**
 * services/documentQueryService.js
 *
 * The upgraded document-answering pipeline. Wraps (does not remove) the
 * original nlp/qa.js behavior with:
 *   - question classification (questionClassifier)
 *   - query expansion (queryExpansionService)
 *   - hybrid multi-signal retrieval (hybridRetrievalService)
 *   - table row/column lookup (tableExtractionService)
 *   - multi-part / comparison / list formatting
 *   - HIGH/MEDIUM/LOW confidence (confidenceService)
 *
 * Still fully extractive/deterministic — every answer sentence is
 * copied from the source document, nothing is generated.
 */
const { splitSentences, tokenizeNoStop, stem } = require('../nlp/preprocess');
const { buildTfIdf, queryTfIdf } = require('../nlp/tfidf');
const { classifyQuestion } = require('./questionClassifier');
const { hybridRetrieve } = require('./hybridRetrievalService');
const { extractTables, lookupInTables } = require('./tableExtractionService');
const { scoreConfidence, fallbackMessage } = require('./confidenceService');
const { extractEntities } = require('../nlp/entities');
const { expandQuery } = require('./queryExpansionService');

const RELEVANCE_FLOOR = 0.09;
const NOT_FOUND = "I couldn't find that information in the uploaded document.";

function buildSourcesFromChunks(chunks) {
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    const key = `${c.page}::${c.section || ''}::${c.text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ page: c.page, section: c.section || null, excerpt: c.text.slice(0, 220) });
  }
  return sources;
}

/** Pick the best supporting sentence(s) from the top-ranked chunks. */
function pickBestSentence(question, topResults, questionType = classifyQuestion(question).type) {
  const candidateSentences = [];
  for (const r of topResults) {
    const sentences = splitSentences(r.chunk.text);
    for (const sentence of sentences) candidateSentences.push({ sentence, chunk: r.chunk, chunkScore: r.score });
  }
  if (!candidateSentences.length) return null;

  const sentTexts = candidateSentences.map((c) => c.sentence);
  const sentTfIdf = buildTfIdf(sentTexts);
  const sentScores = queryTfIdf(question, sentTexts, sentTfIdf);
  const qKeywords = new Set(tokenizeNoStop(question).map(stem));
  const { originalStems, expandedStems } = expandQuery(question);
  const expandedKeywords = new Set([...originalStems, ...expandedStems]);
  const literalKeywords = new Set(originalStems);

  const ranked = candidateSentences
    .map((c, i) => {
      const sentenceStems = tokenizeNoStop(c.sentence).map(stem);
      const literalOverlap = sentenceStems.filter((t) => literalKeywords.has(t)).length;
      const synonymOverlap = sentenceStems.filter((t) => expandedKeywords.has(t) && !literalKeywords.has(t)).length;
      // Keep synonym evidence weaker than literal evidence, but allow it to
      // rescue a valid paraphrase such as "cancel contract" -> "terminate
      // agreement" at sentence-selection time as well as chunk retrieval.
      const overlap = literalOverlap + synonymOverlap * 0.5;
      const sentSim = sentScores[i].score;

      // WHEN questions are especially prone to a bad choice when a chunk
      // contains two sentences (for example, one sentence states a date and
      // the next discusses an unrelated result). Give the sentence that
      // actually contains temporal evidence a small, type-aware boost.
      let typeBonus = 0;
      if (questionType === 'WHEN') {
        const hasDate = /\b(?:19|20)\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(c.sentence);
        const hasTemporalCue = /\b(?:founded|established|created|started|launched|signed|approved|occurred|happened|began|ended|effective|dated|year|date|day)\b/i.test(c.sentence);
        const entities = extractEntities(c.sentence);
        const hasEntityDate = entities.dates && entities.dates.length > 0;
        if (hasDate || hasEntityDate) typeBonus += 0.10;
        if (hasTemporalCue) typeBonus += 0.05;
      }

      return {
        ...c,
        overlap,
        literalOverlap,
        synonymOverlap,
        sentSim,
        typeBonus,
        score: sentSim * 0.62 + c.chunkScore * 0.18 + Math.min(1, overlap / 4) * 0.15 + typeBonus
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score <= 0 ||
      (best.sentSim < 0.1 && best.literalOverlap < 2 && best.synonymOverlap < 1)) return null;

  const chunkSentences = splitSentences(best.chunk.text);
  const bestIdx = chunkSentences.indexOf(best.sentence);
  // For temporal/date questions, return only the winning sentence. A
  // two-sentence chunk often contains a correct date statement followed by
  // an unrelated event; adding the neighbour would make a correct sentence
  // picker look like it selected the wrong evidence.
  const contextSentences = (questionType === 'WHEN' || questionType === 'DATE')
    ? [best.sentence]
    : chunkSentences.slice(Math.max(0, bestIdx), Math.min(chunkSentences.length, bestIdx + 2));

  return { text: contextSentences.join(' '), best, contextSentences };
}

/** Splits a single sentence like "Benefits include: health insurance,
 * paid time off, and remote work." into discrete comma-separated items,
 * when it reads as an inline enumeration. Returns null if it doesn't. */
function splitInlineEnumeration(sentence) {
  const m = sentence.match(/:\s*(.+)$/) || sentence.match(/\b(?:include[s]?|comprise[s]?|are|is)\s+(.+)$/i);
  if (!m) return null;
  const tail = m[1].replace(/[.]$/, '');
  if (!/,| and /i.test(tail)) return null;
  const items = tail
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  return items.length >= 2 ? items : null;
}

/** Gather several distinct list items (for LIST-type questions) instead
 * of a single best sentence — either an inline enumeration within one
 * sentence, or several discrete sentences/bullets across the top chunks. */
function pickListSentences(question, topResults, max = 10) {
  const qKeywords = new Set(tokenizeNoStop(question).map(stem));
  const items = [];
  const seen = new Set();

  for (const r of topResults) {
    const sentences = splitSentences(r.chunk.text);
    for (const sentence of sentences) {
      const overlap = tokenizeNoStop(sentence).map(stem).filter((t) => qKeywords.has(t)).length;
      if (overlap < 1) continue;

      const inline = splitInlineEnumeration(sentence);
      if (inline) {
        for (const it of inline) {
          const norm = it.toLowerCase();
          if (!seen.has(norm)) { items.push(it); seen.add(norm); }
        }
        continue;
      }

      const norm = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(norm) || norm.length < 8) continue;
      // Enumeration cues: numbered/bulleted lines, or sentences that
      // read like a single discrete item (short, no "however"/contrast).
      const looksLikeItem = /^(\d+[.)]|[-•*])\s+/.test(sentence.trim()) || sentence.split(' ').length <= 25;
      if (looksLikeItem) {
        items.push(sentence.replace(/^(\d+[.)]|[-•*])\s+/, '').trim());
        seen.add(norm);
      }
      if (items.length >= max) break;
    }
    if (items.length >= max) break;
  }
  return items.slice(0, max);
}

/** Attempt a table-lookup answer across every chunk's detected tables. */
function tryTableLookup(question, chunks) {
  let best = null;
  for (const chunk of chunks) {
    const tables = extractTables(chunk.text);
    if (!tables.length) continue;
    const hit = lookupInTables(question, tables);
    if (hit && (!best || hit.score > best.score)) {
      best = { ...hit, page: chunk.page, section: chunk.section };
    }
  }
  return best;
}

/** Core single-question answer (used directly, and as a building block
 * for MULTI_PART / COMPARE questions). */
function answerSingle(question, chunks, questionTypeOverride) {
  if (!chunks.length) return null;

  const questionType = questionTypeOverride || classifyQuestion(question).type;

  // Table lookup takes priority when it produces a confident hit —
  // structured row/column evidence beats generic sentence retrieval.
  const tableHit = tryTableLookup(question, chunks);
  if (tableHit && tableHit.score >= 3) {
    return {
      answer: `${tableHit.rowLabel} — ${tableHit.column}: ${tableHit.value}.`,
      confidence: 'HIGH',
      sources: [{ page: tableHit.page, section: tableHit.section || null, excerpt: tableHit.headers.join(' | ') }],
      type: questionType,
    };
  }

  const ranked = hybridRetrieve(question, chunks, questionType);
  const topResults = ranked.slice(0, 3).filter((r) => r.score > 0);
  if (!topResults.length || topResults[0].score < RELEVANCE_FLOOR) {
    return { answer: NOT_FOUND, confidence: 'LOW', sources: [], type: questionType, matched: false };
  }

  if (questionType === 'LIST') {
    const items = pickListSentences(question, topResults);
    const conf = scoreConfidence({ ...topResults[0].signals, keywordOverlap: topResults[0].signals.keyword });
    if (!items.length) {
      const fallback = pickBestSentence(question, topResults, questionType);
      if (!fallback) return { answer: NOT_FOUND, confidence: 'LOW', sources: [], type: questionType, matched: false };
      return {
        answer: fallback.text,
        confidence: conf.level,
        sources: buildSourcesFromChunks(topResults.map((r) => r.chunk)),
        type: questionType,
      };
    }
    return {
      answer: items.map((it, i) => `${i + 1}. ${it}`).join('\n'),
      confidence: conf.level,
      sources: buildSourcesFromChunks(topResults.map((r) => r.chunk)),
      type: questionType,
    };
  }

  const picked = pickBestSentence(question, topResults, questionType);
  if (!picked) return { answer: NOT_FOUND, confidence: 'LOW', sources: [], type: questionType, matched: false };

  const conf = scoreConfidence({
    bm25: topResults[0].signals.bm25,
    tfidf: topResults[0].signals.tfidf,
    phraseMatch: topResults[0].signals.phrase,
    questionTypeMatch: topResults[0].signals.questionType,
    entityMatch: topResults[0].signals.entity,
    keywordOverlap: topResults[0].signals.keyword || 0,
    expandedRetrieval: topResults[0].signals.expandedRetrieval || 0,
    synonymOverlap: picked.best.synonymOverlap || 0,
  });

  if (conf.level === 'LOW') {
    return { answer: fallbackMessage('LOW', true), confidence: 'LOW', sources: [], type: questionType, matched: false };
  }

  return {
    answer: picked.text,
    confidence: conf.level,
    sources: buildSourcesFromChunks(topResults.map((r) => r.chunk)),
    type: questionType,
  };
}

/** Split a comparison question into its two subjects, e.g.
 * "Compare Plan A and Plan B" -> ["Plan A", "Plan B"]. */
function splitComparisonSubjects(question) {
  let m = question.match(/compare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)[.?!]?$/i);
  if (!m) m = question.match(/(.+?)\s+(?:vs\.?|versus)\s+(.+?)[.?!]?$/i);
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}

function answerComparison(question, chunks) {
  const subjects = splitComparisonSubjects(question);
  if (!subjects) {
    // Fall back to a plain answer if we can't parse the two subjects.
    return answerSingle(question, chunks, 'COMPARE');
  }
  const [a, b] = subjects;
  const resultA = answerSingle(`What is ${a}? ${question}`, chunks, 'WHAT');
  const resultB = answerSingle(`What is ${b}? ${question}`, chunks, 'WHAT');

  const notFoundA = !resultA || resultA.answer === NOT_FOUND || resultA.confidence === 'LOW';
  const notFoundB = !resultB || resultB.answer === NOT_FOUND || resultB.confidence === 'LOW';

  if (notFoundA && notFoundB) {
    return { answer: NOT_FOUND, confidence: 'LOW', sources: [], type: 'COMPARE', matched: false };
  }

  const lines = [];
  lines.push(a);
  lines.push(notFoundA ? '- No information found.' : `- ${resultA.answer}`);
  lines.push('');
  lines.push(b);
  lines.push(notFoundB ? '- No information found.' : `- ${resultB.answer}`);

  const sources = [...(notFoundA ? [] : resultA.sources), ...(notFoundB ? [] : resultB.sources)];
  const confLevel = notFoundA || notFoundB ? 'MEDIUM' : 'HIGH';

  return { answer: lines.join('\n'), confidence: confLevel, sources, type: 'COMPARE' };
}

function answerMultiPart(question, chunks, parts) {
  const results = parts.map((part) => ({ part, result: answerSingle(part, chunks, undefined) }));
  const anyFound = results.some((r) => r.result && r.result.answer !== NOT_FOUND && r.result.confidence !== 'LOW');

  if (!anyFound) {
    return { answer: NOT_FOUND, confidence: 'LOW', sources: [], type: 'MULTI_PART', matched: false };
  }

  const lines = results.map(({ part, result }) => {
    const label = part.charAt(0).toUpperCase() + part.slice(1);
    const value = (!result || result.answer === NOT_FOUND || result.confidence === 'LOW') ? 'Not found in document.' : result.answer;
    return `${label}: ${value}`;
  });

  const sources = results.flatMap(({ result }) => (result && result.sources ? result.sources : []));
  const anyLow = results.some((r) => !r.result || r.result.confidence === 'LOW');

  return { answer: lines.join('\n'), confidence: anyLow ? 'MEDIUM' : 'HIGH', sources, type: 'MULTI_PART' };
}

/**
 * Main entry point. chunks: [{ text, page, section, chunkType }]
 * Returns null only when there are no chunks at all (mirrors the
 * original nlp/qa.js contract so callers' existing fallback branches
 * keep working unmodified).
 */
function answerDocumentQuestion(question, chunks) {
  if (!chunks.length) return null;
  const classification = classifyQuestion(question);

  let result;
  if (classification.type === 'MULTI_PART') {
    result = answerMultiPart(question, chunks, classification.parts);
  } else if (classification.type === 'COMPARE') {
    result = answerComparison(question, chunks);
  } else {
    result = answerSingle(question, chunks, classification.type);
  }

  if (!result) return null;
  return {
    answer: result.answer,
    sources: result.sources || [],
    confidence: result.confidence,
    type: result.type,
    matched: result.answer !== NOT_FOUND,
  };
}

module.exports = { answerDocumentQuestion, answerSingle, NOT_FOUND };
