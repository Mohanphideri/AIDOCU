const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttemptQuestionSchema = new Schema(
  {
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    examQuestionId: { type: Schema.Types.ObjectId, ref: 'ExamQuestion', required: true },
    orderIndex: { type: Number, required: true },

    markedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AttemptQuestionSchema.index({ attemptId: 1, orderIndex: 1 }, { unique: true });
AttemptQuestionSchema.index({ attemptId: 1, examQuestionId: 1 }, { unique: true });

module.exports = mongoose.model('AttemptQuestion', AttemptQuestionSchema);
