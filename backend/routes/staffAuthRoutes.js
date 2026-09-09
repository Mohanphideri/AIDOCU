const express = require('express');
const controller = require('../controllers/staffAuthController');
const { staffLoginRules } = require('../validators/staffAuthValidator');
const { loginLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/admin/login', loginLimiter, staffLoginRules, controller.adminLogin);
router.post('/faculty/login', loginLimiter, staffLoginRules, controller.facultyLogin);
router.post('/supervisor/login', loginLimiter, staffLoginRules, controller.supervisorLogin);

module.exports = router;
