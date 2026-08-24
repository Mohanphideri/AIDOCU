/**
 * nlp/preprocess.js
 * Traditional NLP preprocessing: no generative models involved anywhere
 * in this file or any other file under nlp/.
 */
const STOPWORDS = new Set(
  ('a an the and or but if while is are was were be been being do does did ' +
   'have has had having i you he she it we they me him her us them my your ' +
   'his its our their this that these those to of in on at for with as by ' +
   'from about into over after before between out up down off again further ' +
   'then once here there when where why how all any both each few more most ' +
   'other some such no nor not only own same so than too very s t can will ' +
   'just don should now also would could shall may might must let ' +
   // Extended list of high-frequency, low-information general nouns/verbs.
   // In small documents a single rare-but-generic word can otherwise
   // dominate a TF-IDF cosine score and trigger false-positive answer
   // matches, so these are treated as stopwords for retrieval purposes.
   'time way thing part case use used make made get got go going come came ' +
   'need needs want wants like likes take takes given given please')
    .split(' ')
);

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Lightweight sentence splitter — handles common abbreviations reasonably.
function splitSentences(text) {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  const protectedText = normalized.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|St|No)\./g,
    (m) => m.replace('.', '§')
  );
  const raw = protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“])/)
    .map((s) => s.replace(/§/g, '.').trim())
    .filter((s) => s.length > 1);
  return raw.length ? raw : [normalized];
}

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || []);
}

function tokenizeNoStop(text) {
  return tokenize(text).filter((t) => !STOPWORDS.has(t) && t.length > 1);
}

// Very small heuristic stemmer (suffix stripping) — avoids pulling in
// another dependency while still folding plurals/common verb forms.
function stem(word) {
  return word
    .replace(/(ing|edly|ed|ies|es|s)$/,'')
    .replace(/^$/, word);
}

function detectLanguage(text) {
  // Heuristic-only language guess (no external service): checks for the
  // density of common English function words.
  const tokens = tokenize(text).slice(0, 500);
  if (!tokens.length) return 'unknown';
  const hits = tokens.filter((t) => STOPWORDS.has(t)).length;
  return hits / tokens.length > 0.08 ? 'en' : 'unknown';
}

module.exports = {
  STOPWORDS,
  cleanText,
  splitSentences,
  splitParagraphs,
  tokenize,
  tokenizeNoStop,
  stem,
  detectLanguage,
};
