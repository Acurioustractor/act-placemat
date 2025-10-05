/**
 * Secure Message Router for Agent Communication
 * 
 * Handles secure routing, queuing, and delivery of messages between agents
 * with priority handling, retry logic, and comprehensive audit logging
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { z } from 'zod';
import { AuditLogger } from '../audit/AuditLogger';
import { AgentIdentity, SecureMessage } from './AgentCommunicationService';

// === ROUTING INTERFACES ===

export interface MessageRoute {
  id: string;
  senderId: string;
  recipientId: string;
  messageType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  routingPath: string[];
  metadata: {
    createdAt: Date;
    attempts: number;
    lastAttempt?: Date;
    nextRetry?: Date;
    maxRetries: number;
    timeout: number;
  };
  status: 'pending' | 'routing' | 'delivered' | 'failed' | 'expired';
}

export interface MessageQueue {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  messages: QueuedMessage[];
  maxSize: number;
  processingRate: number; // messages per second
  retryPolicy: RetryPolicy;
  deadLetterQueue?: string;
}

export interface QueuedMessage {
  id: string;
  message: SecureMessage;
  route: MessageRoute;
  queuedAt: Date;
  priority: number; // 0-100, higher = more priority
  attempts: number;
  lastError?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: RoutingCondition;
  action: RoutingAction;
  priority: number;
  enabled: boolean;
}

export interface RoutingCondition {
  senderType?: string[];
  recipientType?: string[];
  messageType?: string[];
  priority?: string[];
  metadata?: Record<string, any>;
}

export interface RoutingAction {
  type: 'route' | 'queue' | 'drop' | 'transform';
  parameters: Record<string, any>;
}

export interface MessageMetrics {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  averageDeliveryTime: number;
  queueSizes: Record<string, number>;
  throughput: number; // messages per minute
  errorRate: number; // percentage
}

// === SECURE MESSAGE ROUTER ===

export class SecureMessageRouter extends EventEmitter {
  private auditLogger: AuditLogger;
  private config: RouterConfig;
  private queues: Map<string, MessageQueue> = new Map();
  private routes: Map<string, MessageRoute> = new Map();
  private routingRules: RoutingRule[] = [];
  private agentRegistry: Map<string, AgentIdentity> = new Map();
  private metrics: MessageMetrics;
  private isRunning = false;
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: RouterConfig, auditLogger: AuditLogger) {
    super();
    this.config = config;
    this.auditLogger = auditLogger;
    this.metrics = {
      totalMessages: 0,
      deliveredMessages: 0,
      failedMessages: 0,
      averageDeliveryTime: 0,
      queueSizes: {},
      throughput: 0,
      errorRate: 0
    };
  }

  /**
   * Start the message router
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Message router is already running');
    }

    console.log('Starting secure message router...');

    try {
      // Initialize default queues
      await this.initializeDefaultQueues();

      // Load routing rules
      await this.loadRoutingRules();

      // Start queue processors
      await this.startQueueProcessors();

      // Start metrics collection
      this.startMetricsCollection();

      this.isRunning = true;

      await this.auditLogger.logSystemEvent({
        action: 'message_router_started',
        resource: 'message_router',
        outcome: 'success',
        metadata: {
          queues: this.queues.size,
          routingRules: this.routingRules.length
        }
      });

      this.emit('router_started');

    } catch (error) {
      await this.auditLogger.logSystemEvent({
        action: 'message_router_start_failed',
        resource: 'message_router',
        outcome: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Stop the message router
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping secure message router...');

    // Stop queue processors
    for (const [queueId, interval] of this.processingIntervals.entries()) {
      clearInterval(interval);
    }

    // Process remaining messages
    await this.drainQueues();

    this.isRunning = false;

    await this.auditLogger.logSystemEvent({
      action: 'message_router_stopped',
      resource: 'message_router',
      outcome: 'success'
    });

    this.emit('router_stopped');
  }

  /**
   * Route a secure message
   */
  async routeMessage(message: SecureMessage): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Message router is not running');
    }

    console.log(`Routing message: ${message.id} from ${message.sender.name} to ${message.recipient.name}`);

    try {
      // Validate message
      await this.validateMessage(message);

      // Apply routing rules
      const routingDecision = await this.applyRoutingRules(message);

      // Create message route
      const route = await this.createMessageRoute(message);

      // Queue message for processing
      await this.queueMessage(message, route, routingDecision.queueName);

      this.metrics.totalMessages++;

      await this.auditLogger.logDataAccess({
        userId: message.sender.id,
        action: 'message_routed',
        resource: `agent:${message.recipient.id}`,
        dataType: message.messageType,
        metadata: {
          messageId: message.id,
          routeId: route.id,
          queueName: routingDecision.queueName,
          priority: message.metadata.priority
        }
      });

      this.emit('message_routed', { messageId: message.id, routeId: route.id });

      return route.id;

    } catch (error) {
      this.metrics.failedMessages++;

      await this.auditLogger.logDataAccess({
        userId: message.sender.id,
        action: 'message_routing_failed',
        resource: `agent:${message.recipient.id}`,
        dataType: message.messageType,
        metadata: {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /**
   * Register an agent with the router
   */
  async registerAgent(agent: AgentIdentity): Promise<void> {
    this.agentRegistry.set(agent.id, agent);

    await this.auditLogger.logSystemEvent({
      action: 'agent_registered',
      resource: `agent:${agent.id}`,
      outcome: 'success',
      metadata: {
        agentName: agent.name,
        agentType: agent.type,
        capabilities: agent.capabilities
      }
    });

    this.emit('agent_registered', agent);
  }

  /**
   * Unregister an agent from the router
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      return;
    }

    this.agentRegistry.delete(agentId);

    // Cancel pending messages for this agent
    await this.cancelPendingMessages(agentId);

    await this.auditLogger.logSystemEvent({
      action: 'agent_unregistered',
      resource: `agent:${agentId}`,
      outcome: 'success'
    });

    this.emit('agent_unregistered', agent);
  }

  /**
   * Get routing metrics
   */
  getMetrics(): MessageMetrics {
    // Update queue sizes
    this.metrics.queueSizes = {};
    for (const [queueId, queue] of this.queues.entries()) {
      this.metrics.queueSizes[queueId] = queue.messages.length;
    }

    // Calculate error rate
    this.metrics.errorRate = this.metrics.totalMessages > 0 
      ? (this.metrics.failedMessages / this.metrics.totalMessages) * 100 
      : 0;

    return { ...this.metrics };
  }

  /**
   * Get message route status
   */
  getRouteStatus(routeId: string): MessageRoute | null {
    return this.routes.get(routeId) || null;
  }

  /**
   * List active routes
   */
  listActiveRoutes(): MessageRoute[] {
    return Array.from(this.routes.values()).filter(route => 
      ['pending', 'routing'].includes(route.status)
    );
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority);

    this.emit('routing_rule_added', rule);
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): void {
    const index = this.routingRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      const removed = this.routingRules.splice(index, 1)[0];
      this.emit('routing_rule_removed', removed);
    }
  }

  // === PRIVATE METHODS ===

  /**
   * Initialize default message queues
   */
  private async initializeDefaultQueues(): Promise<void> {
    const defaultQueues: Omit<MessageQueue, 'messages'>[] = [
      {
        id: 'critical',
        name: 'Critical Priority Queue',
        priority: 'critical',
        maxSize: 1000,
        processingRate: 100, // 100 messages per second
        retryPolicy: {
          maxRetries: 5,
          baseDelay: 100,
          maxDelay: 5000,
          backoffMultiplier: 2,
          retryableErrors: ['network_error', 'timeout', 'temporary_failure']
        }
      },
      {
        id: 'high',
        name: 'High Priority Queue',
        priority: 'high',
        maxSize: 5000,
        processingRate: 50,
        retryPolicy: {
          maxRetries: 3,
          baseDelay: 200,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: ['network_error', 'timeout', 'temporary_failure']
        }
      },
      {
        id: 'medium',
        name: 'Medium Priority Queue',
        priority: 'medium',
        maxSize: 10000,
        processingRate: 25,
        retryPolicy: {
          maxRetries: 2,
          baseDelay: 500,
          maxDelay: 30000,
          backoffMultiplier: 2,
          retryableErrors: ['network_error', 'timeout']
        }
      },
      {
        id: 'low',
        name: 'Low Priority Queue',
        priority: 'low',
        maxSize: 20000,
        processingRate: 10,
        retryPolicy: {
          maxRetries: 1,
          baseDelay: 1000,
          maxDelay: 60000,
          backoffMultiplier: 2,
          retryableErrors: ['network_error']
        }
      },
      {
        id: 'dead-letter',
        name: 'Dead Letter Queue',
        priority: 'low',
        maxSize: 1000,
        processingRate: 1,
        retryPolicy: {
          maxRetries: 0,
          baseDelay: 0,
          maxDelay: 0,
          backoffMultiplier: 1,
          retryableErrors: []
        }
      }
    ];

    for (const queueConfig of defaultQueues) {
      const queue: MessageQueue = {
        ...queueConfig,
        messages: []
      };
      this.queues.set(queue.id, queue);
    }

    console.log(`Initialized ${defaultQueues.length} default queues`);
  }

  /**
   * Load routing rules
   */
  private async loadRoutingRules(): Promise<void> {
    const defaultRules: RoutingRule[] = [
      {
        id: 'critical-messages',
        name: 'Route Critical Messages',
        condition: {
          priority: ['critical']
        },
        action: {
          type: 'queue',
          parameters: { queueName: 'critical' }
        },
        priority: 100,
        enabled: true
      },
      {
        id: 'high-priority-messages',
        name: 'Route High Priority Messages',
        condition: {
          priority: ['high']
        },
        action: {
          type: 'queue',
          parameters: { queueName: 'high' }
        },
        priority: 90,
        enabled: true
      },
      {
        id: 'heartbeat-messages',
        name: 'Route Heartbeat Messages',
        condition: {
          messageType: ['heartbeat']
        },
        action: {
          type: 'queue',
          parameters: { queueName: 'low' }
        },
        priority: 10,
        enabled: true
      },
      {
        id: 'default-routing',
        name: 'Default Message Routing',
        condition: {},
        action: {
          type: 'queue',
          parameters: { queueName: 'medium' }
        },
        priority: 1,
        enabled: true
      }
    ];

    this.routingRules = defaultRules;
    console.log(`Loaded ${defaultRules.length} routing rules`);
  }

  /**
   * Start queue processors
   */
  private async startQueueProcessors(): Promise<void> {
    for (const [queueId, queue] of this.queues.entries()) {
      if (queueId === 'dead-letter') {
        continue; // Dead letter queue doesn't need active processing
      }

      const processingInterval = 1000 / queue.processingRate; // Convert to milliseconds
      
      const interval = setInterval(async () => {
        await this.processQueue(queueId);
      }, processingInterval);

      this.processingIntervals.set(queueId, interval);
    }

    console.log(`Started ${this.processingIntervals.size} queue processors`);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.calculateThroughput();
    }, 60000); // Update throughput every minute
  }

  /**
   * Validate incoming message
   */
  private async validateMessage(message: SecureMessage): Promise<void> {
    // Check if sender is registered
    if (!this.agentRegistry.has(message.sender.id)) {
      throw new Error(`Sender agent not registered: ${message.sender.id}`);
    }

    // Check if recipient is registered
    if (!this.agentRegistry.has(message.recipient.id)) {
      throw new Error(`Recipient agent not registered: ${message.recipient.id}`);
    }

    // Validate message size
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.maxMessageSize) {
      throw new Error(`Message size exceeds limit: ${messageSize} > ${this.config.maxMessageSize}`);
    }

    // Check TTL
    const now = new Date();
    const messageAge = now.getTime() - message.timestamp.getTime();
    if (messageAge > message.metadata.ttl) {
      throw new Error('Message has expired');
    }
  }

  /**
   * Apply routing rules to determine message routing
   */
  private async applyRoutingRules(message: SecureMessage): Promise<{ queueName: string }> {
    for (const rule of this.routingRules) {
      if (!rule.enabled) {
        continue;
      }

      if (await this.matchesCondition(message, rule.condition)) {
        switch (rule.action.type) {
          case 'queue':
            return { queueName: rule.action.parameters.queueName };
          case 'drop':
            throw new Error('Message dropped by routing rule');
          default:
            continue;
        }
      }
    }

    // Default routing
    return { queueName: 'medium' };
  }

  /**
   * Check if message matches routing condition
   */
  private async matchesCondition(message: SecureMessage, condition: RoutingCondition): Promise<boolean> {
    if (condition.senderType && !condition.senderType.includes(message.sender.type)) {
      return false;
    }

    if (condition.recipientType && !condition.recipientType.includes(message.recipient.type)) {
      return false;
    }

    if (condition.messageType && !condition.messageType.includes(message.messageType)) {
      return false;
    }

    if (condition.priority && !condition.priority.includes(message.metadata.priority)) {
      return false;
    }

    return true;
  }

  /**
   * Create message route
   */
  private async createMessageRoute(message: SecureMessage): Promise<MessageRoute> {
    const route: MessageRoute = {
      id: crypto.randomUUID(),
      senderId: message.sender.id,
      recipientId: message.recipient.id,
      messageType: message.messageType,
      priority: message.metadata.priority,
      routingPath: [message.sender.id, message.recipient.id],
      metadata: {
        createdAt: new Date(),
        attempts: 0,
        maxRetries: message.metadata.retryCount || this.config.defaultRetries,
        timeout: message.metadata.ttl
      },
      status: 'pending'
    };

    this.routes.set(route.id, route);
    return route;
  }

  /**
   * Queue message for processing
   */
  private async queueMessage(message: SecureMessage, route: MessageRoute, queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    if (queue.messages.length >= queue.maxSize) {
      throw new Error(`Queue is full: ${queueName}`);
    }

    const queuedMessage: QueuedMessage = {
      id: crypto.randomUUID(),
      message,
      route,
      queuedAt: new Date(),
      priority: this.calculateMessagePriority(message),
      attempts: 0
    };

    // Insert message based on priority
    const insertIndex = queue.messages.findIndex(m => m.priority < queuedMessage.priority);
    if (insertIndex === -1) {
      queue.messages.push(queuedMessage);
    } else {
      queue.messages.splice(insertIndex, 0, queuedMessage);
    }

    route.status = 'routing';
  }

  /**
   * Calculate message priority score
   */
  private calculateMessagePriority(message: SecureMessage): number {
    const priorityScores = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    let score = priorityScores[message.metadata.priority] || 50;

    // Adjust based on TTL
    const remainingTTL = message.metadata.ttl - (new Date().getTime() - message.timestamp.getTime());
    if (remainingTTL < 5000) { // Less than 5 seconds
      score += 20;
    }

    return score;
  }

  /**
   * Process messages in a queue
   */
  private async processQueue(queueId: string): Promise<void> {
    const queue = this.queues.get(queueId);
    if (!queue || queue.messages.length === 0) {
      return;
    }

    const message = queue.messages.shift();
    if (!message) {
      return;
    }

    try {
      await this.deliverMessage(message);
      
      // Mark route as delivered
      message.route.status = 'delivered';
      this.metrics.deliveredMessages++;

      // Calculate delivery time
      const deliveryTime = new Date().getTime() - message.queuedAt.getTime();
      this.updateAverageDeliveryTime(deliveryTime);

    } catch (error) {
      await this.handleMessageFailure(message, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Deliver message to recipient
   */
  private async deliverMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, route } = queuedMessage;

    // Get recipient agent
    const recipient = this.agentRegistry.get(message.recipient.id);
    if (!recipient) {
      throw new Error(`Recipient agent not found: ${message.recipient.id}`);
    }

    // Simulate message delivery
    // In production, this would send to the actual agent
    console.log(`Delivering message ${message.id} to agent ${recipient.name}`);

    // Update route
    route.metadata.attempts++;
    route.metadata.lastAttempt = new Date();

    this.emit('message_delivered', { 
      messageId: message.id, 
      routeId: route.id,
      recipient: recipient.name 
    });
  }

  /**
   * Handle message delivery failure
   */
  private async handleMessageFailure(queuedMessage: QueuedMessage, error: string): Promise<void> {
    const { message, route } = queuedMessage;
    
    queuedMessage.attempts++;
    queuedMessage.lastError = error;

    const queue = this.queues.get(route.priority);
    const retryPolicy = queue?.retryPolicy;

    if (!retryPolicy || queuedMessage.attempts >= retryPolicy.maxRetries) {
      // Move to dead letter queue
      route.status = 'failed';
      await this.moveToDeadLetterQueue(queuedMessage);
      this.metrics.failedMessages++;

    } else if (retryPolicy.retryableErrors.some(err => error.includes(err))) {
      // Schedule retry
      const delay = Math.min(
        retryPolicy.baseDelay * Math.pow(retryPolicy.backoffMultiplier, queuedMessage.attempts - 1),
        retryPolicy.maxDelay
      );

      setTimeout(async () => {
        if (queue) {
          queue.messages.unshift(queuedMessage); // Put back at front
        }
      }, delay);

    } else {
      // Non-retryable error
      route.status = 'failed';
      await this.moveToDeadLetterQueue(queuedMessage);
      this.metrics.failedMessages++;
    }
  }

  /**
   * Move message to dead letter queue
   */
  private async moveToDeadLetterQueue(queuedMessage: QueuedMessage): Promise<void> {
    const deadLetterQueue = this.queues.get('dead-letter');
    if (deadLetterQueue && deadLetterQueue.messages.length < deadLetterQueue.maxSize) {
      deadLetterQueue.messages.push(queuedMessage);
    }

    await this.auditLogger.logSystemEvent({
      action: 'message_moved_to_dead_letter',
      resource: `message:${queuedMessage.message.id}`,
      outcome: 'success',
      metadata: {
        routeId: queuedMessage.route.id,
        attempts: queuedMessage.attempts,
        lastError: queuedMessage.lastError
      }
    });
  }

  /**
   * Cancel pending messages for an agent
   */
  private async cancelPendingMessages(agentId: string): Promise<void> {
    let cancelledCount = 0;

    for (const queue of this.queues.values()) {
      for (let i = queue.messages.length - 1; i >= 0; i--) {
        const message = queue.messages[i];
        if (message.message.sender.id === agentId || message.message.recipient.id === agentId) {
          queue.messages.splice(i, 1);
          message.route.status = 'failed';
          cancelledCount++;
        }
      }
    }

    console.log(`Cancelled ${cancelledCount} pending messages for agent: ${agentId}`);
  }

  /**
   * Drain all queues
   */
  private async drainQueues(): Promise<void> {
    console.log('Draining message queues...');

    const drainPromises: Promise<void>[] = [];

    for (const [queueId, queue] of this.queues.entries()) {
      if (queue.messages.length > 0) {
        drainPromises.push(this.drainSingleQueue(queueId));
      }
    }

    await Promise.all(drainPromises);
    console.log('All queues drained');
  }

  /**
   * Drain a single queue
   */
  private async drainSingleQueue(queueId: string): Promise<void> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return;
    }

    while (queue.messages.length > 0) {
      await this.processQueue(queueId);
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughput(): void {
    // This would track messages processed in the last minute
    // For now, using a simple calculation
    this.metrics.throughput = this.metrics.deliveredMessages;
  }

  /**
   * Update average delivery time
   */
  private updateAverageDeliveryTime(deliveryTime: number): void {
    if (this.metrics.averageDeliveryTime === 0) {
      this.metrics.averageDeliveryTime = deliveryTime;
    } else {
      this.metrics.averageDeliveryTime = (this.metrics.averageDeliveryTime + deliveryTime) / 2;
    }
  }
}

// === ROUTER CONFIG ===

export interface RouterConfig {
  maxMessageSize: number;
  defaultRetries: number;
  queueProcessingInterval: number;
  metricsUpdateInterval: number;
  enableDeadLetterQueue: boolean;
  maxDeadLetterSize: number;
}

// === ROUTER FACTORY ===

export class SecureMessageRouterFactory {
  
  /**
   * Create message router with default configuration
   */
  static createMessageRouter(auditLogger: AuditLogger, customConfig?: Partial<RouterConfig>): SecureMessageRouter {
    const defaultConfig: RouterConfig = {
      maxMessageSize: 1024 * 1024, // 1MB
      defaultRetries: 3,
      queueProcessingInterval: 100, // milliseconds
      metricsUpdateInterval: 60000, // 1 minute
      enableDeadLetterQueue: true,
      maxDeadLetterSize: 1000
    };

    const finalConfig = { ...defaultConfig, ...customConfig };

    return new SecureMessageRouter(finalConfig, auditLogger);
  }
}