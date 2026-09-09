const express = require('express');
const controller = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', controller.getStats);
router.get('/proctoring-alerts', controller.getProctoringAlerts);

module.exports = router;
