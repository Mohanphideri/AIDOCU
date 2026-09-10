const { Exam } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');
const emailService = require('./emailService');
const { env } = require('../config/env');

const EDITABLE_WHILE_LIVE_FIELDS = ['instructions', 'proctoringSettings', 'queryDeadlineHoursAfterExam'];

async function createExam(payload, adminId) {
  const exam = await Exam.create({
    universityId: payload.universityId,
    academicSessionId: payload.academicSessionId,
    facultyId: payload.facultyId,
    departmentId: payload.departmentId,
    programmeId: payload.programmeId,
    semesterId: payload.semesterId,
    subjectId: payload.subjectId,
    subjectCode: payload.subjectCode,
    examType: payload.examType,
    examDate: payload.examDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    durationMinutes: payload.durationMinutes,
    maximumMarks: payload.maximumMarks,
    passingMarks: payload.passingMarks,
    instructions: payload.instructions || '',
    supportedLanguages: payload.supportedLanguages || ['en'],
    randomization: payload.randomization || {},
    proctoringSettings: payload.proctoringSettings || {},
    queryDeadlineHoursAfterExam: payload.queryDeadlineHoursAfterExam ?? 24,
    status: 'DRAFT',
    resultStatus: 'DRAFT',
    createdBy: adminId,
  });

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'EXAM_CREATED',
    entityType: 'Exam',
    entityId: exam._id,
  });

  return exam;
}

async function updateExam(examId, changes, adminId) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');

  const isLive = ['ACTIVE', 'CLOSED'].includes(exam.status);
  const fieldsToApply = isLive
    ? Object.fromEntries(Object.entries(changes).filter(([key]) => EDITABLE_WHILE_LIVE_FIELDS.includes(key)))
    : changes;

  if (isLive && Object.keys(fieldsToApply).length < Object.keys(changes).length) {
    throw new ApiError(
      `Exam is ${exam.status.toLowerCase()}; only ${EDITABLE_WHILE_LIVE_FIELDS.join(', ')} may still be edited`,
      400,
      'EXAM_LOCKED_FOR_EDITING'
    );
  }

  const before = {};
  for (const [key, value] of Object.entries(fieldsToApply)) {
    before[key] = exam[key];
    exam[key] = value;
  }
  await exam.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'EXAM_UPDATED',
    entityType: 'Exam',
    entityId: exam._id,
    beforeValue: before,
    afterValue: fieldsToApply,
  });

  return exam;
}

async function transitionStatus({ examId, targetStatus, adminId }) {
  const exam = await Exam.findById(examId);
  if (!exam) throw new ApiError('Exam not found', 404, 'NOT_FOUND');

  const allowed = Exam.EXAM_TRANSITIONS[exam.status] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ApiError(`Cannot move exam from ${exam.status} to ${targetStatus}`, 400, 'INVALID_TRANSITION');
  }

  if (targetStatus === 'SCHEDULED' && !exam.lockedPaperId) {
    throw new ApiError('Exam cannot be scheduled until its paper is locked', 400, 'PAPER_NOT_LOCKED');
  }

  const before = exam.status;
  exam.status = targetStatus;
  await exam.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'EXAM_STATUS_CHANGE',
    entityType: 'Exam',
    entityId: exam._id,
    beforeValue: { status: before },
    afterValue: { status: targetStatus },
  });

  // Eligible students are notified the instant (and only the instant) the
  // exam goes ACTIVE — never at creation/scheduling. Email failures must
  // never roll back the activation itself, so this runs after save/audit
  // and never throws (sendExamActiveEmail logs failures via EmailLog).
  if (targetStatus === 'ACTIVE') {
    await notifyEligibleStudentsExamActive(exam);
  }

  return exam;
}

async function notifyEligibleStudentsExamActive(exam) {
  const { ExamEligibility, Student, University, Subject } = require('../models');

  const [university, subject, eligibilities] = await Promise.all([
    University.findById(exam.universityId),
    Subject.findById(exam.subjectId),
    ExamEligibility.find({ examId: exam._id }).populate('studentId', 'name universityEmail'),
  ]);

  const universityName = university?.name || 'University';
  const examName = subject ? `${exam.subjectCode} — ${subject.name}` : `${exam.subjectCode} (${exam.examType})`;

  for (const eligibility of eligibilities) {
    const student = eligibility.studentId;
    if (!student || !student.universityEmail) continue;
    await emailService.sendExamActiveEmail({
      to: student.universityEmail,
      studentId: student._id,
      examId: exam._id,
      examName,
      universityName,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      examPortalUrl: `${env.CLIENT_URL}/exam/${exam._id}/security`,
    });
  }
}

async function listExams(filters = {}, pagination = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.programmeId) query.programmeId = filters.programmeId;

  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 25, 100);

  const [items, total] = await Promise.all([
    Exam.find(query).sort({ examDate: -1 }).skip((page - 1) * limit).limit(limit),
    Exam.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

module.exports = { createExam, updateExam, transitionStatus, listExams };
