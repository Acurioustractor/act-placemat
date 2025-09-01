#!/usr/bin/env node

/**
 * Test bidirectional sync integration
 */

import dotenv from 'dotenv';
import path from 'path';
import knowledgeGraphSyncService from './src/services/knowledgeGraphSyncService.js';
import knowledgeGraphService from './src/services/knowledgeGraphService.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function testSyncIntegration() {
  console.log('🔄 Testing Knowledge Graph Sync Integration...\n');

  try {
    // Test 1: Initialize services
    console.log('Test 1: Initializing services...');
    
    const kgInitialized = await knowledgeGraphService.initialize();
    console.log(`  Neo4j Knowledge Graph: ${kgInitialized ? 'SUCCESS' : 'FAILED'}`);
    
    const syncInitialized = await knowledgeGraphSyncService.initialize();
    console.log(`  Sync Service: ${syncInitialized ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 2: Get service status
    console.log('Test 2: Getting service status...');
    const status = knowledgeGraphSyncService.getStatus();
    console.log('  Sync Status:', JSON.stringify(status, null, 2));
    console.log('');

    // Test 3: Test user sync
    console.log('Test 3: Testing user sync from Supabase to Neo4j...');
    const userSyncResult = await knowledgeGraphSyncService.syncUsersToKnowledgeGraph({ limit: 5 });
    console.log('  User sync result:', JSON.stringify(userSyncResult, null, 2));
    console.log('');

    // Test 4: Test Neo4j query
    console.log('Test 4: Testing Neo4j query to verify sync...');
    const userQuery = 'MATCH (u:User) RETURN u.user_id, u.display_name, u.interests LIMIT 5';
    const queryResult = await knowledgeGraphService.executeRead(userQuery);
    
    if (queryResult.success) {
      console.log('  Neo4j users found:', queryResult.records?.length || 0);
      queryResult.records?.forEach((record, i) => {
        console.log(`    User ${i + 1}:`, {
          user_id: record.user_id,
          display_name: record.display_name,
          interests: record.interests
        });
      });
    } else {
      console.log('  Neo4j query failed:', queryResult.error);
    }
    console.log('');

    // Test 5: Test knowledge graph health
    console.log('Test 5: Testing knowledge graph health...');
    const health = await knowledgeGraphService.checkHealth();
    console.log('  Health result:', JSON.stringify(health, null, 2));
    console.log('');

    console.log('🎉 Bidirectional sync integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close connections
    await knowledgeGraphService.close();
    await knowledgeGraphSyncService.close();
    process.exit(0);
  }
}

// Run the test
testSyncIntegration();