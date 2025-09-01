/**
 * ACT Ecosystem Data Enrichment Service
 * 
 * Philosophy: Continuous improvement through community feedback and intelligent enhancement
 * Embodies ACT values: Curious, Grassroots, Collaborative, Authentic
 * 
 * Features:
 * - Real-time data enhancement from multiple sources
 * - Community-driven data quality improvement
 * - ACT philosophy scoring and analysis
 * - Flexible enrichment workflows
 * - Consent-first data handling
 */

import { notionService } from './notionService.js';
import { logger } from '../utils/logger.js';

class EcosystemEnrichmentService {
    constructor() {
        this.notionService = notionService;
        this.enrichmentRules = new Map();
        this.communityFeedback = new Map();
        this.confidenceThresholds = {
            community_ownership: 0.7,
            empathy_score: 0.6,
            relationship_strength: 0.8,
            story_authenticity: 0.9
        };
        
        this.setupEnrichmentRules();
    }

    /**
     * Main enrichment orchestrator
     * Enhances raw Notion data with ACT philosophy scoring and community insights
     */
    async enrichEcosystemData(rawData) {
        try {
            logger.info('Starting ecosystem data enrichment');
            
            const enriched = {
                projects: await this.enrichProjects(rawData.projects || []),
                opportunities: await this.enrichOpportunities(rawData.opportunities || []),
                organizations: await this.enrichOrganizations(rawData.organizations || []),
                people: await this.enrichPeople(rawData.people || []),
                relationships: await this.enrichRelationships(rawData),
                insights: await this.generateEcosystemInsights(rawData),
                metadata: {
                    enrichmentDate: new Date().toISOString(),
                    dataQuality: await this.assessDataQuality(rawData),
                    communityContributions: this.communityFeedback.size,
                    confidenceScore: await this.calculateOverallConfidence(rawData)
                }
            };

            logger.info('Ecosystem data enrichment completed', {
                projects: enriched.projects.length,
                insights: enriched.insights.length,
                qualityScore: enriched.metadata.dataQuality
            });

            return enriched;
        } catch (error) {
            logger.error('Ecosystem enrichment failed:', error);
            throw error;
        }
    }

    /**
     * Enrich projects with ACT philosophy scoring
     */
    async enrichProjects(projects) {
        return Promise.all(projects.map(async (project) => {
            const enriched = {
                ...project,
                // ACT Philosophy Scores
                communityOwnership: await this.calculateCommunityOwnership(project),
                empathyScore: await this.calculateEmpathyScore(project),
                storyDensity: await this.calculateStoryDensity(project),
                collaborationIndex: await this.calculateCollaborationIndex(project),
                grassrootsIndicator: await this.assessGrassrootsOrigin(project),
                
                // Enhanced metadata
                actValues: await this.extractACTValues(project),
                innovationMethods: await this.identifyInnovationMethods(project),
                communityImpact: await this.assessCommunityImpact(project),
                
                // Relationship data
                connectedOpportunities: await this.findConnectedOpportunities(project.id),
                partnerOrganizations: await this.findPartnerOrganizations(project.id),
                relatedStories: await this.findRelatedStories(project.id),
                
                // Quality indicators
                dataCompleteness: this.assessProjectCompleteness(project),
                lastEnriched: new Date().toISOString(),
                enrichmentConfidence: await this.calculateProjectConfidence(project)
            };

            return enriched;
        }));
    }

    /**
     * Calculate community ownership score (0-1)
     * Based on ACT's grassroots philosophy
     */
    async calculateCommunityOwnership(project) {
        let score = 0;
        const description = (project.description || '').toLowerCase();
        const themes = project.themes || [];
        const coreValues = project.coreValues || [];

        // Textual indicators
        const communityKeywords = [
            'community-led', 'grassroots', 'community-driven', 'locally-owned',
            'community voice', 'self-determined', 'community-controlled'
        ];
        
        communityKeywords.forEach(keyword => {
            if (description.includes(keyword)) score += 0.15;
        });

        // Theme-based indicators
        if (themes.includes('Community Voice')) score += 0.25;
        if (themes.includes('Community Development')) score += 0.2;
        if (themes.includes('Indigenous Leadership')) score += 0.3;

        // Values-based indicators
        if (coreValues.includes('Decentralised Power')) score += 0.25;
        if (coreValues.includes('Truth-Telling')) score += 0.15;

        // Community feedback integration
        const communityInput = this.communityFeedback.get(`${project.id}_community_ownership`);
        if (communityInput && communityInput.confidence > 0.8) {
            score = (score + communityInput.score) / 2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Calculate empathy score based on ACT's Empathy Ledger methodology
     */
    async calculateEmpathyScore(project) {
        let score = 0;
        const description = (project.description || '').toLowerCase();
        const coreValues = project.coreValues || [];

        // Empathy indicators
        const empathyKeywords = [
            'empathy', 'listening', 'understanding', 'compassion',
            'care', 'support', 'healing', 'trauma-informed'
        ];
        
        empathyKeywords.forEach(keyword => {
            if (description.includes(keyword)) score += 0.12;
        });

        // ACT-specific empathy indicators
        if (description.includes('empathy ledger')) score += 0.3;
        if (description.includes('community voice')) score += 0.2;
        if (description.includes('lived experience')) score += 0.25;

        // Values-based empathy
        if (coreValues.includes('Radical Humility')) score += 0.3;
        if (coreValues.includes('Truth-Telling')) score += 0.2;

        // Methodology indicators
        if (description.includes('consent-first')) score += 0.2;
        if (description.includes('trauma-informed')) score += 0.25;

        return Math.min(score, 1.0);
    }

    /**
     * Calculate story density - stories per project
     */
    async calculateStoryDensity(project) {
        try {
            const relatedStories = await this.findRelatedStories(project.id);
            const communityStories = relatedStories.filter(story => 
                story.communityVoice && story.consentVerified
            );
            
            return communityStories.length;
        } catch (error) {
            logger.error('Story density calculation failed:', error);
            return 0;
        }
    }

    /**
     * Calculate collaboration index based on relationships
     */
    async calculateCollaborationIndex(project) {
        try {
            const [opportunities, partners] = await Promise.all([
                this.findConnectedOpportunities(project.id),
                this.findPartnerOrganizations(project.id)
            ]);

            const relationshipCount = opportunities.length + partners.length;
            const maxRelationships = 10; // Normalize to 0-1 scale
            
            return Math.min(relationshipCount / maxRelationships, 1.0);
        } catch (error) {
            logger.error('Collaboration index calculation failed:', error);
            return 0;
        }
    }

    /**
     * Assess grassroots origin vs institutional
     */
    async assessGrassrootsOrigin(project) {
        let score = 0;
        const description = (project.description || '').toLowerCase();
        
        // Grassroots indicators (positive)
        const grassrootsIndicators = [
            'grassroots', 'community-initiated', 'bottom-up', 'locally-grown',
            'community-started', 'volunteer-led', 'neighbourhood'
        ];
        
        grassrootsIndicators.forEach(indicator => {
            if (description.includes(indicator)) score += 0.2;
        });

        // Institutional indicators (negative)
        const institutionalIndicators = [
            'government-led', 'corporate', 'top-down', 'mandated',
            'institutional', 'bureaucratic'
        ];
        
        institutionalIndicators.forEach(indicator => {
            if (description.includes(indicator)) score -= 0.15;
        });

        return Math.max(0, Math.min(score, 1.0));
    }

    /**
     * Extract ACT core values from project data
     */
    async extractACTValues(project) {
        const values = [];
        const description = (project.description || '').toLowerCase();
        const themes = project.themes || [];
        const coreValues = project.coreValues || [];

        // Map Notion values to ACT philosophy
        const valueMapping = {
            'Truth-Telling': 'truth-telling',
            'Economic Freedom': 'economic-freedom',
            'Decentralised Power': 'decentralized-power',
            'Creativity': 'creativity',
            'Radical Humility': 'radical-humility'
        };

        coreValues.forEach(value => {
            if (valueMapping[value]) {
                values.push(valueMapping[value]);
            }
        });

        // Infer additional values from description
        if (description.includes('curious') || description.includes('learning')) {
            values.push('curious');
        }
        if (description.includes('grassroots') || description.includes('community-led')) {
            values.push('grassroots-led');
        }
        if (description.includes('collaborative') || description.includes('partnership')) {
            values.push('collaborative');
        }
        if (description.includes('authentic') || description.includes('genuine')) {
            values.push('authentic');
        }

        return [...new Set(values)]; // Remove duplicates
    }

    /**
     * Find connected opportunities using relationship analysis
     */
    async findConnectedOpportunities(projectId) {
        try {
            // This would analyze relationships between projects and opportunities
            // For now, return empty array - would be enhanced with actual relationship data
            return [];
        } catch (error) {
            logger.error('Finding connected opportunities failed:', error);
            return [];
        }
    }

    /**
     * Find partner organizations through relationship mapping
     */
    async findPartnerOrganizations(projectId) {
        try {
            // This would analyze project-organization relationships
            // For now, return empty array - would be enhanced with actual relationship data
            return [];
        } catch (error) {
            logger.error('Finding partner organizations failed:', error);
            return [];
        }
    }

    /**
     * Find related stories using content analysis
     */
    async findRelatedStories(projectId) {
        try {
            // This would analyze story-project relationships
            // For now, return empty array - would be enhanced with story analysis
            return [];
        } catch (error) {
            logger.error('Finding related stories failed:', error);
            return [];
        }
    }

    /**
     * Generate ecosystem insights using pattern analysis
     */
    async generateEcosystemInsights(rawData) {
        const insights = [];

        try {
            // Community growth analysis
            const communityGrowthInsight = await this.analyzeCommunityGrowth(rawData);
            if (communityGrowthInsight) insights.push(communityGrowthInsight);

            // Relationship density analysis
            const relationshipInsight = await this.analyzeRelationshipDensity(rawData);
            if (relationshipInsight) insights.push(relationshipInsight);

            // Empathy spread analysis
            const empathyInsight = await this.analyzeEmpathySpread(rawData);
            if (empathyInsight) insights.push(empathyInsight);

            return insights;
        } catch (error) {
            logger.error('Insight generation failed:', error);
            return [];
        }
    }

    /**
     * Analyze community growth patterns
     */
    async analyzeCommunityGrowth(rawData) {
        const projects = rawData.projects || [];
        const activeProjects = projects.filter(p => 
            p.status && (p.status.includes('Active') || p.status.includes('Growing'))
        );

        const communityLedCount = projects.filter(p => {
            const desc = (p.description || '').toLowerCase();
            return desc.includes('community-led') || desc.includes('grassroots');
        }).length;

        const growthRate = communityLedCount / Math.max(projects.length, 1);

        return {
            type: 'community-growth',
            title: 'Grassroots Momentum Building',
            description: `${Math.round(growthRate * 100)}% of initiatives show community leadership characteristics. ${activeProjects.length} projects actively growing.`,
            confidence: growthRate > 0.3 ? 0.85 : 0.65,
            evidence: [
                {
                    type: 'quantitative',
                    source: 'project-analysis',
                    description: `${communityLedCount} community-led projects out of ${projects.length} total`,
                    reliability: 0.9
                }
            ],
            actionable: true,
            communityImpact: 'High - grassroots initiatives showing strong momentum',
            scalingPotential: growthRate > 0.5 ? 'regional' : 'local'
        };
    }

    /**
     * Setup enrichment rules for automated enhancement
     */
    setupEnrichmentRules() {
        // Community ownership rules
        this.enrichmentRules.set('community_ownership', {
            keywords: ['community-led', 'grassroots', 'locally-owned'],
            themes: ['Community Voice', 'Community Development'],
            values: ['Decentralised Power'],
            weight: 0.8
        });

        // Empathy score rules
        this.enrichmentRules.set('empathy_score', {
            keywords: ['empathy', 'listening', 'compassion', 'care'],
            themes: ['Empathy Ledger', 'Trauma-Informed'],
            values: ['Radical Humility', 'Truth-Telling'],
            weight: 0.75
        });
    }

    /**
     * Accept community feedback for continuous improvement
     */
    async submitCommunityFeedback(entityId, field, score, confidence, source) {
        const key = `${entityId}_${field}`;
        
        this.communityFeedback.set(key, {
            score,
            confidence,
            source,
            timestamp: new Date().toISOString(),
            validated: false
        });

        logger.info('Community feedback submitted', { entityId, field, score, confidence });
        
        // Trigger re-enrichment if confidence is high
        if (confidence > 0.8) {
            await this.triggerTargetedEnrichment(entityId, field);
        }
    }

    /**
     * Assess overall data quality
     */
    async assessDataQuality(rawData) {
        const projects = rawData.projects || [];
        if (projects.length === 0) return 0;

        let qualityScore = 0;
        let totalFields = 0;

        projects.forEach(project => {
            // Essential fields
            if (project.name) { qualityScore += 1; totalFields += 1; }
            if (project.description) { qualityScore += 1; totalFields += 1; }
            if (project.status) { qualityScore += 1; totalFields += 1; }
            
            // ACT-specific fields
            if (project.themes && project.themes.length > 0) { qualityScore += 1; totalFields += 1; }
            if (project.coreValues && project.coreValues.length > 0) { qualityScore += 1; totalFields += 1; }
            
            totalFields += 5; // Total possible fields per project
        });

        return totalFields > 0 ? qualityScore / totalFields : 0;
    }

    // Additional helper methods would be implemented here...
    async enrichOpportunities(opportunities) { return opportunities; }
    async enrichOrganizations(organizations) { return organizations; }
    async enrichPeople(people) { return people; }
    async enrichRelationships(rawData) { return new Map(); }
    async identifyInnovationMethods(project) { return []; }
    async assessCommunityImpact(project) { return 'Moderate'; }
    assessProjectCompleteness(project) { return 0.7; }
    async calculateProjectConfidence(project) { return 0.8; }
    async calculateOverallConfidence(rawData) { return 0.75; }
    async analyzeRelationshipDensity(rawData) { return null; }
    async analyzeEmpathySpread(rawData) { return null; }
    async triggerTargetedEnrichment(entityId, field) { /* Implementation */ }
}

export default new EcosystemEnrichmentService();