const crypto = require('crypto');

/**
 * Codes/tokens (email verification codes, password reset tokens) must never
 * be stored in plaintext. We generate a random value, return the plaintext
 * once (to send via email), and store only a SHA-256 hash for comparison.
 */

function generateNumericCode(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

function generateUrlSafeToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashValue(plainValue) {
  return crypto.createHash('sha256').update(plainValue).digest('hex');
}

module.exports = { generateNumericCode, generateUrlSafeToken, hashValue };
