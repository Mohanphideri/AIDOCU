const express = require('express');
const controller = require('../controllers/facultyQuestionController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.post('/', authenticate, requireRole('FACULTY'), controller.submit);
router.get('/mine', authenticate, requireRole('FACULTY'), controller.listMine);

router.get('/', authenticate, requireRole('ADMIN'), controller.listForAdmin);
router.post('/:submissionId/under-review', authenticate, requireRole('ADMIN'), controller.markUnderReview);
router.post('/:submissionId/approve', authenticate, requireRole('ADMIN'), controller.approve);
router.post('/:submissionId/reject', authenticate, requireRole('ADMIN'), controller.reject);

module.exports = router;
