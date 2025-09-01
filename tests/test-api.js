#!/usr/bin/env node
/**
 * Direct API Test - Check what data we're getting from the dashboard/projects endpoint
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  console.log('🔍 Testing API directly...');
  
  try {
    const response = await fetch('http://localhost:4000/api/dashboard/projects');
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      return;
    }
    
    const projects = await response.json();
    console.log(`✅ Got ${projects.length} projects`);
    
    // Find the Goods project
    const goodsProject = projects.find(p => p.name && p.name.toLowerCase().includes('goods'));
    
    if (goodsProject) {
      console.log('🛍️ Found Goods project:');
      console.log('📋 Basic Info:', {
        id: goodsProject.id,
        name: goodsProject.name,
        aiSummary: goodsProject.aiSummary ? 'Has summary' : 'No summary'
      });
      
      console.log('💰 Financial Data:', {
        actualIncoming: goodsProject.actualIncoming,
        potentialIncoming: goodsProject.potentialIncoming,
        actualType: typeof goodsProject.actualIncoming,
        potentialType: typeof goodsProject.potentialIncoming
      });
      
      console.log('🔧 All Financial Fields:', Object.keys(goodsProject).filter(key => 
        key.toLowerCase().includes('income') || 
        key.toLowerCase().includes('funding') || 
        key.toLowerCase().includes('revenue') ||
        key.toLowerCase().includes('actual') ||
        key.toLowerCase().includes('potential')
      ));
      
      console.log('🔗 All Connection Fields:', Object.keys(goodsProject).filter(key => 
        key.toLowerCase().includes('related') || 
        key.toLowerCase().includes('action') || 
        key.toLowerCase().includes('opportunit') ||
        key.toLowerCase().includes('organis') ||
        key.toLowerCase().includes('resource') ||
        key.toLowerCase().includes('artifact')
      ));
      
      // Show actual values for connection fields
      console.log('🎯 Connection Counts:', {
        relatedActions: Array.isArray(goodsProject.relatedActions) ? goodsProject.relatedActions.length : 'not array',
        relatedOpportunities: Array.isArray(goodsProject.relatedOpportunities) ? goodsProject.relatedOpportunities.length : 'not array',
        relatedOrganisations: Array.isArray(goodsProject.relatedOrganisations) ? goodsProject.relatedOrganisations.length : 'not array',
        relatedResources: Array.isArray(goodsProject.relatedResources) ? goodsProject.relatedResources.length : 'not array',
        relatedArtifacts: Array.isArray(goodsProject.relatedArtifacts) ? goodsProject.relatedArtifacts.length : 'not array'
      });
    } else {
      console.log('❌ No Goods project found');
      console.log('📋 Available projects:', projects.map(p => p.name));
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPI();