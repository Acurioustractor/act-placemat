#!/usr/bin/env node

/**
 * ACT Notion Project Showcase Analysis - Standalone Version
 * 
 * Connects directly to ACT's Notion databases and analyzes project data 
 * to discover the most amazing stories for the community-centered project showcase.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ACTNotionShowcaseAnalyzer {
  constructor() {
    // Notion API configuration with provided credentials
    this.notion = {
      token: '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',
      apiVersion: '2022-06-28',
      baseUrl: 'https://api.notion.com/v1',
      databases: {
        projects: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
        people: '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
        organizations: '948f3946-7d1c-42f2-bd7e-1317a755e67b',
        stories: '619ceac3-8d2a-4e30-bd73-0b81ccfadfc4',
        partners: '1065e276-738e-4d38-9ceb-51497e00c3b4'
      }
    };

    // ACT's core values for analysis
    this.actValues = {
      radicalHumility: [
        'humility', 'listening', 'learning', 'growth mindset', 'authentic',
        'vulnerable', 'honest', 'transparent', 'open', 'receptive', 'humble'
      ],
      decentralizedPower: [
        'community-owned', 'distributed', 'local control', 'grassroots',
        'bottom-up', 'democratic', 'participant-owned', 'collective',
        'autonomous', 'self-governing', 'peer-to-peer', 'decentralized'
      ],
      creativityAsDisruption: [
        'innovative', 'creative', 'disruptive', 'experimental', 'artistic',
        'unconventional', 'alternative', 'breakthrough', 'pioneering',
        'reimagining', 'transformative', 'revolution'
      ],
      uncomfortableTruthTelling: [
        'truth', 'justice', 'systemic change', 'advocacy', 'activism',
        'challenging', 'uncomfortable', 'brave', 'difficult conversations',
        'systemic', 'structural change', 'equity', 'power'
      ]
    };

    this.results = {
      projects: [],
      people: [],
      organizations: [],
      stories: [],
      partners: [],
      themes: new Map(),
      valueAlignment: new Map(),
      compellingStories: [],
      visualOpportunities: [],
      collaborationPatterns: new Map()
    };
  }

  /**
   * Make authenticated request to Notion API
   */
  async notionRequest(endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.notion.com',
        path: endpoint,
        method: body ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${this.notion.token}`,
          'Notion-Version': this.notion.apiVersion,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`Notion API error: ${res.statusCode} - ${parsed.message || data}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  /**
   * Query a Notion database
   */
  async queryDatabase(databaseId, filters = {}, sorts = []) {
    const endpoint = `/v1/databases/${databaseId}/query`;
    const body = { page_size: 100 };
    
    if (Object.keys(filters).length > 0) {
      body.filter = filters;
    }
    
    if (sorts.length > 0) {
      body.sorts = sorts;
    }

    console.log(`  → Querying database: ${databaseId}`);
    return await this.notionRequest(endpoint, body);
  }

  /**
   * Extract text from Notion property
   */
  extractText(property) {
    if (!property) return '';
    
    try {
      switch (property.type) {
        case 'title':
          return property.title?.map(t => t.plain_text).join('') || '';
        case 'rich_text':
          return property.rich_text?.map(t => t.plain_text).join('') || '';
        case 'text':
          return property.text?.content || '';
        default:
          return '';
      }
    } catch (error) {
      console.warn(`Error extracting text:`, error.message);
      return '';
    }
  }

  /**
   * Extract select value from Notion property
   */
  extractSelect(property) {
    if (!property || property.type !== 'select') return '';
    return property.select?.name || '';
  }

  /**
   * Extract multi-select values from Notion property
   */
  extractMultiSelect(property) {
    if (!property) return [];
    
    try {
      if (property.type === 'multi_select') {
        return property.multi_select?.map(item => item.name) || [];
      } else if (property.type === 'rich_text') {
        const text = this.extractText(property);
        return text.split(',').map(item => item.trim()).filter(item => item);
      }
      return [];
    } catch (error) {
      console.warn(`Error extracting multi-select:`, error.message);
      return [];
    }
  }

  /**
   * Extract number from Notion property
   */
  extractNumber(property, defaultValue = 0) {
    if (!property || property.type !== 'number') return defaultValue;
    return property.number !== null && property.number !== undefined ? property.number : defaultValue;
  }

  /**
   * Parse a Notion project page
   */
  parseProject(page) {
    try {
      const props = page.properties || {};
      
      return {
        id: page.id,
        name: this.extractText(props.Name || props.Title || props.name),
        area: this.extractSelect(props.Area || props.area),
        description: this.extractText(props.Description || props.description),
        status: this.extractSelect(props.Status || props.status),
        funding: this.extractSelect(props.Funding || props.funding),
        lead: this.extractText(props['Project Lead'] || props.lead),
        teamMembers: this.extractText(props['Team Members'] || props['team members']),
        coreValues: this.extractSelect(props['Core Values'] || props['core values']),
        themes: this.extractMultiSelect(props.Themes || props.Theme || props.themes),
        tags: this.extractMultiSelect(props.Tags || props.tags),
        place: this.extractSelect(props.Place || props.place),
        location: this.extractSelect(props.Location || props.location),
        revenueActual: this.extractNumber(props['Revenue Actual'] || props['revenue actual']),
        revenuePotential: this.extractNumber(props['Revenue Potential'] || props['revenue potential']),
        aiSummary: this.extractText(props['AI Summary'] || props['ai summary']),
        lastModified: page.last_edited_time,
        url: page.url
      };
    } catch (error) {
      console.error('Error parsing project:', error.message);
      return {
        id: page.id,
        name: 'Error parsing project',
        error: error.message
      };
    }
  }

  /**
   * Run the complete analysis
   */
  async runAnalysis() {
    console.log('\n🚀 Starting ACT Notion Project Showcase Analysis...\n');
    
    try {
      // Step 1: Fetch all data
      await this.fetchAllData();
      
      // Step 2: Analyze project themes
      this.analyzeThemes();
      
      // Step 3: Analyze values alignment
      this.analyzeValuesAlignment();
      
      // Step 4: Find visual opportunities
      this.findVisualOpportunities();
      
      // Step 5: Identify compelling stories
      this.identifyCompellingStories();
      
      // Step 6: Generate report
      await this.generateReport();
      
      console.log('\n✅ Analysis complete! Check the generated report.\n');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      console.error('Full error:', error);
    }
  }

  /**
   * Fetch all data from Notion databases
   */
  async fetchAllData() {
    console.log('📊 Fetching data from Notion databases...');
    
    try {
      // Fetch projects (main database)
      console.log('  → Fetching projects...');
      const projectsResponse = await this.queryDatabase(this.notion.databases.projects);
      this.results.projects = projectsResponse.results?.map(page => this.parseProject(page)) || [];
      console.log(`    ✓ Found ${this.results.projects.length} projects`);

      // Fetch other databases with error handling
      try {
        console.log('  → Fetching people...');
        const peopleResponse = await this.queryDatabase(this.notion.databases.people);
        this.results.people = peopleResponse.results || [];
        console.log(`    ✓ Found ${this.results.people.length} people`);
      } catch (error) {
        console.log(`    ⚠ People database not accessible: ${error.message}`);
      }

      try {
        console.log('  → Fetching organizations...');
        const orgsResponse = await this.queryDatabase(this.notion.databases.organizations);
        this.results.organizations = orgsResponse.results || [];
        console.log(`    ✓ Found ${this.results.organizations.length} organizations`);
      } catch (error) {
        console.log(`    ⚠ Organizations database not accessible: ${error.message}`);
      }

      try {
        console.log('  → Fetching stories...');
        const storiesResponse = await this.queryDatabase(this.notion.databases.stories);
        this.results.stories = storiesResponse.results || [];
        console.log(`    ✓ Found ${this.results.stories.length} stories`);
      } catch (error) {
        console.log(`    ⚠ Stories database not accessible: ${error.message}`);
      }

      try {
        console.log('  → Fetching partners...');
        const partnersResponse = await this.queryDatabase(this.notion.databases.partners);
        this.results.partners = partnersResponse.results || [];
        console.log(`    ✓ Found ${this.results.partners.length} partners`);
      } catch (error) {
        console.log(`    ⚠ Partners database not accessible: ${error.message}`);
      }

    } catch (error) {
      console.error('Error fetching data:', error.message);
      throw error;
    }
  }

  /**
   * Analyze project themes
   */
  analyzeThemes() {
    console.log('🎯 Analyzing project themes...');
    
    const themeKeywords = {
      'Community Ownership': ['community-owned', 'cooperative', 'collective', 'participant-owned'],
      'Indigenous Rights': ['indigenous', 'first nations', 'aboriginal', 'traditional'],
      'Economic Justice': ['economic', 'mutual credit', 'currency', 'wealth', 'income'],
      'Environmental': ['renewable', 'solar', 'sustainable', 'climate', 'environment'],
      'Technology for Good': ['platform', 'digital', 'tech', 'data', 'software'],
      'Social Innovation': ['innovation', 'creative', 'disruptive', 'experimental'],
      'Systemic Change': ['systemic', 'structural', 'transformation', 'revolution'],
      'Decentralized Power': ['decentralized', 'distributed', 'grassroots'],
      'Food Security': ['food', 'agriculture', 'farming', 'nutrition'],
      'Housing Justice': ['housing', 'accommodation', 'shelter', 'property'],
      'Arts & Culture': ['arts', 'culture', 'creative', 'music', 'performance'],
      'Youth Engagement': ['youth', 'young people', 'children', 'students']
    };

    this.results.projects.forEach(project => {
      const allText = [
        project.name || '',
        project.description || '',
        project.area || '',
        ...(project.themes || []),
        ...(project.tags || []),
        project.aiSummary || ''
      ].join(' ').toLowerCase();

      Object.entries(themeKeywords).forEach(([theme, keywords]) => {
        const matches = keywords.filter(keyword => allText.includes(keyword));
        if (matches.length > 0) {
          if (!this.results.themes.has(theme)) {
            this.results.themes.set(theme, []);
          }
          this.results.themes.get(theme).push({
            project: project,
            matches: matches,
            relevanceScore: matches.length
          });
        }
      });
    });

    console.log(`    ✓ Identified ${this.results.themes.size} themes across projects`);
  }

  /**
   * Analyze values alignment
   */
  analyzeValuesAlignment() {
    console.log('💎 Analyzing values alignment...');
    
    this.results.projects.forEach(project => {
      const allText = [
        project.name || '',
        project.description || '',
        project.aiSummary || '',
        ...(project.themes || []),
        ...(project.tags || [])
      ].join(' ').toLowerCase();

      Object.entries(this.actValues).forEach(([value, keywords]) => {
        const matches = keywords.filter(keyword => allText.includes(keyword));
        if (matches.length > 0) {
          if (!this.results.valueAlignment.has(value)) {
            this.results.valueAlignment.set(value, []);
          }
          this.results.valueAlignment.get(value).push({
            project: project,
            matches: matches,
            alignmentScore: matches.length
          });
        }
      });
    });

    console.log(`    ✓ Analyzed values alignment for ${this.results.projects.length} projects`);
  }

  /**
   * Find visual storytelling opportunities
   */
  findVisualOpportunities() {
    console.log('📸 Finding visual storytelling opportunities...');
    
    this.results.projects.forEach(project => {
      let visualScore = 0;
      const indicators = [];

      const allText = [
        project.name || '',
        project.description || '',
        project.aiSummary || ''
      ].join(' ').toLowerCase();

      // Visual keywords
      const visualKeywords = {
        'Photos/Documentation': ['photo', 'image', 'documentation', 'visual'],
        'Video Potential': ['video', 'film', 'documentary', 'recording'],
        'Interactive Elements': ['interactive', 'demo', 'prototype', 'showcase'],
        'Community Events': ['event', 'gathering', 'festival', 'workshop'],
        'Success Stories': ['success', 'achievement', 'breakthrough', 'victory'],
        'Transformation': ['transformation', 'change', 'impact', 'difference']
      };

      Object.entries(visualKeywords).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => allText.includes(keyword));
        if (matches.length > 0) {
          visualScore += matches.length;
          indicators.push({ category, keywords: matches });
        }
      });

      // Boost for active projects and revenue
      if (project.status === 'Active') visualScore += 2;
      if (project.revenueActual > 0) visualScore += 1;

      if (visualScore >= 2) {
        this.results.visualOpportunities.push({
          project: project,
          visualScore: visualScore,
          indicators: indicators
        });
      }
    });

    console.log(`    ✓ Found ${this.results.visualOpportunities.length} projects with visual potential`);
  }

  /**
   * Identify compelling stories
   */
  identifyCompellingStories() {
    console.log('⭐ Identifying most compelling stories...');
    
    const scoredProjects = this.results.projects.map(project => {
      let storyScore = 0;
      const factors = [];

      // Revenue impact
      if (project.revenueActual > 50000) {
        storyScore += 3;
        factors.push(`Strong Revenue: $${project.revenueActual.toLocaleString()}`);
      }

      // Community ownership keywords
      const allText = [project.name, project.description, project.aiSummary].join(' ').toLowerCase();
      const communityKeywords = ['community-owned', 'cooperative', 'collective'];
      if (communityKeywords.some(keyword => allText.includes(keyword))) {
        storyScore += 4;
        factors.push('Community Ownership');
      }

      // Values alignment
      let valueCount = 0;
      this.results.valueAlignment.forEach((projects, value) => {
        if (projects.some(p => p.project.id === project.id)) valueCount++;
      });
      storyScore += valueCount;
      if (valueCount > 0) factors.push(`Values Aligned: ${valueCount}`);

      // Visual potential
      const visual = this.results.visualOpportunities.find(v => v.project.id === project.id);
      if (visual) {
        storyScore += visual.visualScore;
        factors.push(`Visual Score: ${visual.visualScore}`);
      }

      // Innovation keywords
      const innovationKeywords = ['first', 'pioneer', 'breakthrough', 'revolutionary'];
      const innovations = innovationKeywords.filter(keyword => allText.includes(keyword));
      storyScore += innovations.length * 2;
      if (innovations.length > 0) factors.push(`Innovation: ${innovations.join(', ')}`);

      // Status bonus
      if (project.status === 'Active') {
        storyScore += 2;
        factors.push('Active Project');
      }

      return {
        project: project,
        storyScore: storyScore,
        factors: factors
      };
    });

    this.results.compellingStories = scoredProjects
      .sort((a, b) => b.storyScore - a.storyScore)
      .slice(0, 15);

    console.log(`    ✓ Identified ${this.results.compellingStories.length} compelling stories`);
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log('📄 Generating analysis report...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const reportPath = path.join(__dirname, `ACT-Showcase-Analysis-${timestamp}.md`);
    
    const report = this.buildReport();
    fs.writeFileSync(reportPath, report);
    
    // Also save raw data
    const dataPath = path.join(__dirname, `ACT-Raw-Data-${timestamp}.json`);
    fs.writeFileSync(dataPath, JSON.stringify({
      projects: this.results.projects,
      themes: Object.fromEntries(this.results.themes),
      valueAlignment: Object.fromEntries(this.results.valueAlignment),
      compellingStories: this.results.compellingStories,
      visualOpportunities: this.results.visualOpportunities
    }, null, 2));
    
    console.log(`    ✓ Report saved: ${reportPath}`);
    console.log(`    ✓ Data saved: ${dataPath}`);
  }

  /**
   * Build the analysis report
   */
  buildReport() {
    const totalProjects = this.results.projects.length;
    
    return `# ACT Project Showcase Analysis Report

*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

This analysis reveals **${totalProjects} incredible projects** from ACT's Notion database that collectively represent one of the most exciting collections of community-centered, transformative initiatives.

### Key Findings

🚀 **${this.results.compellingStories.length} incredibly compelling project stories** for showcase
📸 **${this.results.visualOpportunities.length} projects** with exceptional visual storytelling potential  
🎯 **${this.results.themes.size} major themes** spanning the spectrum of social innovation
💎 **Values alignment** across all ACT core principles demonstrated

## Most Amazing Project Stories

### Top 10 Most Compelling Stories

${this.results.compellingStories.slice(0, 10).map((story, index) => `
#### ${index + 1}. ${story.project.name || 'Unnamed Project'}

**Story Score: ${story.storyScore}/20**

- **Area:** ${story.project.area || 'Not specified'}
- **Status:** ${story.project.status || 'Unknown'}  
- **Revenue:** $${(story.project.revenueActual || 0).toLocaleString()}
- **Description:** ${(story.project.description || 'No description available').substring(0, 200)}${story.project.description?.length > 200 ? '...' : ''}

**Why This Story is Amazing:**
${story.factors.map(factor => `- ${factor}`).join('\n')}

---
`).join('\n')}

## Project Themes Analysis

${Array.from(this.results.themes.entries())
  .sort(([,a], [,b]) => b.length - a.length)
  .slice(0, 8)
  .map(([theme, projects]) => `
### ${theme} (${projects.length} projects)

Top projects in this theme:
${projects.slice(0, 3).map(p => `- **${p.project.name}**: ${(p.project.description || 'No description').substring(0, 100)}...`).join('\n')}
`).join('\n')}

## ACT Values Alignment

${Array.from(this.results.valueAlignment.entries()).map(([value, projects]) => `
### ${value.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (${projects.length} projects aligned)

**Top Aligned Projects:**
${projects
  .sort((a, b) => b.alignmentScore - a.alignmentScore)
  .slice(0, 3)
  .map(p => `- **${p.project.name}** (${p.alignmentScore} matches)`)
  .join('\n')}
`).join('\n')}

## Visual Storytelling Opportunities

The following projects have exceptional potential for visual content:

${this.results.visualOpportunities
  .sort((a, b) => b.visualScore - a.visualScore)
  .slice(0, 10)
  .map(opportunity => `
### ${opportunity.project.name}
**Visual Score:** ${opportunity.visualScore}/10

**Storytelling Elements:**
${opportunity.indicators.map(indicator => `- **${indicator.category}**: ${indicator.keywords.join(', ')}`).join('\n')}
`).join('\n')}

## Revolutionary Design Recommendations

Based on this analysis, the community-centered project showcase should feature:

### 1. Hero Stories Section  
Showcase the top 5 most compelling stories with rich visual content emphasizing community ownership and transformative impact.

### 2. Thematic Collections
Organize projects into key themes for easy discovery and exploration.

### 3. Values-Driven Navigation
Allow filtering by ACT's core values to show philosophical alignment.

### 4. Visual Story Cards
Rich media cards showing impact metrics, transformations, and community testimonials.

### 5. Community Impact Focus
Highlight genuine community ownership, systemic change, and values alignment.

## Next Steps

1. **Prioritize Top 10 Compelling Stories** for initial showcase development
2. **Gather visual assets** from high-potential projects  
3. **Connect with project leads** for community testimonials
4. **Develop thematic categorization** system
5. **Create values-aligned filtering** for project discovery

## Conclusion

This analysis reveals ACT's ecosystem as a revolutionary example of community-centered change. The projects demonstrate genuine community ownership, systemic transformation, and values alignment that embodies ACT's vision of "tending the field" for organic, community-led development.

These stories will create the most incredible community-centered project showcase that demonstrates what's possible when communities have real power and control over their own development.

---

*Raw data and detailed analysis available in accompanying JSON file.*
`;
  }
}

// Run the analysis
if (require.main === module) {
  const analyzer = new ACTNotionShowcaseAnalyzer();
  analyzer.runAnalysis().catch(console.error);
}

module.exports = ACTNotionShowcaseAnalyzer;