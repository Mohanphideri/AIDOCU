const { Schema, model } = require('mongoose');

const registrationOtpSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    captchaId: { type: String, default: null },
  },
  { timestamps: true }
);

registrationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
registrationOtpSchema.index({ email: 1 }, { unique: true });

module.exports = model('RegistrationOtp', registrationOtpSchema);
