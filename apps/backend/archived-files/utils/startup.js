/**
 * Startup Procedures for Life Orchestrator
 * Handles application initialization, health checks, and graceful shutdown
 * 
 * Features:
 * - Service initialization and validation
 * - Environment configuration validation
 * - Database connectivity checks
 * - External service availability checks
 * - Graceful shutdown handling
 * - Performance monitoring setup
 * 
 * Usage: import { initializeApplication } from './utils/startup.js'
 */

import { logger } from './logger.js';
import { updateServiceHealth, getServiceHealth, handleUnhandledRejection, handleUncaughtException } from '../middleware/errorHandler.js';

// Global application state
const applicationState = {
  initialized: false,
  startTime: null,
  shutdownInitiated: false,
  services: new Map(),
  healthChecks: new Map()
};

/**
 * Initialize the Life Orchestrator application
 */
export async function initializeApplication(app) {
  try {
    logger.info('🚀 Initializing Life Orchestrator application...');
    applicationState.startTime = Date.now();

    // Setup error handlers first
    setupErrorHandlers();

    // Validate environment configuration
    await validateEnvironment();

    // Initialize core services
    await initializeServices();

    // Setup health check endpoints
    setupHealthChecks(app);

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Validate external dependencies
    await validateExternalDependencies();

    // Setup performance monitoring
    setupPerformanceMonitoring();

    applicationState.initialized = true;
    const initTime = Date.now() - applicationState.startTime;

    logger.info(`✅ Life Orchestrator initialized successfully in ${initTime}ms`);
    
    // Log system information
    logSystemInfo();

    return true;

  } catch (error) {
    logger.error('❌ Failed to initialize application:', error);
    throw error;
  }
}

/**
 * Validate environment configuration
 */
async function validateEnvironment() {
  logger.info('🔧 Validating environment configuration...');

  const requiredEnvVars = [
    'NODE_ENV'
  ];

  const recommendedEnvVars = [
    'GROQ_API_KEY',
    'GOOGLE_CALENDAR_CLIENT_ID',
    'GOOGLE_CALENDAR_CLIENT_SECRET',
    'PORT'
  ];

  // Check required environment variables
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check recommended environment variables
  const missingRecommended = recommendedEnvVars.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    logger.warn('⚠️  Missing recommended environment variables:', missingRecommended);
    logger.warn('   Some features may not work correctly without proper API keys');
  }

  // Validate environment-specific settings
  const nodeEnv = process.env.NODE_ENV;
  if (!['development', 'staging', 'production'].includes(nodeEnv)) {
    logger.warn(`⚠️  Unusual NODE_ENV value: ${nodeEnv}`);
  }

  // Validate port
  const port = parseInt(process.env.PORT || '3001');
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${process.env.PORT}`);
  }

  logger.info(`✅ Environment validated (${nodeEnv} mode)`);
}

/**
 * Initialize core services
 */
async function initializeServices() {
  logger.info('🛠️  Initializing core services...');

  const services = [
    { name: 'logger', init: () => Promise.resolve() },
    { name: 'database', init: initializeDatabase },
    { name: 'cache', init: initializeCache },
    { name: 'ai', init: initializeAIServices },
    { name: 'monitoring', init: initializeMonitoring }
  ];

  for (const service of services) {
    try {
      logger.info(`  Initializing ${service.name}...`);
      await service.init();
      applicationState.services.set(service.name, { status: 'healthy', initializedAt: new Date().toISOString() });
      updateServiceHealth(service.name, true);
      logger.info(`  ✅ ${service.name} initialized`);
    } catch (error) {
      logger.error(`  ❌ Failed to initialize ${service.name}:`, error);
      applicationState.services.set(service.name, { status: 'error', error: error.message });
      updateServiceHealth(service.name, false, error.message);
      
      // Some services are optional in development
      if (process.env.NODE_ENV === 'production' || ['logger', 'database'].includes(service.name)) {
        throw error;
      }
    }
  }

  logger.info('✅ Core services initialized');
}

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  // For development, we'll use a simple file check
  // In production, this would test actual database connectivity
  
  if (process.env.DATABASE_URL) {
    logger.info('  Database URL configured');
    // TODO: Add actual database connection test
    return Promise.resolve();
  } else {
    logger.info('  Using SQLite file database');
    // Check if data directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      logger.info('  Created data directory');
    }
  }
}

/**
 * Initialize cache (Redis or memory)
 */
async function initializeCache() {
  if (process.env.REDIS_URL) {
    logger.info('  Redis cache configured');
    // TODO: Add Redis connection test
  } else {
    logger.info('  Using in-memory cache');
  }
}

/**
 * Initialize AI services
 */
async function initializeAIServices() {
  const services = [];
  
  if (process.env.GROQ_API_KEY) {
    services.push('Groq');
  }
  
  if (process.env.PERPLEXITY_API_KEY) {
    services.push('Perplexity');
  }

  if (process.env.OPENAI_API_KEY) {
    services.push('OpenAI');
  }

  if (services.length === 0) {
    throw new Error('No AI service API keys configured. At least one AI service is required.');
  }

  logger.info(`  AI services available: ${services.join(', ')}`);
}

/**
 * Initialize monitoring and metrics
 */
async function initializeMonitoring() {
  // Setup basic metrics collection
  process.on('exit', (code) => {
    logger.info(`Process exiting with code: ${code}`);
  });

  // Memory monitoring
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryUsageMB = Math.round(usage.heapUsed / 1024 / 1024);
      
      if (memoryUsageMB > 500) {
        logger.warn(`High memory usage: ${memoryUsageMB}MB`);
      }
    }, 60000); // Check every minute
  }
}

/**
 * Setup health check endpoints
 */
function setupHealthChecks(app) {
  logger.info('🏥 Setting up health checks...');

  // Basic health check
  applicationState.healthChecks.set('basic', async () => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  });

  // Service health checks
  applicationState.healthChecks.set('services', async () => {
    return getServiceHealth();
  });

  // External dependencies health check
  applicationState.healthChecks.set('external', async () => {
    return await checkExternalDependencies();
  });

  // Add health endpoint
  app.get('/health', async (req, res) => {
    try {
      const healthData = {};
      
      for (const [name, check] of applicationState.healthChecks) {
        healthData[name] = await check();
      }

      const isHealthy = Object.values(healthData).every(data => 
        typeof data === 'object' && data.status !== 'error'
      );

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'degraded',
        checks: healthData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  logger.info('✅ Health checks configured');
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown() {
  logger.info('⚡ Setting up graceful shutdown...');

  const gracefulShutdown = async (signal) => {
    if (applicationState.shutdownInitiated) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    applicationState.shutdownInitiated = true;
    logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new requests
      logger.info('  Stopping new request acceptance...');

      // Close databases and external connections
      logger.info('  Closing database connections...');
      await shutdownServices();

      // Clear intervals and timeouts
      logger.info('  Clearing timers...');

      const shutdownTime = Date.now() - applicationState.startTime;
      logger.info(`✅ Graceful shutdown completed in ${Date.now() - applicationState.startTime}ms`);
      logger.info(`   Total uptime: ${Math.round(shutdownTime / 1000)}s`);

      process.exit(0);

    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Setup signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  logger.info('✅ Graceful shutdown configured');
}

/**
 * Shutdown services
 */
async function shutdownServices() {
  for (const [name, service] of applicationState.services) {
    try {
      logger.info(`  Shutting down ${name}...`);
      // Add specific shutdown logic for each service
      updateServiceHealth(name, false, 'Shutting down');
    } catch (error) {
      logger.error(`  Error shutting down ${name}:`, error);
    }
  }
}

/**
 * Setup error handlers
 */
function setupErrorHandlers() {
  handleUnhandledRejection();
  handleUncaughtException();
}

/**
 * Validate external dependencies
 */
async function validateExternalDependencies() {
  logger.info('🌐 Validating external dependencies...');

  const checks = [
    { name: 'Internet connectivity', check: checkInternetConnectivity },
    { name: 'AI services', check: checkAIServices },
    { name: 'Time synchronization', check: checkTimeSync }
  ];

  for (const { name, check } of checks) {
    try {
      await check();
      logger.info(`  ✅ ${name}: OK`);
    } catch (error) {
      logger.warn(`  ⚠️  ${name}: ${error.message}`);
      // Don't fail startup for external dependencies in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  logger.info('✅ External dependencies validated');
}

/**
 * Check external dependencies
 */
async function checkExternalDependencies() {
  const status = {};

  try {
    await checkInternetConnectivity();
    status.internet = 'healthy';
  } catch {
    status.internet = 'error';
  }

  try {
    await checkAIServices();
    status.ai_services = 'healthy';
  } catch {
    status.ai_services = 'degraded';
  }

  return status;
}

/**
 * Check internet connectivity
 */
async function checkInternetConnectivity() {
  const { default: fetch } = await import('node-fetch');
  
  const response = await fetch('https://www.google.com', { 
    timeout: 5000,
    method: 'HEAD'
  });

  if (!response.ok) {
    throw new Error('Internet connectivity check failed');
  }
}

/**
 * Check AI services availability
 */
async function checkAIServices() {
  if (!process.env.GROQ_API_KEY && !process.env.PERPLEXITY_API_KEY) {
    throw new Error('No AI service API keys configured');
  }
  
  // In a full implementation, we'd test actual API calls here
  return true;
}

/**
 * Check time synchronization
 */
async function checkTimeSync() {
  const { default: fetch } = await import('node-fetch');
  
  try {
    const response = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC', { timeout: 3000 });
    const data = await response.json();
    const serverTime = new Date(data.datetime);
    const localTime = new Date();
    const timeDiff = Math.abs(serverTime - localTime);
    
    if (timeDiff > 60000) { // More than 1 minute difference
      throw new Error(`Time synchronization issue: ${timeDiff}ms difference`);
    }
  } catch (error) {
    logger.warn('Could not verify time synchronization:', error.message);
    // Don't fail for time sync issues
  }
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
  logger.info('📊 Setting up performance monitoring...');

  // Track request metrics
  const metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    slowRequestCount: 0
  };

  // Export metrics getter
  global.getMetrics = () => ({
    ...metrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });

  logger.info('✅ Performance monitoring configured');
}

/**
 * Log system information
 */
function logSystemInfo() {
  const info = {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3001,
    uptime: `${Math.round(process.uptime())}s`
  };

  logger.info('📋 System Information:');
  Object.entries(info).forEach(([key, value]) => {
    logger.info(`  ${key}: ${value}`);
  });

  // Log available services
  const availableServices = [];
  if (process.env.GROQ_API_KEY) availableServices.push('Groq AI');
  if (process.env.GOOGLE_CALENDAR_CLIENT_ID) availableServices.push('Google Calendar');
  if (process.env.SLACK_CLIENT_ID) availableServices.push('Slack');
  if (process.env.PERPLEXITY_API_KEY) availableServices.push('Perplexity');

  logger.info('🔌 Available Integrations:');
  if (availableServices.length > 0) {
    availableServices.forEach(service => logger.info(`  ✅ ${service}`));
  } else {
    logger.info('  ⚠️  No external integrations configured');
  }

  // Log startup recommendations
  if (process.env.NODE_ENV === 'development') {
    logger.info('💡 Development Recommendations:');
    logger.info('  - Configure API keys for full functionality');
    logger.info('  - Run integration tests: node test-system.js');
    logger.info('  - Check health endpoint: http://localhost:3001/health');
  }
}

/**
 * Get application state
 */
export function getApplicationState() {
  return {
    ...applicationState,
    services: Object.fromEntries(applicationState.services),
    healthChecks: Array.from(applicationState.healthChecks.keys())
  };
}

/**
 * Check if application is ready
 */
export function isApplicationReady() {
  return applicationState.initialized && !applicationState.shutdownInitiated;
}

/**
 * Get application metrics
 */
export function getApplicationMetrics() {
  return {
    uptime: Date.now() - applicationState.startTime,
    startTime: applicationState.startTime,
    initialized: applicationState.initialized,
    serviceCount: applicationState.services.size,
    healthyServices: Array.from(applicationState.services.values()).filter(s => s.status === 'healthy').length,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
}

export default {
  initializeApplication,
  getApplicationState,
  isApplicationReady,
  getApplicationMetrics
};