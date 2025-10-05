export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const globalErrorHandler = (err, req, res, next) => {
  console.error('Global error handler:', err);
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({
    error: err?.code || 'internal_error',
    message: err?.message || 'An unexpected error occurred.'
  });
};

export const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found' });
};

export const healthCheckError = (message = 'Service unavailable') => {
  const error = new Error(message);
  error.status = 503;
  return error;
};

export const healthCheckSuccess = (payload = {}) => ({ healthy: true, ...payload });

export default {
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  healthCheckError,
  healthCheckSuccess
};
