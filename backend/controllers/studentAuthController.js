const studentService = require('../services/studentService');
const { Student } = require('../models');
const { comparePassword } = require('../utils/passwordHash');
const { signToken } = require('../utils/jwt');
const { success, error } = require('../utils/apiResponse');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('../services/auditService');

async function register(req, res, next) {
  try {
    const student = await studentService.registerStudent(req.body, { ipAddress: req.ip });
    return success(
      res,
      { studentId: student._id, universityEmail: student.universityEmail },
      'Registration successful. Please check your email for a verification code.',
      201
    );
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { studentId, code } = req.body;
    await studentService.verifyEmail({ studentId, code });
    return success(res, {}, 'Email verified successfully. You may now log in.');
  } catch (err) {
    return next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');
    if (student.emailVerified) throw new ApiError('Email is already verified', 400, 'ALREADY_VERIFIED');

    const university = await require('../models').University.findById(student.universityId);
    await studentService.issueVerificationCode(student, university);
    return success(res, {}, 'A new verification code has been sent.');
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { uid, password } = req.body;
    const normalizedUid = uid.trim().toUpperCase();

    const student = await Student.findOne({ uid: normalizedUid }).select('+passwordHash');
    // Generic message on every failure path — never reveal which part was wrong.
    const genericError = () => new ApiError('Invalid UID or password', 401, 'INVALID_CREDENTIALS');

    if (!student) return next(genericError());

    const passwordOk = await comparePassword(password, student.passwordHash);
    if (!passwordOk) return next(genericError());

    if (!student.canLogin()) {
      return next(new ApiError('Your account is not active. Please complete email verification.', 403, 'ACCOUNT_NOT_ACTIVE'));
    }

    student.lastLoginAt = new Date();
    await student.save();

    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', universityId: student.universityId.toString() });

    await auditService.record({
      actorId: student._id,
      actorRole: 'STUDENT',
      action: 'STUDENT_LOGIN',
      entityType: 'Student',
      entityId: student._id,
      ipAddress: req.ip,
    });

    return success(res, { token, student: { id: student._id, name: student.name, uid: student.uid } }, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, verifyEmail, resendVerification, login };
