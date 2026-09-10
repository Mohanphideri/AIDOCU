const express = require('express');
const controller = require('../controllers/blueprintController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/', controller.create);
router.get('/exam/:examId', controller.getByExam);
router.put('/:blueprintId', controller.update);

module.exports = router;
