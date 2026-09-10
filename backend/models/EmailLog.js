const mongoose = require('mongoose');
const { Schema } = mongoose;

const EMAIL_TYPES = ['VERIFICATION', 'PASSWORD_RESET', 'RESULT_PUBLICATION', 'EXAM_ACTIVE'];
const EMAIL_STATUSES = ['QUEUED', 'SENT', 'FAILED'];

const EmailLogSchema = new Schema(
  {
    recipient: { type: String, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    type: { type: String, enum: EMAIL_TYPES, required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
    resultId: { type: Schema.Types.ObjectId, ref: 'Result', default: null },
    sentAt: { type: Date, default: null },
    providerMessageId: { type: String, default: null },
    status: { type: String, enum: EMAIL_STATUSES, default: 'QUEUED' },
    failureReason: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EmailLogSchema.statics.EMAIL_TYPES = EMAIL_TYPES;
EmailLogSchema.statics.EMAIL_STATUSES = EMAIL_STATUSES;

module.exports = mongoose.model('EmailLog', EmailLogSchema);
