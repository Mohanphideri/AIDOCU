# DocumentAI

A document intelligence and conversational document-analysis platform that
answers questions, summarizes, and extracts keywords from your uploaded
documents — **without using any LLM**. Every answer is retrieved and ranked
using traditional NLP and information-retrieval techniques: TF-IDF, BM25,
TextRank, extractive QA, and rule-based text processing.

If a question isn't answerable from the document, DocumentAI says so instead
of guessing.

---

## 1. Project overview

DocumentAI lets a user register, sign in behind a custom server-side
CAPTCHA, upload PDF/DOCX/TXT/CSV files, and have a ChatGPT-style
conversation *about those files*. Under the hood there is no generative
model anywhere in the request path — see
[No-LLM architecture](#8-no-llm-architecture-explanation) below for exactly
what runs instead.

## 2. Features

- Email/password auth with JWT sessions and bcrypt password hashing
- **Custom server-generated alphanumeric CAPTCHA** on login and
  registration — image rendered server-side, answer hashed and verified
  entirely on the backend, never sent to the browser (see
  [CAPTCHA setup](#5-captcha-setup))
- Drag-and-drop document upload (PDF, DOCX, TXT, CSV) stored in
  **Cloudinary**, with background processing and live status polling
- Document library: search, sort, grid/list view, favorites, rename, delete, download
- Conversational chat UI per document: new chat, rename, delete, search chats,
  copy answer, thumbs up/down feedback, re-run (regenerate) an answer
- Extractive question answering with cited page/section sources and a source
  viewer that jumps to the originating page
- Extractive summarization (short / medium / detailed) built from real
  sentences in the document
- Key point extraction and keyword extraction (TF-IDF + frequency ranking)
- Global search (⌘K / Ctrl+K) across documents and conversations
- Light/dark mode, responsive layout, settings page, profile menu
- User-scoped authorization — a user can never load another user's documents
  or conversations by guessing an ID (enforced server-side on every query)
- "Logout" (this device) and "Logout all sessions" (invalidates every
  previously issued JWT immediately)

## 3. Architecture

```
document-ai/
├── backend/                  Express API + built-in NLP engine
│   ├── server.js
│   ├── config/
│   │   ├── database.js       Mongoose/MongoDB Atlas connection (pooled)
│   │   └── cloudinary.js     Cloudinary SDK configuration
│   ├── models/                User, Document, DocumentChunk, Conversation,
│   │                         Message, CaptchaChallenge (Mongoose schemas)
│   ├── services/
│   │   ├── captchaService.js  Alphanumeric CAPTCHA generation + verification
│   │   └── cloudinaryService.js  Streams uploads to/deletes from Cloudinary
│   ├── middleware/            auth.js (JWT), captcha.js (server verification),
│   │                         rateLimiters.js
│   ├── routes/                auth.js, documents.js, conversations.js
│   └── nlp/                   preprocess, tfidf, bm25, textrank, summarizer,
│                              keywords, qa, documentProcessor — the entire
│                              "no-LLM" engine (operates on in-memory buffers)
│
├── frontend/                  React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/             Landing, Login, Register, Workspace (chat),
│       │                     DocumentsPage, SettingsPage
│       ├── components/        Sidebar, AppLayout, ChatMessage, ChatComposer,
│       │                     DocumentPanel, DocumentUpload, DocumentCard,
│       │                     Captcha (renders the server-generated image),
│       │                     SearchModal, etc.
│       ├── context/           AuthContext, ThemeContext, ToastContext
│       └── services/api.js    Typed fetch wrapper for the backend API
│
└── demo-samples/              Sample .txt documents for quick evaluation
```

No file ever touches local disk on the backend: uploads use
`multer.memoryStorage()` and are streamed directly to Cloudinary, and text
extraction runs against the same in-memory buffer in parallel — so
documents survive server restarts/redeploys.

## 4. Technologies

- **Backend:** Node.js, Express, Mongoose (MongoDB Atlas), Cloudinary SDK,
  JWT, bcryptjs, multer, pdf-parse, mammoth, svg-captcha
- **NLP engine:** hand-implemented TF-IDF, BM25 (Okapi), TextRank (PageRank
  over a sentence similarity graph), extractive QA, and keyword extraction —
  no ML/LLM libraries
- **Frontend:** React 18, Vite, React Router, Tailwind CSS, lucide-react icons

## 5. CAPTCHA setup

DocumentAI implements its own CAPTCHA rather than a third-party widget:

1. `GET /api/auth/captcha` — the server (`services/captchaService.js`)
   generates a random 6-character alphanumeric code from a safe charset
   (ambiguous characters `0/O`, `1/I/l`, `5/S`, `8/B` are excluded), renders
   it as a distorted SVG image (`svg-captcha`, with noise/color/random
   character placement), SHA-256 hashes the code, and stores **only the
   hash** + a 5-minute expiry in MongoDB (`CaptchaChallenge`, TTL-indexed on
   `expiresAt` so MongoDB auto-deletes expired challenges). The response
   contains `{ captchaId, image }` — the plaintext code is never returned.
2. The user types what they see; the frontend sends `captchaId` +
   `captchaAnswer` alongside the login/register payload.
3. `middleware/captcha.js` re-hashes the submitted answer and compares it to
   the stored hash. Verification enforces: 5-minute expiration, a 5-attempt
   limit (the challenge is deleted after 5 wrong answers), and strict
   one-time use (a challenge is deleted immediately after a correct
   answer, so it can never be replayed).
4. The refresh button calls `POST /api/auth/captcha/refresh`, which
   invalidates the old challenge and issues a brand new one — the old code
   stops working immediately.

The same `verifyCaptcha` middleware/service is reused for both
`/auth/register` and `/auth/login` — there is only one CAPTCHA
implementation in the codebase.

## 6. Installation

Requires Node.js 18+, a MongoDB Atlas cluster (or any MongoDB instance),
and a Cloudinary account.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, Cloudinary keys
npm run dev                 # http://localhost:5000

# 2. Frontend (in a new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173`, register an account (you'll be asked to solve
the CAPTCHA), and upload a file from `demo-samples/` to try it immediately.

There is no separate NLP microservice to run — the NLP engine lives inside
the backend (`backend/nlp/`) as plain JavaScript modules, so there's only
one backend process to start locally.

## 7. Environment variables

**Backend** (`backend/.env`, see `backend/.env.example`):

```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/documentai

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRE=7d

FRONTEND_URL=http://localhost:5173

# Cloudinary — document storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Reserved for a future standalone NLP microservice; not required by
# the current in-process NLP engine.
NLP_SERVICE_URL=http://localhost:8000

MAX_FILE_SIZE_MB=20

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

# Stricter limiter applied to /api/auth/* (captcha, login, register)
AUTH_RATE_LIMIT_WINDOW_MS=600000
AUTH_RATE_LIMIT_MAX=30
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:5000/api
```

Never commit a real `.env` file — only `.env.example` is checked in. Never
put secrets in frontend environment variables.

## 8. No-LLM architecture explanation

Every intelligent feature is implemented with classic, explainable NLP:

| Feature | Technique | File |
|---|---|---|
| Document search / retrieval | Okapi BM25 + TF-IDF cosine similarity | `nlp/bm25.js`, `nlp/tfidf.js` |
| Question answering | BM25 chunk retrieval → TF-IDF sentence re-rank → keyword-overlap relevance gate | `nlp/qa.js` |
| Summarization | TextRank (PageRank over a TF-IDF sentence-similarity graph) + lead-position bias | `nlp/textrank.js`, `nlp/summarizer.js` |
| Key points | TextRank sentence ranking, shorter output | `nlp/keywords.js` |
| Keywords | Aggregated TF-IDF weight × log-frequency | `nlp/keywords.js` |
| Preprocessing | Custom tokenizer, stopword filter, sentence/paragraph splitter, lightweight stemmer | `nlp/preprocess.js` |

The QA engine explicitly returns "I couldn't find information related to
this question in the selected document" whenever no passage clears a
relevance floor — see `RELEVANCE_FLOOR` and the keyword-overlap gate in
`nlp/qa.js`. Verified during development: a document about admission and
billing policy correctly answers "What is the billing policy?" but
correctly declines unrelated questions instead of fabricating an answer.

Retrieval runs against `DocumentChunk` documents (a dedicated MongoDB
collection, `documentchunks`) built once at upload time, rather than
recomputing chunks on every question.

## 9. Running all services

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

That's it — two processes. There is no third "nlp-service" process because
the NLP engine is a set of in-process JS modules rather than a separate
microservice.

## 10. API documentation

Base URL: `/api`

**Auth**
- `GET /auth/captcha` — issue a new CAPTCHA image `{ captchaId, image }`
- `POST /auth/captcha/refresh` `{ captchaId }` — invalidate + issue a new one
- `POST /auth/register` `{ name, email, password, confirmPassword, acceptTerms, captchaId, captchaAnswer }`
- `POST /auth/login` `{ email, password, captchaId, captchaAnswer }`
- `POST /auth/logout`
- `POST /auth/logout-all` — bumps `tokenVersion`, invalidating every previously issued JWT
- `GET /auth/me`
- `PATCH /auth/me` `{ name?, theme?, settings? }`
- `POST /auth/change-password` `{ currentPassword, newPassword }`

**Documents**
- `POST /documents/upload` — multipart `file` (+ optional `name`)
- `GET /documents?q=&favorite=&sort=` — list/search
- `GET /documents/:id`
- `PATCH /documents/:id` `{ name?, isFavorite? }`
- `DELETE /documents/:id` — deletes MongoDB doc, Cloudinary file, chunks, and bound conversations
- `GET /documents/:id/download` — redirects to the Cloudinary URL
- `POST /documents/:id/question` `{ question }`
- `POST /documents/:id/summarize` `{ length: short|medium|detailed }`
- `GET /documents/:id/keywords`
- `GET /documents/:id/key-points`
- `GET /documents/:id/sources/:page`

**Conversations**
- `GET /conversations?q=`
- `POST /conversations` `{ documentId?, title? }`
- `GET /conversations/:id`
- `PATCH /conversations/:id` `{ title?, documentId? }`
- `DELETE /conversations/:id`
- `POST /conversations/:id/messages` `{ content }`
- `POST /conversations/:id/regenerate/:messageId`
- `PATCH /messages/:id/feedback` `{ feedback: "up"|"down"|null }`

**Health**
- `GET /health` → `{ status, service, database, llm: "none" }`

All routes except `/auth/register`, `/auth/login`, `/auth/captcha*`, and
`/health` require `Authorization: Bearer <jwt>`.

## 11. Demo mode / test credentials

There are no hardcoded fake answers anywhere in the production logic. To try
the app quickly:

1. Register a real account (any email/password meeting the strength rules) — solve the CAPTCHA shown.
2. Upload one of the files in `demo-samples/` (e.g. `sample-hospital-policy.txt`).
3. Ask questions like "What is the refund policy?" or "What do I need to bring to my appointment?"
4. Ask an unrelated question ("What's the weather tomorrow?") to see the
   honest "couldn't find" fallback in action.

## 12. Known limitations

Being upfront about what's stubbed vs. fully wired:

- **Background jobs:** document processing runs via a deferred in-process tick (`setImmediate`), not a dedicated job queue. Fine for demo/small-scale use; swap for BullMQ/Redis or a cloud task queue for production-scale concurrent uploads.
- **PDF page boundaries:** `pdf-parse` doesn't expose true per-page text, so page breaks for PDFs without embedded form-feed characters are approximated (~350 words/page) for the source viewer. Answers are still always attributed to the correct underlying chunk of text.
- **OCR:** not implemented. Scanned/image-only PDFs will correctly report "No text found" rather than silently failing.
- **"Continue with Google":** UI only, no backend OAuth flow wired up.
- **NLP service:** implemented as in-process Node modules rather than a separate Python/FastAPI microservice, for fewer moving parts to run locally. The algorithms (TF-IDF, BM25, TextRank) are unchanged; only the deployment topology differs. `NLP_SERVICE_URL` is reserved if you later split this out.

## 13. Production deployment

- **Frontend → Vercel:** `npm run build` in `frontend/` produces static files in `frontend/dist/`. Set `VITE_API_URL` to your deployed backend's public URL.
- **Backend → Render** (or any Node host): set every variable from `.env.example`, especially `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, and `FRONTEND_URL` (your deployed Vercel URL, for CORS).
- **Database → MongoDB Atlas:** create a cluster, a database user, and allow-list your backend host's IP (or `0.0.0.0/0` behind Atlas network security if using a PaaS with dynamic egress IPs).
- **Documents → Cloudinary:** create a free account, grab the cloud name/API key/API secret from the dashboard, and set the three `CLOUDINARY_*` variables.
- Never hardcode deployment URLs — both `VITE_API_URL` and `FRONTEND_URL` are environment-driven.
- Rotate `JWT_SECRET` before going live, and confirm `/api/health` reports `"database": "connected"` after deploying.

## Password reset email (Brevo)

DocumentAI now supports secure forgot-password/reset-password flows using Brevo SMTP. Set these values in `backend/.env` using the SMTP credentials and a verified sender from Brevo:

```env
BREVO_API_KEY=your-brevo-api-key
MAIL_FROM_EMAIL=your-verified-sender@example.com
MAIL_FROM_NAME=DocumentAI
PASSWORD_RESET_EXPIRE_MINUTES=30
```

The reset flow is: `/forgot-password` → Brevo email → `/reset-password/:token`. Reset tokens are cryptographically random, stored only as SHA-256 hashes, expire after the configured period, are single-use, and password reset increments the user's JWT token version to invalidate previous sessions.

Never commit real Brevo credentials to source control.
