const mongoose = require('mongoose');
const { Schema } = mongoose;

const ATTEMPT_STATUSES = ['CREATED', 'ACTIVE', 'SUBMITTED', 'TIME_EXPIRED', 'AUTO_SUBMITTED', 'TERMINATED'];

const SUBMISSION_REASONS = [
  'MANUAL_SUBMISSION',
  'TIME_EXPIRED',
  'FULLSCREEN_VIOLATION',
  'SUPERVISOR_TERMINATED',
  'ADMIN_TERMINATED',
];

// Valid forward transitions. Enforced in attemptService, not the client.
const ATTEMPT_TRANSITIONS = {
  CREATED: ['ACTIVE'],
  ACTIVE: ['SUBMITTED', 'TIME_EXPIRED', 'AUTO_SUBMITTED', 'TERMINATED'],
  SUBMITTED: [],
  TIME_EXPIRED: [],
  AUTO_SUBMITTED: [],
  TERMINATED: [],
};

const ExamAttemptSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper', required: true },

    language: { type: String, enum: ['en', 'hi', 'pa', 'ta'], default: 'en' },

    // The exact question order (and, if randomized, option order) shown to
    // this student — fixed at attempt creation, never regenerated on refresh.
    questionOrder: [{ type: Schema.Types.ObjectId, ref: 'ExamQuestion' }],

    // Server-authoritative timing. Client countdown is cosmetic only.
    startedAt: { type: Date, required: true },
    examEndTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },

    status: { type: String, enum: ATTEMPT_STATUSES, default: 'CREATED', index: true },

    fullscreenViolationCount: { type: Number, default: 0 },

    submittedAt: { type: Date, default: null },
    submissionReason: { type: String, enum: [...SUBMISSION_REASONS, null], default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

// One active attempt per student per exam is enforced at the application
// layer (see attemptService) using a transaction + this partial-style check;
// Mongoose doesn't support partial unique indexes portably across all
// deployments, so uniqueness of *active* attempts is guarded in the service.
ExamAttemptSchema.index({ examId: 1, studentId: 1 });
// Note: `status` already has a field-level index (see schema above).

ExamAttemptSchema.statics.ATTEMPT_STATUSES = ATTEMPT_STATUSES;
ExamAttemptSchema.statics.SUBMISSION_REASONS = SUBMISSION_REASONS;
ExamAttemptSchema.statics.ATTEMPT_TRANSITIONS = ATTEMPT_TRANSITIONS;

module.exports = mongoose.model('ExamAttempt', ExamAttemptSchema);
