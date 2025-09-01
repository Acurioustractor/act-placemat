/**
 * Redaction Engine
 * 
 * Core engine for redacting and transforming sensitive financial data
 * with reversible operations and comprehensive audit trails
 */

import crypto from 'crypto';
import {
  RedactionEngine as IRedactionEngine,
  RedactionRule,
  TransformationRule,
  RedactionContext,
  RedactionResult,
  TransformationResult,
  ReversalRequest,
  ReversalResult,
  ValidationResult,
  AuditCriteria,
  AuditEntry,
  RedactionType,
  TransformationType,
  DataSensitivityLevel
} from './types';
import { DataTypeClassifier } from './DataTypeClassifier';
import { CulturalDataHandler } from './CulturalDataHandler';
import { ComplianceValidator } from './ComplianceValidator';
import { AuditLogger } from './AuditLogger';

export class RedactionEngine implements IRedactionEngine {
  private classifier: DataTypeClassifier;
  private culturalHandler: CulturalDataHandler;
  private complianceValidator: ComplianceValidator;
  private auditLogger: AuditLogger;
  private encryptionKey: Buffer;
  private reverseKeyCache: Map<string, string> = new Map();

  constructor(
    encryptionKey: string,
    auditLogger: AuditLogger,
    culturalHandler?: CulturalDataHandler,
    complianceValidator?: ComplianceValidator
  ) {
    this.classifier = new DataTypeClassifier();
    this.culturalHandler = culturalHandler || new CulturalDataHandler();
    this.complianceValidator = complianceValidator || new ComplianceValidator();
    this.auditLogger = auditLogger;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
  }

  async redact(
    value: any, 
    rules: RedactionRule[], 
    context: RedactionContext
  ): Promise<RedactionResult> {
    const startTime = Date.now();
    const dataId = this.generateDataIdentifier(value);

    try {
      // Classify the data
      const classification = this.classifier.classify(value);

      // Find applicable rules
      const applicableRules = this.findApplicableRedactionRules(
        value, 
        rules, 
        classification.dataType,
        classification.sensitivityLevel
      );

      if (applicableRules.length === 0) {
        return this.createRedactionResult({
          success: true,
          originalValue: value,
          redactedValue: value,
          redactionType: RedactionType.REMOVE,
          ruleId: 'no-rule',
          reversible: false,
          classification,
          context,
          processingTime: Date.now() - startTime
        });
      }

      // Apply cultural data checks
      if (classification.culturalSensitive) {
        const culturalValidation = await this.culturalHandler.validateCulturalProtocols(
          value,
          applicableRules[0].culturalSensitive ? [] : []
        );

        if (!culturalValidation.valid) {
          throw new Error(`Cultural protocol validation failed: ${culturalValidation.errors.join(', ')}`);
        }
      }

      // Apply compliance validation
      const complianceValidation = this.complianceValidator.validateOperation(
        'redaction',
        value,
        context,
        applicableRules[0].complianceFrameworks
      );

      if (!complianceValidation.valid) {
        throw new Error(`Compliance validation failed: ${complianceValidation.errors.join(', ')}`);
      }

      // Apply the most specific rule
      const rule = applicableRules[0];
      const redactedValue = await this.applyRedactionRule(value, rule, context);
      const transformationId = rule.reversible ? crypto.randomUUID() : undefined;

      // Store reverse key if reversible
      if (rule.reversible && transformationId) {
        const reverseKey = this.generateReverseKey(value, rule);
        this.reverseKeyCache.set(transformationId, reverseKey);
      }

      const result = this.createRedactionResult({
        success: true,
        originalValue: rule.reversible ? undefined : value,
        redactedValue,
        redactionType: rule.redactionType,
        ruleId: rule.id,
        reversible: rule.reversible,
        transformationId,
        classification,
        context,
        processingTime: Date.now() - startTime
      });

      // Log audit entry
      await this.auditLogger.logRedaction(result, context, dataId);

      return result;

    } catch (error) {
      const result = this.createRedactionResult({
        success: false,
        originalValue: value,
        redactedValue: value,
        redactionType: RedactionType.REMOVE,
        ruleId: 'error',
        reversible: false,
        classification: this.classifier.classify(value),
        context,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      });

      await this.auditLogger.logRedaction(result, context, dataId);
      return result;
    }
  }

  async transform(
    value: any, 
    rules: TransformationRule[], 
    context: RedactionContext
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    const dataId = this.generateDataIdentifier(value);

    try {
      // Classify the data
      const classification = this.classifier.classify(value);

      // Find applicable transformation rules
      const applicableRules = this.findApplicableTransformationRules(
        value, 
        rules, 
        classification.dataType
      );

      if (applicableRules.length === 0) {
        throw new Error('No applicable transformation rules found');
      }

      const rule = applicableRules[0];

      // Apply cultural data checks
      if (classification.culturalSensitive) {
        const culturalValidation = await this.culturalHandler.validateCulturalProtocols(
          value,
          rule.culturalProtections
        );

        if (!culturalValidation.valid) {
          throw new Error(`Cultural protocol validation failed: ${culturalValidation.errors.join(', ')}`);
        }
      }

      // Apply compliance validation
      const complianceValidation = this.complianceValidator.validateTransformation(
        rule.transformationType,
        value,
        context,
        rule.complianceValidation
      );

      if (!complianceValidation.valid) {
        throw new Error(`Compliance validation failed: ${complianceValidation.errors.join(', ')}`);
      }

      // Apply transformation
      const transformedValue = await this.applyTransformationRule(value, rule, context);
      const transformationId = crypto.randomUUID();
      const reverseKey = rule.reversible ? this.generateReverseKey(value, rule) : undefined;

      if (reverseKey) {
        this.reverseKeyCache.set(transformationId, reverseKey);
      }

      const result: TransformationResult = {
        success: true,
        originalValue: rule.reversible ? undefined : value,
        transformedValue,
        transformationType: rule.transformationType,
        ruleId: rule.id,
        reversible: rule.reversible,
        reverseKey: reverseKey ? this.encryptReverseKey(reverseKey) : undefined,
        transformationId,
        metadata: {
          dataType: classification.dataType,
          keyVersion: 'v1',
          culturalProtections: rule.culturalProtections,
          complianceValidated: true,
          processingTime: Date.now() - startTime
        },
        auditTrail: await this.createAuditEntry('transformation', rule.id, dataId, context, true)
      };

      await this.auditLogger.logTransformation(result, context, dataId);
      return result;

    } catch (error) {
      const result: TransformationResult = {
        success: false,
        originalValue: value,
        transformedValue: value,
        transformationType: TransformationType.REVERSIBLE_ENCRYPT,
        ruleId: 'error',
        reversible: false,
        transformationId: crypto.randomUUID(),
        metadata: {
          dataType: this.classifier.classify(value).dataType,
          culturalProtections: [],
          complianceValidated: false,
          processingTime: Date.now() - startTime
        },
        auditTrail: await this.createAuditEntry('transformation', 'error', dataId, context, false),
        errors: [error instanceof Error ? error.message : String(error)]
      };

      await this.auditLogger.logTransformation(result, context, dataId);
      return result;
    }
  }

  async reverse(
    transformationId: string, 
    request: ReversalRequest
  ): Promise<ReversalResult> {
    try {
      // Validate reversal request
      const validation = await this.validateReversalRequest(request);
      if (!validation.valid) {
        throw new Error(`Reversal validation failed: ${validation.errors.join(', ')}`);
      }

      // Get reverse key
      const reverseKey = this.reverseKeyCache.get(transformationId);
      if (!reverseKey) {
        throw new Error('Reverse key not found or transformation not reversible');
      }

      // Apply cultural approvals if needed
      if (request.culturalApproval) {
        const culturalValidation = await this.culturalHandler.validateElderApproval(
          request.culturalApproval.elderId,
          request.culturalApproval.approvalDate
        );
        if (!culturalValidation) {
          throw new Error('Cultural approval validation failed');
        }
      }

      // Decrypt and restore original value
      const originalValue = this.decryptWithReverseKey(reverseKey);
      const reversalId = crypto.randomUUID();

      const result: ReversalResult = {
        success: true,
        originalValue,
        transformationId,
        reversalId,
        requestedBy: request.userId,
        approvals: this.buildApprovalsList(request),
        auditTrail: await this.createAuditEntry(
          'reversal', 
          transformationId, 
          this.generateDataIdentifier(originalValue),
          {
            userId: request.userId,
            sessionId: request.auditContext.sessionId,
            requestId: request.auditContext.requestId,
            purpose: ['data_reversal'],
            consentLevel: 'explicit',
            sovereigntyLevel: 'individual',
            complianceContext: {
              frameworks: ['privacy_act_1988'],
              auditRequired: true,
              retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
            },
            timestamp: new Date(),
            ipAddress: request.auditContext.ipAddress,
            userAgent: request.auditContext.userAgent
          }, 
          true
        )
      };

      // Remove reverse key after successful reversal
      this.reverseKeyCache.delete(transformationId);

      await this.auditLogger.logReversal(result, request);
      return result;

    } catch (error) {
      const result: ReversalResult = {
        success: false,
        transformationId,
        reversalId: crypto.randomUUID(),
        requestedBy: request.userId,
        approvals: [],
        auditTrail: await this.createAuditEntry(
          'reversal', 
          transformationId, 
          'unknown',
          {
            userId: request.userId,
            sessionId: request.auditContext.sessionId,
            requestId: request.auditContext.requestId,
            purpose: ['data_reversal'],
            consentLevel: 'explicit',
            sovereigntyLevel: 'individual',
            complianceContext: {
              frameworks: ['privacy_act_1988'],
              auditRequired: true,
              retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000
            },
            timestamp: new Date()
          }, 
          false
        ),
        errors: [error instanceof Error ? error.message : String(error)]
      };

      await this.auditLogger.logReversal(result, request);
      return result;
    }
  }

  validateRules(rules: (RedactionRule | TransformationRule)[]): ValidationResult[] {
    return rules.map(rule => this.validateSingleRule(rule));
  }

  async getAuditTrail(criteria: AuditCriteria): Promise<AuditEntry[]> {
    return this.auditLogger.queryAuditTrail(criteria);
  }

  // Private helper methods

  private findApplicableRedactionRules(
    value: any,
    rules: RedactionRule[],
    dataType: string,
    sensitivityLevel: DataSensitivityLevel
  ): RedactionRule[] {
    return rules
      .filter(rule => {
        // Check data type match
        if (!rule.dataType.includes(dataType) && !rule.dataType.includes('*')) {
          return false;
        }

        // Check sensitivity level
        if (!rule.sensitivityLevels.includes(sensitivityLevel)) {
          return false;
        }

        // Check field pattern if specified
        if (rule.fieldPattern instanceof RegExp) {
          return rule.fieldPattern.test(String(value));
        } else if (typeof rule.fieldPattern === 'string' && rule.fieldPattern !== '*') {
          return String(value).includes(rule.fieldPattern);
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize more specific rules
        const aSpecificity = this.calculateRuleSpecificity(a);
        const bSpecificity = this.calculateRuleSpecificity(b);
        return bSpecificity - aSpecificity;
      });
  }

  private findApplicableTransformationRules(
    value: any,
    rules: TransformationRule[],
    dataType: string
  ): TransformationRule[] {
    return rules
      .filter(rule => {
        if (!rule.dataType.includes(dataType) && !rule.dataType.includes('*')) {
          return false;
        }

        if (rule.fieldPattern instanceof RegExp) {
          return rule.fieldPattern.test(String(value));
        } else if (typeof rule.fieldPattern === 'string' && rule.fieldPattern !== '*') {
          return String(value).includes(rule.fieldPattern);
        }

        return true;
      })
      .sort((a, b) => {
        const aSpecificity = this.calculateTransformationRuleSpecificity(a);
        const bSpecificity = this.calculateTransformationRuleSpecificity(b);
        return bSpecificity - aSpecificity;
      });
  }

  private async applyRedactionRule(
    value: any,
    rule: RedactionRule,
    context: RedactionContext
  ): Promise<any> {
    const stringValue = String(value);

    switch (rule.redactionType) {
      case RedactionType.MASK:
        return this.maskValue(stringValue, rule.parameters);

      case RedactionType.HASH:
        return this.hashValue(stringValue, rule.parameters);

      case RedactionType.ENCRYPT:
        return this.encryptValue(stringValue, rule.parameters);

      case RedactionType.REMOVE:
        return rule.parameters.replacement || '[REDACTED]';

      case RedactionType.REPLACE:
        return rule.parameters.replacement || '[REPLACED]';

      case RedactionType.TOKENIZE:
        return this.tokenizeValue(stringValue, rule.parameters);

      case RedactionType.BLUR:
        return this.blurNumericalValue(value, rule.parameters);

      case RedactionType.CULTURAL_PROTECT:
        return this.applyCulturalProtection(stringValue, rule.parameters, context);

      default:
        throw new Error(`Unknown redaction type: ${rule.redactionType}`);
    }
  }

  private async applyTransformationRule(
    value: any,
    rule: TransformationRule,
    context: RedactionContext
  ): Promise<any> {
    switch (rule.transformationType) {
      case TransformationType.REVERSIBLE_ENCRYPT:
        return this.reversibleEncrypt(value, rule.parameters);

      case TransformationType.FORMAT_PRESERVE_ENCRYPT:
        return this.formatPreservingEncrypt(String(value), rule.parameters);

      case TransformationType.DETERMINISTIC_HASH:
        return this.deterministicHash(value, rule.parameters);

      case TransformationType.ANONYMIZE:
        return this.anonymizeValue(value, rule.parameters);

      case TransformationType.PSEUDONYMIZE:
        return this.pseudonymizeValue(value, rule.parameters);

      case TransformationType.AGGREGATE:
        return this.aggregateValue(value, rule.parameters);

      case TransformationType.STATISTICAL_NOISE:
        return this.addStatisticalNoise(value, rule.parameters);

      case TransformationType.CULTURAL_ABSTRACTION:
        return this.applyCulturalAbstraction(value, rule.parameters, context);

      default:
        throw new Error(`Unknown transformation type: ${rule.transformationType}`);
    }
  }

  // Redaction implementations

  private maskValue(value: string, parameters: any): string {
    const maskChar = parameters.maskChar || '*';
    const showFirst = parameters.showFirst || 0;
    const showLast = parameters.showLast || 0;

    if (value.length <= showFirst + showLast) {
      return maskChar.repeat(value.length);
    }

    const first = value.substring(0, showFirst);
    const last = value.substring(value.length - showLast);
    const middle = maskChar.repeat(value.length - showFirst - showLast);

    return first + middle + last;
  }

  private hashValue(value: string, parameters: any): string {
    const algorithm = parameters.algorithm || 'sha256';
    const salt = parameters.salt || 'default-salt';
    
    return crypto
      .createHash(algorithm)
      .update(value + salt)
      .digest('hex');
  }

  private encryptValue(value: string, parameters: any): string {
    const algorithm = parameters.algorithm || 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private tokenizeValue(value: string, parameters: any): string {
    const tokenPrefix = parameters.prefix || 'TOK';
    const tokenId = crypto.randomBytes(8).toString('hex');
    return `${tokenPrefix}_${tokenId}`;
  }

  private blurNumericalValue(value: any, parameters: any): any {
    if (typeof value !== 'number') {
      const numValue = parseFloat(String(value));
      if (isNaN(numValue)) return value;
      value = numValue;
    }

    const blurFactor = parameters.blurFactor || 0.1;
    const noise = (Math.random() - 0.5) * 2 * blurFactor * value;
    return Math.round((value + noise) * 100) / 100;
  }

  private applyCulturalProtection(
    value: string, 
    parameters: any, 
    context: RedactionContext
  ): string {
    // Apply special Indigenous data protection
    if (context.culturalContext?.traditionalTerritory) {
      return `[Protected - ${context.culturalContext.traditionalTerritory} Cultural Data]`;
    }
    return '[Culturally Protected Data]';
  }

  // Transformation implementations

  private reversibleEncrypt(value: any, parameters: any): string {
    const stringValue = JSON.stringify(value);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(stringValue, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private formatPreservingEncrypt(value: string, parameters: any): string {
    // Preserve format while encrypting content
    const format = this.detectFormat(value);
    const contentOnly = this.extractContent(value, format);
    const encrypted = this.reversibleEncrypt(contentOnly, parameters);
    
    return this.applyFormat(encrypted.substring(0, contentOnly.length), format);
  }

  private deterministicHash(value: any, parameters: any): string {
    const algorithm = parameters.algorithm || 'sha256';
    const salt = parameters.salt || 'deterministic-salt';
    
    return crypto
      .createHmac(algorithm, salt)
      .update(JSON.stringify(value))
      .digest('hex');
  }

  private anonymizeValue(value: any, parameters: any): any {
    // Remove identifying information
    if (typeof value === 'string') {
      // Replace with generic equivalent
      if (value.includes('@')) {
        return 'user@example.com';
      }
      if (/^\d+$/.test(value)) {
        return '000000';
      }
    }
    return '[ANONYMIZED]';
  }

  private pseudonymizeValue(value: any, parameters: any): string {
    // Generate consistent pseudonym
    const hash = this.deterministicHash(value, parameters);
    const pseudonymMap = parameters.pseudonymMap || {};
    
    if (pseudonymMap[hash]) {
      return pseudonymMap[hash];
    }
    
    const pseudonym = `PSEUDO_${hash.substring(0, 8)}`;
    pseudonymMap[hash] = pseudonym;
    
    return pseudonym;
  }

  private aggregateValue(value: any, parameters: any): any {
    const bucketSize = parameters.bucketSize || 1000;
    
    if (typeof value === 'number') {
      return Math.floor(value / bucketSize) * bucketSize;
    }
    
    return value;
  }

  private addStatisticalNoise(value: any, parameters: any): any {
    if (typeof value !== 'number') return value;
    
    const noiseLevel = parameters.noiseLevel || 0.05;
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * value;
    
    return value + noise;
  }

  private applyCulturalAbstraction(
    value: any, 
    parameters: any, 
    context: RedactionContext
  ): string {
    // Apply cultural abstraction based on CARE principles
    return '[Cultural Knowledge - Access Restricted]';
  }

  // Helper methods

  private generateDataIdentifier(value: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }

  private generateReverseKey(value: any, rule: RedactionRule | TransformationRule): string {
    const keyData = {
      value: JSON.stringify(value),
      ruleId: rule.id,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex')
    };
    
    return JSON.stringify(keyData);
  }

  private encryptReverseKey(reverseKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(reverseKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptWithReverseKey(reverseKey: string): any {
    try {
      const keyData = JSON.parse(reverseKey);
      return JSON.parse(keyData.value);
    } catch (error) {
      throw new Error('Failed to decrypt reverse key');
    }
  }

  private calculateRuleSpecificity(rule: RedactionRule): number {
    let specificity = 0;
    
    if (rule.fieldPattern instanceof RegExp || 
        (typeof rule.fieldPattern === 'string' && rule.fieldPattern !== '*')) {
      specificity += 2;
    }
    
    if (rule.dataType.length === 1 && rule.dataType[0] !== '*') {
      specificity += 1;
    }
    
    if (rule.culturalSensitive) {
      specificity += 1;
    }
    
    return specificity;
  }

  private calculateTransformationRuleSpecificity(rule: TransformationRule): number {
    let specificity = 0;
    
    if (rule.fieldPattern instanceof RegExp || 
        (typeof rule.fieldPattern === 'string' && rule.fieldPattern !== '*')) {
      specificity += 2;
    }
    
    if (rule.dataType.length === 1 && rule.dataType[0] !== '*') {
      specificity += 1;
    }
    
    if (rule.culturalProtections.length > 0) {
      specificity += 1;
    }
    
    return specificity;
  }

  private detectFormat(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date-iso';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return 'date-au';
    if (/^\d{3}-\d{3}$/.test(value)) return 'bsb';
    if (/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(value)) return 'credit-card';
    return 'text';
  }

  private extractContent(value: string, format: string): string {
    switch (format) {
      case 'date-iso':
      case 'date-au':
      case 'bsb':
        return value.replace(/[-\/]/g, '');
      case 'credit-card':
        return value.replace(/\s/g, '');
      default:
        return value;
    }
  }

  private applyFormat(content: string, format: string): string {
    switch (format) {
      case 'date-iso':
        return content.substring(0, 4) + '-' + content.substring(4, 6) + '-' + content.substring(6, 8);
      case 'date-au':
        return content.substring(0, 2) + '/' + content.substring(2, 4) + '/' + content.substring(4, 8);
      case 'bsb':
        return content.substring(0, 3) + '-' + content.substring(3, 6);
      case 'credit-card':
        return content.substring(0, 4) + ' ' + content.substring(4, 8) + ' ' + 
               content.substring(8, 12) + ' ' + content.substring(12, 16);
      default:
        return content;
    }
  }

  private createRedactionResult(params: {
    success: boolean;
    originalValue?: any;
    redactedValue: any;
    redactionType: RedactionType;
    ruleId: string;
    reversible: boolean;
    transformationId?: string;
    classification: any;
    context: RedactionContext;
    processingTime: number;
    errors?: string[];
    warnings?: string[];
  }): RedactionResult {
    return {
      success: params.success,
      originalValue: params.originalValue,
      redactedValue: params.redactedValue,
      redactionType: params.redactionType,
      ruleId: params.ruleId,
      reversible: params.reversible,
      transformationId: params.transformationId,
      metadata: {
        dataType: params.classification.dataType,
        sensitivityLevel: params.classification.sensitivityLevel,
        complianceFrameworks: this.classifier.getAustralianComplianceRequirements(params.classification.dataType),
        culturalSensitive: params.classification.culturalSensitive,
        processingTime: params.processingTime
      },
      auditTrail: {
        id: crypto.randomUUID(),
        operation: 'redaction',
        ruleId: params.ruleId,
        dataIdentifier: this.generateDataIdentifier(params.originalValue || params.redactedValue),
        userId: params.context.userId,
        sessionId: params.context.sessionId,
        requestId: params.context.requestId,
        timestamp: new Date(),
        success: params.success,
        culturalSensitive: params.classification.culturalSensitive,
        complianceFrameworks: this.classifier.getAustralianComplianceRequirements(params.classification.dataType),
        retentionPeriod: params.classification.culturalSensitive ? 
          50 * 365 * 24 * 60 * 60 * 1000 : // 50 years for Indigenous data
          7 * 365 * 24 * 60 * 60 * 1000,   // 7 years for other data
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
        reversalPossible: params.reversible
      },
      errors: params.errors,
      warnings: params.warnings
    };
  }

  private async createAuditEntry(
    operation: 'redaction' | 'transformation' | 'reversal',
    ruleId: string,
    dataIdentifier: string,
    context: RedactionContext,
    success: boolean
  ): Promise<AuditEntry> {
    return {
      id: crypto.randomUUID(),
      operation,
      ruleId,
      dataIdentifier,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      timestamp: new Date(),
      success,
      culturalSensitive: !!context.culturalContext,
      complianceFrameworks: context.complianceContext.frameworks,
      retentionPeriod: context.complianceContext.retentionPeriod,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reversalPossible: operation === 'transformation'
    };
  }

  private async validateReversalRequest(request: ReversalRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    
    if (!request.transformationId) {
      errors.push('Transformation ID is required');
    }
    
    if (!request.userId) {
      errors.push('User ID is required');
    }
    
    if (!request.justification || request.justification.trim().length < 10) {
      errors.push('Justification must be at least 10 characters');
    }
    
    return {
      valid: errors.length === 0,
      ruleId: 'reversal-validation',
      errors,
      warnings: [],
      suggestions: []
    };
  }

  private buildApprovalsList(request: ReversalRequest): Array<{
    type: 'user' | 'cultural' | 'compliance';
    approvedBy: string;
    approvedAt: Date;
    conditions?: string[];
  }> {
    const approvals: Array<{
      type: 'user' | 'cultural' | 'compliance';
      approvedBy: string;
      approvedAt: Date;
      conditions?: string[];
    }> = [
      {
        type: 'user',
        approvedBy: request.userId,
        approvedAt: new Date()
      }
    ];

    if (request.culturalApproval) {
      approvals.push({
        type: 'cultural',
        approvedBy: request.culturalApproval.elderId,
        approvedAt: request.culturalApproval.approvalDate,
        conditions: request.culturalApproval.ceremonyRequired ? ['ceremony_required'] : undefined
      });
    }

    if (request.complianceApproval) {
      approvals.push({
        type: 'compliance',
        approvedBy: request.complianceApproval.approvalId,
        approvedAt: new Date(),
        conditions: [`valid_until_${request.complianceApproval.validUntil.toISOString()}`]
      });
    }

    return approvals;
  }

  private validateSingleRule(rule: RedactionRule | TransformationRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!rule.id) {
      errors.push('Rule ID is required');
    }

    if (!rule.name) {
      errors.push('Rule name is required');
    }

    if (!rule.dataType || rule.dataType.length === 0) {
      errors.push('At least one data type must be specified');
    }

    if ('redactionType' in rule) {
      if (!Object.values(RedactionType).includes(rule.redactionType)) {
        errors.push(`Invalid redaction type: ${rule.redactionType}`);
      }
    }

    if ('transformationType' in rule) {
      if (!Object.values(TransformationType).includes(rule.transformationType)) {
        errors.push(`Invalid transformation type: ${rule.transformationType}`);
      }
    }

    if (rule.reversible && !rule.parameters) {
      warnings.push('Reversible operations should have parameters defined');
    }

    return {
      valid: errors.length === 0,
      ruleId: rule.id,
      errors,
      warnings,
      suggestions
    };
  }
}