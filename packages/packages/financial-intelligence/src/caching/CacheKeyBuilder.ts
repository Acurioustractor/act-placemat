/**
 * Cache Key Builder
 * 
 * Generates consistent cache keys for different types of data
 * with proper namespacing and parameter handling
 */

import crypto from 'crypto';
import {
  CacheKeyBuilder as ICacheKeyBuilder,
  PolicyDecisionInput,
  ParsedCacheKey
} from './types';

export class CacheKeyBuilder implements ICacheKeyBuilder {
  private readonly keyVersion = 'v1';
  private readonly separator = ':';
  private readonly paramSeparator = '|';
  
  buildPolicyDecisionKey(input: PolicyDecisionInput): string {
    // Normalize input for consistent hashing
    const normalizedInput = this.normalizeInput(input);
    const inputHash = this.hashInput(normalizedInput);
    
    return this.buildKey('policy', 'decision', [
      input.userId,
      input.action,
      this.normalizeResource(input.resource),
      inputHash
    ]);
  }

  buildConsentKey(userId: string, resource: string, purpose: string): string {
    return this.buildKey('consent', 'check', [
      userId,
      this.normalizeResource(resource),
      purpose.toLowerCase()
    ]);
  }

  buildPermissionKey(userId: string, action: string, resource: string): string {
    return this.buildKey('permission', 'check', [
      userId,
      action.toLowerCase(),
      this.normalizeResource(resource)
    ]);
  }

  buildConfigurationKey(configType: string, version: string): string {
    return this.buildKey('config', configType, [version]);
  }

  buildAuditKey(entityType: string, entityId: string): string {
    return this.buildKey('audit', entityType, [entityId]);
  }

  buildConstitutionalKey(principleId: string, eventType: string, contextHash: string): string {
    return this.buildKey('constitutional', 'check', [
      principleId,
      eventType.toLowerCase(),
      contextHash
    ]);
  }

  buildAttestationKey(attestationId: string, operation: string): string {
    return this.buildKey('attestation', operation, [attestationId]);
  }

  buildRedactionKey(dataType: string, rules: string[], contentHash: string): string {
    const rulesHash = this.hashArray(rules.sort());
    return this.buildKey('redaction', dataType, [rulesHash, contentHash]);
  }

  buildComplianceKey(framework: string, entityType: string, entityId: string): string {
    return this.buildKey('compliance', framework, [entityType, entityId]);
  }

  buildUserSessionKey(userId: string, sessionId: string): string {
    return this.buildKey('session', 'user', [userId, sessionId]);
  }

  buildMetadataKey(entityType: string, entityId: string, metadataType: string): string {
    return this.buildKey('metadata', entityType, [entityId, metadataType]);
  }

  parseKey(key: string): ParsedCacheKey {
    try {
      const parts = key.split(this.separator);
      
      if (parts.length < 4) {
        return { 
          namespace: '', 
          type: '', 
          identifier: '', 
          valid: false 
        };
      }

      const [version, namespace, type, ...identifierParts] = parts;
      
      if (version !== this.keyVersion) {
        return { 
          namespace, 
          type, 
          identifier: identifierParts.join(this.separator), 
          valid: false 
        };
      }

      // Parse parameters if present
      const identifier = identifierParts.join(this.separator);
      const parameters = this.parseParameters(identifier);

      return {
        namespace,
        type,
        identifier,
        version,
        parameters,
        valid: true
      };
    } catch (error) {
      return { 
        namespace: '', 
        type: '', 
        identifier: '', 
        valid: false 
      };
    }
  }

  buildPatternKey(namespace: string, type: string, pattern: string = '*'): string {
    return `${this.keyVersion}${this.separator}${namespace}${this.separator}${type}${this.separator}${pattern}`;
  }

  buildNamespacePattern(namespace: string): string {
    return `${this.keyVersion}${this.separator}${namespace}${this.separator}*`;
  }

  buildWildcardKey(namespace: string, type: string, parameters: Record<string, string>): string {
    const paramParts = Object.entries(parameters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    
    return this.buildKey(namespace, type, paramParts);
  }

  // Utility methods for key building
  private buildKey(namespace: string, type: string, parts: string[]): string {
    const cleanParts = parts
      .map(part => this.sanitizeKeyPart(part))
      .filter(part => part.length > 0);
    
    const identifier = cleanParts.join(this.paramSeparator);
    
    return [
      this.keyVersion,
      namespace.toLowerCase(),
      type.toLowerCase(),
      identifier
    ].join(this.separator);
  }

  private sanitizeKeyPart(part: string): string {
    // Remove or replace characters that could cause issues
    return part
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  private normalizeInput(input: PolicyDecisionInput): any {
    // Create a normalized version of input for consistent hashing
    return {
      userId: input.userId.toLowerCase(),
      action: input.action.toLowerCase(),
      resource: this.normalizeResource(input.resource),
      context: this.normalizeContext(input.context),
      // Exclude timestamp from normalization to allow cache hits
    };
  }

  private normalizeResource(resource: string): string {
    // Normalize resource identifiers
    return resource
      .toLowerCase()
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/^\//, '');
  }

  private normalizeContext(context: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    
    // Sort keys and normalize values
    const sortedKeys = Object.keys(context).sort();
    
    for (const key of sortedKeys) {
      const value = context[key];
      
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value.toLowerCase();
      } else if (typeof value === 'object' && value !== null) {
        normalized[key.toLowerCase()] = this.normalizeContext(value);
      } else {
        normalized[key.toLowerCase()] = value;
      }
    }
    
    return normalized;
  }

  private hashInput(input: any): string {
    const inputString = JSON.stringify(input, Object.keys(input).sort());
    return crypto
      .createHash('sha256')
      .update(inputString)
      .digest('hex')
      .substring(0, 16); // Use first 16 characters for key brevity
  }

  private hashArray(array: string[]): string {
    const arrayString = array.join('|');
    return crypto
      .createHash('sha256')
      .update(arrayString)
      .digest('hex')
      .substring(0, 12); // Shorter hash for arrays
  }

  private parseParameters(identifier: string): Record<string, any> | undefined {
    if (!identifier.includes('=')) {
      return undefined;
    }

    const parameters: Record<string, any> = {};
    const parts = identifier.split(this.paramSeparator);
    
    for (const part of parts) {
      if (part.includes('=')) {
        const [key, value] = part.split('=', 2);
        parameters[key] = this.parseParameterValue(value);
      }
    }
    
    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }

  private parseParameterValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      // Return as string if not valid JSON
      return decodeURIComponent(value);
    }
  }

  // Key validation methods
  isValidKey(key: string): boolean {
    const parsed = this.parseKey(key);
    return parsed.valid;
  }

  getKeyNamespace(key: string): string | null {
    const parsed = this.parseKey(key);
    return parsed.valid ? parsed.namespace : null;
  }

  getKeyType(key: string): string | null {
    const parsed = this.parseKey(key);
    return parsed.valid ? parsed.type : null;
  }

  // Key transformation methods
  transformKey(key: string, transformer: (parsed: ParsedCacheKey) => ParsedCacheKey): string {
    const parsed = this.parseKey(key);
    if (!parsed.valid) {
      return key;
    }

    const transformed = transformer(parsed);
    if (!transformed.valid) {
      return key;
    }

    return this.buildKey(
      transformed.namespace,
      transformed.type,
      [transformed.identifier]
    );
  }

  // Batch key operations
  buildBatchKeys(namespace: string, type: string, identifiers: string[]): string[] {
    return identifiers.map(id => this.buildKey(namespace, type, [id]));
  }

  extractIdentifiersFromKeys(keys: string[]): string[] {
    return keys
      .map(key => this.parseKey(key))
      .filter(parsed => parsed.valid)
      .map(parsed => parsed.identifier);
  }

  groupKeysByNamespace(keys: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    for (const key of keys) {
      const namespace = this.getKeyNamespace(key);
      if (namespace) {
        if (!groups[namespace]) {
          groups[namespace] = [];
        }
        groups[namespace].push(key);
      }
    }
    
    return groups;
  }

  // Performance optimization helpers
  createKeyTemplate(namespace: string, type: string): KeyTemplate {
    return new KeyTemplate(this, namespace, type);
  }
}

// Key template for performance optimization
export class KeyTemplate {
  private keyBuilder: CacheKeyBuilder;
  private namespace: string;
  private type: string;
  private prefix: string;

  constructor(keyBuilder: CacheKeyBuilder, namespace: string, type: string) {
    this.keyBuilder = keyBuilder;
    this.namespace = namespace;
    this.type = type;
    this.prefix = `v1:${namespace.toLowerCase()}:${type.toLowerCase()}:`;
  }

  buildKey(parts: string[]): string {
    const cleanParts = parts
      .map(part => this.sanitizeKeyPart(part))
      .filter(part => part.length > 0);
    
    return this.prefix + cleanParts.join('|');
  }

  private sanitizeKeyPart(part: string): string {
    return part
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}