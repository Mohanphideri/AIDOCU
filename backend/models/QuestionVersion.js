const mongoose = require('mongoose');
const { Schema } = mongoose;

// Immutable snapshot of a Question at a point in time. Locked exams reference
// an exact QuestionVersion so later edits to the live Question never change
// a historical examination.
const QuestionVersionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    versionNumber: { type: Number, required: true },

    questionText: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    marks: { type: Number, required: true },
    questionType: { type: String, default: 'MCQ' },
    unit: { type: String, default: null },
    topic: { type: String, default: null },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },

    changedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    changeReason: { type: String, default: '' },
  },
  { timestamps: true }
);

QuestionVersionSchema.index({ questionId: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('QuestionVersion', QuestionVersionSchema);
