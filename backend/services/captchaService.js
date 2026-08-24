/**
 * services/captchaService.js
 * ------------------------------------------------------------------
 * Custom server-generated alphanumeric CAPTCHA.
 *
 *   1. Generate random alphanumeric text (safe character set — no
 *      0/O, 1/I/l, 5/S, 8/B confusions).
 *   2. Hash it (SHA-256) and store ONLY the hash + expiry in MongoDB.
 *   3. Render a distorted SVG image containing the text.
 *   4. Return the image (+ an opaque captchaId) to the browser.
 *      The plaintext answer is never sent to, or stored for, the client.
 *
 * Verification (verifyCaptcha) re-hashes the submitted answer and
 * compares it against the stored hash, enforcing expiration, a
 * 5-attempt limit, and strict one-time use.
 * ------------------------------------------------------------------
 */
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const CaptchaChallenge = require('../models/CaptchaChallenge');

// Safe alphanumeric set per spec section 8 — ambiguous characters
// (0/O, 1/I/l, 5/S, 8/B) are deliberately excluded.
const CHARSET = 'ACDEFGHJKMNPQRTUVWXYZ23467';
const CODE_LENGTH = 6;
const EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/**
 * Generate a new CAPTCHA challenge: creates the text + SVG image,
 * stores the hash in MongoDB with a TTL, and returns the id + image
 * to send to the client. The plaintext code never leaves this function.
 */
async function generateCaptcha(sessionId) {
  const captcha = svgCaptcha.create({
    size: CODE_LENGTH,
    noise: 4,
    color: true,
    background: '#F8FAFC',
    ignoreChars: '', // we control the charset explicitly below
    charPreset: CHARSET,
    width: 200,
    height: 70,
  });

  const code = captcha.text; // plaintext — used only to compute the hash below
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

  const challenge = await CaptchaChallenge.create({
    sessionId,
    codeHash,
    expiresAt,
    attempts: 0,
    used: false,
  });

  return {
    captchaId: challenge._id.toString(),
    image: `data:image/svg+xml;utf8,${encodeURIComponent(captcha.data)}`,
    expiresInSeconds: EXPIRY_MINUTES * 60,
  };
}

/**
 * Verify a submitted CAPTCHA answer against the stored hash.
 * Returns { ok: true } or { ok: false, reason, status }.
 * Always consumes an attempt / invalidates the challenge as appropriate
 * so a challenge can never be brute-forced or replayed.
 */
async function verifyCaptchaAnswer(captchaId, answer) {
  if (!captchaId || !answer) {
    return { ok: false, status: 400, reason: 'CAPTCHA answer is required.' };
  }

  let challenge;
  try {
    challenge = await CaptchaChallenge.findById(captchaId);
  } catch {
    return { ok: false, status: 400, reason: 'CAPTCHA challenge is invalid. Please refresh and try again.' };
  }

  if (!challenge) {
    return { ok: false, status: 400, reason: 'CAPTCHA challenge is invalid or expired. Please refresh and try again.' };
  }
  if (challenge.used) {
    return { ok: false, status: 400, reason: 'This CAPTCHA has already been used. Please refresh and try again.' };
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    await challenge.deleteOne();
    return { ok: false, status: 400, reason: 'CAPTCHA has expired. Please refresh and try again.' };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    await challenge.deleteOne();
    return { ok: false, status: 400, reason: 'Too many incorrect attempts. Please refresh for a new CAPTCHA.' };
  }

  const submittedHash = hashCode(answer);
  if (submittedHash !== challenge.codeHash) {
    challenge.attempts += 1;
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await challenge.deleteOne();
      return { ok: false, status: 400, reason: 'Too many incorrect attempts. Please refresh for a new CAPTCHA.' };
    }
    await challenge.save();
    return {
      ok: false,
      status: 400,
      reason: `Incorrect CAPTCHA. ${MAX_ATTEMPTS - challenge.attempts} attempt(s) remaining.`,
    };
  }

  // Correct — mark used immediately so it can never be replayed, then
  // remove it a moment later (kept briefly only for auditability).
  challenge.used = true;
  await challenge.save();
  await challenge.deleteOne();

  return { ok: true };
}

async function invalidateCaptcha(captchaId) {
  if (!captchaId) return;
  try {
    await CaptchaChallenge.findByIdAndDelete(captchaId);
  } catch {
    // ignore — invalid id or already gone
  }
}

module.exports = { generateCaptcha, verifyCaptchaAnswer, invalidateCaptcha, CODE_LENGTH, MAX_ATTEMPTS };
