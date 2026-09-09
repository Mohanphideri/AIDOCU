const express = require('express');
const controller = require('../controllers/studentAuthController');
const { registerRules, verifyRules, loginRules } = require('../validators/studentAuthValidator');
const {
  registrationLimiter,
  verificationLimiter,
  loginLimiter,
} = require('../middleware/rateLimiters');

const router = express.Router();

router.get('/universities', controller.listUniversitiesPublic);
router.post('/register', registrationLimiter, registerRules, controller.register);
router.post('/verify', verificationLimiter, verifyRules, controller.verifyEmail);
router.post('/resend-verification', verificationLimiter, controller.resendVerification);
router.post('/login', loginLimiter, loginRules, controller.login);

module.exports = router;
