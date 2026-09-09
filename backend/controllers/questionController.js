const questionService = require('../services/questionService');
const { success } = require('../utils/apiResponse');

async function create(req, res, next) {
  try {
    const question = await questionService.createQuestion(req.body, req.user.id);
    return success(res, question, 'Question created', 201);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const { changeReason, ...changes } = req.body;
    const question = await questionService.updateQuestion(req.params.questionId, changes, req.user.id, changeReason);
    return success(res, question, 'Question updated');
  } catch (err) {
    return next(err);
  }
}

async function approve(req, res, next) {
  try {
    const question = await questionService.approveQuestion(req.params.questionId, req.user.id);
    return success(res, question, 'Question approved');
  } catch (err) {
    return next(err);
  }
}

async function reject(req, res, next) {
  try {
    const question = await questionService.rejectQuestion(req.params.questionId, req.user.id, req.body.notes);
    return success(res, question, 'Question rejected');
  } catch (err) {
    return next(err);
  }
}

async function search(req, res, next) {
  try {
    const { page, limit, tags, excludeRecentlyUsedDays, ...filters } = req.query;
    const result = await questionService.searchQuestions(
      { ...filters, tags: tags ? tags.split(',') : undefined, excludeRecentlyUsedDays: excludeRecentlyUsedDays ? Number(excludeRecentlyUsedDays) : undefined },
      { page: Number(page) || 1, limit: Number(limit) || 25 }
    );
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

async function importQuestions(req, res, next) {
  try {
    const { universityId, subjectId, items, format } = req.body;
    const result = await questionService.importQuestions({ universityId, subjectId, items, format, adminId: req.user.id });
    return success(res, result, 'Import complete');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, update, approve, reject, search, importQuestions };
