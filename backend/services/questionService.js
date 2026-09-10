const { Question, QuestionVersion } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

const EDITABLE_VERSIONED_FIELDS = [
  'questionText',
  'options',
  'correctAnswer',
  'marks',
  'questionType',
  'unit',
  'topic',
  'difficulty',
];

async function createQuestion(payload, adminId) {
  const question = await Question.create({
    universityId: payload.universityId,
    subjectId: payload.subjectId,
    questionText: payload.questionText,
    options: payload.options,
    correctAnswer: payload.correctAnswer,
    marks: payload.marks,
    questionType: payload.questionType || 'MCQ',
    unit: payload.unit || null,
    topic: payload.topic || null,
    difficulty: payload.difficulty || 'MEDIUM',
    tags: payload.tags || [],
    explanation: payload.explanation || '',
    reference: payload.reference || '',
    status: 'DRAFT',
    currentVersionNumber: 1,
    createdBy: adminId,
  });

  await QuestionVersion.create({
    questionId: question._id,
    versionNumber: 1,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    questionType: question.questionType,
    unit: question.unit,
    topic: question.topic,
    difficulty: question.difficulty,
    changedBy: adminId,
    changeReason: 'Initial creation',
  });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUESTION_CREATED',
    entityType: 'Question',
    entityId: question._id,
  });

  return question;
}

/**
 * Edits create a NEW QuestionVersion rather than mutating history. Any
 * QuestionVersion already referenced by a locked Paper (via
 * ExamQuestion.questionVersionId) is untouched by this — it keeps pointing
 * at its own frozen version number forever.
 */
async function updateQuestion(questionId, changes, adminId, changeReason = '') {
  const question = await Question.findById(questionId);
  if (!question) throw new ApiError('Question not found', 404, 'NOT_FOUND');

  const before = {};
  for (const field of EDITABLE_VERSIONED_FIELDS) {
    if (changes[field] !== undefined) {
      before[field] = question[field];
      question[field] = changes[field];
    }
  }
  // Non-versioned metadata can be updated without a new version.
  if (changes.tags !== undefined) question.tags = changes.tags;
  if (changes.explanation !== undefined) question.explanation = changes.explanation;
  if (changes.reference !== undefined) question.reference = changes.reference;

  question.currentVersionNumber += 1;
  await question.save();

  await QuestionVersion.create({
    questionId: question._id,
    versionNumber: question.currentVersionNumber,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    questionType: question.questionType,
    unit: question.unit,
    topic: question.topic,
    difficulty: question.difficulty,
    changedBy: adminId,
    changeReason,
  });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUESTION_UPDATED',
    entityType: 'Question',
    entityId: question._id,
    beforeValue: before,
    afterValue: changes,
    metadata: { newVersionNumber: question.currentVersionNumber, changeReason },
  });

  return question;
}

async function approveQuestion(questionId, adminId) {
  const question = await Question.findById(questionId);
  if (!question) throw new ApiError('Question not found', 404, 'NOT_FOUND');
  if (question.status === 'USED_IN_EXAMINATION') {
    throw new ApiError('This question is locked into an examination and cannot change status', 400, 'LOCKED');
  }

  question.status = 'APPROVED';
  question.approvedBy = adminId;
  await question.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUESTION_APPROVED',
    entityType: 'Question',
    entityId: question._id,
  });

  return question;
}

async function rejectQuestion(questionId, adminId, notes = '') {
  const question = await Question.findById(questionId);
  if (!question) throw new ApiError('Question not found', 404, 'NOT_FOUND');
  if (question.status === 'USED_IN_EXAMINATION') {
    throw new ApiError('This question is locked into an examination and cannot change status', 400, 'LOCKED');
  }

  question.status = 'REJECTED';
  await question.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUESTION_REJECTED',
    entityType: 'Question',
    entityId: question._id,
    metadata: { notes },
  });

  return question;
}

async function searchQuestions(filters = {}, pagination = {}) {
  const {
    subjectId,
    unit,
    topic,
    difficulty,
    questionType,
    status,
    tags,
    createdBy,
    excludeRecentlyUsedDays,
  } = filters;

  const query = {};
  if (subjectId) query.subjectId = subjectId;
  if (unit) query.unit = unit;
  if (topic) query.topic = topic;
  if (difficulty) query.difficulty = difficulty;
  if (questionType) query.questionType = questionType;
  if (status) query.status = status;
  if (createdBy) query.createdBy = createdBy;
  if (tags && tags.length) query.tags = { $in: tags };

  if (excludeRecentlyUsedDays) {
    const cutoff = new Date(Date.now() - excludeRecentlyUsedDays * 24 * 60 * 60 * 1000);
    query.$or = [{ lastUsedAt: null }, { lastUsedAt: { $lt: cutoff } }];
  }

  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 25, 200);

  const [items, total] = await Promise.all([
    Question.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Question.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

/**
 * Plain-text or JSON import only — no PDF/OCR (per spec). Each imported
 * question still lands in DRAFT and must go through the normal approval
 * workflow.
 * @param {Array<object>} items - already-parsed question objects
 * @param {string} format - 'json' | 'text' (both resolve to the same shape
 *   once parsed by the caller/controller; kept for audit metadata)
 */
async function importQuestions({ universityId, subjectId, items, format, adminId }) {
  const created = [];
  const errors = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    try {
      if (!item.questionText || !item.options || !item.correctAnswer || item.marks === undefined) {
        throw new Error('Missing required fields (questionText, options, correctAnswer, marks)');
      }
      const question = await createQuestion({ universityId, subjectId, ...item }, adminId);
      created.push(question._id);
    } catch (err) {
      errors.push({ index: i, reason: err.message });
    }
  }

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUESTION_IMPORT',
    entityType: 'Subject',
    entityId: subjectId,
    metadata: { format, createdCount: created.length, errorCount: errors.length },
  });

  return { createdCount: created.length, createdIds: created, errors };
}

const IMPORT_REQUIRED_COLUMNS = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'marks'];
const VALID_ANSWER_KEYS = ['A', 'B', 'C', 'D'];

/**
 * Validates parsed CSV rows for the question-bank bulk import, mirroring
 * eligibilityService.validateEligibilityCsv's preview/import two-step
 * pattern: this is step one (preview) — nothing is written to the DB here.
 * Each row of `rows` is a plain object keyed by CSV column header.
 */
async function validateImportCsv(rows) {
  const valid = [];
  const invalid = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +2: header row + 1-index
    const missing = IMPORT_REQUIRED_COLUMNS.filter((col) => !row[col] || !String(row[col]).trim());
    if (missing.length) {
      invalid.push({ rowNumber, reason: `Missing required column(s): ${missing.join(', ')}` });
      return;
    }

    const correctAnswer = String(row.correctAnswer).trim().toUpperCase();
    if (!VALID_ANSWER_KEYS.includes(correctAnswer)) {
      invalid.push({ rowNumber, reason: 'correctAnswer must be one of A, B, C, D' });
      return;
    }

    const marks = Number(row.marks);
    if (Number.isNaN(marks) || marks < 0) {
      invalid.push({ rowNumber, reason: 'marks must be a non-negative number' });
      return;
    }

    valid.push({
      rowNumber,
      questionText: row.questionText.trim(),
      options: {
        A: row.optionA.trim(),
        B: row.optionB.trim(),
        C: row.optionC.trim(),
        D: row.optionD.trim(),
      },
      correctAnswer,
      marks,
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes((row.difficulty || '').trim().toUpperCase())
        ? row.difficulty.trim().toUpperCase()
        : 'MEDIUM',
      unit: row.unit?.trim() || null,
      topic: row.topic?.trim() || null,
      explanation: row.explanation?.trim() || '',
      reference: row.reference?.trim() || '',
      tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  });

  return {
    totalRows: rows.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    valid,
    invalid,
  };
}

module.exports = {
  createQuestion,
  updateQuestion,
  approveQuestion,
  rejectQuestion,
  searchQuestions,
  importQuestions,
  validateImportCsv,
};
