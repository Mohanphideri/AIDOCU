const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnswerSchema = new Schema(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    attemptQuestionId: { type: Schema.Types.ObjectId, ref: 'AttemptQuestion', required: true },
    selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AnswerSchema.index({ attemptId: 1, attemptQuestionId: 1 }, { unique: true });

module.exports = mongoose.model('Answer', AnswerSchema);
