/**
 * services/generalConversationService.js
 *
 * Deterministic (no-LLM) responses for small talk and product FAQ.
 * Matching is pattern-based; responses are picked from a fixed set of
 * canned, friendly answers — nothing is generated on the fly.
 */

const GREETING_RE = /^(hi+|hello+|hey+|yo|good\s?(morning|afternoon|evening|night)|how'?s?\s?it\s?going|what'?s\s?up|sup|howdy|nice\s+to\s+meet\s+you)[!.\s]*$/i;
const THANKS_RE = /\b(thanks?( you)?( a lot| so much| very much)?|appreciate it|that'?s\s+(helpful|great|awesome)|much appreciated|thx|ty)\b/i;
const GOODBYE_RE = /^(bye+|goodbye|see\s?you(\s?later)?|good\s?night|take\s?care|later|cya)[!.\s]*$/i;
const HOW_ARE_YOU_RE = /\bhow\s?(are|r)\s?(you|u)\b/i;

const GREETING_RESPONSES = [
  "Hello! 👋 How can I help you today? You can ask me about your documents or chat with me.",
  "Hi there! 👋 I'm ready whenever you are — ask about a document or just say hello.",
  "Hey! 👋 What would you like to do — upload a document, ask a question, or just chat?",
];

const HOW_ARE_YOU_RESPONSES = [
  "I'm doing well, thanks for asking! Ready to help with your documents or answer questions. How are you?",
];

const THANKS_RESPONSES = [
  "You're welcome! 😊 I'm happy to help.",
  "Anytime! 😊 Let me know if there's anything else you need.",
];

const GOODBYE_RESPONSES = [
  "Goodbye! 👋 Come back anytime you need help with your documents.",
  "See you later! 👋 I'll be here when you need me.",
];

// Identity / capability / help FAQ. Keys are matched as loose regexes
// against the normalized message.
const FAQ = [
  {
    category: 'identity',
    re: /\b(what\s+are\s+you|who\s+are\s+you|what\s+is\s+document\s?ai|what\s+does\s+this\s+(app|application)\s+do)\b/i,
    response: "I'm DocumentAI, an assistant that combines general conversation with document intelligence. I read your uploaded documents (PDF, DOCX, TXT, CSV) and answer questions using search and extractive NLP — no external AI model, so every answer is grounded in your actual document text.",
  },
  {
    category: 'capabilities',
    re: /\bwhat\s+can\s+you\s+do\b|\byour\s+(capabilities|features)\b/i,
    response: "I can analyze your documents, answer questions about them, summarize content, extract key points and keywords, search across your documents, and generate or share conversation transcripts as PDF.",
  },
  {
    category: 'capability_pdf',
    re: /\bcan\s+you\s+(analyze|analyse|read|process)\s+(a\s+)?pdf\b/i,
    response: "Yes — I can process PDF files: extracting text, tables, and page structure so you can ask questions about them.",
  },
  {
    category: 'capability_docx',
    re: /\bcan\s+you\s+(analyze|analyse|read|process)\s+(a\s+)?docx\b|\bword\s+document/i,
    response: "Yes — DOCX (Word) files are supported. Upload one and I'll extract the text and tables so you can ask questions.",
  },
  {
    category: 'capability_csv',
    re: /\bcan\s+you\s+(read|analyze|analyse|process)\s+(a\s+)?csv\b/i,
    response: "Yes — I can read CSV files and answer questions about the data in them.",
  },
  {
    category: 'capability_summarize',
    re: /\bcan\s+you\s+summari[sz]e\b/i,
    response: "Yes — I can generate short, detailed, or bullet-point summaries of any processed document, using extractive ranking (TextRank) so every sentence comes straight from your document.",
  },
  {
    category: 'capability_qa',
    re: /\bcan\s+you\s+answer\s+questions?\s+from\s+(a\s+|the\s+)?document/i,
    response: "Yes — that's my core feature. Ask anything about an uploaded document and I'll search it and return the most relevant, sourced answer.",
  },
  {
    category: 'capability_search',
    re: /\bcan\s+you\s+search\s+(my\s+)?documents?\b/i,
    response: "Yes — you can search across all your uploaded documents by title or content from the Documents page.",
  },
  {
    category: 'capability_export',
    re: /\bcan\s+you\s+generate\s+(a\s+)?pdf\b/i,
    response: "Yes — you can export any conversation as a PDF at any time, either from the export button or by typing something like \"generate pdf\".",
  },
  {
    category: 'capability_share',
    re: /\bcan\s+i\s+share\s+a\s+conversation\b/i,
    response: "Yes — you can turn on link sharing for any conversation, which gives you a read-only link anyone can view without logging in.",
  },
  {
    category: 'help_upload',
    re: /\bhow\s+do\s+i\s+upload\b/i,
    response: "Click the attach/upload button (or drag a file in) and choose a PDF, DOCX, TXT, or CSV file. I'll process it automatically and let you know when it's ready.",
  },
  {
    category: 'help_ask',
    re: /\bhow\s+do\s+i\s+ask\s+a\s+question\b/i,
    response: "Once a document is attached to a conversation, just type your question in the chat box — I'll search the document and answer with sources.",
  },
  {
    category: 'help_download',
    re: /\bhow\s+do\s+i\s+download\s+(a\s+)?pdf\b/i,
    response: "Use the export/download button at the top of a conversation, or type \"generate pdf\" / \"export pdf\" in the chat.",
  },
  {
    category: 'help_share',
    re: /\bhow\s+do\s+i\s+share\s+a\s+chat\b/i,
    response: "Open the share icon at the top of the conversation and enable link sharing — anyone with the link gets a read-only view.",
  },
  {
    category: 'help_how_it_works',
    re: /\bhow\s+does\s+document\s?ai\s+work\b/i,
    response: "I process your document into searchable chunks, then use BM25 and TF-IDF ranking plus rule-based NLP (no external AI) to find and return the most relevant, sourced answer to your question.",
  },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Attempts to match a general-conversation intent. Returns
 * { category, response } or null if nothing matched.
 */
function matchGeneral(text) {
  const trimmed = text.trim();

  if (GOODBYE_RE.test(trimmed)) return { category: 'goodbye', response: pick(GOODBYE_RESPONSES) };
  if (HOW_ARE_YOU_RE.test(trimmed)) return { category: 'how_are_you', response: pick(HOW_ARE_YOU_RESPONSES) };
  if (GREETING_RE.test(trimmed)) return { category: 'greeting', response: pick(GREETING_RESPONSES) };
  if (THANKS_RE.test(trimmed)) return { category: 'thanks', response: pick(THANKS_RESPONSES) };

  for (const entry of FAQ) {
    if (entry.re.test(trimmed)) return { category: entry.category, response: entry.response };
  }

  return null;
}

module.exports = { matchGeneral };
