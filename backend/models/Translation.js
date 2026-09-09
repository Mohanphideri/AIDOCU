const mongoose = require('mongoose');
const { Schema } = mongoose;

const TRANSLATION_STATUSES = ['DRAFT', 'TRANSLATING', 'IN_REVIEW', 'APPROVED'];

const TranslationSchema = new Schema(
  {
    examQuestionId: { type: Schema.Types.ObjectId, ref: 'ExamQuestion', required: true, index: true },
    questionVersionId: { type: Schema.Types.ObjectId, ref: 'QuestionVersion', required: true },
    language: { type: String, enum: ['hi', 'pa', 'ta'], required: true }, // English is the source, not stored here

    // Only question text and options are translated; IDs, marks, and correctness
    // metadata are never translated.
    questionText: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },

    versionNumber: { type: Number, required: true, default: 1 },
    status: { type: String, enum: TRANSLATION_STATUSES, default: 'DRAFT', index: true },

    provider: { type: String, default: 'MOCK_LOCAL' }, // e.g. 'MOCK_LOCAL', 'BHASHINI', 'INDICTRANS2'

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TranslationSchema.index({ examQuestionId: 1, language: 1, versionNumber: 1 }, { unique: true });
TranslationSchema.statics.TRANSLATION_STATUSES = TRANSLATION_STATUSES;

module.exports = mongoose.model('Translation', TranslationSchema);
