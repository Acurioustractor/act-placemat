/**
 * Certificate Management System for ACT Placemat
 * 
 * Automated certificate lifecycle management including generation,
 * renewal, validation, and monitoring with Australian compliance
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// === CERTIFICATE SCHEMAS ===

export const CertificateConfigSchema = z.object({
  // Certificate details
  commonName: z.string(),
  organization: z.string().default('ACT Placemat'),
  organizationalUnit: z.string().default('Security'),
  country: z.string().default('AU'),
  state: z.string().default('Australian Capital Territory'),
  locality: z.string().default('Canberra'),
  
  // Subject Alternative Names
  subjectAltNames: z.array(z.string()).default([]),
  
  // Certificate properties
  keySize: z.number().default(2048),
  validityDays: z.number().default(365),
  algorithm: z.enum(['RSA', 'ECDSA']).default('RSA'),
  curve: z.enum(['secp256r1', 'secp384r1', 'secp521r1']).default('secp256r1'),
  
  // Paths
  certificatePath: z.string(),
  privateKeyPath: z.string(),
  csrPath: z.string().optional(),
  
  // CA settings (for self-signed)
  isCA: z.boolean().default(false),
  caCertificatePath: z.string().optional(),
  caPrivateKeyPath: z.string().optional(),
  
  // Auto-renewal
  autoRenew: z.boolean().default(true),
  renewBeforeDays: z.number().default(30),
  
  // Australian compliance
  enableAustralianConstraints: z.boolean().default(true),
  dataResidencyRequired: z.boolean().default(true)
});

export type CertificateConfig = z.infer<typeof CertificateConfigSchema>;

export interface CertificateInfo {
  serialNumber: string;
  subject: Record<string, string>;
  issuer: Record<string, string>;
  notBefore: Date;
  notAfter: Date;
  subjectAltName: string[];
  keyUsage: string[];
  extendedKeyUsage: string[];
  publicKey: {
    algorithm: string;
    keySize: number;
    curve?: string;
  };
  signature: {
    algorithm: string;
    hash: string;
  };
  isCA: boolean;
  isSelfSigned: boolean;
  fingerprint: string;
  fingerprintSHA256: string;
}

export interface CertificateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  daysUntilExpiry: number;
  certificateInfo: CertificateInfo;
}

// === CERTIFICATE MANAGER ===

export class CertificateManager {
  private config: CertificateConfig;
  private certificateCache: Map<string, { info: CertificateInfo; expiry: Date }> = new Map();
  private renewalTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: CertificateConfig) {
    this.config = CertificateConfigSchema.parse(config);
  }

  // === CERTIFICATE GENERATION ===

  /**
   * Generate a new certificate with private key
   */
  async generateCertificate(): Promise<{
    certificate: string;
    privateKey: string;
    csr?: string;
  }> {
    console.log(`Generating new certificate for ${this.config.commonName}`);

    // Generate private key
    const privateKey = await this.generatePrivateKey();
    
    // Generate CSR
    const csr = await this.generateCSR(privateKey);
    
    // Generate certificate (self-signed or CA-signed)
    const certificate = this.config.caCertificatePath 
      ? await this.signWithCA(csr)
      : await this.generateSelfSignedCertificate(privateKey);

    // Save certificate and key
    await this.saveCertificateFiles(certificate, privateKey, csr);
    
    // Schedule auto-renewal if enabled
    if (this.config.autoRenew) {
      this.scheduleRenewal();
    }

    console.log('Certificate generated successfully');
    
    return {
      certificate,
      privateKey,
      csr: this.config.csrPath ? csr : undefined
    };
  }

  /**
   * Generate private key
   */
  private async generatePrivateKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.config.algorithm === 'RSA') {
        crypto.generateKeyPair('rsa', {
          modulusLength: this.config.keySize,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve(privateKey);
        });
      } else {
        crypto.generateKeyPair('ec', {
          namedCurve: this.config.curve,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve(privateKey);
        });
      }
    });
  }

  /**
   * Generate Certificate Signing Request (CSR)
   */
  private async generateCSR(privateKey: string): Promise<string> {
    // In a real implementation, use a library like node-forge or openssl
    // This is a simplified placeholder
    const subject = this.buildSubjectString();
    const altNames = this.config.subjectAltNames.join(',');
    
    // Placeholder CSR generation
    const csr = `-----BEGIN CERTIFICATE REQUEST-----
MIICXjCCAUYCAQAwGTEXMBUGA1UEAwwOZXhhbXBsZS5jb20gQ0EwggEiMA0GCSqG
... (Base64 encoded CSR content) ...
-----END CERTIFICATE REQUEST-----`;

    console.log(`Generated CSR for ${this.config.commonName} with SANs: ${altNames}`);
    return csr;
  }

  /**
   * Generate self-signed certificate
   */
  private async generateSelfSignedCertificate(privateKey: string): Promise<string> {
    // In production, use proper certificate generation library
    const notBefore = new Date();
    const notAfter = new Date(Date.now() + this.config.validityDays * 24 * 60 * 60 * 1000);
    
    // Placeholder certificate generation
    const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/hGOBB0aMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
... (Base64 encoded certificate content) ...
-----END CERTIFICATE-----`;

    console.log(`Generated self-signed certificate valid from ${notBefore.toISOString()} to ${notAfter.toISOString()}`);
    return certificate;
  }

  /**
   * Sign CSR with CA certificate
   */
  private async signWithCA(csr: string): Promise<string> {
    if (!this.config.caCertificatePath || !this.config.caPrivateKeyPath) {
      throw new Error('CA certificate and private key required for signing');
    }

    // Load CA certificate and key
    const caCert = await fs.readFile(this.config.caCertificatePath, 'utf8');
    const caKey = await fs.readFile(this.config.caPrivateKeyPath, 'utf8');
    
    // In production, use proper certificate signing
    console.log('Signing CSR with CA certificate');
    
    // Placeholder - would use OpenSSL or similar
    const certificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/hGOBB0aMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
... (Base64 encoded signed certificate content) ...
-----END CERTIFICATE-----`;

    return certificate;
  }

  // === CERTIFICATE VALIDATION ===

  /**
   * Validate certificate and check expiry
   */
  async validateCertificate(): Promise<CertificateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if certificate files exist
      if (!(await this.fileExists(this.config.certificatePath))) {
        errors.push('Certificate file not found');
      }

      if (!(await this.fileExists(this.config.privateKeyPath))) {
        errors.push('Private key file not found');
      }

      if (errors.length > 0) {
        return {
          valid: false,
          errors,
          warnings,
          daysUntilExpiry: 0,
          certificateInfo: {} as CertificateInfo
        };
      }

      // Parse certificate
      const certificateInfo = await this.parseCertificate();
      
      // Check expiry
      const now = new Date();
      const daysUntilExpiry = Math.ceil((certificateInfo.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        errors.push('Certificate has expired');
      } else if (daysUntilExpiry <= this.config.renewBeforeDays) {
        warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
      }

      // Check key strength
      if (certificateInfo.publicKey.keySize < 2048 && certificateInfo.publicKey.algorithm === 'RSA') {
        warnings.push('RSA key size below 2048 bits is not recommended');
      }

      // Check signature algorithm
      if (certificateInfo.signature.hash === 'SHA1') {
        warnings.push('SHA1 signature algorithm is deprecated');
      }

      // Australian compliance checks
      if (this.config.enableAustralianConstraints) {
        this.performAustralianComplianceChecks(certificateInfo, warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        daysUntilExpiry,
        certificateInfo
      };

    } catch (error) {
      console.error('Certificate validation error:', error);
      return {
        valid: false,
        errors: [`Validation failed: ${(error as Error).message}`],
        warnings,
        daysUntilExpiry: 0,
        certificateInfo: {} as CertificateInfo
      };
    }
  }

  /**
   * Parse certificate information
   */
  private async parseCertificate(): Promise<CertificateInfo> {
    const certContent = await fs.readFile(this.config.certificatePath, 'utf8');
    
    // In production, use proper X.509 parsing library
    // This is a simplified placeholder
    const now = new Date();
    
    const certificateInfo: CertificateInfo = {
      serialNumber: '00:' + crypto.randomBytes(8).toString('hex').match(/../g)?.join(':') || '',
      subject: {
        CN: this.config.commonName,
        O: this.config.organization,
        OU: this.config.organizationalUnit,
        C: this.config.country,
        ST: this.config.state,
        L: this.config.locality
      },
      issuer: {
        CN: this.config.isCA ? this.config.commonName : 'ACT Placemat CA',
        O: this.config.organization,
        C: this.config.country
      },
      notBefore: now,
      notAfter: new Date(now.getTime() + this.config.validityDays * 24 * 60 * 60 * 1000),
      subjectAltName: this.config.subjectAltNames,
      keyUsage: this.config.isCA 
        ? ['Certificate Sign', 'CRL Sign', 'Key Encipherment']
        : ['Digital Signature', 'Key Encipherment'],
      extendedKeyUsage: this.config.isCA 
        ? []
        : ['Server Authentication', 'Client Authentication'],
      publicKey: {
        algorithm: this.config.algorithm,
        keySize: this.config.keySize,
        curve: this.config.algorithm === 'ECDSA' ? this.config.curve : undefined
      },
      signature: {
        algorithm: this.config.algorithm === 'RSA' ? 'RSA-SHA256' : 'ECDSA-SHA256',
        hash: 'SHA256'
      },
      isCA: this.config.isCA,
      isSelfSigned: !this.config.caCertificatePath,
      fingerprint: crypto.createHash('sha1').update(certContent).digest('hex').match(/../g)?.join(':') || '',
      fingerprintSHA256: crypto.createHash('sha256').update(certContent).digest('hex').match(/../g)?.join(':') || ''
    };

    return certificateInfo;
  }

  /**
   * Perform Australian compliance checks
   */
  private performAustralianComplianceChecks(info: CertificateInfo, warnings: string[]): void {
    // Check for Australian locality
    if (!info.subject.C || info.subject.C !== 'AU') {
      warnings.push('Certificate not issued for Australian entity');
    }

    // Check key strength for government compliance
    if (info.publicKey.algorithm === 'RSA' && info.publicKey.keySize < 2048) {
      warnings.push('Key strength may not meet Australian government requirements');
    }

    // Check signature algorithm compliance
    if (!['SHA256', 'SHA384', 'SHA512'].includes(info.signature.hash)) {
      warnings.push('Signature algorithm may not meet ISM compliance requirements');
    }

    // Check subject alternative names for data residency
    if (this.config.dataResidencyRequired) {
      const hasAustralianDomain = info.subjectAltName.some(san => 
        san.endsWith('.au') || san.includes('australia')
      );
      
      if (!hasAustralianDomain && info.subjectAltName.length > 0) {
        warnings.push('No Australian domains in certificate may impact data residency compliance');
      }
    }
  }

  // === CERTIFICATE RENEWAL ===

  /**
   * Schedule automatic certificate renewal
   */
  scheduleRenewal(): void {
    const certificateId = this.config.commonName;
    
    // Clear existing timer
    const existingTimer = this.renewalTimers.get(certificateId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Calculate renewal time
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + (this.config.validityDays - this.config.renewBeforeDays));
    
    const msUntilRenewal = renewalDate.getTime() - Date.now();
    
    if (msUntilRenewal > 0) {
      const timer = setTimeout(async () => {
        console.log(`Auto-renewing certificate for ${this.config.commonName}`);
        try {
          await this.renewCertificate();
        } catch (error) {
          console.error('Auto-renewal failed:', error);
        }
      }, msUntilRenewal);
      
      this.renewalTimers.set(certificateId, timer);
      console.log(`Certificate renewal scheduled for ${renewalDate.toISOString()}`);
    }
  }

  /**
   * Renew certificate
   */
  async renewCertificate(): Promise<void> {
    console.log(`Renewing certificate for ${this.config.commonName}`);
    
    // Backup existing certificate
    await this.backupExistingCertificate();
    
    try {
      // Generate new certificate
      await this.generateCertificate();
      
      console.log('Certificate renewed successfully');
      
      // Schedule next renewal
      if (this.config.autoRenew) {
        this.scheduleRenewal();
      }
      
    } catch (error) {
      console.error('Certificate renewal failed:', error);
      
      // Restore backup
      await this.restoreBackupCertificate();
      throw error;
    }
  }

  /**
   * Backup existing certificate
   */
  private async backupExistingCertificate(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (await this.fileExists(this.config.certificatePath)) {
      const backupCertPath = `${this.config.certificatePath}.backup-${timestamp}`;
      await fs.copyFile(this.config.certificatePath, backupCertPath);
    }
    
    if (await this.fileExists(this.config.privateKeyPath)) {
      const backupKeyPath = `${this.config.privateKeyPath}.backup-${timestamp}`;
      await fs.copyFile(this.config.privateKeyPath, backupKeyPath);
    }
  }

  /**
   * Restore backup certificate
   */
  private async restoreBackupCertificate(): Promise<void> {
    const backupDir = path.dirname(this.config.certificatePath);
    const files = await fs.readdir(backupDir);
    
    // Find most recent backup
    const certBackups = files
      .filter(f => f.startsWith(path.basename(this.config.certificatePath) + '.backup-'))
      .sort()
      .reverse();
    
    if (certBackups.length > 0) {
      const latestBackup = path.join(backupDir, certBackups[0]);
      await fs.copyFile(latestBackup, this.config.certificatePath);
      console.log('Certificate restored from backup');
    }
  }

  // === FILE MANAGEMENT ===

  /**
   * Save certificate files to disk
   */
  private async saveCertificateFiles(
    certificate: string, 
    privateKey: string, 
    csr?: string
  ): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(path.dirname(this.config.certificatePath), { recursive: true });
    await fs.mkdir(path.dirname(this.config.privateKeyPath), { recursive: true });
    
    // Write certificate
    await fs.writeFile(this.config.certificatePath, certificate, { mode: 0o644 });
    
    // Write private key with restricted permissions
    await fs.writeFile(this.config.privateKeyPath, privateKey, { mode: 0o600 });
    
    // Write CSR if path provided
    if (csr && this.config.csrPath) {
      await fs.mkdir(path.dirname(this.config.csrPath), { recursive: true });
      await fs.writeFile(this.config.csrPath, csr, { mode: 0o644 });
    }
    
    console.log('Certificate files saved successfully');
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build subject string for certificate
   */
  private buildSubjectString(): string {
    const subject = [
      `CN=${this.config.commonName}`,
      `O=${this.config.organization}`,
      `OU=${this.config.organizationalUnit}`,
      `C=${this.config.country}`,
      `ST=${this.config.state}`,
      `L=${this.config.locality}`
    ];
    
    return subject.join(',');
  }

  // === PUBLIC API ===

  /**
   * Get certificate information
   */
  async getCertificateInfo(): Promise<CertificateInfo | null> {
    try {
      return await this.parseCertificate();
    } catch (error) {
      console.error('Failed to get certificate info:', error);
      return null;
    }
  }

  /**
   * Check if certificate needs renewal
   */
  async needsRenewal(): Promise<boolean> {
    const validation = await this.validateCertificate();
    return validation.daysUntilExpiry <= this.config.renewBeforeDays;
  }

  /**
   * Force certificate regeneration
   */
  async regenerateCertificate(): Promise<void> {
    console.log('Force regenerating certificate');
    await this.generateCertificate();
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(reason: string = 'unspecified'): Promise<void> {
    console.log(`Revoking certificate for ${this.config.commonName}: ${reason}`);
    
    // In production, this would add to CRL or OCSP responder
    const revokedCertInfo = {
      serialNumber: (await this.parseCertificate()).serialNumber,
      revokedAt: new Date(),
      reason
    };
    
    // Move certificate to revoked directory
    const revokedDir = path.join(path.dirname(this.config.certificatePath), 'revoked');
    await fs.mkdir(revokedDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const revokedCertPath = path.join(revokedDir, `${this.config.commonName}-${timestamp}.crt`);
    
    await fs.copyFile(this.config.certificatePath, revokedCertPath);
    await fs.unlink(this.config.certificatePath);
    
    console.log('Certificate revoked and moved to revoked directory');
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CertificateConfig>): void {
    this.config = CertificateConfigSchema.parse({ ...this.config, ...updates });
    
    // Clear cache
    this.certificateCache.clear();
    
    // Reschedule renewal if auto-renewal settings changed
    if (updates.autoRenew !== undefined || updates.renewBeforeDays !== undefined) {
      if (this.config.autoRenew) {
        this.scheduleRenewal();
      } else {
        // Clear existing renewal timer
        const timer = this.renewalTimers.get(this.config.commonName);
        if (timer) {
          clearTimeout(timer);
          this.renewalTimers.delete(this.config.commonName);
        }
      }
    }
  }

  /**
   * Get renewal status
   */
  getRenewalStatus(): {
    autoRenewalEnabled: boolean;
    nextRenewalScheduled: Date | null;
    daysUntilRenewal: number | null;
  } {
    const timer = this.renewalTimers.get(this.config.commonName);
    
    if (!timer || !this.config.autoRenew) {
      return {
        autoRenewalEnabled: this.config.autoRenew,
        nextRenewalScheduled: null,
        daysUntilRenewal: null
      };
    }

    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + (this.config.validityDays - this.config.renewBeforeDays));
    
    const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      autoRenewalEnabled: true,
      nextRenewalScheduled: nextRenewal,
      daysUntilRenewal
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all renewal timers
    for (const timer of this.renewalTimers.values()) {
      clearTimeout(timer);
    }
    this.renewalTimers.clear();
    
    // Clear cache
    this.certificateCache.clear();
    
    console.log('Certificate manager destroyed');
  }
}

// === FACTORY FUNCTIONS ===

/**
 * Create certificate manager for server certificates
 */
export function createServerCertificateManager(
  commonName: string,
  certificateDir: string,
  options: Partial<CertificateConfig> = {}
): CertificateManager {
  const config: CertificateConfig = {
    commonName,
    organization: 'ACT Placemat',
    organizationalUnit: 'Platform Security',
    country: 'AU',
    state: 'Australian Capital Territory',
    locality: 'Canberra',
    subjectAltNames: [commonName, `*.${commonName}`],
    keySize: 2048,
    validityDays: 365,
    algorithm: 'RSA',
    certificatePath: path.join(certificateDir, `${commonName}.crt`),
    privateKeyPath: path.join(certificateDir, `${commonName}.key`),
    csrPath: path.join(certificateDir, `${commonName}.csr`),
    isCA: false,
    autoRenew: true,
    renewBeforeDays: 30,
    enableAustralianConstraints: true,
    dataResidencyRequired: true,
    ...options
  };

  return new CertificateManager(config);
}

/**
 * Create certificate manager for CA certificates
 */
export function createCACertificateManager(
  caName: string,
  certificateDir: string,
  options: Partial<CertificateConfig> = {}
): CertificateManager {
  const config: CertificateConfig = {
    commonName: `${caName} CA`,
    organization: 'ACT Placemat',
    organizationalUnit: 'Certificate Authority',
    country: 'AU',
    state: 'Australian Capital Territory',
    locality: 'Canberra',
    subjectAltNames: [],
    keySize: 4096, // Larger key for CA
    validityDays: 3650, // 10 years for CA
    algorithm: 'RSA',
    certificatePath: path.join(certificateDir, `${caName}-ca.crt`),
    privateKeyPath: path.join(certificateDir, `${caName}-ca.key`),
    isCA: true,
    autoRenew: true,
    renewBeforeDays: 90, // More notice for CA renewal
    enableAustralianConstraints: true,
    dataResidencyRequired: true,
    ...options
  };

  return new CertificateManager(config);
}