/**
 * Runtime Validation Middleware
 *
 * Provides Zod-based validation for API requests
 * Ensures type safety at runtime (TypeScript only validates at compile-time)
 */

import { z } from 'zod';

/**
 * Validate request body against a Zod schema
 */
export function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request body validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Query parameters validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'URL parameters validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

/**
 * Standard API response wrapper
 */
export function apiResponse(res, data, options = {}) {
  const { status = 200, meta = {} } = options;
  return res.status(status).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
}

/**
 * Standard API error response
 */
export function apiError(res, error, options = {}) {
  const { status = 500, code = 'INTERNAL_ERROR' } = options;
  return res.status(status).json({
    success: false,
    error: {
      code,
      message: error.message || 'An error occurred',
      details: error.details || null,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}
