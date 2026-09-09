const { Student, Exam, StudentQuery, ProctoringEvent, FacultyQuestionSubmission } = require('../models');

/**
 * At-a-glance counts for the admin Dashboard tab (spec's "Dashboard" tab —
 * total students, live exams, pending queries, proctoring alerts). Kept as
 * simple aggregate counts rather than heavy joins so this stays cheap to
 * call on every dashboard load.
 */
async function getStats() {
  const [
    totalStudents,
    activeStudents,
    pendingVerificationStudents,
    liveExams,
    scheduledExams,
    pendingQueries,
    proctoringAlerts,
    pendingFacultySubmissions,
  ] = await Promise.all([
    Student.countDocuments({}),
    Student.countDocuments({ accountStatus: 'ACTIVE' }),
    Student.countDocuments({ accountStatus: 'PENDING_VERIFICATION' }),
    Exam.countDocuments({ status: 'ACTIVE' }),
    Exam.countDocuments({ status: 'SCHEDULED' }),
    StudentQuery.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
    ProctoringEvent.countDocuments({ reviewStatus: { $in: ['UNREVIEWED', 'REQUIRES_REVIEW'] } }),
    FacultyQuestionSubmission.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
  ]);

  return {
    totalStudents,
    activeStudents,
    pendingVerificationStudents,
    liveExams,
    scheduledExams,
    pendingQueries,
    proctoringAlerts,
    pendingFacultySubmissions,
  };
}

/**
 * A short list of the most recent unreviewed proctoring events, for the
 * "proctoring alerts" panel — separate from the count above so the
 * dashboard can show both a headline number and a quick preview.
 */
async function getRecentProctoringAlerts(limit = 10) {
  return ProctoringEvent.find({ reviewStatus: { $in: ['UNREVIEWED', 'REQUIRES_REVIEW'] } })
    .sort({ serverTimestamp: -1 })
    .limit(limit)
    .populate('studentId', 'name uid')
    .populate('examId', 'subjectCode examType');
}

module.exports = { getStats, getRecentProctoringAlerts };
