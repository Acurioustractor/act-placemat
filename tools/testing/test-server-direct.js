#!/usr/bin/env node

/**
 * Direct server test with bulletproof error handling
 * Tests server functionality without relying on curl
 */

import http from 'http';
import { URL } from 'url';

const TEST_TIMEOUT = 10000; // 10 seconds

// Bulletproof HTTP client with retries
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TEST_TIMEOUT
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${TEST_TIMEOUT}ms`));
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test server endpoints
async function testServerEndpoints() {
  const baseUrl = 'http://localhost:4000';
  const endpoints = [
    '/health',
    '/api/farm-workflow/status',
    '/api/farmhand/health'
  ];

  console.log('🧪 Testing server endpoints directly...\n');

  for (const endpoint of endpoints) {
    const url = baseUrl + endpoint;
    
    try {
      console.log(`🔍 Testing: ${endpoint}`);
      const response = await makeRequest(url);
      
      if (response.statusCode === 200) {
        console.log(`  ✅ SUCCESS - Status: ${response.statusCode}`);
        
        // Try to parse JSON response
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`  📊 Response: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
        } catch (e) {
          console.log(`  📝 Response: ${response.data.substring(0, 100)}...`);
        }
      } else {
        console.log(`  ⚠️  Warning - Status: ${response.statusCode}`);
        console.log(`  📝 Response: ${response.data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

// Test the comprehensive business setup query
async function testBusinessSetupQuery() {
  console.log('🌱 Testing Comprehensive Business Setup Query...\n');
  
  const query = {
    query: `I need to align our next business goals and set up comprehensive AI-powered business infrastructure:

1. Setting up ACT as a Pty Ltd company - what's the best structure?
2. AI-powered bookkeeping integration with Xero, bank statements, and Dext
3. Optimal payroll setup for our team structure
4. R&D tax credit application strategy and ongoing compliance
5. Access to latest Anthropic AI research and capabilities for decision support
6. Deep research capabilities to support all business decisions
7. Continuous business decision feedback loops for learning and growth
8. Comprehensive ongoing model to support everything we do

I want this to be an integrated system where AI checks our Xero, bank statements, and Dext automatically, provides ongoing R&D tax credit optimization, and creates a learning system that improves our business decisions over time.

Please provide a comprehensive implementation plan with specific recommendations for each area, including tools, integrations, timelines, and how each component feeds into our overall business intelligence system.`,
    context: {
      priority: 'high',
      type: 'business_infrastructure',
      skillPodsRequired: [
        'finance-copilot',
        'compliance-sentry',
        'systems-seeder',
        'opportunity-scout',
        'knowledge-librarian',
        'impact-analyst',
        'dna-guardian',
        'story-weaver'
      ],
      expectedDeliverables: [
        'Pty Ltd setup roadmap',
        'AI bookkeeping integration plan',
        'Payroll system recommendations',
        'R&D tax credit strategy',
        'Research access implementation',
        'Decision support system design',
        'Continuous learning architecture'
      ]
    }
  };

  try {
    const response = await makeRequest('http://localhost:4000/api/farm-workflow/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (response.statusCode === 200) {
      console.log('🎉 BUSINESS SETUP QUERY SUCCESS!');
      
      try {
        const result = JSON.parse(response.data);
        
        console.log('\n📋 Query Result Summary:');
        console.log(`  - Success: ${result.success}`);
        console.log(`  - Processing Time: ${result.processingTime}ms`);
        console.log(`  - Cultural Safety: ${result.culturalSafety}%`);
        console.log(`  - Skill Pods Involved: ${result.skillPodsInvolved?.length || 0}`);
        
        if (result.response) {
          console.log('\n🧠 AI Response:');
          console.log(result.response.substring(0, 500) + '...');
        }
        
        if (result.workflowTasks && result.workflowTasks.length > 0) {
          console.log('\n📋 Generated Workflow Tasks:');
          result.workflowTasks.forEach((task, i) => {
            console.log(`  ${i + 1}. ${task.title} (${task.priority})`);
          });
        }
        
        if (result.recommendedActions && result.recommendedActions.length > 0) {
          console.log('\n✅ Recommended Actions:');
          result.recommendedActions.forEach((action, i) => {
            console.log(`  ${i + 1}. ${action}`);
          });
        }
        
        return result;
        
      } catch (parseError) {
        console.log('⚠️  Response received but JSON parsing failed');
        console.log('Raw response:', response.data.substring(0, 500));
      }
    } else {
      console.log(`❌ Query failed with status: ${response.statusCode}`);
      console.log(`Response: ${response.data}`);
    }
  } catch (error) {
    console.log(`❌ Business setup query failed: ${error.message}`);
  }
}

// Main test function
async function main() {
  console.log('🛡️ ACT Bulletproof Server Testing v1.0');
  console.log('=====================================\n');
  
  // Wait a moment for server to be ready
  console.log('⏳ Waiting 3 seconds for server initialization...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test basic endpoints first
  await testServerEndpoints();
  
  // Test the business setup query
  await testBusinessSetupQuery();
  
  console.log('\n🏁 Testing complete!');
}

// Run tests
main().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});