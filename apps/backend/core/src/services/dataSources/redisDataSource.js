/**
 * Redis Data Source Service
 * Handles caching, session storage, and real-time data operations
 */

import Redis from 'ioredis';

class RedisDataSource {
  constructor() {
    this.redis = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      if (!process.env.REDIS_URL) {
        throw new Error('Redis configuration missing');
      }

      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      this.redis.on('error', error => {
        console.error('Redis Client Error:', error);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
      });

      this.redis.on('disconnect', () => {
        console.warn('Redis disconnected');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
      return this.redis;
    } catch (error) {
      console.error('Redis initialization failed:', error);
      throw error;
    }
  }

  getClient() {
    return this.redis;
  }

  async set(key, value, ttl = null) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async get(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const value = await this.redis.get(key);

      if (value === null) {
        return null;
      }

      // Try to parse JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.error('Redis get error:', error);
      throw error;
    }
  }

  async del(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      throw error;
    }
  }

  async exists(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.exists(key);
    } catch (error) {
      console.error('Redis exists error:', error);
      throw error;
    }
  }

  async expire(key, seconds) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.expire(key, seconds);
    } catch (error) {
      console.error('Redis expire error:', error);
      throw error;
    }
  }

  async keys(pattern) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error);
      throw error;
    }
  }

  // Hash operations for structured data
  async hset(key, field, value) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      return await this.redis.hset(key, field, serializedValue);
    } catch (error) {
      console.error('Redis hset error:', error);
      throw error;
    }
  }

  async hget(key, field) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const value = await this.redis.hget(key, field);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.error('Redis hget error:', error);
      throw error;
    }
  }

  async hgetall(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const hash = await this.redis.hgetall(key);
      const parsedHash = {};

      for (const [field, value] of Object.entries(hash)) {
        try {
          parsedHash[field] = JSON.parse(value);
        } catch (parseError) {
          parsedHash[field] = value;
        }
      }

      return parsedHash;
    } catch (error) {
      console.error('Redis hgetall error:', error);
      throw error;
    }
  }

  async hdel(key, field) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.hdel(key, field);
    } catch (error) {
      console.error('Redis hdel error:', error);
      throw error;
    }
  }

  // List operations for queues and activity streams
  async lpush(key, ...values) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serializedValues = values.map(value =>
        typeof value === 'string' ? value : JSON.stringify(value)
      );
      return await this.redis.lpush(key, ...serializedValues);
    } catch (error) {
      console.error('Redis lpush error:', error);
      throw error;
    }
  }

  async rpop(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const value = await this.redis.rpop(key);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.error('Redis rpop error:', error);
      throw error;
    }
  }

  async lrange(key, start, stop) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const values = await this.redis.lrange(key, start, stop);
      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch (parseError) {
          return value;
        }
      });
    } catch (error) {
      console.error('Redis lrange error:', error);
      throw error;
    }
  }

  // Set operations for unique collections
  async sadd(key, ...members) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serializedMembers = members.map(member =>
        typeof member === 'string' ? member : JSON.stringify(member)
      );
      return await this.redis.sadd(key, ...serializedMembers);
    } catch (error) {
      console.error('Redis sadd error:', error);
      throw error;
    }
  }

  async smembers(key) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const members = await this.redis.smembers(key);
      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch (parseError) {
          return member;
        }
      });
    } catch (error) {
      console.error('Redis smembers error:', error);
      throw error;
    }
  }

  async sismember(key, member) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serializedMember =
        typeof member === 'string' ? member : JSON.stringify(member);
      return await this.redis.sismember(key, serializedMember);
    } catch (error) {
      console.error('Redis sismember error:', error);
      throw error;
    }
  }

  // ACT-specific caching methods

  async cacheQueryResult(query, result, ttl = 300) {
    const key = `query:${Buffer.from(query).toString('base64')}`;
    return this.set(key, result, ttl);
  }

  async getCachedQueryResult(query) {
    const key = `query:${Buffer.from(query).toString('base64')}`;
    return this.get(key);
  }

  async cacheUserSession(userId, sessionData, ttl = 3600) {
    const key = `session:${userId}`;
    return this.set(key, sessionData, ttl);
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return this.get(key);
  }

  async clearUserSession(userId) {
    const key = `session:${userId}`;
    return this.del(key);
  }

  async cacheOrganisationData(orgId, data, ttl = 600) {
    const key = `org:${orgId}`;
    return this.set(key, data, ttl);
  }

  async getOrganisationData(orgId) {
    const key = `org:${orgId}`;
    return this.get(key);
  }

  async trackUserActivity(userId, activity) {
    const key = `activity:${userId}`;
    const timestamp = Date.now();
    const activityWithTimestamp = { ...activity, timestamp };

    // Add to activity stream
    await this.lpush(key, activityWithTimestamp);

    // Keep only last 100 activities
    await this.redis.ltrim(key, 0, 99);

    // Set expiration for 7 days
    await this.expire(key, 604800);
  }

  async getUserActivity(userId, limit = 20) {
    const key = `activity:${userId}`;
    return this.lrange(key, 0, limit - 1);
  }

  async addToNotificationQueue(userId, notification) {
    const key = `notifications:${userId}`;
    await this.lpush(key, notification);

    // Keep only last 50 notifications
    await this.redis.ltrim(key, 0, 49);

    // Set expiration for 30 days
    await this.expire(key, 2592000);
  }

  async getUserNotifications(userId, limit = 10) {
    const key = `notifications:${userId}`;
    return this.lrange(key, 0, limit - 1);
  }

  async cacheSearchResults(query, filters, results, ttl = 180) {
    const searchKey = Buffer.from(JSON.stringify({ query, filters })).toString(
      'base64'
    );
    const key = `search:${searchKey}`;
    return this.set(key, results, ttl);
  }

  async getCachedSearchResults(query, filters) {
    const searchKey = Buffer.from(JSON.stringify({ query, filters })).toString(
      'base64'
    );
    const key = `search:${searchKey}`;
    return this.get(key);
  }

  async incrementCounter(key, increment = 1) {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      console.error('Redis increment error:', error);
      throw error;
    }
  }

  async rateLimitCheck(identifier, limit, windowSeconds) {
    const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    try {
      const current = await this.incrementCounter(key);
      await this.expire(key, windowSeconds);

      return {
        allowed: current <= limit,
        count: current,
        remaining: Math.max(0, limit - current),
        resetTime:
          Math.ceil(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request if Redis is down
      return {
        allowed: true,
        count: 0,
        remaining: limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  async healthCheck() {
    try {
      await this.redis.ping();
      return {
        status: 'healthy',
        connected: this.isConnected,
        error: null,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }

  async flushCache(pattern = '*') {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      if (pattern === '*') {
        return await this.redis.flushdb();
      } else {
        const keys = await this.keys(pattern);
        if (keys.length > 0) {
          return await this.redis.del(...keys);
        }
        return 0;
      }
    } catch (error) {
      console.error('Redis flush error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }
}

export default RedisDataSource;
