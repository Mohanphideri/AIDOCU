const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const { processDocument } = require('../nlp/documentProcessor');
const { extractKeywords, extractKeyPoints } = require('../nlp/keywords');

/**
 * Processes one stored document. The fast path stores searchable text/chunks
 * first and marks the document ready; optional metadata is generated after
 * that so chat is never blocked by TextRank/TF-IDF metadata work.
 */
async function processDocumentRecord(doc, buffer) {
  try {
    doc.processingStatus = 'processing';
    doc.processingStartedAt = new Date();
    doc.processingError = null;
    await doc.save();

    const result = await processDocument(buffer, doc.fileType);

    await DocumentChunk.deleteMany({ documentId: doc._id });
    if (result.chunks.length) {
      await DocumentChunk.insertMany(
        result.chunks.map((c, i) => ({
          documentId: doc._id,
          userId: doc.userId,
          text: c.text,
          page: c.page,
          section: c.section,
          chunkIndex: i,
          chunkType: c.chunkType || 'paragraph',
        })),
        { ordered: false }
      );
    }

    doc.extractedText = result.extractedText;
    doc.pageCount = result.pageCount;
    doc.language = result.language;
    doc.pages = result.pages;
    doc.processingStatus = 'ready';
    doc.processingError = null;
    doc.processingStartedAt = null;
    await doc.save();

    // Derived metadata is useful for the UI but not required for Q&A.
    // Generate it after the document becomes ready.
    setImmediate(async () => {
      try {
        const [keywords, keyPoints] = [
          extractKeywords(result.extractedText, 15),
          extractKeyPoints(result.extractedText, 6),
        ];
        await Document.updateOne(
          { _id: doc._id },
          { $set: { keywords, keyPoints } }
        );
      } catch (err) {
        console.error(`Optional metadata generation failed for ${doc._id}:`, err.message);
      }
    });

    return doc;
  } catch (err) {
    console.error(`Document processing failed for ${doc._id}:`, err);
    try {
      await Document.updateOne(
        { _id: doc._id },
        {
          $set: {
            processingStatus: 'error',
            processingError: err.code === 'NO_TEXT_FOUND'
              ? err.message
              : 'This document could not be processed. It may be corrupted or unsupported.',
            processingStartedAt: null,
          },
        }
      );
    } catch (saveErr) {
      console.error('Could not persist document processing error:', saveErr.message);
    }
    throw err;
  }
}

async function recoverStuckDocuments({ max = 20, ageMs = 30 * 1000 } = {}) {
  const cutoff = new Date(Date.now() - ageMs);
  const docs = await Document.find({
    processingStatus: { $in: ['processing', 'pending'] },
    $or: [
      { processingStartedAt: { $lt: cutoff } },
      { processingStartedAt: null, updatedAt: { $lt: cutoff } },
      { processingStartedAt: { $exists: false }, updatedAt: { $lt: cutoff } },
    ],
  }).sort({ updatedAt: 1 }).limit(max);

  if (!docs.length) return;
  console.log(`Recovering ${docs.length} document processing job(s)...`);

  for (const doc of docs) {
    try {
      const response = await fetch(doc.cloudinaryUrl);
      if (!response.ok) throw new Error(`Cloudinary returned HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      await processDocumentRecord(doc, Buffer.from(arrayBuffer));
      console.log(`Recovered document ${doc._id}: ${doc.name}`);
    } catch (err) {
      console.error(`Could not recover document ${doc._id}:`, err.message);
    }
  }
}

module.exports = { processDocumentRecord, recoverStuckDocuments };
