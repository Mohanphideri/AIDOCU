const resultService = require('../services/resultService');
const { success } = require('../utils/apiResponse');
const { env } = require('../config/env');

async function getMyResult(req, res, next) {
  try {
    const result = await resultService.getResultForStudent({
      resultId: req.params.resultId,
      studentId: req.user.id,
    });
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

async function finalizeResult(req, res, next) {
  try {
    const result = await resultService.finalizeResult({ resultId: req.params.resultId, adminId: req.user.id });
    return success(res, result, 'Result finalized');
  } catch (err) {
    return next(err);
  }
}

async function correctResult(req, res, next) {
  try {
    const { changes, reason } = req.body;
    const result = await resultService.correctResult({
      resultId: req.params.resultId,
      changes,
      reason,
      adminId: req.user.id,
    });
    return success(res, result, 'Result corrected');
  } catch (err) {
    return next(err);
  }
}

/**
 * Requires explicit confirmation from the client (see spec section 61) —
 * the frontend must show a confirmation dialog before calling this endpoint.
 */
async function publishResults(req, res, next) {
  try {
    const { confirm } = req.body;
    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        message: 'Explicit confirmation is required to publish results',
        code: 'CONFIRMATION_REQUIRED',
      });
    }

    const outcome = await resultService.publishResults({
      examId: req.params.examId,
      adminId: req.user.id,
      resultPortalBaseUrl: env.CLIENT_URL,
    });
    return success(res, outcome, 'Results published successfully');
  } catch (err) {
    return next(err);
  }
}

async function listForExam(req, res, next) {
  try {
    const results = await resultService.listResultsForExam(req.params.examId);
    return success(res, results);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMyResult, finalizeResult, correctResult, publishResults, listForExam };
