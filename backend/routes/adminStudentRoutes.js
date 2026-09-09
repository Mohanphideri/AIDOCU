const express = require('express');
const controller = require('../controllers/studentAdminController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', controller.list);
router.get('/:studentId', controller.getOne);
router.post('/:studentId/status', controller.updateStatus);

module.exports = router;
