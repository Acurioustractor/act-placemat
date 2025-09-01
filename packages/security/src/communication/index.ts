/**
 * Secure Agent Communication Module Index
 * 
 * Comprehensive TLS 1.3 communication framework for secure agent-to-agent
 * messaging with mutual authentication, certificate management, and message routing
 */

// === MAIN COMMUNICATION COMPONENTS ===
export { 
  AgentCommunicationService,
  AgentCommunicationFactory 
} from './AgentCommunicationService';

export { 
  CertificateManager,
  CertificateManagerFactory 
} from './CertificateManager';

export { 
  SecureMessageRouter,
  SecureMessageRouterFactory 
} from './SecureMessageRouter';

// === COMMUNICATION INTERFACES ===
export type {
  AgentIdentity,
  AgentEndpoint,
  TLSConfig,
  SecureMessage,
  CommunicationConfig
} from './AgentCommunicationService';

export type {
  Certificate,
  CertificateSubject,
  CertificateExtension,
  CertificateRequest,
  CertificateRevocation,
  CertificateManagerConfig
} from './CertificateManager';

export type {
  MessageRoute,
  MessageQueue,
  QueuedMessage,
  RetryPolicy,
  RoutingRule,
  RoutingCondition,
  RoutingAction,
  MessageMetrics,
  RouterConfig
} from './SecureMessageRouter';

// === COMMUNICATION SYSTEM FACTORY ===

import { AgentCommunicationService, AgentCommunicationFactory, AgentIdentity, CommunicationConfig } from './AgentCommunicationService';
import { CertificateManager, CertificateManagerFactory, CertificateManagerConfig } from './CertificateManager';
import { SecureMessageRouter, SecureMessageRouterFactory, RouterConfig } from './SecureMessageRouter';
import { AuditLogger } from '../audit/AuditLogger';
import * as crypto from 'crypto';

/**
 * Secure Communication System Factory
 * Creates and configures the complete agent communication infrastructure
 */
export class SecureCommunicationSystemFactory {
  
  /**
   * Create a complete secure communication system
   */
  static createCommunicationSystem(config: {
    auditLogger: AuditLogger;
    certificateConfig?: Partial<CertificateManagerConfig>;
    routerConfig?: Partial<RouterConfig>;
    agentIdentities?: AgentIdentity[];
  }): {
    certificateManager: CertificateManager;
    messageRouter: SecureMessageRouter;
    communicationServices: Map<string, AgentCommunicationService>;
    systemConfig: SecureCommunicationSystemConfig;
  } {
    const { auditLogger, certificateConfig, routerConfig, agentIdentities = [] } = config;

    // Create certificate manager
    const certificateManager = CertificateManagerFactory.createCertificateManager(
      auditLogger,
      certificateConfig
    );

    // Create message router
    const messageRouter = SecureMessageRouterFactory.createMessageRouter(
      auditLogger,
      routerConfig
    );

    // Create communication services for each agent
    const communicationServices = new Map<string, AgentCommunicationService>();
    
    for (const identity of agentIdentities) {
      const commService = AgentCommunicationFactory.createCommunicationService(
        identity,
        auditLogger
      );
      communicationServices.set(identity.id, commService);
    }

    // System configuration
    const systemConfig: SecureCommunicationSystemConfig = {
      tlsVersion: '1.3',
      encryptionAlgorithm: 'AES-256-GCM',
      certificateValidityPeriod: certificateConfig?.defaultValidityPeriod || 365,
      messageRetentionPeriod: 30, // days
      maxConcurrentConnections: 1000,
      enableMutualTLS: true,
      enableMessageEncryption: true,
      enableAuditLogging: true,
      complianceFrameworks: ['ISM', 'Privacy-Act', 'Essential-8'],
      securityFeatures: {
        certificateRevocation: true,
        automaticKeyRotation: true,
        anomalyDetection: true,
        intrusionPrevention: true,
        dataLossPrevention: true
      }
    };

    return {
      certificateManager,
      messageRouter,
      communicationServices,
      systemConfig
    };
  }

  /**
   * Create agent identity for system components
   */
  static createSystemAgentIdentities(): AgentIdentity[] {
    const systemAgents: Omit<AgentIdentity, 'id' | 'certificateFingerprint' | 'endpoints'>[] = [
      {
        name: 'Frontend-Service',
        type: 'frontend',
        version: '1.0.0',
        capabilities: [
          'user-interface',
          'web-serving',
          'static-content',
          'client-communication'
        ]
      },
      {
        name: 'Backend-API',
        type: 'backend',
        version: '1.0.0',
        capabilities: [
          'data-processing',
          'business-logic',
          'database-access',
          'external-integrations'
        ]
      },
      {
        name: 'Security-Monitor',
        type: 'monitor',
        version: '1.0.0',
        capabilities: [
          'security-monitoring',
          'anomaly-detection',
          'threat-analysis',
          'incident-response'
        ]
      },
      {
        name: 'Task-Scheduler',
        type: 'scheduler',
        version: '1.0.0',
        capabilities: [
          'job-scheduling',
          'workflow-automation',
          'resource-management',
          'load-balancing'
        ]
      },
      {
        name: 'Data-Worker',
        type: 'worker',
        version: '1.0.0',
        capabilities: [
          'data-processing',
          'batch-operations',
          'file-processing',
          'analytics'
        ]
      },
      {
        name: 'API-Gateway',
        type: 'api',
        version: '1.0.0',
        capabilities: [
          'request-routing',
          'authentication',
          'rate-limiting',
          'load-balancing'
        ]
      }
    ];

    return systemAgents.map(agent => 
      AgentCommunicationFactory.createAgentIdentity({
        ...agent,
        endpoints: [
          {
            name: `${agent.name}-Primary`,
            host: 'localhost',
            port: this.getDefaultPortForAgentType(agent.type),
            protocol: 'https',
            path: '/api/v1'
          }
        ]
      })
    );
  }

  /**
   * Get default port for agent type
   */
  private static getDefaultPortForAgentType(agentType: string): number {
    const portMap: Record<string, number> = {
      frontend: 3000,
      backend: 4000,
      api: 5000,
      monitor: 6000,
      scheduler: 7000,
      worker: 8000
    };

    return portMap[agentType] || 9000;
  }

  /**
   * Create production-ready communication system
   */
  static createProductionCommunicationSystem(auditLogger: AuditLogger): {
    certificateManager: CertificateManager;
    messageRouter: SecureMessageRouter;
    communicationServices: Map<string, AgentCommunicationService>;
    systemConfig: SecureCommunicationSystemConfig;
  } {
    // Production certificate configuration
    const certificateConfig: Partial<CertificateManagerConfig> = {
      baseDirectory: '/etc/act-placemat/certs',
      defaultValidityPeriod: 90, // 3 months for production
      caValidityPeriod: 3650, // 10 years
      renewalThresholdDays: 14, // 2 weeks
      autoRenewal: true,
      autoRenewalThresholdDays: 7,
      keySize: 4096,
      hashAlgorithm: 'sha384'
    };

    // Production router configuration
    const routerConfig: Partial<RouterConfig> = {
      maxMessageSize: 512 * 1024, // 512KB
      defaultRetries: 5,
      queueProcessingInterval: 50, // Higher throughput
      metricsUpdateInterval: 30000, // 30 seconds
      enableDeadLetterQueue: true,
      maxDeadLetterSize: 10000
    };

    // Create system agent identities
    const agentIdentities = this.createSystemAgentIdentities();

    return this.createCommunicationSystem({
      auditLogger,
      certificateConfig,
      routerConfig,
      agentIdentities
    });
  }

  /**
   * Create development communication system
   */
  static createDevelopmentCommunicationSystem(auditLogger: AuditLogger): {
    certificateManager: CertificateManager;
    messageRouter: SecureMessageRouter;
    communicationServices: Map<string, AgentCommunicationService>;
    systemConfig: SecureCommunicationSystemConfig;
  } {
    // Development certificate configuration
    const certificateConfig: Partial<CertificateManagerConfig> = {
      baseDirectory: './dev-certs',
      defaultValidityPeriod: 365, // 1 year for development
      caValidityPeriod: 1825, // 5 years
      renewalThresholdDays: 30,
      autoRenewal: true,
      autoRenewalThresholdDays: 7,
      keySize: 2048, // Smaller keys for faster generation
      hashAlgorithm: 'sha256'
    };

    // Development router configuration
    const routerConfig: Partial<RouterConfig> = {
      maxMessageSize: 1024 * 1024, // 1MB
      defaultRetries: 3,
      queueProcessingInterval: 100,
      metricsUpdateInterval: 60000, // 1 minute
      enableDeadLetterQueue: true,
      maxDeadLetterSize: 1000
    };

    // Create minimal agent identities for development
    const agentIdentities = [
      AgentCommunicationFactory.createAgentIdentity({
        name: 'Frontend-Dev',
        type: 'frontend',
        version: '1.0.0-dev',
        capabilities: ['web-serving', 'dev-tools'],
        endpoints: [
          {
            name: 'Frontend-Primary',
            host: 'localhost',
            port: 3000,
            protocol: 'https',
            path: '/api/v1'
          }
        ]
      }),
      AgentCommunicationFactory.createAgentIdentity({
        name: 'Backend-Dev',
        type: 'backend',
        version: '1.0.0-dev',
        capabilities: ['api-serving', 'dev-tools'],
        endpoints: [
          {
            name: 'Backend-Primary',
            host: 'localhost',
            port: 4000,
            protocol: 'https',
            path: '/api/v1'
          }
        ]
      })
    ];

    return this.createCommunicationSystem({
      auditLogger,
      certificateConfig,
      routerConfig,
      agentIdentities
    });
  }
}

// === SYSTEM CONFIGURATION ===

export interface SecureCommunicationSystemConfig {
  tlsVersion: '1.3';
  encryptionAlgorithm: 'AES-256-GCM';
  certificateValidityPeriod: number;
  messageRetentionPeriod: number;
  maxConcurrentConnections: number;
  enableMutualTLS: boolean;
  enableMessageEncryption: boolean;
  enableAuditLogging: boolean;
  complianceFrameworks: string[];
  securityFeatures: {
    certificateRevocation: boolean;
    automaticKeyRotation: boolean;
    anomalyDetection: boolean;
    intrusionPrevention: boolean;
    dataLossPrevention: boolean;
  };
}

// === COMMUNICATION UTILITIES ===

/**
 * Communication system utilities
 */
export class CommunicationUtils {
  
  /**
   * Validate TLS configuration
   */
  static validateTLSConfig(config: TLSConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate TLS version
    if (config.version !== '1.3') {
      errors.push('Only TLS 1.3 is supported');
    }

    // Validate cipher suites
    const supportedCipherSuites = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256'
    ];

    for (const suite of config.cipherSuites) {
      if (!supportedCipherSuites.includes(suite)) {
        warnings.push(`Cipher suite may not be supported: ${suite}`);
      }
    }

    // Validate session timeout
    if (config.sessionTimeout < 60 || config.sessionTimeout > 3600) {
      warnings.push('Session timeout should be between 60 and 3600 seconds');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate secure random agent ID
   */
  static generateAgentId(prefix?: string): string {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return prefix ? `${prefix}-${randomBytes}` : randomBytes;
  }

  /**
   * Validate message format
   */
  static validateSecureMessage(message: any): message is SecureMessage {
    return (
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      message.timestamp instanceof Date &&
      typeof message.sender === 'object' &&
      typeof message.recipient === 'object' &&
      typeof message.messageType === 'string' &&
      typeof message.payload !== 'undefined' &&
      typeof message.signature === 'string' &&
      typeof message.encryption === 'object' &&
      typeof message.metadata === 'object'
    );
  }

  /**
   * Calculate message hash for integrity verification
   */
  static calculateMessageHash(message: SecureMessage): string {
    const messageData = {
      id: message.id,
      timestamp: message.timestamp,
      sender: message.sender.id,
      recipient: message.recipient.id,
      messageType: message.messageType,
      payload: message.payload
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(messageData))
      .digest('hex');
  }

  /**
   * Check if agent types are compatible for communication
   */
  static areAgentTypesCompatible(senderType: string, recipientType: string): boolean {
    const compatibilityMatrix: Record<string, string[]> = {
      frontend: ['backend', 'api'],
      backend: ['frontend', 'api', 'worker', 'scheduler'],
      api: ['frontend', 'backend', 'monitor'],
      scheduler: ['backend', 'worker'],
      monitor: ['api', 'backend'],
      worker: ['backend', 'scheduler']
    };

    return compatibilityMatrix[senderType]?.includes(recipientType) || false;
  }
}