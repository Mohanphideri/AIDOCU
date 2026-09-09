const mongoose = require('mongoose');
const { Schema } = mongoose;

const QUERY_CATEGORIES = ['QUESTION', 'OPTIONS', 'TRANSLATION', 'TECHNICAL_ISSUE', 'TIMER', 'ANSWER_SUBMISSION', 'OTHER'];
const QUERY_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'RESOLVED'];

const StudentQuerySchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    questionVersionId: { type: Schema.Types.ObjectId, ref: 'QuestionVersion', required: true },

    // Preserved exactly as shown to the student, since the live question may
    // change later.
    questionTextShown: { type: String, required: true },
    optionsShown: { type: Schema.Types.Mixed, required: true },
    selectedOptionShown: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    language: { type: String, enum: ['en', 'hi', 'pa', 'ta'], default: 'en' },
    translationVersionId: { type: Schema.Types.ObjectId, ref: 'Translation', default: null },

    category: { type: String, enum: QUERY_CATEGORIES, required: true },
    queryText: { type: String, required: true },

    status: { type: String, enum: QUERY_STATUSES, default: 'SUBMITTED', index: true },
    resolution: { type: String, default: '' },

    submittedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

// One active query per question per attempt.
StudentQuerySchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
StudentQuerySchema.index({ examId: 1, studentId: 1 });

StudentQuerySchema.statics.QUERY_CATEGORIES = QUERY_CATEGORIES;
StudentQuerySchema.statics.QUERY_STATUSES = QUERY_STATUSES;

module.exports = mongoose.model('StudentQuery', StudentQuerySchema);
