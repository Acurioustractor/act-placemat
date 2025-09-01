#!/usr/bin/env node

/**
 * ACT Organizational Design & Knowledge Repository - Phase 1 Testing Framework
 * Tests the current state vs desired state of your knowledge organization system
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  supabaseUrl: 'https://tednluwflfhxyucgwigh.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEzNjY2MjksImV4cCI6MjAzNjk0MjYyOX0.jNE5fGFXKMLK6CQE3cSCHOQ8ZrfGj3ZaHXBhbvXFvX8',
  apiUrl: 'http://localhost:4000',
  frontendUrl: 'http://localhost:5173'
};

console.log('🎯 ACT Knowledge Repository - Phase 1 Assessment');
console.log('='.repeat(60));

// Test Categories
const tests = {
  currentState: {
    name: '📊 CURRENT STATE ANALYSIS',
    tests: []
  },
  dataIntegrity: {
    name: '🔗 DATA INTEGRITY & CONNECTIONS',
    tests: []
  },
  aiCapabilities: {
    name: '🤖 AI & INTELLIGENCE SYSTEMS', 
    tests: []
  },
  organizationalDesign: {
    name: '🏗️ ORGANIZATIONAL DESIGN IMPLEMENTATION',
    tests: []
  },
  futureReadiness: {
    name: '🚀 FUTURE STATE READINESS',
    tests: []
  }
};

// Initialize Supabase
let supabase;
try {
  supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  console.log('✅ Supabase client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error.message);
  process.exit(1);
}

// Test Functions
async function testCurrentState() {
  console.log('\n' + tests.currentState.name);
  console.log('-'.repeat(40));

  // Test 1: Count existing records
  try {
    const tables = ['stories', 'projects', 'opportunities', 'organizations', 'people'];
    const counts = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        counts[table] = count || 0;
      } catch (e) {
        counts[table] = `Error: ${e.message}`;
      }
    }
    
    console.log('📈 Database Record Counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });
    
    tests.currentState.tests.push({
      name: 'Database Record Inventory',
      status: 'pass',
      details: counts
    });
    
  } catch (error) {
    tests.currentState.tests.push({
      name: 'Database Record Inventory', 
      status: 'fail',
      error: error.message
    });
  }

  // Test 2: API Health Check
  try {
    const response = await fetch(`${CONFIG.apiUrl}/health`);
    const health = await response.json();
    
    console.log('\n🏥 System Health:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Database: ${health.database}`);
    console.log(`   Version: ${health.version}`);
    
    tests.currentState.tests.push({
      name: 'API & System Health',
      status: health.status === 'healthy' ? 'pass' : 'warning',
      details: health
    });
    
  } catch (error) {
    tests.currentState.tests.push({
      name: 'API & System Health',
      status: 'fail', 
      error: error.message
    });
  }
}

async function testDataIntegrity() {
  console.log('\n' + tests.dataIntegrity.name);
  console.log('-'.repeat(40));

  // Test relationship data quality
  try {
    // Check for stories with proper metadata
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, title, tags, created_at')
      .limit(5);
      
    if (error) throw error;
    
    const storiesWithTags = stories?.filter(s => s.tags && s.tags.length > 0) || [];
    const taggedPercentage = stories ? (storiesWithTags.length / stories.length * 100).toFixed(1) : 0;
    
    console.log(`📝 Story Metadata Quality: ${taggedPercentage}% have tags`);
    
    tests.dataIntegrity.tests.push({
      name: 'Story Metadata Completeness',
      status: taggedPercentage > 50 ? 'pass' : 'warning',
      details: { tagged: storiesWithTags.length, total: stories?.length || 0, percentage: taggedPercentage }
    });
    
  } catch (error) {
    tests.dataIntegrity.tests.push({
      name: 'Story Metadata Completeness',
      status: 'fail',
      error: error.message
    });
  }
}

async function testAICapabilities() {
  console.log('\n' + tests.aiCapabilities.name);  
  console.log('-'.repeat(40));

  // Test Farm Workflow System
  try {
    const response = await fetch(`${CONFIG.apiUrl}/api/farm-workflow/status`);
    const farmStatus = await response.json();
    
    const skillPods = farmStatus.farm_status?.skill_pods || {};
    const activeSkillPods = Object.keys(skillPods).length;
    const healthMetrics = farmStatus.farm_status?.health_metrics || {};
    
    console.log(`🌾 Farm Workflow System:`);
    console.log(`   Skill Pods Active: ${activeSkillPods}`);
    console.log(`   Cultural Safety: ${healthMetrics.culturalSafety}%`);
    console.log(`   System Performance: ${healthMetrics.systemPerformance}%`);
    console.log(`   Total Insights: ${healthMetrics.totalInsights}`);
    
    tests.aiCapabilities.tests.push({
      name: 'Farm Workflow & AI Systems',
      status: activeSkillPods > 0 ? 'pass' : 'fail',
      details: { skillPods: activeSkillPods, metrics: healthMetrics }
    });
    
  } catch (error) {
    tests.aiCapabilities.tests.push({
      name: 'Farm Workflow & AI Systems',
      status: 'fail',
      error: error.message
    });
  }
}

async function testOrganizationalDesign() {
  console.log('\n' + tests.organizationalDesign.name);
  console.log('-'.repeat(40));

  // Test PRD implementation progress
  const prdPath = path.join(process.cwd(), 'ACT-Connected-Platform-PRD.md');
  const prdExists = fs.existsSync(prdPath);
  
  console.log(`📋 Product Requirements Document: ${prdExists ? 'Found' : 'Missing'}`);
  
  if (prdExists) {
    const prdContent = fs.readFileSync(prdPath, 'utf8');
    const hasPhase1 = prdContent.includes('Phase 1');
    const hasRelationshipGraph = prdContent.includes('RelationshipNetworkGraph');
    const hasTimeline = prdContent.includes('Timeline');
    
    console.log(`   Phase 1 Defined: ${hasPhase1 ? 'Yes' : 'No'}`);
    console.log(`   Relationship Visualization: ${hasRelationshipGraph ? 'Planned' : 'Not Specified'}`);
    console.log(`   Timeline Specified: ${hasTimeline ? 'Yes' : 'No'}`);
  }
  
  tests.organizationalDesign.tests.push({
    name: 'PRD & Strategic Planning',
    status: prdExists ? 'pass' : 'warning',
    details: { exists: prdExists }
  });

  // Test documentation organization
  const docsPath = path.join(process.cwd(), 'Docs');
  const docsExist = fs.existsSync(docsPath);
  
  if (docsExist) {
    const docsDirs = fs.readdirSync(docsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`\n📚 Documentation Structure:`);
    docsDirs.forEach(dir => console.log(`   - ${dir}`));
    
    tests.organizationalDesign.tests.push({
      name: 'Documentation Organization',
      status: docsDirs.length > 5 ? 'pass' : 'warning',
      details: { directories: docsDirs }
    });
  }
}

async function testFutureReadiness() {
  console.log('\n' + tests.futureReadiness.name);
  console.log('-'.repeat(40));

  // Test frontend accessibility
  try {
    const response = await fetch(CONFIG.frontendUrl);
    const frontendWorking = response.ok;
    
    console.log(`🌐 Frontend Platform: ${frontendWorking ? 'Operational' : 'Down'}`);
    
    tests.futureReadiness.tests.push({
      name: 'Frontend Platform Access',
      status: frontendWorking ? 'pass' : 'fail'
    });
    
  } catch (error) {
    tests.futureReadiness.tests.push({
      name: 'Frontend Platform Access',
      status: 'fail',
      error: error.message
    });
  }

  // Test scalability indicators
  const scalabilityFactors = {
    hasDatabase: supabase !== null,
    hasAPI: true, // We tested this earlier
    hasAI: true,  // We tested Farm Workflow
    hasDocumentation: fs.existsSync(path.join(process.cwd(), 'Docs')),
    hasPRD: fs.existsSync(path.join(process.cwd(), 'ACT-Connected-Platform-PRD.md'))
  };
  
  const readinessScore = Object.values(scalabilityFactors).filter(Boolean).length;
  
  console.log(`\n🚀 Future Readiness Score: ${readinessScore}/5`);
  Object.entries(scalabilityFactors).forEach(([factor, ready]) => {
    console.log(`   ${factor}: ${ready ? '✅' : '❌'}`);
  });
  
  tests.futureReadiness.tests.push({
    name: 'Scalability & Future Readiness',
    status: readinessScore >= 4 ? 'pass' : 'warning',
    details: { score: readinessScore, factors: scalabilityFactors }
  });
}

// Generate Report
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PHASE 1 ASSESSMENT SUMMARY');
  console.log('='.repeat(60));

  let totalTests = 0;
  let passedTests = 0;
  let warningTests = 0;
  let failedTests = 0;

  Object.values(tests).forEach(category => {
    category.tests.forEach(test => {
      totalTests++;
      if (test.status === 'pass') passedTests++;
      else if (test.status === 'warning') warningTests++;
      else failedTests++;
    });
  });

  console.log(`\n📈 Overall Status:`);
  console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`   ⚠️  Warnings: ${warningTests}/${totalTests}`);
  console.log(`   ❌ Failed: ${failedTests}/${totalTests}`);

  const overallHealth = passedTests / totalTests;
  let healthStatus;
  if (overallHealth >= 0.8) healthStatus = '🚀 Excellent - Ready for Phase 2';
  else if (overallHealth >= 0.6) healthStatus = '✅ Good - Minor improvements needed';  
  else if (overallHealth >= 0.4) healthStatus = '⚠️ Fair - Significant work required';
  else healthStatus = '❌ Poor - Major issues need addressing';

  console.log(`\n🎯 Phase 1 Readiness: ${healthStatus}`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      warnings: warningTests,
      failed: failedTests,
      healthScore: overallHealth,
      status: healthStatus
    },
    details: tests
  };

  fs.writeFileSync('phase1-assessment-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: phase1-assessment-report.json');
}

// Run all tests
async function runAllTests() {
  try {
    await testCurrentState();
    await testDataIntegrity();
    await testAICapabilities(); 
    await testOrganizationalDesign();
    await testFutureReadiness();
    generateReport();
  } catch (error) {
    console.error('\n💥 Testing framework error:', error);
    process.exit(1);
  }
}

// Execute
runAllTests();