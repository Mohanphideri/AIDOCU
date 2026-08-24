/**
 * Deterministic answer presentation layer.
 *
 * Retrieval stays extractive: every factual sentence comes from the document.
 * This module only adds structure, headings, spacing and list formatting so
 * answers are easier to read in the chat UI.
 */

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter(Boolean);
}

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = clean(item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatAnswer(answer, type) {
  const text = String(answer || '').trim();
  if (!text) return text;
  if (/^I couldn't find/i.test(text) || /^This document is still processing/i.test(text)) return text;

  // Already formatted by a higher-level formatter.
  if (/^#{1,3}\s/.test(text)) return text;

  if (type === 'LIST') {
    const items = text
      .split(/\n+/)
      .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean);
    return `### Answer\n\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n\n')}`;
  }

  if (type === 'COMPARE') {
    const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const blocks = [];
    let current = null;
    for (const line of lines) {
      if (!line.startsWith('-') && !line.startsWith('•')) {
        current = { title: line, body: [] };
        blocks.push(current);
      } else if (current) {
        current.body.push(line.replace(/^[-•]\s*/, ''));
      }
    }
    if (blocks.length >= 2) {
      return blocks.map((b) => `### ${b.title}\n\n${b.body.map((x) => `- ${x}`).join('\n')}`).join('\n\n');
    }
  }

  if (type === 'MULTI_PART') {
    const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const blocks = lines.map((line) => {
      const m = line.match(/^([^:]{2,80}):\s*(.+)$/);
      if (!m) return line;
      return `### ${m[1].trim()}\n\n${m[2].trim()}`;
    });
    return blocks.join('\n\n');
  }

  const sentences = unique(splitSentences(text));
  if (sentences.length <= 1) return `### Answer\n\n${text}`;

  const lead = sentences[0];
  const supporting = sentences.slice(1);
  return `### Answer\n\n${lead}\n\n### Key details\n\n${supporting.map((s) => `- ${s}`).join('\n\n')}`;
}

function formatSummary(summary, length = 'medium') {
  const sentences = unique(splitSentences(summary));
  if (!sentences.length) return '';
  const label = length === 'detailed' ? 'Detailed summary' : length === 'short' ? 'Short summary' : 'Summary';
  return `### ${label}\n\n${sentences.map((s) => `- ${s}`).join('\n\n')}`;
}

module.exports = { formatAnswer, formatSummary };
