/**
 * services/intentRouter.js
 *
 * Deterministic, rule-based intent classifier that sits in front of the
 * document-retrieval pipeline. No ML model, no LLM — just pattern
 * matching over normalized text. This keeps routing explainable and
 * lets us skip BM25/TF-IDF entirely for greetings, thanks, and system
 * commands (which previously fell through to "I couldn't find that in
 * the document").
 *
 * Intents: GENERAL | DOCUMENT | SYSTEM | UNKNOWN
 */
const { tokenizeNoStop } = require('../nlp/preprocess');
const { matchGeneral } = require('./generalConversationService');

// System commands: PDF export / sharing. Mirrors (and extends) the
// PDF_COMMAND_RE already used client-side in Workspace.jsx so the
// backend agrees with the frontend about what counts as a command,
// even though the frontend still intercepts the PDF case locally.
const SYSTEM_PATTERNS = [
  { action: 'export_pdf', re: /\b(generate|make|create|export|download)\b.{0,20}\bpdf\b/i },
  { action: 'share_on', re: /\b(share|publish)\b.{0,25}\b(this\s+)?(conversation|chat|link)\b/i },
  { action: 'share_off', re: /\b(stop|disable|turn off|remove)\b.{0,20}\bshar(e|ing)\b/i },
];

function detectSystemCommand(text) {
  for (const { action, re } of SYSTEM_PATTERNS) {
    if (re.test(text)) return action;
  }
  return null;
}

/**
 * @param {string} message raw user text
 * @param {{ hasDocument: boolean }} context whether the conversation has a bound document
 */
function routeIntent(message, context = {}) {
  const text = (message || '').trim();
  if (!text) return { intent: 'UNKNOWN', reason: 'empty' };

  const systemAction = detectSystemCommand(text);
  if (systemAction) return { intent: 'SYSTEM', action: systemAction };

  const general = matchGeneral(text);
  if (general) return { intent: 'GENERAL', category: general.category, response: general.response };

  const meaningfulTokens = tokenizeNoStop(text);

  // A message with essentially no content words (e.g. "ok", "hmm", "...")
  // and no bound document isn't answerable either way.
  if (!meaningfulTokens.length) {
    return { intent: context.hasDocument ? 'DOCUMENT' : 'UNKNOWN', reason: 'low-signal' };
  }

  // Everything else is treated as a document question when a document is
  // bound to the conversation. Without a document, we still route it to
  // DOCUMENT so the existing "attach a document" fallback message fires —
  // this preserves current behavior exactly.
  return { intent: 'DOCUMENT' };
}

module.exports = { routeIntent, detectSystemCommand };
