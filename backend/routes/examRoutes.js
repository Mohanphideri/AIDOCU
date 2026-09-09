const express = require('express');
const examController = require('../controllers/examController');
const attemptController = require('../controllers/attemptController');
const resultController = require('../controllers/resultController');
const eligibilityRoutes = require('./eligibilityRoutes');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Exam-specific eligibility management.
router.use('/:examId/eligibility', eligibilityRoutes);

// Student starts an attempt for this exam.
router.post('/:examId/start', authenticate, requireRole('STUDENT'), attemptController.startAttempt);

// Admin publishes results for this exam.
router.post('/:examId/results/publish', authenticate, requireRole('ADMIN'), resultController.publishResults);

// Admin reviews all results for this exam (before finalize/publish).
router.get('/:examId/results', authenticate, requireRole('ADMIN'), resultController.listForExam);

// Exam CRUD (admin).
router.get('/', authenticate, requireRole('ADMIN', 'FACULTY', 'SUPERVISOR', 'STUDENT'), examController.list);
router.post('/', authenticate, requireRole('ADMIN'), examController.create);
router.get('/:examId', authenticate, requireRole('ADMIN', 'FACULTY', 'SUPERVISOR', 'STUDENT'), examController.getById);
router.put('/:examId', authenticate, requireRole('ADMIN'), examController.update);
router.delete('/:examId', authenticate, requireRole('ADMIN'), examController.remove);

// Lifecycle transitions.
router.post('/:examId/schedule', authenticate, requireRole('ADMIN'), examController.schedule);
router.post('/:examId/transition', authenticate, requireRole('ADMIN'), examController.transition);

module.exports = router;
