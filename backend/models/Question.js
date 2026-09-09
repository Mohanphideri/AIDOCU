const mongoose = require('mongoose');
const { Schema } = mongoose;

const QUESTION_STATUSES = ['DRAFT', 'APPROVED', 'REJECTED', 'USED_IN_EXAMINATION'];

const QuestionSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },

    // Denormalized "current" content; historical/locked content lives in QuestionVersion.
    questionText: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    marks: { type: Number, required: true, min: 0 },
    questionType: { type: String, default: 'MCQ' },

    unit: { type: String, default: null },
    topic: { type: String, default: null },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    tags: { type: [String], default: [] },
    explanation: { type: String, default: '' },
    reference: { type: String, default: '' },

    status: { type: String, enum: QUESTION_STATUSES, default: 'DRAFT', index: true },

    currentVersionNumber: { type: Number, default: 1 },
    useCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

QuestionSchema.index({ subjectId: 1, unit: 1, difficulty: 1, status: 1 });
QuestionSchema.statics.QUESTION_STATUSES = QUESTION_STATUSES;

module.exports = mongoose.model('Question', QuestionSchema);
