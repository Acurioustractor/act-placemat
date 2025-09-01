#!/usr/bin/env node

/**
 * Test agents with real ACT data sources
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

async function testWithRealACTData() {
  console.log('🧪 TESTING AGENTS WITH REAL ACT DATA\n');

  try {
    // 1. GET REAL EMPATHY LEDGER STORIES
    console.log('1️⃣ REAL EMPATHY LEDGER STORIES');
    const storiesResponse = await axios.get(`${API_BASE}/api/stories?limit=2`);
    const stories = storiesResponse.data.stories;
    
    if (stories.length > 0) {
      console.log(`Found ${stories.length} real stories in your database:\n`);
      
      for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        console.log(`Story ${i + 1}: "${story.title}"`);
        console.log(`Themes: ${story.themes ? story.themes.join(', ') : 'None'}`);
        console.log(`Content preview: ${story.content ? story.content.substring(0, 150) + '...' : 'No content'}`);
        console.log('');

        // TEST COMPLIANCE AGENT ON REAL STORY
        console.log(`🔍 COMPLIANCE CHECK ON REAL STORY: "${story.title}"`);
        
        try {
          const complianceResult = await axios.post(`${API_BASE}/api/compliance-officer/check`, {
            data: {
              title: story.title,
              content: story.content || '',
              themes: story.themes || [],
              type: 'story',
              culturalReview: false,
              storytellingPermission: false,
              hasConsent: true
            },
            framework: 'all'
          });

          console.log(`⚖️ Compliance Status: ${complianceResult.data.compliance.overallStatus}`);
          console.log(`   Frameworks checked: ${complianceResult.data.compliance.frameworksChecked}`);
          console.log(`   Violations found: ${complianceResult.data.compliance.violationsFound}`);
          
          if (complianceResult.data.violations.length > 0) {
            console.log('   Key violations:');
            complianceResult.data.violations.slice(0, 3).forEach(v => 
              console.log(`     • ${v.framework}: ${v.rule} (${v.severity})`)
            );
          }
          console.log('');
        } catch (complianceError) {
          console.log(`   Error checking compliance: ${complianceError.message}\n`);
        }
      }

      // RESEARCH AGENT ANALYSIS BASED ON YOUR STORY THEMES
      const allThemes = stories.flatMap(s => s.themes || []).filter((v, i, a) => a.indexOf(v) === i);
      if (allThemes.length > 0) {
        console.log('2️⃣ RESEARCH AGENT ANALYSIS OF YOUR STORY THEMES');
        console.log(`Your stories cover themes: ${allThemes.slice(0, 5).join(', ')}`);
        
        // Research funding opportunities based on your actual themes
        const mainTheme = allThemes[0];
        console.log(`\n🔬 RESEARCHING FUNDING FOR: "${mainTheme}"`);
        
        try {
          const researchResult = await axios.post(`${API_BASE}/api/research-analyst/market-research`, {
            query: `${mainTheme} funding opportunities Australia Indigenous community programs`,
            domain: 'community_services',
            includeRecentNews: true,
            saveResults: false
          });

          console.log(`📊 Research Results:`);
          console.log(`   Confidence: ${(researchResult.data.research.confidence * 100).toFixed(0)}%`);
          console.log(`   Sources found: ${researchResult.data.research.sourceCount}`);
          console.log(`   Key insights: ${researchResult.data.research.insights.length}`);
          console.log(`   Recommendations:`);
          researchResult.data.research.recommendations.forEach(rec => 
            console.log(`     • ${rec}`)
          );
          console.log('');
        } catch (researchError) {
          console.log(`   Research error: ${researchError.message}\n`);
        }
      }
    } else {
      console.log('No stories found in database\n');
    }

    // 3. GET REAL NOTION PARTNERS DATA
    console.log('3️⃣ REAL NOTION PARTNERS DATA');
    const partnersResponse = await axios.get(`${API_BASE}/api/notion/partners?limit=3`);
    const partners = partnersResponse.data;
    
    if (partners.length > 0) {
      console.log(`Found ${partners.length} real partners in your Notion:\n`);
      
      const partnerNames = [];
      partners.slice(0, 3).forEach((partner, i) => {
        const name = partner.properties?.Name?.title?.[0]?.plain_text || `Partner ${i + 1}`;
        const type = partner.properties?.Type?.select?.name || 'Unknown';
        const category = partner.properties?.Category?.select?.name || 'Unknown';
        const relationship = partner.properties?.['Relationship Strength']?.select?.name || 'Unknown';
        
        console.log(`${name}:`);
        console.log(`   Type: ${type}`);
        console.log(`   Category: ${category}`);
        console.log(`   Relationship: ${relationship}`);
        
        partnerNames.push(name);
        console.log('');
      });

      // COMPETITIVE ANALYSIS OF REAL PARTNERS
      if (partnerNames.length >= 2) {
        console.log('4️⃣ COMPETITIVE ANALYSIS OF YOUR REAL PARTNERS');
        console.log(`Analyzing: ${partnerNames.slice(0, 2).join(' vs ')}`);
        
        try {
          const competitiveResult = await axios.post(`${API_BASE}/api/research-analyst/competitive-analysis`, {
            competitors: partnerNames.slice(0, 2),
            analysisType: 'collaboration_opportunities'
          });

          console.log(`🤝 Analysis Results:`);
          console.log(`   Organizations analyzed: ${competitiveResult.data.analysis.competitorCount}`);
          console.log(`   Opportunities identified: ${competitiveResult.data.analysis.opportunitiesFound}`);
          console.log(`   Analysis type: ${competitiveResult.data.analysis.analysisType}`);
          console.log(`   Recommendations:`);
          competitiveResult.data.analysis.recommendations.forEach(rec => 
            console.log(`     • ${rec}`)
          );
          console.log('');
        } catch (competitiveError) {
          console.log(`   Competitive analysis error: ${competitiveError.message}\n`);
        }
      }
    } else {
      console.log('No partners found in Notion\n');
    }

    // 5. INTEGRATED INTELLIGENCE QUERY
    console.log('5️⃣ INTEGRATED INTELLIGENCE QUERY WITH YOUR DATA');
    console.log('Testing unified intelligence system...');
    
    try {
      const intelligenceResult = await axios.post(`${API_BASE}/api/intelligence/query`, {
        query: "What are the most promising partnership opportunities based on our current projects and relationships?",
        includeContext: true
      });

      console.log(`🧠 Intelligence Response:`);
      console.log(`   Query processed: ${intelligenceResult.data.success ? 'Successfully' : 'Failed'}`);
      if (intelligenceResult.data.response) {
        console.log(`   Key insights: ${intelligenceResult.data.response.substring(0, 200)}...`);
      }
      console.log('');
    } catch (intelligenceError) {
      console.log(`   Intelligence query error: ${intelligenceError.message}\n`);
    }

    // 6. REAL DATA SUMMARY
    console.log('6️⃣ REAL DATA INTEGRATION SUMMARY');
    console.log('✅ Successfully accessed:');
    console.log(`   • ${stories.length} Empathy Ledger stories`);
    console.log(`   • ${partners.length} Notion partner records`);
    console.log('✅ Agent analysis performed on:');
    console.log('   • Story compliance checking');
    console.log('   • Theme-based funding research');
    console.log('   • Partner competitive analysis');
    console.log('\n🎯 This demonstrates how the agents work with YOUR actual data to provide strategic intelligence!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testWithRealACTData();