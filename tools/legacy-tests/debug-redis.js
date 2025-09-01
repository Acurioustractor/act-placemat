#!/usr/bin/env node

import Redis from 'redis';

async function testRedis() {
  console.log('🔧 Debug Redis Connection');

  console.log('Environment variables:');
  console.log('LIFEOS_REDIS_PORT:', process.env.LIFEOS_REDIS_PORT);
  console.log('LIFEOS_REDIS_PASSWORD:', process.env.LIFEOS_REDIS_PASSWORD);
  console.log('LIFEOS_REDIS_HOST:', process.env.LIFEOS_REDIS_HOST);

  const config = {
    host: process.env.LIFEOS_REDIS_HOST || 'localhost',
    port: process.env.LIFEOS_REDIS_PORT || 6380,
    password: process.env.LIFEOS_REDIS_PASSWORD || 'redis_secure_password_2024',
  };

  console.log('Redis config:', config);

  try {
    const redis = Redis.createClient(config);

    redis.on('error', err => {
      console.error('❌ Redis error:', err.message);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redis.connect();

    // Test a simple operation
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ Test operation successful:', value);

    await redis.quit();
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  }
}

testRedis();
