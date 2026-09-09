const { StudentQuery, ExamAttempt, Exam } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

async function submitQuery({
  examId,
  attemptId,
  studentId,
  questionId,
  questionVersionId,
  questionTextShown,
  optionsShown,
  selectedOptionShown,
  language,
  translationVersionId,
  category,
  queryText,
}) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt || attempt.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Attempt not found', 404, 'NOT_FOUND');
  }

  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');

  const deadline = new Date(exam.endTime.getTime() + exam.queryDeadlineHoursAfterExam * 60 * 60 * 1000);
  if (new Date() > deadline) {
    throw new ApiError('The query submission deadline for this examination has passed', 403, 'DEADLINE_PASSED');
  }

  const existing = await StudentQuery.findOne({ attemptId, questionId });
  if (existing) {
    throw new ApiError('You have already submitted a query for this question', 409, 'DUPLICATE_QUERY');
  }

  const query = await StudentQuery.create({
    examId,
    attemptId,
    studentId,
    questionId,
    questionVersionId,
    questionTextShown,
    optionsShown,
    selectedOptionShown,
    language,
    translationVersionId,
    category,
    queryText,
    status: 'SUBMITTED',
  });

  await auditService.record({
    actorId: studentId,
    actorRole: 'STUDENT',
    action: 'QUERY_SUBMITTED',
    entityType: 'StudentQuery',
    entityId: query._id,
    metadata: { examId, questionId, category },
  });

  return query;
}

async function resolveQuery({ queryId, status, resolution, adminId }) {
  const query = await StudentQuery.findById(queryId);
  if (!query) throw new ApiError('Query not found', 404, 'NOT_FOUND');

  const before = { status: query.status, resolution: query.resolution };

  query.status = status;
  query.resolution = resolution;
  query.resolvedAt = new Date();
  query.resolvedBy = adminId;
  await query.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'QUERY_RESOLVED',
    entityType: 'StudentQuery',
    entityId: query._id,
    beforeValue: before,
    afterValue: { status, resolution },
  });

  // If the query revealed a scoring issue, the caller (controller) is
  // responsible for invoking resultService.correctResult(...) and
  // resultService.finalizeResult(...) as a separate, explicit, audited step.
  return query;
}

module.exports = { submitQuery, resolveQuery };
