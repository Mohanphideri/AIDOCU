const { ApiError } = require('./errorHandler');

/**
 * requireRole('ADMIN', 'SUPERVISOR') -> only those roles may proceed.
 * Must run after authenticate().
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401, 'UNAUTHENTICATED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }
    return next();
  };
}

/**
 * requirePermission('PUBLISH_RESULTS') -> checks a permission string against
 * req.user.permissions, which must be loaded onto req.user by an earlier
 * middleware (e.g. loadAdminPermissions) for roles that use fine-grained
 * permissions (Admin, Supervisor).
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || [];
    if (!permissions.includes(permission)) {
      return next(new ApiError(`Missing required permission: ${permission}`, 403, 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = { requireRole, requirePermission };
