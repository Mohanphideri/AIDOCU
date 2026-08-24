/**
 * services/tableExtractionService.js
 *
 * Detects tabular data inside extracted document text and turns it into
 * structured { headers, rows } so questions like "What is the warranty
 * of Product B?" can be answered by row/column lookup instead of plain
 * sentence retrieval.
 *
 * Three sources are handled, all deterministic/regex-based:
 *   1. CSV files                 — parsed directly (comma-delimited).
 *   2. Markdown-style pipe tables — "| A | B |" rows (some PDF/DOCX
 *      converters, and any doc authored in markdown, produce these).
 *   3. Space-aligned text tables — the common case for PDF-extracted
 *      tables, where columns line up via repeated runs of whitespace.
 */
const { tokenizeNoStop, tokenize, stem, STOPWORDS } = require('../nlp/preprocess');

// Row-identity cells are frequently short codes ("A", "B", "Plan 1") that
// tokenizeNoStop would discard (it drops length-1 tokens). Use a looser
// tokenizer here — stopwords still excluded, but short alphanumeric
// identifiers are kept — so "Product B" can still be matched against a
// row whose only distinguishing cell is "B".
function looseTokens(text) {
  return tokenize(text).filter((t) => !STOPWORDS.has(t));
}

function splitCsvLine(line) {
  // Minimal CSV split: handles quoted fields with embedded commas.
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCsvTable(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const rows = lines.map(splitCsvLine);
  const width = rows[0].length;
  if (width < 2) return null;
  return { headers: rows[0], rows: rows.slice(1).filter((r) => r.length === width), pageHint: null };
}

function parseMarkdownPipeTables(text) {
  const lines = text.split('\n');
  const tables = [];
  let current = null;

  const flush = () => {
    if (current && current.rows.length) tables.push(current);
    current = null;
  };

  // Accepts both strict markdown ("| A | B |") and plain pipe-delimited
  // rows ("A | B | C") — PDF/DOCX-extracted text rarely keeps the
  // leading/trailing pipe, but the separator itself survives.
  const isPipeRow = (line) => line.includes('|') && line.split('|').filter((c) => c.trim().length).length >= 2;
  const isSeparatorRow = (line) => /^\|?[\s:|-]+\|?$/.test(line) && line.includes('-');

  const cellsOf = (line) => {
    const trimmed = /^\|.*\|$/.test(line) ? line.slice(1, -1) : line;
    return trimmed.split('|').map((c) => c.trim());
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flush(); continue; }

    if (isSeparatorRow(line)) continue; // skip "---|---" divider rows

    if (isPipeRow(line)) {
      const cells = cellsOf(line);
      if (!current) current = { headers: cells, rows: [] };
      else if (cells.length === current.headers.length) current.rows.push(cells);
      else { flush(); current = { headers: cells, rows: [] }; }
    } else {
      flush();
    }
  }
  flush();
  return tables;
}

/** Fallback heuristic for PDF-extracted tables where columns line up
 * via 2+ consecutive spaces instead of markdown pipes. */
function parseSpaceAlignedTables(text) {
  const lines = text.split('\n');
  const tables = [];
  let block = [];

  const looksTabular = (line) => {
    const parts = line.trim().split(/ {2,}|\t/).filter(Boolean);
    return parts.length >= 2 && parts.length <= 8 ? parts : null;
  };

  const flush = () => {
    if (block.length >= 2) {
      const width = block[0].length;
      // Require consistent column count across most rows to avoid
      // false positives on ordinary prose with double spaces.
      const consistent = block.filter((r) => Math.abs(r.length - width) <= 1);
      if (consistent.length >= block.length * 0.7) {
        tables.push({ headers: block[0], rows: block.slice(1) });
      }
    }
    block = [];
  };

  for (const line of lines) {
    const parts = looksTabular(line);
    if (parts) block.push(parts);
    else flush();
  }
  flush();
  return tables;
}

/** Extract all tables found in a page/chunk of text, tagging each with
 * a stable shape: { headers, rows }. */
function extractTables(text) {
  if (!text) return [];
  const pipeTables = parseMarkdownPipeTables(text);
  if (pipeTables.length) return pipeTables;
  return parseSpaceAlignedTables(text);
}

/**
 * Attempts to answer a question via row/column lookup against detected
 * tables. Matches a row by any cell overlapping the question's content
 * words, then picks the column whose header best matches the question's
 * remaining intent (e.g. "warranty", "price").
 */
function lookupInTables(question, tables) {
  const qStems = new Set(tokenizeNoStop(question).map(stem));
  const qLoose = new Set(looseTokens(question));
  if (!qStems.size && !qLoose.size) return null;

  let best = null;

  for (const table of tables) {
    const headerStems = table.headers.map((h) => new Set(tokenizeNoStop(h).map(stem)));

    for (const row of table.rows) {
      // Row-identity score: how well any cell in this row matches the
      // question — using loose tokens so short codes like "B" count.
      let rowScore = 0;
      let matchedCellIdx = -1;
      row.forEach((cell, idx) => {
        const cellTokens = new Set(looseTokens(cell));
        const overlap = [...cellTokens].filter((t) => qLoose.has(t)).length;
        if (overlap > rowScore) { rowScore = overlap; matchedCellIdx = idx; }
      });
      if (rowScore === 0) continue;

      // Column-intent score: which header best matches the remaining
      // question words (excluding the row-identity words).
      let bestCol = -1;
      let bestColScore = -1;
      headerStems.forEach((hStems, colIdx) => {
        if (colIdx === matchedCellIdx) return;
        const overlap = [...hStems].filter((t) => qStems.has(t)).length;
        if (overlap > bestColScore) { bestColScore = overlap; bestCol = colIdx; }
      });

      if (bestCol === -1 || bestColScore === 0) continue;

      const totalScore = rowScore * 2 + bestColScore * 3;
      if (!best || totalScore > best.score) {
        best = {
          score: totalScore,
          rowLabel: row[matchedCellIdx],
          column: table.headers[bestCol],
          value: row[bestCol],
          headers: table.headers,
          row,
        };
      }
    }
  }

  return best;
}

module.exports = { extractTables, parseCsvTable, parseMarkdownPipeTables, parseSpaceAlignedTables, lookupInTables };
