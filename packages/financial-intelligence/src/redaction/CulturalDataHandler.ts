/**
 * Cultural Data Handler
 * 
 * Handles Indigenous data sovereignty with CARE Principles compliance
 * and Traditional Owner consent workflows
 */

import {
  CulturalDataHandler as ICulturalDataHandler,
  CulturalProtection,
  ValidationResult,
  RedactionContext
} from './types';

export interface ElderApproval {
  elderId: string;
  elderName: string;
  traditionalTerritory: string;
  approvalDate: Date;
  ceremonyRequired: boolean;
  witnessIds: string[];
  culturalContext: string;
  validUntil?: Date;
}

export interface CulturalTerritory {
  name: string;
  description: string;
  boundaries: {
    latitude: number;
    longitude: number;
  }[];
  communities: string[];
  elders: Array<{
    id: string;
    name: string;
    role: string;
    contact: string;
  }>;
  protocols: CulturalProtocol[];
  seasonalRestrictions: SeasonalRestriction[];
}

export interface CulturalProtocol {
  id: string;
  name: string;
  description: string;
  category: 'ceremony' | 'knowledge' | 'site' | 'story' | 'artifact' | 'data';
  restrictions: string[];
  requirements: string[];
  emergencyExceptions: boolean;
  contactRequired: boolean;
}

export interface SeasonalRestriction {
  id: string;
  name: string;
  startDate: string; // MM-DD format
  endDate: string; // MM-DD format
  description: string;
  affectedDataTypes: string[];
  severity: 'advisory' | 'restricted' | 'prohibited';
}

export interface CommunityNotification {
  id: string;
  territory: string;
  community: string;
  operation: string;
  dataType: string;
  timestamp: Date;
  method: 'email' | 'postal' | 'community_meeting' | 'elder_council';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class CulturalDataHandler implements ICulturalDataHandler {
  private territories: Map<string, CulturalTerritory> = new Map();
  private elderApprovals: Map<string, ElderApproval> = new Map();
  private sacredKeywords: Set<string> = new Set();
  private culturalPatterns: RegExp[] = [];

  constructor() {
    this.initializeCulturalKeywords();
    this.initializeCulturalPatterns();
    this.loadTraditionalTerritories();
  }

  private initializeCulturalKeywords(): void {
    const keywords = [
      // Sacred and ceremonial
      'sacred', 'ceremony', 'ceremonial', 'ritual', 'dreaming', 'dreamtime',
      'sorry business', 'men\'s business', 'women\'s business', 'initiation',
      'spiritual', 'ancestor', 'ancestral', 'elder', 'traditional knowledge',
      
      // Cultural practices
      'songline', 'song line', 'corroboree', 'smoking ceremony', 'welcome to country',
      'acknowledgment of country', 'traditional owner', 'native title',
      'cultural heritage', 'cultural site', 'burial ground', 'sacred site',
      
      // Community and kinship
      'skin group', 'moiety', 'totem', 'kinship', 'family group', 'clan',
      'language group', 'traditional law', 'customary law', 'cultural protocol',
      
      // Modern terms
      'indigenous data sovereignty', 'care principles', 'cultural keeper',
      'traditional custodian', 'cultural authority', 'community consent'
    ];

    keywords.forEach(keyword => this.sacredKeywords.add(keyword.toLowerCase()));
  }

  private initializeCulturalPatterns(): void {
    this.culturalPatterns = [
      // Indigenous place names
      /\b\w+(?:garra|barra|marra|wurru|yirri|nguru|darra|warra)\b/i,
      
      // Traditional Owner references
      /\b(?:traditional\s+owner|native\s+title\s+holder|custodian)\s+of\s+\w+/i,
      
      // Cultural ceremonies
      /\b(?:initiation|coming\s+of\s+age|smoking|welcome|sorry)\s+ceremony\b/i,
      
      // Sacred sites
      /\b(?:sacred|burial|ceremonial|cultural)\s+(?:site|ground|place|area)\b/i,
      
      // Knowledge systems
      /\b(?:traditional|indigenous|cultural)\s+(?:knowledge|story|law|practice)\b/i
    ];
  }

  private loadTraditionalTerritories(): void {
    // Sample territories - in production this would load from a database
    const wurundjeriTerritory: CulturalTerritory = {
      name: 'Wurundjeri Country',
      description: 'Traditional lands of the Wurundjeri people in the Melbourne area',
      boundaries: [
        { latitude: -37.6, longitude: 144.8 },
        { latitude: -37.9, longitude: 145.2 },
        { latitude: -38.1, longitude: 144.9 },
        { latitude: -37.8, longitude: 144.5 }
      ],
      communities: ['Wurundjeri Woi Wurrung', 'Healesville', 'Yarra Valley'],
      elders: [
        {
          id: 'elder-wurundjeri-001',
          name: 'Uncle William Barton',
          role: 'Senior Elder',
          contact: 'cultural.authority@wurundjeri.com.au'
        }
      ],
      protocols: [
        {
          id: 'wurundjeri-protocol-001',
          name: 'Sacred Site Data Protection',
          description: 'Protection of data related to sacred and ceremonial sites',
          category: 'site',
          restrictions: ['no_external_sharing', 'elder_approval_required'],
          requirements: ['cultural_context_documentation', 'community_notification'],
          emergencyExceptions: false,
          contactRequired: true
        }
      ],
      seasonalRestrictions: [
        {
          id: 'wurundjeri-seasonal-001',
          name: 'Ceremony Season Restrictions',
          startDate: '09-01', // September 1
          endDate: '11-30', // November 30
          description: 'Traditional ceremony season - restricted access to ceremonial data',
          affectedDataTypes: ['ceremony', 'cultural_identifier', 'sacred'],
          severity: 'restricted'
        }
      ]
    };

    this.territories.set('wurundjeri', wurundjeriTerritory);
  }

  requiresElderApproval(data: any, territory: string): boolean {
    const dataString = String(data).toLowerCase();
    
    // Check for sacred keywords
    for (const keyword of this.sacredKeywords) {
      if (dataString.includes(keyword)) {
        // Certain keywords always require elder approval
        if (['sacred', 'ceremony', 'sorry business', 'traditional knowledge'].includes(keyword)) {
          return true;
        }
      }
    }

    // Check cultural patterns
    for (const pattern of this.culturalPatterns) {
      if (pattern.test(String(data))) {
        return true;
      }
    }

    // Check territory-specific requirements
    const territoryData = this.territories.get(territory.toLowerCase());
    if (territoryData) {
      for (const protocol of territoryData.protocols) {
        if (protocol.restrictions.includes('elder_approval_required')) {
          // Check if this protocol applies to the data
          if (this.protocolAppliesTo(protocol, data)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  validateCulturalProtocols(data: any, protections: CulturalProtection[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const protection of protections) {
      const validation = this.validateSingleProtection(data, protection);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      suggestions.push(...validation.suggestions);
    }

    // Check for seasonal restrictions
    const seasonalCheck = this.checkSeasonalRestrictions(data);
    if (!seasonalCheck.valid) {
      errors.push(...seasonalCheck.errors);
      warnings.push(...seasonalCheck.warnings);
    }

    return {
      valid: errors.length === 0,
      ruleId: 'cultural-protocol-validation',
      errors,
      warnings,
      suggestions
    };
  }

  async applyCAREPrinciples(
    operation: string, 
    data: any, 
    context: RedactionContext
  ): Promise<boolean> {
    try {
      // Collective Benefit: Ensure operation benefits Indigenous communities
      const collectiveBenefit = await this.validateCollectiveBenefit(operation, data, context);
      
      // Authority to Control: Verify Indigenous peoples have authority over their data
      const authorityControl = await this.validateAuthorityControl(operation, data, context);
      
      // Responsibility: Ensure respectful and ethical use
      const responsibility = await this.validateResponsibility(operation, data, context);
      
      // Ethics: Align with Indigenous ethical frameworks
      const ethics = await this.validateEthics(operation, data, context);

      return collectiveBenefit && authorityControl && responsibility && ethics;
    } catch (error) {
      console.error('CARE Principles validation failed:', error);
      return false;
    }
  }

  async notifyCommunity(
    operation: string, 
    dataType: string, 
    territory: string
  ): Promise<void> {
    const territoryData = this.territories.get(territory.toLowerCase());
    if (!territoryData) {
      console.warn(`Territory not found: ${territory}`);
      return;
    }

    const notification: CommunityNotification = {
      id: this.generateNotificationId(),
      territory,
      community: territoryData.communities[0], // Primary community
      operation,
      dataType,
      timestamp: new Date(),
      method: 'email', // Default method
      acknowledged: false
    };

    // Send notifications via multiple channels for important operations
    const importantOperations = ['reversal', 'cultural_transform', 'sacred_data_access'];
    if (importantOperations.includes(operation)) {
      await Promise.all([
        this.sendEmailNotification(notification, territoryData),
        this.scheduleElderCouncilNotification(notification, territoryData)
      ]);
    } else {
      await this.sendEmailNotification(notification, territoryData);
    }
  }

  async validateElderApproval(elderId: string, approvalDate: Date): Promise<boolean> {
    const approval = this.elderApprovals.get(elderId);
    if (!approval) {
      return false;
    }

    // Check if approval is still valid
    if (approval.validUntil && approval.validUntil < new Date()) {
      return false;
    }

    // Check if approval date is reasonable (not too old, not in future)
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const age = now.getTime() - approvalDate.getTime();

    if (age < 0 || age > maxAge) {
      return false;
    }

    return true;
  }

  // Additional helper methods

  private validateSingleProtection(data: any, protection: CulturalProtection): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate protection level
    if (protection.protectionLevel === 'sacred' || protection.protectionLevel === 'ceremonial') {
      if (protection.elderApprovalRequired && !this.hasElderApproval(data, protection.territory)) {
        errors.push(`Elder approval required for ${protection.protectionLevel} data in ${protection.territory}`);
      }
    }

    // Check access restrictions
    for (const restriction of protection.accessRestrictions) {
      if (!this.validateAccessRestriction(restriction, data)) {
        warnings.push(`Access restriction not met: ${restriction}`);
      }
    }

    // Check seasonal restrictions
    if (protection.seasonalRestrictions) {
      const currentSeason = this.getCurrentSeason();
      for (const seasonalRestriction of protection.seasonalRestrictions) {
        if (this.isSeasonalRestrictionActive(seasonalRestriction, currentSeason)) {
          errors.push(`Seasonal restriction active: ${seasonalRestriction}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      ruleId: `cultural-protection-${protection.territory}`,
      errors,
      warnings,
      suggestions
    };
  }

  private checkSeasonalRestrictions(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const currentDate = new Date();

    for (const [territoryName, territory] of this.territories.entries()) {
      for (const restriction of territory.seasonalRestrictions) {
        if (this.isSeasonalRestrictionCurrentlyActive(restriction, currentDate)) {
          const dataType = this.classifyDataType(data);
          if (restriction.affectedDataTypes.includes(dataType)) {
            const message = `Seasonal restriction active in ${territoryName}: ${restriction.description}`;
            
            if (restriction.severity === 'prohibited') {
              errors.push(message);
            } else if (restriction.severity === 'restricted') {
              warnings.push(message);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      ruleId: 'seasonal-restrictions',
      errors,
      warnings,
      suggestions: []
    };
  }

  private async validateCollectiveBenefit(
    operation: string, 
    data: any, 
    context: RedactionContext
  ): Promise<boolean> {
    // Check if operation benefits Indigenous communities
    const beneficialOperations = [
      'cultural_research', 'community_reporting', 'heritage_protection',
      'language_preservation', 'knowledge_sharing'
    ];

    if (beneficialOperations.includes(operation)) {
      return true;
    }

    // Check if operation has explicit community consent
    if (context.culturalContext?.communityAffiliation) {
      return true;
    }

    // For other operations, require justification
    return context.purpose.includes('community_benefit');
  }

  private async validateAuthorityControl(
    operation: string, 
    data: any, 
    context: RedactionContext
  ): Promise<boolean> {
    // Indigenous peoples must have authority over their data
    if (context.sovereigntyLevel === 'traditional_owner') {
      return true;
    }

    if (context.culturalContext?.elderApproval) {
      return true;
    }

    // Check if Traditional Owner consent exists
    return this.hasTraditionalOwnerConsent(data, context);
  }

  private async validateResponsibility(
    operation: string, 
    data: any, 
    context: RedactionContext
  ): Promise<boolean> {
    // Data use must respect Indigenous rights and wellbeing
    const respectfulPurposes = [
      'cultural_preservation', 'community_benefit', 'heritage_protection',
      'language_maintenance', 'educational_resource', 'research_ethical'
    ];

    return context.purpose.some(purpose => respectfulPurposes.includes(purpose));
  }

  private async validateEthics(
    operation: string, 
    data: any, 
    context: RedactionContext
  ): Promise<boolean> {
    // Must align with Indigenous ethical frameworks
    
    // Check for harmful purposes
    const harmfulPurposes = [
      'commercial_exploitation', 'cultural_appropriation', 'unauthorized_research',
      'stereotyping', 'misrepresentation'
    ];

    if (context.purpose.some(purpose => harmfulPurposes.includes(purpose))) {
      return false;
    }

    // Require reciprocal relationships for research
    if (context.purpose.includes('research')) {
      return context.purpose.includes('reciprocal_benefit');
    }

    return true;
  }

  private protocolAppliesTo(protocol: CulturalProtocol, data: any): boolean {
    const dataString = String(data).toLowerCase();
    
    switch (protocol.category) {
      case 'ceremony':
        return dataString.includes('ceremony') || dataString.includes('ritual');
      case 'knowledge':
        return dataString.includes('knowledge') || dataString.includes('story');
      case 'site':
        return dataString.includes('site') || dataString.includes('place');
      case 'data':
        return true; // All data protocols apply
      default:
        return false;
    }
  }

  private hasElderApproval(data: any, territory: string): boolean {
    // Check if there's a valid elder approval for this data/territory
    for (const [elderId, approval] of this.elderApprovals.entries()) {
      if (approval.traditionalTerritory.toLowerCase() === territory.toLowerCase()) {
        if (!approval.validUntil || approval.validUntil > new Date()) {
          return true;
        }
      }
    }
    return false;
  }

  private validateAccessRestriction(restriction: string, data: any): boolean {
    switch (restriction) {
      case 'no_external_sharing':
        return true; // Assume we're checking internally
      case 'elder_approval_required':
        return this.hasElderApproval(data, 'default');
      case 'community_notification_required':
        return true; // Assume notification will be sent
      default:
        return true;
    }
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return 'autumn';
    if (month >= 6 && month <= 8) return 'winter';
    if (month >= 9 && month <= 11) return 'spring';
    return 'summer';
  }

  private isSeasonalRestrictionActive(restriction: string, currentSeason: string): boolean {
    // Simple implementation - would be more sophisticated in production
    return restriction.toLowerCase().includes(currentSeason);
  }

  private isSeasonalRestrictionCurrentlyActive(
    restriction: SeasonalRestriction, 
    currentDate: Date
  ): boolean {
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    const currentMMDD = `${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;

    // Handle year-spanning restrictions
    if (restriction.startDate > restriction.endDate) {
      return currentMMDD >= restriction.startDate || currentMMDD <= restriction.endDate;
    } else {
      return currentMMDD >= restriction.startDate && currentMMDD <= restriction.endDate;
    }
  }

  private classifyDataType(data: any): string {
    const dataString = String(data).toLowerCase();
    
    if (this.sacredKeywords.has(dataString) || 
        dataString.includes('sacred') || 
        dataString.includes('ceremony')) {
      return 'sacred';
    }
    
    if (dataString.includes('cultural') || dataString.includes('traditional')) {
      return 'cultural_identifier';
    }
    
    return 'general';
  }

  private hasTraditionalOwnerConsent(data: any, context: RedactionContext): boolean {
    // Check if Traditional Owner consent exists for this data
    return context.sovereigntyLevel === 'traditional_owner' ||
           !!context.culturalContext?.traditionalTerritory;
  }

  private generateNotificationId(): string {
    return `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendEmailNotification(
    notification: CommunityNotification, 
    territory: CulturalTerritory
  ): Promise<void> {
    // In production, this would send actual emails
    console.log(`Email notification sent to ${territory.name}:`, notification);
  }

  private async scheduleElderCouncilNotification(
    notification: CommunityNotification, 
    territory: CulturalTerritory
  ): Promise<void> {
    // In production, this would schedule elder council notifications
    console.log(`Elder council notification scheduled for ${territory.name}:`, notification);
  }

  /**
   * Add elder approval for cultural data operations
   */
  addElderApproval(approval: ElderApproval): void {
    this.elderApprovals.set(approval.elderId, approval);
  }

  /**
   * Get cultural sensitivity score for operation
   */
  getCulturalSensitivityScore(operation: string, data: any, territory?: string): number {
    let score = 0;

    // Check for sacred content
    const dataString = String(data).toLowerCase();
    for (const keyword of this.sacredKeywords) {
      if (dataString.includes(keyword)) {
        if (['sacred', 'ceremony', 'sorry business'].includes(keyword)) {
          score += 0.4;
        } else {
          score += 0.2;
        }
      }
    }

    // Check patterns
    for (const pattern of this.culturalPatterns) {
      if (pattern.test(String(data))) {
        score += 0.3;
      }
    }

    // Operation-specific scoring
    const sensitiveOperations = ['reversal', 'cultural_transform', 'export'];
    if (sensitiveOperations.includes(operation)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get CARE Principles compliance report
   */
  async generateCAREComplianceReport(operations: Array<{
    operation: string;
    data: any;
    context: RedactionContext;
    timestamp: Date;
  }>): Promise<{
    collective: { score: number; details: string[] };
    authority: { score: number; details: string[] };
    responsibility: { score: number; details: string[] };
    ethics: { score: number; details: string[] };
    overallScore: number;
    recommendations: string[];
  }> {
    const collective = await this.assessCollectivePrinciple(operations);
    const authority = await this.assessAuthorityPrinciple(operations);
    const responsibility = await this.assessResponsibilityPrinciple(operations);
    const ethics = await this.assessEthicsPrinciple(operations);

    const overallScore = (collective.score + authority.score + responsibility.score + ethics.score) / 4;

    const recommendations: string[] = [];
    if (collective.score < 0.8) recommendations.push('Improve community benefit documentation');
    if (authority.score < 0.8) recommendations.push('Ensure Traditional Owner consent for all operations');
    if (responsibility.score < 0.8) recommendations.push('Review data handling practices for cultural sensitivity');
    if (ethics.score < 0.8) recommendations.push('Strengthen ethical frameworks and reciprocal relationships');

    return {
      collective,
      authority,
      responsibility,
      ethics,
      overallScore,
      recommendations
    };
  }

  private async assessCollectivePrinciple(operations: any[]): Promise<{ score: number; details: string[] }> {
    let score = 0;
    const details: string[] = [];

    for (const op of operations) {
      if (op.context.purpose.includes('community_benefit')) {
        score += 0.25;
        details.push(`Operation ${op.operation} has community benefit purpose`);
      }
    }

    return { score: Math.min(1.0, score), details };
  }

  private async assessAuthorityPrinciple(operations: any[]): Promise<{ score: number; details: string[] }> {
    let score = 0;
    const details: string[] = [];

    for (const op of operations) {
      if (op.context.sovereigntyLevel === 'traditional_owner' || op.context.culturalContext?.elderApproval) {
        score += 0.25;
        details.push(`Operation ${op.operation} has appropriate authority`);
      }
    }

    return { score: Math.min(1.0, score), details };
  }

  private async assessResponsibilityPrinciple(operations: any[]): Promise<{ score: number; details: string[] }> {
    let score = 0;
    const details: string[] = [];

    for (const op of operations) {
      const respectfulPurposes = ['cultural_preservation', 'heritage_protection', 'educational_resource'];
      if (op.context.purpose.some((p: string) => respectfulPurposes.includes(p))) {
        score += 0.25;
        details.push(`Operation ${op.operation} has respectful purpose`);
      }
    }

    return { score: Math.min(1.0, score), details };
  }

  private async assessEthicsPrinciple(operations: any[]): Promise<{ score: number; details: string[] }> {
    let score = 0;
    const details: string[] = [];

    for (const op of operations) {
      const harmfulPurposes = ['commercial_exploitation', 'cultural_appropriation'];
      if (!op.context.purpose.some((p: string) => harmfulPurposes.includes(p))) {
        score += 0.25;
        details.push(`Operation ${op.operation} avoids harmful purposes`);
      }
    }

    return { score: Math.min(1.0, score), details };
  }
}