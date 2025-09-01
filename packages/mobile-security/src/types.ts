/**
 * Types for mobile security services
 */

export type AuditLevel = 'info' | 'medium' | 'high';

export interface SecurityEvent {
  type: 'session-created' | 'authentication-success' | 'authentication-failure' | 'session-expired' | 'suspicious-activity';
  level: AuditLevel;
  source: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export interface StorageOptions {
  ttl?: number; // Time to live in milliseconds
  securityLevel?: 'low' | 'medium' | 'high';
  encrypted?: boolean;
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}