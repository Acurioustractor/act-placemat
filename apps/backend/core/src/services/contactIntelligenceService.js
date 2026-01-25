/**
 * Contact Intelligence Service
 *
 * Extends existing AI infrastructure for comprehensive contact management
 * and youth justice advocacy intelligence.
 *
 * Integrates with:
 * - ResearchIntelligenceOrchestrator for AI-powered research
 * - MultiProviderAI for intelligent analysis
 * - IntelligentInsightsEngine for pattern detection
 * - Existing Supabase infrastructure
 *
 * @module contactIntelligenceService
 */

import researchIntelligenceOrchestrator from './researchIntelligenceOrchestrator.js';
import intelligentInsightsEngine from './intelligentInsightsEngine.js';
import MultiProviderAI from './multiProviderAI.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

// Import modular components
import {
  ContactDatabase,
  ContactMetrics,
  ContactNormalizer,
  ContactDashboard,
  ContactEnricher,
  ContactEngagement,
  ContactIntelligence,
  ContactImporter
} from './contacts/index.js';

export class ContactIntelligenceService extends EventEmitter {
  constructor() {
    super();

    // Initialize existing AI services
    this.research = researchIntelligenceOrchestrator;
    this.insights = intelligentInsightsEngine;
    this.ai = new MultiProviderAI();

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Youth Justice specific configurations
    this.youthJusticeKeywords = [
      'youth justice', 'juvenile detention', 'children court', 'youth advocacy',
      'indigenous youth', 'restorative justice', 'justice reinvestment',
      'youth offending', 'child protection', 'youth welfare', 'detention centre',
      'youth crime', 'juvenile justice', 'youth programs', 'diversion programs',
      'community justice', 'youth mentoring', 'at-risk youth', 'youth support'
    ];

    this.sectorKeywords = {
      government: ['minister', 'department', 'gov.au', 'parliament', 'commissioner', 'bureaucrat'],
      media: ['journalist', 'reporter', 'editor', 'broadcaster', 'abc', 'sbs', 'nine', 'seven'],
      academic: ['professor', 'researcher', 'university', '.edu.au', 'phd', 'dr.', 'academic'],
      ngo: ['foundation', 'charity', 'non-profit', 'advocacy', 'community', 'social'],
      legal: ['lawyer', 'solicitor', 'barrister', 'legal', 'law', 'judge', 'magistrate'],
      indigenous: ['aboriginal', 'torres strait', 'indigenous', 'first nations', 'iwi', 'mob'],
      corporate: ['ceo', 'director', 'executive', 'company', 'corporation', 'business']
    };

    // Scoring weights for youth justice relevance
    this.scoringWeights = {
      keyword_match: 0.4,
      sector_relevance: 0.3,
      interaction_history: 0.2,
      ai_assessment: 0.1
    };

    // Initialize modular components
    this.metricsService = new ContactMetrics();
    this.database = new ContactDatabase(this.supabase);
    this.normalizer = new ContactNormalizer(this.youthJusticeKeywords, this.sectorKeywords);
    this.dashboard = new ContactDashboard(this.supabase, null);
    this.enricher = new ContactEnricher(this.supabase, this.youthJusticeKeywords);
    this.engagement = new ContactEngagement();
    this.intelligence = new ContactIntelligence(this.supabase, this.research, this.ai, this.metricsService.metrics);
    this.importer = new ContactImporter(this.supabase, this.normalizer, this.enricher, this.metricsService.metrics);

    // Contact intelligence cache
    this.intelligenceCache = new Map();
    this.enrichmentQueue = [];
    this.isProcessingQueue = false;

    logger.info('🎯 Contact Intelligence Service initialized with modular architecture');
  }

  /**
   * Import and enrich contacts from CSV data
   */
  async importAndEnrichContacts(csvData, options = {}) {
    return this.importer.importAndEnrichContacts(csvData, options);
  }

  /**
   * Process a batch of contacts
   */
  async processBatch(batch, enableAIEnrichment) {
    return this.importer.processBatch(batch, enableAIEnrichment);
  }

  /**
   * Find existing contact by email or name
   */
  async findExistingContact(contactData) {
    return this.importer.findExistingContact(contactData);
  }

  /**
   * Create a new contact record
   */
  async createContact(contactData) {
    return this.importer.createContact(contactData);
  }

  /**
   * Normalize contact data from various CSV formats
   */
  normalizeContactData(contactData) {
    return this.normalizer.normalizeContactData(contactData);
  }

  /**
   * Determine sector based on title, organization, and email
   */
  determineSector(title, organization, email) {
    return this.normalizer.determineSector(title, organization, email);
  }

  /**
   * Detect Indigenous affiliation
   */
  detectIndigenousAffiliation(name, title, organization) {
    return this.normalizer.detectIndigenousAffiliation(name, title, organization);
  }

  /**
   * Extract region from location or email domain
   */
  extractRegion(location, email) {
    return this.normalizer.extractRegion(location, email);
  }

  /**
   * Generate tags based on contact data
   */
  generateTags(contactData) {
    return this.normalizer.generateTags(contactData);
  }

  /**
   * Determine organization type
   */
  determineOrganizationType(organization, sector) {
    return this.normalizer.determineOrganizationType(organization, sector);
  }

  /**
   * Basic contact enrichment (without heavy AI calls)
   */
  async enrichContactBasic(personId) {
    return this.enricher.enrichContactBasic(personId);
  }

  /**
   * Calculate basic scoring without AI calls
   */
  calculateBasicScores(contact) {
    return this.enricher.calculateBasicScores(contact);
  }

  /**
   * Determine engagement priority
   */
  determineEngagementPriority(contact, scores) {
    return this.engagement.determineEngagementPriority(contact, scores);
  }

  /**
   * Suggest engagement strategy
   */
  suggestEngagementStrategy(contact, scores) {
    return this.engagement.suggestEngagementStrategy(contact, scores);
  }

  /**
   * Update intelligence scores in database
   */
  async updateIntelligenceScores(personId, scores) {
    return this.intelligence.updateIntelligenceScores(personId, scores);
  }

  /**
   * Full AI-powered contact enrichment
   */
  async enrichContactFull(personId) {
    return this.intelligence.enrichContactFull(personId);
  }

  /**
   * Log research data to database
   */
  async logResearchData(personId, researchType, researchData, aiAnalysis) {
    return this.intelligence.logResearchData(personId, researchType, researchData, aiAnalysis);
  }

  /**
   * Parse AI analysis response
   */
  parseAIAnalysis(content) {
    return this.intelligence.parseAIAnalysis(content);
  }

  /**
   * Get mock dashboard data when database tables don't exist yet
   */
  getMockDashboardData() {
    return this.dashboard.getMockDashboardData();
  }

  /**
   * Get contact intelligence dashboard data
   */
  async getDashboardData() {
    return this.dashboard.getDashboardData();
  }

  /**
   * Calculate dashboard statistics
   */
  calculateDashboardStats(contacts, campaigns, interactions) {
    return this.dashboard.calculateDashboardStats(contacts, campaigns, interactions);
  }

  /**
   * Initialize database schema and create necessary tables/views
   */
  async initializeDatabase() {
    return this.database.initializeDatabase();
  }

  /**
   * Create additional contact intelligence tables
   */
  async createContactTables() {
    return this.database.createContactTables();
  }

  /**
   * Create dashboard summary view
   */
  async createDashboardView() {
    return this.database.createDashboardView();
  }

  /**
   * Get service metrics and health
   */
  getServiceMetrics() {
    return this.metricsService.getServiceMetrics(
      this.intelligenceCache,
      this.enrichmentQueue,
      this.isProcessingQueue
    );
  }
}

export default ContactIntelligenceService;
