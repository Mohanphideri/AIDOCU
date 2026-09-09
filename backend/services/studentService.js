const { Student, StudentVerification, University } = require('../models');
const { hashPassword } = require('../utils/passwordHash');
const { generateNumericCode, hashValue } = require('../utils/tokenHash');
const { ApiError } = require('../middleware/errorHandler');
const { env } = require('../config/env');
const emailService = require('./emailService');
const auditService = require('./auditService');

/**
 * Registers a new student account in PENDING_VERIFICATION status and sends
 * a verification code. Does NOT activate the account — see verifyEmail().
 */
async function registerStudent({ universityId, name, uid, universityEmail, phone, password }, meta = {}) {
  const university = await University.findById(universityId);
  if (!university) {
    throw new ApiError('Invalid university', 400, 'INVALID_UNIVERSITY');
  }

  const normalizedEmail = universityEmail.trim().toLowerCase();

  const normalizedUid = uid.trim().toUpperCase();

  const [uidExists, emailExists] = await Promise.all([
    Student.exists({ universityId, uid: normalizedUid }),
    Student.exists({ universityId, universityEmail: normalizedEmail }),
  ]);
  if (uidExists) throw new ApiError('This UID is already registered', 409, 'UID_TAKEN');
  if (emailExists) throw new ApiError('This university email is already registered', 409, 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(password);

  const student = await Student.create({
    universityId,
    name: name.trim(),
    uid: normalizedUid,
    universityEmail: normalizedEmail,
    phone: phone.trim(),
    passwordHash,
    emailVerified: false,
    accountStatus: 'PENDING_VERIFICATION',
  });

  await issueVerificationCode(student, university);

  await auditService.record({
    actorId: student._id,
    actorRole: 'STUDENT',
    action: 'STUDENT_REGISTRATION',
    entityType: 'Student',
    entityId: student._id,
    ipAddress: meta.ipAddress || null,
  });

  return student;
}

async function issueVerificationCode(student, university) {
  const now = new Date();
  const existing = await StudentVerification.findOne({ studentId: student._id, used: false }).sort({ createdAt: -1 });

  if (existing) {
    const cooldownMs = env.VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
    const elapsed = now.getTime() - new Date(existing.lastSentAt).getTime();
    if (elapsed < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
      throw new ApiError(`Please wait ${waitSeconds}s before requesting another code`, 429, 'RESEND_COOLDOWN');
    }
    // Invalidate previous unused code before issuing a new one.
    existing.used = true;
    await existing.save();
  }

  const code = generateNumericCode(6);
  const codeHash = hashValue(code);
  const expiresAt = new Date(now.getTime() + env.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  await StudentVerification.create({
    studentId: student._id,
    codeHash,
    expiresAt,
    maxAttempts: env.VERIFICATION_MAX_ATTEMPTS,
    lastSentAt: now,
  });

  await emailService.sendVerificationEmail({
    to: student.universityEmail,
    studentId: student._id,
    code, // plaintext only ever leaves this function via email
    universityName: university.name,
  });
}

async function verifyEmail({ studentId, code }) {
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError('Invalid verification request', 400, 'INVALID_REQUEST');
  if (student.emailVerified) throw new ApiError('Email is already verified', 400, 'ALREADY_VERIFIED');

  const verification = await StudentVerification.findOne({ studentId, used: false }).sort({ createdAt: -1 });
  if (!verification) throw new ApiError('No active verification code. Please request a new one.', 400, 'NO_ACTIVE_CODE');

  if (new Date() > verification.expiresAt) {
    throw new ApiError('Verification code expired.', 400, 'CODE_EXPIRED');
  }

  if (verification.attemptCount >= verification.maxAttempts) {
    throw new ApiError('Too many verification attempts. Please request a new code.', 429, 'TOO_MANY_ATTEMPTS');
  }

  const providedHash = hashValue(code.trim());
  if (providedHash !== verification.codeHash) {
    verification.attemptCount += 1;
    await verification.save();
    throw new ApiError('Invalid verification code.', 400, 'INVALID_CODE');
  }

  verification.used = true;
  await verification.save();

  student.emailVerified = true;
  student.accountStatus = 'ACTIVE';
  await student.save();

  await auditService.record({
    actorId: student._id,
    actorRole: 'STUDENT',
    action: 'EMAIL_VERIFICATION',
    entityType: 'Student',
    entityId: student._id,
  });

  return student;
}

module.exports = { registerStudent, issueVerificationCode, verifyEmail };