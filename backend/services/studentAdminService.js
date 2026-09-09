const { Student } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

/**
 * Admin search/list view (spec section 84). Supports a free-text search
 * across name/uid/email plus structured filters, plus pagination.
 */
async function listStudents(filters = {}, pagination = {}) {
  const { search, accountStatus, universityId, programmeId, departmentId, semesterId } = filters;

  const query = {};
  if (accountStatus) query.accountStatus = accountStatus;
  if (universityId) query.universityId = universityId;
  if (programmeId) query.programmeId = programmeId;
  if (departmentId) query.departmentId = departmentId;
  if (semesterId) query.semesterId = semesterId;

  if (search) {
    const term = search.trim();
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { uid: regex }, { universityEmail: regex }];
    }
  }

  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(pagination.limit || 25, 100);

  const [items, total] = await Promise.all([
    Student.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('programmeId', 'name')
      .populate('departmentId', 'name')
      .populate('semesterId', 'name'),
    Student.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function getStudent(studentId) {
  const student = await Student.findById(studentId)
    .populate('universityId', 'name')
    .populate('programmeId', 'name')
    .populate('departmentId', 'name')
    .populate('semesterId', 'name');
  if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');
  return student;
}

/**
 * Admin-driven account status change (e.g. SUSPENDED for exam misconduct,
 * DISABLED for a departed student, or reactivating a SUSPENDED account).
 * Deliberately narrow — this does not touch emailVerified or password.
 */
async function updateStudentStatus(studentId, accountStatus, adminId, reason) {
  if (!Student.ACCOUNT_STATUSES.includes(accountStatus)) {
    throw new ApiError('Invalid account status', 400, 'INVALID_STATUS');
  }

  const student = await Student.findById(studentId);
  if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');

  const before = student.accountStatus;
  student.accountStatus = accountStatus;
  await student.save();

  await auditService.record({
    actorId: adminId,
    actorRole: 'ADMIN',
    action: 'STUDENT_STATUS_CHANGED',
    entityType: 'Student',
    entityId: student._id,
    beforeValue: { accountStatus: before },
    afterValue: { accountStatus, reason: reason || null },
  });

  return student;
}

module.exports = { listStudents, getStudent, updateStudentStatus };
