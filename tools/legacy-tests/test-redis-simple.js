#!/usr/bin/env node

// Simple Redis test to debug the connection issue
import dotenv from 'dotenv';
dotenv.config();

console.log('Environment check (after dotenv):');
console.log('LIFEOS_REDIS_PORT:', process.env.LIFEOS_REDIS_PORT);
console.log('LIFEOS_REDIS_PASSWORD:', process.env.LIFEOS_REDIS_PASSWORD);

// Test the condition that should trigger Redis
const shouldEnableRedis =
  process.env.REDIS_URL ||
  process.env.REDIS_HOST ||
  process.env.LIFEOS_REDIS_PORT ||
  process.env.LIFEOS_REDIS_PASSWORD;

console.log('Should enable Redis:', shouldEnableRedis);

// Test importing the cache service
console.log('Importing cache service...');
import { cacheService } from './apps/backend/src/services/cacheService.js';

setTimeout(async () => {
  const stats = cacheService.getEnhancedPerformanceStats();
  console.log('Cache service initialized:', {
    redis_enabled: stats.redis_enabled,
    cache_layers: stats.cache_layers,
  });

  process.exit(0);
}, 3000);
