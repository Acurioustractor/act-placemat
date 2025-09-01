#!/usr/bin/env node

/**
 * Demonstrate LinkedIn data enrichment capabilities
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

async function demonstrateLinkedInEnrichment() {
  console.log('🔗 LINKEDIN DATA ENRICHMENT CAPABILITIES\n');

  // Get sample contact data to show current state
  const contactData = await axios.get(`${API_BASE}/api/linkedin-intelligence/high-value-contacts?limit=3`);
  const contacts = contactData.data.contacts;

  console.log('📊 CURRENT DATA STATE (Sample):');
  contacts.forEach((contact, i) => {
    console.log(`${i + 1}. ${contact.full_name}`);
    console.log(`   ✅ Has: Position (${contact.current_position})`);
    console.log(`   ✅ Has: Company (${contact.current_company})`);
    console.log(`   ✅ Has: LinkedIn URL (${contact.linkedin_url})`);
    console.log(`   ✅ Has: Relationship Score (${contact.relationship_score})`);
    console.log(`   ✅ Has: Strategic Tags (${contact.alignment_tags.join(', ')})`);
    console.log(`   ⚠️  Missing: Industry (${contact.industry || 'null'})`);
    console.log(`   ⚠️  Missing: Location (${contact.location || 'null'})`);
    console.log(`   ⚠️  Missing: Email (${contact.email_address || 'empty'})`);
    console.log(`   🔄 Last Analyzed: ${contact.last_analyzed_at}`);
    console.log('');
  });

  console.log('🎯 ENRICHMENT OPPORTUNITIES:');
  console.log('As you surface more information, you can populate:');
  console.log('• Industry classifications');
  console.log('• Geographic locations');
  console.log('• Email addresses (with consent)');
  console.log('• Phone numbers');
  console.log('• Company size/revenue data');
  console.log('• Skills and expertise areas');
  console.log('• Recent activity patterns');
  console.log('• Educational background');
  console.log('• Board positions/affiliations');
  console.log('• Project collaboration history\n');

  console.log('💡 ENRICHMENT STRATEGIES:');
  console.log('1. Manual Research: Add details as you interact');
  console.log('2. Email Integration: Cross-reference with Gmail data');
  console.log('3. Meeting Notes: Capture insights from conversations');
  console.log('4. Social Media: Additional public profile information');
  console.log('5. Event Attendance: Track conference/meeting participation');
  console.log('6. Partnership History: Document collaboration outcomes\n');

  console.log('🔧 TECHNICAL IMPLEMENTATION:');
  console.log('The Supabase table supports additional fields:');
  console.log('• JSON fields for flexible data storage');
  console.log('• Timestamp tracking for data freshness');
  console.log('• Relationship scoring updates');
  console.log('• Project connection mapping');
  console.log('• Interaction history logging\n');

  // Test Research Agent with enriched contact context
  console.log('🧠 RESEARCH AGENT ANALYSIS WITH CONTACT DATA:');
  const sampleContact = contacts[0];
  const researchResult = await axios.post(`${API_BASE}/api/research-analyst/market-research`, {
    query: `${sampleContact.current_company} partnership opportunities youth development Australia`,
    domain: 'community_partnerships',
    saveResults: false
  });

  console.log(`   Analyzing: ${sampleContact.full_name} at ${sampleContact.current_company}`);
  console.log(`   Research Confidence: ${(researchResult.data.research.confidence * 100).toFixed(0)}%`);
  console.log(`   Partnership Insights: ${researchResult.data.research.insights.length} found`);
  console.log(`   Strategic Recommendations:`);
  researchResult.data.research.recommendations.forEach(rec => 
    console.log(`     • ${rec}`)
  );
}

demonstrateLinkedInEnrichment().catch(console.error);