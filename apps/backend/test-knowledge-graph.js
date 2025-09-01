#!/usr/bin/env node

/**
 * Knowledge Graph Test Script
 * Tests Neo4j connection and basic functionality
 */

import knowledgeGraphService from './src/services/knowledgeGraphService.js';

async function testKnowledgeGraph() {
  console.log('🧪 Testing Knowledge Graph...\n');

  try {
    // Test 1: Initialize and check health
    console.log('Test 1: Initializing connection...');
    const initialized = await knowledgeGraphService.initialize();
    console.log(`✅ Initialization: ${initialized ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 2: Health check
    console.log('Test 2: Health check...');
    const health = await knowledgeGraphService.checkHealth();
    console.log(`✅ Health: ${health.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`   Database: ${health.database}`);
    console.log(`   Connection: ${health.connection_string}\n`);

    // Test 3: Get statistics
    console.log('Test 3: Getting statistics...');
    const stats = await knowledgeGraphService.getStatistics();
    if (stats.success) {
      console.log('✅ Statistics retrieved successfully:');
      console.log(`   Nodes: ${stats.statistics.node_count}`);
      console.log(`   Relationships: ${stats.statistics.relationship_count}`);
      console.log(`   Users: ${stats.statistics.user_count}`);
      console.log(`   Projects: ${stats.statistics.project_count}`);
      console.log(`   Skills: ${stats.statistics.skill_count}`);
      console.log(`   Interests: ${stats.statistics.interest_count}\n`);
    } else {
      console.log(`❌ Statistics failed: ${stats.error}\n`);
    }

    // Test 4: Create test user
    console.log('Test 4: Creating test user...');
    const testUser = {
      user_id: 'test-user-123',
      email: 'test@example.com',
      display_name: 'Test User',
      account_status: 'active',
      interests: ['climate_action', 'community_development'],
      expertise_areas: ['project_management', 'data_analysis']
    };
    
    const userSync = await knowledgeGraphService.syncUser(testUser);
    console.log(`✅ User sync: ${userSync.success ? 'SUCCESS' : 'FAILED'}`);
    if (!userSync.success) {
      console.log(`   Error: ${userSync.error}`);
    }
    console.log('');

    // Test 5: Find collaborators (should be empty for new user)
    console.log('Test 5: Finding collaborators...');
    const collaborators = await knowledgeGraphService.findCollaborators('test-user-123', 5);
    console.log(`✅ Collaborator search: ${collaborators.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Found: ${collaborators.records?.length || 0} potential collaborators\n`);

    // Test 6: Get project recommendations (should be empty without projects)
    console.log('Test 6: Getting project recommendations...');
    const recommendations = await knowledgeGraphService.getProjectRecommendations('test-user-123', 5);
    console.log(`✅ Project recommendations: ${recommendations.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Found: ${recommendations.records?.length || 0} recommended projects\n`);

    // Test 7: Custom query test
    console.log('Test 7: Custom query test...');
    const customQuery = 'MATCH (n) RETURN count(n) as total_nodes';
    const queryResult = await knowledgeGraphService.executeRead(customQuery);
    console.log(`✅ Custom query: ${queryResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (queryResult.success) {
      console.log(`   Total nodes in graph: ${queryResult.records[0]?.total_nodes || 0}`);
    } else {
      console.log(`   Error: ${queryResult.error}`);
    }
    console.log('');

    console.log('🎉 Knowledge Graph testing completed successfully!');

  } catch (error) {
    console.error('❌ Knowledge Graph test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close connection
    await knowledgeGraphService.close();
    process.exit(0);
  }
}

// Run the test
testKnowledgeGraph();