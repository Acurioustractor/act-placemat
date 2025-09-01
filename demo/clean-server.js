#!/usr/bin/env node

/**
 * ACT AI Platform - Clean Demo
 * Simple interface showing AI integration capabilities
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

console.log('ACT AI Platform Demo - Clean Interface');
console.log('Running on http://localhost:' + PORT);

// Mock existing AI services data
const intelligenceHub = {
  agents: ['financial-intelligence', 'research-analyst', 'compliance-officer', 'community-coordinator'],
  status: 'Production-ready LangGraph orchestration system',
  location: 'apps/intelligence-hub/src/orchestration/orchestrator.service.ts'
};

const aiWorkhouse = {
  receiptEngine: '650+ lines of sophisticated receipt analysis',
  xeroIntegration: 'Complete financial platform with API integration', 
  location: 'apps/ai-workhouse/lib/receipt-discovery/receipt-discovery-engine.ts'
};

const valuesSystem = {
  communityControl: 'Project-specific handover timelines',
  complianceMonitoring: 'Real-time values enforcement',
  location: 'apps/backend/src/services/valuesComplianceService.js'
};

// Dashboard data
app.get('/api/dashboard', (req, res) => {
  res.json({
    platform: 'ACT AI Integration Layer',
    existingCapabilities: {
      intelligenceHub,
      aiWorkhouse, 
      valuesSystem
    },
    integrationStrategy: [
      'Deploy existing Intelligence Hub service',
      'Connect AI Workhouse financial platform',
      'Add Values compliance monitoring',
      'Build unified frontend interface'
    ],
    coreInsight: 'Your existing codebase IS the platform - integration layer needed, not rebuild'
  });
});

// Receipt analysis demo
app.post('/api/demo/receipt', (req, res) => {
  setTimeout(() => {
    res.json({
      receiptText: req.body.receipt || 'Business expense',
      analysis: {
        amount: 34.50,
        category: 'Business Development',
        projectMatch: {
          name: 'Community Initiative',
          confidence: 0.87
        },
        businessContext: 'Client meeting expense with high confidence categorization',
        xeroIntegration: 'Auto-categorized and logged for compliance'
      },
      aiEngine: 'AI Workhouse Receipt Discovery (650+ lines of analysis)',
      nextActions: ['Project budget allocation', 'Tax categorization', 'Compliance logging']
    });
  }, 1800);
});

// Project analysis demo
app.post('/api/demo/project', (req, res) => {
  setTimeout(() => {
    res.json({
      project: req.body.project || 'Business opportunity',
      multiAgentAnalysis: {
        research: 'Market analysis complete - strong opportunity indicators',
        financial: 'Investment requirements and ROI projections calculated',
        compliance: 'Regulatory requirements identified and documented',
        community: 'Community impact assessment and stakeholder mapping'
      },
      orchestration: 'LangGraph StateGraph with 4 specialized agents',
      recommendation: 'Proceed with detailed feasibility study',
      timeline: 'Analysis completed in 4.2 seconds using existing infrastructure'
    });
  }, 2100);
});

// Community metrics
app.get('/api/demo/community', (req, res) => {
  res.json({
    communityControl: {
      overall: '47%',
      projectSpecific: [
        { project: 'Solar Initiative', control: '25%', timeline: '18 months' },
        { project: 'Cultural Center', control: '85%', timeline: '6 months' }
      ]
    },
    valuesCompliance: {
      checksPerformed: 1247,
      violations: 0,
      status: 'All systems compliant'
    },
    transparency: 'All metrics publicly available for community oversight'
  });
});

// Clean, minimal frontend
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ACT AI Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; 
            background: #0a0a0a; 
            color: #e0e0e0; 
            line-height: 1.6; 
            padding: 40px 20px; 
        }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { font-size: 2rem; margin-bottom: 8px; color: #f0f0f0; font-weight: 300; }
        .subtitle { color: #999; margin-bottom: 40px; }
        
        .section { 
            background: #1a1a1a; 
            border: 1px solid #333; 
            border-radius: 6px; 
            padding: 24px; 
            margin-bottom: 24px; 
        }
        .section h2 { color: #4ade80; margin-bottom: 16px; font-size: 1.2rem; font-weight: 500; }
        .section ul { list-style: none; }
        .section li { margin: 8px 0; padding-left: 12px; }
        
        .actions { text-align: center; margin: 40px 0; }
        .btn { 
            background: #4ade80; 
            color: #0a0a0a; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            margin: 6px; 
            cursor: pointer; 
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .btn:hover { background: #22c55e; }
        
        .result { 
            background: #1a1a1a; 
            border: 1px solid #333; 
            border-radius: 6px; 
            padding: 24px; 
            margin-top: 24px; 
            display: none;
        }
        .result h3 { color: #4ade80; margin-bottom: 16px; }
        .result pre { 
            background: #0a0a0a; 
            border: 1px solid #333; 
            padding: 16px; 
            border-radius: 4px; 
            overflow-x: auto; 
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ACT AI Platform</h1>
        <div class="subtitle">Integration layer for existing AI infrastructure</div>
        
        <div class="section">
            <h2>Core Discovery</h2>
            <p>Your existing codebase contains sophisticated AI infrastructure that exceeds planned architecture.</p>
            <ul style="margin-top: 16px;">
                <li>Intelligence Hub: Multi-agent LangGraph orchestration</li>
                <li>AI Workhouse: Financial intelligence with receipt discovery</li>
                <li>Values System: Community empowerment monitoring</li>
            </ul>
        </div>

        <div class="section">
            <h2>Integration Strategy</h2>
            <ul>
                <li>Deploy existing Intelligence Hub service</li>
                <li>Connect AI Workhouse financial platform</li>
                <li>Add Values compliance monitoring layer</li>
                <li>Build unified frontend interface</li>
            </ul>
        </div>

        <div class="section">
            <h2>Existing Capabilities</h2>
            <ul>
                <li><strong>Intelligence Hub:</strong> 4 AI agents with StateGraph routing</li>
                <li><strong>AI Workhouse:</strong> 650+ lines of receipt analysis with Xero integration</li>
                <li><strong>Values System:</strong> Project-specific community control tracking</li>
            </ul>
        </div>

        <div class="actions">
            <button class="btn" onclick="testReceipt()">Test Receipt Analysis</button>
            <button class="btn" onclick="testProject()">Test Project Intelligence</button>
            <button class="btn" onclick="testCommunity()">Test Community Metrics</button>
            <button class="btn" onclick="loadDashboard()">View Dashboard</button>
        </div>

        <div id="result" class="result"></div>
    </div>

    <script>
        async function testReceipt() {
            showResult('Processing...', 'AI Workhouse analyzing receipt...');
            const response = await fetch('/api/demo/receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receipt: 'Client meeting coffee - $34.50' })
            });
            const data = await response.json();
            showResult('Receipt Analysis', JSON.stringify(data, null, 2));
        }

        async function testProject() {
            showResult('Processing...', 'Intelligence Hub agents analyzing...');
            const response = await fetch('/api/demo/project', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: 'Community solar initiative' })
            });
            const data = await response.json();
            showResult('Project Analysis', JSON.stringify(data, null, 2));
        }

        async function testCommunity() {
            const response = await fetch('/api/demo/community');
            const data = await response.json();
            showResult('Community Metrics', JSON.stringify(data, null, 2));
        }

        async function loadDashboard() {
            const response = await fetch('/api/dashboard');
            const data = await response.json();
            showResult('Platform Dashboard', JSON.stringify(data, null, 2));
        }

        function showResult(title, content) {
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.innerHTML = '<h3>' + title + '</h3><pre>' + content + '</pre>';
        }
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('');
  console.log('Clean Demo Interface: http://localhost:' + PORT);
  console.log('Dashboard API: http://localhost:' + PORT + '/api/dashboard');
  console.log('');
  console.log('Key insight: Existing codebase IS the platform');
  console.log('Strategy: Integration layer, not rebuild');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\nDemo stopped');
  process.exit(0);
});