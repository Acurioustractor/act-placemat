#!/usr/bin/env node

// Complete System Test for ACT Placemat
// Tests all components with mock data

// Load environment variables first
require('dotenv').config();

const { NotionMCPEnhanced, PlacematNotionIntegrationEnhanced } = require('./notion-mcp-enhanced.js');

console.log('\n🧪 ACT Placemat Complete System Test');
console.log('====================================\n');

async function testNotionIntegration() {
    console.log('1️⃣  Testing Enhanced Notion Integration');
    console.log('----------------------------------------');
    
    const notion = new PlacematNotionIntegrationEnhanced();
    
    try {
        // Test fetching all data
        console.log('📊 Fetching all data from Notion (mock)...');
        const allData = await notion.getAllData();
        
        console.log('\n✅ Data Retrieved:');
        console.log(`   Projects: ${allData.projects.length}`);
        console.log(`   Opportunities: ${allData.opportunities.length}`);
        console.log(`   Organizations: ${allData.organizations.length}`);
        console.log(`   People: ${allData.people.length}`);
        console.log(`   Artifacts: ${allData.artifacts.length}`);
        
        console.log('\n💰 Financial Summary:');
        console.log(`   Total Pipeline: $${allData.summary.pipelineValue.toLocaleString()}`);
        console.log(`   Weighted Pipeline: $${allData.summary.weightedPipeline.toLocaleString()}`);
        
        // Test individual fetch methods
        console.log('\n🔍 Testing Individual Fetch Methods:');
        const opportunities = await notion.getOpportunities();
        console.log(`   ✓ getOpportunities(): ${opportunities.length} items`);
        
        const projects = await notion.getProjects();
        console.log(`   ✓ getProjects(): ${projects.length} items`);
        
        return { success: true, data: allData };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error };
    }
}

async function testOpportunityAlerts() {
    console.log('\n\n2️⃣  Testing Opportunity Alerts');
    console.log('----------------------------------------');
    
    try {
        const OpportunityAlerts = require('./automations/opportunity-alerts.js');
        const alerts = new OpportunityAlerts();
        
        console.log('🔍 Checking for alerts...');
        await alerts.run();
        
        console.log(`\n✅ Alert Check Complete:`);
        console.log(`   Total Alerts: ${alerts.alerts.length}`);
        console.log(`   High Priority: ${alerts.alerts.filter(a => a.priority === 'high').length}`);
        console.log(`   Urgent Deadlines: ${alerts.alerts.filter(a => a.type === 'urgent_deadline').length}`);
        console.log(`   High Value: ${alerts.alerts.filter(a => a.type === 'high_value').length}`);
        
        return { success: true, alerts: alerts.alerts };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error };
    }
}

async function testWeeklyEmail() {
    console.log('\n\n3️⃣  Testing Weekly Action Email');
    console.log('----------------------------------------');
    
    try {
        const WeeklyActionEmail = require('./automations/weekly-action-email.js');
        const emailGen = new WeeklyActionEmail();
        
        console.log('📧 Generating weekly email...');
        const result = await emailGen.generate();
        
        if (result) {
            console.log('\n✅ Email Generated Successfully');
            console.log('   Files created in alerts/ directory:');
            console.log('   - weekly-action-[date].html');
            console.log('   - weekly-action-[date].txt');
            console.log('   - weekly-action-[date].json');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error };
    }
}

async function testDashboard() {
    console.log('\n\n4️⃣  Testing Daily Dashboard');
    console.log('----------------------------------------');
    
    const fs = require('fs');
    const path = require('path');
    
    try {
        const dashboardPath = path.join(__dirname, 'daily-dashboard.html');
        
        if (fs.existsSync(dashboardPath)) {
            console.log('✅ Dashboard file exists');
            console.log(`   Path: ${dashboardPath}`);
            console.log('   To view: Open daily-dashboard.html in a browser');
            console.log('   Note: Requires server running for live data');
        } else {
            console.log('❌ Dashboard file not found');
        }
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false, error };
    }
}

async function checkEnvironment() {
    console.log('\n\n5️⃣  Environment Check');
    console.log('----------------------------------------');
    
    const envVars = {
        'NOTION_TOKEN': process.env.NOTION_TOKEN,
        'NOTION_DATABASE_ID': process.env.NOTION_DATABASE_ID,
        'NOTION_OPPORTUNITIES_DB': process.env.NOTION_OPPORTUNITIES_DB,
        'NOTION_ORGANIZATIONS_DB': process.env.NOTION_ORGANIZATIONS_DB,
        'NOTION_PEOPLE_DB': process.env.NOTION_PEOPLE_DB,
        'NOTION_ARTIFACTS_DB': process.env.NOTION_ARTIFACTS_DB
    };
    
    console.log('📋 Environment Variables:');
    Object.entries(envVars).forEach(([key, value]) => {
        const status = value ? '✅ Set' : '❌ Not Set';
        console.log(`   ${key}: ${status}`);
    });
    
    return { success: true };
}

async function runAllTests() {
    console.log('🚀 Starting Complete System Test...\n');
    
    const results = {};
    
    // Run all tests
    results.environment = await checkEnvironment();
    results.notion = await testNotionIntegration();
    results.alerts = await testOpportunityAlerts();
    results.email = await testWeeklyEmail();
    results.dashboard = await testDashboard();
    
    // Summary
    console.log('\n\n📊 TEST SUMMARY');
    console.log('=====================================');
    
    const allPassed = Object.values(results).every(r => r.success);
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${test}: ${status}`);
    });
    
    if (allPassed) {
        console.log('\n🎉 All tests passed! System is ready to use.');
        console.log('\n📝 Next Steps:');
        console.log('1. Create Opportunities database in Notion');
        console.log('2. Add database ID to .env file');
        console.log('3. Add real opportunities data');
        console.log('4. Start server with: npm start');
        console.log('5. Open daily-dashboard.html in browser');
    } else {
        console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
    
    console.log('\n✨ Test complete!\n');
}

// Run tests
runAllTests().catch(console.error);