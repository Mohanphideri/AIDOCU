const { ExamAttempt, AttemptQuestion, Answer } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const timingService = require('./timingService');

/**
 * Saves/updates a single answer. Every save re-validates ownership and
 * expiration server-side — never trust that the client only calls this
 * while time genuinely remains.
 */
async function saveAnswer({ attemptId, studentId, attemptQuestionId, selectedOption }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }
  if (attempt.status !== 'ACTIVE') {
    throw new ApiError('This attempt is no longer active', 403, 'ATTEMPT_NOT_ACTIVE');
  }
  if (timingService.isExpired(attempt.examEndTime)) {
    throw new ApiError('Examination time has expired', 403, 'TIME_EXPIRED');
  }

  const attemptQuestion = await AttemptQuestion.findOne({ _id: attemptQuestionId, attemptId });
  if (!attemptQuestion) {
    throw new ApiError('Question does not belong to this attempt', 403, 'INVALID_QUESTION');
  }

  if (selectedOption !== null && !['A', 'B', 'C', 'D'].includes(selectedOption)) {
    throw new ApiError('Invalid option', 400, 'INVALID_OPTION');
  }

  const answer = await Answer.findOneAndUpdate(
    { attemptId, attemptQuestionId },
    { selectedOption, savedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return answer;
}

async function markForReview({ attemptId, studentId, attemptQuestionId, markedForReview }) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt || attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }
  if (attempt.status !== 'ACTIVE') {
    throw new ApiError('This attempt is no longer active', 403, 'ATTEMPT_NOT_ACTIVE');
  }

  const attemptQuestion = await AttemptQuestion.findOneAndUpdate(
    { _id: attemptQuestionId, attemptId },
    { markedForReview, visited: true },
    { new: true }
  );
  if (!attemptQuestion) throw new ApiError('Question does not belong to this attempt', 403, 'INVALID_QUESTION');
  return attemptQuestion;
}

module.exports = { saveAnswer, markForReview };
