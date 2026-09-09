const queryService = require('../services/queryService');
const { StudentQuery } = require('../models');
const { success } = require('../utils/apiResponse');

async function submitQuery(req, res, next) {
  try {
    const { attemptId } = req.params;
    const query = await queryService.submitQuery({ ...req.body, attemptId, studentId: req.user.id });
    return success(res, query, 'Query submitted', 201);
  } catch (err) {
    return next(err);
  }
}

async function listMyQueries(req, res, next) {
  try {
    const { attemptId } = req.params;
    const queries = await StudentQuery.find({ attemptId, studentId: req.user.id }).sort({ submittedAt: -1 });
    return success(res, queries);
  } catch (err) {
    return next(err);
  }
}

async function listQueries(req, res, next) {
  try {
    const { examId, status } = req.query;
    const filter = {};
    if (examId) filter.examId = examId;
    if (status) filter.status = status;

    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    const [items, total] = await Promise.all([
      StudentQuery.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit),
      StudentQuery.countDocuments(filter),
    ]);

    return success(res, { items, total, page, limit });
  } catch (err) {
    return next(err);
  }
}

async function getQuery(req, res, next) {
  try {
    const query = await StudentQuery.findById(req.params.queryId);
    return success(res, query);
  } catch (err) {
    return next(err);
  }
}

async function resolveQuery(req, res, next) {
  try {
    const { status, resolution } = req.body;
    const query = await queryService.resolveQuery({
      queryId: req.params.queryId,
      status,
      resolution,
      adminId: req.user.id,
    });
    return success(res, query, 'Query resolved');
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitQuery, listMyQueries, listQueries, getQuery, resolveQuery };
