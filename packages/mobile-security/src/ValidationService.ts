/**
 * Validation Service for React Native
 * 
 * Provides data validation and sanitization with Australian compliance
 */

import type { ValidationOptions, ValidationResult } from './types';

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validate(value: any, field: string, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Required check
    if (options.required && (value === null || value === undefined || value === '')) {
      errors.push(`${field} is required`);
      return { isValid: false, errors };
    }

    // Skip other checks if value is empty and not required
    if (!value && !options.required) {
      return { isValid: true, errors: [], sanitizedValue };
    }

    // String validations
    if (typeof value === 'string') {
      // Length checks
      if (options.minLength && value.length < options.minLength) {
        errors.push(`${field} must be at least ${options.minLength} characters`);
      }
      
      if (options.maxLength && value.length > options.maxLength) {
        errors.push(`${field} must be no more than ${options.maxLength} characters`);
      }

      // Pattern check
      if (options.pattern && !options.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      // Sanitization
      if (options.sanitize) {
        sanitizedValue = this.sanitizeString(value);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  validateMultiple(data: Record<string, any>, schema: Record<string, ValidationOptions>): ValidationResult {
    const allErrors: string[] = [];
    const sanitizedData: Record<string, any> = {};

    for (const [field, options] of Object.entries(schema)) {
      const result = this.validate(data[field], field, options);
      
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
      
      sanitizedData[field] = result.sanitizedValue;
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedValue: sanitizedData,
    };
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  validateAustralianPhone(phone: string): boolean {
    const patterns = [
      /^(\+61|0)[2-478]\d{8}$/, // Standard format
      /^(\+61|0)4\d{8}$/, // Mobile specific
    ];
    
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return patterns.some(pattern => pattern.test(cleaned));
  }

  validateAustralianPostcode(postcode: string): boolean {
    const code = parseInt(postcode);
    return code >= 800 && code <= 9999;
  }

  validateEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();