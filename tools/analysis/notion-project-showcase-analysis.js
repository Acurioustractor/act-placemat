#!/usr/bin/env node

/**
 * ACT Notion Project Showcase Analysis
 * 
 * Connects to ACT's Notion databases and analyzes project data to discover
 * the most amazing stories for the community-centered project showcase.
 * 
 * This script will:
 * 1. Connect to all Notion databases using provided credentials
 * 2. Fetch and analyze ALL project data
 * 3. Identify compelling stories and themes
 * 4. Analyze values alignment with ACT's core principles
 * 5. Find visual storytelling opportunities
 * 6. Map community collaboration patterns
 * 7. Generate comprehensive analysis report
 */

const path = require('path');
const fs = require('fs');

// Set up the path to import our Notion integration
const backendPath = path.join(__dirname, '../../apps/backend/src');
process.env.NODE_PATH = backendPath;
require('module')._initPaths();

const NotionMCP = require(`${backendPath}/notion-mcp.js`);
const { logger } = require(`${backendPath}/utils/logger`);

class ACTProjectShowcaseAnalyzer {
  constructor() {
    // Initialize Notion connection with provided credentials
    this.notion = new NotionMCP({
      token: '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',
      projectsDb: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
      peopleDb: '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
      organizationsDb: '948f3946-7d1c-42f2-bd7e-1317a755e67b',
      opportunitiesDb: '619ceac3-8d2a-4e30-bd73-0b81ccfadfc4', // Using stories DB ID for opportunities
      artifactsDb: '1065e276-738e-4d38-9ceb-51497e00c3b4' // Using partners DB ID for artifacts
    });

    // ACT's core values for analysis
    this.actValues = {
      radicalHumility: [
        'humility', 'listening', 'learning', 'growth mindset', 'authentic',
        'vulnerable', 'honest', 'transparent', 'open', 'receptive'
      ],
      decentralizedPower: [
        'community-owned', 'distributed', 'local control', 'grassroots',
        'bottom-up', 'democratic', 'participant-owned', 'collective',
        'autonomous', 'self-governing', 'peer-to-peer'
      ],
      creativityAsDisruption: [
        'innovative', 'creative', 'disruptive', 'experimental', 'artistic',
        'unconventional', 'alternative', 'breakthrough', 'pioneering',
        'reimagining', 'transformative'
      ],
      uncomfortableTruthTelling: [
        'truth', 'justice', 'systemic change', 'advocacy', 'activism',
        'challenging', 'uncomfortable', 'brave', 'difficult conversations',
        'systemic', 'structural change', 'equity'
      ]
    };

    this.analysisResults = {
      projectData: [],
      peopleData: [],
      organizationsData: [],
      storiesData: [],
      partnersData: [],
      themes: new Map(),
      valueAlignment: new Map(),
      collaborationPatterns: new Map(),
      visualOpportunities: [],
      compellingStories: [],
      systemicImpactProjects: [],
      communityOwnershipProjects: []
    };
  }

  /**
   * Run the complete analysis
   */
  async runAnalysis() {
    console.log('\n🚀 Starting ACT Notion Project Showcase Analysis...\n');
    
    try {
      // Step 1: Fetch all data
      await this.fetchAllData();
      
      // Step 2: Analyze project themes and content
      await this.analyzeProjectThemes();
      
      // Step 3: Analyze values alignment
      await this.analyzeValuesAlignment();
      
      // Step 4: Find visual storytelling opportunities
      await this.findVisualOpportunities();
      
      // Step 5: Discover collaboration patterns
      await this.analyzeCollaborationPatterns();
      
      // Step 6: Identify compelling stories
      await this.identifyCompellingStories();
      
      // Step 7: Generate comprehensive report
      await this.generateReport();
      
      console.log('\n✅ Analysis complete! Check the generated report files.\n');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      logger.error('Analysis failed:', error);
    }
  }

  /**
   * Fetch all data from Notion databases
   */
  async fetchAllData() {
    console.log('📊 Fetching data from all Notion databases...');
    
    try {
      // Fetch projects (main database)
      console.log('  → Fetching projects data...');
      this.analysisResults.projectData = await this.notion.fetchProjects();
      console.log(`    ✓ Found ${this.analysisResults.projectData.length} projects`);

      // Fetch people
      console.log('  → Fetching people data...');
      this.analysisResults.peopleData = await this.notion.fetchPeople();
      console.log(`    ✓ Found ${this.analysisResults.peopleData.length} people`);

      // Fetch organizations
      console.log('  → Fetching organizations data...');
      this.analysisResults.organizationsData = await this.notion.fetchOrganizations();
      console.log(`    ✓ Found ${this.analysisResults.organizationsData.length} organizations`);

      // Fetch stories (using opportunities endpoint)
      console.log('  → Fetching stories data...');
      this.analysisResults.storiesData = await this.notion.fetchOpportunities();
      console.log(`    ✓ Found ${this.analysisResults.storiesData.length} stories`);

      // Fetch partners (using artifacts endpoint)
      console.log('  → Fetching partners data...');
      this.analysisResults.partnersData = await this.notion.fetchArtifacts();
      console.log(`    ✓ Found ${this.analysisResults.partnersData.length} partners`);

    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  /**
   * Analyze project themes, titles, and content
   */
  async analyzeProjectThemes() {
    console.log('🎯 Analyzing project themes and content...');
    
    this.analysisResults.projectData.forEach(project => {
      // Extract themes from various fields
      const allText = [
        project.name || '',
        project.description || '',
        project.area || '',
        project.coreValues || '',
        ...(project.themes || []),
        ...(project.tags || []),
        project.aiSummary || ''
      ].join(' ').toLowerCase();

      // Count theme occurrences
      this.extractThemes(allText, project);
      
      // Analyze for impact potential
      this.analyzeImpactPotential(project, allText);
    });

    console.log(`    ✓ Identified ${this.analysisResults.themes.size} unique themes`);
  }

  /**
   * Extract themes from text content
   */
  extractThemes(text, project) {
    // Key themes to look for
    const themeKeywords = {
      'Community Ownership': ['community-owned', 'cooperative', 'collective', 'participant-owned'],
      'Indigenous Rights': ['indigenous', 'first nations', 'aboriginal', 'traditional', 'cultural'],
      'Economic Justice': ['economic', 'mutual credit', 'local currency', 'fair trade', 'wealth'],
      'Environmental': ['renewable', 'solar', 'sustainable', 'climate', 'environment', 'green'],
      'Technology for Good': ['platform', 'digital', 'tech', 'data', 'software', 'system'],
      'Social Innovation': ['innovation', 'creative', 'disruptive', 'alternative', 'experimental'],
      'Systemic Change': ['systemic', 'structural', 'transformation', 'revolution', 'paradigm'],
      'Decentralized Power': ['decentralized', 'distributed', 'peer-to-peer', 'grassroots'],
      'Food Security': ['food', 'agriculture', 'farming', 'nutrition', 'seeds'],
      'Housing Justice': ['housing', 'accommodation', 'shelter', 'rent', 'property'],
      'Education': ['education', 'learning', 'training', 'skills', 'knowledge'],
      'Healthcare': ['health', 'medical', 'wellness', 'mental health', 'care'],
      'Arts & Culture': ['arts', 'culture', 'creative', 'music', 'performance', 'artistic'],
      'Youth Engagement': ['youth', 'young people', 'children', 'students', 'next generation']
    };

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        if (!this.analysisResults.themes.has(theme)) {
          this.analysisResults.themes.set(theme, []);
        }
        this.analysisResults.themes.get(theme).push({
          project: project,
          matches: matches,
          relevanceScore: matches.length
        });
      }
    });
  }

  /**
   * Analyze impact potential
   */
  analyzeImpactPotential(project, text) {
    let impactScore = 0;
    const impactIndicators = [
      'transformative', 'revolutionary', 'groundbreaking', 'systemic change',
      'community impact', 'social change', 'paradigm shift', 'game changer',
      'scaling', 'replication', 'model', 'pilot', 'prototype'
    ];

    impactIndicators.forEach(indicator => {
      if (text.includes(indicator)) impactScore++;
    });

    // Consider financial metrics
    const revenue = project.revenueActual || 0;
    const potential = project.revenuePotential || 0;
    if (potential > 100000) impactScore += 2;
    if (revenue > 50000) impactScore += 1;

    // Consider status and funding
    if (project.status === 'Active') impactScore += 1;
    if (project.funding === 'Funded') impactScore += 1;

    project.impactScore = impactScore;

    if (impactScore >= 3) {
      this.analysisResults.systemicImpactProjects.push(project);
    }
  }

  /**
   * Analyze values alignment with ACT's core principles
   */
  async analyzeValuesAlignment() {
    console.log('💎 Analyzing values alignment with ACT core principles...');
    
    this.analysisResults.projectData.forEach(project => {
      const allText = [
        project.name || '',
        project.description || '',
        project.aiSummary || '',
        ...(project.themes || []),
        ...(project.tags || [])
      ].join(' ').toLowerCase();

      Object.entries(this.actValues).forEach(([value, keywords]) => {
        const matches = keywords.filter(keyword => allText.includes(keyword));
        const alignmentScore = matches.length;

        if (alignmentScore > 0) {
          if (!this.analysisResults.valueAlignment.has(value)) {
            this.analysisResults.valueAlignment.set(value, []);
          }
          
          this.analysisResults.valueAlignment.get(value).push({
            project: project,
            matches: matches,
            alignmentScore: alignmentScore
          });
        }
      });

      // Check for community ownership specifically
      const communityKeywords = ['community-owned', 'cooperative', 'collective', 'participant-owned'];
      const hasCommunityOwnership = communityKeywords.some(keyword => allText.includes(keyword));
      
      if (hasCommunityOwnership) {
        this.analysisResults.communityOwnershipProjects.push(project);
      }
    });

    console.log(`    ✓ Analyzed ${this.analysisResults.projectData.length} projects for values alignment`);
  }

  /**
   * Find visual storytelling opportunities
   */
  async findVisualOpportunities() {
    console.log('📸 Identifying visual storytelling opportunities...');
    
    this.analysisResults.projectData.forEach(project => {
      let visualScore = 0;
      const visualIndicators = [];

      // Check for visual elements mentioned
      const allText = [
        project.name || '',
        project.description || '',
        project.aiSummary || ''
      ].join(' ').toLowerCase();

      const visualKeywords = {
        'Photos/Documentation': ['photo', 'image', 'picture', 'documentation', 'visual'],
        'Video Potential': ['video', 'film', 'documentary', 'recording', 'footage'],
        'Interactive Elements': ['interactive', 'demo', 'prototype', 'showcase', 'exhibition'],
        'Community Events': ['event', 'gathering', 'celebration', 'festival', 'workshop'],
        'Physical Spaces': ['space', 'location', 'building', 'facility', 'site', 'place'],
        'Technology Demos': ['platform', 'system', 'interface', 'dashboard', 'tool'],
        'Success Stories': ['success', 'achievement', 'milestone', 'breakthrough', 'victory'],
        'Transformation': ['before', 'after', 'transformation', 'change', 'impact', 'difference']
      };

      Object.entries(visualKeywords).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => allText.includes(keyword));
        if (matches.length > 0) {
          visualScore += matches.length;
          visualIndicators.push({
            category: category,
            keywords: matches
          });
        }
      });

      // Consider project status and funding for visual story potential
      if (project.status === 'Active') visualScore += 2;
      if (project.revenueActual > 0) visualScore += 1;
      if (project.location || project.place) visualScore += 1;

      if (visualScore >= 3) {
        this.analysisResults.visualOpportunities.push({
          project: project,
          visualScore: visualScore,
          indicators: visualIndicators
        });
      }
    });

    console.log(`    ✓ Found ${this.analysisResults.visualOpportunities.length} projects with strong visual storytelling potential`);
  }

  /**
   * Analyze community collaboration patterns
   */
  async analyzeCollaborationPatterns() {
    console.log('🤝 Analyzing community collaboration patterns...');
    
    // Create network maps
    const organizationConnections = new Map();
    const peopleConnections = new Map();
    const projectCollaborations = new Map();

    this.analysisResults.projectData.forEach(project => {
      // Track organization partnerships
      if (project.partnerOrganizations && project.partnerOrganizations.length > 0) {
        project.partnerOrganizations.forEach(orgId => {
          if (!organizationConnections.has(orgId)) {
            organizationConnections.set(orgId, []);
          }
          organizationConnections.get(orgId).push(project);
        });
      }

      // Track people involvement
      const teamMembers = project.teamMembers ? project.teamMembers.split(',').map(m => m.trim()) : [];
      teamMembers.forEach(member => {
        if (!peopleConnections.has(member)) {
          peopleConnections.set(member, []);
        }
        peopleConnections.get(member).push(project);
      });

      // Track cross-project relationships
      if (project.relatedOpportunities && project.relatedOpportunities.length > 0) {
        if (!projectCollaborations.has(project.id)) {
          projectCollaborations.set(project.id, []);
        }
        projectCollaborations.get(project.id).push(...project.relatedOpportunities);
      }
    });

    this.analysisResults.collaborationPatterns = {
      organizationConnections,
      peopleConnections,
      projectCollaborations
    };

    console.log(`    ✓ Mapped ${organizationConnections.size} organization connections`);
    console.log(`    ✓ Tracked ${peopleConnections.size} people collaborations`);
  }

  /**
   * Identify the most compelling stories
   */
  async identifyCompellingStories() {
    console.log('⭐ Identifying most compelling project stories...');
    
    const scoredProjects = this.analysisResults.projectData.map(project => {
      let storyScore = 0;
      const storyFactors = [];

      // Impact score
      storyScore += project.impactScore || 0;
      if (project.impactScore > 0) {
        storyFactors.push(`Impact Score: ${project.impactScore}`);
      }

      // Financial success
      if (project.revenueActual > 50000) {
        storyScore += 3;
        storyFactors.push(`Strong Revenue: $${project.revenueActual.toLocaleString()}`);
      }

      // Community ownership
      const isCommunitOwned = this.analysisResults.communityOwnershipProjects.includes(project);
      if (isCommunitOwned) {
        storyScore += 4;
        storyFactors.push('Community Ownership');
      }

      // Values alignment
      let valueAlignmentCount = 0;
      this.analysisResults.valueAlignment.forEach((projects, value) => {
        if (projects.some(p => p.project.id === project.id)) {
          valueAlignmentCount++;
        }
      });
      storyScore += valueAlignmentCount;
      if (valueAlignmentCount > 0) {
        storyFactors.push(`Values Aligned: ${valueAlignmentCount} areas`);
      }

      // Visual potential
      const visualOpportunity = this.analysisResults.visualOpportunities.find(v => v.project.id === project.id);
      if (visualOpportunity) {
        storyScore += visualOpportunity.visualScore;
        storyFactors.push(`Visual Potential: ${visualOpportunity.visualScore}`);
      }

      // Active status
      if (project.status === 'Active') {
        storyScore += 2;
        storyFactors.push('Active Project');
      }

      // Innovation keywords
      const allText = [
        project.name || '',
        project.description || '',
        project.aiSummary || ''
      ].join(' ').toLowerCase();

      const innovationKeywords = ['first', 'pioneer', 'breakthrough', 'revolutionary', 'transformative'];
      const innovationMatches = innovationKeywords.filter(keyword => allText.includes(keyword));
      if (innovationMatches.length > 0) {
        storyScore += innovationMatches.length * 2;
        storyFactors.push(`Innovation: ${innovationMatches.join(', ')}`);
      }

      return {
        project: project,
        storyScore: storyScore,
        storyFactors: storyFactors
      };
    });

    // Sort by story score and take top compelling stories
    this.analysisResults.compellingStories = scoredProjects
      .sort((a, b) => b.storyScore - a.storyScore)
      .slice(0, 20); // Top 20 most compelling stories

    console.log(`    ✓ Identified ${this.analysisResults.compellingStories.length} most compelling stories`);
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateReport() {
    console.log('📄 Generating comprehensive analysis report...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const reportDir = path.join(__dirname, `notion-analysis-${timestamp}`);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate main report
    const mainReport = this.generateMainReport();
    fs.writeFileSync(path.join(reportDir, 'ACT-Project-Showcase-Analysis.md'), mainReport);

    // Generate data files
    const dataReport = this.generateDataReport();
    fs.writeFileSync(path.join(reportDir, 'raw-data-analysis.json'), JSON.stringify(dataReport, null, 2));

    // Generate theme analysis
    const themeReport = this.generateThemeReport();
    fs.writeFileSync(path.join(reportDir, 'theme-analysis.md'), themeReport);

    // Generate values alignment report
    const valuesReport = this.generateValuesReport();
    fs.writeFileSync(path.join(reportDir, 'values-alignment-analysis.md'), valuesReport);

    // Generate visual storytelling guide
    const visualReport = this.generateVisualReport();
    fs.writeFileSync(path.join(reportDir, 'visual-storytelling-opportunities.md'), visualReport);

    // Generate collaboration network analysis
    const collaborationReport = this.generateCollaborationReport();
    fs.writeFileSync(path.join(reportDir, 'collaboration-network-analysis.md'), collaborationReport);

    console.log(`    ✓ Reports generated in: ${reportDir}`);
  }

  /**
   * Generate main analysis report
   */
  generateMainReport() {
    const totalProjects = this.analysisResults.projectData.length;
    const totalPeople = this.analysisResults.peopleData.length;
    const totalOrgs = this.analysisResults.organizationsData.length;

    return `# ACT Project Showcase Analysis Report

*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

This comprehensive analysis of ACT's Notion database reveals **${totalProjects} projects**, **${totalPeople} people**, and **${totalOrgs} organizations** that collectively represent one of the most exciting collections of community-centered, transformative initiatives we've ever analyzed.

### Key Findings

🚀 **${this.analysisResults.compellingStories.length} incredibly compelling project stories** identified for showcase
🌟 **${this.analysisResults.systemicImpactProjects.length} projects with high systemic impact potential**
🤝 **${this.analysisResults.communityOwnershipProjects.length} community-owned initiatives** demonstrating true decentralized power
📸 **${this.analysisResults.visualOpportunities.length} projects with exceptional visual storytelling potential**
🎯 **${this.analysisResults.themes.size} major themes** spanning the full spectrum of social innovation

## Most Amazing Project Stories

### Top 10 Most Compelling Stories for Showcase

${this.analysisResults.compellingStories.slice(0, 10).map((story, index) => `
#### ${index + 1}. ${story.project.name}

**Story Score: ${story.storyScore}/20**

- **Area:** ${story.project.area || 'Not specified'}
- **Status:** ${story.project.status || 'Unknown'}
- **Revenue:** $${(story.project.revenueActual || 0).toLocaleString()} (Potential: $${(story.project.revenuePotential || 0).toLocaleString()})
- **Description:** ${story.project.description || 'No description available'}

**Why This Story is Amazing:**
${story.storyFactors.map(factor => `- ${factor}`).join('\n')}

**Values Alignment:** ${this.getProjectValuesAlignment(story.project)}

**Visual Storytelling Potential:** ${this.getVisualPotential(story.project)}

---
`).join('\n')}

## Community Ownership Success Stories

The following ${this.analysisResults.communityOwnershipProjects.length} projects exemplify ACT's vision of decentralized power and community control:

${this.analysisResults.communityOwnershipProjects.slice(0, 5).map(project => `
### ${project.name}
- **Area:** ${project.area || 'Not specified'}
- **Lead:** ${project.lead || 'Not specified'}
- **Description:** ${project.description || 'No description available'}
- **Community Impact:** Shows true community ownership and control
`).join('\n')}

## Systemic Impact Leaders

These ${this.analysisResults.systemicImpactProjects.length} projects are creating genuine systemic change:

${this.analysisResults.systemicImpactProjects.slice(0, 5).map(project => `
### ${project.name}
- **Impact Score:** ${project.impactScore}/10
- **Area:** ${project.area || 'Not specified'}  
- **Status:** ${project.status || 'Unknown'}
- **Description:** ${project.description || 'No description available'}
`).join('\n')}

## Revolutionary Design Recommendations

Based on this analysis, the community-centered project showcase should feature:

### 1. Hero Stories Section
Showcase the top 5 most compelling stories with rich visual content, emphasizing:
- Community ownership and control
- Transformative impact on people's lives
- Innovation in addressing systemic issues
- Values alignment with ACT's principles

### 2. Thematic Collections
Organize projects into key themes:
${Array.from(this.analysisResults.themes.keys()).slice(0, 8).map(theme => `- **${theme}** (${this.analysisResults.themes.get(theme).length} projects)`).join('\n')}

### 3. Interactive Network Map
Show collaboration patterns and connections between projects, people, and organizations to demonstrate the interconnected ecosystem of change.

### 4. Values-Driven Navigation  
Allow filtering and exploration by ACT's core values:
- Radical Humility projects
- Decentralized Power initiatives  
- Creativity as Disruption examples
- Uncomfortable Truth-Telling advocacy

### 5. Visual Story Cards
Each project should have rich media cards showing:
- Impact metrics and community outcomes
- Before/after transformations
- Community member testimonials
- Visual documentation of change

## Next Steps for Implementation

1. **Prioritize Top 10 Compelling Stories** for initial showcase development
2. **Gather visual assets** from the ${this.analysisResults.visualOpportunities.length} high-potential projects
3. **Connect with project leads** to capture community testimonials
4. **Develop thematic categorization system** based on identified themes
5. **Create interactive elements** to show collaboration networks
6. **Design values-aligned filtering system** for project discovery

This analysis reveals ACT's ecosystem as a revolutionary example of "tending the field" - creating conditions for community-centered change to flourish organically while maintaining focus on systemic transformation and genuine community ownership.

---

*This report provides the foundation for creating the most fucking amazing community-centered project showcase that demonstrates what's possible when communities have real power and control over their own development.*
`;
  }

  /**
   * Generate detailed data report
   */
  generateDataReport() {
    return {
      summary: {
        totalProjects: this.analysisResults.projectData.length,
        totalPeople: this.analysisResults.peopleData.length,
        totalOrganizations: this.analysisResults.organizationsData.length,
        totalStories: this.analysisResults.storiesData.length,
        totalPartners: this.analysisResults.partnersData.length,
        analysisDate: new Date().toISOString()
      },
      projects: this.analysisResults.projectData,
      people: this.analysisResults.peopleData,
      organizations: this.analysisResults.organizationsData,
      stories: this.analysisResults.storiesData,
      partners: this.analysisResults.partnersData,
      themes: Object.fromEntries(this.analysisResults.themes),
      valueAlignment: Object.fromEntries(this.analysisResults.valueAlignment),
      compellingStories: this.analysisResults.compellingStories,
      systemicImpactProjects: this.analysisResults.systemicImpactProjects,
      communityOwnershipProjects: this.analysisResults.communityOwnershipProjects,
      visualOpportunities: this.analysisResults.visualOpportunities
    };
  }

  /**
   * Generate theme analysis report
   */
  generateThemeReport() {
    return `# Project Themes Analysis

## Overview
Analysis of ${this.analysisResults.themes.size} major themes across ${this.analysisResults.projectData.length} projects.

## Theme Breakdown

${Array.from(this.analysisResults.themes.entries())
  .sort(([,a], [,b]) => b.length - a.length)
  .map(([theme, projects]) => `
### ${theme} (${projects.length} projects)

${projects.slice(0, 3).map(p => `- **${p.project.name}**: ${p.project.description || 'No description'} (Relevance: ${p.relevanceScore})`).join('\n')}
${projects.length > 3 ? `\n*...and ${projects.length - 3} more projects*` : ''}
`).join('\n')}

## Cross-Theme Analysis

Projects that span multiple themes represent the most integrated and potentially impactful initiatives.

## Recommendations

1. **Feature multi-theme projects** as examples of holistic community development
2. **Create theme-based collections** for easier project discovery
3. **Highlight emerging themes** that show innovation in community-centered approaches
`;
  }

  /**
   * Generate values alignment report
   */
  generateValuesReport() {
    return `# ACT Values Alignment Analysis

## Core Values Representation

${Array.from(this.analysisResults.valueAlignment.entries()).map(([value, projects]) => `
### ${value.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${projects.length} projects)

**Top Aligned Projects:**
${projects
  .sort((a, b) => b.alignmentScore - a.alignmentScore)
  .slice(0, 5)
  .map(p => `- **${p.project.name}** (Score: ${p.alignmentScore}) - Keywords: ${p.matches.join(', ')}`)
  .join('\n')}
`).join('\n')}

## Multi-Value Projects

Projects that align with multiple ACT values represent the most philosophically integrated initiatives:

${this.getMultiValueProjects().slice(0, 10).map(project => `
### ${project.name}
**Values Alignment:** ${project.alignedValues.join(', ')}
**Total Alignment Score:** ${project.totalAlignmentScore}
**Description:** ${project.description || 'No description available'}
`).join('\n')}

## Values-Driven Showcase Strategy

1. **Radical Humility Section**: Feature projects that demonstrate authentic community listening and learning
2. **Decentralized Power Gallery**: Highlight community-owned and controlled initiatives  
3. **Creative Disruption Stories**: Show innovative approaches to systemic problems
4. **Truth-Telling Champions**: Present projects tackling uncomfortable but necessary conversations

This values-driven approach ensures the showcase authentically represents ACT's philosophy while inspiring others to adopt similar approaches.
`;
  }

  /**
   * Generate visual storytelling report
   */
  generateVisualReport() {
    return `# Visual Storytelling Opportunities

## High-Potential Projects for Visual Content

${this.analysisResults.visualOpportunities
  .sort((a, b) => b.visualScore - a.visualScore)
  .slice(0, 15)
  .map(opportunity => `
### ${opportunity.project.name}
**Visual Score:** ${opportunity.visualScore}/10

**Storytelling Elements:**
${opportunity.indicators.map(indicator => `- **${indicator.category}**: ${indicator.keywords.join(', ')}`).join('\n')}

**Project Details:**
- **Status:** ${opportunity.project.status || 'Unknown'}
- **Area:** ${opportunity.project.area || 'Not specified'}
- **Revenue:** $${(opportunity.project.revenueActual || 0).toLocaleString()}
- **Description:** ${opportunity.project.description || 'No description available'}

**Visual Story Recommendations:**
${this.getVisualRecommendations(opportunity)}

---
`).join('\n')}

## Visual Content Strategy

### Photo Documentation Priorities
1. Community members actively engaged in project activities
2. Before/after transformations showing impact
3. Collaborative working sessions and decision-making
4. Success celebrations and milestone achievements

### Video Content Opportunities  
1. Community member testimonials about project impact
2. Behind-the-scenes project development processes
3. Interactive demonstrations of project outcomes
4. Collaborative governance and decision-making processes

### Interactive Elements
1. Impact metric dashboards showing real-time community benefits
2. Project timeline visualizations showing community-led development
3. Network maps showing collaboration and mutual support
4. Values-driven filtering and exploration interfaces

This visual strategy ensures the showcase captures not just what projects do, but how they embody ACT's values and create genuine community ownership.
`;
  }

  /**
   * Generate collaboration network report
   */
  generateCollaborationReport() {
    const { organizationConnections, peopleConnections, projectCollaborations } = this.analysisResults.collaborationPatterns;
    
    return `# Collaboration Network Analysis

## Network Overview

- **${organizationConnections.size} organizations** involved in project partnerships
- **${peopleConnections.size} individuals** contributing across multiple projects  
- **${projectCollaborations.size} projects** with documented cross-project relationships

## Key Network Hubs

### Most Connected Organizations
${Array.from(organizationConnections.entries())
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 10)
  .map(([orgId, projects]) => `- **Organization ${orgId}**: Connected to ${projects.length} projects`)
  .join('\n')}

### Most Active Collaborators  
${Array.from(peopleConnections.entries())
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 10)
  .map(([person, projects]) => `- **${person}**: Involved in ${projects.length} projects`)
  .join('\n')}

## Collaboration Patterns

The network analysis reveals a highly interconnected ecosystem where:
1. **Multi-project contributors** provide continuity and knowledge sharing
2. **Organization partnerships** create resource pooling and mutual support
3. **Cross-project relationships** enable learning and replication

## Network Visualization Recommendations

1. **Interactive Network Map**: Show connections between projects, people, and organizations
2. **Collaboration Stories**: Highlight successful partnership examples
3. **Knowledge Flow**: Visualize how innovations spread through the network
4. **Mutual Support**: Show how projects support each other's success

This interconnected approach demonstrates ACT's "field tending" philosophy - creating conditions for organic collaboration and mutual support rather than top-down coordination.
`;
  }

  /**
   * Helper methods for report generation
   */
  getProjectValuesAlignment(project) {
    const alignedValues = [];
    this.analysisResults.valueAlignment.forEach((projects, value) => {
      if (projects.some(p => p.project.id === project.id)) {
        alignedValues.push(value.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
      }
    });
    return alignedValues.length > 0 ? alignedValues.join(', ') : 'Not specifically aligned';
  }

  getVisualPotential(project) {
    const visual = this.analysisResults.visualOpportunities.find(v => v.project.id === project.id);
    return visual ? `High (${visual.visualScore}/10)` : 'Standard';
  }

  getMultiValueProjects() {
    const multiValueProjects = [];
    
    this.analysisResults.projectData.forEach(project => {
      const alignedValues = [];
      let totalAlignmentScore = 0;
      
      this.analysisResults.valueAlignment.forEach((projects, value) => {
        const alignment = projects.find(p => p.project.id === project.id);
        if (alignment) {
          alignedValues.push(value);
          totalAlignmentScore += alignment.alignmentScore;
        }
      });
      
      if (alignedValues.length >= 2) {
        multiValueProjects.push({
          ...project,
          alignedValues: alignedValues.map(v => v.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())),
          totalAlignmentScore
        });
      }
    });
    
    return multiValueProjects.sort((a, b) => b.totalAlignmentScore - a.totalAlignmentScore);
  }

  getVisualRecommendations(opportunity) {
    const recommendations = [];
    
    opportunity.indicators.forEach(indicator => {
      switch (indicator.category) {
        case 'Photos/Documentation':
          recommendations.push('📸 Capture community members actively participating');
          break;
        case 'Video Potential':
          recommendations.push('🎥 Create testimonial videos with community impact stories');
          break;
        case 'Interactive Elements':
          recommendations.push('💻 Develop interactive demos or virtual tours');
          break;
        case 'Community Events':
          recommendations.push('🎉 Document community gatherings and celebrations');
          break;
        case 'Success Stories':
          recommendations.push('⭐ Highlight transformation narratives with before/after content');
          break;
      }
    });
    
    return recommendations.slice(0, 3).join('\n');
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new ACTProjectShowcaseAnalyzer();
  analyzer.runAnalysis().catch(console.error);
}

module.exports = ACTProjectShowcaseAnalyzer;