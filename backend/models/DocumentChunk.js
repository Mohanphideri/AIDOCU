const { Schema, model } = require('mongoose');

/**
 * Searchable chunks that back the BM25 / TF-IDF retrieval index for a
 * document. Stored as their own collection (rather than embedded) so
 * the index can be rebuilt or queried independently of the parent
 * document, matching the `documentchunks` collection in the spec.
 */
const documentChunkSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true },
    page: { type: Number, default: 1 },
    section: { type: String, default: null },
    chunkIndex: { type: Number, required: true },

    // Optional, defaulted fields added for the intelligence upgrade.
    // Existing chunks (created before this change) simply fall back to
    // these defaults — no migration/backfill required.
    chunkType: { type: String, enum: ['paragraph', 'heading', 'list', 'table'], default: 'paragraph' },
    sentenceIndexStart: { type: Number, default: null },
  },
  { timestamps: true }
);

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

module.exports = model('DocumentChunk', documentChunkSchema);
