const mongoose = require('mongoose');
const { Schema } = mongoose;

const EVENT_TYPES = [
  'FULLSCREEN_EXIT',
  'TAB_SWITCH',
  'VISIBILITY_CHANGE',
  'WINDOW_BLUR',
  'PAGE_UNLOAD',
  'CAMERA_DISCONNECTED',
  'MIC_DISCONNECTED',
  'NETWORK_DISCONNECTED',
  'RECONNECTED',
  'NO_FACE_DETECTED',
  'MULTIPLE_FACE_DETECTED',
];

// Events are evidence/indicators for human review — never automatic proof of
// cheating. No field on this model should ever assert a verdict.
const ProctoringEventSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    serverTimestamp: { type: Date, default: Date.now, index: true },
    reviewStatus: { type: String, enum: ['UNREVIEWED', 'REQUIRES_REVIEW', 'REVIEWED'], default: 'UNREVIEWED' },
  },
  { timestamps: true }
);

ProctoringEventSchema.statics.EVENT_TYPES = EVENT_TYPES;

module.exports = mongoose.model('ProctoringEvent', ProctoringEventSchema);
