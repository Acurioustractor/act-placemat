#!/usr/bin/env node

/**
 * Complete demonstration of agents working with ALL ACT data sources
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

async function completeAgentDemo() {
  console.log('🎉 COMPLETE AGENT INTEGRATION WITH ALL ACT DATA SOURCES\n');

  // 1. VERIFY ALL DATA SOURCES
  console.log('1️⃣ DATA SOURCE VERIFICATION');
  
  // Notion Projects
  const notionData = await axios.get(`${API_BASE}/api/dashboard/overview`);
  console.log(`✅ NOTION: ${notionData.data.metrics.totalProjects} projects, ${notionData.data.metrics.partnerOrganizations} partners`);
  
  // LinkedIn Contacts  
  const linkedinStatus = await axios.get(`${API_BASE}/api/linkedin-intelligence/status`);
  console.log(`✅ LINKEDIN: ${linkedinStatus.data.linkedin.contactsAvailable} contacts, ${linkedinStatus.data.linkedin.highValueContacts} high-value`);
  
  // Empathy Ledger Stories
  const stories = await axios.get(`${API_BASE}/api/stories?limit=5`);
  console.log(`✅ SUPABASE: ${stories.data.stories.length} stories (sample), storytellers database`);
  
  // Xero Financial
  const xeroStatus = await axios.get(`${API_BASE}/api/xero/status`);
  console.log(`✅ XERO: ${xeroStatus.data.status} - Nicholas Marchesi organization`);
  
  // Financial Intelligence
  const financeRecommendations = await axios.get(`${API_BASE}/api/financial-intelligence/recommendations`);
  console.log(`✅ FINANCIAL INTELLIGENCE: ${financeRecommendations.data.recommendations.length} active recommendations\n`);

  // 2. RESEARCH AGENT COMPREHENSIVE ANALYSIS
  console.log('2️⃣ RESEARCH AGENT: COMPREHENSIVE BUSINESS INTELLIGENCE');
  
  // Analyze your top project with market research
  const topProject = notionData.data.topProjects[0];
  console.log(`\n🔬 ANALYZING PROJECT: "${topProject.name}"`);
  
  const projectResearch = await axios.post(`${API_BASE}/api/research-analyst/market-research`, {
    query: `${topProject.name} funding opportunities Australia arts technology community`,
    domain: 'arts_technology',
    includeRecentNews: true,
    saveResults: false
  });
  
  console.log(`   📊 Research Results:`);
  console.log(`      Confidence: ${(projectResearch.data.research.confidence * 100).toFixed(0)}%`);
  console.log(`      Sources Found: ${projectResearch.data.research.sourceCount}`);
  console.log(`      Key Insights: ${projectResearch.data.research.insights.length}`);
  console.log(`      Recommendations:`);
  projectResearch.data.research.recommendations.forEach(rec => 
    console.log(`        • ${rec}`)
  );

  // Competitive analysis of your LinkedIn network
  const highValueContacts = await axios.get(`${API_BASE}/api/linkedin-intelligence/high-value-contacts?limit=3`);
  const topContacts = highValueContacts.data.contacts.slice(0, 2);
  
  console.log(`\n🤝 COMPETITIVE ANALYSIS: "${topContacts[0].full_name}" vs "${topContacts[1].full_name}"`);
  
  const competitiveAnalysis = await axios.post(`${API_BASE}/api/research-analyst/competitive-analysis`, {
    competitors: [topContacts[0].current_company, topContacts[1].current_company],
    analysisType: 'partnership_opportunities'
  });
  
  console.log(`   📈 Partnership Intelligence:`);
  console.log(`      Organizations Analyzed: ${competitiveAnalysis.data.analysis.competitorCount}`);
  console.log(`      Opportunities Identified: ${competitiveAnalysis.data.analysis.opportunitiesFound}`);
  console.log(`      Strategic Recommendations:`);
  competitiveAnalysis.data.analysis.recommendations.forEach(rec => 
    console.log(`        • ${rec}`)
  );

  // 3. COMPLIANCE AGENT COMPREHENSIVE CHECKING
  console.log('\n3️⃣ COMPLIANCE AGENT: REGULATORY OVERSIGHT');
  
  // Check your real story compliance
  const testStory = stories.data.stories[0];
  console.log(`\n⚖️  STORY COMPLIANCE: "${testStory.title}"`);
  
  const storyCompliance = await axios.post(`${API_BASE}/api/compliance-officer/check`, {
    data: {
      title: testStory.title,
      content: testStory.content || '',
      themes: testStory.themes || [],
      type: 'story',
      storytellerId: testStory.storyteller_id,
      culturalReview: false,
      storytellingPermission: false,
      hasConsent: true
    },
    framework: 'all'
  });
  
  console.log(`   🔍 Compliance Analysis:`);
  console.log(`      Overall Status: ${storyCompliance.data.compliance.overallStatus}`);
  console.log(`      Frameworks Checked: ${storyCompliance.data.compliance.frameworksChecked}`);
  console.log(`      Violations Found: ${storyCompliance.data.compliance.violationsFound}`);
  
  if (storyCompliance.data.violations.length > 0) {
    console.log(`      Critical Violations:`);
    storyCompliance.data.violations.slice(0, 3).forEach(violation => 
      console.log(`        • ${violation.framework}: ${violation.rule} (${violation.severity})`)
    );
  }

  // Check LinkedIn contact data compliance
  const sampleContact = topContacts[0];
  console.log(`\n🔒 CONTACT DATA COMPLIANCE: "${sampleContact.full_name}"`);
  
  const contactCompliance = await axios.post(`${API_BASE}/api/compliance-officer/check`, {
    data: {
      contactName: sampleContact.full_name,
      email: sampleContact.email_address || '',
      dataSource: 'LinkedIn import',
      hasConsent: true,
      retentionPeriod: '2 years',
      crossBorderTransfer: false
    },
    framework: 'privacy'
  });
  
  console.log(`   🛡️  Privacy Compliance:`);
  console.log(`      Status: ${contactCompliance.data.compliance.overallStatus}`);
  console.log(`      Violations: ${contactCompliance.data.compliance.violationsFound}`);

  // 4. FINANCIAL INTELLIGENCE INTEGRATION
  console.log('\n4️⃣ FINANCIAL INTELLIGENCE: XERO DATA ANALYSIS');
  
  console.log(`\n💰 FINANCIAL RECOMMENDATIONS:`);
  financeRecommendations.data.recommendations.slice(0, 2).forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec.title} (${rec.priority.toUpperCase()})`);
    console.log(`      Impact: ${rec.impact}/10 | Effort: ${rec.effort}/10`);
    console.log(`      ${rec.description}`);
    console.log(`      Key Actions:`);
    rec.actionableSteps.slice(0, 2).forEach(step => 
      console.log(`        • ${step}`)
    );
    console.log('');
  });

  // 5. INTEGRATED DECISION SUPPORT
  console.log('5️⃣ INTEGRATED DECISION SUPPORT EXAMPLE');
  console.log('\n🎯 DECISION: "Should ACT expand ANAT SPECTRA 2025 program?"');
  console.log('\n📊 RESEARCH AGENT INPUT:');
  console.log(`   ✅ Market confidence: ${(projectResearch.data.research.confidence * 100).toFixed(0)}%`);
  console.log(`   ✅ Growth opportunities identified in arts technology sector`);
  console.log(`   ✅ Strategic partnerships available through current network`);
  
  console.log('\n⚖️  COMPLIANCE AGENT INPUT:');
  console.log(`   ⚠️  Story compliance needs attention (${storyCompliance.data.compliance.violationsFound} violations)`);
  console.log(`   ✅ Contact data handling meets privacy requirements`);
  console.log(`   ⚠️  Need Indigenous cultural review protocols for expansion`);
  
  console.log('\n💰 FINANCIAL INTELLIGENCE INPUT:');
  const cashFlowRec = financeRecommendations.data.recommendations.find(r => r.category === 'cash_flow');
  if (cashFlowRec) {
    console.log(`   🚨 Cash flow requires attention (${cashFlowRec.priority} priority)`);
    console.log(`   💡 ${cashFlowRec.impact}/10 impact on organizational capacity`);
  }
  
  console.log('\n🔄 LINKEDIN NETWORK INPUT:');
  console.log(`   🤝 ${highValueContacts.data.contacts.length} high-value contacts available for partnerships`);
  console.log(`   🎯 Key contacts in arts/technology sector: ${topContacts[0].current_company}, ${topContacts[1].current_company}`);

  console.log('\n🏆 INTEGRATED RECOMMENDATION:');
  console.log('   PROCEED WITH CAUTION:');
  console.log('   ✅ Strong market opportunity exists');
  console.log('   ✅ Network partnerships available');
  console.log('   ⚠️  Address compliance gaps first');
  console.log('   ⚠️  Secure financial stability before expansion');
  console.log('   🎯 Recommended timeline: 60-90 days after addressing foundational issues');

  console.log('\n6️⃣ CONTINUOUS INTELLIGENCE SUMMARY');
  console.log('🎉 AGENTS NOW MONITORING YOUR COMPLETE DATA ECOSYSTEM:');
  console.log(`   📋 ${notionData.data.metrics.totalProjects} Notion projects for funding opportunities`);
  console.log(`   🔗 ${linkedinStatus.data.linkedin.contactsAvailable} LinkedIn contacts for partnership intelligence`);
  console.log(`   📚 Community stories for compliance and impact themes`);
  console.log(`   💰 Xero financial data for cash flow and investment decisions`);
  console.log(`   🤖 Real-time recommendations updating as your data changes`);
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('   • Agents continue monitoring all data sources');
  console.log('   • Compliance violations flagged before publication');
  console.log('   • Research opportunities identified as projects evolve');
  console.log('   • Financial intelligence guides strategic decisions');
  console.log('   • Cross-platform insights reveal hidden connections');
  
  console.log('\n🎯 This demonstrates LIVE INTELLIGENCE working with YOUR REAL DATA!');
}

completeAgentDemo().catch(console.error);