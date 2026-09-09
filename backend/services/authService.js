/**
 * authService
 * -----------
 * Owns login for the three staff user types (Admin, Faculty, Supervisor).
 * Student auth lives in studentService.js because it also owns
 * registration/verification. Security notes:
 * - Never reveal whether an email exists vs. password being wrong — every
 *   failure path returns the same generic message.
 * - Rate-limit at the route layer (see middleware/rateLimiters.js).
 */

const { Admin, Supervisor, FacultyMember } = require('../models');
const { comparePassword } = require('../utils/passwordHash');
const { signToken } = require('../utils/jwt');
const { ApiError } = require('../middleware/errorHandler');
const auditService = require('./auditService');

function genericCredentialsError() {
  return new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
}

async function staffLogin({ Model, role, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = await Model.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!account) throw genericCredentialsError();

  const passwordOk = await comparePassword(password, account.passwordHash);
  if (!passwordOk) throw genericCredentialsError();

  if (account.isActive === false) {
    throw new ApiError('Your account has been deactivated. Contact the university administration.', 403, 'ACCOUNT_INACTIVE');
  }

  account.lastLoginAt = new Date();
  await account.save();

  const token = signToken({
    sub: account._id.toString(),
    role,
    universityId: account.universityId.toString(),
    permissions: account.permissions || [],
  });

  await auditService.record({
    actorId: account._id,
    actorRole: role,
    action: `${role}_LOGIN`,
    entityType: role === 'ADMIN' ? 'Admin' : role === 'FACULTY' ? 'FacultyMember' : 'Supervisor',
    entityId: account._id,
  });

  return {
    token,
    user: { id: account._id, name: account.name, email: account.email, role, permissions: account.permissions || [] },
  };
}

async function adminLogin(email, password) {
  return staffLogin({ Model: Admin, role: 'ADMIN', email, password });
}

async function facultyLogin(email, password) {
  return staffLogin({ Model: FacultyMember, role: 'FACULTY', email, password });
}

async function supervisorLogin(email, password) {
  return staffLogin({ Model: Supervisor, role: 'SUPERVISOR', email, password });
}

module.exports = { adminLogin, facultyLogin, supervisorLogin };
