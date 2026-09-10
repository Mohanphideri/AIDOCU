const mongoose = require('mongoose');
const { Schema } = mongoose;

// Shared across all account types (Student + the three staff roles). `role`
// tells us which model `accountId` refers to so a single service/controller
// pair can drive both student and staff password reset flows.
const ROLES = ['STUDENT', 'ADMIN', 'FACULTY', 'SUPERVISOR'];

const PasswordResetTokenSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    tokenHash: { type: String, required: true, index: true }, // SHA-256 hash only
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PasswordResetTokenSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);
