const { ExamEligibility, Student } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

/**
 * Validates parsed CSV rows against existing students. Never creates
 * students. Returns a structured preview: valid / duplicate / unknown rows,
 * matching the "Total rows / Valid / Duplicates / Unknown UIDs" preview
 * required by the spec.
 *
 * @param {Array<{uid: string, rowNumber: number}>} rows
 */
async function validateEligibilityCsv({ universityId, rows }) {
  const seen = new Set();
  const valid = [];
  const duplicates = [];
  const unknown = [];

  const uids = rows.map((r) => r.uid.trim().toUpperCase());
  const students = await Student.find({ universityId, uid: { $in: uids } }).select('_id uid');
  const studentByUid = new Map(students.map((s) => [s.uid, s]));

  for (const row of rows) {
    const uid = row.uid.trim().toUpperCase();

    if (!uid) {
      unknown.push({ rowNumber: row.rowNumber, uid, reason: 'Empty row' });
      continue;
    }
    if (seen.has(uid)) {
      duplicates.push({ rowNumber: row.rowNumber, uid, reason: 'Duplicate UID' });
      continue;
    }
    seen.add(uid);

    const student = studentByUid.get(uid);
    if (!student) {
      unknown.push({ rowNumber: row.rowNumber, uid, reason: 'Unknown UID' });
      continue;
    }

    valid.push({ rowNumber: row.rowNumber, uid, studentId: student._id });
  }

  return {
    totalRows: rows.length,
    validCount: valid.length,
    duplicateCount: duplicates.length,
    unknownCount: unknown.length,
    valid,
    duplicates,
    unknown,
  };
}

/**
 * Imports a validated set of rows into ExamEligibility.
 * mode: 'REPLACE' clears the existing list first; 'ADD' merges into it.
 * Only ever operates on rows already confirmed valid by validateEligibilityCsv.
 */
async function importEligibility({ examId, validRows, mode, importedBy, sourceFileName }) {
  if (!['REPLACE', 'ADD'].includes(mode)) {
    throw new ApiError('Invalid import mode', 400, 'INVALID_MODE');
  }

  const before = await ExamEligibility.countDocuments({ examId });

  if (mode === 'REPLACE') {
    await ExamEligibility.deleteMany({ examId });
  }

  const docs = validRows.map((row) => ({
    examId,
    studentId: row.studentId,
    uid: row.uid,
    importedAt: new Date(),
    importedBy,
    sourceFileName,
  }));

  // insertMany with ordered:false + unique index tolerates duplicate rows in
  // ADD mode without failing the whole batch.
  let insertedCount = 0;
  if (docs.length) {
    try {
      const result = await ExamEligibility.insertMany(docs, { ordered: false });
      insertedCount = result.length;
    } catch (err) {
      // Some inserts may have succeeded despite duplicate-key errors on others.
      insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
    }
  }

  const after = await ExamEligibility.countDocuments({ examId });

  await auditService.record({
    actorId: importedBy,
    actorRole: 'ADMIN',
    action: mode === 'REPLACE' ? 'ELIGIBILITY_REPLACE' : 'ELIGIBILITY_ADD',
    entityType: 'Exam',
    entityId: examId,
    metadata: { sourceFileName, insertedCount, mode },
    beforeValue: { count: before },
    afterValue: { count: after },
  });

  return { insertedCount, totalEligible: after };
}

async function addSingleStudent({ examId, studentId, uid, addedBy }) {
  const doc = await ExamEligibility.findOneAndUpdate(
    { examId, studentId },
    { $setOnInsert: { examId, studentId, uid, importedBy: addedBy, addedManually: true, importedAt: new Date() } },
    { upsert: true, new: true }
  );

  await auditService.record({
    actorId: addedBy,
    actorRole: 'ADMIN',
    action: 'ELIGIBILITY_MANUAL_ADD',
    entityType: 'Exam',
    entityId: examId,
    metadata: { studentId, uid },
  });

  return doc;
}

async function removeStudent({ examId, studentId, removedBy }) {
  const removed = await ExamEligibility.findOneAndDelete({ examId, studentId });

  await auditService.record({
    actorId: removedBy,
    actorRole: 'ADMIN',
    action: 'ELIGIBILITY_MANUAL_REMOVE',
    entityType: 'Exam',
    entityId: examId,
    metadata: { studentId },
    beforeValue: removed,
  });

  return removed;
}

/**
 * THE authoritative eligibility check. Every exam-start flow must call this
 * — never trust a frontend-provided eligibility flag.
 */
async function isStudentEligible({ examId, studentId }) {
  const record = await ExamEligibility.findOne({ examId, studentId });
  return Boolean(record);
}

module.exports = {
  validateEligibilityCsv,
  importEligibility,
  addSingleStudent,
  removeStudent,
  isStudentEligible,
};
