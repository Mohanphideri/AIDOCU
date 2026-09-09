const mongoose = require('mongoose');
const { Schema } = mongoose;

const StudentVerificationSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    codeHash: { type: String, required: true }, // SHA-256 hash only, never plaintext
    expiresAt: { type: Date, required: true },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, required: true },
    used: { type: Boolean, default: false },
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true }
);

StudentVerificationSchema.index({ studentId: 1, used: 1 });

module.exports = mongoose.model('StudentVerification', StudentVerificationSchema);
