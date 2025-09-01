/**
 * Centralized error handling middleware
 */

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle specific error types
 */
const handleDatabaseError = (error) => {
  if (error.code === '23505') { // PostgreSQL unique violation
    return new AppError('Duplicate entry found', 409);
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return new AppError('Referenced record not found', 400);
  }
  
  if (error.code === '23502') { // PostgreSQL not null violation
    return new AppError('Required field is missing', 400);
  }
  
  return new AppError('Database operation failed', 500);
};

const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401);
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Authentication token has expired', 401);
  }
  
  return new AppError('Authentication failed', 401);
};

const handleValidationError = (error) => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return new AppError(`Validation failed: ${messages.join(', ')}`, 400);
  }
  
  return error;
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    error: err.message,
    status: 'error',
    statusCode: err.statusCode,
    stack: err.stack,
    timestamp: err.timestamp || new Date().toISOString(),
    ...(err.details && { details: err.details })
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Only send operational errors to client in production
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      status: 'error',
      timestamp: err.timestamp || new Date().toISOString()
    });
  } else {
    // Log programming errors but don't expose details
    console.error('Programming Error:', err);
    
    res.status(500).json({
      error: 'Something went wrong on our end',
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  // Log all errors
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  let error = { ...err };
  error.message = err.message;
  
  // Handle specific error types
  if (err.code && (err.code.startsWith('23') || err.code === 'PGRST')) {
    error = handleDatabaseError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.type === 'entity.too.large') {
    error = new AppError('Request payload too large', 413);
  } else if (err.code === 'ECONNREFUSED') {
    error = new AppError('External service unavailable', 503);
  } else if (err.code === 'ENOTFOUND') {
    error = new AppError('External service not found', 503);
  }
  
  // Ensure error has required properties
  if (!error.statusCode) error.statusCode = 500;
  if (!error.isOperational) error.isOperational = false;
  if (!error.timestamp) error.timestamp = new Date().toISOString();
  
  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

/**
 * Health check error handler
 */
export const healthCheckError = (error) => {
  return {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

export default {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  healthCheckError
};