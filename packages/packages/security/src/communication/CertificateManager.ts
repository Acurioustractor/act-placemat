/**
 * Certificate Manager for Agent Communication
 * 
 * Manages TLS certificates for mutual authentication between agents,
 * including certificate generation, validation, rotation, and revocation
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { AuditLogger } from '../audit/AuditLogger';

// === CERTIFICATE INTERFACES ===

export interface Certificate {
  id: string;
  subject: CertificateSubject;
  issuer: CertificateSubject;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  publicKey: string;
  extensions: CertificateExtension[];
  status: 'active' | 'revoked' | 'expired' | 'pending';
}

export interface CertificateSubject {
  commonName: string;
  organizationName: string;
  organizationalUnit: string;
  country: string;
  state: string;
  locality: string;
}

export interface CertificateExtension {
  oid: string;
  critical: boolean;
  value: string;
}

export interface CertificateRequest {
  agentId: string;
  agentName: string;
  agentType: string;
  subject: CertificateSubject;
  keyUsage: string[];
  extendedKeyUsage: string[];
  subjectAlternativeNames: string[];
  validityPeriod: number; // days
}

export interface CertificateRevocation {
  certificateId: string;
  reason: 'unspecified' | 'keyCompromise' | 'caCompromise' | 'affiliationChanged' | 'superseded' | 'cessationOfOperation';
  revokedAt: Date;
  revokedBy: string;
}

export interface CertificateStore {
  certificates: Map<string, Certificate>;
  privateKeys: Map<string, string>;
  revocationList: CertificateRevocation[];
  trustedCAs: Certificate[];
}

// === CERTIFICATE MANAGER ===

export class CertificateManager extends EventEmitter {
  private store: CertificateStore;
  private auditLogger: AuditLogger;
  private config: CertificateManagerConfig;
  private certificatesPath: string;
  private privateKeysPath: string;
  private caKeyPath: string;
  private caCertPath: string;

  constructor(config: CertificateManagerConfig, auditLogger: AuditLogger) {
    super();
    this.config = config;
    this.auditLogger = auditLogger;
    this.certificatesPath = path.join(config.baseDirectory, 'certificates');
    this.privateKeysPath = path.join(config.baseDirectory, 'private-keys');
    this.caKeyPath = path.join(config.baseDirectory, 'ca', 'ca.key');
    this.caCertPath = path.join(config.baseDirectory, 'ca', 'ca.crt');
    
    this.store = {
      certificates: new Map(),
      privateKeys: new Map(),
      revocationList: [],
      trustedCAs: []
    };
  }

  /**
   * Initialize certificate manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing certificate manager...');

    try {
      // Create directory structure
      await this.createDirectoryStructure();

      // Initialize CA if not exists
      await this.initializeCA();

      // Load existing certificates
      await this.loadExistingCertificates();

      // Start certificate monitoring
      this.startCertificateMonitoring();

      await this.auditLogger.logSystemEvent({
        action: 'certificate_manager_initialized',
        resource: 'certificate_manager',
        outcome: 'success',
        metadata: {
          certificatesLoaded: this.store.certificates.size,
          trustedCAs: this.store.trustedCAs.length
        }
      });

      console.log('Certificate manager initialized successfully');

    } catch (error) {
      await this.auditLogger.logSystemEvent({
        action: 'certificate_manager_initialization_failed',
        resource: 'certificate_manager',
        outcome: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Generate certificate for agent
   */
  async generateAgentCertificate(request: CertificateRequest): Promise<{
    certificate: Certificate;
    privateKey: string;
    certificatePem: string;
  }> {
    console.log(`Generating certificate for agent: ${request.agentName}`);

    try {
      // Generate key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Create certificate
      const certificate = await this.createCertificate(request, publicKey, privateKey);

      // Store certificate and private key
      await this.storeCertificate(certificate, privateKey);

      // Generate PEM format
      const certificatePem = await this.generateCertificatePEM(certificate);

      await this.auditLogger.logSystemEvent({
        action: 'certificate_generated',
        resource: `agent:${request.agentId}`,
        outcome: 'success',
        metadata: {
          agentName: request.agentName,
          agentType: request.agentType,
          validityPeriod: request.validityPeriod,
          fingerprint: certificate.fingerprint
        }
      });

      this.emit('certificate_generated', { certificate, agentId: request.agentId });

      return {
        certificate,
        privateKey,
        certificatePem
      };

    } catch (error) {
      await this.auditLogger.logSystemEvent({
        action: 'certificate_generation_failed',
        resource: `agent:${request.agentId}`,
        outcome: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Validate certificate
   */
  async validateCertificate(certificateId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const certificate = this.store.certificates.get(certificateId);
    if (!certificate) {
      return {
        isValid: false,
        errors: ['Certificate not found'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check expiration
    const now = new Date();
    if (certificate.validTo < now) {
      errors.push('Certificate has expired');
    } else if (certificate.validTo.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
      warnings.push('Certificate will expire within 30 days');
    }

    // Check revocation status
    const isRevoked = this.store.revocationList.some(rev => rev.certificateId === certificateId);
    if (isRevoked) {
      errors.push('Certificate has been revoked');
    }

    // Check certificate chain
    const chainValid = await this.validateCertificateChain(certificate);
    if (!chainValid) {
      errors.push('Certificate chain validation failed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certificateId: string, reason: CertificateRevocation['reason'], revokedBy: string): Promise<void> {
    const certificate = this.store.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    if (certificate.status === 'revoked') {
      throw new Error('Certificate is already revoked');
    }

    console.log(`Revoking certificate: ${certificateId}`);

    // Add to revocation list
    const revocation: CertificateRevocation = {
      certificateId,
      reason,
      revokedAt: new Date(),
      revokedBy
    };

    this.store.revocationList.push(revocation);

    // Update certificate status
    certificate.status = 'revoked';

    // Save revocation list
    await this.saveRevocationList();

    await this.auditLogger.logSystemEvent({
      action: 'certificate_revoked',
      resource: `certificate:${certificateId}`,
      outcome: 'success',
      metadata: {
        reason,
        revokedBy,
        fingerprint: certificate.fingerprint
      }
    });

    this.emit('certificate_revoked', { certificateId, reason });
  }

  /**
   * Renew certificate
   */
  async renewCertificate(certificateId: string, validityPeriod?: number): Promise<{
    certificate: Certificate;
    privateKey: string;
    certificatePem: string;
  }> {
    const oldCertificate = this.store.certificates.get(certificateId);
    if (!oldCertificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    console.log(`Renewing certificate: ${certificateId}`);

    // Create renewal request based on existing certificate
    const renewalRequest: CertificateRequest = {
      agentId: certificateId,
      agentName: oldCertificate.subject.commonName,
      agentType: 'agent', // Extract from certificate if available
      subject: oldCertificate.subject,
      keyUsage: ['digitalSignature', 'keyEncipherment'],
      extendedKeyUsage: ['serverAuth', 'clientAuth'],
      subjectAlternativeNames: [],
      validityPeriod: validityPeriod || this.config.defaultValidityPeriod
    };

    // Generate new certificate
    const result = await this.generateAgentCertificate(renewalRequest);

    // Revoke old certificate
    await this.revokeCertificate(certificateId, 'superseded', 'system');

    await this.auditLogger.logSystemEvent({
      action: 'certificate_renewed',
      resource: `certificate:${certificateId}`,
      outcome: 'success',
      metadata: {
        oldFingerprint: oldCertificate.fingerprint,
        newFingerprint: result.certificate.fingerprint
      }
    });

    return result;
  }

  /**
   * Get certificate by ID
   */
  getCertificate(certificateId: string): Certificate | null {
    return this.store.certificates.get(certificateId) || null;
  }

  /**
   * List certificates with optional filters
   */
  listCertificates(filters: {
    status?: Certificate['status'];
    agentType?: string;
    expiringWithinDays?: number;
  } = {}): Certificate[] {
    let certificates = Array.from(this.store.certificates.values());

    if (filters.status) {
      certificates = certificates.filter(cert => cert.status === filters.status);
    }

    if (filters.expiringWithinDays) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + filters.expiringWithinDays);
      certificates = certificates.filter(cert => cert.validTo <= thresholdDate);
    }

    return certificates;
  }

  /**
   * Get trusted CA certificates
   */
  getTrustedCAs(): Certificate[] {
    return [...this.store.trustedCAs];
  }

  /**
   * Export certificate in PEM format
   */
  async exportCertificatePEM(certificateId: string): Promise<string> {
    const certificate = this.store.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    return await this.generateCertificatePEM(certificate);
  }

  /**
   * Import certificate from PEM
   */
  async importCertificatePEM(pemData: string, agentId: string): Promise<Certificate> {
    // Parse PEM and create certificate object
    const certificate = await this.parseCertificatePEM(pemData, agentId);

    // Validate certificate
    const validation = await this.validateCertificate(certificate.id);
    if (!validation.isValid) {
      throw new Error(`Invalid certificate: ${validation.errors.join(', ')}`);
    }

    // Store certificate
    this.store.certificates.set(certificate.id, certificate);

    await this.auditLogger.logSystemEvent({
      action: 'certificate_imported',
      resource: `certificate:${certificate.id}`,
      outcome: 'success',
      metadata: {
        fingerprint: certificate.fingerprint,
        agentId
      }
    });

    return certificate;
  }

  // === PRIVATE METHODS ===

  /**
   * Create directory structure for certificates
   */
  private async createDirectoryStructure(): Promise<void> {
    const dirs = [
      this.config.baseDirectory,
      this.certificatesPath,
      this.privateKeysPath,
      path.join(this.config.baseDirectory, 'ca'),
      path.join(this.config.baseDirectory, 'crl')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  /**
   * Initialize Certificate Authority
   */
  private async initializeCA(): Promise<void> {
    try {
      // Check if CA already exists
      await fs.access(this.caCertPath);
      console.log('CA certificate already exists, loading...');
      await this.loadCACertificate();

    } catch (error) {
      console.log('Creating new CA certificate...');
      await this.createCACertificate();
    }
  }

  /**
   * Create CA certificate
   */
  private async createCACertificate(): Promise<void> {
    // Generate CA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Create CA certificate
    const caCert: Certificate = {
      id: 'ca-root',
      subject: {
        commonName: 'ACT Placemat Root CA',
        organizationName: 'ACT Placemat',
        organizationalUnit: 'Security',
        country: 'AU',
        state: 'ACT',
        locality: 'Canberra'
      },
      issuer: {
        commonName: 'ACT Placemat Root CA',
        organizationName: 'ACT Placemat',
        organizationalUnit: 'Security',
        country: 'AU',
        state: 'ACT',
        locality: 'Canberra'
      },
      serialNumber: '1',
      validFrom: new Date(),
      validTo: new Date(Date.now() + this.config.caValidityPeriod * 24 * 60 * 60 * 1000),
      fingerprint: crypto.createHash('sha256').update(publicKey).digest('hex'),
      publicKey,
      extensions: [
        {
          oid: '2.5.29.19', // Basic Constraints
          critical: true,
          value: 'CA:TRUE'
        },
        {
          oid: '2.5.29.15', // Key Usage
          critical: true,
          value: 'keyCertSign,cRLSign'
        }
      ],
      status: 'active'
    };

    // Save CA certificate and private key
    await fs.writeFile(this.caCertPath, await this.generateCertificatePEM(caCert));
    await fs.writeFile(this.caKeyPath, privateKey);

    // Add to trusted CAs
    this.store.trustedCAs.push(caCert);

    console.log('CA certificate created successfully');
  }

  /**
   * Load existing CA certificate
   */
  private async loadCACertificate(): Promise<void> {
    const caCertPem = await fs.readFile(this.caCertPath, 'utf8');
    const caCert = await this.parseCertificatePEM(caCertPem, 'ca-root');
    this.store.trustedCAs.push(caCert);
  }

  /**
   * Load existing certificates from disk
   */
  private async loadExistingCertificates(): Promise<void> {
    try {
      const certFiles = await fs.readdir(this.certificatesPath);
      
      for (const file of certFiles) {
        if (file.endsWith('.crt')) {
          const certPath = path.join(this.certificatesPath, file);
          const certPem = await fs.readFile(certPath, 'utf8');
          const agentId = path.basename(file, '.crt');
          
          try {
            const certificate = await this.parseCertificatePEM(certPem, agentId);
            this.store.certificates.set(certificate.id, certificate);
          } catch (error) {
            console.error(`Failed to load certificate ${file}:`, error);
          }
        }
      }

      console.log(`Loaded ${this.store.certificates.size} certificates`);

    } catch (error) {
      console.log('No existing certificates found');
    }
  }

  /**
   * Start certificate monitoring for expiration and renewal
   */
  private startCertificateMonitoring(): void {
    // Check certificates every hour
    setInterval(async () => {
      await this.checkCertificateExpiration();
    }, 60 * 60 * 1000);

    console.log('Certificate monitoring started');
  }

  /**
   * Check for expiring certificates
   */
  private async checkCertificateExpiration(): Promise<void> {
    const expiringCertificates = this.listCertificates({
      status: 'active',
      expiringWithinDays: this.config.renewalThresholdDays
    });

    for (const certificate of expiringCertificates) {
      const daysUntilExpiry = Math.ceil(
        (certificate.validTo.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
      );

      if (this.config.autoRenewal && daysUntilExpiry <= this.config.autoRenewalThresholdDays) {
        try {
          await this.renewCertificate(certificate.id);
          console.log(`Auto-renewed certificate: ${certificate.id}`);
        } catch (error) {
          console.error(`Failed to auto-renew certificate ${certificate.id}:`, error);
        }
      } else {
        this.emit('certificate_expiring', { 
          certificate, 
          daysUntilExpiry 
        });
      }
    }
  }

  /**
   * Create certificate from request
   */
  private async createCertificate(request: CertificateRequest, publicKey: string, privateKey: string): Promise<Certificate> {
    const now = new Date();
    const validTo = new Date(now.getTime() + request.validityPeriod * 24 * 60 * 60 * 1000);

    const certificate: Certificate = {
      id: request.agentId,
      subject: request.subject,
      issuer: this.store.trustedCAs[0]?.subject || request.subject,
      serialNumber: crypto.randomBytes(16).toString('hex'),
      validFrom: now,
      validTo,
      fingerprint: crypto.createHash('sha256').update(publicKey).digest('hex'),
      publicKey,
      extensions: [
        {
          oid: '2.5.29.15', // Key Usage
          critical: true,
          value: request.keyUsage.join(',')
        },
        {
          oid: '2.5.29.37', // Extended Key Usage
          critical: false,
          value: request.extendedKeyUsage.join(',')
        },
        {
          oid: '2.5.29.17', // Subject Alternative Name
          critical: false,
          value: request.subjectAlternativeNames.join(',')
        }
      ],
      status: 'active'
    };

    return certificate;
  }

  /**
   * Store certificate and private key
   */
  private async storeCertificate(certificate: Certificate, privateKey: string): Promise<void> {
    // Store certificate
    this.store.certificates.set(certificate.id, certificate);

    // Store private key
    this.store.privateKeys.set(certificate.id, privateKey);

    // Save to disk
    const certPath = path.join(this.certificatesPath, `${certificate.id}.crt`);
    const keyPath = path.join(this.privateKeysPath, `${certificate.id}.key`);

    await fs.writeFile(certPath, await this.generateCertificatePEM(certificate));
    await fs.writeFile(keyPath, privateKey);
  }

  /**
   * Generate certificate in PEM format
   */
  private async generateCertificatePEM(certificate: Certificate): Promise<string> {
    // In production, this would generate proper X.509 PEM format
    // For now, return a mock PEM structure
    return `-----BEGIN CERTIFICATE-----
${Buffer.from(JSON.stringify({
  id: certificate.id,
  subject: certificate.subject,
  fingerprint: certificate.fingerprint,
  validFrom: certificate.validFrom,
  validTo: certificate.validTo
})).toString('base64')}
-----END CERTIFICATE-----`;
  }

  /**
   * Parse certificate from PEM format
   */
  private async parseCertificatePEM(pemData: string, agentId: string): Promise<Certificate> {
    // Extract certificate data from PEM
    const base64Data = pemData
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '');

    const certData = JSON.parse(Buffer.from(base64Data, 'base64').toString());

    return {
      id: agentId,
      subject: certData.subject,
      issuer: certData.subject, // Self-signed for mock
      serialNumber: certData.id,
      validFrom: new Date(certData.validFrom),
      validTo: new Date(certData.validTo),
      fingerprint: certData.fingerprint,
      publicKey: '',
      extensions: [],
      status: 'active'
    };
  }

  /**
   * Validate certificate chain
   */
  private async validateCertificateChain(certificate: Certificate): Promise<boolean> {
    // In production, implement proper certificate chain validation
    // Check if certificate is signed by trusted CA
    return this.store.trustedCAs.some(ca => 
      ca.subject.commonName === certificate.issuer.commonName
    );
  }

  /**
   * Save revocation list to disk
   */
  private async saveRevocationList(): Promise<void> {
    const crlPath = path.join(this.config.baseDirectory, 'crl', 'revoked.json');
    await fs.writeFile(crlPath, JSON.stringify(this.store.revocationList, null, 2));
  }
}

// === CERTIFICATE MANAGER CONFIG ===

export interface CertificateManagerConfig {
  baseDirectory: string;
  defaultValidityPeriod: number; // days
  caValidityPeriod: number; // days
  renewalThresholdDays: number;
  autoRenewal: boolean;
  autoRenewalThresholdDays: number;
  keySize: number;
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
}

// === CERTIFICATE MANAGER FACTORY ===

export class CertificateManagerFactory {
  
  /**
   * Create certificate manager with default configuration
   */
  static createCertificateManager(auditLogger: AuditLogger, customConfig?: Partial<CertificateManagerConfig>): CertificateManager {
    const defaultConfig: CertificateManagerConfig = {
      baseDirectory: './certs',
      defaultValidityPeriod: 365, // 1 year
      caValidityPeriod: 3650, // 10 years
      renewalThresholdDays: 30,
      autoRenewal: true,
      autoRenewalThresholdDays: 7,
      keySize: 4096,
      hashAlgorithm: 'sha256'
    };

    const finalConfig = { ...defaultConfig, ...customConfig };

    return new CertificateManager(finalConfig, auditLogger);
  }
}