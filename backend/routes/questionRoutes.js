const express = require('express');
const controller = require('../controllers/questionController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', controller.search);
router.post('/', controller.create);
router.post('/import', controller.importQuestions);
router.put('/:questionId', controller.update);
router.post('/:questionId/approve', controller.approve);
router.post('/:questionId/reject', controller.reject);

module.exports = router;
