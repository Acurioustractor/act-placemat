#!/usr/bin/env node

/**
 * Test comprehensive business setup query through ACT Skill Pods
 * This demonstrates how to use your farm workflow system for complex business decisions
 */

async function testComprehensiveBusinessSetup() {
  console.log('🚀 Testing Comprehensive Business Setup via ACT Skill Pods\n');

  const API_BASE = 'http://localhost:4000/api/farm-workflow';

  // The comprehensive business setup query
  const businessSetupQuery = `
I need to align our next business goals and set up comprehensive AI-powered business infrastructure:

1. Setting up ACT as a Pty Ltd company - what's the best structure?
2. AI-powered bookkeeping integration with Xero, bank statements, and Dext
3. Optimal payroll setup for our team structure
4. R&D tax credit application strategy and ongoing compliance
5. Access to latest Anthropic AI research and capabilities for decision support
6. Deep research capabilities to support all business decisions
7. Continuous business decision feedback loops for learning and growth
8. Comprehensive ongoing model to support everything we do

I want this to be an integrated system where AI checks our Xero, bank statements, and Dext automatically, provides ongoing R&D tax credit optimization, and creates a learning system that improves our business decisions over time.

Please provide a comprehensive implementation plan with specific recommendations for each area, including tools, integrations, timelines, and how each component feeds into our overall business intelligence system.
  `.trim();

  try {
    console.log('🌱 Sending comprehensive business setup query to Skill Pods...');
    console.log('Query:', businessSetupQuery.substring(0, 200) + '...\n');

    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: businessSetupQuery,
        context: {
          priority: 'high',
          type: 'business_infrastructure',
          skillPodsRequired: [
            'finance-copilot',     // Financial setup and bookkeeping
            'compliance-sentry',   // Legal structure and R&D tax credits
            'systems-seeder',      // AI integrations and automation
            'opportunity-scout',   // R&D opportunities and optimization
            'knowledge-librarian', // Latest research and documentation
            'impact-analyst',      // Performance measurement systems
            'dna-guardian',        // Ensure alignment with ACT values
            'story-weaver'         // Communication and reporting
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
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('🌾 Skill Pods Response:');
    console.log('Success:', data.success);
    
    if (data.response) {
      console.log('\n📋 Comprehensive Business Setup Plan:');
      console.log(data.response);
    }

    if (data.skillPodContributions) {
      console.log('\n🧠 Individual Skill Pod Contributions:');
      Object.entries(data.skillPodContributions).forEach(([podId, contribution]) => {
        console.log(`\n${podId.toUpperCase()}:`);
        console.log(contribution);
      });
    }

    if (data.recommendedActions) {
      console.log('\n✅ Recommended Next Actions:');
      data.recommendedActions.forEach((action, i) => {
        console.log(`${i + 1}. ${action}`);
      });
    }

    console.log('\n🔄 Now checking if this creates workflow tasks...');
    
    // Check for created tasks
    const tasksResponse = await fetch(`${API_BASE}/tasks`);
    if (tasksResponse.ok) {
      const tasksData = await tasksResponse.json();
      console.log('\n📋 Workflow Tasks Created:');
      tasksData.tasks?.slice(0, 5).forEach((task, i) => {
        console.log(`${i + 1}. ${task.title} (${task.status})`);
        console.log(`   Assigned: ${task.assignedPods?.join(', ')}`);
        console.log(`   Priority: ${task.priority}`);
      });
    }

    // Check skill pod status after processing
    const statusResponse = await fetch(`${API_BASE}/skill-pods`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('\n🎯 Skill Pod Status After Processing:');
      Object.entries(statusData.skill_pods || {}).forEach(([podId, pod]) => {
        console.log(`${podId}: ${pod.status} (${pod.insights || 0} insights generated)`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing business setup:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('   - Backend server is running (cd apps/backend && npm start)');
    console.log('   - Farm Workflow API is accessible');
    console.log('   - All Skill Pods are initialized');
  }
}

// Additional function to test continuous learning setup
async function testContinuousLearningSetup() {
  console.log('\n🔄 Testing Continuous Learning Integration...');

  const learningQuery = `
How can we set up continuous learning and feedback loops for our business decisions?

Specifically:
1. Automated monitoring of our business metrics (Xero, bank statements, payroll efficiency)
2. AI analysis of what's working and what's not
3. Automatic recommendations for improvements
4. Integration with our R&D tax credit optimization
5. Feedback loops that improve our Skill Pods' recommendations over time
6. Monthly/quarterly business intelligence reports
7. Predictive analytics for cash flow, tax obligations, and growth opportunities

Create a system that learns from every business decision we make and continuously improves our operations.
  `.trim();

  try {
    const response = await fetch('http://localhost:4000/api/farm-workflow/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: learningQuery,
        context: {
          type: 'continuous_improvement',
          skillPodsRequired: ['systems-seeder', 'impact-analyst', 'finance-copilot'],
          integrationFocus: true
        }
      })
    });

    const data = await response.json();
    console.log('🧠 Continuous Learning Plan:', data.response);

  } catch (error) {
    console.error('❌ Continuous learning test failed:', error.message);
  }
}

// Run both tests
testComprehensiveBusinessSetup().then(() => {
  return testContinuousLearningSetup();
});