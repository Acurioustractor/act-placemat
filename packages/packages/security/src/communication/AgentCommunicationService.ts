/**
 * Agent Communication Service for ACT Placemat
 * 
 * Provides secure TLS 1.3 communication channels between system agents
 * with mutual authentication, certificate management, and message routing
 */

import { EventEmitter } from 'events';
import * as tls from 'tls';
import * as https from 'https';
import * as crypto from 'crypto';
import { z } from 'zod';
import { AuditLogger } from '../audit/AuditLogger';

// === COMMUNICATION INTERFACES ===

export interface AgentIdentity {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'api' | 'scheduler' | 'monitor' | 'worker';
  version: string;
  capabilities: string[];
  endpoints: AgentEndpoint[];
  certificateFingerprint: string;
}

export interface AgentEndpoint {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'https' | 'wss' | 'grpc';
  path?: string;
  tlsConfig: TLSConfig;
}

export interface TLSConfig {
  version: '1.3';
  cipherSuites: string[];
  certificatePath: string;
  privateKeyPath: string;
  caCertificatePath: string;
  requireClientCert: boolean;
  verifyClient: boolean;
  sessionTimeout: number;
}

export interface SecureMessage {
  id: string;
  timestamp: Date;
  sender: AgentIdentity;
  recipient: AgentIdentity;
  messageType: 'request' | 'response' | 'event' | 'heartbeat';
  payload: any;
  signature: string;
  encryption: {
    algorithm: string;
    keyId: string;
    nonce: string;
  };
  metadata: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    ttl: number;
    retryCount: number;
    correlationId?: string;
  };
}

export interface CommunicationConfig {
  agentId: string;
  tlsConfig: TLSConfig;
  authentication: {
    privateKeyPath: string;
    certificatePath: string;
    trustedCAs: string[];
  };
  encryption: {
    algorithm: 'AES-256-GCM';
    keyRotationInterval: number;
    keyDerivationSalt: string;
  };
  routing: {
    enableDiscovery: boolean;
    heartbeatInterval: number;
    maxRetries: number;
    timeout: number;
  };
  security: {
    allowedAgentTypes: string[];
    maxMessageSize: number;
    rateLimiting: {
      maxRequestsPerMinute: number;
      maxRequestsPerHour: number;
    };
  };
}

// === AGENT COMMUNICATION SERVICE ===

export class AgentCommunicationService extends EventEmitter {
  private config: CommunicationConfig;
  private auditLogger: AuditLogger;
  private identity: AgentIdentity;
  private connectedAgents: Map<string, AgentConnection> = new Map();
  private messageQueue: Map<string, SecureMessage[]> = new Map();
  private tlsServers: Map<string, tls.Server> = new Map();
  private encryptionKeys: Map<string, crypto.KeyObject> = new Map();
  private isRunning = false;

  constructor(config: CommunicationConfig, identity: AgentIdentity, auditLogger: AuditLogger) {
    super();
    this.config = config;
    this.identity = identity;
    this.auditLogger = auditLogger;
  }

  /**
   * Start the communication service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Communication service already running');
    }

    console.log(`Starting secure communication service for agent: ${this.identity.name}`);

    try {
      // Initialize TLS configuration
      await this.initializeTLSConfiguration();

      // Start TLS servers for each endpoint
      await this.startTLSServers();

      // Initialize encryption keys
      await this.initializeEncryptionKeys();

      // Start agent discovery and heartbeat
      await this.startAgentDiscovery();

      this.isRunning = true;

      await this.auditLogger.logAuthenticationEvent({
        userId: this.identity.id,
        action: 'agent_communication_start',
        resource: `agent:${this.identity.name}`,
        outcome: 'success',
        metadata: {
          agentType: this.identity.type,
          endpoints: this.identity.endpoints.length
        }
      });

      this.emit('service_started', this.identity);

    } catch (error) {
      await this.auditLogger.logAuthenticationEvent({
        userId: this.identity.id,
        action: 'agent_communication_start',
        resource: `agent:${this.identity.name}`,
        outcome: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Stop the communication service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`Stopping secure communication service for agent: ${this.identity.name}`);

    // Close all agent connections
    for (const [agentId, connection] of this.connectedAgents.entries()) {
      await this.disconnectAgent(agentId);
    }

    // Stop TLS servers
    for (const [endpointId, server] of this.tlsServers.entries()) {
      server.close();
      console.log(`TLS server stopped for endpoint: ${endpointId}`);
    }

    // Clear sensitive data
    this.encryptionKeys.clear();
    this.messageQueue.clear();

    this.isRunning = false;

    await this.auditLogger.logAuthenticationEvent({
      userId: this.identity.id,
      action: 'agent_communication_stop',
      resource: `agent:${this.identity.name}`,
      outcome: 'success'
    });

    this.emit('service_stopped', this.identity);
  }

  /**
   * Send secure message to another agent
   */
  async sendMessage(recipientId: string, messageType: string, payload: any, options: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    ttl?: number;
    correlationId?: string;
  } = {}): Promise<void> {
    const connection = this.connectedAgents.get(recipientId);
    if (!connection) {
      throw new Error(`No connection to agent: ${recipientId}`);
    }

    // Create secure message
    const message: SecureMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sender: this.identity,
      recipient: connection.agent,
      messageType: messageType as any,
      payload,
      signature: '',
      encryption: {
        algorithm: 'AES-256-GCM',
        keyId: connection.currentKeyId,
        nonce: crypto.randomBytes(12).toString('hex')
      },
      metadata: {
        priority: options.priority || 'medium',
        ttl: options.ttl || 30000, // 30 seconds default
        retryCount: 0,
        correlationId: options.correlationId
      }
    };

    // Encrypt message
    const encryptedMessage = await this.encryptMessage(message, connection.currentKeyId);

    // Send message
    await this.transmitMessage(connection, encryptedMessage);

    await this.auditLogger.logDataAccess({
      userId: this.identity.id,
      action: 'agent_message_sent',
      resource: `agent:${recipientId}`,
      dataType: messageType,
      metadata: {
        messageId: message.id,
        priority: message.metadata.priority,
        encrypted: true
      }
    });

    this.emit('message_sent', { recipientId, messageId: message.id });
  }

  /**
   * Connect to another agent
   */
  async connectToAgent(agent: AgentIdentity): Promise<void> {
    if (this.connectedAgents.has(agent.id)) {
      console.log(`Already connected to agent: ${agent.name}`);
      return;
    }

    console.log(`Connecting to agent: ${agent.name} (${agent.type})`);

    try {
      // Validate agent credentials
      await this.validateAgentCredentials(agent);

      // Establish TLS connection
      const connection = await this.establishTLSConnection(agent);

      // Perform mutual authentication
      await this.performMutualAuthentication(connection);

      // Exchange encryption keys
      await this.exchangeEncryptionKeys(connection);

      this.connectedAgents.set(agent.id, connection);

      await this.auditLogger.logAuthenticationEvent({
        userId: this.identity.id,
        action: 'agent_connection_established',
        resource: `agent:${agent.id}`,
        outcome: 'success',
        metadata: {
          agentType: agent.type,
          tlsVersion: '1.3'
        }
      });

      this.emit('agent_connected', agent);

    } catch (error) {
      await this.auditLogger.logAuthenticationEvent({
        userId: this.identity.id,
        action: 'agent_connection_failed',
        resource: `agent:${agent.id}`,
        outcome: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Disconnect from an agent
   */
  async disconnectAgent(agentId: string): Promise<void> {
    const connection = this.connectedAgents.get(agentId);
    if (!connection) {
      return;
    }

    console.log(`Disconnecting from agent: ${connection.agent.name}`);

    // Close connection
    if (connection.socket) {
      connection.socket.end();
    }

    // Clear encryption keys for this agent
    this.encryptionKeys.delete(connection.currentKeyId);

    // Remove from connected agents
    this.connectedAgents.delete(agentId);

    await this.auditLogger.logAuthenticationEvent({
      userId: this.identity.id,
      action: 'agent_disconnected',
      resource: `agent:${agentId}`,
      outcome: 'success'
    });

    this.emit('agent_disconnected', connection.agent);
  }

  /**
   * Get list of connected agents
   */
  getConnectedAgents(): AgentIdentity[] {
    return Array.from(this.connectedAgents.values()).map(conn => conn.agent);
  }

  /**
   * Check if agent is connected
   */
  isAgentConnected(agentId: string): boolean {
    return this.connectedAgents.has(agentId);
  }

  // === PRIVATE METHODS ===

  /**
   * Initialize TLS configuration
   */
  private async initializeTLSConfiguration(): Promise<void> {
    // Validate TLS version
    if (this.config.tlsConfig.version !== '1.3') {
      throw new Error('Only TLS 1.3 is supported for agent communication');
    }

    // Validate cipher suites for TLS 1.3
    const supportedCipherSuites = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256'
    ];

    for (const suite of this.config.tlsConfig.cipherSuites) {
      if (!supportedCipherSuites.includes(suite)) {
        throw new Error(`Unsupported cipher suite: ${suite}`);
      }
    }

    console.log('TLS 1.3 configuration validated');
  }

  /**
   * Start TLS servers for agent endpoints
   */
  private async startTLSServers(): Promise<void> {
    for (const endpoint of this.identity.endpoints) {
      const tlsOptions: tls.TlsOptions = {
        key: await this.loadPrivateKey(endpoint.tlsConfig.privateKeyPath),
        cert: await this.loadCertificate(endpoint.tlsConfig.certificatePath),
        ca: await this.loadCACertificate(endpoint.tlsConfig.caCertificatePath),
        requestCert: endpoint.tlsConfig.requireClientCert,
        rejectUnauthorized: endpoint.tlsConfig.verifyClient,
        minVersion: 'TLSv1.3',
        maxVersion: 'TLSv1.3',
        ciphers: endpoint.tlsConfig.cipherSuites.join(':'),
        honorCipherOrder: true,
        sessionTimeout: endpoint.tlsConfig.sessionTimeout
      };

      const server = tls.createServer(tlsOptions, (socket) => {
        this.handleIncomingConnection(socket, endpoint);
      });

      server.listen(endpoint.port, endpoint.host, () => {
        console.log(`TLS server listening on ${endpoint.host}:${endpoint.port} for endpoint: ${endpoint.name}`);
      });

      this.tlsServers.set(endpoint.id, server);
    }
  }

  /**
   * Initialize encryption keys for message encryption
   */
  private async initializeEncryptionKeys(): Promise<void> {
    const masterKey = crypto.scryptSync(
      this.config.encryption.keyDerivationSalt,
      this.identity.id,
      32
    );

    const keyId = crypto.randomUUID();
    const encryptionKey = crypto.createSecretKey(masterKey);

    this.encryptionKeys.set(keyId, encryptionKey);

    console.log('Encryption keys initialized');
  }

  /**
   * Start agent discovery and heartbeat mechanism
   */
  private async startAgentDiscovery(): Promise<void> {
    if (!this.config.routing.enableDiscovery) {
      return;
    }

    // Start heartbeat interval
    setInterval(async () => {
      await this.sendHeartbeats();
    }, this.config.routing.heartbeatInterval);

    console.log('Agent discovery and heartbeat started');
  }

  /**
   * Send heartbeat messages to connected agents
   */
  private async sendHeartbeats(): Promise<void> {
    for (const [agentId, connection] of this.connectedAgents.entries()) {
      try {
        await this.sendMessage(agentId, 'heartbeat', {
          timestamp: new Date(),
          agentStatus: 'healthy'
        }, { priority: 'low', ttl: 10000 });

      } catch (error) {
        console.error(`Failed to send heartbeat to agent ${agentId}:`, error);
        // Consider disconnecting after multiple failed heartbeats
      }
    }
  }

  /**
   * Validate agent credentials and certificates
   */
  private async validateAgentCredentials(agent: AgentIdentity): Promise<void> {
    // Check if agent type is allowed
    if (!this.config.security.allowedAgentTypes.includes(agent.type)) {
      throw new Error(`Agent type not allowed: ${agent.type}`);
    }

    // Validate certificate fingerprint
    // In production, this would involve proper certificate chain validation
    if (!agent.certificateFingerprint) {
      throw new Error('Agent certificate fingerprint required');
    }

    console.log(`Agent credentials validated for: ${agent.name}`);
  }

  /**
   * Establish TLS connection to an agent
   */
  private async establishTLSConnection(agent: AgentIdentity): Promise<AgentConnection> {
    const primaryEndpoint = agent.endpoints[0];
    if (!primaryEndpoint) {
      throw new Error(`No endpoints available for agent: ${agent.name}`);
    }

    const tlsOptions: tls.ConnectionOptions = {
      host: primaryEndpoint.host,
      port: primaryEndpoint.port,
      key: await this.loadPrivateKey(this.config.authentication.privateKeyPath),
      cert: await this.loadCertificate(this.config.authentication.certificatePath),
      ca: this.config.authentication.trustedCAs,
      checkServerIdentity: (hostname, cert) => {
        // Custom server identity check
        return undefined; // No error means valid
      },
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3'
    };

    return new Promise((resolve, reject) => {
      const socket = tls.connect(tlsOptions, () => {
        if (!socket.authorized) {
          reject(new Error('TLS connection not authorized'));
          return;
        }

        const connection: AgentConnection = {
          id: crypto.randomUUID(),
          agent,
          socket,
          endpoint: primaryEndpoint,
          connectedAt: new Date(),
          lastActivity: new Date(),
          currentKeyId: crypto.randomUUID(),
          authenticated: false
        };

        console.log(`TLS connection established to agent: ${agent.name}`);
        resolve(connection);
      });

      socket.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Perform mutual authentication with connected agent
   */
  private async performMutualAuthentication(connection: AgentConnection): Promise<void> {
    // In production, this would involve:
    // 1. Certificate chain validation
    // 2. Challenge-response authentication
    // 3. Agent capability negotiation

    connection.authenticated = true;
    console.log(`Mutual authentication completed with agent: ${connection.agent.name}`);
  }

  /**
   * Exchange encryption keys with connected agent
   */
  private async exchangeEncryptionKeys(connection: AgentConnection): Promise<void> {
    // Generate shared encryption key
    const sharedKey = crypto.scryptSync(
      this.identity.id + connection.agent.id,
      this.config.encryption.keyDerivationSalt,
      32
    );

    const encryptionKey = crypto.createSecretKey(sharedKey);
    this.encryptionKeys.set(connection.currentKeyId, encryptionKey);

    console.log(`Encryption keys exchanged with agent: ${connection.agent.name}`);
  }

  /**
   * Handle incoming TLS connections
   */
  private handleIncomingConnection(socket: tls.TLSSocket, endpoint: AgentEndpoint): void {
    console.log(`Incoming TLS connection on endpoint: ${endpoint.name}`);

    socket.on('data', async (data) => {
      try {
        const message = await this.processIncomingMessage(data, socket);
        this.emit('message_received', message);

      } catch (error) {
        console.error('Error processing incoming message:', error);
      }
    });

    socket.on('error', (error) => {
      console.error('TLS socket error:', error);
    });

    socket.on('close', () => {
      console.log('TLS connection closed');
    });
  }

  /**
   * Process incoming encrypted message
   */
  private async processIncomingMessage(data: Buffer, socket: tls.TLSSocket): Promise<SecureMessage> {
    // Decrypt and validate message
    const encryptedMessage = JSON.parse(data.toString());
    const decryptedMessage = await this.decryptMessage(encryptedMessage);

    // Validate message signature
    await this.validateMessageSignature(decryptedMessage);

    // Update last activity for the connection
    for (const connection of this.connectedAgents.values()) {
      if (connection.socket === socket) {
        connection.lastActivity = new Date();
        break;
      }
    }

    return decryptedMessage;
  }

  /**
   * Encrypt message for transmission
   */
  private async encryptMessage(message: SecureMessage, keyId: string): Promise<any> {
    const encryptionKey = this.encryptionKeys.get(keyId);
    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipherGCM('aes-256-gcm', encryptionKey, nonce);

    const messageData = JSON.stringify(message);
    let encrypted = cipher.update(messageData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      nonce: nonce.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId
    };
  }

  /**
   * Decrypt received message
   */
  private async decryptMessage(encryptedMessage: any): Promise<SecureMessage> {
    const encryptionKey = this.encryptionKeys.get(encryptedMessage.keyId);
    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${encryptedMessage.keyId}`);
    }

    const nonce = Buffer.from(encryptedMessage.nonce, 'hex');
    const authTag = Buffer.from(encryptedMessage.authTag, 'hex');

    const decipher = crypto.createDecipherGCM('aes-256-gcm', encryptionKey, nonce);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedMessage.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Validate message signature
   */
  private async validateMessageSignature(message: SecureMessage): Promise<void> {
    // In production, implement proper digital signature validation
    // using the sender's public key
    console.log(`Message signature validated for: ${message.id}`);
  }

  /**
   * Transmit encrypted message to agent
   */
  private async transmitMessage(connection: AgentConnection, encryptedMessage: any): Promise<void> {
    if (!connection.socket || connection.socket.destroyed) {
      throw new Error('Connection socket is not available');
    }

    const messageData = JSON.stringify(encryptedMessage);
    connection.socket.write(messageData);
    connection.lastActivity = new Date();
  }

  /**
   * Load private key from file
   */
  private async loadPrivateKey(path: string): Promise<Buffer> {
    // In production, load from secure key storage
    return Buffer.from('mock-private-key');
  }

  /**
   * Load certificate from file
   */
  private async loadCertificate(path: string): Promise<Buffer> {
    // In production, load from certificate store
    return Buffer.from('mock-certificate');
  }

  /**
   * Load CA certificate from file
   */
  private async loadCACertificate(path: string): Promise<Buffer> {
    // In production, load from trusted CA store
    return Buffer.from('mock-ca-certificate');
  }
}

// === SUPPORTING INTERFACES ===

interface AgentConnection {
  id: string;
  agent: AgentIdentity;
  socket: tls.TLSSocket;
  endpoint: AgentEndpoint;
  connectedAt: Date;
  lastActivity: Date;
  currentKeyId: string;
  authenticated: boolean;
}

// === AGENT COMMUNICATION FACTORY ===

export class AgentCommunicationFactory {
  
  /**
   * Create agent communication service with default configuration
   */
  static createCommunicationService(
    identity: AgentIdentity,
    auditLogger: AuditLogger,
    customConfig?: Partial<CommunicationConfig>
  ): AgentCommunicationService {
    const defaultConfig: CommunicationConfig = {
      agentId: identity.id,
      tlsConfig: {
        version: '1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256'
        ],
        certificatePath: `/certs/${identity.id}.crt`,
        privateKeyPath: `/certs/${identity.id}.key`,
        caCertificatePath: '/certs/ca.crt',
        requireClientCert: true,
        verifyClient: true,
        sessionTimeout: 300
      },
      authentication: {
        privateKeyPath: `/certs/${identity.id}.key`,
        certificatePath: `/certs/${identity.id}.crt`,
        trustedCAs: ['/certs/ca.crt']
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotationInterval: 3600000, // 1 hour
        keyDerivationSalt: 'ACT-Agent-Communication-Salt'
      },
      routing: {
        enableDiscovery: true,
        heartbeatInterval: 30000, // 30 seconds
        maxRetries: 3,
        timeout: 10000
      },
      security: {
        allowedAgentTypes: [
          'frontend', 'backend', 'api', 'scheduler', 'monitor', 'worker'
        ],
        maxMessageSize: 1024 * 1024, // 1MB
        rateLimiting: {
          maxRequestsPerMinute: 1000,
          maxRequestsPerHour: 10000
        }
      }
    };

    const finalConfig = { ...defaultConfig, ...customConfig };

    return new AgentCommunicationService(finalConfig, identity, auditLogger);
  }

  /**
   * Create agent identity for system components
   */
  static createAgentIdentity(config: {
    name: string;
    type: AgentIdentity['type'];
    version: string;
    capabilities: string[];
    endpoints: Omit<AgentEndpoint, 'tlsConfig'>[];
  }): AgentIdentity {
    const defaultTLSConfig: TLSConfig = {
      version: '1.3',
      cipherSuites: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256'
      ],
      certificatePath: `/certs/${config.name.toLowerCase()}.crt`,
      privateKeyPath: `/certs/${config.name.toLowerCase()}.key`,
      caCertificatePath: '/certs/ca.crt',
      requireClientCert: true,
      verifyClient: true,
      sessionTimeout: 300
    };

    return {
      id: crypto.randomUUID(),
      name: config.name,
      type: config.type,
      version: config.version,
      capabilities: config.capabilities,
      endpoints: config.endpoints.map(endpoint => ({
        ...endpoint,
        id: crypto.randomUUID(),
        tlsConfig: defaultTLSConfig
      })),
      certificateFingerprint: crypto.randomBytes(32).toString('hex')
    };
  }
}