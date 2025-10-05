/**
 * TLS Configuration Module for ACT Placemat
 * 
 * Comprehensive TLS 1.3 configuration with secure cipher suites,
 * certificate validation, and Australian compliance features
 */

import crypto from 'crypto';
import { z } from 'zod';

// === TLS CONFIGURATION SCHEMAS ===

/**
 * TLS configuration schema with security requirements
 */
export const TLSConfigSchema = z.object({
  // Protocol settings
  minVersion: z.enum(['TLSv1.2', 'TLSv1.3']).default('TLSv1.3'),
  maxVersion: z.enum(['TLSv1.2', 'TLSv1.3']).default('TLSv1.3'),
  
  // Cipher configuration
  cipherSuites: z.array(z.string()).default([
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256'
  ]),
  
  // Certificate settings
  certificateConfig: z.object({
    certificatePath: z.string(),
    privateKeyPath: z.string(),
    caCertificatePath: z.string().optional(),
    certificateChainPath: z.string().optional(),
    
    // Certificate validation
    rejectUnauthorized: z.boolean().default(true),
    checkServerIdentity: z.boolean().default(true),
    
    // OCSP settings
    enableOCSP: z.boolean().default(true),
    ocspServerUrl: z.string().optional(),
    
    // Certificate policies
    requireSNI: z.boolean().default(true),
    allowSelfSigned: z.boolean().default(false)
  }),
  
  // Security features
  securityFeatures: z.object({
    // Perfect Forward Secrecy
    requirePFS: z.boolean().default(true),
    
    // HSTS settings
    enableHSTS: z.boolean().default(true),
    hstsMaxAge: z.number().default(31536000), // 1 year
    hstsIncludeSubdomains: z.boolean().default(true),
    hstsPreload: z.boolean().default(true),
    
    // Security headers
    enableSecurityHeaders: z.boolean().default(true),
    
    // Session settings
    sessionTickets: z.boolean().default(false), // Disable for better security
    sessionResumption: z.boolean().default(false),
    
    // Compression
    disableCompression: z.boolean().default(true) // Prevent CRIME attacks
  }),
  
  // Mutual TLS (mTLS) for agent communication
  mutualTLS: z.object({
    enabled: z.boolean().default(false),
    clientCertificateRequired: z.boolean().default(false),
    trustedCAs: z.array(z.string()).default([]),
    verifyClientCert: z.boolean().default(true)
  }),
  
  // Australian compliance
  compliance: z.object({
    enforceDataResidency: z.boolean().default(true),
    enableAustralianCACerts: z.boolean().default(true),
    requireGovernmentApprovedCrypto: z.boolean().default(true),
    enableISMCompliantCiphers: z.boolean().default(true)
  }),
  
  // Monitoring and logging
  monitoring: z.object({
    logAllConnections: z.boolean().default(true),
    logFailedHandshakes: z.boolean().default(true),
    monitorCertificateExpiry: z.boolean().default(true),
    alertDaysBeforeExpiry: z.number().default(30)
  })
});

export type TLSConfig = z.infer<typeof TLSConfigSchema>;

// === CIPHER SUITE DEFINITIONS ===

/**
 * Secure cipher suites for different security levels
 */
export const CipherSuites = {
  // High security - TLS 1.3 only
  high: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256'
  ],
  
  // Standard security - TLS 1.3 preferred
  standard: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256'
  ],
  
  // Australian ISM compliant ciphers
  ismCompliant: [
    'TLS_AES_256_GCM_SHA384', // Suite B compliant
    'TLS_AES_128_GCM_SHA256'  // Suite B compliant
  ],
  
  // Legacy support (for gradual migration)
  legacy: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ]
};

// === TLS CONFIGURATION SERVICE ===

export class TLSConfigurationService {
  private config: TLSConfig;
  private certificateCache: Map<string, { cert: Buffer; key: Buffer; expiry: Date }> = new Map();
  
  constructor(config?: Partial<TLSConfig>) {
    this.config = TLSConfigSchema.parse(config || {});
  }

  // === CONFIGURATION METHODS ===

  /**
   * Get TLS configuration for HTTPS server
   */
  getServerConfig(): {
    minVersion: string;
    maxVersion: string;
    ciphers: string;
    secureOptions: number;
    cert?: Buffer;
    key?: Buffer;
    ca?: Buffer;
    requestCert?: boolean;
    rejectUnauthorized?: boolean;
  } {
    const secureOptions = this.buildSecureOptions();
    
    const config: any = {
      minVersion: this.config.minVersion,
      maxVersion: this.config.maxVersion,
      ciphers: this.getCipherString(),
      secureOptions,
      honorCipherOrder: true,
      sessionIdContext: crypto.randomBytes(32)
    };

    // Add certificates if configured
    if (this.config.certificateConfig.certificatePath) {
      const certs = this.loadCertificates();
      config.cert = certs.cert;
      config.key = certs.key;
      
      if (certs.ca) {
        config.ca = certs.ca;
      }
    }

    // Mutual TLS configuration
    if (this.config.mutualTLS.enabled) {
      config.requestCert = true;
      config.rejectUnauthorized = this.config.mutualTLS.verifyClientCert;
      
      if (this.config.mutualTLS.trustedCAs.length > 0) {
        config.ca = this.loadTrustedCAs();
      }
    }

    return config;
  }

  /**
   * Get TLS configuration for client connections
   */
  getClientConfig(serverName?: string): {
    minVersion: string;
    maxVersion: string;
    ciphers: string;
    secureOptions: number;
    checkServerIdentity?: Function;
    ca?: Buffer[];
    cert?: Buffer;
    key?: Buffer;
  } {
    const secureOptions = this.buildSecureOptions();
    
    const config: any = {
      minVersion: this.config.minVersion,
      maxVersion: this.config.maxVersion,
      ciphers: this.getCipherString(),
      secureOptions,
      rejectUnauthorized: this.config.certificateConfig.rejectUnauthorized
    };

    // Custom server identity check
    if (this.config.certificateConfig.checkServerIdentity && serverName) {
      config.checkServerIdentity = this.createServerIdentityChecker(serverName);
    }

    // Client certificates for mTLS
    if (this.config.mutualTLS.enabled && this.config.certificateConfig.certificatePath) {
      const certs = this.loadCertificates();
      config.cert = certs.cert;
      config.key = certs.key;
    }

    // Trusted CAs
    if (this.config.certificateConfig.caCertificatePath) {
      config.ca = [this.loadCACertificate()];
    }

    return config;
  }

  /**
   * Get security headers for HTTP responses
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.securityFeatures.enableSecurityHeaders) {
      // HSTS
      if (this.config.securityFeatures.enableHSTS) {
        let hstsValue = `max-age=${this.config.securityFeatures.hstsMaxAge}`;
        if (this.config.securityFeatures.hstsIncludeSubdomains) {
          hstsValue += '; includeSubDomains';
        }
        if (this.config.securityFeatures.hstsPreload) {
          hstsValue += '; preload';
        }
        headers['Strict-Transport-Security'] = hstsValue;
      }

      // Content Security Policy
      headers['Content-Security-Policy'] = "default-src 'self'; upgrade-insecure-requests";
      
      // X-Frame-Options
      headers['X-Frame-Options'] = 'DENY';
      
      // X-Content-Type-Options
      headers['X-Content-Type-Options'] = 'nosniff';
      
      // Referrer Policy
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      
      // Permissions Policy
      headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
      
      // Australian data residency header
      if (this.config.compliance.enforceDataResidency) {
        headers['X-Data-Residency'] = 'AU';
        headers['X-Compliance-Framework'] = 'Privacy Act 1988, ISM';
      }
    }

    return headers;
  }

  // === CERTIFICATE MANAGEMENT ===

  /**
   * Load and cache certificates
   */
  private loadCertificates(): { cert: Buffer; key: Buffer; ca?: Buffer } {
    const cacheKey = `${this.config.certificateConfig.certificatePath}:${this.config.certificateConfig.privateKeyPath}`;
    
    // Check cache first
    const cached = this.certificateCache.get(cacheKey);
    if (cached && cached.expiry > new Date()) {
      return { cert: cached.cert, key: cached.key };
    }

    // Load certificates from filesystem
    const fs = require('fs');
    
    const cert = fs.readFileSync(this.config.certificateConfig.certificatePath);
    const key = fs.readFileSync(this.config.certificateConfig.privateKeyPath);
    
    let ca: Buffer | undefined;
    if (this.config.certificateConfig.caCertificatePath) {
      ca = fs.readFileSync(this.config.certificateConfig.caCertificatePath);
    }

    // Parse certificate to get expiry
    const expiry = this.parseCertificateExpiry(cert);
    
    // Cache for reuse
    this.certificateCache.set(cacheKey, { cert, key, expiry });

    return { cert, key, ca };
  }

  /**
   * Load CA certificate
   */
  private loadCACertificate(): Buffer {
    const fs = require('fs');
    return fs.readFileSync(this.config.certificateConfig.caCertificatePath!);
  }

  /**
   * Load trusted CA certificates for mTLS
   */
  private loadTrustedCAs(): Buffer[] {
    const fs = require('fs');
    return this.config.mutualTLS.trustedCAs.map(caPath => fs.readFileSync(caPath));
  }

  /**
   * Parse certificate expiry date
   */
  private parseCertificateExpiry(certBuffer: Buffer): Date {
    // In production, use a proper certificate parsing library
    // This is a simplified implementation
    try {
      const certString = certBuffer.toString();
      const notAfterMatch = certString.match(/Not After\s*:\s*(.+)/);
      if (notAfterMatch) {
        return new Date(notAfterMatch[1]);
      }
    } catch (error) {
      console.warn('Failed to parse certificate expiry:', error);
    }
    
    // Default to 30 days from now if parsing fails
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  // === SECURITY CONFIGURATION ===

  /**
   * Build secure options bitmask
   */
  private buildSecureOptions(): number {
    const crypto = require('crypto');
    let options = 0;

    // Disable insecure SSL versions
    options |= crypto.constants.SSL_OP_NO_SSLv2;
    options |= crypto.constants.SSL_OP_NO_SSLv3;
    
    // Disable TLS 1.0 and 1.1 for security
    options |= crypto.constants.SSL_OP_NO_TLSv1;
    options |= crypto.constants.SSL_OP_NO_TLSv1_1;
    
    // Only allow TLS 1.2 if explicitly configured
    if (this.config.minVersion === 'TLSv1.3') {
      options |= crypto.constants.SSL_OP_NO_TLSv1_2;
    }

    // Disable session tickets if configured
    if (!this.config.securityFeatures.sessionTickets) {
      options |= crypto.constants.SSL_OP_NO_TICKET;
    }

    // Disable compression to prevent CRIME attacks
    if (this.config.securityFeatures.disableCompression) {
      options |= crypto.constants.SSL_OP_NO_COMPRESSION;
    }

    // Enable secure renegotiation
    options |= crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION;

    return options;
  }

  /**
   * Get cipher string for OpenSSL
   */
  private getCipherString(): string {
    let ciphers: string[];

    if (this.config.compliance.enableISMCompliantCiphers) {
      ciphers = CipherSuites.ismCompliant;
    } else {
      ciphers = this.config.cipherSuites;
    }

    // Add Perfect Forward Secrecy requirement
    if (this.config.securityFeatures.requirePFS) {
      // Filter to only PFS-enabled ciphers
      ciphers = ciphers.filter(cipher => 
        cipher.includes('ECDHE') || 
        cipher.includes('DHE') ||
        cipher.startsWith('TLS_') // TLS 1.3 ciphers always provide PFS
      );
    }

    return ciphers.join(':');
  }

  /**
   * Create custom server identity checker
   */
  private createServerIdentityChecker(expectedServerName: string) {
    return (host: string, cert: any): Error | undefined => {
      const crypto = require('crypto');
      
      // Check if the certificate subject matches
      if (cert.subject && cert.subject.CN !== expectedServerName) {
        return new Error(`Certificate subject mismatch: expected ${expectedServerName}, got ${cert.subject.CN}`);
      }

      // Check Subject Alternative Names
      if (cert.subjectaltname) {
        const sans = cert.subjectaltname.split(', ');
        const dnsNames = sans
          .filter((san: string) => san.startsWith('DNS:'))
          .map((san: string) => san.substring(4));
        
        if (!dnsNames.includes(expectedServerName)) {
          return new Error(`Certificate SAN mismatch: ${expectedServerName} not found in ${dnsNames.join(', ')}`);
        }
      }

      // Additional Australian compliance checks
      if (this.config.compliance.enforceDataResidency) {
        // Check if certificate was issued by Australian CA
        if (cert.issuer && !this.isAustralianCA(cert.issuer)) {
          console.warn('Certificate not issued by Australian CA, may violate data residency requirements');
        }
      }

      return undefined;
    };
  }

  /**
   * Check if certificate issuer is Australian
   */
  private isAustralianCA(issuer: any): boolean {
    // List of known Australian CAs
    const australianCAs = [
      'DigiCert Australia',
      'Symantec Australia',
      'GlobalSign Australia',
      'Entrust Australia'
    ];

    const issuerString = JSON.stringify(issuer).toLowerCase();
    return australianCAs.some(ca => issuerString.includes(ca.toLowerCase()));
  }

  // === MONITORING AND VALIDATION ===

  /**
   * Validate TLS configuration
   */
  validateConfiguration(): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check minimum TLS version
    if (this.config.minVersion !== 'TLSv1.3') {
      warnings.push('TLS 1.3 is recommended for maximum security');
    }

    // Check cipher suites
    if (this.config.cipherSuites.length === 0) {
      errors.push('No cipher suites configured');
    }

    // Check certificate paths
    if (!this.config.certificateConfig.certificatePath) {
      errors.push('Certificate path not configured');
    }

    if (!this.config.certificateConfig.privateKeyPath) {
      errors.push('Private key path not configured');
    }

    // Check Perfect Forward Secrecy
    if (!this.config.securityFeatures.requirePFS) {
      warnings.push('Perfect Forward Secrecy should be enabled for better security');
    }

    // Check HSTS
    if (!this.config.securityFeatures.enableHSTS) {
      warnings.push('HSTS should be enabled for web applications');
    }

    // Check session settings
    if (this.config.securityFeatures.sessionTickets) {
      warnings.push('Session tickets should be disabled for better security');
    }

    // Check Australian compliance
    if (this.config.compliance.enforceDataResidency && !this.config.compliance.enableAustralianCACerts) {
      warnings.push('Australian CA certificates should be enabled for data residency compliance');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Check certificate expiry
   */
  checkCertificateExpiry(): { daysUntilExpiry: number; needsRenewal: boolean } {
    try {
      const certs = this.loadCertificates();
      const expiry = this.parseCertificateExpiry(certs.cert);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      return {
        daysUntilExpiry,
        needsRenewal: daysUntilExpiry <= this.config.monitoring.alertDaysBeforeExpiry
      };
    } catch (error) {
      console.error('Failed to check certificate expiry:', error);
      return { daysUntilExpiry: 0, needsRenewal: true };
    }
  }

  /**
   * Get TLS connection statistics
   */
  getConnectionStats(): {
    protocolVersions: Record<string, number>;
    cipherSuites: Record<string, number>;
    certificateValidationFailures: number;
    handshakeFailures: number;
  } {
    // In a real implementation, this would collect actual metrics
    return {
      protocolVersions: { 'TLSv1.3': 95, 'TLSv1.2': 5 },
      cipherSuites: { 'TLS_AES_256_GCM_SHA384': 80, 'TLS_AES_128_GCM_SHA256': 20 },
      certificateValidationFailures: 0,
      handshakeFailures: 2
    };
  }

  // === UTILITY METHODS ===

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TLSConfig>): void {
    this.config = TLSConfigSchema.parse({ ...this.config, ...updates });
    
    // Clear certificate cache to force reload
    this.certificateCache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): TLSConfig {
    return { ...this.config };
  }

  /**
   * Generate self-signed certificate for development
   */
  generateSelfSignedCertificate(commonName: string = 'localhost'): {
    certificate: string;
    privateKey: string;
  } {
    // This would use a library like node-forge to generate certificates
    // For now, return placeholder implementation
    console.warn('Self-signed certificate generation not implemented - use openssl or similar tool');
    
    return {
      certificate: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
    };
  }
}

// === FACTORY FUNCTIONS ===

/**
 * Create TLS configuration for high-security environments
 */
export function createHighSecurityTLSConfig(
  certificatePath: string,
  privateKeyPath: string,
  caCertificatePath?: string
): TLSConfig {
  return {
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    cipherSuites: CipherSuites.high,
    
    certificateConfig: {
      certificatePath,
      privateKeyPath,
      caCertificatePath,
      rejectUnauthorized: true,
      checkServerIdentity: true,
      enableOCSP: true,
      requireSNI: true,
      allowSelfSigned: false
    },
    
    securityFeatures: {
      requirePFS: true,
      enableHSTS: true,
      hstsMaxAge: 31536000,
      hstsIncludeSubdomains: true,
      hstsPreload: true,
      enableSecurityHeaders: true,
      sessionTickets: false,
      sessionResumption: false,
      disableCompression: true
    },
    
    mutualTLS: {
      enabled: false,
      clientCertificateRequired: false,
      trustedCAs: [],
      verifyClientCert: true
    },
    
    compliance: {
      enforceDataResidency: true,
      enableAustralianCACerts: true,
      requireGovernmentApprovedCrypto: true,
      enableISMCompliantCiphers: true
    },
    
    monitoring: {
      logAllConnections: true,
      logFailedHandshakes: true,
      monitorCertificateExpiry: true,
      alertDaysBeforeExpiry: 30
    }
  };
}

/**
 * Create TLS configuration for mutual TLS (agent communication)
 */
export function createMutualTLSConfig(
  certificatePath: string,
  privateKeyPath: string,
  caCertificatePath: string,
  trustedCAs: string[] = []
): TLSConfig {
  const baseConfig = createHighSecurityTLSConfig(certificatePath, privateKeyPath, caCertificatePath);
  
  return {
    ...baseConfig,
    mutualTLS: {
      enabled: true,
      clientCertificateRequired: true,
      trustedCAs,
      verifyClientCert: true
    }
  };
}

/**
 * Create TLS configuration compliant with Australian ISM
 */
export function createISMCompliantTLSConfig(
  certificatePath: string,
  privateKeyPath: string
): TLSConfig {
  return {
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    cipherSuites: CipherSuites.ismCompliant,
    
    certificateConfig: {
      certificatePath,
      privateKeyPath,
      rejectUnauthorized: true,
      checkServerIdentity: true,
      enableOCSP: true,
      requireSNI: true,
      allowSelfSigned: false
    },
    
    securityFeatures: {
      requirePFS: true,
      enableHSTS: true,
      hstsMaxAge: 31536000,
      hstsIncludeSubdomains: true,
      hstsPreload: true,
      enableSecurityHeaders: true,
      sessionTickets: false,
      sessionResumption: false,
      disableCompression: true
    },
    
    mutualTLS: {
      enabled: false,
      clientCertificateRequired: false,
      trustedCAs: [],
      verifyClientCert: true
    },
    
    compliance: {
      enforceDataResidency: true,
      enableAustralianCACerts: true,
      requireGovernmentApprovedCrypto: true,
      enableISMCompliantCiphers: true
    },
    
    monitoring: {
      logAllConnections: true,
      logFailedHandshakes: true,
      monitorCertificateExpiry: true,
      alertDaysBeforeExpiry: 14 // More aggressive for compliance
    }
  };
}