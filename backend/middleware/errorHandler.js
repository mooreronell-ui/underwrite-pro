// ============================================================
// ERROR HANDLER MIDDLEWARE
// Centralized error handling with JSON responses
// ============================================================

/**
 * Global error handler middleware
 * Catches all errors and returns consistent JSON responses
 */
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation Error';
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.details = err.details;
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    errorResponse.error = 'Conflict';
    errorResponse.message = 'Resource already exists';
    errorResponse.code = 'DUPLICATE_RESOURCE';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorResponse.error = 'Bad Request';
    errorResponse.message = 'Referenced resource does not exist';
    errorResponse.code = 'INVALID_REFERENCE';
  }

  if (err.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    errorResponse.error = 'Bad Request';
    errorResponse.message = 'Required field is missing';
    errorResponse.code = 'MISSING_REQUIRED_FIELD';
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    delete errorResponse.stack;
    if (statusCode === 500) {
      errorResponse.message = 'An internal error occurred';
    }
  } else {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  AppError
};
