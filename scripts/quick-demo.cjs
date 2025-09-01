#!/usr/bin/env node

/**
 * ACT Universal AI Platform - Quick Demo
 * 
 * Minimal demonstration of the API Gateway integration layer
 * Shows how existing AI services would be coordinated for business development
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('static'));

// Australian configuration
const TIMEZONE = 'Australia/Sydney';
const CURRENCY = 'AUD';

console.log('🚀 ACT Universal AI Platform - Quick Demo');
console.log('🇦🇺 Business Development Command Center');
console.log('');

// Mock data representing the sophisticated existing systems
const mockIntelligenceHub = {
  agents: [
    {
      name: 'financial-intelligence',
      capabilities: ['financial-analysis', 'market-research', 'risk-assessment', 'abn-lookup', 'asic-queries'],
      status: 'active',
      description: 'AI agent for financial analysis and market intelligence'
    },
    {
      name: 'research-analyst', 
      capabilities: ['web-scraping', 'data-analysis', 'report-generation', 'fact-checking', 'source-verification'],
      status: 'active',
      description: 'AI agent for comprehensive research and analysis'
    },
    {
      name: 'compliance-officer',
      capabilities: ['privacy-audit', 'regulatory-check', 'data-classification', 'australian-law-check'],
      status: 'active',
      description: 'AI agent ensuring Australian compliance and regulatory adherence'
    },
    {
      name: 'community-coordinator',
      capabilities: ['stakeholder-engagement', 'democratic-processes', 'consensus-building', 'transparency-reporting'],
      status: 'active', 
      description: 'AI agent for community empowerment and democratic processes'
    }
  ],
  orchestration: 'LangGraph StateGraph with advanced routing and task management',
  features: ['Multi-agent workflows', 'Australian compliance', 'Community-first principles', 'Real-time monitoring']
};

const mockAIWorkhouse = {
  receiptDiscovery: {
    engine: 'AI-powered receipt discovery with 650+ lines of sophisticated analysis',
    capabilities: ['OCR processing', 'Project categorization', 'Expense matching', 'Calendar correlation'],
    gamification: 'Points system for receipt completion',
    integrations: ['Xero API', 'Gmail integration', 'Calendar analysis', 'Notion projects']
  },
  financialIntelligence: {
    xeroIntegration: 'Complete Xero API service with transaction analysis',
    smartAnalysis: 'Transaction-receipt gap analysis with confidence scoring',
    contextualAnalysis: 'Calendar-based expense correlation and business context'
  }
};

const mockValuesCompliance = {
  communityControl: {
    currentLevel: '45%',
    target: '100% by project completion',
    timeline: '18-36 months per project'
  },
  indigenousSovereignty: {
    status: 'Protected',
    acceleratedTimeline: '100% control within 12 months for Indigenous projects'
  },
  beautifulObsolescence: {
    target: '2027',
    description: 'Working towards community empowerment and self-sufficiency'
  },
  valuesEnforcement: 'Real-time compliance monitoring across all platform interactions'
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'ACT Universal AI Business Development Platform',
    timestamp: new Date().toISOString(),
    timezone: TIMEZONE,
    message: 'Demonstrating integration of existing sophisticated AI infrastructure',
    services: {
      intelligenceHub: 'LangGraph Multi-Agent Orchestration',
      aiWorkhouse: 'Financial Intelligence & Receipt Discovery',
      valuesCompliance: 'Community Empowerment Monitoring'
    }
  });
});

// Business Development Dashboard
app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'ACT Business Development Command Center',
    timestamp: new Date().toISOString(),
    timezone: TIMEZONE,
    platform: {
      description: 'Integration layer for existing sophisticated AI infrastructure',
      discovery: 'Existing systems far exceed planned microservices architecture'
    },
    availableCapabilities: {
      intelligenceHub: mockIntelligenceHub,
      aiWorkhouse: mockAIWorkhouse,
      valuesCompliance: mockValuesCompliance
    },
    businessDevelopmentWorkflows: [
      {
        name: 'Receipt Discovery Pipeline',
        description: 'Upload receipt → AI analysis → Project categorization → Values compliance',
        services: ['AI Workhouse', 'Intelligence Hub', 'Values Compliance'],
        sophistication: '650+ lines of AI-powered analysis with calendar correlation'
      },
      {
        name: 'Project Intelligence Analysis', 
        description: 'Multi-agent analysis of business opportunities and market conditions',
        services: ['Intelligence Hub LangGraph Orchestration'],
        sophistication: '4 specialized AI agents with advanced routing and task management'
      },
      {
        name: 'Financial Health Monitoring',
        description: 'Real-time Xero integration with smart expense categorization',
        services: ['AI Workhouse Financial Platform'],
        sophistication: 'Complete API integration with transaction-receipt gap analysis'
      },
      {
        name: 'Community Empowerment Tracking',
        description: 'Transparent monitoring of community control and Indigenous sovereignty',
        services: ['Values Integration System'],
        sophistication: 'Project-specific timelines with accelerated Indigenous frameworks'
      }
    ],
    quickActions: [
      {
        title: 'Demo Receipt Analysis',
        endpoint: '/api/demo/receipt',
        description: 'See how AI Workhouse would analyze a business receipt'
      },
      {
        title: 'Demo Project Intelligence',
        endpoint: '/api/demo/project-analysis', 
        description: 'See how Intelligence Hub agents would analyze a business opportunity'
      },
      {
        title: 'Demo Community Control',
        endpoint: '/api/demo/community-metrics',
        description: 'See how Values Compliance tracks community empowerment'
      }
    ],
    communityMessage: 'This demonstrates integration of your existing world-class AI infrastructure',
    nextSteps: [
      'Deploy existing Intelligence Hub and AI Workhouse systems',
      'Build unified frontend interface',
      'Create integration workflows between sophisticated existing services',
      'Focus on user experience rather than rebuilding inferior systems'
    ]
  });
});

// Demo receipt analysis (showing AI Workhouse capabilities)
app.post('/api/demo/receipt', (req, res) => {
  const mockReceipt = req.body.receipt || 'Coffee meeting with potential client';
  
  // Simulate the sophisticated 650-line receipt discovery analysis
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Receipt processed by AI Workhouse Receipt Discovery Engine',
      analysis: {
        receiptText: mockReceipt,
        amount: 25.50,
        merchant: 'Coffee Bean Cafe',
        date: new Date().toISOString().split('T')[0],
        projectMatch: {
          id: 'proj-community-initiative-001',
          name: 'Community Initiative Project',
          confidence: 0.89,
          reason: 'Keyword match: community, client meeting pattern'
        },
        expenseCategory: 'Business Development - Client Meetings',
        taxImplications: {
          deductible: true,
          gstAmount: 2.32,
          currency: CURRENCY
        },
        calendarCorrelation: {
          hasMatchingEvent: true,
          eventTitle: 'Client Meeting - Community Project Discussion',
          timeDistance: 15,
          attendees: ['client@example.com'],
          confidence: 0.92
        },
        aiInsights: [
          'High confidence business expense based on calendar correlation',
          'Matches established pattern of community project client meetings',
          'Expense amount within typical range for business development activities',
          'Location near ACT office suggests legitimate business context'
        ],
        nextActions: [
          'Auto-categorize in Xero under Business Development',
          'Link to Community Initiative Project budget tracking',
          'Add to Values Compliance community benefit calculation',
          'Generate receipt for tax record keeping'
        ]
      },
      sophisticatedFeatures: {
        ocrProcessing: 'Advanced text extraction from receipt image',
        projectCategorization: 'AI matching against Notion project database',
        calendarCorrelation: 'Smart analysis of calendar events for business context',
        xeroIntegration: 'Automatic transaction matching and categorization',
        valuesAlignment: 'Community impact assessment for transparency'
      },
      processingTime: '2.3 seconds',
      aiEngine: 'AI Workhouse Receipt Discovery Engine (650+ lines of analysis)',
      timestamp: new Date().toISOString()
    });
  }, 2300); // Simulate processing time
});

// Demo project analysis (showing Intelligence Hub capabilities)  
app.post('/api/demo/project-analysis', (req, res) => {
  const projectDescription = req.body.project || 'Community solar energy initiative';
  
  // Simulate LangGraph multi-agent orchestration
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Project analyzed by Intelligence Hub LangGraph Multi-Agent Orchestration',
      analysis: {
        projectDescription,
        multiAgentWorkflow: {
          routing: 'Intelligent routing to appropriate agents based on project type and requirements',
          agents: [
            {
              agent: 'research-analyst',
              analysis: 'Market research shows strong demand for community solar initiatives in Australia. Government incentives available through Clean Energy Council.',
              confidence: 0.94,
              sources: ['Australian Renewable Energy Agency', 'Clean Energy Council', 'Community energy sector reports'],
              processingTime: '3.2 seconds'
            },
            {
              agent: 'financial-intelligence',
              analysis: 'Initial investment estimated at $150,000-$200,000 AUD. Payback period 4-6 years with current feed-in tariffs.',
              marketRisk: 'Low - stable regulatory environment for renewable energy',
              fundingOptions: ['Community grants', 'Green energy loans', 'Community investment schemes'],
              processingTime: '2.8 seconds'
            },
            {
              agent: 'compliance-officer',
              analysis: 'Project complies with Australian energy regulations. Requires development approval from local council.',
              regulations: ['Electricity Supply Act', 'Local planning requirements', 'Australian Standards for solar installations'],
              auditTrail: 'All compliance checks logged for community transparency',
              processingTime: '1.9 seconds'
            },
            {
              agent: 'community-coordinator',
              analysis: 'High community impact potential. Aligns with ACT values of community empowerment and environmental stewardship.',
              stakeholders: ['Local residents', 'Environmental groups', 'Local council', 'Energy retailers'],
              democraticProcess: 'Recommend community consultation and voting on project parameters',
              processingTime: '2.1 seconds'
            }
          ]
        },
        aggregatedInsights: {
          viabilityScore: 0.87,
          communityBenefit: 'High - local energy independence and environmental impact',
          riskLevel: 'Low-Medium',
          timeToImplementation: '6-12 months',
          recommendedNextSteps: [
            'Conduct detailed community consultation',
            'Engage solar energy consultant for technical assessment', 
            'Apply for relevant grants and funding',
            'Develop project governance framework with community control'
          ]
        },
        valuesAlignment: {
          communityControl: 'High - community owns and operates the solar installation',
          indigenousSovereignty: 'Opportunity to engage Traditional Owners in project design',
          antiExtraction: 'Aligned - generates local energy rather than extracting resources',
          beautifulObsolescence: 'Contributes to community energy independence by 2027'
        }
      },
      sophisticatedFeatures: {
        langGraphOrchestration: 'StateGraph workflow with intelligent agent routing',
        australianCompliance: 'Built-in knowledge of Australian regulations and market conditions',
        communityFirst: 'All analysis prioritizes community benefit over profit extraction',
        realTimeMonitoring: 'Agent performance and health monitoring',
        transparentAI: 'All AI decisions logged for community transparency'
      },
      totalProcessingTime: '4.7 seconds',
      aiEngine: 'Intelligence Hub LangGraph Multi-Agent Orchestration',
      timestamp: new Date().toISOString()
    });
  }, 4700); // Simulate multi-agent processing time
});

// Demo community control metrics (showing Values Compliance capabilities)
app.get('/api/demo/community-metrics', (req, res) => {
  res.json({
    success: true,
    message: 'Community empowerment metrics from Values Integration System',
    publicAccess: true,
    metrics: {
      overallCommunityControl: {
        current: '47%',
        target: '100%',
        timeline: 'Project-specific: 18-36 months per project',
        trend: '+3% this quarter'
      },
      projectSpecificControl: [
        {
          project: 'Community Solar Initiative',
          controlLevel: '25%',
          targetDate: '2026-08-15',
          milestones: [
            { milestone: 'Community consultation completed', status: 'done', date: '2025-02-15' },
            { milestone: 'Technical feasibility study', status: 'in-progress', targetDate: '2025-04-01' },
            { milestone: 'Community ownership structure established', status: 'pending', targetDate: '2025-06-01' },
            { milestone: 'Full community control transfer', status: 'pending', targetDate: '2026-08-15' }
          ]
        },
        {
          project: 'Indigenous Cultural Center',
          controlLevel: '85%',
          acceleratedTimeline: true,
          indigenousLed: true,
          targetDate: '2025-12-01',
          note: 'Accelerated sovereignty timeline for Indigenous projects'
        }
      ],
      indigenousSovereignty: {
        status: 'Protected and accelerated',
        framework: 'All Indigenous-led projects achieve 100% sovereignty within 12 months',
        currentProjects: 3,
        completedTransfers: 1
      },
      valuesEnforcement: {
        checks: 1247,
        violations: 0,
        communityCompliance: '100%',
        lastCheck: new Date().toISOString(),
        automatedMonitoring: true
      },
      beautifulObsolescence: {
        target: '2027',
        description: 'ACT working towards community empowerment and beautiful obsolescence',
        progress: [
          'Community control mechanisms established',
          'Values compliance system operational', 
          'Project-specific handover timelines defined',
          'Indigenous sovereignty frameworks accelerated'
        ]
      }
    },
    transparencyFeatures: {
      publicAccess: 'Community control metrics available to all community members',
      realTimeUpdates: 'Values compliance monitored in real-time across all platform interactions',
      auditTrail: 'All values enforcement decisions logged for community review',
      democraticOversight: 'Community can review and adjust values framework through democratic process'
    },
    communityMessage: 'These metrics demonstrate ACT\'s commitment to genuine community empowerment',
    timestamp: new Date().toISOString(),
    timezone: TIMEZONE
  });
});

// Serve demo frontend
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ACT Universal AI Platform - Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header .flag { font-size: 1.5em; margin: 0 10px; }
        .subtitle { font-size: 1.2em; opacity: 0.9; margin-bottom: 10px; }
        .discovery { 
            background: rgba(255,255,255,0.1); 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px 0;
            border-left: 4px solid #ffd700;
        }
        .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .service { 
            background: rgba(255,255,255,0.1); 
            border-radius: 10px; 
            padding: 20px;
            transition: transform 0.3s ease;
        }
        .service:hover { transform: translateY(-5px); }
        .service h3 { color: #ffd700; margin-bottom: 15px; }
        .service ul { list-style: none; }
        .service li { margin: 8px 0; padding-left: 20px; position: relative; }
        .service li:before { content: '🤖'; position: absolute; left: 0; }
        .demo-actions { margin: 40px 0; text-align: center; }
        .demo-btn { 
            background: #ffd700; 
            color: #1e3c72; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 25px;
            font-size: 1em;
            font-weight: bold;
            margin: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .demo-btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(255,215,0,0.4); }
        .result { 
            background: rgba(0,0,0,0.3); 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px 0;
            max-height: 400px;
            overflow-y: auto;
        }
        .loading { text-align: center; padding: 20px; }
        .spinner { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .highlight { background: rgba(255,215,0,0.2); padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="flag">🇦🇺</span> ACT Universal AI Platform <span class="flag">🇦🇺</span></h1>
            <div class="subtitle">Business Development Command Center</div>
            <div class="subtitle"><em>Integration Demo for Existing Sophisticated AI Infrastructure</em></div>
        </div>

        <div class="discovery">
            <h2>🔍 Critical Discovery</h2>
            <p><strong>Your existing codebase IS the world-class business development platform!</strong></p>
            <p>Instead of building new microservices, this demo shows how to integrate the sophisticated systems you already have:</p>
            <ul style="margin-top: 15px;">
                <li><span class="highlight">Intelligence Hub</span>: LangGraph multi-agent orchestration with 4 specialized AI agents</li>
                <li><span class="highlight">AI Workhouse</span>: 650+ lines of financial intelligence with receipt discovery and Xero integration</li>
                <li><span class="highlight">Values Integration System</span>: Australian-compliant community empowerment monitoring</li>
            </ul>
        </div>

        <div class="services">
            <div class="service">
                <h3>🧠 Intelligence Hub</h3>
                <p><strong>LangGraph Multi-Agent Orchestration</strong></p>
                <ul>
                    <li>Financial Intelligence Agent</li>
                    <li>Research Analyst Agent</li>
                    <li>Compliance Officer Agent</li>
                    <li>Community Coordinator Agent</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">Advanced StateGraph routing with Australian compliance and community-first principles</p>
            </div>

            <div class="service">
                <h3>💰 AI Workhouse</h3>
                <p><strong>Financial Intelligence Platform</strong></p>
                <ul>
                    <li>AI-powered receipt discovery (650+ lines)</li>
                    <li>Complete Xero API integration</li>
                    <li>Smart expense categorization</li>
                    <li>Calendar-contextual analysis</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">Sophisticated financial automation with gamification and business intelligence</p>
            </div>

            <div class="service">
                <h3>⚖️ Values Integration System</h3>
                <p><strong>Community Empowerment Monitoring</strong></p>
                <ul>
                    <li>Real-time community control tracking</li>
                    <li>Indigenous sovereignty protection</li>
                    <li>Values compliance enforcement</li>
                    <li>Beautiful obsolescence timeline (2027)</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.8;">Project-specific community handover with accelerated Indigenous frameworks</p>
            </div>
        </div>

        <div class="demo-actions">
            <h2>🚀 Try the Integration Demo</h2>
            <p style="margin-bottom: 20px;">These demos show how your existing AI services would work together:</p>
            
            <button class="demo-btn" onclick="demoReceipt()">
                🧾 Demo Receipt Analysis
            </button>
            <button class="demo-btn" onclick="demoProject()">
                📊 Demo Project Intelligence
            </button>
            <button class="demo-btn" onclick="demoCommunity()">
                🌱 Demo Community Control
            </button>
            <button class="demo-btn" onclick="loadDashboard()">
                📋 View Full Dashboard
            </button>
        </div>

        <div id="result" class="result" style="display: none;"></div>
    </div>

    <script>
        async function demoReceipt() {
            showResult('Loading...', '<div class="loading"><span class="spinner">🔄</span> AI Workhouse processing receipt with sophisticated analysis...</div>');
            
            try {
                const response = await fetch('/api/demo/receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receipt: 'Coffee meeting with community solar project stakeholder - $25.50' })
                });
                const data = await response.json();
                showResult('Receipt Analysis Results', formatJSON(data));
            } catch (error) {
                showResult('Error', 'Failed to demonstrate receipt analysis: ' + error.message);
            }
        }

        async function demoProject() {
            showResult('Loading...', '<div class="loading"><span class="spinner">🔄</span> Intelligence Hub agents analyzing project with LangGraph orchestration...</div>');
            
            try {
                const response = await fetch('/api/demo/project-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project: 'Community solar energy initiative for Indigenous community empowerment' })
                });
                const data = await response.json();
                showResult('Project Intelligence Analysis', formatJSON(data));
            } catch (error) {
                showResult('Error', 'Failed to demonstrate project analysis: ' + error.message);
            }
        }

        async function demoCommunity() {
            showResult('Loading...', '<div class="loading"><span class="spinner">🔄</span> Values Integration System retrieving community metrics...</div>');
            
            try {
                const response = await fetch('/api/demo/community-metrics');
                const data = await response.json();
                showResult('Community Control Metrics', formatJSON(data));
            } catch (error) {
                showResult('Error', 'Failed to demonstrate community metrics: ' + error.message);
            }
        }

        async function loadDashboard() {
            showResult('Loading...', '<div class="loading"><span class="spinner">🔄</span> Loading Business Development Dashboard...</div>');
            
            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                showResult('Business Development Dashboard', formatJSON(data));
            } catch (error) {
                showResult('Error', 'Failed to load dashboard: ' + error.message);
            }
        }

        function showResult(title, content) {
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.innerHTML = '<h3>' + title + '</h3>' + content;
            result.scrollIntoView({ behavior: 'smooth' });
        }

        function formatJSON(data) {
            return '<pre style="white-space: pre-wrap; font-size: 0.9em; line-height: 1.4;">' + 
                   JSON.stringify(data, null, 2) + '</pre>';
        }

        // Load dashboard by default
        setTimeout(loadDashboard, 1000);
    </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('✅ ACT Universal AI Platform Demo running!');
  console.log('');
  console.log('🌐 Demo URL: http://localhost:' + PORT);
  console.log('📊 Dashboard API: http://localhost:' + PORT + '/api/dashboard');
  console.log('🏥 Health Check: http://localhost:' + PORT + '/health');
  console.log('');
  console.log('🚀 This demonstrates integration of your existing sophisticated AI infrastructure:');
  console.log('   • Intelligence Hub (LangGraph Multi-Agent Orchestration)');
  console.log('   • AI Workhouse (650+ lines of Financial Intelligence)');
  console.log('   • Values Integration System (Community Empowerment)');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('   1. Deploy existing AI services with proper integration');
  console.log('   2. Build unified frontend interface');
  console.log('   3. Create real workflows between existing systems');
  console.log('   4. Focus on user experience, not rebuilding');
  console.log('');
  console.log('💡 The existing codebase IS the world-class business platform!');
  console.log('');
  console.log('Press Ctrl+C to stop the demo');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ACT Platform Demo...');
  console.log('👋 Thanks for exploring the integration possibilities!');
  process.exit(0);
});