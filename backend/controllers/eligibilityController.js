const { parse } = require('csv-parse/sync');
const eligibilityService = require('../services/eligibilityService');
const { ExamEligibility } = require('../models');
const { success } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Two-step import: 1) POST .../preview to validate + show counts,
 * 2) POST .../import with the previously-validated rows + mode to commit.
 * This mirrors spec section 113 (never use the CSV directly as runtime
 * authorization storage — MongoDB is the source of truth after import).
 */
async function previewCsv(req, res, next) {
  try {
    if (!req.file) throw new ApiError('CSV file is required', 400, 'FILE_REQUIRED');

    let records;
    try {
      records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err) {
      throw new ApiError('Could not parse CSV file', 400, 'INVALID_CSV');
    }

    if (!records.length || !('uid' in records[0])) {
      throw new ApiError('CSV must contain a "uid" column', 400, 'MISSING_UID_COLUMN');
    }

    const rows = records.map((r, idx) => ({ uid: r.uid || '', rowNumber: idx + 2 })); // +2: header row + 1-index

    const preview = await eligibilityService.validateEligibilityCsv({
      universityId: req.user.universityId,
      rows,
    });

    return success(res, preview, 'CSV validated');
  } catch (err) {
    return next(err);
  }
}

async function importCsv(req, res, next) {
  try {
    const { examId } = req.params;
    const { mode, validRows, sourceFileName } = req.body;

    if (!Array.isArray(validRows) || !validRows.length) {
      throw new ApiError('No valid rows to import', 400, 'NO_VALID_ROWS');
    }

    const result = await eligibilityService.importEligibility({
      examId,
      validRows,
      mode,
      importedBy: req.user.id,
      sourceFileName,
    });

    return success(res, result, 'Eligibility import complete');
  } catch (err) {
    return next(err);
  }
}

async function listEligibility(req, res, next) {
  try {
    const { examId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    const [items, total] = await Promise.all([
      ExamEligibility.find({ examId })
        .populate('studentId', 'name uid universityEmail')
        .skip((page - 1) * limit)
        .limit(limit),
      ExamEligibility.countDocuments({ examId }),
    ]);

    return success(res, { items, total, page, limit });
  } catch (err) {
    return next(err);
  }
}

async function addStudent(req, res, next) {
  try {
    const { examId, studentId } = req.params;
    const { uid } = req.body;
    const doc = await eligibilityService.addSingleStudent({ examId, studentId, uid, addedBy: req.user.id });
    return success(res, doc, 'Student added to eligibility list');
  } catch (err) {
    return next(err);
  }
}

async function removeStudent(req, res, next) {
  try {
    const { examId, studentId } = req.params;
    await eligibilityService.removeStudent({ examId, studentId, removedBy: req.user.id });
    return success(res, {}, 'Student removed from eligibility list');
  } catch (err) {
    return next(err);
  }
}

module.exports = { previewCsv, importCsv, listEligibility, addStudent, removeStudent };
