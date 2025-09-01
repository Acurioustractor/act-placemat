/**
 * Auto-Tagging Engine
 * 
 * Intelligent tagging system for applying consent, protocol, and sovereignty
 * metadata based on data content, patterns, and Australian compliance requirements
 */

import { EventEmitter } from 'events';
import { 
  DataCatalogEntry, 
  FieldTag, 
  TagType, 
  TagSource, 
  AutoTaggingRule,
  TaggingCondition,
  TaggingAction,
  SchemaField,
  ConsentLevel,
  SovereigntyLevel,
  DataSensitivity
} from './types';
import { ConsentLevel as GovernanceConsentLevel, SovereigntyLevel as GovernanceSovereigntyLevel } from '../types/governance';

/**
 * Auto-tagging engine for intelligent metadata application
 */
export class AutoTaggingEngine extends EventEmitter {
  private rules: AutoTaggingRule[] = [];
  private aiModel: any; // Placeholder for AI/ML model integration

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  /**
   * Initialize the engine with default Australian compliance rules
   */
  async initialize(): Promise<void> {
    this.initializeDefaultRules();
    // Initialize AI model if available
    // this.aiModel = await loadAIModel();
    this.emit('initialized');
  }

  /**
   * Apply auto-tagging to a catalog entry
   */
  async applyAutoTags(entry: DataCatalogEntry): Promise<DataCatalogEntry> {
    const taggedEntry = { ...entry };
    
    // Apply tags to each field
    for (let i = 0; i < taggedEntry.schema.fields.length; i++) {
      const field = taggedEntry.schema.fields[i];
      const newTags = await this.generateFieldTags(field, entry);
      
      taggedEntry.schema.fields[i] = {
        ...field,
        tags: [...field.tags, ...newTags]
      };
    }

    // Apply entry-level tags
    await this.applyEntryLevelTags(taggedEntry);

    // Update governance metadata based on detected tags
    await this.updateGovernanceFromTags(taggedEntry);

    this.emit('tags_applied', {
      entryId: entry.id,
      tagsApplied: this.countNewTags(entry, taggedEntry)
    });

    return taggedEntry;
  }

  /**
   * Add custom tagging rule
   */
  addRule(rule: AutoTaggingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority); // Sort by priority descending
    this.emit('rule_added', rule);
  }

  /**
   * Remove tagging rule
   */
  removeRule(ruleId: string): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      const removedRule = this.rules.splice(index, 1)[0];
      this.emit('rule_removed', removedRule);
    }
  }

  /**
   * Get all tagging rules
   */
  getRules(): AutoTaggingRule[] {
    return [...this.rules];
  }

  /**
   * Validate and test a rule
   */
  async testRule(rule: AutoTaggingRule, testFields: SchemaField[]): Promise<any> {
    const results = [];
    
    for (const field of testFields) {
      const matches = this.evaluateRuleConditions(rule.conditions, field);
      const actions = matches ? rule.actions : [];
      
      results.push({
        fieldName: field.name,
        matches,
        actions: actions.map(action => ({
          type: action.type,
          key: action.key,
          value: action.value,
          confidence: action.confidence
        }))
      });
    }
    
    return results;
  }

  // Private methods

  private initializeDefaultRules(): void {
    this.rules = [
      // Personal data detection rules
      {
        id: 'personal-data-names',
        name: 'Personal Data - Names',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(first_name|last_name|full_name|given_name|surname|family_name).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'personal_name',
            confidence: 0.95
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'confidential',
            confidence: 0.9
          },
          {
            type: 'set_consent',
            key: 'required_level',
            value: 'explicit_consent',
            confidence: 0.9
          }
        ],
        priority: 100,
        enabled: true
      },

      {
        id: 'personal-data-contact',
        name: 'Personal Data - Contact Information',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(email|phone|mobile|address|postal_code|postcode).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'contact_information',
            confidence: 0.9
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'confidential',
            confidence: 0.85
          },
          {
            type: 'set_consent',
            key: 'required_level',
            value: 'explicit_consent',
            confidence: 0.85
          }
        ],
        priority: 95,
        enabled: true
      },

      {
        id: 'financial-identifiers',
        name: 'Financial Identifiers',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(tax_file_number|tfn|abn|australian_business_number|bank_account|bsb|account_number).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'financial_identifier',
            confidence: 0.95
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'secret',
            confidence: 0.95
          },
          {
            type: 'set_consent',
            key: 'required_level',
            value: 'enhanced_operations',
            confidence: 0.9
          },
          {
            type: 'add_tag',
            key: 'compliance',
            value: 'austrac_reporting',
            confidence: 0.8
          }
        ],
        priority: 120,
        enabled: true
      },

      // Indigenous data detection rules
      {
        id: 'indigenous-data-traditional-owners',
        name: 'Indigenous Data - Traditional Owners',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(traditional_owner|aboriginal|torres_strait|indigenous|clan|tribe|elder).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'indigenous_identifier',
            confidence: 0.9
          },
          {
            type: 'set_sovereignty',
            key: 'level',
            value: 'indigenous',
            confidence: 0.95
          },
          {
            type: 'add_tag',
            key: 'compliance',
            value: 'care_principles',
            confidence: 0.9
          },
          {
            type: 'set_consent',
            key: 'required_level',
            value: 'full_automation',
            confidence: 0.9
          }
        ],
        priority: 150,
        enabled: true
      },

      {
        id: 'indigenous-data-cultural',
        name: 'Indigenous Data - Cultural Information',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(cultural|sacred|ceremony|dreamtime|ancestral|spiritual|totem|country).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'cultural_information',
            confidence: 0.85
          },
          {
            type: 'set_sovereignty',
            key: 'level',
            value: 'indigenous',
            confidence: 0.9
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'restricted',
            confidence: 0.8
          },
          {
            type: 'add_tag',
            key: 'protocol',
            value: 'elder_approval_required',
            confidence: 0.85
          }
        ],
        priority: 140,
        enabled: true
      },

      // Financial data rules
      {
        id: 'financial-amounts',
        name: 'Financial Amounts',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(amount|value|price|cost|fee|charge|payment|salary|income|revenue).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'financial_amount',
            confidence: 0.9
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'confidential',
            confidence: 0.8
          },
          {
            type: 'add_tag',
            key: 'compliance',
            value: 'acnc_reporting',
            confidence: 0.7
          }
        ],
        priority: 80,
        enabled: true
      },

      // Location and residency rules
      {
        id: 'location-data',
        name: 'Location Data',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(location|latitude|longitude|coordinates|gps|address|suburb|city|state|country).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'location_data',
            confidence: 0.85
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'restricted',
            confidence: 0.8
          },
          {
            type: 'add_tag',
            key: 'compliance',
            value: 'data_residency',
            confidence: 0.9
          }
        ],
        priority: 75,
        enabled: true
      },

      // Timestamp and audit fields
      {
        id: 'audit-timestamps',
        name: 'Audit Timestamps',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(created_at|updated_at|modified_at|deleted_at|timestamp|datetime).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'audit_timestamp',
            confidence: 0.95
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'internal',
            confidence: 0.9
          },
          {
            type: 'add_tag',
            key: 'protocol',
            value: 'audit_retention',
            confidence: 0.8
          }
        ],
        priority: 60,
        enabled: true
      },

      // System identifiers
      {
        id: 'system-identifiers',
        name: 'System Identifiers',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(id|uuid|guid|key|reference|foreign_key)$',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'system_identifier',
            confidence: 0.9
          },
          {
            type: 'set_classification',
            key: 'sensitivity',
            value: 'internal',
            confidence: 0.8
          }
        ],
        priority: 40,
        enabled: true
      },

      // Community benefit tracking
      {
        id: 'community-benefit',
        name: 'Community Benefit Data',
        conditions: [
          {
            field: 'name',
            operator: 'matches',
            value: '.*(benefit|allocation|distribution|community|social_impact|outcome).*',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'add_tag',
            key: 'data_type',
            value: 'community_benefit',
            confidence: 0.8
          },
          {
            type: 'set_sovereignty',
            key: 'level',
            value: 'community',
            confidence: 0.7
          },
          {
            type: 'add_tag',
            key: 'compliance',
            value: 'acnc_governance',
            confidence: 0.8
          }
        ],
        priority: 70,
        enabled: true
      }
    ];
  }

  private async generateFieldTags(field: SchemaField, entry: DataCatalogEntry): Promise<FieldTag[]> {
    const tags: FieldTag[] = [];
    
    // Apply rule-based tags
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      if (this.evaluateRuleConditions(rule.conditions, field)) {
        for (const action of rule.actions) {
          const tag = this.createTagFromAction(action, field, entry);
          if (tag) {
            tags.push(tag);
          }
        }
      }
    }

    // Apply AI-based tags if model is available
    if (this.aiModel) {
      const aiTags = await this.generateAITags(field, entry);
      tags.push(...aiTags);
    }

    // Apply pattern-based tags
    const patternTags = this.generatePatternTags(field);
    tags.push(...patternTags);

    // Apply Australian compliance tags
    const complianceTags = this.generateComplianceTags(field, entry);
    tags.push(...complianceTags);

    return tags;
  }

  private evaluateRuleConditions(conditions: TaggingCondition[], field: SchemaField): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, field));
  }

  private evaluateCondition(condition: TaggingCondition, field: SchemaField): boolean {
    const fieldValue = this.getFieldValue(condition.field, field);
    if (fieldValue === undefined) return false;

    const value = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
    const target = condition.caseSensitive ? condition.value : condition.value.toLowerCase();

    switch (condition.operator) {
      case 'equals':
        return value === target;
      case 'contains':
        return value.includes(target);
      case 'matches':
        return new RegExp(target).test(value);
      case 'starts_with':
        return value.startsWith(target);
      case 'ends_with':
        return value.endsWith(target);
      default:
        return false;
    }
  }

  private getFieldValue(fieldPath: string, field: SchemaField): string {
    switch (fieldPath) {
      case 'name':
        return field.name || '';
      case 'type':
        return field.type || '';
      case 'description':
        return field.description || '';
      default:
        return '';
    }
  }

  private createTagFromAction(action: TaggingAction, field: SchemaField, entry: DataCatalogEntry): FieldTag | null {
    switch (action.type) {
      case 'add_tag':
        return {
          key: action.key,
          value: action.value,
          type: this.mapActionToTagType(action.key),
          source: TagSource.AUTOMATED,
          confidence: action.confidence,
          createdAt: new Date(),
          createdBy: 'auto_tagging_engine'
        };

      case 'set_classification':
        if (action.key === 'sensitivity') {
          // Update field sensitivity
          field.sensitivity = action.value as DataSensitivity;
        }
        return {
          key: action.key,
          value: action.value,
          type: TagType.CLASSIFICATION,
          source: TagSource.AUTOMATED,
          confidence: action.confidence,
          createdAt: new Date(),
          createdBy: 'auto_tagging_engine'
        };

      case 'set_consent':
        return {
          key: action.key,
          value: action.value,
          type: TagType.CONSENT,
          source: TagSource.AUTOMATED,
          confidence: action.confidence,
          createdAt: new Date(),
          createdBy: 'auto_tagging_engine'
        };

      case 'set_sovereignty':
        return {
          key: action.key,
          value: action.value,
          type: TagType.SOVEREIGNTY,
          source: TagSource.AUTOMATED,
          confidence: action.confidence,
          createdAt: new Date(),
          createdBy: 'auto_tagging_engine'
        };

      default:
        return null;
    }
  }

  private mapActionToTagType(key: string): TagType {
    if (key.includes('consent')) return TagType.CONSENT;
    if (key.includes('sovereignty')) return TagType.SOVEREIGNTY;
    if (key.includes('compliance')) return TagType.COMPLIANCE;
    if (key.includes('protocol')) return TagType.PROTOCOL;
    if (key.includes('classification')) return TagType.CLASSIFICATION;
    if (key.includes('business')) return TagType.BUSINESS;
    if (key.includes('technical')) return TagType.TECHNICAL;
    if (key.includes('quality')) return TagType.QUALITY;
    return TagType.TECHNICAL;
  }

  private async generateAITags(field: SchemaField, entry: DataCatalogEntry): Promise<FieldTag[]> {
    // Placeholder for AI/ML model integration
    // This would use a trained model to detect patterns and generate tags
    const tags: FieldTag[] = [];
    
    // Example: Use AI to detect sensitive patterns
    // const aiResult = await this.aiModel.predict({
    //   fieldName: field.name,
    //   fieldType: field.type,
    //   description: field.description,
    //   context: entry.description
    // });
    
    return tags;
  }

  private generatePatternTags(field: SchemaField): FieldTag[] {
    const tags: FieldTag[] = [];
    
    // Pattern-based detection for common Australian patterns
    const patterns = [
      {
        pattern: /^(04\d{8}|0[23578]\d{8})$/,
        name: 'australian_phone_number',
        confidence: 0.95,
        sensitivity: 'confidential' as DataSensitivity
      },
      {
        pattern: /^\d{3}\s?\d{3}\s?\d{3}$/,
        name: 'abn_pattern',
        confidence: 0.9,
        sensitivity: 'secret' as DataSensitivity
      },
      {
        pattern: /^\d{3}-\d{3}-\d{3}$/,
        name: 'tfn_pattern',
        confidence: 0.95,
        sensitivity: 'secret' as DataSensitivity
      },
      {
        pattern: /^\d{4}$/,
        name: 'australian_postcode',
        confidence: 0.8,
        sensitivity: 'confidential' as DataSensitivity
      }
    ];

    // Check field name and description against patterns
    const combinedText = `${field.name} ${field.description || ''}`.toLowerCase();
    
    for (const patternInfo of patterns) {
      if (patternInfo.pattern.test(combinedText) || 
          combinedText.includes(patternInfo.name.replace(/_/g, ' '))) {
        
        tags.push({
          key: 'pattern_detected',
          value: patternInfo.name,
          type: TagType.CLASSIFICATION,
          source: TagSource.AUTOMATED,
          confidence: patternInfo.confidence,
          createdAt: new Date(),
          createdBy: 'pattern_detection'
        });

        // Update field sensitivity based on pattern
        if (patternInfo.sensitivity && 
            this.getSensitivityLevel(field.sensitivity) < this.getSensitivityLevel(patternInfo.sensitivity)) {
          field.sensitivity = patternInfo.sensitivity;
        }
      }
    }

    return tags;
  }

  private generateComplianceTags(field: SchemaField, entry: DataCatalogEntry): FieldTag[] {
    const tags: FieldTag[] = [];
    
    // Australian Privacy Act compliance
    if (field.personalData) {
      tags.push({
        key: 'compliance_framework',
        value: 'privacy_act_1988',
        type: TagType.COMPLIANCE,
        source: TagSource.AUTOMATED,
        confidence: 0.9,
        createdAt: new Date(),
        createdBy: 'compliance_detection'
      });

      // Determine applicable APPs
      const apps = this.determineApplicableAPPs(field);
      if (apps.length > 0) {
        tags.push({
          key: 'privacy_act_apps',
          value: apps.join(','),
          type: TagType.COMPLIANCE,
          source: TagSource.AUTOMATED,
          confidence: 0.85,
          createdAt: new Date(),
          createdBy: 'compliance_detection'
        });
      }
    }

    // Indigenous data compliance
    if (field.indigenousData) {
      tags.push({
        key: 'compliance_framework',
        value: 'care_principles',
        type: TagType.COMPLIANCE,
        source: TagSource.AUTOMATED,
        confidence: 0.9,
        createdAt: new Date(),
        createdBy: 'compliance_detection'
      });

      tags.push({
        key: 'indigenous_protocol',
        value: 'traditional_owner_consent_required',
        type: TagType.PROTOCOL,
        source: TagSource.AUTOMATED,
        confidence: 0.85,
        createdAt: new Date(),
        createdBy: 'compliance_detection'
      });
    }

    // Financial compliance
    if (this.isFinancialField(field)) {
      tags.push({
        key: 'compliance_framework',
        value: 'acnc_governance',
        type: TagType.COMPLIANCE,
        source: TagSource.AUTOMATED,
        confidence: 0.8,
        createdAt: new Date(),
        createdBy: 'compliance_detection'
      });

      // Check for AUSTRAC thresholds
      if (this.isLargeFinancialAmount(field)) {
        tags.push({
          key: 'compliance_framework',
          value: 'austrac_reporting',
          type: TagType.COMPLIANCE,
          source: TagSource.AUTOMATED,
          confidence: 0.9,
          createdAt: new Date(),
          createdBy: 'compliance_detection'
        });
      }
    }

    return tags;
  }

  private determineApplicableAPPs(field: SchemaField): number[] {
    const apps: number[] = [];
    
    if (field.personalData) {
      apps.push(1); // APP 1: Open and transparent management
      apps.push(3); // APP 3: Collection of solicited personal information
      apps.push(5); // APP 5: Notification of collection
      apps.push(6); // APP 6: Use or disclosure
      apps.push(11); // APP 11: Security of personal information
      apps.push(12); // APP 12: Access to personal information
      apps.push(13); // APP 13: Correction of personal information
    }

    const fieldName = field.name.toLowerCase();
    if (fieldName.includes('email') || fieldName.includes('phone') || fieldName.includes('address')) {
      apps.push(7); // APP 7: Direct marketing
    }

    return [...new Set(apps)]; // Remove duplicates
  }

  private isFinancialField(field: SchemaField): boolean {
    const financialKeywords = [
      'amount', 'value', 'price', 'cost', 'fee', 'charge', 'payment',
      'salary', 'income', 'revenue', 'expense', 'budget', 'allocation'
    ];
    
    const fieldName = field.name.toLowerCase();
    return financialKeywords.some(keyword => fieldName.includes(keyword));
  }

  private isLargeFinancialAmount(field: SchemaField): boolean {
    // This would require analysis of actual data values
    // For now, we'll use field patterns to infer
    const largeAmountPatterns = [
      'total_amount', 'gross_amount', 'transaction_value', 'contract_value'
    ];
    
    const fieldName = field.name.toLowerCase();
    return largeAmountPatterns.some(pattern => fieldName.includes(pattern));
  }

  private getSensitivityLevel(sensitivity: DataSensitivity): number {
    const levels = {
      'public': 0,
      'internal': 1,
      'confidential': 2,
      'restricted': 3,
      'secret': 4
    };
    return levels[sensitivity] || 0;
  }

  private async applyEntryLevelTags(entry: DataCatalogEntry): Promise<void> {
    // Apply tags at the entry level based on field analysis
    const hasPersonalData = entry.schema.fields.some(field => field.personalData);
    const hasIndigenousData = entry.schema.fields.some(field => field.indigenousData);
    const hasFinancialData = entry.schema.fields.some(field => this.isFinancialField(field));
    
    // Update entry metadata based on detected characteristics
    if (hasIndigenousData) {
      entry.governance.sovereignty.level = GovernanceSovereigntyLevel.INDIGENOUS;
      entry.governance.consent.requiredLevel = GovernanceConsentLevel.FULL_AUTOMATION;
    } else if (hasPersonalData) {
      entry.governance.consent.requiredLevel = GovernanceConsentLevel.EXPLICIT_CONSENT;
    } else if (hasFinancialData) {
      entry.governance.consent.requiredLevel = GovernanceConsentLevel.ENHANCED_OPERATIONS;
    }
  }

  private async updateGovernanceFromTags(entry: DataCatalogEntry): Promise<void> {
    // Update governance metadata based on applied tags
    const allTags = entry.schema.fields.flatMap(field => field.tags);
    
    // Update consent requirements
    const consentTags = allTags.filter(tag => tag.type === TagType.CONSENT);
    if (consentTags.length > 0) {
      const highestConsentLevel = this.determineHighestConsentLevel(consentTags);
      entry.governance.consent.requiredLevel = highestConsentLevel;
    }

    // Update sovereignty requirements
    const sovereigntyTags = allTags.filter(tag => tag.type === TagType.SOVEREIGNTY);
    if (sovereigntyTags.length > 0) {
      const highestSovereigntyLevel = this.determineHighestSovereigntyLevel(sovereigntyTags);
      entry.governance.sovereignty.level = highestSovereigntyLevel;
    }

    // Update compliance requirements
    const complianceTags = allTags.filter(tag => tag.type === TagType.COMPLIANCE);
    this.updateComplianceFromTags(entry, complianceTags);
  }

  private determineHighestConsentLevel(consentTags: FieldTag[]): GovernanceConsentLevel {
    const levels = {
      'no_consent': 0,
      'basic_consent': 1,
      'explicit_consent': 2,
      'enhanced_operations': 3,
      'full_automation': 4
    };

    let highestLevel = 0;
    for (const tag of consentTags) {
      const level = levels[tag.value as keyof typeof levels] || 0;
      if (level > highestLevel) {
        highestLevel = level;
      }
    }

    const levelMap = Object.entries(levels).find(([, value]) => value === highestLevel);
    return (levelMap?.[0] as GovernanceConsentLevel) || GovernanceConsentLevel.BASIC_CONSENT;
  }

  private determineHighestSovereigntyLevel(sovereigntyTags: FieldTag[]): GovernanceSovereigntyLevel {
    const levels = {
      'individual': 0,
      'community': 1,
      'indigenous': 2,
      'organizational': 3,
      'national': 4,
      'international': 5
    };

    let highestLevel = 0;
    for (const tag of sovereigntyTags) {
      const level = levels[tag.value as keyof typeof levels] || 0;
      if (level > highestLevel) {
        highestLevel = level;
      }
    }

    const levelMap = Object.entries(levels).find(([, value]) => value === highestLevel);
    return (levelMap?.[0] as GovernanceSovereigntyLevel) || GovernanceSovereigntyLevel.ORGANIZATIONAL;
  }

  private updateComplianceFromTags(entry: DataCatalogEntry, complianceTags: FieldTag[]): void {
    for (const tag of complianceTags) {
      switch (tag.value) {
        case 'privacy_act_1988':
          entry.compliance.australian.privacyAct.applicable = true;
          break;
        case 'care_principles':
          if (entry.compliance.australian.indigenous) {
            entry.compliance.australian.indigenous.careApplicable = true;
          }
          break;
        case 'acnc_governance':
          if (entry.compliance.australian.acnc) {
            entry.compliance.australian.acnc.applicable = true;
          }
          break;
        case 'austrac_reporting':
          if (entry.compliance.australian.austrac) {
            entry.compliance.australian.austrac.applicable = true;
            entry.compliance.australian.austrac.reportingRequired = true;
          }
          break;
      }
    }
  }

  private countNewTags(originalEntry: DataCatalogEntry, taggedEntry: DataCatalogEntry): number {
    const originalTagCount = originalEntry.schema.fields.reduce((count, field) => count + field.tags.length, 0);
    const newTagCount = taggedEntry.schema.fields.reduce((count, field) => count + field.tags.length, 0);
    return newTagCount - originalTagCount;
  }
}