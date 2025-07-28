/**
 * ACT Placemat Configuration Utility
 * 
 * This module provides centralized access to environment variables and configuration
 * with validation, default values, and helpful error messages.
 */

// Load environment variables from .env file
require('dotenv').config();

/**
 * Configuration object with validated environment variables
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3004, // Main backend on port 3004
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  
  // Notion API configuration
  notion: {
    token: process.env.NOTION_TOKEN,
    apiVersion: process.env.NOTION_API_VERSION || '2022-06-28',
    databases: {
      projects: process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID,
      opportunities: process.env.NOTION_OPPORTUNITIES_DB,
      organizations: process.env.NOTION_ORGANIZATIONS_DB,
      people: process.env.NOTION_PEOPLE_DB,
      artifacts: process.env.NOTION_ARTIFACTS_DB || process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID,
    },
    isConfigured: Boolean(process.env.NOTION_TOKEN && 
      (process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID)),
  },
  
  // Application settings
  app: {
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300000', 10), // 5 minutes in milliseconds
    autoRefreshInterval: parseInt(process.env.AUTO_REFRESH_INTERVAL || '300000', 10), // 5 minutes
    maxRetries: parseInt(process.env.MAX_API_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10), // 1 second
  }
};

/**
 * Validates the configuration and logs warnings for missing required values
 * @returns {boolean} True if the configuration is valid, false otherwise
 */
function validateConfig() {
  let isValid = true;
  const warnings = [];
  
  // Check for required Notion configuration
  if (!config.notion.token) {
    warnings.push('❌ NOTION_TOKEN is not configured. API requests will fail.');
    isValid = false;
  }
  
  if (!config.notion.databases.projects) {
    warnings.push('❌ NOTION_DATABASE_ID or NOTION_PROJECTS_DB is not configured. Project data will not be available.');
    isValid = false;
  }
  
  // Log warnings for missing optional databases
  if (!config.notion.databases.opportunities) {
    warnings.push('⚠️ NOTION_OPPORTUNITIES_DB is not configured. Opportunity data will not be available.');
  }
  
  if (!config.notion.databases.organizations) {
    warnings.push('⚠️ NOTION_ORGANIZATIONS_DB is not configured. Organization data will not be available.');
  }
  
  if (!config.notion.databases.people) {
    warnings.push('⚠️ NOTION_PEOPLE_DB is not configured. People data will not be available.');
  }
  
  if (!config.notion.databases.artifacts) {
    warnings.push('⚠️ NOTION_ARTIFACTS_DB is not configured. Artifact data will not be available.');
  }
  
  // Log all warnings
  if (warnings.length > 0) {
    console.log('\n=== Configuration Warnings ===');
    warnings.forEach(warning => console.log(warning));
    console.log('===============================\n');
    
    if (!isValid) {
      console.log('⚠️ Some required configuration is missing. Check .env.example for setup instructions.');
    }
  }
  
  return isValid;
}

// Export the configuration object and validation function
module.exports = {
  config,
  validateConfig,
  
  // Helper method to get a database ID with validation
  getDatabaseId: (type) => {
    const dbId = config.notion.databases[type];
    if (!dbId) {
      console.warn(`Database ID for "${type}" is not configured.`);
    }
    return dbId;
  },
  
  // Helper to check if a specific database is configured
  isDatabaseConfigured: (type) => {
    return Boolean(config.notion.databases[type]);
  }
};