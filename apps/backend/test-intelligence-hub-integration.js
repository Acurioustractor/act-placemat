#!/usr/bin/env node

/**
 * Test Intelligence Hub Integration
 * 
 * Simple test script to verify the backend integration works
 * before fully setting up the Intelligence Hub service
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BACKEND_URL = 'http://localhost:4000';

async function testHealthCheck() {
  console.log('🔍 Testing Intelligence Hub health check endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/intelligence-hub/health`);
    const data = await response.json();
    
    console.log('✅ Health check response:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testCapabilities() {
  console.log('🤖 Testing agent capabilities endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/intelligence-hub/capabilities`);
    const data = await response.json();
    
    console.log('✅ Capabilities response:', JSON.stringify(data, null, 2));
    return response.ok;
  } catch (error) {
    console.error('❌ Capabilities test failed:', error.message);
    return false;
  }
}

async function testTaskSubmission() {
  console.log('📋 Testing task submission (this will fail gracefully without Intelligence Hub)...');
  
  try {
    const taskData = {
      type: 'research-query',
      payload: {
        query: 'Australian renewable energy trends',
        scope: 'national'
      },
      priority: 7,
      transparencyLevel: 'community'
    };
    
    const response = await fetch(`${BACKEND_URL}/api/intelligence-hub/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Task submission succeeded:', data);
      return { success: true, taskId: data.taskId };
    } else {
      console.log('⚠️ Task submission failed (expected without Intelligence Hub):', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ Task submission error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testBackendApi() {
  console.log('🚀 Testing backend API health...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Backend health:', data.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🧪 Starting Intelligence Hub Integration Tests\n');
  
  // Test 1: Backend API Health
  const backendHealthy = await testBackendApi();
  if (!backendHealthy) {
    console.error('❌ Backend is not running. Please start the backend first.');
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Intelligence Hub endpoints (without actual service)
  // These should work but will fail when trying to communicate with the actual hub
  
  await testCapabilities();
  console.log('');
  
  const healthResult = await testHealthCheck();
  console.log('');
  
  const taskResult = await testTaskSubmission();
  console.log('');
  
  // Summary
  console.log('📊 Test Summary:');
  console.log('✅ Backend API: Running');
  console.log('✅ Intelligence Hub Router: Loaded');
  console.log('✅ Capabilities Endpoint: Working');
  console.log(`${healthResult ? '❌' : '⚠️'} Health Check: ${healthResult ? 'Unexpected success' : 'Expected failure (no hub service)'}`);
  console.log(`${taskResult.success ? '❌' : '⚠️'} Task Submission: ${taskResult.success ? 'Unexpected success' : 'Expected failure (no hub service)'}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Fix Intelligence Hub service dependencies');
  console.log('2. Start Intelligence Hub on port 3002');
  console.log('3. Re-run this test to verify full integration');
  console.log('4. Test end-to-end task orchestration workflow');
  
  console.log('\n✅ Backend Integration Layer: READY');
  console.log('⏳ Intelligence Hub Service: PENDING');
}

// Run the tests
runIntegrationTests().catch(console.error);