const attemptService = require('../services/attemptService');
const answerService = require('../services/answerService');
const proctoringService = require('../services/proctoringService');
const resultService = require('../services/resultService');
const examDeliveryService = require('../services/examDeliveryService');
const { success } = require('../utils/apiResponse');

async function startAttempt(req, res, next) {
  try {
    const { examId } = req.params;
    const attempt = await attemptService.startAttempt(
      { studentId: req.user.id, examId },
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
    );
    return success(res, attempt, 'Examination attempt started', 201);
  } catch (err) {
    return next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await attemptService.getAttemptStatus(req.params.attemptId);
    return success(res, status);
  } catch (err) {
    return next(err);
  }
}

async function getAttempt(req, res, next) {
  try {
    // req.resource populated by ownsResource() middleware
    return success(res, req.resource);
  } catch (err) {
    return next(err);
  }
}

async function saveAnswer(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { attemptQuestionId, selectedOption } = req.body;
    const answer = await answerService.saveAnswer({
      attemptId,
      studentId: req.user.id,
      attemptQuestionId,
      selectedOption,
    });
    return success(res, answer, 'Answer saved');
  } catch (err) {
    return next(err);
  }
}

async function markForReview(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { attemptQuestionId, markedForReview } = req.body;
    const attemptQuestion = await answerService.markForReview({
      attemptId,
      studentId: req.user.id,
      attemptQuestionId,
      markedForReview,
    });
    return success(res, attemptQuestion, 'Updated');
  } catch (err) {
    return next(err);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const { attemptId } = req.params;
    const attempt = await attemptService.studentSubmit({ attemptId, studentId: req.user.id });
    const result = await resultService.calculateResult(attempt._id);
    return success(res, { attempt, result }, 'Examination submitted successfully');
  } catch (err) {
    return next(err);
  }
}

async function recordProctoringEvent(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { examId, type, metadata } = req.body;
    const result = await proctoringService.recordEvent({
      attemptId,
      studentId: req.user.id,
      examId,
      type,
      metadata,
    });
    return success(res, result, 'Event recorded');
  } catch (err) {
    return next(err);
  }
}

async function getQuestions(req, res, next) {
  try {
    const result = await examDeliveryService.getAttemptQuestions(req.params.attemptId, req.user.id);
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

async function changeLanguage(req, res, next) {
  try {
    const attempt = await examDeliveryService.changeLanguage({
      attemptId: req.params.attemptId,
      studentId: req.user.id,
      language: req.body.language,
    });
    return success(res, attempt, 'Language updated');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  startAttempt,
  getStatus,
  getAttempt,
  getQuestions,
  changeLanguage,
  saveAnswer,
  markForReview,
  submitAttempt,
  recordProctoringEvent,
};
