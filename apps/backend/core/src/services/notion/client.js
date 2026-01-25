/**
 * Notion Client Module
 * Handles Notion client initialization, connection testing, and webhook integration
 */

import { Client } from '@notionhq/client';
import enhancedIntegrationService from '../enhancedIntegrationService.js';

/**
 * Initialize Notion client synchronously (for immediate use in constructor)
 * @param {Object} config - Configuration object
 * @returns {Object} Notion client and OAuth status
 */
export function initializeClientSync(config = {}) {
  const notion = null;
  let isOAuthAuthenticated = false;

  try {
    // Try OAuth token first
    const oauthToken = process.env.NOTION_OAUTH_TOKEN;
    const regularToken = process.env.NOTION_TOKEN;

    if (oauthToken) {
      const client = new Client({
        auth: oauthToken,
        timeoutMs: 60000,
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
      });
      isOAuthAuthenticated = true;
      console.log('✅ Notion OAuth client initialized (SDK v2)');
      return { notion: client, isOAuthAuthenticated };
    } else if (regularToken) {
      const client = new Client({
        auth: regularToken,
        timeoutMs: 60000,
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
      });
      console.log('✅ Notion regular token client initialized (SDK v2)');
      return { notion: client, isOAuthAuthenticated };
    } else {
      console.warn('⚠️ No Notion authentication token found');
      return { notion: null, isOAuthAuthenticated: false };
    }
  } catch (error) {
    console.error('❌ Failed to initialize Notion client:', error.message);
    return { notion: null, isOAuthAuthenticated: false };
  }
}

/**
 * Test Notion connection
 * @param {Object} notion - Notion client instance
 * @returns {Promise<boolean>} Connection status
 */
export async function testConnection(notion) {
  if (!notion) return false;

  try {
    const user = await notion.users.me();
    console.log('✅ Notion connection test successful, user:', user.name);
    return true;
  } catch (error) {
    console.error('❌ Notion connection test failed:', error.message);
    return false;
  }
}

/**
 * Setup webhook integration for real-time updates
 * @param {Object} options - Configuration options
 * @param {Function} handler - Event handler function
 */
export function setupWebhookIntegration({ onWebhook } = {}) {
  try {
    if (onWebhook) {
      enhancedIntegrationService.addEventListener('notion_webhook', event => {
        onWebhook(event);
      });
    }
    console.log('🔗 Notion webhook integration setup complete');
  } catch (error) {
    console.warn('⚠️ Failed to setup webhook integration:', error.message);
  }
}

/**
 * Handle webhook events from Notion
 * @param {Object} event - Webhook event data
 * @param {Object} dependencies - Required dependencies
 * @returns {Object} Handle result
 */
export async function handleWebhookEvent(event, dependencies = {}) {
  try {
    const { data } = event;
    const { databaseConfigs, clearCache, getDatabaseTypeById, updateDatabaseTimestamp } = dependencies;

    // Clear relevant caches - handle both database_id events or fall back to global clear
    const relevantId = data.data_source_id || data.database_id;
    if (relevantId) {
      let dbType;
      if (data.database_id && getDatabaseTypeById) {
        dbType = getDatabaseTypeById(data.database_id);
      }

      if (dbType && clearCache) {
        clearCache(dbType);
        console.log(`🔄 Cleared cache for ${dbType} due to webhook event`);
      } else if (data.data_source_id && clearCache) {
        // Fallback: we do not currently map data_source_ids, so clear everything
        clearCache();
        console.log('🔄 Cleared all Notion caches due to webhook event (no database_id provided)');
      }
    }

    // Update last modified timestamps (maintain backward compatibility)
    if (data.database_id && updateDatabaseTimestamp) {
      updateDatabaseTimestamp(data.database_id);
    }

    return { success: true };
  } catch (error) {
    console.warn('⚠️ Error handling webhook event:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get database type by ID
 * @param {string} databaseId - Database ID to look up
 * @param {Object} databaseConfigs - Database configurations
 * @returns {string|null} Database type or null if not found
 */
export function getDatabaseTypeById(databaseId, databaseConfigs = {}) {
  for (const [type, config] of Object.entries(databaseConfigs)) {
    if (config.id === databaseId) {
      return type;
    }
  }
  return null;
}

/**
 * Update database timestamp
 * @param {string} databaseId - Database ID to update
 * @param {Object} dependencies - Required dependencies
 */
export function updateDatabaseTimestamp(databaseId, dependencies = {}) {
  const { databaseConfigs, getDatabaseTypeById } = dependencies;
  const dbType = getDatabaseTypeById ? getDatabaseTypeById(databaseId, databaseConfigs) : null;
  if (dbType && databaseConfigs?.[dbType]) {
    databaseConfigs[dbType].lastUpdated = new Date().toISOString();
  }
}

export default {
  initializeClientSync,
  testConnection,
  setupWebhookIntegration,
  handleWebhookEvent,
  getDatabaseTypeById,
  updateDatabaseTimestamp,
};
