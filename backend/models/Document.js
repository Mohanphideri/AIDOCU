const { Schema, model } = require('mongoose');

const documentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'txt', 'csv'], required: true },
    fileSize: { type: Number, required: true },

    // Cloudinary storage (never stored on local disk)
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryResourceType: { type: String, default: 'raw' },

    pageCount: { type: Number, default: 0 },
    extractedText: { type: String, default: '' },
    language: { type: String, default: 'en' },

    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'error'],
      default: 'pending',
      index: true,
    },
    processingError: { type: String, default: null },

    isFavorite: { type: Boolean, default: false },

    pages: { type: [String], default: [] },
    keywords: { type: Schema.Types.Mixed, default: [] },
    keyPoints: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, name: 'text', extractedText: 'text' });

documentSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    originalName: this.originalName,
    fileType: this.fileType,
    fileSize: this.fileSize,
    pageCount: this.pageCount,
    language: this.language,
    processingStatus: this.processingStatus,
    processingError: this.processingError,
    isFavorite: this.isFavorite,
    url: this.cloudinaryUrl,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = model('Document', documentSchema);
