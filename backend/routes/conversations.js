const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const { requireAuth } = require('../middleware/auth');
const { renderConversationPdf } = require('../services/pdfService');
const { routeIntent } = require('../services/intentRouter');
const { answerDocumentQuestion } = require('../services/documentQueryService');

const router = express.Router();

async function getOwnedConvoOr404(req, res) {
  const convo = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
  if (!convo) {
    res.status(404).json({ error: 'Conversation not found.' });
    return null;
  }
  return convo;
}

async function runDocumentRetrieval(convo, question) {
  let answerText = "I couldn't find information related to this question in the selected document.";
  let sources = [];

  if (!convo.documentId) {
    return { answerText: 'Attach a document to this conversation so I can search it for an answer.', sources };
  }

  const doc = await Document.findOne({ _id: convo.documentId, userId: convo.userId });
  if (!doc) return { answerText, sources };

  if (doc.processingStatus !== 'ready') {
    return { answerText: 'This document is still processing. Please wait a moment and try again.', sources };
  }

  const chunks = await DocumentChunk.find({ documentId: doc._id }).sort({ chunkIndex: 1 });
  const result = answerDocumentQuestion(
    question,
    chunks.map((c) => ({ text: c.text, page: c.page, section: c.section, chunkType: c.chunkType }))
  );
  if (result) {
    answerText = result.answer;
    sources = result.sources;
  }
  return { answerText, sources };
}

// New intent-routing layer (section 2 of the spec): GENERAL / SYSTEM
// messages are answered deterministically without ever touching
// BM25/TF-IDF retrieval; everything else falls through to the existing
// document pipeline above, unchanged.
async function runRetrieval(convo, question) {
  const routed = routeIntent(question, { hasDocument: !!convo.documentId });

  if (routed.intent === 'GENERAL') {
    return { answerText: routed.response, sources: [] };
  }

  if (routed.intent === 'SYSTEM') {
    if (routed.action === 'export_pdf') {
      return {
        answerText: 'Your conversation PDF is being generated — use the export button at the top of the chat, or your download should start automatically if your client supports it.',
        sources: [],
      };
    }
    if (routed.action === 'share_on') {
      if (!convo.shareId) convo.shareId = uuidv4();
      convo.isPublic = true;
      return { answerText: "I've turned on link sharing for this conversation. You can find the share link from the share button at the top of the chat.", sources: [] };
    }
    if (routed.action === 'share_off') {
      convo.isPublic = false;
      return { answerText: "I've turned off link sharing for this conversation.", sources: [] };
    }
  }

  if (routed.intent === 'UNKNOWN') {
    return {
      answerText: convo.documentId
        ? "I'm not sure what you're asking — try rephrasing your question about the document."
        : "I'm not sure what you're asking. You can chat with me, or attach a document to ask questions about it.",
      sources: [],
    };
  }

  return runDocumentRetrieval(convo, question);
}

router.get('/', requireAuth, async (req, res) => {
  const { q } = req.query;
  const filter = { userId: req.user._id };
  if (q) filter.title = { $regex: q, $options: 'i' };
  const convos = await Conversation.find(filter).sort({ updatedAt: -1 });
  res.json({ conversations: convos.map((c) => c.toPublic()) });
});

router.post('/', requireAuth, async (req, res) => {
  const { documentId, title } = req.body || {};
  if (documentId) {
    const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
  }
  const convo = await Conversation.create({
    userId: req.user._id,
    documentId: documentId || null,
    title: title || 'New chat',
  });
  res.status(201).json({ conversation: convo.toPublic() });
});

router.get('/:id', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
  res.json({ conversation: convo.toPublic(), messages: messages.map((m) => m.toPublic()) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  const { title, documentId } = req.body || {};
  if (typeof title === 'string' && title.trim()) convo.title = title.trim();
  if (documentId) {
    const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    convo.documentId = doc._id;
  }
  await convo.save();
  res.json({ conversation: convo.toPublic() });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  await Message.deleteMany({ conversationId: convo._id });
  await convo.deleteOne();
  res.json({ success: true });
});

// Post a user message, run the retrieval pipeline against the bound
// document, and store both the user + assistant message.
router.post('/:id/messages', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

  const userMsg = await Message.create({ conversationId: convo._id, role: 'user', content: content.trim() });
  const { answerText, sources } = await runRetrieval(convo, content.trim());
  const assistantMsg = await Message.create({
    conversationId: convo._id,
    role: 'assistant',
    content: answerText,
    sources,
  });

  if (convo.title === 'New chat') {
    convo.title = content.trim().slice(0, 60);
  }
  convo.updatedAt = new Date();
  await convo.save();

  res.status(201).json({ userMessage: userMsg.toPublic(), assistantMessage: assistantMsg.toPublic() });
});

// Regenerate = re-run the retrieval algorithm against the last user message.
router.post('/:id/regenerate/:messageId', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  const assistantMsg = await Message.findOne({ _id: req.params.messageId, conversationId: convo._id });
  if (!assistantMsg || assistantMsg.role !== 'assistant') {
    return res.status(404).json({ error: 'Message not found.' });
  }
  const priorUser = await Message.findOne({
    conversationId: convo._id,
    role: 'user',
    createdAt: { $lte: assistantMsg.createdAt },
  }).sort({ createdAt: -1 });
  if (!priorUser) return res.status(400).json({ error: 'No question found to re-run.' });

  const { answerText, sources } = await runRetrieval(convo, priorUser.content);
  assistantMsg.content = answerText;
  assistantMsg.sources = sources;
  assistantMsg.feedback = null;
  await assistantMsg.save();
  if (convo.isModified()) await convo.save();

  res.json({ message: assistantMsg.toPublic() });
});

// Export the full conversation transcript as a downloadable PDF.
// Triggered either by an explicit "Export PDF" action or by the user
// typing a command like "generate pdf" in the composer.
router.get('/:id/export/pdf', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });

  let documentName = null;
  if (convo.documentId) {
    const doc = await Document.findOne({ _id: convo.documentId, userId: convo.userId });
    documentName = doc?.name || null;
  }

  const filename = `${(convo.title || 'conversation').replace(/[^a-z0-9\-_ ]/gi, '').trim().slice(0, 60) || 'conversation'}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  renderConversationPdf(
    { conversation: convo, messages: messages.map((m) => m.toPublic()), documentName },
    res
  );
});

// Turn on link sharing for a conversation. Idempotent — reuses the
// existing shareId if one was already generated.
router.post('/:id/share', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  if (!convo.shareId) convo.shareId = uuidv4();
  convo.isPublic = true;
  await convo.save();
  res.json({ conversation: convo.toPublic() });
});

// Turn off link sharing. The shareId is kept so re-enabling later
// doesn't hand out a different URL, but the public route below only
// serves conversations with isPublic: true.
router.delete('/:id/share', requireAuth, async (req, res) => {
  const convo = await getOwnedConvoOr404(req, res);
  if (!convo) return;
  convo.isPublic = false;
  await convo.save();
  res.json({ conversation: convo.toPublic() });
});

// Public, unauthenticated read-only view of a shared conversation.
// Anyone with the link can view it; no ownership check.
router.get('/shared/:shareId', async (req, res) => {
  const convo = await Conversation.findOne({ shareId: req.params.shareId, isPublic: true });
  if (!convo) return res.status(404).json({ error: 'This shared link is invalid or is no longer public.' });
  const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
  res.json({ conversation: convo.toSharedPublic(), messages: messages.map((m) => m.toPublic()) });
});

module.exports = router;

// Feedback route is mounted separately in server.js under /api/messages
router.feedbackHandler = async (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body || {};
  if (!['up', 'down', null].includes(feedback)) {
    return res.status(400).json({ error: 'Invalid feedback value.' });
  }
  const msg = await Message.findById(id);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });
  const convo = await Conversation.findOne({ _id: msg.conversationId, userId: req.user._id });
  if (!convo) return res.status(404).json({ error: 'Message not found.' });
  msg.feedback = feedback;
  await msg.save();
  res.json({ success: true });
};
