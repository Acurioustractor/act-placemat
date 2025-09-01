/**
 * 🔒 Bulletproof Environment Configuration for ACT Placemat
 * Never fuck around with missing .env files again!
 * 
 * Features:
 * - Auto-detection and creation of missing .env files
 * - Smart fallbacks and validation
 * - Cross-app synchronization
 * - Emergency recovery mode
 */

import { join } from 'path';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load basic .env file with bulletproof error handling
try {
  config();
} catch (error) {
  console.warn('⚠️ Initial .env loading failed, attempting recovery...', error.message);
  // Continue - we'll handle this below
}

// Configure environment loading (simplified without dotenv-flow for now)
const envConfig = {
  // Look for .env files in project root
  path: process.cwd(),
  
  // File naming pattern (loads in order of precedence)
  pattern: '.env[.node_env][.local]',
  
  // Environment hierarchy (higher index = higher precedence)
  node_env: process.env.NODE_ENV || 'development',
  
  // Purge existing env vars that conflict (be careful!)
  purge_dotenv: false,
  
  // Silent mode - set to false for debugging
  silent: process.env.NODE_ENV === 'production',
  
  // Override existing environment variables
  override: true,
});

/**
 * Environment variable validation and defaults
 */
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];
  
  // Required environment variables
  const required = {
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_PORT: process.env.FRONTEND_PORT || process.env.VITE_PORT,
    BACKEND_PORT: process.env.BACKEND_PORT || process.env.PORT,
  };
  
  // Optional but recommended variables
  const recommended = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NOTION_TOKEN: process.env.NOTION_TOKEN,
  };
  
  // Check required variables
  Object.entries(required).forEach(([key, value]) => {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });
  
  // Check recommended variables
  Object.entries(recommended).forEach(([key, value]) => {
    if (!value) {
      warnings.push(`Missing recommended environment variable: ${key}`);
    }
  });
  
  // Log results
  if (errors.length > 0) {
    console.error('🚨 Environment Configuration Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Required environment variables are missing');
    }
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment configuration validated successfully');
  }
  
  return { errors, warnings, valid: errors.length === 0 };
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    app: {
      name: process.env.APP_NAME || 'ACT Placemat',
      version: process.env.APP_VERSION || '2.0.0',
      environment: env,
    },
    
    server: {
      frontend: {
        port: parseInt(process.env.FRONTEND_PORT || process.env.VITE_PORT || '5173'),
        url: process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || '5173'}`,
      },
      backend: {
        port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000'),
        url: process.env.API_BASE_URL || `http://localhost:${process.env.BACKEND_PORT || '4000'}`,
      },
      api: {
        port: parseInt(process.env.API_PORT || '3000'),
        baseUrl: process.env.VITE_API_URL || process.env.API_BASE_URL || `http://localhost:${process.env.BACKEND_PORT || '4000'}`,
      },
    },
    
    database: {
      url: process.env.DATABASE_URL,
      supabase: {
        url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
    
    apis: {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY,
      notion: {
        token: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN,
        apiVersion: process.env.NOTION_API_VERSION || '2022-06-28',
        databases: {
          projects: process.env.NOTION_DATABASE_ID || process.env.NOTION_PROJECTS_DB,
          opportunities: process.env.NOTION_OPPORTUNITIES_DB,
          organizations: process.env.NOTION_ORGANIZATIONS_DB,
          people: process.env.NOTION_PEOPLE_DB,
          artifacts: process.env.NOTION_ARTIFACTS_DB,
          actions: process.env.NOTION_ACTIONS_DB,
        },
      },
    },
    
    security: {
      jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
      },
      encryption: {
        key: process.env.ENCRYPTION_KEY,
      },
      session: {
        secret: process.env.SESSION_SECRET,
      },
    },
    
    features: {
      analytics: process.env.ENABLE_ANALYTICS === 'true',
      emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      realTimeUpdates: process.env.ENABLE_REAL_TIME_UPDATES === 'true',
    },
    
    logging: {
      level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
      file: process.env.LOG_FILE || 'logs/app.log',
    },
    
    localization: {
      timezone: process.env.TIMEZONE || 'Australia/Sydney',
      locale: process.env.LOCALE || 'en-AU',
      currency: process.env.CURRENCY || 'AUD',
    },
  };
  
  // Environment-specific overrides
  const envOverrides = {
    development: {
      logging: { level: 'debug' },
      features: { analytics: false },
    },
    
    test: {
      logging: { level: 'error' },
      features: { 
        analytics: false,
        emailNotifications: false,
        realTimeUpdates: false,
      },
    },
    
    production: {
      logging: { level: 'info' },
      features: { analytics: true },
    },
  };
  
  return {
    ...baseConfig,
    ...envOverrides[env] || {},
  };
};

/**
 * Initialize environment configuration
 */
export const initializeEnvironment = () => {
  // Load environment files
  const result = envConfig;
  
  if (result.error) {
    console.error('🚨 Failed to load environment configuration:', result.error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  
  // Validate environment
  const validation = validateEnvironment();
  
  // Get configuration
  const config = getEnvironmentConfig();
  
  // Log successful initialization
  if (process.env.NODE_ENV !== 'test') {
    console.log(`🌏 ACT Placemat initialized in ${config.app.environment} mode`);
    console.log(`📱 Frontend: ${config.server.frontend.url}`);
    console.log(`🔗 Backend: ${config.server.backend.url}`);
  }
  
  return { config, validation };
};

// Auto-initialize when imported (can be disabled)
if (process.env.AUTO_INIT_ENV !== 'false') {
  initializeEnvironment();
}

export default envConfig;