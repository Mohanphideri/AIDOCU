const PDFDocument = require('pdfkit');

const INK = '#0F172A';
const MUTED = '#64748B';
const PRIMARY = '#635BFF';
const BORDER = '#E2E8F0';

/**
 * Renders a conversation (title + Q&A messages) into a PDF document and
 * streams it straight to the given writable stream (typically the HTTP
 * response). Returns the PDFDocument instance so the caller can listen
 * for 'end'/'error' if needed.
 */
function renderConversationPdf({ conversation, messages, documentName }, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  doc.pipe(outputStream);

  // Header
  doc
    .fillColor(PRIMARY)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('DocumentAI', { continued: false });

  doc.moveDown(0.4);
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(conversation.title || 'Conversation', { width: 480 });

  doc.moveDown(0.2);
  const meta = [
    documentName ? `Document: ${documentName}` : null,
    `Exported: ${new Date().toLocaleString()}`,
  ].filter(Boolean).join('   ·   ');
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(meta);

  doc.moveDown(0.8);
  doc.strokeColor(BORDER).lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - 56, doc.y).stroke();
  doc.moveDown(1);

  if (!messages.length) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(11).text('This conversation has no messages yet.');
  }

  messages.forEach((m) => {
    if (doc.y > doc.page.height - 120) doc.addPage();

    const label = m.role === 'user' ? 'You' : 'DocumentAI';
    doc
      .fillColor(m.role === 'user' ? INK : PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(label);

    doc.moveDown(0.15);
    doc
      .fillColor(INK)
      .font('Helvetica')
      .fontSize(11)
      .text(m.content, { width: 480, lineGap: 3 });

    if (m.sources && m.sources.length) {
      doc.moveDown(0.2);
      const sourceText = m.sources
        .map((s) => `Page ${s.page}${s.section ? ` · ${s.section}` : ''}`)
        .join('   ');
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8.5).text(`Sources: ${sourceText}`, { width: 480 });
    }

    doc.moveDown(0.9);
  });

  doc.end();
  return doc;
}

module.exports = { renderConversationPdf };
