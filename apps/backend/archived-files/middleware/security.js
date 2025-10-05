/**
 * Security middleware for the ACT Platform
 */
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authConfig } from '../config/auth.js';

/**
 * Content Security Policy configuration
 */
export const cspMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for platform integrations
  crossOriginResourcePolicy: { 
    policy: process.env.NODE_ENV === 'development' ? 'cross-origin' : 'same-origin'
  }
});

/**
 * General rate limiting middleware
 */
export const generalRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.windowMs,
  max: authConfig.rateLimiting.maxRequests,
  message: {
    error: authConfig.rateLimiting.message,
    retryAfter: Math.ceil(authConfig.rateLimiting.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: authConfig.rateLimiting.message,
      retryAfter: Math.ceil(authConfig.rateLimiting.windowMs / 1000)
    });
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.auth.windowMs,
  max: authConfig.rateLimiting.auth.maxRequests,
  message: {
    error: authConfig.rateLimiting.auth.message,
    retryAfter: Math.ceil(authConfig.rateLimiting.auth.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: authConfig.rateLimiting.auth.message,
      retryAfter: Math.ceil(authConfig.rateLimiting.auth.windowMs / 1000)
    });
  }
});

/**
 * Request sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters from request body
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove script tags and potential XSS vectors
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            : item
        );
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

/**
 * API key validation middleware for platform access
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide a valid API key in the X-API-Key header or api_key query parameter'
    });
  }
  
  // In production, validate against a secure API key store
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',').filter(Boolean);
  
  if (validApiKeys.length > 0 && !validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }
  
  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: `Request size exceeds the maximum allowed size of ${maxSize / (1024 * 1024)}MB`
    });
  }
  
  next();
};

/**
 * CORS configuration for production
 */
export const corsOptions = {
  origin: function (origin, callback) {
    // If ALLOWED_ORIGINS is set to "*", allow all origins
    if (process.env.ALLOWED_ORIGINS === '*') {
      return callback(null, true);
    }
    
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5175,http://localhost:5176,http://localhost:8080').split(',');
    
    // Allow requests with no origin (like mobile apps, curl requests, or file:// protocol)
    if (!origin) return callback(null, true);
    
    // Allow file:// protocol for local HTML files
    if (origin.startsWith('file://')) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

export default {
  cspMiddleware,
  generalRateLimit,
  authRateLimit,
  sanitizeInput,
  validateApiKey,
  requestSizeLimit,
  corsOptions
};