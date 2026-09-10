const questionService = require('../services/questionService');
const { success } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

const XLSX_EXTENSIONS = ['.xlsx', '.xls'];
const XLSX_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function isXlsxFile(file) {
  const name = (file.originalname || '').toLowerCase();
  return XLSX_EXTENSIONS.some((ext) => name.endsWith(ext)) || XLSX_MIME_TYPES.includes(file.mimetype);
}

function parseXlsxRecords(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

async function create(req, res, next) {
  try {
    // The authenticated admin is scoped to a university. Use that scope by default
    // so the client never needs to manually supply the university ID.
    const payload = { ...req.body, universityId: req.user.universityId || req.body.universityId };
    const question = await questionService.createQuestion(payload, req.user.id);
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

/**
 * Step one of the two-step CSV import (mirrors eligibilityController's
 * previewCsv/importCsv split): parses + validates the uploaded CSV and
 * returns counts plus row-by-row results, without writing anything.
 */
async function previewImport(req, res, next) {
  try {
    if (!req.file) throw new ApiError('File is required', 400, 'FILE_REQUIRED');

    let records;
    try {
      if (isXlsxFile(req.file)) {
        records = parseXlsxRecords(req.file.buffer);
      } else {
        records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
      }
    } catch (err) {
      throw new ApiError('Could not parse import file', 400, 'INVALID_FILE');
    }

    if (!records.length) throw new ApiError('Import file has no rows', 400, 'EMPTY_FILE');

    const preview = await questionService.validateImportCsv(records);
    return success(res, preview, 'CSV validated');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, update, approve, reject, search, importQuestions, previewImport };
