/**
 * Base Data Transformer for ACT Placemat
 * Mobile-optimized data transformation with Australian compliance
 */

import { z } from 'zod';
import { compress, decompress } from 'lz-string';
import {
  ComplianceMetadata,
  ConnectorError,
  UsageMetrics
} from '../types';

export interface TransformationConfig {
  compression: {
    enabled: boolean;
    threshold: number; // Minimum size in bytes to compress
    algorithm: 'lz-string' | 'gzip';
  };
  validation: {
    strict: boolean;
    stripUnknown: boolean;
    maxFieldLength: number;
  };
  mobile: {
    minimizePayload: boolean;
    removeNullFields: boolean;
    optimizeImages: boolean;
    maxImageSize: number; // KB
  };
  compliance: {
    redactSensitiveData: boolean;
    auditTransformations: boolean;
    australianDataOnly: boolean;
  };
}

export interface TransformationResult<T> {
  data: T;
  compressed?: boolean;
  originalSize: number;
  transformedSize: number;
  compressionRatio?: number;
  validationErrors?: string[];
  compliance: {
    dataResidency: 'australia' | 'global';
    sensitiveDataRedacted: boolean;
    auditTrail: boolean;
  };
  performance: {
    transformationTime: number;
    validationTime: number;
    compressionTime?: number;
  };
}

export abstract class BaseTransformer<TInput, TOutput> {
  protected config: TransformationConfig;
  protected schema?: z.ZodSchema<TOutput>;
  private transformationMetrics: any[] = [];

  constructor(
    schema?: z.ZodSchema<TOutput>,
    config: Partial<TransformationConfig> = {}
  ) {
    this.schema = schema;
    this.config = {
      compression: {
        enabled: true,
        threshold: 1024, // 1KB threshold for mobile efficiency
        algorithm: 'lz-string'
      },
      validation: {
        strict: true,
        stripUnknown: true,
        maxFieldLength: 10000 // 10KB max field length for mobile
      },
      mobile: {
        minimizePayload: true,
        removeNullFields: true,
        optimizeImages: true,
        maxImageSize: 500 // 500KB max for mobile
      },
      compliance: {
        redactSensitiveData: true,
        auditTransformations: true,
        australianDataOnly: false
      },
      ...config
    };
  }

  /**
   * Transform input data to mobile-optimized output
   */
  public async transform(input: TInput): Promise<TransformationResult<TOutput>> {
    const startTime = Date.now();
    const originalSize = this.calculateDataSize(input);

    try {
      // Step 1: Apply business logic transformation
      const transformationStart = Date.now();
      let transformed = await this.doTransform(input);
      const transformationTime = Date.now() - transformationStart;

      // Step 2: Apply mobile optimizations
      if (this.config.mobile.minimizePayload) {
        transformed = this.minimizePayload(transformed);
      }

      // Step 3: Apply Australian compliance rules
      if (this.config.compliance.redactSensitiveData) {
        transformed = this.redactSensitiveData(transformed);
      }

      // Step 4: Validate with schema
      const validationStart = Date.now();
      const validationResult = await this.validateData(transformed);
      const validationTime = Date.now() - validationStart;

      if (!validationResult.isValid && this.config.validation.strict) {
        throw new ConnectorError({
          code: 'VALIDATION_FAILED',
          message: 'Data validation failed',
          details: validationResult.errors,
          retryable: false,
          timestamp: new Date().toISOString(),
          context: {
            connector: this.constructor.name,
            operation: 'transform'
          }
        });
      }

      // Step 5: Apply compression if beneficial
      const transformedSize = this.calculateDataSize(transformed);
      let compressionTime: number | undefined;
      let compressed = false;
      let finalData = transformed;

      if (this.config.compression.enabled && transformedSize >= this.config.compression.threshold) {
        const compressionStart = Date.now();
        const compressionResult = this.compressData(transformed);
        compressionTime = Date.now() - compressionStart;

        if (compressionResult.beneficial) {
          finalData = compressionResult.data as TOutput;
          compressed = true;
        }
      }

      const finalSize = this.calculateDataSize(finalData);

      // Log transformation metrics for Australian compliance auditing
      if (this.config.compliance.auditTransformations) {
        await this.logTransformation({
          input: typeof input,
          output: typeof finalData,
          originalSize,
          finalSize,
          compressed,
          transformationTime,
          validationTime,
          compressionTime,
          timestamp: new Date().toISOString()
        });
      }

      return {
        data: finalData,
        compressed,
        originalSize,
        transformedSize: finalSize,
        compressionRatio: compressed ? finalSize / originalSize : undefined,
        validationErrors: validationResult.isValid ? undefined : validationResult.errors,
        compliance: {
          dataResidency: this.determineDataResidency(input),
          sensitiveDataRedacted: this.config.compliance.redactSensitiveData,
          auditTrail: this.config.compliance.auditTransformations
        },
        performance: {
          transformationTime,
          validationTime,
          compressionTime
        }
      };

    } catch (error) {
      console.error('Data transformation failed:', error);
      throw error;
    }
  }

  /**
   * Reverse transformation for decompression and expansion
   */
  public async reverseTransform(input: TOutput, compressed = false): Promise<TInput> {
    if (compressed && this.config.compression.enabled) {
      try {
        const decompressed = this.decompressData(input);
        return await this.doReverseTransform(decompressed as TOutput);
      } catch (error) {
        console.warn('Decompression failed, attempting direct reverse transform:', error);
        return await this.doReverseTransform(input);
      }
    }

    return await this.doReverseTransform(input);
  }

  /**
   * Abstract method for business logic transformation
   */
  protected abstract doTransform(input: TInput): Promise<TOutput>;

  /**
   * Abstract method for reverse transformation
   */
  protected abstract doReverseTransform(output: TOutput): Promise<TInput>;

  /**
   * Mobile payload minimization for Australian mobile networks
   */
  protected minimizePayload(data: any): any {
    if (!this.config.mobile.minimizePayload) return data;

    return this.recursiveMinimize(data);
  }

  private recursiveMinimize(obj: any): any {
    if (obj === null || obj === undefined) {
      return this.config.mobile.removeNullFields ? undefined : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.recursiveMinimize(item)).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const minimized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const minimizedValue = this.recursiveMinimize(value);

        // Skip null/undefined fields if configured
        if (this.config.mobile.removeNullFields && 
            (minimizedValue === null || minimizedValue === undefined)) {
          continue;
        }

        // Truncate overly long strings for mobile efficiency
        if (typeof minimizedValue === 'string' && 
            minimizedValue.length > this.config.validation.maxFieldLength) {
          minimized[key] = minimizedValue.substring(0, this.config.validation.maxFieldLength) + '...';
          continue;
        }

        // Optimize image URLs for mobile
        if (this.config.mobile.optimizeImages && this.isImageField(key, minimizedValue)) {
          minimized[key] = this.optimizeImageUrl(minimizedValue);
          continue;
        }

        minimized[key] = minimizedValue;
      }

      return minimized;
    }

    return obj;
  }

  /**
   * Redact sensitive data for Australian Privacy Act compliance
   */
  protected redactSensitiveData(data: any): any {
    if (!this.config.compliance.redactSensitiveData) return data;

    const sensitiveFields = [
      'email', 'phone', 'phoneNumber', 'mobile', 'address', 'postcode',
      'dateOfBirth', 'dob', 'taxFileNumber', 'tfn', 'medicareNumber',
      'bankAccount', 'creditCard', 'passport', 'licence', 'ssn'
    ];

    return this.recursiveRedact(data, sensitiveFields);
  }

  private recursiveRedact(obj: any, sensitiveFields: string[]): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.recursiveRedact(item, sensitiveFields));
    }

    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => 
        keyLower.includes(field.toLowerCase())
      );

      if (isSensitive && typeof value === 'string') {
        // Redact with pattern preservation for Australian formats
        if (keyLower.includes('email')) {
          redacted[key] = this.redactEmail(value);
        } else if (keyLower.includes('phone') || keyLower.includes('mobile')) {
          redacted[key] = this.redactAustralianPhone(value);
        } else if (keyLower.includes('postcode')) {
          redacted[key] = this.redactAustralianPostcode(value);
        } else {
          redacted[key] = '***REDACTED***';
        }
      } else if (typeof value === 'object') {
        redacted[key] = this.recursiveRedact(value, sensitiveFields);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Validate data with mobile-optimized schema checking
   */
  protected async validateData(data: any): Promise<{ isValid: boolean; errors?: string[] }> {
    if (!this.schema) {
      return { isValid: true };
    }

    try {
      // Configure zod for mobile performance
      const parseOptions = {
        stripUnknown: this.config.validation.stripUnknown,
        // Add custom error map for mobile-friendly messages
        errorMap: (issue: any, ctx: any) => {
          if (issue.code === z.ZodIssueCode.too_big) {
            return { message: `Field too large for mobile (max: ${this.config.validation.maxFieldLength})` };
          }
          return { message: ctx.defaultError };
        }
      };

      this.schema.parse(data);
      return { isValid: true };

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return { isValid: false, errors };
      }

      return { 
        isValid: false, 
        errors: [error instanceof Error ? error.message : 'Unknown validation error'] 
      };
    }
  }

  /**
   * Compress data for mobile efficiency
   */
  protected compressData(data: any): { data: string; beneficial: boolean; ratio: number } {
    const originalString = JSON.stringify(data);
    const originalSize = new Blob([originalString]).size;

    if (this.config.compression.algorithm === 'lz-string') {
      const compressed = compress(originalString);
      const compressedSize = new Blob([compressed]).size;
      const ratio = compressedSize / originalSize;

      return {
        data: compressed,
        beneficial: ratio < 0.9, // Only beneficial if >10% reduction
        ratio
      };
    }

    // Default: no compression
    return {
      data: originalString,
      beneficial: false,
      ratio: 1
    };
  }

  /**
   * Decompress data
   */
  protected decompressData(compressedData: any): any {
    if (typeof compressedData !== 'string') {
      return compressedData;
    }

    try {
      const decompressed = decompress(compressedData);
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedData;
    }
  }

  /**
   * Calculate data size in bytes for mobile monitoring
   */
  protected calculateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      // Fallback calculation
      return JSON.stringify(data).length * 2; // Rough UTF-16 estimation
    }
  }

  /**
   * Determine data residency for Australian compliance
   */
  protected determineDataResidency(data: any): 'australia' | 'global' {
    if (this.config.compliance.australianDataOnly) {
      return 'australia';
    }

    // Check for Australian indicators in the data
    const dataString = JSON.stringify(data).toLowerCase();
    const australianIndicators = [
      'australia', 'australian', '.au', '+61', 'sydney', 'melbourne',
      'brisbane', 'perth', 'adelaide', 'darwin', 'hobart', 'canberra'
    ];

    const hasAustralianIndicators = australianIndicators.some(indicator => 
      dataString.includes(indicator)
    );

    return hasAustralianIndicators ? 'australia' : 'global';
  }

  /**
   * Check if field contains image data
   */
  private isImageField(key: string, value: any): boolean {
    const imageFields = ['image', 'photo', 'picture', 'avatar', 'thumbnail', 'icon'];
    const keyLower = key.toLowerCase();
    
    return imageFields.some(field => keyLower.includes(field)) &&
           typeof value === 'string' &&
           (value.startsWith('http') || value.startsWith('data:image'));
  }

  /**
   * Optimize image URL for mobile consumption
   */
  private optimizeImageUrl(url: string): string {
    if (url.startsWith('data:image')) {
      // For data URLs, could implement compression here
      return url;
    }

    // For HTTP URLs, add mobile optimization parameters
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=400&h=400&fit=crop&auto=compress,format`;
  }

  /**
   * Redact email with pattern preservation
   */
  private redactEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***.***';
    
    const redactedLocal = local.length > 2 
      ? `${local[0]}***${local[local.length - 1]}`
      : '***';
    
    return `${redactedLocal}@${domain}`;
  }

  /**
   * Redact Australian phone number with format preservation
   */
  private redactAustralianPhone(phone: string): string {
    // Australian phone patterns: +61, 04xx, 02/03/07/08
    if (phone.startsWith('+61')) {
      return '+61 *** *** ***';
    }
    if (phone.startsWith('04')) {
      return '04** *** ***';
    }
    if (phone.match(/^0[2378]/)) {
      return phone.substring(0, 2) + '** **** ****';
    }
    return '*** *** ***';
  }

  /**
   * Redact Australian postcode with state preservation
   */
  private redactAustralianPostcode(postcode: string): string {
    // Australian postcodes: 4 digits, state-specific ranges
    if (postcode.length === 4) {
      const firstDigit = postcode[0];
      return `${firstDigit}***`; // Preserves state indicator
    }
    return '****';
  }

  /**
   * Log transformation for Australian compliance auditing
   */
  private async logTransformation(metrics: any): Promise<void> {
    this.transformationMetrics.push({
      ...metrics,
      transformerName: this.constructor.name
    });

    // Keep only last 100 transformation logs for mobile storage efficiency
    if (this.transformationMetrics.length > 100) {
      this.transformationMetrics = this.transformationMetrics.slice(-100);
    }
  }

  /**
   * Get transformation metrics for performance monitoring
   */
  public getTransformationMetrics(): any[] {
    return [...this.transformationMetrics];
  }

  /**
   * Clear transformation metrics
   */
  public clearMetrics(): void {
    this.transformationMetrics = [];
  }

  /**
   * Get transformer configuration
   */
  public getConfig(): TransformationConfig {
    return { ...this.config };
  }

  /**
   * Update transformer configuration
   */
  public updateConfig(updates: Partial<TransformationConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      compression: { ...this.config.compression, ...updates.compression },
      validation: { ...this.config.validation, ...updates.validation },
      mobile: { ...this.config.mobile, ...updates.mobile },
      compliance: { ...this.config.compliance, ...updates.compliance }
    };
  }
}