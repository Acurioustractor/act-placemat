/**
 * Authentication configuration
 */
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'act-platform',
    audience: process.env.JWT_AUDIENCE || 'act-dashboard'
  },
  
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  rateLimiting: {
    windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
    maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 dev, 100 prod
    message: 'Too many requests from this IP, please try again later.',
    
    // Stricter limits for auth endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: process.env.NODE_ENV === 'development' ? 50 : 5, // 50 dev, 5 prod
      message: 'Too many authentication attempts, please try again later.'
    }
  }
};

export default authConfig;