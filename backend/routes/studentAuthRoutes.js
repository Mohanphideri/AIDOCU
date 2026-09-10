const express = require('express');
const controller = require('../controllers/studentAuthController');
const { registerRules, verifyRules, loginRules } = require('../validators/studentAuthValidator');
const { forgotPasswordRules, resetPasswordRules } = require('../validators/passwordResetValidator');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const {
  registrationLimiter,
  verificationLimiter,
  loginLimiter,
  passwordResetLimiter,
} = require('../middleware/rateLimiters');

const router = express.Router();

router.get('/universities', controller.listUniversitiesPublic);
router.post('/register', registrationLimiter, registerRules, controller.register);
router.post('/verify', verificationLimiter, verifyRules, controller.verifyEmail);
router.post('/resend-verification', verificationLimiter, controller.resendVerification);
router.post('/login', loginLimiter, loginRules, controller.login);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordRules, controller.forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordRules, controller.resetPassword);
router.get('/me', authenticate, requireRole('STUDENT'), controller.me);

module.exports = router;
