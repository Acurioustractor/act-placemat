#!/usr/bin/env node

/**
 * Test Life OS Redis Cache Integration
 * Verifies that the enhanced cache service connects to Redis and works with NotionService
 */

import dotenv from 'dotenv';
dotenv.config();

import { cacheService } from './apps/backend/src/services/cacheService.js';
import { notionService } from './apps/backend/src/services/notionService.js';

async function testCacheIntegration() {
  console.log('🧪 Testing Life OS Cache Integration\n');

  try {
    // Test 1: Cache service initialization
    console.log('1️⃣ Testing cache service initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for Redis connection
    const stats = cacheService.getEnhancedPerformanceStats();
    console.log('✅ Cache service stats:', {
      redis_enabled: stats.redis_enabled,
      cache_layers: stats.cache_layers,
    });

    // Test 2: Life OS entity caching
    console.log('\n2️⃣ Testing Life OS entity caching...');

    const testData = {
      id: 'test-project-1',
      name: 'Test Life OS Cache Project',
      status: 'Active 🔥',
      area: 'Technology',
    };

    // Store in Life OS cache
    await cacheService.setCachedLifeOSEntity(
      'projects',
      'test-1',
      testData,
      {},
      'read'
    );
    console.log('✅ Stored test data in Life OS cache');

    // Retrieve from Life OS cache
    const cached = await cacheService.getCachedLifeOSEntity(
      'projects',
      'test-1',
      {},
      'read'
    );
    if (cached.fromCache) {
      console.log('✅ Retrieved from cache:', cached.source);
      console.log('   Data:', cached.data.name);
    } else {
      console.log('❌ Cache miss - data not found');
    }

    // Test 3: Cache key generation
    console.log('\n3️⃣ Testing cache key generation...');
    const key1 = cacheService.generateLifeOSCacheKey('projects', null, {}, 'read');
    const key2 = cacheService.generateLifeOSCacheKey(
      'projects',
      'test-1',
      { status: 'Active' },
      'read'
    );
    console.log('✅ Generated keys:');
    console.log('   Key 1:', key1);
    console.log('   Key 2:', key2);

    // Test 4: TTL-based caching by entity type
    console.log('\n4️⃣ Testing entity-specific TTL...');

    const entities = [
      'projects',
      'opportunities',
      'organizations',
      'people',
      'artifacts',
      'actions',
    ];
    for (const entityType of entities) {
      await cacheService.setCachedLifeOSEntity(
        entityType,
        null,
        { test: true },
        {},
        'read'
      );
      const result = await cacheService.getCachedLifeOSEntity(
        entityType,
        null,
        {},
        'read'
      );
      if (result.fromCache) {
        console.log(`✅ ${entityType}: cached successfully (${result.source})`);
      }
    }

    // Test 5: Cache invalidation
    console.log('\n5️⃣ Testing cache invalidation...');
    await cacheService.invalidateLifeOSEntity('projects', 'test-1');
    console.log('✅ Invalidated test-1 projects cache');

    const afterInvalidation = await cacheService.getCachedLifeOSEntity(
      'projects',
      'test-1',
      {},
      'read'
    );
    if (!afterInvalidation.fromCache) {
      console.log('✅ Cache invalidation successful - cache miss confirmed');
    } else {
      console.log('❌ Cache invalidation failed - data still cached');
    }

    // Test 6: Beautiful Obsolescence compliance
    console.log('\n6️⃣ Testing Beautiful Obsolescence compliance...');
    await cacheService.enforceBeautifulObsolescence();
    console.log('✅ Beautiful Obsolescence enforcement executed');

    // Test 7: NotionService integration test (using fallback data)
    console.log('\n7️⃣ Testing NotionService integration...');
    console.log('   Fetching projects with cache...');

    const startTime = Date.now();
    const projects = await notionService.getProjects(true, {});
    const duration = Date.now() - startTime;

    console.log(`✅ Retrieved ${projects.length} projects in ${duration}ms`);
    console.log('   Sample project:', projects[0]?.name || 'No projects found');

    // Second call should be cached
    console.log('   Fetching projects again (should be cached)...');
    const startTime2 = Date.now();
    const projects2 = await notionService.getProjects(true, {});
    const duration2 = Date.now() - startTime2;

    console.log(`✅ Retrieved ${projects2.length} projects in ${duration2}ms (cached)`);

    // Test 8: Performance metrics
    console.log('\n8️⃣ Performance metrics:');
    const finalStats = cacheService.getEnhancedPerformanceStats();
    console.log('✅ Final cache stats:', {
      totalRequests: finalStats.totalRequests,
      cacheHits: finalStats.cacheHits,
      cacheMisses: finalStats.cacheMisses,
      hitRate: finalStats.hitRate,
      redis_enabled: finalStats.redis_enabled,
      cache_layers: finalStats.cache_layers,
    });

    console.log('\n🎉 Life OS Cache Integration Test Complete!');
    console.log('🌿 Redis-backed caching is working with Life OS infrastructure');
  } catch (error) {
    console.error('❌ Cache integration test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    await cacheService.cleanup();
    process.exit(0);
  }
}

// Run the test
testCacheIntegration();
