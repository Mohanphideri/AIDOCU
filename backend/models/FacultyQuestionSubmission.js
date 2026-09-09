const mongoose = require('mongoose');
const { Schema } = mongoose;

const SUBMISSION_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'USED_IN_EXAMINATION'];

const FacultyQuestionSubmissionSchema = new Schema(
  {
    facultyMemberId: { type: Schema.Types.ObjectId, ref: 'FacultyMember', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },

    questionText: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    marks: { type: Number, required: true, min: 0 },
    unit: { type: String, default: null },
    topic: { type: String, default: null },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    questionType: { type: String, default: 'MCQ' },
    explanation: { type: String, default: '' },
    reference: { type: String, default: '' },
    tags: { type: [String], default: [] },

    status: { type: String, enum: SUBMISSION_STATUSES, default: 'SUBMITTED', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewNotes: { type: String, default: '' },
    convertedQuestionId: { type: Schema.Types.ObjectId, ref: 'Question', default: null },
  },
  { timestamps: true }
);

FacultyQuestionSubmissionSchema.statics.SUBMISSION_STATUSES = SUBMISSION_STATUSES;

module.exports = mongoose.model('FacultyQuestionSubmission', FacultyQuestionSubmissionSchema);
