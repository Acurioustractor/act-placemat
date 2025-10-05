/**
 * Deployment Configuration for Life Orchestrator
 * Production deployment settings and environment configuration
 * 
 * This file contains deployment configurations for various environments:
 * - Development
 * - Staging
 * - Production
 * 
 * Usage: NODE_ENV=production node server.js
 */

const path = require('path');

const baseConfig = {
  // Application settings
  app: {
    name: 'ACT Placemat - Life Orchestrator',
    version: '1.0.0',
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0'
  },

  // Security settings
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      optionsSuccessStatus: 200
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.groq.com', 'https://api.perplexity.ai']
        }
      }
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Limit each IP to 100 requests per windowMs
    }
  },

  // Database settings
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./data/life_orchestrator.db',
    options: {
      logging: process.env.NODE_ENV !== 'production',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },

  // Cache settings
  cache: {
    redis: {
      url: process.env.REDIS_URL || null,
      defaultTTL: 300 // 5 minutes
    },
    memory: {
      max: 100,
      ttl: 1000 * 60 * 10 // 10 minutes
    }
  },

  // External API configurations
  apis: {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      timeout: 30000,
      maxRetries: 3
    },
    google: {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send'
      ]
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      scopes: [
        'channels:history',
        'channels:read',
        'chat:write',
        'im:history',
        'im:read',
        'users:read'
      ]
    },
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: true,
      path: path.join(__dirname, 'logs'),
      maxSize: '20m',
      maxFiles: '14d'
    },
    console: {
      enabled: true,
      colorize: process.env.NODE_ENV !== 'production'
    }
  },

  // File storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' | 'aws' | 'gcp'
    local: {
      path: path.join(__dirname, 'uploads')
    },
    aws: {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },

  // Monitoring and metrics
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    healthCheck: {
      endpoint: '/health',
      timeout: 5000
    },
    metrics: {
      enabled: true,
      endpoint: '/metrics'
    }
  }
};

// Environment-specific configurations
const environments = {
  development: {
    ...baseConfig,
    app: {
      ...baseConfig.app,
      port: 3001
    },
    security: {
      ...baseConfig.security,
      cors: {
        ...baseConfig.security.cors,
        origin: ['http://localhost:3000', 'http://localhost:3001']
      }
    },
    logging: {
      ...baseConfig.logging,
      level: 'debug'
    }
  },

  staging: {
    ...baseConfig,
    app: {
      ...baseConfig.app,
      port: process.env.PORT || 3001
    },
    security: {
      ...baseConfig.security,
      cors: {
        ...baseConfig.security.cors,
        origin: process.env.STAGING_FRONTEND_URL || 'https://staging-act-placemat.com'
      }
    },
    database: {
      ...baseConfig.database,
      url: process.env.STAGING_DATABASE_URL
    },
    logging: {
      ...baseConfig.logging,
      level: 'info'
    }
  },

  production: {
    ...baseConfig,
    app: {
      ...baseConfig.app,
      port: process.env.PORT || 8080
    },
    security: {
      ...baseConfig.security,
      cors: {
        ...baseConfig.security.cors,
        origin: process.env.PRODUCTION_FRONTEND_URL || 'https://act-placemat.com'
      },
      helmet: {
        ...baseConfig.security.helmet,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      }
    },
    database: {
      ...baseConfig.database,
      url: process.env.DATABASE_URL,
      options: {
        ...baseConfig.database.options,
        logging: false,
        pool: {
          max: 20,
          min: 5,
          acquire: 30000,
          idle: 10000
        }
      }
    },
    logging: {
      ...baseConfig.logging,
      level: 'warn',
      console: {
        enabled: false,
        colorize: false
      }
    },
    monitoring: {
      ...baseConfig.monitoring,
      enabled: true
    }
  }
};

// Get current environment configuration
const env = process.env.NODE_ENV || 'development';
const config = environments[env];

if (!config) {
  throw new Error(`Unknown environment: ${env}`);
}

// Validate required environment variables for production
if (env === 'production') {
  const required = [
    'DATABASE_URL',
    'GROQ_API_KEY',
    'GOOGLE_CALENDAR_CLIENT_ID',
    'GOOGLE_CALENDAR_CLIENT_SECRET',
    'PRODUCTION_FRONTEND_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
  }
}

module.exports = config;

// Export environment-specific configs for testing
module.exports.environments = environments;