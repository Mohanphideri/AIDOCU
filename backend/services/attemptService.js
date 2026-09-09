const mongoose = require('mongoose');
const {
  Exam,
  ExamAttempt,
  AttemptQuestion,
  ExamQuestion,
  Student,
} = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const eligibilityService = require('./eligibilityService');
const timingService = require('./timingService');
const auditService = require('./auditService');

const ACTIVE_STATUSES = ['CREATED', 'ACTIVE'];

/**
 * Full server-side gate before an attempt is created. Mirrors the "Exam
 * Security Flow" in the spec section 111. Every check happens here, never on
 * the client.
 */
async function startAttempt({ studentId, examId }, meta = {}) {
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');
  if (student.accountStatus !== 'ACTIVE' || !student.emailVerified) {
    throw new ApiError('Your account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Examination not found', 404, 'NOT_FOUND');
  if (exam.status !== 'ACTIVE') {
    throw new ApiError('This examination is not currently available', 403, 'EXAM_NOT_AVAILABLE');
  }
  if (!exam.lockedPaperId) {
    throw new ApiError('This examination has no locked paper and cannot be started', 500, 'NO_LOCKED_PAPER');
  }

  const now = new Date();
  if (now < exam.startTime || now > exam.endTime) {
    throw new ApiError('This examination is not currently open', 403, 'OUTSIDE_EXAM_WINDOW');
  }

  const eligible = await eligibilityService.isStudentEligible({ examId, studentId });
  if (!eligible) {
    throw new ApiError(
      'You are not eligible for this examination. Your UID is not included in the list of eligible students for this paper. Please contact your university examination team if you believe this is an error.',
      403,
      'NOT_ELIGIBLE'
    );
  }

  // One active attempt per student/exam — enforced inside a transaction to
  // close the race condition between concurrent tabs/requests.
  const session = await mongoose.startSession();
  try {
    let attempt;
    await session.withTransaction(async () => {
      const existingActive = await ExamAttempt.findOne({
        examId,
        studentId,
        status: { $in: ACTIVE_STATUSES },
      }).session(session);

      if (existingActive) {
        attempt = existingActive; // Refresh/reconnect case — restore, don't recreate.
        return;
      }

      const examQuestions = await ExamQuestion.find({ paperId: exam.lockedPaperId })
        .sort({ orderIndex: 1 })
        .session(session);

      if (!examQuestions.length) {
        throw new ApiError('Locked paper has no questions', 500, 'INVALID_PAPER');
      }

      const startedAt = now;
      const examEndTime = timingService.computeEndTime(startedAt, exam.durationMinutes);

      const [created] = await ExamAttempt.create(
        [
          {
            examId,
            studentId,
            paperId: exam.lockedPaperId,
            language: 'en',
            questionOrder: examQuestions.map((q) => q._id),
            startedAt,
            examEndTime,
            durationMinutes: exam.durationMinutes,
            status: 'ACTIVE',
            ipAddress: meta.ipAddress || null,
            userAgent: meta.userAgent || null,
          },
        ],
        { session }
      );

      const attemptQuestionDocs = examQuestions.map((eq, index) => ({
        attemptId: created._id,
        examQuestionId: eq._id,
        orderIndex: index,
      }));
      await AttemptQuestion.insertMany(attemptQuestionDocs, { session });

      attempt = created;
    });

    await auditService.record({
      actorId: studentId,
      actorRole: 'STUDENT',
      action: 'EXAM_ATTEMPT_START',
      entityType: 'ExamAttempt',
      entityId: attempt._id,
      metadata: { examId },
      ipAddress: meta.ipAddress || null,
    });

    return attempt;
  } finally {
    session.endSession();
  }
}

/** Server-computed remaining time — never trust a client-sent value. */
async function getAttemptStatus(attemptId) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');

  const remainingMs = timingService.getRemainingMs(attempt.examEndTime);
  return {
    attemptId: attempt._id,
    status: attempt.status,
    remainingMs,
    examEndTime: attempt.examEndTime,
    fullscreenViolationCount: attempt.fullscreenViolationCount,
  };
}

async function submitAttempt({ attemptId, studentId, reason = 'MANUAL_SUBMISSION' }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND'); // generic — avoid IDOR fingerprinting
  }
  if (!ExamAttempt.ATTEMPT_TRANSITIONS[attempt.status].length) {
    throw new ApiError('This attempt has already been finalized', 400, 'ALREADY_FINALIZED');
  }

  const targetStatus = reason === 'MANUAL_SUBMISSION' ? 'SUBMITTED' : reason;

  attempt.status = targetStatus;
  attempt.submittedAt = new Date();
  attempt.submissionReason = reason;
  await attempt.save();

  await auditService.record({
    actorId: studentId,
    actorRole: 'STUDENT',
    action: 'EXAM_SUBMISSION',
    entityType: 'ExamAttempt',
    entityId: attempt._id,
    metadata: { reason },
  });

  // Result calculation is triggered from here in the full implementation:
  // await resultService.calculateResult(attempt._id)
  return attempt;
}

/**
 * The student-facing "Submit" action. The client may believe it is
 * submitting manually, but the server always re-checks its own clock first
 * — if time has actually already run out, the submission is recorded as
 * TIME_EXPIRED regardless of what the client requested. Never trust a
 * client-provided submission reason for this path.
 */
async function studentSubmit({ attemptId, studentId }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');

  const reason = timingService.isExpired(attempt.examEndTime) ? 'TIME_EXPIRED' : 'MANUAL_SUBMISSION';
  return submitAttempt({ attemptId, studentId, reason });
}

module.exports = { startAttempt, getAttemptStatus, submitAttempt, studentSubmit };
