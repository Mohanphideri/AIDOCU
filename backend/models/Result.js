const mongoose = require('mongoose');
const { Schema } = mongoose;

const RESULT_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'FINALIZED', 'PUBLISHED', 'UNDER_REVISION'];

// FINALIZED does NOT mean PUBLISHED. Only an explicit admin action
// (see resultService.publishResults) moves FINALIZED -> PUBLISHED.
const RESULT_TRANSITIONS = {
  DRAFT: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['FINALIZED', 'DRAFT'],
  FINALIZED: ['PUBLISHED', 'UNDER_REVIEW'],
  PUBLISHED: ['UNDER_REVISION'],
  UNDER_REVISION: ['FINALIZED'],
};

const ResultSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, unique: true },

    maximumMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, default: null },
    passFail: { type: String, enum: ['PASS', 'FAIL'], required: true },

    status: { type: String, enum: RESULT_STATUSES, default: 'DRAFT', index: true },

    remarks: { type: String, default: '' },

    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },

    finalizedAt: { type: Date, default: null },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

ResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

ResultSchema.statics.RESULT_STATUSES = RESULT_STATUSES;
ResultSchema.statics.RESULT_TRANSITIONS = RESULT_TRANSITIONS;

module.exports = mongoose.model('Result', ResultSchema);
