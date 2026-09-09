const { FacultyQuestionSubmission } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const questionService = require('./questionService');
const auditService = require('./auditService');

async function submit(payload, facultyMemberId) {
  const submission = await FacultyQuestionSubmission.create({
    facultyMemberId,
    subjectId: payload.subjectId,
    questionText: payload.questionText,
    options: payload.options,
    correctAnswer: payload.correctAnswer,
    marks: payload.marks,
    unit: payload.unit || null,
    topic: payload.topic || null,
    difficulty: payload.difficulty || 'MEDIUM',
    questionType: payload.questionType || 'MCQ',
    explanation: payload.explanation || '',
    reference: payload.reference || '',
    tags: payload.tags || [],
    status: 'SUBMITTED',
  });

  await auditService.record({
    actorId: facultyMemberId,
    actorRole: 'FACULTY',
    action: 'FACULTY_QUESTION_SUBMITTED',
    entityType: 'FacultyQuestionSubmission',
    entityId: submission._id,
  });

  return submission;
}

async function listForFaculty(facultyMemberId, filters = {}) {
  const query = { facultyMemberId };
  if (filters.status) query.status = filters.status;
  return FacultyQuestionSubmission.find(query).sort({ createdAt: -1 });
}

async function listForAdmin(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  return FacultyQuestionSubmission.find(query).sort({ createdAt: -1 }).populate('facultyMemberId', 'name email');
}

async function markUnderReview(submissionId, adminId) {
  const submission = await FacultyQuestionSubmission.findById(submissionId);
  if (!submission) throw new ApiError('Submission not found', 404, 'NOT_FOUND');
  if (submission.status !== 'SUBMITTED') {
    throw new ApiError(`Cannot move submission from ${submission.status} to UNDER_REVIEW`, 400, 'INVALID_TRANSITION');
  }
  submission.status = 'UNDER_REVIEW';
  submission.reviewedBy = adminId;
  await submission.save();
  return submission;
}

/**
 * Approving a submission converts it into a real Question in the bank
 * (status DRAFT — still needs its own approval per spec section 27:
 * SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED -> USED_IN_EXAMINATION is
 * the submission's own lifecycle; the resulting bank Question then follows
 * its own DRAFT -> APPROVED workflow).
 */
async function approve(submissionId, adminId, { universityId, autoApproveInBank = false } = {}) {
  const submission = await FacultyQuestionSubmission.findById(submissionId);
  if (!submission) throw new ApiError('Submission not found', 404, 'NOT_FOUND');
  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
    throw new ApiError(`Cannot approve a submission in status ${submission.status}`, 400, 'INVALID_TRANSITION');
  }

  const question = await questionService.createQuestion(
    {
      universityId,
      subjectId: submission.subjectId,
      questionText: submission.questionText,
      options: submission.options,
      correctAnswer: submission.correctAnswer,
      marks: submission.marks,
      unit: submission.unit,
      topic: submission.topic,
      difficulty: submission.difficulty,
      questionType: submission.questionType,
      explanation: submission.explanation,
      reference: submission.reference,
      tags: submission.tags,
    },
    adminId
  );

  if (autoApproveInBank) {
    await questionService.approveQuestion(question._id, adminId);
  }

  submission.status = 'APPROVED';
  submission.reviewedBy = adminId;
  submission.convertedQuestionId = question._id;
  await submission.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'FACULTY_QUESTION_APPROVED',
    entityType: 'FacultyQuestionSubmission',
    entityId: submission._id,
    metadata: { convertedQuestionId: question._id },
  });

  return { submission, question };
}

async function reject(submissionId, adminId, notes = '') {
  const submission = await FacultyQuestionSubmission.findById(submissionId);
  if (!submission) throw new ApiError('Submission not found', 404, 'NOT_FOUND');
  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
    throw new ApiError(`Cannot reject a submission in status ${submission.status}`, 400, 'INVALID_TRANSITION');
  }

  submission.status = 'REJECTED';
  submission.reviewedBy = adminId;
  submission.reviewNotes = notes;
  await submission.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'FACULTY_QUESTION_REJECTED',
    entityType: 'FacultyQuestionSubmission',
    entityId: submission._id,
    metadata: { notes },
  });

  return submission;
}

module.exports = { submit, listForFaculty, listForAdmin, markUnderReview, approve, reject };
