#!/usr/bin/env node

// Setup Script for Real Notion Data Integration
// Run this to test and configure your Notion connection

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('\n🚀 ACT Placemat - Real Data Setup\n');

async function checkEnvironment() {
    console.log('1️⃣  Checking Environment Configuration...');
    
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    // Check if .env exists
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env file not found');
        
        if (fs.existsSync(envExamplePath)) {
            console.log('📝 Creating .env from .env.example...');
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ .env file created');
            console.log('⚠️  Please edit .env file with your Notion credentials');
            return false;
        } else {
            console.log('❌ .env.example not found');
            return false;
        }
    }
    
    // Check required environment variables
    const requiredVars = [
        'NOTION_TOKEN',
        'NOTION_DATABASE_ID'
    ];
    
    const missingVars = [];
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        console.log('❌ Missing required environment variables:');
        missingVars.forEach(varName => {
            console.log(`   - ${varName}`);
        });
        console.log('\n📝 Please edit your .env file and add these values');
        return false;
    }
    
    console.log('✅ Environment configuration complete');
    return true;
}

async function testNotionConnection() {
    console.log('\n2️⃣  Testing Notion Connection...');
    
    try {
        const { PlacematNotionIntegrationEnhanced } = require('./notion-mcp-enhanced.js');
        const notion = new PlacematNotionIntegrationEnhanced();
        
        console.log('🔍 Fetching projects from Notion...');
        const projects = await notion.getProjects(false); // Force fresh fetch, no cache
        
        if (projects && projects.length > 0) {
            console.log(`✅ Successfully connected to Notion`);
            console.log(`📊 Found ${projects.length} projects:`);
            
            projects.slice(0, 3).forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.name || 'Untitled'} (${project.status || 'Unknown status'})`);
            });
            
            if (projects.length > 3) {
                console.log(`   ... and ${projects.length - 3} more projects`);
            }
            
            return { success: true, projects };
        } else {
            console.log('⚠️  Connected to Notion but no projects found');
            console.log('   This might mean:');
            console.log('   - Database is empty');
            console.log('   - Integration doesn\'t have access to the database');
            console.log('   - Database ID is incorrect');
            return { success: false, error: 'No projects found' };
        }
        
    } catch (error) {
        console.log('❌ Failed to connect to Notion');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('401')) {
            console.log('   → Check your NOTION_TOKEN is correct');
        } else if (error.message.includes('404')) {
            console.log('   → Check your NOTION_DATABASE_ID is correct');
            console.log('   → Ensure integration has access to the database');
        } else if (error.message.includes('403')) {
            console.log('   → Integration needs to be shared with the database');
        }
        
        return { success: false, error: error.message };
    }
}

async function analyzeProjectData(projects) {
    console.log('\n3️⃣  Analyzing Project Data Structure...');
    
    if (!projects || projects.length === 0) {
        console.log('❌ No projects to analyze');
        return;
    }
    
    const sampleProject = projects[0];
    const fields = Object.keys(sampleProject);
    
    console.log('📋 Available project fields:');
    
    // Core fields
    const coreFields = ['name', 'description', 'status', 'area'];
    const financialFields = ['revenueActual', 'revenuePotential', 'actualIncoming', 'potentialIncoming'];
    const dateFields = ['startDate', 'endDate', 'nextMilestone'];
    const relationshipFields = ['relatedOpportunities', 'partnerOrganizations', 'projectArtifacts'];
    const aiFields = ['aiSummary'];
    
    console.log('\n   Core Information:');
    coreFields.forEach(field => {
        const hasData = sampleProject[field] ? '✅' : '❌';
        const value = sampleProject[field] || 'Not set';
        console.log(`   ${hasData} ${field}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
    });
    
    console.log('\n   Financial Data:');
    financialFields.forEach(field => {
        const hasData = sampleProject[field] ? '✅' : '❌';
        const value = sampleProject[field] || 'Not set';
        console.log(`   ${hasData} ${field}: ${value}`);
    });
    
    console.log('\n   AI Enhancement:');
    aiFields.forEach(field => {
        const hasData = sampleProject[field] ? '✅' : '❌';
        const value = sampleProject[field] || 'Not set';
        console.log(`   ${hasData} ${field}: ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
    });
    
    console.log('\n   Relationships (for future databases):');
    relationshipFields.forEach(field => {
        const hasData = sampleProject[field] && sampleProject[field].length > 0 ? '🔗' : '⏳';
        const count = Array.isArray(sampleProject[field]) ? sampleProject[field].length : 0;
        console.log(`   ${hasData} ${field}: ${count} connections`);
    });
}

async function checkEnhancedProjectsPage() {
    console.log('\n4️⃣  Checking Enhanced Projects Page...');
    
    try {
        const fetch = require('node-fetch');
        const response = await fetch('http://localhost:58548/projects');
        
        if (response.ok) {
            console.log('✅ Enhanced projects page is accessible');
            console.log('🌐 Visit: http://localhost:58548/projects');
        } else {
            console.log('❌ Enhanced projects page not accessible');
            console.log('   Make sure server is running: PORT=58548 node server.js');
        }
    } catch (error) {
        console.log('❌ Cannot reach enhanced projects page');
        console.log('   Make sure server is running: PORT=58548 node server.js');
    }
}

async function generateSetupSummary(envConfigured, notionConnected, projectData) {
    console.log('\n📊 SETUP SUMMARY');
    console.log('=====================================');
    
    if (envConfigured && notionConnected && projectData.success) {
        console.log('🎉 SUCCESS: Real data integration working!');
        console.log('\n✅ Next Steps:');
        console.log('   1. Visit http://localhost:58548/projects');
        console.log('   2. Verify real Notion projects are displayed');
        console.log('   3. Check AI summary field (may be empty initially)');
        console.log('   4. Plan opportunities database creation');
        
        console.log('\n🚀 Ready for Phase 2:');
        console.log('   - Create Opportunities database in Notion');
        console.log('   - Add Organizations and People databases');
        console.log('   - Implement full ecosystem connections');
        
    } else {
        console.log('⚠️  SETUP INCOMPLETE');
        
        if (!envConfigured) {
            console.log('\n❌ Environment Configuration:');
            console.log('   - Edit .env file with your Notion credentials');
            console.log('   - Add NOTION_TOKEN and NOTION_DATABASE_ID');
        }
        
        if (!notionConnected) {
            console.log('\n❌ Notion Connection:');
            console.log('   - Verify integration token is correct');
            console.log('   - Check database ID is correct');
            console.log('   - Ensure integration has access to database');
        }
        
        console.log('\n📚 Help Resources:');
        console.log('   - REAL_DATA_INTEGRATION_ROADMAP.md');
        console.log('   - QUICKSTART.md');
        console.log('   - Notion integration setup: https://www.notion.so/my-integrations');
    }
}

async function runSetup() {
    try {
        const envConfigured = await checkEnvironment();
        
        if (!envConfigured) {
            await generateSetupSummary(false, false, { success: false });
            return;
        }
        
        const notionResult = await testNotionConnection();
        
        if (notionResult.success) {
            await analyzeProjectData(notionResult.projects);
        }
        
        await checkEnhancedProjectsPage();
        await generateSetupSummary(envConfigured, notionResult.success, notionResult);
        
    } catch (error) {
        console.error('\n💥 Setup failed with error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your .env file configuration');
        console.log('   2. Verify Notion integration setup');
        console.log('   3. Ensure server dependencies are installed: npm install');
    }
}

// Run the setup
runSetup();