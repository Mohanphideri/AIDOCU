const express = require('express');
const controller = require('../controllers/staffAuthController');
const { staffLoginRules } = require('../validators/staffAuthValidator');
const { forgotPasswordRules, resetPasswordRules } = require('../validators/passwordResetValidator');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/admin/login', loginLimiter, staffLoginRules, controller.adminLogin);
router.post('/faculty/login', loginLimiter, staffLoginRules, controller.facultyLogin);
router.post('/supervisor/login', loginLimiter, staffLoginRules, controller.supervisorLogin);

router.post('/admin/forgot-password', passwordResetLimiter, forgotPasswordRules, controller.adminForgotPassword);
router.post('/faculty/forgot-password', passwordResetLimiter, forgotPasswordRules, controller.facultyForgotPassword);
router.post('/supervisor/forgot-password', passwordResetLimiter, forgotPasswordRules, controller.supervisorForgotPassword);

router.post('/admin/reset-password', passwordResetLimiter, resetPasswordRules, controller.adminResetPassword);
router.post('/faculty/reset-password', passwordResetLimiter, resetPasswordRules, controller.facultyResetPassword);
router.post('/supervisor/reset-password', passwordResetLimiter, resetPasswordRules, controller.supervisorResetPassword);

module.exports = router;
