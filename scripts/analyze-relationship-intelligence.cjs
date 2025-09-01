#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

class RelationshipIntelligenceAnalyzer {
  constructor() {
    // ACT project themes for relationship scoring
    this.projectThemes = [
      'justice', 'youth', 'indigenous', 'community', 'innovation', 'technology',
      'social impact', 'empathy', 'collaboration', 'sustainability', 'equity',
      'mental health', 'education', 'arts', 'culture', 'environment', 'policy'
    ];
    
    // Strategic organization types
    this.strategicOrgTypes = [
      'government', 'ngo', 'foundation', 'university', 'research',
      'aboriginal corporation', 'community organisation', 'justice',
      'youth service', 'health service', 'arts organisation'
    ];
  }

  async runCompleteAnalysis() {
    console.log('🧠 Starting Comprehensive Relationship Intelligence Analysis...');
    console.log('============================================================\n');

    try {
      // 1. Load LinkedIn contacts
      const contacts = await this.loadLinkedInContacts();
      
      // 2. Analyze each contact
      const analysisResults = await this.analyzeAllContacts(contacts);
      
      // 3. Generate strategic insights
      const strategicInsights = this.generateStrategicInsights(analysisResults);
      
      // 4. Update contacts with new intelligence
      await this.updateContactIntelligence(analysisResults);
      
      // 5. Generate comprehensive report
      const report = this.generateComprehensiveReport(analysisResults, strategicInsights);
      
      // 6. Save report
      await this.saveReport(report);
      
      console.log('✅ Relationship Intelligence Analysis Complete!');
      return report;

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }

  async loadLinkedInContacts() {
    console.log('📊 Loading LinkedIn contacts from Supabase...');
    
    return new Promise((resolve, reject) => {
      const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
      url.searchParams.append('select', '*');
      url.searchParams.append('limit', '20000');

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const contacts = JSON.parse(data);
            console.log(`✅ Loaded ${contacts.length} LinkedIn contacts`);
            resolve(contacts);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async analyzeAllContacts(contacts) {
    console.log(`🔍 Analyzing ${contacts.length} contacts for relationship intelligence...\n`);
    
    const analysisResults = [];
    let processedCount = 0;

    for (const contact of contacts) {
      const intelligence = this.analyzeContactRelationship(contact);
      analysisResults.push(intelligence);
      
      processedCount++;
      if (processedCount % 500 === 0) {
        console.log(`✅ Analyzed ${processedCount}/${contacts.length} contacts`);
      }
    }

    console.log(`✅ Analysis complete: ${analysisResults.length} contacts analyzed\n`);
    return analysisResults;
  }

  analyzeContactRelationship(contact) {
    const analysis = {
      id: contact.id,
      name: contact.full_name,
      currentScore: contact.relationship_score || 0,
      currentStrategicValue: contact.strategic_value || 'unknown',
      intelligence: {}
    };

    // 1. Position and Organization Intelligence
    analysis.intelligence.position = this.analyzePosition(contact);
    
    // 2. Project Alignment Analysis
    analysis.intelligence.alignment = this.analyzeProjectAlignment(contact);
    
    // 3. Network Effect Analysis
    analysis.intelligence.network = this.analyzeNetworkEffect(contact);
    
    // 4. Engagement Potential
    analysis.intelligence.engagement = this.analyzeEngagementPotential(contact);
    
    // 5. Cross-platform Presence Bonus
    analysis.intelligence.crossPlatform = this.analyzeCrossPlatformPresence(contact);

    // Calculate new relationship score
    analysis.newRelationshipScore = this.calculateRelationshipScore(analysis.intelligence);
    
    // Determine new strategic value
    analysis.newStrategicValue = this.determineStrategicValue(analysis.intelligence, analysis.newRelationshipScore);
    
    // Generate personalized recommendations
    analysis.recommendations = this.generateContactRecommendations(contact, analysis.intelligence);

    return analysis;
  }

  analyzePosition(contact) {
    const analysis = {
      score: 0,
      factors: [],
      organizationType: 'unknown',
      seniorityLevel: 'unknown',
      influenceIndicators: []
    };

    const position = (contact.current_position || '').toLowerCase();
    const company = (contact.current_company || '').toLowerCase();

    // Check for senior leadership positions
    const seniorTitles = ['ceo', 'chief executive', 'director', 'president', 'founder', 'chair', 'commissioner', 'minister', 'deputy', 'assistant minister'];
    const midTitles = ['manager', 'coordinator', 'lead', 'head', 'senior', 'principal'];

    if (seniorTitles.some(title => position.includes(title))) {
      analysis.score += 0.3;
      analysis.seniorityLevel = 'senior';
      analysis.factors.push('Senior leadership position');
    } else if (midTitles.some(title => position.includes(title))) {
      analysis.score += 0.15;
      analysis.seniorityLevel = 'mid';
      analysis.factors.push('Mid-level leadership position');
    }

    // Check for strategic organization types
    const orgKeywords = {
      'government': ['government', 'department', 'council', 'commission', 'authority', 'agency'],
      'ngo': ['foundation', 'institute', 'organisation', 'association', 'society', 'charity'],
      'indigenous': ['aboriginal', 'torres strait', 'indigenous', 'first nations', 'native'],
      'justice': ['justice', 'legal', 'court', 'law', 'police', 'corrections'],
      'youth': ['youth', 'young', 'children', 'kids', 'adolescent'],
      'health': ['health', 'medical', 'hospital', 'clinic', 'mental health'],
      'education': ['university', 'school', 'education', 'college', 'academy', 'institute'],
      'arts': ['arts', 'cultural', 'creative', 'museum', 'gallery', 'theatre']
    };

    for (const [type, keywords] of Object.entries(orgKeywords)) {
      if (keywords.some(keyword => company.includes(keyword) || position.includes(keyword))) {
        analysis.organizationType = type;
        
        // Special scoring for ACT-aligned organizations
        if (['indigenous', 'justice', 'youth', 'health', 'arts'].includes(type)) {
          analysis.score += 0.25;
          analysis.factors.push(`${type} sector alignment`);
        } else if (['government', 'ngo', 'education'].includes(type)) {
          analysis.score += 0.15;
          analysis.factors.push(`${type} sector relevance`);
        }
        break;
      }
    }

    // Check for influence indicators
    const influenceWords = ['national', 'state', 'federal', 'international', 'board', 'advisory', 'committee'];
    influenceWords.forEach(word => {
      if (position.includes(word) || company.includes(word)) {
        analysis.influenceIndicators.push(word);
        analysis.score += 0.05;
      }
    });

    return analysis;
  }

  analyzeProjectAlignment(contact) {
    const analysis = {
      score: 0,
      alignedThemes: [],
      relevantProjects: [],
      alignmentStrength: 'none'
    };

    const profileText = `${contact.current_position || ''} ${contact.current_company || ''}`.toLowerCase();

    // Check theme alignment
    this.projectThemes.forEach(theme => {
      if (profileText.includes(theme)) {
        analysis.alignedThemes.push(theme);
        analysis.score += 0.1;
      }
    });

    // Map to ACT projects
    const projectMappings = {
      'Justice Hub': ['justice', 'legal', 'court', 'police', 'corrections', 'crime'],
      'Empathy Ledger': ['mental health', 'wellbeing', 'therapy', 'counselling', 'support'],
      'PICC': ['indigenous', 'aboriginal', 'torres strait', 'first nations'],
      'Youth Programs': ['youth', 'young', 'children', 'adolescent', 'education'],
      'Community Development': ['community', 'development', 'social', 'outreach'],
      'Technology for Good': ['technology', 'digital', 'innovation', 'startup', 'tech']
    };

    for (const [project, keywords] of Object.entries(projectMappings)) {
      if (keywords.some(keyword => profileText.includes(keyword))) {
        analysis.relevantProjects.push(project);
        analysis.score += 0.15;
      }
    }

    // Determine alignment strength
    if (analysis.score >= 0.4) analysis.alignmentStrength = 'strong';
    else if (analysis.score >= 0.2) analysis.alignmentStrength = 'moderate';
    else if (analysis.score > 0) analysis.alignmentStrength = 'weak';

    return analysis;
  }

  analyzeNetworkEffect(contact) {
    const analysis = {
      score: 0,
      networkIndicators: [],
      connectivityPotential: 'low'
    };

    const position = (contact.current_position || '').toLowerCase();
    const company = (contact.current_company || '').toLowerCase();

    // High-connectivity positions
    const networkPositions = [
      'director', 'ceo', 'chair', 'president', 'coordinator', 'manager',
      'advisor', 'board', 'committee', 'commissioner', 'minister'
    ];

    networkPositions.forEach(pos => {
      if (position.includes(pos)) {
        analysis.networkIndicators.push(`${pos} position`);
        analysis.score += 0.1;
      }
    });

    // Network-rich organizations
    const networkOrgs = [
      'government', 'council', 'commission', 'association', 'society',
      'foundation', 'institute', 'university', 'chamber', 'alliance'
    ];

    networkOrgs.forEach(org => {
      if (company.includes(org)) {
        analysis.networkIndicators.push(`${org} organization`);
        analysis.score += 0.08;
      }
    });

    // Cross-referencing bonus (if they appear in multiple systems)
    if (contact.gmail_contact_id || contact.notion_person_id) {
      analysis.score += 0.15;
      analysis.networkIndicators.push('cross-platform presence');
    }

    // Determine connectivity potential
    if (analysis.score >= 0.3) analysis.connectivityPotential = 'high';
    else if (analysis.score >= 0.15) analysis.connectivityPotential = 'medium';

    return analysis;
  }

  analyzeEngagementPotential(contact) {
    const analysis = {
      score: 0,
      factors: [],
      engagementType: 'unknown',
      recommendedApproach: 'standard'
    };

    // Email availability bonus
    if (contact.email_address) {
      analysis.score += 0.2;
      analysis.factors.push('Email available');
    }

    // Recent connection bonus
    if (contact.connected_date) {
      const connectDate = new Date(contact.connected_date);
      const monthsAgo = (Date.now() - connectDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsAgo <= 6) {
        analysis.score += 0.15;
        analysis.factors.push('Recent connection');
      } else if (monthsAgo <= 12) {
        analysis.score += 0.1;
        analysis.factors.push('Connected within last year');
      }
    }

    // Data source analysis
    if (contact.data_source === 'ben') {
      analysis.score += 0.1;
      analysis.factors.push('Direct connection (Ben)');
      analysis.recommendedApproach = 'personal';
    } else if (contact.data_source === 'nic') {
      analysis.score += 0.08;
      analysis.factors.push('Network connection (Nic)');
      analysis.recommendedApproach = 'introduction';
    }

    // Determine engagement type
    if (analysis.score >= 0.4) analysis.engagementType = 'high-potential';
    else if (analysis.score >= 0.2) analysis.engagementType = 'moderate';
    else analysis.engagementType = 'low-touch';

    return analysis;
  }

  analyzeCrossPlatformPresence(contact) {
    const analysis = {
      score: 0,
      platforms: [],
      dataRichness: 'minimal'
    };

    // LinkedIn presence (baseline)
    analysis.platforms.push('LinkedIn');

    // Gmail presence
    if (contact.gmail_contact_id) {
      analysis.platforms.push('Gmail');
      analysis.score += 0.15;
    }

    // Notion presence
    if (contact.notion_person_id) {
      analysis.platforms.push('Notion');
      analysis.score += 0.2; // Notion presence indicates they're already in our system
    }

    // Data completeness scoring
    let dataFields = 0;
    if (contact.email_address) dataFields++;
    if (contact.current_company) dataFields++;
    if (contact.current_position) dataFields++;
    if (contact.location) dataFields++;

    analysis.score += (dataFields / 4) * 0.1; // Up to 0.1 bonus for complete data

    // Determine data richness
    if (analysis.platforms.length >= 3) analysis.dataRichness = 'rich';
    else if (analysis.platforms.length >= 2) analysis.dataRichness = 'moderate';

    return analysis;
  }

  calculateRelationshipScore(intelligence) {
    let totalScore = 0.5; // Base score

    // Weight the different intelligence factors
    totalScore += intelligence.position.score * 0.3;      // 30% weight
    totalScore += intelligence.alignment.score * 0.25;    // 25% weight
    totalScore += intelligence.network.score * 0.2;       // 20% weight
    totalScore += intelligence.engagement.score * 0.15;   // 15% weight
    totalScore += intelligence.crossPlatform.score * 0.1; // 10% weight

    // Ensure score stays within bounds
    return Math.min(Math.max(totalScore, 0), 1);
  }

  determineStrategicValue(intelligence, relationshipScore) {
    // High value criteria
    if (relationshipScore >= 0.8 || 
        intelligence.position.seniorityLevel === 'senior' ||
        intelligence.alignment.alignmentStrength === 'strong' ||
        intelligence.network.connectivityPotential === 'high') {
      return 'high';
    }

    // Medium value criteria
    if (relationshipScore >= 0.6 ||
        intelligence.position.seniorityLevel === 'mid' ||
        intelligence.alignment.alignmentStrength === 'moderate' ||
        intelligence.network.connectivityPotential === 'medium') {
      return 'medium';
    }

    // Low value (but still tracked)
    if (relationshipScore >= 0.3 ||
        intelligence.alignment.alignmentStrength !== 'none' ||
        intelligence.engagement.engagementType !== 'low-touch') {
      return 'low';
    }

    return 'unknown';
  }

  generateContactRecommendations(contact, intelligence) {
    const recommendations = [];

    // Engagement recommendations
    if (intelligence.engagement.recommendedApproach === 'personal') {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        action: `Direct personal outreach to ${contact.first_name}`,
        reasoning: 'Direct connection through Ben - personal approach recommended'
      });
    } else if (intelligence.engagement.recommendedApproach === 'introduction') {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        action: `Request introduction through Nic`,
        reasoning: 'Connected through Nic\'s network - warm introduction preferred'
      });
    }

    // Project alignment recommendations
    if (intelligence.alignment.relevantProjects.length > 0) {
      recommendations.push({
        type: 'project_collaboration',
        priority: 'high',
        action: `Explore collaboration on ${intelligence.alignment.relevantProjects[0]}`,
        reasoning: `Strong alignment with ${intelligence.alignment.relevantProjects.join(', ')}`
      });
    }

    // Network expansion recommendations
    if (intelligence.network.connectivityPotential === 'high') {
      recommendations.push({
        type: 'networking',
        priority: 'medium',
        action: 'Leverage for network expansion',
        reasoning: `${intelligence.network.networkIndicators.join(', ')} indicates strong network access`
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  generateStrategicInsights(analysisResults) {
    console.log('🎯 Generating strategic insights...\n');
    
    const insights = {
      summary: {
        totalAnalyzed: analysisResults.length,
        highValue: 0,
        mediumValue: 0,
        lowValue: 0,
        averageScore: 0
      },
      topOpportunities: [],
      sectorBreakdown: {},
      actionablePriorities: []
    };

    // Calculate summary statistics
    let totalScore = 0;
    analysisResults.forEach(analysis => {
      totalScore += analysis.newRelationshipScore;
      
      switch (analysis.newStrategicValue) {
        case 'high': insights.summary.highValue++; break;
        case 'medium': insights.summary.mediumValue++; break;
        case 'low': insights.summary.lowValue++; break;
      }
    });

    insights.summary.averageScore = totalScore / analysisResults.length;

    // Identify top opportunities
    insights.topOpportunities = analysisResults
      .filter(a => a.newStrategicValue === 'high')
      .sort((a, b) => b.newRelationshipScore - a.newRelationshipScore)
      .slice(0, 15)
      .map(a => ({
        name: a.name,
        score: Math.round(a.newRelationshipScore * 100),
        organization: a.intelligence.position.organizationType,
        projects: a.intelligence.alignment.relevantProjects,
        recommendations: a.recommendations.filter(r => r.priority === 'high')
      }));

    // Sector breakdown
    analysisResults.forEach(analysis => {
      const sector = analysis.intelligence.position.organizationType;
      if (!insights.sectorBreakdown[sector]) {
        insights.sectorBreakdown[sector] = { count: 0, highValue: 0, averageScore: 0 };
      }
      insights.sectorBreakdown[sector].count++;
      insights.sectorBreakdown[sector].averageScore += analysis.newRelationshipScore;
      if (analysis.newStrategicValue === 'high') {
        insights.sectorBreakdown[sector].highValue++;
      }
    });

    // Calculate average scores for sectors
    Object.keys(insights.sectorBreakdown).forEach(sector => {
      insights.sectorBreakdown[sector].averageScore /= insights.sectorBreakdown[sector].count;
      insights.sectorBreakdown[sector].averageScore = Math.round(insights.sectorBreakdown[sector].averageScore * 100);
    });

    return insights;
  }

  async updateContactIntelligence(analysisResults) {
    console.log('📝 Updating contact intelligence in Supabase...\n');
    
    const batchSize = 50;
    let updateCount = 0;

    for (let i = 0; i < analysisResults.length; i += batchSize) {
      const batch = analysisResults.slice(i, i + batchSize);
      
      const updatePromises = batch.map(analysis => this.updateSingleContact(analysis));

      try {
        await Promise.all(updatePromises);
        updateCount += batch.length;
        console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}: ${updateCount}/${analysisResults.length} contacts`);
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Intelligence update complete: ${updateCount} contacts updated\n`);
  }

  async updateSingleContact(analysis) {
    return new Promise((resolve, reject) => {
      const updateData = {
        relationship_score: analysis.newRelationshipScore,
        strategic_value: analysis.newStrategicValue,
        raw_data: {
          intelligence: analysis.intelligence,
          recommendations: analysis.recommendations,
          last_intelligence_update: new Date().toISOString()
        }
      };

      const url = new URL(`${SUPABASE_URL}/rest/v1/linkedin_contacts`);
      url.searchParams.append('id', `eq.${analysis.id}`);

      const postData = JSON.stringify(updateData);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  generateComprehensiveReport(analysisResults, strategicInsights) {
    console.log('📊 Generating comprehensive relationship intelligence report...\n');
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        ...strategicInsights.summary,
        analysisVersion: '2.0',
        dataSource: 'LinkedIn + Cross-platform Intelligence'
      },
      strategicOpportunities: strategicInsights.topOpportunities,
      sectorAnalysis: strategicInsights.sectorBreakdown,
      networkHealth: {
        totalContacts: analysisResults.length,
        crossPlatformContacts: analysisResults.filter(a => a.intelligence.crossPlatform.platforms.length > 1).length,
        strategicAlignment: analysisResults.filter(a => a.intelligence.alignment.alignmentStrength !== 'none').length,
        engagementReady: analysisResults.filter(a => a.intelligence.engagement.engagementType !== 'low-touch').length
      },
      actionableInsights: this.generateActionableInsights(strategicInsights),
      topRecommendations: this.generateTopRecommendations(analysisResults),
      executiveSummary: this.generateExecutiveSummary(strategicInsights, analysisResults)
    };
  }

  generateActionableInsights(strategicInsights) {
    const insights = [];

    // High-value engagement opportunities
    if (strategicInsights.summary.highValue > 0) {
      insights.push({
        type: 'immediate_action',
        priority: 'high',
        title: `${strategicInsights.summary.highValue} High-Value Contacts Ready for Engagement`,
        description: 'Strategic contacts with strong alignment to ACT projects',
        action: 'Initiate personalized outreach within next 2 weeks',
        expectedOutcome: 'Partnership discussions, collaboration opportunities'
      });
    }

    // Sector-specific opportunities
    const strongSectors = Object.entries(strategicInsights.sectorBreakdown)
      .filter(([_, data]) => data.highValue > 0)
      .sort((a, b) => b[1].highValue - a[1].highValue);

    if (strongSectors.length > 0) {
      insights.push({
        type: 'sector_focus',
        priority: 'high',
        title: `Focus on ${strongSectors[0][0]} Sector`,
        description: `${strongSectors[0][1].highValue} high-value contacts in ${strongSectors[0][0]} sector`,
        action: 'Develop sector-specific engagement strategy',
        expectedOutcome: 'Sector leadership, policy influence'
      });
    }

    // Network expansion
    const mediumValue = strategicInsights.summary.mediumValue;
    if (mediumValue > 0) {
      insights.push({
        type: 'network_expansion',
        priority: 'medium',
        title: `${mediumValue} Medium-Value Contacts for Network Growth`,
        description: 'Contacts with good potential for network expansion',
        action: 'Gradual engagement through content sharing and events',
        expectedOutcome: 'Expanded network reach, new collaboration paths'
      });
    }

    return insights;
  }

  generateTopRecommendations(analysisResults) {
    const allRecommendations = [];
    
    analysisResults.forEach(analysis => {
      analysis.recommendations.forEach(rec => {
        allRecommendations.push({
          contact: analysis.name,
          contactId: analysis.id,
          ...rec,
          relationshipScore: Math.round(analysis.newRelationshipScore * 100),
          strategicValue: analysis.newStrategicValue
        });
      });
    });

    // Sort by priority and relationship score
    return allRecommendations
      .sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.relationshipScore - a.relationshipScore;
      })
      .slice(0, 20); // Top 20 recommendations
  }

  generateExecutiveSummary(strategicInsights, analysisResults) {
    const summary = strategicInsights.summary;
    const avgScore = Math.round(summary.averageScore * 100);
    
    return {
      overview: `Analyzed ${summary.totalAnalyzed} LinkedIn contacts with average relationship score of ${avgScore}%. ` +
               `Identified ${summary.highValue} high-value strategic contacts ready for immediate engagement.`,
      
      keyFindings: [
        `${summary.highValue} contacts (${Math.round((summary.highValue/summary.totalAnalyzed)*100)}%) classified as high strategic value`,
        `${summary.mediumValue} contacts show moderate alignment with ACT projects`,
        `Cross-platform presence detected for ${analysisResults.filter(a => a.intelligence.crossPlatform.platforms.length > 1).length} contacts`,
        `${analysisResults.filter(a => a.intelligence.alignment.alignmentStrength !== 'none').length} contacts show project alignment potential`
      ],
      
      immediateActions: [
        'Engage high-value contacts within 2 weeks',
        'Develop sector-specific engagement strategies',
        'Leverage cross-platform contacts for warm introductions',
        'Create targeted content for aligned themes'
      ],
      
      strategicImplications: [
        'Strong foundation for partnership development',
        'Opportunity for sector leadership positioning',
        'Significant network effect potential',
        'Cross-platform intelligence advantage'
      ]
    };
  }

  async saveReport(report) {
    const reportsDir = path.join(__dirname, '..', 'Docs', 'Analysis');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'relationship-intelligence-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Comprehensive report saved to: ${reportPath}`);
    return reportPath;
  }
}

async function main() {
  const analyzer = new RelationshipIntelligenceAnalyzer();
  
  try {
    const report = await analyzer.runCompleteAnalysis();
    
    console.log('\n============================================================');
    console.log('📊 RELATIONSHIP INTELLIGENCE ANALYSIS COMPLETE');
    console.log('============================================================\n');
    
    console.log('📈 Executive Summary:');
    console.log(`   ${report.executiveSummary.overview}\n`);
    
    console.log('🎯 Key Findings:');
    report.executiveSummary.keyFindings.forEach(finding => {
      console.log(`   • ${finding}`);
    });
    
    console.log('\n🚀 Immediate Actions:');
    report.executiveSummary.immediateActions.forEach(action => {
      console.log(`   • ${action}`);
    });
    
    console.log('\n💎 Top Strategic Opportunities:');
    report.strategicOpportunities.slice(0, 5).forEach((opp, index) => {
      console.log(`   ${index + 1}. ${opp.name} (${opp.score}% score)`);
      console.log(`      Organization: ${opp.organization}`);
      if (opp.projects.length > 0) {
        console.log(`      Relevant Projects: ${opp.projects.join(', ')}`);
      }
    });
    
    console.log('\n============================================================');
    console.log('✅ ANALYSIS COMPLETE - Data updated in Supabase');
    console.log('============================================================');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RelationshipIntelligenceAnalyzer;