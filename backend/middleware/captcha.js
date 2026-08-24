/**
 * middleware/captcha.js
 * Express middleware that verifies req.body.captchaId + req.body.captchaAnswer
 * against services/captchaService.js before letting a request (register,
 * login, etc.) continue. Verification always happens on the server —
 * the browser only ever sees an image, never the answer.
 */
const { verifyCaptchaAnswer } = require('../services/captchaService');

async function verifyCaptcha(req, res, next) {
  const { captchaId, captchaAnswer } = req.body || {};
  const result = await verifyCaptchaAnswer(captchaId, captchaAnswer);
  if (!result.ok) {
    return res.status(result.status || 400).json({ error: result.reason });
  }
  next();
}

module.exports = { verifyCaptcha };
