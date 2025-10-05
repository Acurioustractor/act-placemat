/**
 * Secure Server Configuration
 * Configures Express server with HTTPS/TLS enforcement and security middleware
 */

import express from 'express';
import http from 'http';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';

// Security middleware
import {
  httpsRedirect,
  hstsMiddleware,
  secureHeadersMiddleware,
  createSecureServer,
  tlsConnectionHandler,
  tlsErrorHandler,
  certificateMonitoring,
} from '../middleware/httpsEnforcement.js';

import {
  cspMiddleware,
  generalRateLimit,
  sanitizeInput,
  requestSizeLimit,
  corsOptions,
} from '../middleware/security.js';

// GraphQL server
import { createGraphQLServer } from '../graphql/server.js';

/**
 * Create and configure secure Express application
 */
export const createSecureApp = async () => {
  const app = express();

  // Trust proxy for proper HTTPS detection behind load balancers
  app.set('trust proxy', true);

  // Security middleware - applied in order of importance
  console.log('🔒 Configuring security middleware...');

  // 1. HTTPS redirect (first to catch all HTTP requests)
  app.use(httpsRedirect);

  // 2. HSTS and secure headers
  app.use(hstsMiddleware);
  app.use(secureHeadersMiddleware);

  // 3. Content Security Policy
  app.use(cspMiddleware);

  // 4. CORS with secure configuration
  app.use(cors(corsOptions));

  // 5. Request processing and validation
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Request sanitization and size limiting
  app.use(requestSizeLimit);
  app.use(sanitizeInput);

  // 7. Rate limiting
  app.use(generalRateLimit);

  // 8. Logging (after security but before routes)
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        skip: (req, res) => res.statusCode < 400, // Only log errors in production
      })
    );
  }

  console.log('✅ Security middleware configured');

  return app;
};

/**
 * Create HTTP and HTTPS servers with proper configuration
 */
export const createServers = async app => {
  const servers = {};

  // Create HTTP server (for redirects only in production)
  const httpServer = http.createServer(app);

  // Configure HTTP server
  httpServer.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ HTTP port ${process.env.PORT || 4000} is already in use`);
    } else {
      console.error('❌ HTTP server error:', error);
    }
  });

  servers.http = httpServer;

  // Create HTTPS server if certificates are available
  const httpsServer = createSecureServer(app);

  if (httpsServer) {
    // Configure HTTPS server event handlers
    httpsServer.on('secureConnection', tlsConnectionHandler);
    httpsServer.on('tlsClientError', tlsErrorHandler);

    httpsServer.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `❌ HTTPS port ${process.env.HTTPS_PORT || 4443} is already in use`
        );
      } else {
        console.error('❌ HTTPS server error:', error);
      }
    });

    servers.https = httpsServer;

    // Start certificate monitoring
    if (process.env.NODE_ENV === 'production') {
      certificateMonitoring();
    }
  }

  return servers;
};

/**
 * Start secure servers with proper error handling
 */
export const startSecureServers = async (app, options = {}) => {
  const {
    httpPort = process.env.PORT || 4000,
    httpsPort = process.env.HTTPS_PORT || 4443,
    enableGraphQL = true,
  } = options;

  console.log('🚀 Starting secure servers...');

  // Create servers
  const servers = await createServers(app);

  // Setup GraphQL if requested
  if (enableGraphQL) {
    console.log('🔄 Setting up GraphQL server...');

    // Use HTTPS server if available, otherwise HTTP
    const primaryServer = servers.https || servers.http;

    await createGraphQLServer(app, primaryServer);
    console.log('✅ GraphQL server configured');
  }

  // Start HTTP server
  if (servers.http) {
    await new Promise((resolve, reject) => {
      servers.http.listen(httpPort, error => {
        if (error) {
          reject(error);
        } else {
          console.log(`🌐 HTTP server listening on port ${httpPort}`);
          if (servers.https) {
            console.log('   (HTTP requests will be redirected to HTTPS)');
          }
          resolve();
        }
      });
    });
  }

  // Start HTTPS server
  if (servers.https) {
    await new Promise((resolve, reject) => {
      servers.https.listen(httpsPort, error => {
        if (error) {
          reject(error);
        } else {
          console.log(`🔒 HTTPS server listening on port ${httpsPort}`);
          console.log(`   GraphQL endpoint: https://localhost:${httpsPort}/graphql`);
          resolve();
        }
      });
    });
  }

  // Security status report
  console.log('\n🛡️  Security Configuration Summary:');
  console.log(`   ✓ HTTPS redirect: ${servers.http ? 'Enabled' : 'N/A'}`);
  console.log(`   ✓ HSTS headers: ${servers.https ? 'Enabled' : 'N/A'}`);
  console.log('   ✓ CSP headers: Enabled');
  console.log('   ✓ Rate limiting: Enabled');
  console.log('   ✓ Request sanitization: Enabled');
  console.log('   ✓ Security headers: Enabled');
  console.log(`   ✓ TLS 1.2+: ${servers.https ? 'Enforced' : 'N/A'}`);
  console.log(
    `   ✓ Certificate monitoring: ${process.env.NODE_ENV === 'production' ? 'Active' : 'Disabled (dev)'}`
  );

  return {
    http: servers.http,
    https: servers.https,
    ports: {
      http: httpPort,
      https: httpsPort,
    },
  };
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = async (servers, signal = 'SIGTERM') => {
  console.log(`\n🔄 Received ${signal}, performing graceful shutdown...`);

  const shutdownPromises = [];

  // Close HTTP server
  if (servers.http) {
    shutdownPromises.push(
      new Promise(resolve => {
        servers.http.close(() => {
          console.log('✅ HTTP server closed');
          resolve();
        });
      })
    );
  }

  // Close HTTPS server
  if (servers.https) {
    shutdownPromises.push(
      new Promise(resolve => {
        servers.https.close(() => {
          console.log('✅ HTTPS server closed');
          resolve();
        });
      })
    );
  }

  // Wait for all servers to close
  await Promise.all(shutdownPromises);

  console.log('✅ Graceful shutdown completed');
  process.exit(0);
};

/**
 * Environment-specific server configuration
 */
export const getServerConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  const configs = {
    development: {
      httpPort: 4000,
      httpsPort: 4443,
      enableGraphQL: true,
      logLevel: 'debug',
      trustProxy: false,
    },
    production: {
      httpPort: process.env.PORT || 80,
      httpsPort: process.env.HTTPS_PORT || 443,
      enableGraphQL: true,
      logLevel: 'error',
      trustProxy: true,
    },
    test: {
      httpPort: 0, // Use random available port
      httpsPort: 0, // Use random available port
      enableGraphQL: false, // Disable for faster tests
      logLevel: 'silent',
      trustProxy: false,
    },
  };

  return configs[env] || configs.development;
};

/**
 * Health check endpoint for load balancers
 */
export const setupHealthChecks = app => {
  // Basic health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Detailed health check with security info
  app.get('/health/detailed', (req, res) => {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      security: {
        https: isSecure,
        hsts: !!res.getHeader('Strict-Transport-Security'),
        csp: !!res.getHeader('Content-Security-Policy'),
      },
      memory: process.memoryUsage(),
    });
  });

  // Readiness check for Kubernetes
  app.get('/ready', (req, res) => {
    // Add checks for database connectivity, etc.
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  console.log('✅ Health check endpoints configured');
};

export default {
  createSecureApp,
  createServers,
  startSecureServers,
  gracefulShutdown,
  getServerConfig,
  setupHealthChecks,
};
