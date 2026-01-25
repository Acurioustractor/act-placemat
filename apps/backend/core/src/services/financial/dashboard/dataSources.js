/**
 * Data Sources Configuration
 * Defines data source connections for dashboard metrics
 */

/**
 * Initialize data source configurations
 * @returns {Object} Data source configurations
 */
export function initializeDataSources() {
  return {
    financial: {
      accounting_software: {
        connection: 'quickbooks_api',
        metrics: ['revenue', 'expenses', 'cash_flow', 'accounts_receivable', 'accounts_payable'],
        update_frequency: 'real_time'
      },

      banking: {
        connection: 'open_banking_api',
        metrics: ['account_balances', 'transaction_history', 'cash_position'],
        update_frequency: 'hourly'
      }
    },

    operational: {
      project_management: {
        connection: 'project_tracking_api',
        metrics: ['project_progress', 'resource_allocation', 'milestone_completion'],
        update_frequency: 'real_time'
      },

      crm: {
        connection: 'customer_relationship_api',
        metrics: ['client_engagement', 'sales_pipeline', 'customer_satisfaction'],
        update_frequency: 'daily'
      }
    },

    external: {
      government_apis: {
        connection: 'grants_gov_api',
        metrics: ['available_grants', 'application_deadlines', 'program_updates'],
        update_frequency: 'daily'
      },

      market_data: {
        connection: 'market_intelligence_api',
        metrics: ['industry_trends', 'competitor_analysis', 'market_opportunities'],
        update_frequency: 'weekly'
      }
    }
  };
}

/**
 * Data source categories
 */
export const DATA_SOURCE_CATEGORIES = {
  FINANCIAL: 'financial',
  OPERATIONAL: 'operational',
  EXTERNAL: 'external'
};

/**
 * Supported data source connections
 */
export const SUPPORTED_CONNECTIONS = {
  QUICKBOOKS: 'quickbooks_api',
  XERO: 'xero_api',
  OPEN_BANKING: 'open_banking_api',
  PROJECT_TRACKING: 'project_tracking_api',
  CRM: 'customer_relationship_api',
  GRANTS_GOV: 'grants_gov_api',
  MARKET_INTELLIGENCE: 'market_intelligence_api'
};

/**
 * Get data source by connection name
 * @param {string} connection - Connection name
 * @returns {Object|null} Data source config or null
 */
export function getDataSourceByConnection(connection) {
  const sources = initializeDataSources();

  for (const category of Object.values(sources)) {
    for (const [name, config] of Object.entries(category)) {
      if (config.connection === connection) {
        return { name, category: Object.keys(sources).find(c => sources[c] === category), ...config };
      }
    }
  }

  return null;
}

/**
 * Check data source health
 * @param {string} connection - Connection name
 * @returns {Promise<Object>} Health status
 */
export async function checkDataSourceHealth(connection) {
  // Placeholder - would implement actual health checks
  return {
    connection,
    status: 'unknown',
    lastChecked: new Date().toISOString(),
    latency: null,
    error: null
  };
}

export default {
  initializeDataSources,
  DATA_SOURCE_CATEGORIES,
  SUPPORTED_CONNECTIONS,
  getDataSourceByConnection,
  checkDataSourceHealth
};
