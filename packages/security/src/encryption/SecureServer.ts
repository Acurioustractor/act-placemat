/**
 * Secure HTTPS Server Implementation for ACT Placemat
 * 
 * Express.js server with TLS 1.3, security headers, and comprehensive
 * monitoring for end-to-end encryption enforcement
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import https from 'https';
import http from 'http';
import { TLSConfigurationService, TLSConfig } from './TLSConfig';
import { z } from 'zod';

// === SERVER CONFIGURATION SCHEMAS ===

export const SecureServerConfigSchema = z.object({
  // Server settings
  port: z.number().min(1).max(65535).default(443),
  httpPort: z.number().min(1).max(65535).default(80),
  host: z.string().default('0.0.0.0'),
  
  // Security settings
  forceHttps: z.boolean().default(true),
  redirectHttpToHttps: z.boolean().default(true),
  
  // TLS configuration
  tlsConfig: z.object({}).passthrough(), // Will be validated by TLSConfigurationService
  
  // Request limits
  requestTimeout: z.number().default(30000), // 30 seconds
  maxRequestSize: z.string().default('10mb'),
  maxHeaderSize: z.number().default(8192),
  
  // Security headers
  enableSecurityHeaders: z.boolean().default(true),
  customHeaders: z.record(z.string()).default({}),
  
  // Monitoring
  enableConnectionLogging: z.boolean().default(true),
  logFailedConnections: z.boolean().default(true),
  enableMetrics: z.boolean().default(true),
  
  // Australian compliance
  enforceDataResidency: z.boolean().default(true),
  enableAuditLogging: z.boolean().default(true)
});

export type SecureServerConfig = z.infer<typeof SecureServerConfigSchema>;

// === CONNECTION MONITORING ===

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  sslErrors: number;
  connectionsByProtocol: Record<string, number>;
  connectionsByCipher: Record<string, number>;
  averageHandshakeTime: number;
  certificateValidationFailures: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'connection_failed' | 'ssl_error' | 'certificate_error' | 'security_violation' | 'http_redirect';
  description: string;
  clientIP: string;
  userAgent?: string;
  tlsVersion?: string;
  cipher?: string;
  metadata: Record<string, any>;
}

// === SECURE SERVER IMPLEMENTATION ===

export class SecureServer {
  private app: Express;
  private config: SecureServerConfig;
  private tlsService: TLSConfigurationService;
  private httpsServer?: https.Server;
  private httpServer?: http.Server;
  
  // Monitoring
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    sslErrors: 0,
    connectionsByProtocol: {},
    connectionsByCipher: {},
    averageHandshakeTime: 0,
    certificateValidationFailures: 0
  };
  
  private securityEvents: SecurityEvent[] = [];
  private connectionStartTimes: Map<string, number> = new Map();

  constructor(config: Partial<SecureServerConfig> = {}) {
    this.config = SecureServerConfigSchema.parse(config);
    this.app = express();
    this.tlsService = new TLSConfigurationService(this.config.tlsConfig as TLSConfig);
    
    this.setupMiddleware();
    this.setupSecurityHeaders();
    this.setupErrorHandling();
  }

  // === SERVER SETUP ===

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON with size limit
    this.app.use(express.json({ 
      limit: this.config.maxRequestSize,
      verify: (req, res, buf) => {
        // Store raw body for signature verification if needed
        (req as any).rawBody = buf;
      }
    }));

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: this.config.maxRequestSize 
    }));

    // Trust proxy headers (for load balancers)
    this.app.set('trust proxy', 1);

    // Request timeout middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.setTimeout(this.config.requestTimeout);
      res.setTimeout(this.config.requestTimeout);
      next();
    });

    // Connection monitoring middleware
    if (this.config.enableConnectionLogging) {
      this.app.use(this.connectionLoggingMiddleware.bind(this));
    }

    // Security validation middleware
    this.app.use(this.securityValidationMiddleware.bind(this));
  }

  /**
   * Setup security headers middleware
   */
  private setupSecurityHeaders(): void {
    if (!this.config.enableSecurityHeaders) return;

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Get TLS security headers
      const tlsHeaders = this.tlsService.getSecurityHeaders();
      
      // Apply TLS headers
      Object.entries(tlsHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });

      // Additional security headers
      res.setHeader('X-Powered-By', 'ACT-Placemat-Secure');
      res.setHeader('X-Request-ID', this.generateRequestId());
      
      // Australian compliance headers
      if (this.config.enforceDataResidency) {
        res.setHeader('X-Data-Processing-Location', 'Australia');
        res.setHeader('X-Compliance-Framework', 'Privacy Act 1988, ISM');
      }

      // Custom headers
      Object.entries(this.config.customHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });

      next();
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      this.recordSecurityEvent('security_violation', `404 Not Found: ${req.path}`, req);
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Server error:', error);
      
      this.recordSecurityEvent('security_violation', `Server error: ${error.message}`, req);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal error occurred'
        }
      });
    });
  }

  // === MIDDLEWARE IMPLEMENTATIONS ===

  /**
   * Connection logging middleware
   */
  private connectionLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Store connection start time
    this.connectionStartTimes.set(requestId, startTime);

    // Log request details
    if (this.config.enableConnectionLogging) {
      console.log('HTTPS Request:', {
        requestId,
        method: req.method,
        url: req.url,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        tlsVersion: (req.connection as any).getProtocol?.(),
        cipher: (req.connection as any).getCipher?.(),
        timestamp: new Date().toISOString()
      });
    }

    // Monitor response completion
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.connectionStartTimes.delete(requestId);
      
      // Update metrics
      this.updateConnectionMetrics(req, responseTime);
      
      if (this.config.enableConnectionLogging) {
        console.log('HTTPS Response:', {
          requestId,
          statusCode: res.statusCode,
          responseTime,
          bytesTransferred: res.get('content-length') || 0
        });
      }
    });

    next();
  }

  /**
   * Security validation middleware
   */
  private securityValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Check if connection is secure
    if (this.config.forceHttps && !req.secure) {
      this.recordSecurityEvent('security_violation', 'Insecure HTTP request received', req);
      return res.status(400).json({
        error: {
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS connection required'
        }
      });
    }

    // Validate TLS version
    const tlsVersion = (req.connection as any).getProtocol?.();
    if (tlsVersion && !tlsVersion.startsWith('TLSv1.3') && !tlsVersion.startsWith('TLSv1.2')) {
      this.recordSecurityEvent('security_violation', `Insecure TLS version: ${tlsVersion}`, req);
      return res.status(400).json({
        error: {
          code: 'INSECURE_TLS_VERSION',
          message: 'Secure TLS version required'
        }
      });
    }

    // Check cipher strength
    const cipher = (req.connection as any).getCipher?.();
    if (cipher && this.isWeakCipher(cipher)) {
      this.recordSecurityEvent('security_violation', `Weak cipher suite: ${cipher.name}`, req);
      return res.status(400).json({
        error: {
          code: 'WEAK_CIPHER',
          message: 'Strong cipher suite required'
        }
      });
    }

    // Check request size
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = this.parseSize(this.config.maxRequestSize);
    if (contentLength > maxSize) {
      this.recordSecurityEvent('security_violation', `Request too large: ${contentLength} bytes`, req);
      return res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request payload too large'
        }
      });
    }

    next();
  }

  // === SERVER LIFECYCLE ===

  /**
   * Start the secure server
   */
  async start(): Promise<void> {
    // Validate TLS configuration
    const configValidation = this.tlsService.validateConfiguration();
    if (!configValidation.valid) {
      throw new Error(`TLS configuration invalid: ${configValidation.errors.join(', ')}`);
    }

    // Log warnings
    if (configValidation.warnings.length > 0) {
      console.warn('TLS configuration warnings:', configValidation.warnings);
    }

    // Start HTTPS server
    await this.startHttpsServer();

    // Start HTTP redirect server if configured
    if (this.config.redirectHttpToHttps) {
      await this.startHttpRedirectServer();
    }

    console.log(`Secure server started on https://${this.config.host}:${this.config.port}`);
    
    // Start certificate monitoring
    this.startCertificateMonitoring();
  }

  /**
   * Start HTTPS server
   */
  private async startHttpsServer(): Promise<void> {
    const tlsConfig = this.tlsService.getServerConfig();
    
    this.httpsServer = https.createServer(tlsConfig, this.app);

    // Connection event handlers
    this.httpsServer.on('connection', (socket) => {
      this.metrics.activeConnections++;
      this.metrics.totalConnections++;

      socket.on('close', () => {
        this.metrics.activeConnections--;
      });

      socket.on('error', (error) => {
        this.metrics.failedConnections++;
        this.recordSecurityEvent('connection_failed', `Socket error: ${error.message}`, null, {
          error: error.message
        });
      });
    });

    // TLS-specific event handlers
    this.httpsServer.on('tlsClientError', (error, socket) => {
      this.metrics.sslErrors++;
      this.recordSecurityEvent('ssl_error', `TLS client error: ${error.message}`, null, {
        error: error.message,
        clientIP: socket.remoteAddress
      });
    });

    this.httpsServer.on('secureConnection', (socket) => {
      const cipher = socket.getCipher();
      const protocol = socket.getProtocol();
      
      if (cipher) {
        this.metrics.connectionsByCipher[cipher.name] = (this.metrics.connectionsByCipher[cipher.name] || 0) + 1;
      }
      
      if (protocol) {
        this.metrics.connectionsByProtocol[protocol] = (this.metrics.connectionsByProtocol[protocol] || 0) + 1;
      }
    });

    // Start listening
    return new Promise((resolve, reject) => {
      this.httpsServer!.listen(this.config.port, this.config.host, () => {
        resolve();
      });

      this.httpsServer!.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Start HTTP redirect server
   */
  private async startHttpRedirectServer(): Promise<void> {
    this.httpServer = http.createServer((req, res) => {
      const httpsUrl = `https://${req.headers.host?.replace(`:${this.config.httpPort}`, `:${this.config.port}`)}${req.url}`;
      
      this.recordSecurityEvent('http_redirect', `Redirecting HTTP to HTTPS: ${req.url}`, req);
      
      res.writeHead(301, {
        Location: httpsUrl,
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      });
      res.end();
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.httpPort, this.config.host, () => {
        console.log(`HTTP redirect server started on http://${this.config.host}:${this.config.httpPort}`);
        resolve();
      });

      this.httpServer!.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.httpsServer) {
      promises.push(new Promise((resolve) => {
        this.httpsServer!.close(() => resolve());
      }));
    }

    if (this.httpServer) {
      promises.push(new Promise((resolve) => {
        this.httpServer!.close(() => resolve());
      }));
    }

    await Promise.all(promises);
    console.log('Secure server stopped');
  }

  // === MONITORING ===

  /**
   * Start certificate monitoring
   */
  private startCertificateMonitoring(): void {
    // Check certificate expiry every 24 hours
    setInterval(() => {
      const expiryCheck = this.tlsService.checkCertificateExpiry();
      
      if (expiryCheck.needsRenewal) {
        this.recordSecurityEvent('certificate_error', 
          `Certificate expires in ${expiryCheck.daysUntilExpiry} days`, 
          null, 
          { daysUntilExpiry: expiryCheck.daysUntilExpiry }
        );
        
        console.warn(`Certificate renewal required: expires in ${expiryCheck.daysUntilExpiry} days`);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Update connection metrics
   */
  private updateConnectionMetrics(req: Request, responseTime: number): void {
    // Update average handshake time (simplified)
    this.metrics.averageHandshakeTime = 
      (this.metrics.averageHandshakeTime + responseTime) / 2;

    // Record protocol and cipher usage
    const tlsVersion = (req.connection as any).getProtocol?.();
    const cipher = (req.connection as any).getCipher?.();
    
    if (tlsVersion) {
      this.metrics.connectionsByProtocol[tlsVersion] = 
        (this.metrics.connectionsByProtocol[tlsVersion] || 0) + 1;
    }
    
    if (cipher) {
      this.metrics.connectionsByCipher[cipher.name] = 
        (this.metrics.connectionsByCipher[cipher.name] || 0) + 1;
    }
  }

  /**
   * Record security event
   */
  private recordSecurityEvent(
    type: SecurityEvent['type'], 
    description: string, 
    req: Request | null,
    metadata: Record<string, any> = {}
  ): void {
    const event: SecurityEvent = {
      id: this.generateRequestId(),
      timestamp: new Date(),
      type,
      description,
      clientIP: req ? this.getClientIP(req) : 'unknown',
      userAgent: req?.headers['user-agent'],
      tlsVersion: req ? (req.connection as any).getProtocol?.() : undefined,
      cipher: req ? (req.connection as any).getCipher?.()?.name : undefined,
      metadata
    };

    this.securityEvents.push(event);
    
    // Keep only last 1000 events to prevent memory issues
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log high-severity events
    if (type === 'ssl_error' || type === 'certificate_error') {
      console.error('Security Event:', event);
    }
  }

  // === UTILITY METHODS ===

  /**
   * Check if cipher is considered weak
   */
  private isWeakCipher(cipher: any): boolean {
    if (!cipher || !cipher.name) return false;
    
    const weakCiphers = [
      'RC4',
      'DES',
      'MD5',
      'SHA1',
      'NULL',
      'EXPORT'
    ];
    
    return weakCiphers.some(weak => cipher.name.includes(weak));
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(size: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
    if (!match) return 0;

    return Math.floor(parseFloat(match[1]) * units[match[2]]);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // === PUBLIC API ===

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent security events
   */
  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Get TLS configuration service
   */
  getTLSService(): TLSConfigurationService {
    return this.tlsService;
  }

  /**
   * Force certificate reload
   */
  async reloadCertificates(): Promise<void> {
    // This would restart the HTTPS server with new certificates
    console.log('Certificate reload requested - requires server restart');
  }

  /**
   * Update server configuration
   */
  updateConfig(updates: Partial<SecureServerConfig>): void {
    this.config = SecureServerConfigSchema.parse({ ...this.config, ...updates });
    console.log('Server configuration updated');
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, boolean>;
    details: Record<string, any>;
  } {
    const certificateCheck = this.tlsService.checkCertificateExpiry();
    const configCheck = this.tlsService.validateConfiguration();
    
    const checks = {
      httpsListening: !!this.httpsServer?.listening,
      certificateValid: !certificateCheck.needsRenewal,
      configValid: configCheck.valid,
      lowErrorRate: this.metrics.sslErrors < this.metrics.totalConnections * 0.01
    };

    const allHealthy = Object.values(checks).every(check => check);
    const hasWarnings = certificateCheck.daysUntilExpiry < 30 || configCheck.warnings.length > 0;

    return {
      status: allHealthy ? (hasWarnings ? 'warning' : 'healthy') : 'critical',
      checks,
      details: {
        certificateExpiryDays: certificateCheck.daysUntilExpiry,
        configWarnings: configCheck.warnings,
        activeConnections: this.metrics.activeConnections,
        errorRate: this.metrics.sslErrors / Math.max(this.metrics.totalConnections, 1)
      }
    };
  }
}