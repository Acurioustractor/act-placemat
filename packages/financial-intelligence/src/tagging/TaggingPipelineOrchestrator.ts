/**
 * Tagging Pipeline Orchestrator
 * 
 * Main orchestrator that coordinates data catalog interface, auto-tagging engine,
 * and PostgreSQL sync pipeline for comprehensive metadata management
 */

import { EventEmitter } from 'events';
import { 
  SyncPipelineConfig,
  DataCatalogEntry,
  SyncResult,
  MonitoringConfig,
  AlertChannel,
  SyncError,
  SyncWarning
} from './types';
import { DataCatalogInterface, DataCatalogFactory } from './DataCatalogInterface';
import { PostgreSQLSyncPipeline } from './PostgreSQLSyncPipeline';
import { AutoTaggingEngine } from './AutoTaggingEngine';
import { v4 as uuidv4 } from 'uuid';

/**
 * Orchestrates the complete tagging pipeline workflow
 */
export class TaggingPipelineOrchestrator extends EventEmitter {
  private config: SyncPipelineConfig;
  private catalogInterface: DataCatalogInterface;
  private syncPipeline: PostgreSQLSyncPipeline;
  private taggingEngine: AutoTaggingEngine;
  private isRunning: boolean = false;
  private currentOperation: string | null = null;
  private scheduleTimers: NodeJS.Timeout[] = [];

  constructor(config: SyncPipelineConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.catalogInterface = DataCatalogFactory.create(config.dataCatalog);
    this.syncPipeline = new PostgreSQLSyncPipeline(config.postgresql, config.sync);
    this.taggingEngine = new AutoTaggingEngine();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the orchestrator and all components
   */
  async initialize(): Promise<void> {
    try {
      this.emit('orchestrator_initializing');

      // Initialize all components
      await this.catalogInterface.initialize();
      await this.syncPipeline.initialize();
      await this.taggingEngine.initialize();

      // Test connections
      const catalogConnected = await this.catalogInterface.testConnection();
      if (!catalogConnected) {
        throw new Error('Failed to connect to data catalog');
      }

      // Setup schedules if configured
      this.setupSchedules();

      this.emit('orchestrator_initialized');
    } catch (error) {
      this.emit('orchestrator_error', error);
      throw error;
    }
  }

  /**
   * Run full synchronization workflow
   */
  async runFullSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync operation already in progress');
    }

    const operationId = uuidv4();
    const startTime = new Date();
    this.isRunning = true;
    this.currentOperation = 'full_sync';

    try {
      this.emit('sync_workflow_started', { operationId, type: 'full' });

      // Create enhanced catalog interface with auto-tagging
      const taggedCatalogInterface = this.createTaggedCatalogInterface();

      // Run sync pipeline with auto-tagged entries
      const result = await this.syncPipeline.performFullSync(taggedCatalogInterface);

      // Perform post-sync validation
      await this.performPostSyncValidation(result);

      // Send notifications
      await this.sendSyncNotifications(result);

      this.emit('sync_workflow_completed', result);
      return result;

    } catch (error) {
      const endTime = new Date();
      const failureResult: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: 'failure',
        statistics: {
          totalRecords: 0,
          inserted: 0,
          updated: 0,
          deleted: 0,
          skipped: 0,
          failed: 0,
          tagsApplied: 0,
          complianceIssues: 0
        },
        errors: [{
          id: uuidv4(),
          type: 'database',
          message: error.message,
          details: error,
          timestamp: new Date(),
          retryable: true
        }],
        warnings: []
      };

      this.emit('sync_workflow_failed', failureResult);
      return failureResult;

    } finally {
      this.isRunning = false;
      this.currentOperation = null;
    }
  }

  /**
   * Run incremental synchronization workflow
   */
  async runIncrementalSync(since?: Date): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync operation already in progress');
    }

    const operationId = uuidv4();
    const startTime = new Date();
    const sinceDt = since || this.getLastSyncTimestamp();
    
    this.isRunning = true;
    this.currentOperation = 'incremental_sync';

    try {
      this.emit('sync_workflow_started', { operationId, type: 'incremental', since: sinceDt });

      // Create enhanced catalog interface with auto-tagging
      const taggedCatalogInterface = this.createTaggedCatalogInterface();

      // Run incremental sync
      const result = await this.syncPipeline.performIncrementalSync(taggedCatalogInterface, sinceDt);

      // Perform post-sync validation
      await this.performPostSyncValidation(result);

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(new Date());

      // Send notifications
      await this.sendSyncNotifications(result);

      this.emit('sync_workflow_completed', result);
      return result;

    } catch (error) {
      const endTime = new Date();
      const failureResult: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: 'failure',
        statistics: {
          totalRecords: 0,
          inserted: 0,
          updated: 0,
          deleted: 0,
          skipped: 0,
          failed: 0,
          tagsApplied: 0,
          complianceIssues: 0
        },
        errors: [{
          id: uuidv4(),
          type: 'database',
          message: error.message,
          details: error,
          timestamp: new Date(),
          retryable: true
        }],
        warnings: []
      };

      this.emit('sync_workflow_failed', failureResult);
      return failureResult;

    } finally {
      this.isRunning = false;
      this.currentOperation = null;
    }
  }

  /**
   * Start real-time sync monitoring
   */
  async startRealTimeSync(): Promise<void> {
    if (this.config.sync.mode !== 'real_time') {
      throw new Error('Real-time sync not configured');
    }

    const interval = this.config.sync.frequency.realTime * 1000; // Convert to milliseconds
    
    const timer = setInterval(async () => {
      try {
        if (!this.isRunning) {
          await this.runIncrementalSync();
        }
      } catch (error) {
        this.emit('real_time_sync_error', error);
      }
    }, interval);

    this.scheduleTimers.push(timer);
    this.emit('real_time_sync_started', { interval });
  }

  /**
   * Stop real-time sync monitoring
   */
  stopRealTimeSync(): void {
    this.scheduleTimers.forEach(timer => clearInterval(timer));
    this.scheduleTimers = [];
    this.emit('real_time_sync_stopped');
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    currentOperation: string | null;
    lastSync: Date | null;
    nextSync: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      currentOperation: this.currentOperation,
      lastSync: this.getLastSyncTimestamp(),
      nextSync: this.getNextScheduledSync()
    };
  }

  /**
   * Manually trigger tagging for a specific entry
   */
  async tagEntry(entryId: string): Promise<DataCatalogEntry> {
    const entry = await this.catalogInterface.getEntry(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    const taggedEntry = await this.taggingEngine.applyAutoTags(entry);
    await this.syncPipeline.syncEntry(taggedEntry);

    this.emit('entry_tagged', { entryId, tagsApplied: this.countTags(taggedEntry) });
    return taggedEntry;
  }

  /**
   * Validate compliance for specific entry
   */
  async validateCompliance(entryId: string): Promise<{
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const entry = await this.catalogInterface.getEntry(entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for personal data without proper consent
    const hasPersonalData = entry.schema.fields.some(field => field.personalData);
    if (hasPersonalData && entry.governance.consent.requiredLevel === 'basic_consent') {
      issues.push('Personal data detected but only basic consent required');
      recommendations.push('Upgrade to explicit consent for personal data');
    }

    // Check for Indigenous data compliance
    const hasIndigenousData = entry.schema.fields.some(field => field.indigenousData);
    if (hasIndigenousData) {
      if (!entry.compliance.australian.indigenous?.careApplicable) {
        issues.push('Indigenous data detected but CARE principles not applied');
        recommendations.push('Apply CARE principles for Indigenous data');
      }
      if (entry.governance.sovereignty.level !== 'indigenous') {
        issues.push('Indigenous data without appropriate sovereignty level');
        recommendations.push('Set sovereignty level to indigenous');
      }
    }

    // Check data residency
    if (entry.compliance.australian.dataResidency.required) {
      const allowedRegions = entry.compliance.australian.dataResidency.allowedRegions;
      if (!allowedRegions.includes('ap-southeast-2')) {
        issues.push('Data residency required but no Australian region specified');
        recommendations.push('Ensure data resides in ap-southeast-2 (Sydney)');
      }
    }

    // Check retention periods
    const hasHighSensitivityData = entry.schema.fields.some(field => 
      field.sensitivity === 'restricted' || field.sensitivity === 'secret'
    );
    if (hasHighSensitivityData && entry.governance.retention.years < 7) {
      issues.push('High sensitivity data with insufficient retention period');
      recommendations.push('Set retention period to at least 7 years for compliance');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get sync metrics and statistics
   */
  async getSyncMetrics(timeRange: { start: Date; end: Date }): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalRecordsProcessed: number;
    totalTagsApplied: number;
    averageSyncDuration: number;
    complianceIssuesDetected: number;
  }> {
    // This would query the sync_operations table for metrics
    // Implementation would depend on having access to the database
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRecordsProcessed: 0,
      totalTagsApplied: 0,
      averageSyncDuration: 0,
      complianceIssuesDetected: 0
    };
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    this.stopRealTimeSync();
    
    await Promise.all([
      this.catalogInterface.shutdown(),
      this.syncPipeline.shutdown()
    ]);

    this.emit('orchestrator_shutdown');
  }

  // Private methods

  private setupEventHandlers(): void {
    // Forward events from components
    this.catalogInterface.on('error', (error) => this.emit('catalog_error', error));
    this.syncPipeline.on('sync_started', (data) => this.emit('pipeline_sync_started', data));
    this.syncPipeline.on('sync_completed', (result) => this.emit('pipeline_sync_completed', result));
    this.syncPipeline.on('sync_failed', (result) => this.emit('pipeline_sync_failed', result));
    this.taggingEngine.on('tags_applied', (data) => this.emit('tags_applied', data));
  }

  private createTaggedCatalogInterface(): DataCatalogInterface {
    // Create a wrapper that applies auto-tagging to all entries
    const originalInterface = this.catalogInterface;
    const taggingEngine = this.taggingEngine;

    return {
      ...originalInterface,
      
      async* getAllEntries() {
        for await (const entryBatch of originalInterface.getAllEntries()) {
          const taggedBatch = await Promise.all(
            entryBatch.map(entry => taggingEngine.applyAutoTags(entry))
          );
          yield taggedBatch;
        }
      },

      async* getModifiedSince(timestamp: Date) {
        for await (const entryBatch of originalInterface.getModifiedSince(timestamp)) {
          const taggedBatch = await Promise.all(
            entryBatch.map(entry => taggingEngine.applyAutoTags(entry))
          );
          yield taggedBatch;
        }
      },

      async getEntry(id: string) {
        const entry = await originalInterface.getEntry(id);
        return entry ? await taggingEngine.applyAutoTags(entry) : null;
      }
    } as DataCatalogInterface;
  }

  private setupSchedules(): void {
    // Setup full sync schedule
    if (this.config.sync.frequency.full) {
      // Would use a cron library to parse and schedule
      // For now, just log the configuration
      this.emit('schedule_configured', {
        type: 'full',
        schedule: this.config.sync.frequency.full
      });
    }

    // Setup incremental sync schedule
    if (this.config.sync.frequency.incremental) {
      this.emit('schedule_configured', {
        type: 'incremental',
        schedule: this.config.sync.frequency.incremental
      });
    }

    // Setup real-time sync if configured
    if (this.config.sync.mode === 'real_time') {
      this.startRealTimeSync().catch(error => {
        this.emit('real_time_sync_error', error);
      });
    }
  }

  private async performPostSyncValidation(result: SyncResult): Promise<void> {
    // Validate sync results
    if (result.status === 'failure') {
      this.emit('sync_validation_failed', {
        operationId: result.operationId,
        errors: result.errors
      });
      return;
    }

    // Check for compliance issues
    if (result.statistics.complianceIssues > 0) {
      this.emit('compliance_issues_detected', {
        operationId: result.operationId,
        issueCount: result.statistics.complianceIssues
      });
    }

    // Validate data quality
    const errorRate = result.statistics.failed / result.statistics.totalRecords;
    if (errorRate > 0.05) { // 5% error threshold
      this.emit('data_quality_concern', {
        operationId: result.operationId,
        errorRate,
        recommendation: 'Review data source quality and transformation logic'
      });
    }

    this.emit('sync_validation_completed', {
      operationId: result.operationId,
      status: 'passed'
    });
  }

  private async sendSyncNotifications(result: SyncResult): Promise<void> {
    if (!this.config.monitoring.alerting.enabled) {
      return;
    }

    const channels = this.config.monitoring.alerting.channels;
    
    // Send notifications based on result status
    if (result.status === 'failure') {
      await this.sendAlert(channels, 'error', 'Sync operation failed', result);
    } else if (result.status === 'partial') {
      await this.sendAlert(channels, 'warning', 'Sync operation completed with errors', result);
    } else if (result.statistics.complianceIssues > 0) {
      await this.sendAlert(channels, 'warning', 'Compliance issues detected during sync', result);
    }
  }

  private async sendAlert(
    channels: AlertChannel[], 
    severity: string, 
    message: string, 
    result: SyncResult
  ): Promise<void> {
    for (const channel of channels.filter(c => c.enabled)) {
      try {
        // Implementation would depend on channel type
        switch (channel.type) {
          case 'email':
            // Send email notification
            break;
          case 'slack':
            // Send Slack notification
            break;
          case 'webhook':
            // Send webhook notification
            break;
          case 'pagerduty':
            // Send PagerDuty alert
            break;
        }
        
        this.emit('alert_sent', {
          channel: channel.type,
          severity,
          message,
          operationId: result.operationId
        });
      } catch (error) {
        this.emit('alert_failed', {
          channel: channel.type,
          error: error.message
        });
      }
    }
  }

  private getLastSyncTimestamp(): Date | null {
    // This would query the database for the last successful sync
    // For now, return a default
    return new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  }

  private async updateLastSyncTimestamp(timestamp: Date): Promise<void> {
    // This would update the database with the last sync timestamp
    this.emit('last_sync_updated', timestamp);
  }

  private getNextScheduledSync(): Date | null {
    // This would calculate the next scheduled sync based on cron expressions
    // For now, return null
    return null;
  }

  private countTags(entry: DataCatalogEntry): number {
    return entry.schema.fields.reduce((count, field) => count + field.tags.length, 0);
  }
}

/**
 * Factory for creating configured tagging pipeline orchestrators
 */
export class TaggingPipelineFactory {
  /**
   * Create a production-ready tagging pipeline
   */
  static createProduction(overrides: Partial<SyncPipelineConfig> = {}): TaggingPipelineOrchestrator {
    const defaultConfig: SyncPipelineConfig = {
      dataCatalog: {
        type: 'apache_atlas',
        connection: {
          url: process.env.ATLAS_URL || 'http://localhost:21000',
          username: process.env.ATLAS_USERNAME || 'admin',
          password: process.env.ATLAS_PASSWORD || 'admin',
          timeout: 30000
        },
        query: {
          batchSize: 100,
          maxRetries: 3,
          retryDelay: 5000
        },
        filters: {
          includedTypes: ['table', 'view', 'materialized_view'] as any,
          excludedTypes: [],
          includedTags: [],
          excludedTags: ['test', 'temp']
        }
      },
      postgresql: {
        connection: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'financial_intelligence',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres',
          ssl: process.env.NODE_ENV === 'production',
          poolSize: 10
        },
        schema: {
          catalogSchema: 'data_catalog',
          tagsSchema: 'data_tags',
          metadataSchema: 'data_metadata'
        },
        performance: {
          batchSize: 1000,
          parallelWorkers: 4,
          enablePartitioning: true
        }
      },
      sync: {
        mode: 'incremental',
        frequency: {
          full: '0 2 * * 0', // Weekly at 2 AM Sunday
          incremental: '0 * * * *', // Hourly
          realTime: 300 // 5 minutes
        },
        changeDetection: {
          enabled: true,
          strategy: 'timestamp',
          timestampField: 'lastModified'
        },
        conflictResolution: {
          strategy: 'catalog_wins',
          manualApprovalRequired: false
        },
        errorHandling: {
          maxRetries: 3,
          retryDelay: 5000,
          continueOnError: true,
          deadLetterQueue: true
        }
      },
      tagging: {
        autoTagging: {
          enabled: true,
          rules: [] // Will be populated by AutoTaggingEngine
        },
        validation: {
          enabled: true,
          requiredTags: ['sensitivity', 'data_type'],
          allowedValues: {
            sensitivity: ['public', 'internal', 'confidential', 'restricted', 'secret'],
            data_type: ['personal_data', 'financial_data', 'indigenous_data', 'system_data']
          }
        },
        propagation: {
          enabled: true,
          inheritanceRules: []
        },
        compliance: {
          autoDetectPII: true,
          autoDetectIndigenous: true,
          autoApplyPrivacyAct: true,
          autoApplyDataResidency: true
        }
      },
      monitoring: {
        metrics: {
          enabled: true,
          provider: 'prometheus',
          interval: 60000 // 1 minute
        },
        alerting: {
          enabled: true,
          channels: [],
          rules: []
        },
        logging: {
          level: 'info',
          destination: 'console',
          format: 'json'
        }
      }
    };

    const config = { ...defaultConfig, ...overrides };
    return new TaggingPipelineOrchestrator(config);
  }

  /**
   * Create a development/testing pipeline
   */
  static createDevelopment(): TaggingPipelineOrchestrator {
    return this.createProduction({
      sync: {
        mode: 'incremental',
        frequency: {
          full: '0 0 * * *', // Daily at midnight
          incremental: '*/15 * * * *', // Every 15 minutes
          realTime: 60 // 1 minute
        },
        changeDetection: {
          enabled: true,
          strategy: 'timestamp',
          timestampField: 'lastModified'
        },
        conflictResolution: {
          strategy: 'catalog_wins',
          manualApprovalRequired: false
        },
        errorHandling: {
          maxRetries: 1,
          retryDelay: 1000,
          continueOnError: true,
          deadLetterQueue: false
        }
      },
      monitoring: {
        metrics: {
          enabled: false,
          provider: 'prometheus',
          interval: 60000
        },
        alerting: {
          enabled: false,
          channels: [],
          rules: []
        },
        logging: {
          level: 'debug',
          destination: 'console',
          format: 'text'
        }
      }
    });
  }
}