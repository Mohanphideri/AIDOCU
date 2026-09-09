const facultyQuestionService = require('../services/facultyQuestionService');
const { success } = require('../utils/apiResponse');

async function submit(req, res, next) {
  try {
    const submission = await facultyQuestionService.submit(req.body, req.user.id);
    return success(res, submission, 'Question submitted for review', 201);
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const submissions = await facultyQuestionService.listForFaculty(req.user.id, req.query);
    return success(res, submissions);
  } catch (err) {
    return next(err);
  }
}

async function listForAdmin(req, res, next) {
  try {
    const submissions = await facultyQuestionService.listForAdmin(req.query);
    return success(res, submissions);
  } catch (err) {
    return next(err);
  }
}

async function markUnderReview(req, res, next) {
  try {
    const submission = await facultyQuestionService.markUnderReview(req.params.submissionId, req.user.id);
    return success(res, submission, 'Marked under review');
  } catch (err) {
    return next(err);
  }
}

async function approve(req, res, next) {
  try {
    const { universityId, autoApproveInBank } = req.body;
    const result = await facultyQuestionService.approve(req.params.submissionId, req.user.id, {
      universityId,
      autoApproveInBank,
    });
    return success(res, result, 'Submission approved and added to question bank');
  } catch (err) {
    return next(err);
  }
}

async function reject(req, res, next) {
  try {
    const submission = await facultyQuestionService.reject(req.params.submissionId, req.user.id, req.body.notes);
    return success(res, submission, 'Submission rejected');
  } catch (err) {
    return next(err);
  }
}

module.exports = { submit, listMine, listForAdmin, markUnderReview, approve, reject };
