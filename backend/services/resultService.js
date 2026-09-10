const {
  ExamAttempt,
  AttemptQuestion,
  Answer,
  ExamQuestion,
  QuestionVersion,
  Result,
  ResultRevision,
  Exam,
  Student,
  University,
} = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');
const emailService = require('./emailService');

function computeGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

/**
 * Server-side scoring. Uses ONLY the exact QuestionVersion locked into the
 * paper and the student's stored Answer rows — never a client-provided score.
 */
async function calculateResult(attemptId) {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError('Attempt not found', 404, 'NOT_FOUND');

  const exam = await Exam.findById(attempt.examId);
  const attemptQuestions = await AttemptQuestion.find({ attemptId }).sort({ orderIndex: 1 });
  const answers = await Answer.find({ attemptId });
  const answerByAttemptQuestion = new Map(answers.map((a) => [a.attemptQuestionId.toString(), a]));

  let obtainedMarks = 0;

  for (const aq of attemptQuestions) {
    const examQuestion = await ExamQuestion.findById(aq.examQuestionId);
    const questionVersion = await QuestionVersion.findById(examQuestion.questionVersionId);
    const answer = answerByAttemptQuestion.get(aq._id.toString());

    if (answer && answer.selectedOption && answer.selectedOption === questionVersion.correctAnswer) {
      obtainedMarks += examQuestion.marks;
    }
  }

  const maximumMarks = exam.maximumMarks;
  const percentage = maximumMarks > 0 ? Number(((obtainedMarks / maximumMarks) * 100).toFixed(2)) : 0;
  const passFail = obtainedMarks >= exam.passingMarks ? 'PASS' : 'FAIL';
  const grade = computeGrade(percentage);

  const result = await Result.findOneAndUpdate(
    { attemptId },
    {
      examId: attempt.examId,
      studentId: attempt.studentId,
      attemptId,
      maximumMarks,
      obtainedMarks,
      percentage,
      grade,
      passFail,
      status: 'DRAFT',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await auditService.record({
    actorId: attempt.studentId,
    actorRole: 'SYSTEM',
    action: 'RESULT_CALCULATED',
    entityType: 'Result',
    entityId: result._id,
    metadata: { obtainedMarks, percentage, passFail },
  });

  return result;
}

async function correctResult({ resultId, changes, reason, adminId }) {
  const result = await Result.findById(resultId);
  if (!result) throw new ApiError('Result not found', 404, 'NOT_FOUND');
  if (result.status === 'PUBLISHED') {
    result.status = 'UNDER_REVISION';
  }

  const oldValue = {};
  const newValue = {};
  for (const [key, value] of Object.entries(changes)) {
    oldValue[key] = result[key];
    newValue[key] = value;
    result[key] = value;
  }
  await result.save();

  await ResultRevision.create({
    resultId,
    oldValue,
    newValue,
    reason,
    changedBy: adminId,
    changedAt: new Date(),
  });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'RESULT_CORRECTION',
    entityType: 'Result',
    entityId: result._id,
    beforeValue: oldValue,
    afterValue: newValue,
    metadata: { reason },
  });

  return result;
}

async function finalizeResult({ resultId, adminId }) {
  const result = await Result.findById(resultId);
  if (!result) throw new ApiError('Result not found', 404, 'NOT_FOUND');
  if (!['DRAFT', 'UNDER_REVIEW', 'UNDER_REVISION'].includes(result.status)) {
    throw new ApiError(`Cannot finalize a result in status ${result.status}`, 400, 'INVALID_TRANSITION');
  }

  result.status = 'FINALIZED';
  result.finalizedAt = new Date();
  result.finalizedBy = adminId;
  await result.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'RESULT_FINALIZED',
    entityType: 'Result',
    entityId: result._id,
  });

  // NOTE: FINALIZED does NOT mean PUBLISHED. A separate, explicit admin
  // action (publishResults below) is required before students can see this.
  return result;
}

/**
 * THE critical rule of the whole platform: results only become visible and
 * only get emailed after an authorized admin explicitly calls this. Never
 * call this automatically from submission or finalization code paths.
 */
async function publishResults({ examId, adminId, resultPortalBaseUrl }) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');
  if (exam.status !== 'CLOSED') {
    throw new ApiError('Results can only be published after the exam is closed', 400, 'EXAM_NOT_CLOSED');
  }

  const finalizedResults = await Result.find({ examId, status: 'FINALIZED' });
  if (!finalizedResults.length) {
    throw new ApiError('No finalized results are ready to publish', 400, 'NO_FINALIZED_RESULTS');
  }

  const publishedAt = new Date();
  const publishedResults = [];

  for (const result of finalizedResults) {
    result.status = 'PUBLISHED';
    result.publishedAt = publishedAt;
    result.publishedBy = adminId;
    await result.save();
    publishedResults.push(result);
  }

  exam.resultStatus = 'PUBLISHED';
  await exam.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'RESULT_PUBLICATION',
    entityType: 'Exam',
    entityId: exam._id,
    metadata: { publishedCount: publishedResults.length },
  });

  // Email failures must never roll back publication — sendResultPublicationEmail
  // handles its own failure logging via EmailLog and never throws.
  const university = await University.findById(exam.universityId);
  for (const result of publishedResults) {
    const student = await Student.findById(result.studentId);
    if (!student) continue;
    await emailService.sendResultPublicationEmail({
      to: student.universityEmail,
      studentId: student._id,
      examId: exam._id,
      resultId: result._id,
      examName: `${exam.examType} - ${exam.subjectCode}`,
      universityName: university?.name || 'University',
      resultPortalUrl: `${resultPortalBaseUrl}/results/${result._id}`,
    });
  }

  return { publishedCount: publishedResults.length };
}

/**
 * Admin-only listing of every result for an exam, for the review /
 * finalize / correct / publish workflow. Never exposed to students.
 */
async function listResultsForExam(examId) {
  return Result.find({ examId })
    .populate('studentId', 'name uid universityEmail')
    .sort({ createdAt: 1 });
}

/** A student may only ever see their own PUBLISHED result. */
async function getResultForStudent({ resultId, studentId }) {
  const result = await Result.findById(resultId);
  if (!result || result.studentId.toString() !== studentId.toString()) {
    throw new ApiError('Result not found', 404, 'NOT_FOUND');
  }
  if (result.status !== 'PUBLISHED') {
    throw new ApiError('Your result has not yet been published by the university.', 403, 'NOT_PUBLISHED');
  }
  return result;
}

/**
 * Every PUBLISHED result belonging to the student, for the dashboard's
 * "Results" section. Unpublished (DRAFT/UNDER_REVIEW/FINALIZED) results are
 * never surfaced to the student — only an explicit publish action makes a
 * result visible here.
 */
async function listResultsForStudent(studentId) {
  return Result.find({ studentId, status: 'PUBLISHED' })
    .populate('examId', 'subjectCode examType examDate maximumMarks')
    .sort({ publishedAt: -1 });
}

module.exports = {
  calculateResult,
  correctResult,
  finalizeResult,
  publishResults,
  getResultForStudent,
  listResultsForExam,
  listResultsForStudent,
};
