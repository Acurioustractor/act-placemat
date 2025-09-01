/**
 * Test script for Notion integration
 * 
 * This script tests the NotionMCP and PlacematNotionIntegration classes.
 */

require('dotenv').config();
const { NotionMCP, PlacematNotionIntegration, logger } = require('./index');

async function testNotionIntegration() {
  try {
    logger.info('Testing Notion integration...');
    
    // Create NotionMCP instance
    const notionMCP = new NotionMCP();
    logger.info('NotionMCP instance created');
    
    // Create PlacematNotionIntegration instance
    const integration = new PlacematNotionIntegration();
    logger.info('PlacematNotionIntegration instance created');
    
    // Test projects
    logger.info('Fetching projects...');
    const projects = await integration.getProjects();
    logger.info(`Retrieved ${projects.length} projects`);
    
    // Test opportunities
    logger.info('Fetching opportunities...');
    const opportunities = await integration.getOpportunities();
    logger.info(`Retrieved ${opportunities.length} opportunities`);
    
    // Test organizations
    logger.info('Fetching organizations...');
    const organizations = await integration.getOrganizations();
    logger.info(`Retrieved ${organizations.length} organizations`);
    
    // Test cache
    logger.info('Testing cache...');
    const cachedProjects = await integration.getProjects();
    logger.info(`Retrieved ${cachedProjects.length} projects from cache`);
    
    // Test refresh
    logger.info('Testing refresh...');
    const refreshedProjects = await integration.refreshProjects();
    logger.info(`Retrieved ${refreshedProjects.length} projects after refresh`);
    
    // Test cache stats
    const cacheStats = integration.getCacheStats();
    logger.info('Cache stats:', cacheStats);
    
    logger.info('All tests completed successfully!');
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testNotionIntegration();