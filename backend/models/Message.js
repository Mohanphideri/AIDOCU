const { Schema, model } = require('mongoose');

const sourceSchema = new Schema(
  {
    page: Number,
    section: String,
    snippet: String,
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: { type: [sourceSchema], default: [] },
    feedback: { type: String, enum: ['up', 'down', null], default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

messageSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    conversationId: this.conversationId.toString(),
    role: this.role,
    content: this.content,
    sources: this.sources || [],
    feedback: this.feedback,
    createdAt: this.createdAt,
  };
};

module.exports = model('Message', messageSchema);
