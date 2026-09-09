const { ApiError } = require('./errorHandler');

/**
 * Generic IDOR guard: loads a document by id param, then verifies the
 * authenticated user actually owns/relates to it before allowing the route
 * handler to run. Use for attempts, answers, results, queries, proctoring data.
 *
 * Example:
 *   router.get('/attempts/:attemptId',
 *     authenticate, requireRole('STUDENT'),
 *     ownsResource({
 *       model: ExamAttempt,
 *       paramName: 'attemptId',
 *       ownerField: 'studentId',
 *     }),
 *     attemptController.getAttempt
 *   );
 */
function ownsResource({ model, paramName, ownerField }) {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const doc = await model.findById(resourceId);

      if (!doc) {
        return next(new ApiError('Resource not found', 404, 'NOT_FOUND'));
      }

      const ownerId = doc[ownerField]?.toString();
      if (ownerId !== req.user.id) {
        // Deliberately generic message/status — do not reveal whether the
        // resource exists to a non-owner.
        return next(new ApiError('Resource not found', 404, 'NOT_FOUND'));
      }

      req.resource = doc;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { ownsResource };
