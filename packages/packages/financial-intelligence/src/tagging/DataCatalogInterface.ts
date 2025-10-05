/**
 * Data Catalog Interface
 * 
 * Abstraction layer for different data catalog systems
 * supporting Apache Atlas, DataHub, Amundsen, and custom implementations
 */

import { EventEmitter } from 'events';
import { 
  DataCatalogEntry, 
  DataCatalogConfig, 
  SyncResult,
  TagType,
  TagSource,
  FieldTag
} from './types';

/**
 * Abstract base class for data catalog interfaces
 */
export abstract class DataCatalogInterface extends EventEmitter {
  protected config: DataCatalogConfig;

  constructor(config: DataCatalogConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize connection to data catalog
   */
  abstract initialize(): Promise<void>;

  /**
   * Test connection to data catalog
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get all data catalog entries
   */
  abstract getAllEntries(): AsyncGenerator<DataCatalogEntry[], void, unknown>;

  /**
   * Get data catalog entries by type
   */
  abstract getEntriesByType(type: string): AsyncGenerator<DataCatalogEntry[], void, unknown>;

  /**
   * Get single data catalog entry by ID
   */
  abstract getEntry(id: string): Promise<DataCatalogEntry | null>;

  /**
   * Get entries modified since timestamp
   */
  abstract getModifiedSince(timestamp: Date): AsyncGenerator<DataCatalogEntry[], void, unknown>;

  /**
   * Search entries by query
   */
  abstract search(query: string): AsyncGenerator<DataCatalogEntry[], void, unknown>;

  /**
   * Get lineage for an entry
   */
  abstract getLineage(entryId: string): Promise<any>;

  /**
   * Shutdown connection
   */
  abstract shutdown(): Promise<void>;
}

/**
 * Apache Atlas implementation
 */
export class ApacheAtlasInterface extends DataCatalogInterface {
  private client: any;

  async initialize(): Promise<void> {
    // Initialize Apache Atlas client
    const atlas = await import('apache-atlas-client');
    this.client = new atlas.AtlasClient({
      url: this.config.connection.url,
      username: this.config.connection.username,
      password: this.config.connection.password,
      timeout: this.config.connection.timeout
    });

    await this.client.authenticate();
    this.emit('initialized', 'apache_atlas');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.getVersion();
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  async* getAllEntries(): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    try {
      let offset = 0;
      const limit = this.config.query.batchSize;

      while (true) {
        const response = await this.client.searchBasic({
          limit,
          offset,
          typeName: this.config.filters.includedTypes
        });

        if (!response.entities || response.entities.length === 0) {
          break;
        }

        const entries = response.entities.map(entity => this.mapAtlasEntityToEntry(entity));
        yield entries;

        offset += limit;

        if (response.entities.length < limit) {
          break;
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async* getEntriesByType(type: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    try {
      let offset = 0;
      const limit = this.config.query.batchSize;

      while (true) {
        const response = await this.client.searchBasic({
          limit,
          offset,
          typeName: type
        });

        if (!response.entities || response.entities.length === 0) {
          break;
        }

        const entries = response.entities.map(entity => this.mapAtlasEntityToEntry(entity));
        yield entries;

        offset += limit;

        if (response.entities.length < limit) {
          break;
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getEntry(id: string): Promise<DataCatalogEntry | null> {
    try {
      const response = await this.client.getEntityByGuid(id);
      return response.entity ? this.mapAtlasEntityToEntry(response.entity) : null;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  async* getModifiedSince(timestamp: Date): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    try {
      const query = {
        query: `__modifiedBy exists AND __timestamp > ${timestamp.getTime()}`,
        limit: this.config.query.batchSize
      };

      let offset = 0;

      while (true) {
        const response = await this.client.searchByQuery({
          ...query,
          offset
        });

        if (!response.entities || response.entities.length === 0) {
          break;
        }

        const entries = response.entities.map(entity => this.mapAtlasEntityToEntry(entity));
        yield entries;

        offset += this.config.query.batchSize;

        if (response.entities.length < this.config.query.batchSize) {
          break;
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async* search(query: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    try {
      let offset = 0;
      const limit = this.config.query.batchSize;

      while (true) {
        const response = await this.client.searchBasic({
          query,
          limit,
          offset
        });

        if (!response.entities || response.entities.length === 0) {
          break;
        }

        const entries = response.entities.map(entity => this.mapAtlasEntityToEntry(entity));
        yield entries;

        offset += limit;

        if (response.entities.length < limit) {
          break;
        }
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getLineage(entryId: string): Promise<any> {
    try {
      const response = await this.client.getLineageByGuid(entryId);
      return response;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  async shutdown(): Promise<void> {
    this.client = null;
    this.emit('shutdown');
  }

  private mapAtlasEntityToEntry(entity: any): DataCatalogEntry {
    const attributes = entity.attributes || {};
    
    return {
      id: entity.guid,
      name: attributes.name || entity.displayText,
      description: attributes.description || '',
      type: this.mapAtlasTypeToAssetType(entity.typeName),
      location: {
        sourceType: 'postgresql', // Default, would be derived from entity type
        connectionId: attributes.connectionId || 'default',
        database: attributes.database,
        schema: attributes.schema,
        table: attributes.table || attributes.name,
        path: attributes.qualifiedName
      },
      schema: {
        fields: this.extractSchemaFields(entity),
        primaryKeys: attributes.primaryKeys || [],
        foreignKeys: [],
        indexes: [],
        constraints: []
      },
      governance: this.extractGovernanceMetadata(entity),
      technical: this.extractTechnicalMetadata(entity),
      business: this.extractBusinessMetadata(entity),
      compliance: this.extractComplianceMetadata(entity),
      lineage: {
        upstream: [],
        downstream: [],
        transformations: []
      },
      lastModified: new Date(entity.updateTime || entity.createTime || Date.now()),
      version: entity.version?.toString() || '1.0'
    };
  }

  private mapAtlasTypeToAssetType(atlasType: string): any {
    const typeMap: Record<string, string> = {
      'hive_table': 'table',
      'Table': 'table',
      'View': 'view',
      'MaterializedView': 'materialized_view',
      'Column': 'table' // Columns belong to tables
    };
    
    return typeMap[atlasType] || 'table';
  }

  private extractSchemaFields(entity: any): any[] {
    const attributes = entity.attributes || {};
    const columns = attributes.columns || [];
    
    return columns.map((column: any) => ({
      name: column.name || column.displayText,
      type: column.dataType || 'unknown',
      nullable: column.isNullable !== false,
      description: column.comment || column.description,
      tags: this.extractFieldTags(column),
      sensitivity: this.determineSensitivity(column),
      personalData: this.detectPersonalData(column),
      indigenousData: this.detectIndigenousData(column)
    }));
  }

  private extractFieldTags(field: any): FieldTag[] {
    const tags: FieldTag[] = [];
    
    // Extract classifications as tags
    if (field.classifications) {
      for (const classification of field.classifications) {
        tags.push({
          key: 'classification',
          value: classification.typeName,
          type: TagType.CLASSIFICATION,
          source: TagSource.EXTERNAL,
          confidence: 1.0,
          createdAt: new Date(),
          createdBy: 'atlas_import'
        });
      }
    }

    // Extract custom properties as tags
    if (field.attributes) {
      for (const [key, value] of Object.entries(field.attributes)) {
        if (typeof value === 'string' && value.length > 0) {
          tags.push({
            key,
            value: value as string,
            type: TagType.TECHNICAL,
            source: TagSource.EXTERNAL,
            confidence: 0.9,
            createdAt: new Date(),
            createdBy: 'atlas_import'
          });
        }
      }
    }

    return tags;
  }

  private determineSensitivity(field: any): any {
    const fieldName = (field.name || '').toLowerCase();
    const dataType = (field.dataType || '').toLowerCase();
    
    // Check for sensitive field patterns
    if (fieldName.includes('ssn') || fieldName.includes('tax_file_number')) {
      return 'secret';
    }
    if (fieldName.includes('phone') || fieldName.includes('email') || fieldName.includes('address')) {
      return 'confidential';
    }
    if (fieldName.includes('name') || fieldName.includes('id')) {
      return 'restricted';
    }
    if (fieldName.includes('internal') || dataType.includes('encrypted')) {
      return 'internal';
    }
    
    return 'public';
  }

  private detectPersonalData(field: any): boolean {
    const fieldName = (field.name || '').toLowerCase();
    const personalDataIndicators = [
      'name', 'email', 'phone', 'address', 'ssn', 'tax_file_number',
      'birth_date', 'age', 'gender', 'income', 'salary', 'credit_card'
    ];
    
    return personalDataIndicators.some(indicator => fieldName.includes(indicator));
  }

  private detectIndigenousData(field: any): boolean {
    const fieldName = (field.name || '').toLowerCase();
    const description = (field.description || '').toLowerCase();
    
    const indigenousIndicators = [
      'traditional_owner', 'aboriginal', 'torres_strait', 'indigenous',
      'cultural', 'sacred', 'ceremony', 'dreamtime', 'ancestral'
    ];
    
    return indigenousIndicators.some(indicator => 
      fieldName.includes(indicator) || description.includes(indicator)
    );
  }

  private extractGovernanceMetadata(entity: any): any {
    const attributes = entity.attributes || {};
    
    return {
      owner: attributes.owner || 'unknown',
      steward: attributes.steward || attributes.owner || 'unknown',
      custodian: attributes.custodian || attributes.owner || 'unknown',
      consent: {
        requiredLevel: 'basic_consent', // Default
        purposes: ['operational'],
        explicitRequired: false,
        withdrawalAllowed: true
      },
      protocols: [],
      sovereignty: {
        level: 'organizational',
        residency: {
          country: 'Australia',
          region: 'ap-southeast-2'
        }
      },
      retention: {
        years: 7,
        reason: 'compliance',
        disposalMethod: 'deletion',
        reviewFrequency: 'annual'
      },
      accessControls: []
    };
  }

  private extractTechnicalMetadata(entity: any): any {
    const attributes = entity.attributes || {};
    
    return {
      size: {
        rows: attributes.numRows || 0,
        columns: attributes.numColumns || 0,
        storageBytes: attributes.sizeBytes || 0
      },
      performance: {
        avgQueryTime: 0,
        dailyQueries: 0,
        peakHours: [],
        tier: 'medium'
      },
      quality: {
        completeness: 1.0,
        accuracy: 1.0,
        consistency: 1.0,
        timeliness: 1.0,
        validity: 1.0,
        overallScore: 1.0,
        lastChecked: new Date()
      },
      updateFrequency: {
        type: 'daily',
        lastUpdate: new Date(attributes.updateTime || Date.now())
      },
      dependencies: []
    };
  }

  private extractBusinessMetadata(entity: any): any {
    const attributes = entity.attributes || {};
    
    return {
      domain: attributes.domain || 'financial',
      purpose: attributes.purpose || 'operational',
      value: {
        tier: 'medium',
        revenueImpact: 0,
        strategicImportance: 0.5,
        operationalCriticality: 0.5
      },
      usage: [],
      glossaryTerms: [],
      processes: []
    };
  }

  private extractComplianceMetadata(entity: any): any {
    return {
      frameworks: [],
      australian: {
        privacyAct: {
          applicable: true,
          apps: [1, 3, 5], // Default APPs
          crossBorder: false
        },
        dataResidency: {
          required: true,
          allowedRegions: ['ap-southeast-2'],
          exceptions: []
        }
      },
      international: {
        other: []
      },
      status: {
        overall: 'under_review',
        violations: [],
        remediations: [],
        riskLevel: 'medium'
      },
      lastReview: new Date(),
      nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };
  }
}

/**
 * DataHub implementation
 */
export class DataHubInterface extends DataCatalogInterface {
  private client: any;

  async initialize(): Promise<void> {
    // DataHub implementation would go here
    // Similar structure to Atlas but with DataHub-specific APIs
    this.emit('initialized', 'datahub');
  }

  async testConnection(): Promise<boolean> {
    // DataHub connection test
    return true;
  }

  async* getAllEntries(): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    // DataHub implementation
    yield [];
  }

  async* getEntriesByType(type: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    // DataHub implementation
    yield [];
  }

  async getEntry(id: string): Promise<DataCatalogEntry | null> {
    // DataHub implementation
    return null;
  }

  async* getModifiedSince(timestamp: Date): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    // DataHub implementation
    yield [];
  }

  async* search(query: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    // DataHub implementation
    yield [];
  }

  async getLineage(entryId: string): Promise<any> {
    // DataHub implementation
    return null;
  }

  async shutdown(): Promise<void> {
    this.emit('shutdown');
  }
}

/**
 * Amundsen implementation
 */
export class AmundsenInterface extends DataCatalogInterface {
  async initialize(): Promise<void> {
    // Amundsen implementation would go here
    this.emit('initialized', 'amundsen');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async* getAllEntries(): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async* getEntriesByType(type: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async getEntry(id: string): Promise<DataCatalogEntry | null> {
    return null;
  }

  async* getModifiedSince(timestamp: Date): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async* search(query: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async getLineage(entryId: string): Promise<any> {
    return null;
  }

  async shutdown(): Promise<void> {
    this.emit('shutdown');
  }
}

/**
 * Custom data catalog implementation
 */
export class CustomDataCatalogInterface extends DataCatalogInterface {
  async initialize(): Promise<void> {
    // Custom implementation - could be REST API, GraphQL, etc.
    this.emit('initialized', 'custom');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async* getAllEntries(): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async* getEntriesByType(type: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async getEntry(id: string): Promise<DataCatalogEntry | null> {
    return null;
  }

  async* getModifiedSince(timestamp: Date): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async* search(query: string): AsyncGenerator<DataCatalogEntry[], void, unknown> {
    yield [];
  }

  async getLineage(entryId: string): Promise<any> {
    return null;
  }

  async shutdown(): Promise<void> {
    this.emit('shutdown');
  }
}

/**
 * Factory for creating data catalog interfaces
 */
export class DataCatalogFactory {
  static create(config: DataCatalogConfig): DataCatalogInterface {
    switch (config.type) {
      case 'apache_atlas':
        return new ApacheAtlasInterface(config);
      case 'datahub':
        return new DataHubInterface(config);
      case 'amundsen':
        return new AmundsenInterface(config);
      case 'custom':
        return new CustomDataCatalogInterface(config);
      default:
        throw new Error(`Unsupported data catalog type: ${config.type}`);
    }
  }
}