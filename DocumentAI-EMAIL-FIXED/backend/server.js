require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB, dbState } = require('./config/database');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const conversationRoutes = require('./routes/conversations');
const { requireAuth } = require('./middleware/auth');
const Document = require('./models/Document');
const { recoverStuckDocuments } = require('./services/documentProcessingService');

const app = express();

// Render runs Express behind a reverse proxy and supplies X-Forwarded-For.
// Trust the first proxy hop so express-rate-limit can identify clients correctly.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Always allow the local Vite development origins. Additional production
// origins can be supplied as a comma-separated FRONTEND_URL on Render.
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins,
]);

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Non-browser requests (curl, health checks, server-to-server) have no Origin.
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Handle CORS preflight before rate limiting and API routes.
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DocumentAI', database: dbState(), llm: 'none' });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/conversations', conversationRoutes);
app.patch('/api/messages/:id/feedback', requireAuth, conversationRoutes.feedbackHandler);

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler — never leaks stack traces to the client.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong on our end. Please try again.' });
});


async function repairConversationIndexes() {
  const Conversation = require('./models/Conversation');
  const collection = Conversation.collection;
  if (!collection || !collection.collectionName) return;

  let indexes = [];
  try {
    indexes = await collection.listIndexes().toArray();
  } catch (err) {
    if (err?.code !== 26) throw err;
  }

  // Older versions used a unique non-sparse shareId index while the schema
  // stored `shareId: null` on every new conversation. That makes the second
  // conversation fail with E11000. Remove only the shareId indexes and
  // recreate the intended unique sparse index.
  for (const index of indexes) {
    if (index.name === 'shareId_1' || index.key?.shareId === 1) {
      try {
        await collection.dropIndex(index.name);
        console.warn(`Removed legacy Conversation shareId index: ${index.name}`);
      } catch (err) {
        if (err?.code !== 27) throw err;
      }
    }
  }

  // Explicit null values are still indexed by MongoDB even with sparse:true.
  // Remove them so only conversations that actually have a shareId are indexed.
  await collection.updateMany(
    { shareId: null },
    { $unset: { shareId: '' } }
  );

  await collection.createIndex({ shareId: 1 }, { unique: true, sparse: true, name: 'shareId_1' });
  console.log('Conversation shareId index verified.');
}

async function repairDocumentTextIndexes() {
  // DocumentAI uses its own BM25/TF-IDF retrieval, so MongoDB's text index
  // is not required for document Q&A. Older deployments created a MongoDB
  // text index that treated the Document.language field as a language
  // override; values such as "unknown" then caused MongoDB error 17262.
  //
  // Remove any legacy text indexes and do NOT recreate one. This completely
  // removes MongoDB language-override processing from document writes.
  const collection = Document.collection;
  if (!collection || !collection.collectionName) return;

  let indexes = [];
  try {
    indexes = await collection.listIndexes().toArray();
  } catch (err) {
    if (err?.code !== 26) throw err;
  }

  const textIndexes = indexes.filter((index) =>
    Object.values(index.key || {}).some((value) => value === 'text')
  );

  for (const index of textIndexes) {
    if (!index.name) continue;
    console.warn(`Removing legacy Document text index: ${index.name}`);
    try {
      await collection.dropIndex(index.name);
    } catch (err) {
      if (err?.code !== 27) throw err;
    }
  }

  console.log('Document text indexes disabled; application BM25/TF-IDF retrieval is active.');
}

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    await repairDocumentTextIndexes();
    await repairConversationIndexes();
    // Recover documents that were left in processing by a previous Render
    // restart/deploy. This also repairs older documents that have no
    // processingStartedAt field but have been stale for more than two minutes.
    recoverStuckDocuments().catch((err) => {
      console.error('Document processing recovery failed:', err.message);
    });
    app.listen(PORT, () => {
      console.log(`DocumentAI backend listening on http://localhost:${PORT}`);
      console.log('LLM usage: NONE — NLP engine (TF-IDF / BM25 / TextRank) active.');
    });
  })
  .catch((err) => {
    console.error('Failed to start server — could not connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
