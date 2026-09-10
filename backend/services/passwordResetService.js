/**
 * passwordResetService
 * --------------------
 * Drives the "forgot password" / "reset password" flow for every account
 * type (Student + the three staff roles) through a single implementation,
 * since the mechanics (generate token, email link, verify token, set new
 * password) are identical — only the underlying Mongoose model differs.
 *
 * Security notes (mirrors studentService/authService conventions):
 * - Never reveal whether an email exists — requestPasswordReset() always
 *   resolves the same way regardless of whether an account was found.
 * - Only a SHA-256 hash of the reset token is ever persisted; the plaintext
 *   token leaves this module exactly once, inside the emailed reset link.
 * - Rate-limiting happens at the route layer (passwordResetLimiter).
 */

const { Student, Admin, FacultyMember, Supervisor, University, PasswordResetToken } = require('../models');
const { hashPassword } = require('../utils/passwordHash');
const { generateUrlSafeToken, hashValue } = require('../utils/tokenHash');
const { ApiError } = require('../middleware/errorHandler');
const { env } = require('../config/env');
const emailService = require('./emailService');
const auditService = require('./auditService');

const ROLE_CONFIG = {
  STUDENT: { Model: Student, emailField: 'universityEmail', entityType: 'Student', resetPathPrefix: '' },
  ADMIN: { Model: Admin, emailField: 'email', entityType: 'Admin', resetPathPrefix: '/admin' },
  FACULTY: { Model: FacultyMember, emailField: 'email', entityType: 'FacultyMember', resetPathPrefix: '/faculty' },
  SUPERVISOR: { Model: Supervisor, emailField: 'email', entityType: 'Supervisor', resetPathPrefix: '/supervisor' },
};

function configFor(role) {
  const config = ROLE_CONFIG[role];
  if (!config) throw new ApiError('Unsupported account type', 400, 'INVALID_ROLE');
  return config;
}

/**
 * Looks up the account, issues a reset token, and emails the reset link.
 * Always resolves successfully (even when no account matches) so callers
 * can return the same generic message to the client either way.
 */
async function requestPasswordReset({ role, email }) {
  const { Model, emailField, entityType } = configFor(role);
  const normalizedEmail = email.trim().toLowerCase();

  const account = await Model.findOne({ [emailField]: normalizedEmail });
  if (!account) return; // Silently no-op — never reveal account existence.

  const university = await University.findById(account.universityId);
  if (!university) return; // Data integrity issue; nothing safe to email.

  // Invalidate any previous unused tokens for this account before issuing
  // a new one, same pattern as email verification codes.
  await PasswordResetToken.updateMany(
    { accountId: account._id, role, used: false },
    { $set: { used: true, usedAt: new Date() } }
  );

  const plainToken = generateUrlSafeToken(32);
  const tokenHash = hashValue(plainToken);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await PasswordResetToken.create({ accountId: account._id, role, tokenHash, expiresAt });

  const { resetPathPrefix } = ROLE_CONFIG[role];
  const resetUrl = `${env.CLIENT_URL}${resetPathPrefix}/reset-password/${plainToken}`;

  await emailService.sendPasswordResetEmail({
    to: account[emailField],
    studentId: role === 'STUDENT' ? account._id : null,
    resetUrl,
    universityName: university.name,
  });

  await auditService.record({
    actorId: account._id,
    actorRole: role,
    action: `${role}_PASSWORD_RESET_REQUESTED`,
    entityType,
    entityId: account._id,
  });
}

/**
 * Validates a reset token and sets the new password. Throws ApiError on any
 * invalid/expired/already-used token — unlike requestPasswordReset(), this
 * step is allowed to be specific since the caller already possesses the
 * (unguessable) token from their email.
 */
async function resetPassword({ role, token, newPassword }) {
  const { Model, entityType } = configFor(role);
  const tokenHash = hashValue(token);

  const resetToken = await PasswordResetToken.findOne({ tokenHash, role, used: false });
  if (!resetToken) {
    throw new ApiError('This password reset link is invalid or has already been used.', 400, 'INVALID_TOKEN');
  }
  if (new Date() > resetToken.expiresAt) {
    throw new ApiError('This password reset link has expired. Please request a new one.', 400, 'TOKEN_EXPIRED');
  }

  const account = await Model.findById(resetToken.accountId);
  if (!account) {
    throw new ApiError('This password reset link is invalid.', 400, 'INVALID_TOKEN');
  }

  account.passwordHash = await hashPassword(newPassword);
  await account.save();

  resetToken.used = true;
  resetToken.usedAt = new Date();
  await resetToken.save();

  await auditService.record({
    actorId: account._id,
    actorRole: role,
    action: `${role}_PASSWORD_RESET_COMPLETED`,
    entityType,
    entityId: account._id,
  });

  return account;
}

module.exports = { requestPasswordReset, resetPassword };
