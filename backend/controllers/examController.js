const examService = require('../services/examService');
const { Exam } = require('../models');
const { success } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');

async function create(req, res, next) {
  try {
    const exam = await examService.createExam(req.body, req.user.id);
    return success(res, exam, 'Exam created', 201);
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const { page, limit, ...filters } = req.query;
    const result = await examService.listExams(filters, { page: Number(page) || 1, limit: Number(limit) || 25 });
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');
    return success(res, exam);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const exam = await examService.updateExam(req.params.examId, req.body, req.user.id);
    return success(res, exam, 'Exam updated');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');
    if (exam.status !== 'DRAFT') {
      throw new ApiError('Only a DRAFT exam can be deleted', 400, 'INVALID_STATE');
    }
    await exam.deleteOne();
    return success(res, {}, 'Exam deleted');
  } catch (err) {
    return next(err);
  }
}

async function schedule(req, res, next) {
  try {
    const exam = await examService.transitionStatus({ examId: req.params.examId, targetStatus: 'SCHEDULED', adminId: req.user.id });
    return success(res, exam, 'Exam scheduled');
  } catch (err) {
    return next(err);
  }
}

async function transition(req, res, next) {
  try {
    const exam = await examService.transitionStatus({
      examId: req.params.examId,
      targetStatus: req.body.targetStatus,
      adminId: req.user.id,
    });
    return success(res, exam, `Exam moved to ${exam.status}`);
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, getById, update, remove, schedule, transition };
