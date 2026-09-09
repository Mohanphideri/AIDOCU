const express = require('express');

const studentAuthRoutes = require('./studentAuthRoutes');
const staffAuthRoutes = require('./staffAuthRoutes');
const examRoutes = require('./examRoutes');
const attemptRoutes = require('./attemptRoutes');
const resultRoutes = require('./resultRoutes');
const adminQueryRoutes = require('./adminQueryRoutes');
const auditRoutes = require('./auditRoutes');
const questionRoutes = require('./questionRoutes');
const facultyQuestionRoutes = require('./facultyQuestionRoutes');
const blueprintRoutes = require('./blueprintRoutes');
const paperRoutes = require('./paperRoutes');
const translationRoutes = require('./translationRoutes');
const academicStructureRoutes = require('./academicStructureRoutes');
const adminDashboardRoutes = require('./adminDashboardRoutes');
const adminStudentRoutes = require('./adminStudentRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'OK', timestamp: new Date().toISOString() }));

// AUTH
router.use('/auth/student', studentAuthRoutes);
router.use('/auth', staffAuthRoutes); // mounts /auth/admin/login, /auth/faculty/login, /auth/supervisor/login

// ACADEMIC STRUCTURE (University/Session/Faculty/Department/Programme/Semester/Subject)
router.use('/academic', academicStructureRoutes);

// EXAMS (also mounts /exams/:examId/eligibility, /exams/:examId/start, /exams/:examId/results/publish)
router.use('/exams', examRoutes);

// ATTEMPTS (also mounts answer save, proctoring events, and query submission)
router.use('/attempts', attemptRoutes);

// RESULTS
router.use('/results', resultRoutes);

// QUESTION BANK
router.use('/questions', questionRoutes);

// FACULTY QUESTION SUBMISSIONS
router.use('/faculty-questions', facultyQuestionRoutes);

// BLUEPRINTS
router.use('/blueprints', blueprintRoutes);

// PAPERS
router.use('/papers', paperRoutes);

// TRANSLATIONS
router.use('/translations', translationRoutes);

// ADMIN QUERY MANAGEMENT
router.use('/admin/queries', adminQueryRoutes);

// ADMIN DASHBOARD OVERVIEW
router.use('/admin/dashboard', adminDashboardRoutes);

// ADMIN STUDENT MANAGEMENT
router.use('/admin/students', adminStudentRoutes);

// AUDIT
router.use('/admin/audit', auditRoutes);

module.exports = router;
