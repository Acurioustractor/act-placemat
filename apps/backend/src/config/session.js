/**
 * Express session configuration with Redis store
 * Integrates with existing authentication system
 */
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { authConfig } from './auth.js';

/**
 * Create Redis client for session store
 */
const createRedisSessionClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';

  const client = createClient({
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      reconnectStrategy: retries => {
        if (retries > 10) {
          return false; // Stop reconnecting after 10 attempts
        }
        return Math.min(retries * 50, 1000); // Exponential backoff, max 1 second
      },
      connectTimeout: 5000,
      lazyConnect: true,
    },
    retry_unfulfilled_commands: true,
    enable_offline_queue: false,
  });

  client.on('error', err => {
    console.error('❌ Redis session client error:', err.message);
  });

  client.on('connect', () => {
    console.log('🔗 Redis session store connected');
  });

  client.on('ready', () => {
    console.log('✅ Redis session store ready');
  });

  client.on('end', () => {
    console.log('⚠️ Redis session store disconnected');
  });

  return client;
};

/**
 * Session configuration
 */
export const getSessionConfig = () => {
  const sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'fallback-session-secret-change-in-production';
  const isProduction = process.env.NODE_ENV === 'production';
  const redisEnabled = !!(process.env.REDIS_URL || process.env.REDIS_PASSWORD);

  let store = undefined;
  let redisClient = null;

  // Configure Redis store if available
  if (redisEnabled) {
    try {
      redisClient = createRedisSessionClient();
      store = new RedisStore({
        client: redisClient,
        prefix: 'session:',
        ttl: 24 * 60 * 60, // 24 hours in seconds
        disableTouch: false,
        disableTTL: false,
      });

      console.log('🚀 Session store configured with Redis');
    } catch (error) {
      console.warn(
        '⚠️ Redis session store failed, falling back to memory store:',
        error.message
      );
      store = undefined; // Fall back to default memory store
    }
  }

  const sessionConfig = {
    name: 'act.session',
    secret: sessionSecret,
    store: store,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on activity
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: authConfig.security.sessionTimeout, // 24 hours
      sameSite: isProduction ? 'none' : 'lax', // Cross-site compatibility
    },

    // Security options
    proxy: isProduction, // Trust proxy headers in production

    // Custom session store error handling
    ...(store && {
      genid: () => {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      },
    }),
  };

  return { sessionConfig, redisClient };
};

/**
 * Initialize session middleware
 * Returns configured session middleware and Redis client
 */
export const initializeSession = () => {
  const { sessionConfig, redisClient } = getSessionConfig();

  const sessionMiddleware = session(sessionConfig);

  // Handle Redis connection asynchronously if available
  if (redisClient) {
    redisClient.connect().catch(error => {
      console.warn('⚠️ Redis session client connection failed:', error.message);
    });
  }

  return { sessionMiddleware, redisClient };
};

/**
 * Session health check
 */
export const getSessionHealth = () => {
  const redisEnabled = !!(process.env.REDIS_URL || process.env.REDIS_PASSWORD);
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;

  return {
    session_configured: !!sessionSecret,
    redis_enabled: redisEnabled,
    redis_url_configured: !!process.env.REDIS_URL,
    session_security: {
      secure_cookies: process.env.NODE_ENV === 'production',
      http_only: true,
      same_site: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      max_age_hours: authConfig.security.sessionTimeout / (60 * 60 * 1000),
    },
  };
};

/**
 * Cleanup session store on server shutdown
 */
export const cleanupSession = redisClient => {
  if (redisClient) {
    redisClient.disconnect();
    console.log('🧹 Session store cleanup completed');
  }
};

export default {
  initializeSession,
  getSessionHealth,
  cleanupSession,
};
