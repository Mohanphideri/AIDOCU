const express = require('express');
const controller = require('../controllers/attemptController');
const queryController = require('../controllers/queryController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');
const { ownsResource } = require('../middleware/ownership');
const { proctoringEventLimiter, queryLimiter } = require('../middleware/rateLimiters');
const { ExamAttempt } = require('../models');

const router = express.Router();

router.use(authenticate, requireRole('STUDENT'));

const ownsAttempt = ownsResource({ model: ExamAttempt, paramName: 'attemptId', ownerField: 'studentId' });

router.get('/:attemptId', ownsAttempt, controller.getAttempt);
router.get('/:attemptId/status', ownsAttempt, controller.getStatus);
router.get('/:attemptId/questions', ownsAttempt, controller.getQuestions);
router.post('/:attemptId/language', ownsAttempt, controller.changeLanguage);
router.post('/:attemptId/answer', controller.saveAnswer);
router.post('/:attemptId/mark-review', controller.markForReview);
router.post('/:attemptId/submit', controller.submitAttempt);
router.post('/:attemptId/proctoring-events', proctoringEventLimiter, controller.recordProctoringEvent);
router.post('/:attemptId/queries', queryLimiter, queryController.submitQuery);
router.get('/:attemptId/queries', ownsAttempt, queryController.listMyQueries);

module.exports = router;
