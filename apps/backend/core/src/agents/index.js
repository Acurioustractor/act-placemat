/**
 * AI Agents Initialization
 * 
 * Bootstraps all financial intelligence agents and sets up routing rules
 * for the ACT Platform's autonomous financial operations.
 */

import { getAgentOrchestrator } from './events/AgentOrchestrator.js';
import { getEventIngestor } from './events/EventIngestor.js';
import { getNotificationBus } from '../services/notificationBus.js';
import { PolicyStore } from './base/PolicyStore.js';
import { Logger } from '../utils/logger.js';

// Import agents
import { ReceiptCodingAgent } from './financial/ReceiptCodingAgent.js';
import { BankReconciliationAgent } from './financial/BankReconciliationAgent.js';
import { BASPrepAgent } from './financial/BASPrepAgent.js';
import { ARCollectionsAgent } from './financial/ARCollectionsAgent.js';
import { CashflowForecastAgent } from './financial/CashflowForecastAgent.js';
import { RDGrantsAgent } from './research/RDGrantsAgent.js';
import { SpendGuardAgent } from './compliance/SpendGuardAgent.js';
import { BoardPackAgent } from './reporting/BoardPackAgent.js';

const logger = new Logger('AgentSystem');

/**
 * Initialize the AI Agent System
 */
export async function initializeAgentSystem() {
  try {
    logger.info('🚀 Initializing AI Agent System...');
    
    // Initialize core services
    const orchestrator = getAgentOrchestrator();
    const eventIngestor = getEventIngestor();
    const notificationBus = getNotificationBus();
    const policyStore = new PolicyStore();
    
    // Load policies
    await policyStore.load();
    
    // Initialize agents
    const agents = [
      new ReceiptCodingAgent(),
      new BankReconciliationAgent(),
      new BASPrepAgent(),
      new ARCollectionsAgent(),
      new CashflowForecastAgent(),
      new RDGrantsAgent(),
      new SpendGuardAgent(),
      new BoardPackAgent()
    ];
    
    // Register agents with orchestrator
    for (const agent of agents) {
      orchestrator.registerAgent(agent);
      
      // Set up agent event listeners for notifications
      setupAgentNotifications(agent, notificationBus);
    }
    
    // Define routing rules
    setupRoutingRules(orchestrator);
    
    // Connect notification handlers
    setupNotificationHandlers(eventIngestor, notificationBus);
    
    logger.info('✅ AI Agent System initialized successfully', {
      agentCount: agents.length,
      routingRules: orchestrator.routingRules.size
    });
    
    return {
      orchestrator,
      eventIngestor,
      notificationBus,
      policyStore,
      agents
    };
    
  } catch (error) {
    logger.error('Failed to initialize AI Agent System:', error);
    throw error;
  }
}

/**
 * Set up routing rules for event types to agents
 */
function setupRoutingRules(orchestrator) {
  // Financial event routing
  orchestrator.defineRoutingRule('bill_created', 'ReceiptCodingAgent');
  orchestrator.defineRoutingRule('bill_updated', 'ReceiptCodingAgent');
  
  orchestrator.defineRoutingRule('bank_transaction_created', 'BankReconciliationAgent');
  orchestrator.defineRoutingRule('bank_transaction_updated', 'BankReconciliationAgent');
  
  orchestrator.defineRoutingRule('invoice_created', 'ARCollectionsAgent');
  orchestrator.defineRoutingRule('invoice_updated', 'ARCollectionsAgent', {
    condition: (event) => {
      // Only route if invoice is overdue or due soon
      const dueDate = new Date(event.data.dueDate);
      const daysUntilDue = (dueDate - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 7;
    }
  });
  
  // Scheduled job routing
  orchestrator.defineRoutingRule('daily', ['BASPrepAgent', 'CashflowForecastAgent', 'ARCollectionsAgent'], {
    parallel: true
  });
  
  orchestrator.defineRoutingRule('weekly', ['RDGrantsAgent'], {
    priority: 'low'
  });
  
  orchestrator.defineRoutingRule('month_end', ['BoardPackAgent', 'BASPrepAgent'], {
    parallel: false,
    priority: 'high'
  });
  
  // Document and evidence routing
  orchestrator.defineRoutingRule('rd_evidence_added', 'RDGrantsAgent');
  orchestrator.defineRoutingRule('receipt_uploaded', 'ReceiptCodingAgent');
  
  // Policy and approval routing
  orchestrator.defineRoutingRule('policy_updated', 'SpendGuardAgent');
  orchestrator.defineRoutingRule('approval_callback', ['ReceiptCodingAgent', 'BankReconciliationAgent'], {
    parallel: true
  });
  
  logger.info('Routing rules configured');
}

/**
 * Set up agent notification listeners
 */
function setupAgentNotifications(agent, notificationBus) {
  // Listen for approval required events
  agent.on('approval_required', async (data) => {
    await notificationBus.sendApprovalRequired(data);
  });
  
  // Listen for Xero update events
  agent.on('xero_update_required', async (data) => {
    logger.info(`Xero update required from ${agent.name}:`, data);
    // This would integrate with Xero API service
  });
  
  // Listen for transfer events
  agent.on('xero_transfer_required', async (data) => {
    logger.info(`Xero transfer required from ${agent.name}:`, data);
    // This would integrate with Xero API service
  });
}

/**
 * Set up notification handlers for system events
 */
function setupNotificationHandlers(eventIngestor, notificationBus) {
  // BAS ready notifications
  eventIngestor.on('bas_ready', async (data) => {
    await notificationBus.sendBASReady(data);
  });
  
  // Daily digest
  eventIngestor.on('daily_digest', async (data) => {
    await notificationBus.sendDailyDigest(data);
  });
  
  // System alerts
  eventIngestor.on('error', async ({ event, error }) => {
    await notificationBus.send({
      type: 'system_alert',
      channel: 'slack',
      data: {
        event: event.type,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  });
}

/**
 * Health check for the agent system
 */
export async function getSystemHealth() {
  const orchestrator = getAgentOrchestrator();
  const eventIngestor = getEventIngestor();
  const notificationBus = getNotificationBus();
  
  return {
    orchestrator: orchestrator.getHealth(),
    eventIngestor: eventIngestor.getHealth(),
    notificationBus: notificationBus.getHealth(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Graceful shutdown
 */
export async function shutdownAgentSystem() {
  logger.info('Shutting down AI Agent System...');
  
  const orchestrator = getAgentOrchestrator();
  
  // Disable all agents
  const agents = orchestrator.listAgents();
  for (const agent of agents) {
    orchestrator.setAgentEnabled(agent.name, false);
  }
  
  logger.info('AI Agent System shutdown complete');
}

// Export individual components for direct access if needed
export { getAgentOrchestrator, getEventIngestor, getNotificationBus };
export { PolicyStore } from './base/PolicyStore.js';
export { BaseAgent } from './base/BaseAgent.js';