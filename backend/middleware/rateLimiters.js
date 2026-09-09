const rateLimit = require('express-rate-limit');

const jsonRateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  });
};

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: jsonRateLimitHandler,
});

const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  handler: jsonRateLimitHandler,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  handler: jsonRateLimitHandler,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: jsonRateLimitHandler,
});

const proctoringEventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // proctoring events can be frequent, but still bounded
  handler: jsonRateLimitHandler,
});

const queryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  handler: jsonRateLimitHandler,
});

module.exports = {
  registrationLimiter,
  verificationLimiter,
  loginLimiter,
  passwordResetLimiter,
  proctoringEventLimiter,
  queryLimiter,
};
