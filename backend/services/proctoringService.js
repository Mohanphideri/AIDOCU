const { ExamAttempt, ProctoringEvent } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const attemptService = require('./attemptService');
const auditService = require('./auditService');

/**
 * Records a proctoring event. For FULLSCREEN_EXIT specifically, the server
 * — never the client — increments and owns fullscreenViolationCount, and
 * auto-submits on the 3rd violation per university policy.
 */
async function recordEvent({ attemptId, studentId, examId, type, metadata = {} }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }

  const event = await ProctoringEvent.create({
    examId,
    attemptId,
    studentId,
    type,
    metadata,
    serverTimestamp: new Date(),
    reviewStatus: 'UNREVIEWED',
  });

  if (type === 'FULLSCREEN_EXIT' && attempt.status === 'ACTIVE') {
    attempt.fullscreenViolationCount += 1;
    await attempt.save();

    if (attempt.fullscreenViolationCount >= 3) {
      await attemptService.submitAttempt({
        attemptId: attempt._id,
        studentId,
        reason: 'FULLSCREEN_VIOLATION',
      });

      await auditService.record({
        actorId: studentId,
        actorRole: 'SYSTEM',
        action: 'FULLSCREEN_AUTO_SUBMIT',
        entityType: 'ExamAttempt',
        entityId: attempt._id,
        metadata: { violationCount: attempt.fullscreenViolationCount },
      });
    }
  }

  return {
    event,
    fullscreenViolationCount: attempt.fullscreenViolationCount,
    attemptStatus: attempt.status,
  };
}

module.exports = { recordEvent };
