const paperService = require('../services/paperService');
const { ExamQuestion } = require('../models');
const { success } = require('../utils/apiResponse');

async function list(req, res, next) {
  try {
    const { page, limit, ...filters } = req.query;
    filters.universityId = req.user.universityId;
    const result = await paperService.listPapers(filters, { page: Number(page) || 1, limit: Number(limit) || 25 });
    return success(res, result);
  } catch (err) { return next(err); }
}

async function generate(req, res, next) {
  try {
    const { examId, blueprintId, mode, manualSelections } = req.body;
    const outcome = await paperService.generatePaper({ examId, blueprintId, mode, manualSelections, adminId: req.user.id });

    if (!outcome.success) {
      return res.status(422).json({
        success: false,
        message: outcome.message,
        code: 'BLUEPRINT_NOT_SATISFIED',
        missing: outcome.missing,
      });
    }

    return success(res, outcome.paper, 'Paper generated', 201);
  } catch (err) {
    return next(err);
  }
}

async function edit(req, res, next) {
  try {
    const paper = await paperService.editPaper(req.params.paperId, req.body, req.user.id);
    return success(res, paper, 'Paper updated');
  } catch (err) {
    return next(err);
  }
}

async function preview(req, res, next) {
  try {
    const examQuestions = await ExamQuestion.find({ paperId: req.params.paperId })
      .sort({ orderIndex: 1 })
      .populate('questionVersionId');
    return success(res, examQuestions);
  } catch (err) {
    return next(err);
  }
}

async function analyze(req, res, next) {
  try {
    const analysis = await paperService.analyzePaper(req.params.paperId);
    return success(res, analysis);
  } catch (err) {
    return next(err);
  }
}

async function lock(req, res, next) {
  try {
    const paper = await paperService.lockPaper(req.params.paperId, req.user.id);
    return success(res, paper, 'Paper locked');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, generate, edit, preview, analyze, lock };
