/**
 * Cross-App Data Sync API
 * Real-time synchronization across all platform modules
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Global event emitter for real-time sync
const syncEmitter = new EventEmitter();
syncEmitter.setMaxListeners(100); // Support many concurrent connections

// Store active SSE connections
const sseConnections = new Map();

/**
 * GET /api/sync/events
 * Server-Sent Events endpoint for real-time data sync
 */
router.get('/events', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store connection
  sseConnections.set(connectionId, res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    id: connectionId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  console.log(`📡 SSE connection established: ${connectionId} (${sseConnections.size} active)`);

  // Listen for sync events
  const syncHandler = (event) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('Failed to send SSE event:', error);
      sseConnections.delete(connectionId);
      syncEmitter.off('sync', syncHandler);
    }
  };

  syncEmitter.on('sync', syncHandler);

  // Handle client disconnect
  req.on('close', () => {
    sseConnections.delete(connectionId);
    syncEmitter.off('sync', syncHandler);
    console.log(`📡 SSE connection closed: ${connectionId} (${sseConnections.size} active)`);
  });

  req.on('error', () => {
    sseConnections.delete(connectionId);
    syncEmitter.off('sync', syncHandler);
  });
});

/**
 * POST /api/sync/publish
 * Publish data change events for cross-app synchronization
 */
router.post('/publish', async (req, res) => {
  try {
    const { id, type, module, data, timestamp, userId } = req.body;

    if (!type || !module || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, module, data'
      });
    }

    const syncEvent = {
      id: id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      module,
      data,
      timestamp: timestamp || new Date().toISOString(),
      userId
    };

    // Store sync event in database for reliability
    const { error } = await supabase
      .from('sync_events')
      .insert([
        {
          event_id: syncEvent.id,
          event_type: syncEvent.type,
          module: syncEvent.module,
          data: syncEvent.data,
          user_id: syncEvent.userId,
          created_at: syncEvent.timestamp
        }
      ]);

    if (error) {
      console.error('Database sync error:', error);
      // Continue with in-memory sync even if database fails
    }

    // Emit to all connected clients
    syncEmitter.emit('sync', syncEvent);

    // Process cross-module correlations
    await processCorrelations(syncEvent);

    console.log(`🔄 Published sync event: ${syncEvent.type} in ${syncEvent.module} (${sseConnections.size} clients)`);

    res.json({
      success: true,
      eventId: syncEvent.id,
      timestamp: syncEvent.timestamp
    });

  } catch (error) {
    console.error('Error publishing sync event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish sync event',
      error: error.message
    });
  }
});

/**
 * GET /api/sync/correlate
 * Get correlated data across modules
 */
router.get('/correlate', async (req, res) => {
  try {
    const { module, id, with: correlateWith } = req.query;

    if (!module || !id || !correlateWith) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: module, id, with'
      });
    }

    const correlationModules = correlateWith.split(',');
    const correlatedData = {};

    // Get base entity data
    const baseData = await getEntityData(module, id);
    correlatedData[module] = baseData;

    // Get correlated data from each requested module
    for (const correlationModule of correlationModules) {
      try {
        const moduleData = await getCorrelatedDataForModule(
          module,
          id,
          baseData,
          correlationModule
        );
        correlatedData[correlationModule] = moduleData;
      } catch (error) {
        console.error(`Correlation error for ${correlationModule}:`, error);
        correlatedData[correlationModule] = { error: error.message };
      }
    }

    res.json({
      success: true,
      correlations: correlatedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting correlated data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get correlated data',
      error: error.message
    });
  }
});

/**
 * GET /api/sync/health
 * Health check for sync service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    activeConnections: sseConnections.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Process cross-module correlations when sync events occur
 */
async function processCorrelations(syncEvent) {
  try {
    switch (syncEvent.module) {
      case 'contacts':
        await processContactCorrelations(syncEvent);
        break;
      case 'finance':
        await processFinanceCorrelations(syncEvent);
        break;
      case 'dashboard':
        await processDashboardCorrelations(syncEvent);
        break;
    }
  } catch (error) {
    console.error('Correlation processing error:', error);
  }
}

/**
 * Process contact-related correlations
 */
async function processContactCorrelations(syncEvent) {
  if (syncEvent.type === 'contact_updated') {
    const contact = syncEvent.data;

    // Correlate with finance data (expenses, projects)
    if (contact.current_company) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .or(`description.ilike.%${contact.current_company}%,vendor.ilike.%${contact.current_company}%`)
        .limit(10);

      if (expenses && expenses.length > 0) {
        syncEmitter.emit('sync', {
          id: `corr_${Date.now()}`,
          type: 'correlation_found',
          module: 'finance',
          data: {
            correlationType: 'contact_company_expenses',
            contact: contact,
            expenses: expenses
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Correlate with project data
    if (contact.email_address) {
      // Check for project mentions or communications
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .or(`description.ilike.%${contact.email_address}%,notes.ilike.%${contact.email_address}%`)
        .limit(5);

      if (projects && projects.length > 0) {
        syncEmitter.emit('sync', {
          id: `corr_${Date.now()}`,
          type: 'correlation_found',
          module: 'dashboard',
          data: {
            correlationType: 'contact_project_involvement',
            contact: contact,
            projects: projects
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

/**
 * Process finance-related correlations
 */
async function processFinanceCorrelations(syncEvent) {
  if (syncEvent.type === 'finance_changed') {
    const financeData = syncEvent.data;

    // Correlate expenses with contacts
    if (financeData.vendor || financeData.description) {
      const searchTerm = financeData.vendor || financeData.description;

      const { data: contacts } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .or(`current_company.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(5);

      if (contacts && contacts.length > 0) {
        syncEmitter.emit('sync', {
          id: `corr_${Date.now()}`,
          type: 'correlation_found',
          module: 'contacts',
          data: {
            correlationType: 'expense_contact_match',
            expense: financeData,
            contacts: contacts
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

/**
 * Process dashboard-related correlations
 */
async function processDashboardCorrelations(syncEvent) {
  // Dashboard correlations can aggregate data from multiple sources
  if (syncEvent.type === 'project_modified') {
    const project = syncEvent.data;

    // Find related contacts and financial data
    const correlations = await Promise.all([
      findRelatedContacts(project),
      findRelatedFinanceData(project)
    ]);

    const [relatedContacts, relatedFinance] = correlations;

    if (relatedContacts.length > 0 || relatedFinance.length > 0) {
      syncEmitter.emit('sync', {
        id: `corr_${Date.now()}`,
        type: 'correlation_found',
        module: 'dashboard',
        data: {
          correlationType: 'project_ecosystem',
          project: project,
          relatedContacts,
          relatedFinance
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Get entity data from specific module
 */
async function getEntityData(module, id) {
  const tableMap = {
    contacts: 'linkedin_contacts',
    finance: 'expenses',
    dashboard: 'projects'
  };

  const tableName = tableMap[module];
  if (!tableName) {
    throw new Error(`Unknown module: ${module}`);
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get correlated data for a specific module
 */
async function getCorrelatedDataForModule(sourceModule, sourceId, sourceData, targetModule) {
  // Implementation would depend on the specific correlation logic
  // This is a simplified example

  switch (targetModule) {
    case 'contacts':
      return await findRelatedContacts(sourceData);
    case 'finance':
      return await findRelatedFinanceData(sourceData);
    case 'dashboard':
      return await findRelatedProjects(sourceData);
    default:
      return [];
  }
}

/**
 * Helper functions for finding correlations
 */
async function findRelatedContacts(data) {
  const searchTerms = [];

  if (data.vendor) searchTerms.push(data.vendor);
  if (data.current_company) searchTerms.push(data.current_company);
  if (data.description) {
    // Extract potential company names from description
    const words = data.description.split(' ').filter(word =>
      word.length > 3 && word[0] === word[0].toUpperCase()
    );
    searchTerms.push(...words.slice(0, 3));
  }

  if (searchTerms.length === 0) return [];

  const { data: contacts } = await supabase
    .from('linkedin_contacts')
    .select('*')
    .or(searchTerms.map(term => `current_company.ilike.%${term}%`).join(','))
    .limit(10);

  return contacts || [];
}

async function findRelatedFinanceData(data) {
  const searchTerms = [];

  if (data.current_company) searchTerms.push(data.current_company);
  if (data.full_name) searchTerms.push(data.full_name);

  if (searchTerms.length === 0) return [];

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .or(searchTerms.map(term => `description.ilike.%${term}%,vendor.ilike.%${term}%`).join(','))
    .limit(10);

  return expenses || [];
}

async function findRelatedProjects(data) {
  // This would implement project correlation logic
  return [];
}

export default router;