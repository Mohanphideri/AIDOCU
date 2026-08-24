/**
 * services/questionClassifier.js
 *
 * Rule-based (regex) classifier for the *type* of a document question.
 * The type is used downstream by hybridRetrievalService to weight the
 * signals that matter for that kind of question (dates for WHEN, money
 * for HOW_MUCH, etc.) and by documentQueryService to decide whether to
 * format the answer as a list, a comparison, or a multi-part breakdown.
 */

const TYPES = [
  'MULTI_PART', 'COMPARE', 'TABLE_LOOKUP', 'LIST', 'SUMMARY', 'DEFINITION',
  'HOW_MANY', 'HOW_MUCH', 'NUMERIC', 'DATE', 'WHEN', 'WHO', 'WHERE', 'WHY',
  'HOW', 'WHICH', 'YES_NO', 'WHAT',
];

function splitConjunctiveParts(text) {
  // Detects "A, B and C" / "A, B, or C" style multi-part questions after
  // a wh-word, e.g. "What is the price, warranty and delivery time?"
  const match = text.match(/\b(?:what|which)\s+(?:is|are)\s+the\s+(.+?)\??$/i);
  if (!match) return null;
  const tail = match[1];
  // Needs at least one comma or "and"/"or" to count as multi-part.
  if (!/,| and | & | or /i.test(tail)) return null;
  const parts = tail
    .split(/,|\band\b|\bor\b|&/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && !/^(the|a|an)$/i.test(p));
  return parts.length >= 2 ? parts : null;
}

function classifyQuestion(rawQuestion) {
  const text = (rawQuestion || '').trim();
  const lower = text.toLowerCase();

  const multiParts = splitConjunctiveParts(text);
  if (multiParts) {
    return { type: 'MULTI_PART', parts: multiParts };
  }

  if (/\b(compare|comparison|versus|\bvs\.?\b|difference between|which is better)\b/i.test(lower)) {
    return { type: 'COMPARE' };
  }

  if (/^(is|are|does|do|did|was|were|can|could|will|would|has|have)\b/i.test(lower)) {
    return { type: 'YES_NO' };
  }

  if (/\bsummar(y|ize|ise)\b|\bkey points?\b|\boverview\b|\btl;?dr\b/i.test(lower)) {
    return { type: 'SUMMARY' };
  }

  if (/\bwhat\s+is\s+the\s+(price|cost|fee|warranty|value)\s+of\b|\bhow\s+much\s+(is|does|for)\b.*\b(product|item|plan)\b/i.test(lower)) {
    return { type: 'TABLE_LOOKUP' };
  }

  if (/^(what|which)\s+(are|is)\s+the\s+(list of\s+)?(\w+\s+){0,2}(steps|benefits|requirements|features|items|reasons|types|options|rules|terms)\b/i.test(lower)
      || /\blist\s+(all|the|out)\b/i.test(lower)) {
    return { type: 'LIST' };
  }

  if (/\bwhat\s+(is|are|does)\b.*\bmean\b|\bdefine\b|\bdefinition of\b|\bwhat\s+is\s+a\b/i.test(lower)) {
    return { type: 'DEFINITION' };
  }

  if (/\bhow\s+many\b/i.test(lower)) return { type: 'HOW_MANY' };
  if (/\bhow\s+much\b/i.test(lower)) return { type: 'HOW_MUCH' };

  // "What year/date was X founded/signed" reads as a WHEN question even
  // though it's phrased with "what" rather than the word "when".
  if (/\bwhen\b/i.test(lower) || /\b(what\s+(year|date|day))\b/i.test(lower)) return { type: 'WHEN' };
  if (/\bdate\b/i.test(lower)) return { type: 'DATE' };

  if (/^who\b|\bwho\s+(approved|created|founded|signed|owns|manages|leads)\b/i.test(lower)) return { type: 'WHO' };
  if (/^where\b|\blocated\b|\baddress\b/i.test(lower)) return { type: 'WHERE' };
  if (/^why\b/i.test(lower)) return { type: 'WHY' };
  if (/^how\b/i.test(lower)) return { type: 'HOW' };
  if (/^which\b/i.test(lower)) return { type: 'WHICH' };

  if (/\d/.test(lower) && /\b(number|amount|total|count)\b/i.test(lower)) return { type: 'NUMERIC' };

  return { type: 'WHAT' };
}

module.exports = { classifyQuestion, TYPES };
