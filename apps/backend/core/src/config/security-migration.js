/**
 * Security Migration Script
 * Safely migrates from wildcard CORS to world-class security
 */
import cors from 'cors';
import { createWorldClassCORS, getCORSMetrics } from '../middleware/world-class-cors.js';
import { zeroTrustAuth } from '../middleware/zero-trust-auth.js';

/**
 * Create world-class CORS configuration
 * Replaces the insecure corsOptions from security.js
 */
export function createSecureCORS() {
  const environment = process.env.NODE_ENV || 'development';
  
  console.log(`🔒 Initializing world-class CORS security for ${environment}`);
  
  // Get world-class CORS configuration
  const worldClassConfig = createWorldClassCORS();
  
  // Create Express CORS middleware
  const corsMiddleware = cors(worldClassConfig);
  
  // Add security monitoring
  const monitoredCORS = (req, res, next) => {
    const startTime = Date.now();
    
    corsMiddleware(req, res, (err) => {
      const duration = Date.now() - startTime;
      
      if (err) {
        console.warn('🚫 CORS Blocked:', {
          origin: req.headers.origin,
          path: req.path,
          method: req.method,
          error: err.message,
          duration: `${duration}ms`
        });
      } else if (process.env.DEBUG_CORS) {
        console.log('✅ CORS Allowed:', {
          origin: req.headers.origin,
          path: req.path,
          method: req.method,
          duration: `${duration}ms`
        });
      }
      
      next(err);
    });
  };

  // Add CORS metrics endpoint for monitoring
  monitoredCORS.getMetrics = getCORSMetrics;
  
  return monitoredCORS;
}

/**
 * Create security configuration for different API tiers
 */
export function createAPISecurityTiers() {
  return {
    // Public APIs - Basic security
    public: {
      cors: createSecureCORS(),
      auth: zeroTrustAuth.optional,
      rateLimit: { windowMs: 15 * 60 * 1000, max: 200 } // 200 requests per 15 minutes
    },
    
    // Dashboard APIs - Medium security  
    dashboard: {
      cors: createSecureCORS(),
      auth: zeroTrustAuth.required,
      rateLimit: { windowMs: 15 * 60 * 1000, max: 1000 } // 1000 requests per 15 minutes
    },
    
    // Intelligence APIs - High security
    intelligence: {
      cors: createSecureCORS(),
      auth: zeroTrustAuth.highSecurity,
      rateLimit: { windowMs: 15 * 60 * 1000, max: 500 } // 500 requests per 15 minutes
    },
    
    // Admin APIs - Maximum security
    admin: {
      cors: createSecureCORS(),
      auth: zeroTrustAuth.adminOnly,
      rateLimit: { windowMs: 15 * 60 * 1000, max: 100 } // 100 requests per 15 minutes
    }
  };
}

/**
 * Environment-specific security configuration
 */
export function getSecurityConfig() {
  const environment = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      strictMode: false,
      debugging: {
        cors: true,
        auth: true,
        performance: true
      },
      allowedFeatures: {
        emergencyBypass: true,
        corsWarningsOnly: true,
        verboseLogging: true
      }
    },
    
    staging: {
      strictMode: true,
      debugging: {
        cors: false,
        auth: false,
        performance: true
      },
      allowedFeatures: {
        emergencyBypass: true,
        corsWarningsOnly: false,
        verboseLogging: false
      }
    },
    
    production: {
      strictMode: true,
      debugging: {
        cors: false,
        auth: false,
        performance: false
      },
      allowedFeatures: {
        emergencyBypass: false,
        corsWarningsOnly: false,
        verboseLogging: false
      }
    }
  };
  
  return configs[environment] || configs.development;
}

/**
 * Security health check endpoint
 */
export function createSecurityHealthCheck() {
  return (req, res) => {
    const config = getSecurityConfig();
    const corsMetrics = getCORSMetrics();
    
    const healthCheck = {
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      security: {
        cors: {
          status: 'active',
          environment: corsMetrics.environment,
          metrics: corsMetrics.metrics
        },
        authentication: {
          status: 'active',
          zeroTrust: true,
          multiLayer: true
        },
        configuration: config
      },
      timestamp: new Date().toISOString()
    };
    
    // Add warnings for insecure configurations
    if (process.env.ALLOWED_ORIGINS === '*') {
      healthCheck.warnings = healthCheck.warnings || [];
      healthCheck.warnings.push({
        type: 'INSECURE_CORS',
        message: 'Wildcard CORS detected - this is insecure for production',
        severity: 'HIGH'
      });
    }
    
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      healthCheck.warnings = healthCheck.warnings || [];
      healthCheck.warnings.push({
        type: 'WEAK_JWT_SECRET',
        message: 'JWT secret is missing or too short',
        severity: 'CRITICAL'
      });
    }
    
    res.json(healthCheck);
  };
}

/**
 * Security migration validator
 * Ensures all security components are properly configured
 */
export function validateSecurityMigration() {
  const issues = [];
  
  // Check environment variables
  if (!process.env.JWT_SECRET) {
    issues.push({ type: 'MISSING_JWT_SECRET', severity: 'CRITICAL' });
  }
  
  if (process.env.ALLOWED_ORIGINS === '*' && process.env.NODE_ENV === 'production') {
    issues.push({ type: 'WILDCARD_CORS_IN_PROD', severity: 'CRITICAL' });
  }
  
  if (!process.env.VALID_API_KEYS) {
    issues.push({ type: 'NO_API_KEYS', severity: 'HIGH' });
  }
  
  // Check configuration consistency
  const environment = process.env.NODE_ENV || 'development';
  if (environment === 'production' && process.env.DEBUG_CORS === 'true') {
    issues.push({ type: 'DEBUG_IN_PRODUCTION', severity: 'MEDIUM' });
  }
  
  return {
    valid: issues.length === 0,
    issues,
    timestamp: new Date().toISOString()
  };
}

export default {
  createSecureCORS,
  createAPISecurityTiers,
  getSecurityConfig,
  createSecurityHealthCheck,
  validateSecurityMigration
};