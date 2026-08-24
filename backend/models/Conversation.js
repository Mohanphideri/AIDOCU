const { Schema, model } = require('mongoose');

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
    title: { type: String, default: 'New chat' },
    isPublic: { type: Boolean, default: false },
    shareId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

conversationSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    documentId: this.documentId ? this.documentId.toString() : null,
    title: this.title,
    isPublic: this.isPublic,
    shareId: this.isPublic ? this.shareId : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Fields safe to expose on the unauthenticated public share page —
// deliberately excludes userId/documentId so viewers can't infer
// anything about the owner or reach their private document record.
conversationSchema.methods.toSharedPublic = function toSharedPublic() {
  return {
    id: this._id.toString(),
    title: this.title,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = model('Conversation', conversationSchema);
