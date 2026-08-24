/**
 * nlp/documentProcessor.js
 * Implements the pipeline from the spec:
 *   validate -> extract text -> clean -> detect language -> split into
 *   pages -> split into paragraphs -> split into sentences -> build
 *   searchable chunks -> TF-IDF -> BM25 -> sentence importance -> store.
 */
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { cleanText, splitParagraphs, detectLanguage } = require('./preprocess');
const { extractKeywords, extractKeyPoints } = require('./keywords');
const { extractTables } = require('../services/tableExtractionService');

const CHUNK_TARGET_WORDS = 180; // words per searchable chunk

// Heuristics used to classify a paragraph while chunking (section 6/7 of
// the spec): heading vs list vs table vs ordinary paragraph. Kept
// intentionally simple/regex-based — no layout information is available
// once text has been extracted, so this is a best-effort signal used to
// improve retrieval, not a guarantee.
function looksLikeHeading(paragraph) {
  const line = paragraph.trim();
  if (!line || line.includes('\n')) return false;
  const words = line.split(/\s+/);
  if (words.length > 10) return false;
  if (/[.!?]$/.test(line)) return false;
  const isNumbered = /^(\d+(\.\d+)*|[A-Z]|[IVXLC]+)[.)]\s+\S/.test(line);
  const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
  const isTitleCase = words.every((w) => /^[A-Z0-9]/.test(w) || w.length <= 3);
  return isNumbered || isAllCaps || (isTitleCase && words.length <= 8);
}

function looksLikeList(paragraph) {
  const lines = paragraph.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const bulletCount = lines.filter((l) => /^(\d+[.)]|[-•*])\s+/.test(l)).length;
  return bulletCount >= Math.ceil(lines.length * 0.6);
}

// Operates entirely on an in-memory Buffer — the file is never written
// to local disk; it is streamed straight to Cloudinary by the route
// handler and processed here from the same buffer in parallel.
async function extractText(buffer, fileType) {
  if (fileType === 'pdf') {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pageCount: data.numpages || 1,
      // pdf-parse doesn't give per-page text out of the box; we approximate
      // page boundaries by splitting the extracted text evenly, then refine
      // using form-feed characters if the PDF producer included them.
      rawPages: data.text.includes('\f')
        ? data.text.split('\f')
        : null,
    };
  }
  if (fileType === 'docx') {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value, pageCount: null, rawPages: null };
  }
  if (fileType === 'txt' || fileType === 'csv') {
    const text = buffer.toString('utf-8');
    return { text, pageCount: null, rawPages: null };
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

/** Split cleaned text into page-like slices when the source format has no
 * real pagination (docx/txt), so the source viewer still has something
 * to anchor to. Roughly 350 words per synthetic page. */
function synthesizePages(text, rawPages) {
  if (rawPages && rawPages.length > 1) {
    return rawPages.map((t) => cleanText(t)).filter((t) => t.length > 0);
  }
  const words = text.split(/\s+/);
  const wordsPerPage = 350;
  const pages = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage).join(' '));
  }
  return pages.length ? pages : [text];
}

function buildChunks(pages) {
  const chunks = [];
  let currentSection = null;

  pages.forEach((pageText, pageIdx) => {
    const paragraphs = splitParagraphs(pageText);
    let buffer = [];
    let wordCount = 0;
    let bufferHasList = false;

    const flush = () => {
      if (!buffer.length) return;
      const text = buffer.join(' ');
      const chunkType = bufferHasList ? 'list' : (extractTables(text).length ? 'table' : 'paragraph');
      chunks.push({ text, page: pageIdx + 1, section: currentSection, chunkType });
      buffer = [];
      wordCount = 0;
      bufferHasList = false;
    };

    if (!paragraphs.length) {
      flush();
      return;
    }

    for (const para of paragraphs) {
      // Headings become their own tiny chunk and set the section label
      // for everything that follows (section 6/7: preserve document
      // structure instead of one flat bag of words), matching prior
      // behavior for every other paragraph type (accumulate to target
      // word count, boundary at paragraph edges).
      if (looksLikeHeading(para)) {
        flush();
        currentSection = para.trim();
        chunks.push({ text: para, page: pageIdx + 1, section: currentSection, chunkType: 'heading' });
        continue;
      }

      const words = para.split(/\s+/).length;
      if (looksLikeList(para)) bufferHasList = true;
      buffer.push(para);
      wordCount += words;
      if (wordCount >= CHUNK_TARGET_WORDS) flush();
    }
    flush();
  });

  return chunks.length ? chunks : [{ text: pages.join(' '), page: 1, section: null, chunkType: 'paragraph' }];
}

async function processDocument(buffer, fileType, options = {}) {
  const { text: rawText, pageCount, rawPages } = await extractText(buffer, fileType);
  const text = cleanText(rawText || '');

  if (!text || text.replace(/\s/g, '').length < 20) {
    const err = new Error('No extractable text was found in this document.');
    err.code = 'NO_TEXT_FOUND';
    throw err;
  }

  // `unknown` is valid application metadata, but it must never be used as
  // MongoDB's text-index language override. The Document model's text index
  // uses a private override field that is never populated.
  const detectedLanguage = detectLanguage(text);
  const language = detectedLanguage === 'en' ? 'en' : 'unknown';
  const pages = synthesizePages(text, rawPages);
  const chunks = buildChunks(pages);
  // Keyword/key-point extraction is intentionally optional. It is much more
  // expensive than text extraction and is not required before chat can start.
  // Upload processing uses the fast path and generates these derived fields
  // after the document is marked ready.
  const keywords = options.includeDerived ? extractKeywords(text, 15) : [];
  const keyPoints = options.includeDerived ? extractKeyPoints(text, 6) : [];

  return {
    extractedText: text,
    pageCount: pageCount || pages.length,
    language,
    pages,
    chunks,
    keywords,
    keyPoints,
  };
}

module.exports = { processDocument, buildChunks, synthesizePages };
