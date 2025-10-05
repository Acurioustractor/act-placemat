/**
 * Batch Redaction Processor
 * 
 * Efficient batch processing of redaction and transformation operations
 * with parallel processing and cultural data sensitivity handling
 */

import {
  BatchRedactionRequest,
  BatchRedactionResult,
  RedactionRule,
  TransformationRule,
  RedactionResult,
  TransformationResult,
  DataSensitivityLevel
} from './types';
import { RedactionEngine } from './RedactionEngine';
import { DataTypeClassifier } from './DataTypeClassifier';
import { CulturalDataHandler } from './CulturalDataHandler';
import { AuditLogger } from './AuditLogger';

export class BatchRedactionProcessor {
  private redactionEngine: RedactionEngine;
  private classifier: DataTypeClassifier;
  private culturalHandler: CulturalDataHandler;
  private auditLogger: AuditLogger;

  constructor(
    redactionEngine: RedactionEngine,
    auditLogger: AuditLogger,
    culturalHandler?: CulturalDataHandler
  ) {
    this.redactionEngine = redactionEngine;
    this.classifier = new DataTypeClassifier();
    this.culturalHandler = culturalHandler || new CulturalDataHandler();
    this.auditLogger = auditLogger;
  }

  async processBatch(request: BatchRedactionRequest): Promise<BatchRedactionResult> {
    const startTime = Date.now();
    const batchId = this.generateBatchId();

    try {
      // Validate batch request
      const validation = this.validateBatchRequest(request);
      if (!validation.valid) {
        throw new Error(`Batch validation failed: ${validation.errors.join(', ')}`);
      }

      // Sort items by cultural sensitivity and data type for optimized processing
      const sortedItems = this.sortItemsForProcessing(request.items);

      // Process items in batches
      const results = await this.processItemsBatched(
        sortedItems,
        request,
        batchId
      );

      // Generate summary
      const summary = this.generateBatchSummary(results, startTime);
      
      // Generate audit summary
      const auditSummary = await this.generateAuditSummary(results, request);

      const batchResult: BatchRedactionResult = {
        success: true,
        results,
        summary,
        auditSummary,
        errors: [],
        warnings: this.generateBatchWarnings(results)
      };

      // Log batch completion
      await this.auditLogger.logAdminAction({
        adminUserId: request.context.userId,
        action: 'batch_redaction_completed',
        resource: 'batch_operation',
        resourceId: batchId,
        culturalSensitive: summary.culturalDataProcessed > 0,
        justification: `Batch processing of ${summary.total} items`
      });

      return batchResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log batch failure
      await this.auditLogger.logAdminAction({
        adminUserId: request.context.userId,
        action: 'batch_redaction_failed',
        resource: 'batch_operation',
        resourceId: batchId,
        culturalSensitive: false,
        justification: `Batch processing failed: ${errorMessage}`
      });

      return {
        success: false,
        results: [],
        summary: {
          total: request.items.length,
          successful: 0,
          failed: request.items.length,
          culturalDataProcessed: 0,
          processingTime: Date.now() - startTime
        },
        auditSummary: {
          entriesCreated: 0,
          complianceFrameworks: [],
          retentionPeriods: []
        },
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  private validateBatchRequest(request: BatchRedactionRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.items || request.items.length === 0) {
      errors.push('Batch request must contain at least one item');
    }

    if (request.items.length > 10000) {
      warnings.push('Large batch size may impact performance');
    }

    if (!request.context.userId) {
      errors.push('User ID is required for audit trail');
    }

    // Check for duplicate item IDs
    const itemIds = request.items.map(item => item.id);
    const duplicateIds = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate item IDs found: ${duplicateIds.join(', ')}`);
    }

    // Validate cultural sensitivity requirements
    const culturalItems = request.items.filter(item => 
      this.classifier.classify(item.value).culturalSensitive
    );

    if (culturalItems.length > 0) {
      if (!request.context.culturalContext?.traditionalTerritory) {
        warnings.push('Cultural data detected but no Traditional Territory specified');
      }

      if (request.context.sovereigntyLevel !== 'traditional_owner' && 
          !request.context.culturalContext?.elderApproval) {
        warnings.push('Cultural data may require Elder approval');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private sortItemsForProcessing(items: BatchRedactionRequest['items']): BatchRedactionRequest['items'] {
    return items.sort((a, b) => {
      // Prioritize cultural data first (for proper handling)
      const aCultural = this.classifier.classify(a.value).culturalSensitive;
      const bCultural = this.classifier.classify(b.value).culturalSensitive;
      
      if (aCultural !== bCultural) {
        return aCultural ? -1 : 1;
      }

      // Then sort by data type for processing efficiency
      const aType = this.classifier.classify(a.value).dataType;
      const bType = this.classifier.classify(b.value).dataType;
      
      return aType.localeCompare(bType);
    });
  }

  private async processItemsBatched(
    items: BatchRedactionRequest['items'],
    request: BatchRedactionRequest,
    batchId: string
  ): Promise<Array<{ id: string; result: RedactionResult | TransformationResult }>> {
    const results: Array<{ id: string; result: RedactionResult | TransformationResult }> = [];
    const batchSize = request.options?.batchSize || 100;
    const parallel = request.options?.parallel ?? true;
    const failFast = request.options?.failFast ?? false;

    // Process items in chunks
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      
      let chunkResults: Array<{ id: string; result: RedactionResult | TransformationResult }>;
      
      if (parallel) {
        chunkResults = await this.processChunkParallel(chunk, request, failFast);
      } else {
        chunkResults = await this.processChunkSequential(chunk, request, failFast);
      }

      results.push(...chunkResults);

      // Check if we should fail fast
      if (failFast && chunkResults.some(r => !r.result.success)) {
        break;
      }
    }

    return results;
  }

  private async processChunkParallel(
    chunk: BatchRedactionRequest['items'],
    request: BatchRedactionRequest,
    failFast: boolean
  ): Promise<Array<{ id: string; result: RedactionResult | TransformationResult }>> {
    const promises = chunk.map(item => this.processItem(item, request));
    
    if (failFast) {
      // Use Promise.all for fail-fast behavior
      const results = await Promise.all(promises);
      return results;
    } else {
      // Use Promise.allSettled to process all items regardless of failures
      const settledResults = await Promise.allSettled(promises);
      return settledResults.map((settled, index) => {
        if (settled.status === 'fulfilled') {
          return settled.value;
        } else {
          // Create error result for failed promises
          return {
            id: chunk[index].id,
            result: this.createErrorResult(chunk[index], settled.reason)
          };
        }
      });
    }
  }

  private async processChunkSequential(
    chunk: BatchRedactionRequest['items'],
    request: BatchRedactionRequest,
    failFast: boolean
  ): Promise<Array<{ id: string; result: RedactionResult | TransformationResult }>> {
    const results: Array<{ id: string; result: RedactionResult | TransformationResult }> = [];

    for (const item of chunk) {
      try {
        const result = await this.processItem(item, request);
        results.push(result);

        if (failFast && !result.result.success) {
          break;
        }
      } catch (error) {
        const errorResult = {
          id: item.id,
          result: this.createErrorResult(item, error)
        };
        results.push(errorResult);

        if (failFast) {
          break;
        }
      }
    }

    return results;
  }

  private async processItem(
    item: BatchRedactionRequest['items'][0],
    request: BatchRedactionRequest
  ): Promise<{ id: string; result: RedactionResult | TransformationResult }> {
    try {
      // Classify the data
      const classification = this.classifier.classify(item.value);

      // Determine if redaction or transformation is needed
      const useTransformation = this.shouldUseTransformation(classification, request);

      let result: RedactionResult | TransformationResult;

      if (useTransformation) {
        const transformRules = await this.getTransformationRules(item, classification);
        result = await this.redactionEngine.transform(
          item.value,
          transformRules,
          request.context
        );
      } else {
        const redactRules = await this.getRedactionRules(item, classification);
        result = await this.redactionEngine.redact(
          item.value,
          redactRules,
          request.context
        );
      }

      return { id: item.id, result };

    } catch (error) {
      throw new Error(`Failed to process item ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private shouldUseTransformation(
    classification: ReturnType<DataTypeClassifier['classify']>,
    request: BatchRedactionRequest
  ): boolean {
    // Use transformation for reversible operations on sensitive data
    if (classification.sensitivityLevel === DataSensitivityLevel.RESTRICTED ||
        classification.sensitivityLevel === DataSensitivityLevel.SACRED) {
      return true;
    }

    // Use transformation for cultural data
    if (classification.culturalSensitive) {
      return true;
    }

    // Check context purpose for transformation needs
    if (request.context.purpose.includes('audit_reversible') ||
        request.context.purpose.includes('compliance_reversible')) {
      return true;
    }

    return false;
  }

  private async getRedactionRules(
    item: BatchRedactionRequest['items'][0],
    classification: ReturnType<DataTypeClassifier['classify']>
  ): Promise<RedactionRule[]> {
    // This would typically load rules from a rule engine or database
    // For now, return basic rules based on data type and sensitivity
    
    const baseRule: RedactionRule = {
      id: `batch-redaction-${classification.dataType}`,
      name: `Batch Redaction Rule for ${classification.dataType}`,
      description: `Auto-generated rule for batch processing ${classification.dataType} data`,
      fieldPattern: '*',
      dataType: [classification.dataType],
      sensitivityLevels: [classification.sensitivityLevel],
      redactionType: classification.culturalSensitive ? 'cultural_protect' : 'mask',
      parameters: classification.culturalSensitive 
        ? { territory: 'auto-detected' }
        : { maskChar: '*', showFirst: 0, showLast: 0 },
      reversible: classification.sensitivityLevel === DataSensitivityLevel.RESTRICTED,
      culturalSensitive: classification.culturalSensitive,
      complianceFrameworks: this.classifier.getAustralianComplianceRequirements(classification.dataType),
      retentionPeriod: classification.culturalSensitive 
        ? 50 * 365 * 24 * 60 * 60 * 1000  // 50 years
        : 7 * 365 * 24 * 60 * 60 * 1000,   // 7 years
      auditRequired: true,
      createdAt: new Date(),
      lastModified: new Date(),
      version: '1.0'
    };

    return [baseRule];
  }

  private async getTransformationRules(
    item: BatchRedactionRequest['items'][0],
    classification: ReturnType<DataTypeClassifier['classify']>
  ): Promise<TransformationRule[]> {
    const baseRule: TransformationRule = {
      id: `batch-transform-${classification.dataType}`,
      name: `Batch Transformation Rule for ${classification.dataType}`,
      description: `Auto-generated transformation rule for batch processing ${classification.dataType} data`,
      fieldPattern: '*',
      dataType: [classification.dataType],
      transformationType: classification.culturalSensitive 
        ? 'cultural_abstraction' 
        : 'reversible_encrypt',
      parameters: {},
      reversible: true,
      culturalProtections: classification.culturalSensitive ? [{
        territory: 'auto-detected',
        protectionLevel: 'sacred',
        elderApprovalRequired: true,
        accessRestrictions: ['no_external_sharing']
      }] : [],
      complianceValidation: [{
        framework: 'privacy_act_1988',
        requirements: ['explicit_consent', 'purpose_limitation'],
        validationRules: ['data_minimisation'],
        auditFrequency: 90
      }],
      performanceHint: {
        cacheableDuration: 3600,
        computeIntensity: 'medium',
        memoryRequirement: 1024,
        batchingRecommended: true,
        parallelizable: true
      },
      createdAt: new Date(),
      lastModified: new Date(),
      version: '1.0'
    };

    return [baseRule];
  }

  private createErrorResult(
    item: BatchRedactionRequest['items'][0],
    error: any
  ): RedactionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      originalValue: item.value,
      redactedValue: item.value,
      redactionType: 'remove',
      ruleId: 'batch-error',
      reversible: false,
      metadata: {
        dataType: 'unknown',
        sensitivityLevel: DataSensitivityLevel.PUBLIC,
        complianceFrameworks: [],
        culturalSensitive: false,
        processingTime: 0
      },
      auditTrail: {
        id: this.generateBatchId(),
        operation: 'redaction',
        ruleId: 'batch-error',
        dataIdentifier: this.generateDataIdentifier(item.value),
        userId: 'batch-processor',
        sessionId: 'batch-session',
        requestId: item.id,
        timestamp: new Date(),
        success: false,
        culturalSensitive: false,
        complianceFrameworks: [],
        retentionPeriod: 0,
        reversalPossible: false,
        errorDetails: errorMessage
      },
      errors: [errorMessage]
    };
  }

  private generateBatchSummary(
    results: Array<{ id: string; result: RedactionResult | TransformationResult }>,
    startTime: number
  ): BatchRedactionResult['summary'] {
    const successful = results.filter(r => r.result.success).length;
    const failed = results.length - successful;
    
    const culturalDataProcessed = results.filter(r => 
      'metadata' in r.result && r.result.metadata.culturalSensitive
    ).length;

    return {
      total: results.length,
      successful,
      failed,
      culturalDataProcessed,
      processingTime: Date.now() - startTime
    };
  }

  private async generateAuditSummary(
    results: Array<{ id: string; result: RedactionResult | TransformationResult }>,
    request: BatchRedactionRequest
  ): Promise<BatchRedactionResult['auditSummary']> {
    const entriesCreated = results.length; // Each result creates an audit entry
    
    const allFrameworks = new Set<string>();
    const allRetentionPeriods = new Set<number>();

    for (const result of results) {
      if ('metadata' in result.result) {
        result.result.metadata.complianceFrameworks.forEach(f => allFrameworks.add(f));
        
        // Extract retention period from audit trail
        if (result.result.auditTrail) {
          allRetentionPeriods.add(result.result.auditTrail.retentionPeriod);
        }
      }
    }

    return {
      entriesCreated,
      complianceFrameworks: Array.from(allFrameworks),
      retentionPeriods: Array.from(allRetentionPeriods)
    };
  }

  private generateBatchWarnings(
    results: Array<{ id: string; result: RedactionResult | TransformationResult }>
  ): string[] {
    const warnings: string[] = [];

    const failureRate = results.filter(r => !r.result.success).length / results.length;
    if (failureRate > 0.1) {
      warnings.push('High failure rate detected in batch processing');
    }

    const culturalDataCount = results.filter(r => 
      'metadata' in r.result && r.result.metadata.culturalSensitive
    ).length;

    if (culturalDataCount > 0) {
      warnings.push(`${culturalDataCount} items contain culturally sensitive data - ensure proper protocols are followed`);
    }

    return warnings;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDataIdentifier(value: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }
}