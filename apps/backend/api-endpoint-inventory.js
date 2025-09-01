/**
 * API Endpoint Inventory & Testing Tool
 * Comprehensive mapping and validation of all available endpoints
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseURL = 'http://localhost:4000';

// Common endpoints to test
const commonEndpoints = [
  { method: 'GET', path: '/', name: 'Root' },
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'GET', path: '/api/health', name: 'API Health' },
  { method: 'GET', path: '/api/v1/health', name: 'V1 Health' },
];

// Test endpoints by category
const endpointCategories = {
  'Core System': [
    'GET /health',
    'GET /api/health',
    'GET /status',
    'GET /metrics'
  ],
  'Enhanced Integration': [
    'GET /api/enhanced-integration/health',
    'GET /api/enhanced-integration/sync/status',
    'GET /api/enhanced-integration/oauth/notion/url',
    'GET /api/enhanced-integration/config'
  ],
  'V1 APIs': [
    'GET /api/v1/data-intelligence/health',
    'GET /api/v1/financial/health', 
    'GET /api/v1/intelligence/health',
    'GET /api/v1/integrations/health',
    'GET /api/v1/platform/health',
    'GET /api/v1/linkedin/health'
  ],
  'Knowledge Graph': [
    'GET /api/knowledge-graph/health',
    'GET /api/knowledge-graph/status'
  ],
  'Universal Platform': [
    'GET /api/universal-platform/health',
    'GET /api/platform/status'
  ],
  'Security & Observability': [
    'GET /api/security/health',
    'GET /api/observability/metrics',
    'GET /api/observability/health'
  ]
};

async function testEndpoint(method, path) {
  try {
    const url = `${baseURL}${path}`;
    const response = await fetch(url, { method });
    
    let responseData = null;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = 'Invalid JSON';
      }
    } else {
      responseData = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      contentType: contentType || 'unknown',
      data: responseData,
      success: response.status >= 200 && response.status < 400
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Connection Failed',
      error: error.message,
      success: false
    };
  }
}

async function runEndpointInventory() {
  console.log('🚀 Starting API Endpoint Inventory...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    total_endpoints: 0,
    working_endpoints: 0,
    failing_endpoints: 0,
    categories: {}
  };

  for (const [category, endpoints] of Object.entries(endpointCategories)) {
    console.log(`📂 Testing ${category}:`);
    results.categories[category] = {
      total: endpoints.length,
      working: 0,
      failing: 0,
      endpoints: {}
    };
    
    for (const endpoint of endpoints) {
      const [method, path] = endpoint.split(' ');
      console.log(`   ${method} ${path}...`);
      
      const result = await testEndpoint(method, path);
      results.total_endpoints++;
      
      if (result.success) {
        results.working_endpoints++;
        results.categories[category].working++;
        console.log(`     ✅ ${result.status} ${result.statusText}`);
      } else {
        results.failing_endpoints++;
        results.categories[category].failing++;
        console.log(`     ❌ ${result.status} ${result.statusText || result.error}`);
      }
      
      results.categories[category].endpoints[endpoint] = result;
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('');
  }

  // Generate summary
  console.log('📊 SUMMARY:');
  console.log(`   Total Endpoints Tested: ${results.total_endpoints}`);
  console.log(`   ✅ Working: ${results.working_endpoints} (${(results.working_endpoints/results.total_endpoints*100).toFixed(1)}%)`);
  console.log(`   ❌ Failing: ${results.failing_endpoints} (${(results.failing_endpoints/results.total_endpoints*100).toFixed(1)}%)`);
  console.log('');

  // Category breakdown
  for (const [category, data] of Object.entries(results.categories)) {
    const successRate = data.total > 0 ? (data.working / data.total * 100).toFixed(1) : 0;
    console.log(`   ${category}: ${data.working}/${data.total} working (${successRate}%)`);
  }

  // Save detailed results
  const outputPath = 'api-endpoint-inventory-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Detailed results saved to: ${outputPath}`);

  // Generate working endpoints list
  const workingEndpoints = [];
  for (const [category, data] of Object.entries(results.categories)) {
    for (const [endpoint, result] of Object.entries(data.endpoints)) {
      if (result.success) {
        workingEndpoints.push({
          category,
          endpoint,
          status: result.status,
          response_type: result.contentType
        });
      }
    }
  }
  
  console.log(`\n✅ WORKING ENDPOINTS (${workingEndpoints.length}):`);
  workingEndpoints.forEach(ep => {
    console.log(`   ${ep.endpoint} (${ep.status}) - ${ep.category}`);
  });

  return results;
}

// Run the inventory
runEndpointInventory().catch(console.error);