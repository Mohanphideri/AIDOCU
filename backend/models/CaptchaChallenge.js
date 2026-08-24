const { Schema, model } = require('mongoose');

/**
 * Server-side alphanumeric CAPTCHA challenge.
 * The plaintext code is NEVER stored — only a SHA-256 hash of the
 * (uppercased) code, so nothing usable to solve the challenge lives
 * in the database.
 *
 * The TTL index on `expiresAt` makes MongoDB automatically delete
 * expired challenges (see section 11/54 of the spec).
 */
const captchaChallengeSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// TTL index — MongoDB's background task removes documents once
// expiresAt is in the past (checked roughly every 60s by the server).
captchaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('CaptchaChallenge', captchaChallengeSchema);
