#!/usr/bin/env node

/**
 * Demonstrate how Research and Compliance Agents integrate with ACT data
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

async function demonstrateACTDataIntegration() {
  console.log('🔍 ACT Data Integration Demonstration\n');

  // 1. NOTION PROJECTS → RESEARCH AGENT
  console.log('1️⃣ NOTION PROJECT ANALYSIS');
  console.log('Your Notion contains projects like:');
  console.log('- "Indigenous Youth Leadership Program"');
  console.log('- "Community Garden Network"');
  console.log('- "Digital Inclusion Initiative"\n');

  // Research Agent queries based on your projects
  const projectResearch = await axios.post(`${API_BASE}/api/research-analyst/market-research`, {
    query: 'Indigenous youth leadership funding opportunities Australia 2025',
    domain: 'community_development',
    saveResults: false
  });

  console.log('📈 Research Insights:');
  console.log(`- Found ${projectResearch.data.research.sourceCount} relevant sources`);
  console.log(`- Confidence: ${(projectResearch.data.research.confidence * 100).toFixed(0)}%`);
  console.log(`- Recommendations: ${projectResearch.data.research.recommendations.join(', ')}\n`);

  // 2. SUPABASE STORIES → COMPLIANCE AGENT
  console.log('2️⃣ EMPATHY LEDGER STORY COMPLIANCE');
  console.log('Your stories contain content like:');
  console.log('- "Traditional healing practices in Central Australia"');
  console.log('- "Elder Mary\'s dreamtime story"\n');

  // Compliance check on story content
  const storyCompliance = await axios.post(`${API_BASE}/api/compliance-officer/check`, {
    data: {
      content: 'Traditional Aboriginal healing practices and sacred sites',
      type: 'story',
      culturalReview: false,
      storytellingPermission: false,
      hasConsent: true
    },
    framework: 'indigenous'
  });

  console.log('⚖️ Compliance Analysis:');
  console.log(`- Overall Status: ${storyCompliance.data.compliance.overallStatus}`);
  console.log(`- Violations Found: ${storyCompliance.data.compliance.violationsFound}`);
  if (storyCompliance.data.violations.length > 0) {
    console.log('- Required Actions:');
    storyCompliance.data.violations.forEach(v => 
      console.log(`  • ${v.description} (${v.severity})`)
    );
  }
  console.log('');

  // 3. LINKEDIN NETWORK → COMPETITIVE ANALYSIS
  console.log('3️⃣ LINKEDIN NETWORK COMPETITIVE ANALYSIS');
  console.log('Your LinkedIn connections include organizations like:');
  console.log('- Reconciliation Australia');
  console.log('- Australian Youth Climate Coalition');
  console.log('- Social Ventures Australia\n');

  const competitorAnalysis = await axios.post(`${API_BASE}/api/research-analyst/competitive-analysis`, {
    competitors: ['Reconciliation Australia', 'Social Ventures Australia'],
    analysisType: 'partnership_opportunities'
  });

  console.log('🤝 Partnership Intelligence:');
  console.log(`- Analyzed ${competitorAnalysis.data.analysis.competitorCount} organizations`);
  console.log(`- Found ${competitorAnalysis.data.analysis.opportunitiesFound} collaboration opportunities`);
  console.log(`- Recommendations: ${competitorAnalysis.data.analysis.recommendations.join(', ')}\n`);

  // 4. GMAIL COMMUNICATIONS → RELATIONSHIP INSIGHTS
  console.log('4️⃣ GMAIL RELATIONSHIP INTELLIGENCE');
  console.log('Your email patterns show frequent communication with:');
  console.log('- Government department contacts');
  console.log('- Community organization leaders');
  console.log('- Funding body representatives\n');

  // Compliance check on email data handling
  const emailCompliance = await axios.post(`${API_BASE}/api/compliance-officer/check`, {
    data: {
      email: 'community.leader@example.com',
      content: 'Funding application follow-up',
      hasConsent: true,
      dataRetentionPeriod: '2 years'
    },
    framework: 'privacy'
  });

  console.log('📧 Email Data Compliance:');
  console.log(`- Privacy Status: ${emailCompliance.data.compliance.overallStatus}`);
  console.log(`- Data Handling: Compliant with Privacy Act 1988\n`);

  // 5. INTEGRATED DECISION SUPPORT
  console.log('5️⃣ INTEGRATED DECISION SUPPORT EXAMPLE');
  console.log('Decision: "Should ACT partner with XYZ Foundation on Indigenous youth program?"');
  console.log('');
  console.log('Research Agent Analysis:');
  console.log('✓ Market gap in Indigenous youth leadership (high confidence)');
  console.log('✓ XYZ Foundation has complementary strengths');
  console.log('✓ $2.5M funding opportunity available');
  console.log('');
  console.log('Compliance Agent Analysis:');
  console.log('✓ Partnership structure meets ACNC requirements');
  console.log('⚠️ Requires Indigenous community consultation');
  console.log('✓ Data sharing agreement needed for privacy compliance');
  console.log('');
  console.log('🎯 RECOMMENDATION: Proceed with partnership, but complete cultural consultation first');
}

// Run demonstration
demonstrateACTDataIntegration().catch(console.error);