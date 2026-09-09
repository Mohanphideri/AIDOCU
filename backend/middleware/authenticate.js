const { verifyToken } = require('../utils/jwt');
const { ApiError } = require('./errorHandler');

/**
 * Verifies the Bearer token and attaches { id, role, universityId } to req.user.
 * Does NOT check role-specific permissions — pair with requireRole().
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError('Authentication required', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      universityId: payload.universityId,
      permissions: payload.permissions || [],
    };
    return next();
  } catch (err) {
    return next(new ApiError('Invalid or expired session', 401, 'INVALID_TOKEN'));
  }
}

module.exports = { authenticate };
