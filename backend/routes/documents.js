const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { uploadBuffer, deleteFile } = require('../services/cloudinaryService');
const { processDocumentRecord } = require('../services/documentProcessingService');
const { summarize } = require('../nlp/summarizer');
const { extractKeywords, extractKeyPoints } = require('../nlp/keywords');
// Upgraded answering pipeline (intent-classified, hybrid-retrieval,
// table-aware, confidence-scored). nlp/qa.js is preserved untouched and
// still exported for any other caller/test that depends on it directly.
const { answerDocumentQuestion } = require('../services/documentQueryService');

const router = express.Router();

const ALLOWED_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

// Memory storage only — files are streamed to Cloudinary, never written
// to the local filesystem, so uploads survive restarts/redeploys.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

async function getOwnedDocOr404(req, res) {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return null;
  }
  return doc;
}

function requireReady(doc, res) {
  if (doc.processingStatus === 'processing' || doc.processingStatus === 'pending') {
    res.status(409).json({ error: 'This document is still processing. Please wait a moment.' });
    return false;
  }
  if (doc.processingStatus === 'error') {
    res.status(422).json({ error: doc.processingError || 'This document failed to process.' });
    return false;
  }
  return true;
}

// ---- Upload ----------------------------------------------------------
router.post('/upload', requireAuth, uploadLimiter, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.message === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, TXT, or CSV file.' });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File is too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 20}MB.` });
      }
      return res.status(400).json({ error: 'Upload failed. Please try again.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file was provided.' });
    if (req.file.size === 0) return res.status(400).json({ error: 'This file is empty.' });

    const fileType = ALLOWED_MIME[req.file.mimetype];
    const name = req.body.name?.trim() || req.file.originalname;

    let uploadResult;
    try {
      uploadResult = await uploadBuffer(req.file.buffer, {
        userId: req.user._id.toString(),
        filename: req.file.originalname,
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr.message);
      return res.status(502).json({ error: 'Could not store the document. Please try again.' });
    }

    const doc = await Document.create({
      userId: req.user._id,
      name,
      originalName: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      cloudinaryPublicId: uploadResult.public_id,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryResourceType: uploadResult.resource_type,
      processingStatus: 'processing',
      processingStartedAt: new Date(),
    });

    res.status(202).json({ document: doc.toPublic() });

    // Process asynchronously, but persist the job state so it can be
    // recovered after a Render restart/deploy. The response is already 202.
    setImmediate(async () => {
      try {
        await processDocumentRecord(doc, req.file.buffer);
      } catch {
        // processDocumentRecord already persists the error state.
      }
    });
  });
});

// ---- List / search -----------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const { q, favorite, sort = 'recent' } = req.query;
  const filter = { userId: req.user._id };
  if (favorite === 'true') filter.isFavorite = true;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { extractedText: { $regex: q, $options: 'i' } },
    ];
  }
  const sortSpec = sort === 'name' ? { name: 1 } : { createdAt: -1 };
  const docs = await Document.find(filter).sort(sortSpec);
  res.json({ documents: docs.map((d) => d.toPublic()) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  res.json({ document: { ...doc.toPublic(), pages: doc.pages || [] } });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  const { name, isFavorite } = req.body || {};
  if (typeof name === 'string' && name.trim()) doc.name = name.trim();
  if (typeof isFavorite === 'boolean') doc.isFavorite = isFavorite;
  await doc.save();
  res.json({ document: doc.toPublic() });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;

  try {
    await deleteFile(doc.cloudinaryPublicId, doc.cloudinaryResourceType);
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }

  await DocumentChunk.deleteMany({ documentId: doc._id });

  // Cascade: conversations bound to this document, and their messages.
  const convos = await Conversation.find({ documentId: doc._id, userId: req.user._id }).select('_id');
  const convoIds = convos.map((c) => c._id);
  if (convoIds.length) {
    await Message.deleteMany({ conversationId: { $in: convoIds } });
    await Conversation.deleteMany({ _id: { $in: convoIds } });
  }

  await doc.deleteOne();
  res.json({ success: true });
});

router.get('/:id/download', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  res.redirect(doc.cloudinaryUrl);
});

// ---- NLP endpoints -------------------------------------------------------
router.post('/:id/question', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  if (!requireReady(doc, res)) return;

  const { question } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }
  const chunks = await DocumentChunk.find({ documentId: doc._id }).sort({ chunkIndex: 1 });
  const result = answerDocumentQuestion(
    question,
    chunks.map((c) => ({ text: c.text, page: c.page, section: c.section, chunkType: c.chunkType }))
  );
  if (!result) {
    return res.json({
      answer: "I couldn't find information related to this question in the selected document.",
      sources: [],
      matched: false,
    });
  }
  res.json({ answer: result.answer, sources: result.sources, confidence: result.confidence, matched: result.matched });
});

router.post('/:id/summarize', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  if (!requireReady(doc, res)) return;
  const length = ['short', 'medium', 'detailed'].includes(req.body?.length) ? req.body.length : 'medium';
  const result = summarize(doc.extractedText, length);
  res.json({ summary: result.summary, sentences: result.sentences, length });
});

router.get('/:id/keywords', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  if (!requireReady(doc, res)) return;
  res.json({ keywords: (doc.keywords && doc.keywords.length ? doc.keywords : extractKeywords(doc.extractedText)) });
});

router.get('/:id/key-points', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  if (!requireReady(doc, res)) return;
  res.json({ keyPoints: (doc.keyPoints && doc.keyPoints.length ? doc.keyPoints : extractKeyPoints(doc.extractedText)) });
});

router.get('/:id/sources/:page', requireAuth, async (req, res) => {
  const doc = await getOwnedDocOr404(req, res);
  if (!doc) return;
  const pageNum = parseInt(req.params.page, 10);
  const text = (doc.pages || [])[pageNum - 1];
  if (text === undefined) return res.status(404).json({ error: 'Page not found.' });
  res.json({ page: pageNum, text });
});

module.exports = router;
