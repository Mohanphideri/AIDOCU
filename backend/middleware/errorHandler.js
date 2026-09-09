const { env } = require('../config/env');

// Custom error class so services can throw errors with an HTTP status + code
// that the handler below understands.
class ApiError extends Error {
  constructor(message, statusCode = 400, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const body = {
    success: false,
    message: err.expose === false ? 'Something went wrong' : err.message || 'Something went wrong',
    code,
  };

  // Never leak stack traces in production responses.
  if (env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { ApiError, notFoundHandler, errorHandler };
