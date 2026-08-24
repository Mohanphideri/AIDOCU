/**
 * middleware/rateLimiters.js
 * Separate, stricter rate limiter for authentication-adjacent routes
 * (captcha issuance, login, register) on top of the general API limiter
 * in server.js, to slow down credential-stuffing / CAPTCHA-farming.
 */
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Please wait a few minutes and try again.' },
});

module.exports = { authLimiter, uploadLimiter };
