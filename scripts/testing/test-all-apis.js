/**
 * Comprehensive API Test Suite
 *
 * Tests all ACT platform APIs and integrations:
 * - Supabase connection and tables
 * - Notion API and databases
 * - Gmail intelligence integration
 * - Calendar integration
 * - Sync service functionality
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import { SupabaseNotionSync } from './apps/backend/core/src/services/supabaseNotionSync.js';
import 'dotenv/config';

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

function addTest(name, status, details, warning = false) {
  const test = {
    name,
    status, // 'passed', 'failed', 'warning'
    details,
    warning
  };

  results.tests.push(test);
  results.summary.total++;

  if (status === 'passed') results.summary.passed++;
  else if (status === 'failed') results.summary.failed++;
  if (warning) results.summary.warnings++;

  const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  console.log(`${emoji} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase Connection...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection
    const { data, error } = await supabase
      .from('contact_cadence_metrics')
      .select('contact_id')
      .limit(1);

    if (error) {
      addTest('Supabase Connection', 'failed', `Error: ${error.message}`);
      return false;
    }

    addTest('Supabase Connection', 'passed', `URL: ${process.env.SUPABASE_URL}`);

    // Test contact_cadence_metrics table
    const { data: cadenceData, error: cadenceError, count } = await supabase
      .from('contact_cadence_metrics')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (cadenceError) {
      addTest('contact_cadence_metrics Table', 'failed', cadenceError.message);
    } else {
      addTest('contact_cadence_metrics Table', 'passed',
        `Found ${count} records. Sample fields: ${Object.keys(cadenceData[0] || {}).join(', ')}`);

      if (count === 0) {
        addTest('contact_cadence_metrics Data', 'warning',
          'Table is empty - may need to run Gmail sync first', true);
      }
    }

    // Test community_emails table
    const { data: emailData, error: emailError, count: emailCount } = await supabase
      .from('community_emails')
      .select('*', { count: 'exact' })
      .limit(1);

    if (emailError) {
      addTest('community_emails Table', 'failed', emailError.message);
    } else {
      addTest('community_emails Table', 'passed', `Found ${emailCount} processed emails`);
    }

    // Test gmail_notion_contacts table
    const { data: mappingData, error: mappingError, count: mappingCount } = await supabase
      .from('gmail_notion_contacts')
      .select('*', { count: 'exact' })
      .limit(1);

    if (mappingError) {
      addTest('gmail_notion_contacts Table', 'failed', mappingError.message);
    } else {
      addTest('gmail_notion_contacts Table', 'passed',
        `Found ${mappingCount} email-to-notion mappings`);
    }

    // Test project_support_graph table
    const { data: projectData, error: projectError } = await supabase
      .from('project_support_graph')
      .select('*', { count: 'exact' })
      .limit(1);

    if (projectError) {
      addTest('project_support_graph Table', 'warning',
        'Table may not exist yet - will be created in Phase 3', true);
    } else {
      addTest('project_support_graph Table', 'passed', 'Project intelligence ready');
    }

    // Test outreach_tasks table
    const { data: outreachData, error: outreachError } = await supabase
      .from('outreach_tasks')
      .select('*', { count: 'exact' })
      .limit(1);

    if (outreachError) {
      addTest('outreach_tasks Table', 'warning',
        'Table may not exist yet - will be used in Phase 2', true);
    } else {
      addTest('outreach_tasks Table', 'passed', 'Outreach automation ready');
    }

    return true;
  } catch (error) {
    addTest('Supabase Setup', 'failed', `Exception: ${error.message}`);
    return false;
  }
}

async function testNotionConnection() {
  console.log('\n🔍 Testing Notion Connection...\n');

  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    // Test People database
    if (!process.env.NOTION_PEOPLE_DATABASE_ID) {
      addTest('Notion People Database', 'failed',
        'NOTION_PEOPLE_DATABASE_ID not set in environment');
      return false;
    }

    const peopleDb = await notion.databases.retrieve({
      database_id: process.env.NOTION_PEOPLE_DATABASE_ID
    });

    addTest('Notion People Database', 'passed',
      `Title: ${peopleDb.title[0]?.plain_text || 'People'}`);

    // Query for people with emails
    const peopleQuery = await notion.databases.query({
      database_id: process.env.NOTION_PEOPLE_DATABASE_ID,
      page_size: 10
    });

    const peopleWithEmails = peopleQuery.results.filter(page => {
      const emailProp = page.properties['Email'] || page.properties['email'];
      return emailProp?.email;
    });

    addTest('People with Emails', 'passed',
      `Found ${peopleWithEmails.length}/10 sampled people have email addresses`);

    if (peopleWithEmails.length === 0) {
      addTest('Email Coverage', 'warning',
        'No emails found in sample - contact matching may not work', true);
    }

    // Test Communications Dashboard
    if (!process.env.NOTION_COMMUNICATIONS_DATABASE_ID) {
      addTest('Communications Dashboard', 'warning',
        'NOTION_COMMUNICATIONS_DATABASE_ID not set - add to .env', true);
      return true;
    }

    const commsDb = await notion.databases.retrieve({
      database_id: process.env.NOTION_COMMUNICATIONS_DATABASE_ID
    });

    addTest('Communications Dashboard', 'passed',
      `Title: ${commsDb.title[0]?.plain_text || 'Communications'}`);

    // Check for required properties
    const props = commsDb.properties;
    const requiredProps = [
      'Contact Person',
      'Last Contact Date',
      'Next Contact Due'
    ];

    const missingProps = [];
    requiredProps.forEach(propName => {
      if (!props[propName]) {
        missingProps.push(propName);
      }
    });

    if (missingProps.length > 0) {
      addTest('Communications Schema', 'warning',
        `Missing properties: ${missingProps.join(', ')}`, true);
    } else {
      addTest('Communications Schema', 'passed', 'All required properties exist');
    }

    // Count existing records
    const commsQuery = await notion.databases.query({
      database_id: process.env.NOTION_COMMUNICATIONS_DATABASE_ID
    });

    addTest('Communications Records', 'passed',
      `Found ${commsQuery.results.length} existing records`);

    // Test Actions database
    if (process.env.NOTION_ACTIONS_DATABASE_ID) {
      const actionsQuery = await notion.databases.query({
        database_id: process.env.NOTION_ACTIONS_DATABASE_ID,
        page_size: 10
      });

      addTest('Actions Database', 'passed',
        `Sampled ${actionsQuery.results.length} actions`);
    } else {
      addTest('Actions Database', 'warning',
        'NOTION_ACTIONS_DATABASE_ID not set', true);
    }

    return true;
  } catch (error) {
    addTest('Notion Setup', 'failed', `Exception: ${error.message}`);

    if (error.code === 'unauthorized') {
      addTest('Notion Token', 'failed',
        'NOTION_TOKEN is invalid - check your integration token');
    } else if (error.code === 'object_not_found') {
      addTest('Database Access', 'failed',
        'Database not found or integration not granted access');
    }

    return false;
  }
}

async function testSyncService() {
  console.log('\n🔍 Testing Sync Service...\n');

  try {
    const sync = new SupabaseNotionSync();

    // Test initialization
    const initialized = await sync.initialize();

    if (!initialized) {
      addTest('Sync Service Initialization', 'failed',
        'Service failed to initialize');
      return false;
    }

    addTest('Sync Service Initialization', 'passed',
      'Service initialized successfully');

    // Test contact matching (dry run)
    const dryRunResults = await sync.syncContactCadenceToNotion({
      dryRun: true,
      limit: 5
    });

    if (dryRunResults.contactsMatched > 0) {
      addTest('Contact Matching', 'passed',
        `Matched ${dryRunResults.contactsMatched} contacts in dry run`);
    } else {
      addTest('Contact Matching', 'warning',
        'No contacts matched - check email addresses in Supabase and Notion', true);
    }

    if (dryRunResults.errors.length > 0) {
      addTest('Sync Errors', 'warning',
        `${dryRunResults.errors.length} errors in dry run: ${dryRunResults.errors[0]?.error}`, true);
    } else {
      addTest('Sync Error Handling', 'passed', 'No errors in dry run');
    }

    // Test status reporting
    const status = sync.getStatus();
    addTest('Status Reporting', 'passed',
      `Capabilities: ${status.capabilities.length} features available`);

    return true;
  } catch (error) {
    addTest('Sync Service', 'failed', `Exception: ${error.message}`);
    return false;
  }
}

async function testEnvironment() {
  console.log('\n🔍 Testing Environment Configuration...\n');

  const requiredVars = {
    'NOTION_TOKEN': 'Notion API integration token',
    'SUPABASE_URL': 'Supabase project URL',
    'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key',
    'NOTION_PEOPLE_DATABASE_ID': 'People database ID',
  };

  const optionalVars = {
    'NOTION_COMMUNICATIONS_DATABASE_ID': 'Communications Dashboard ID',
    'NOTION_ACTIONS_DATABASE_ID': 'Actions database ID',
    'GMAIL_CLIENT_ID': 'Gmail API credentials',
    'GOOGLE_CLIENT_ID': 'Google Calendar credentials',
  };

  Object.entries(requiredVars).forEach(([key, description]) => {
    if (process.env[key]) {
      const preview = process.env[key].substring(0, 20) + '...';
      addTest(`ENV: ${key}`, 'passed', `${description} (${preview})`);
    } else {
      addTest(`ENV: ${key}`, 'failed', `Missing required: ${description}`);
    }
  });

  Object.entries(optionalVars).forEach(([key, description]) => {
    if (process.env[key]) {
      addTest(`ENV: ${key}`, 'passed', description);
    } else {
      addTest(`ENV: ${key}`, 'warning', `Optional: ${description}`, true);
    }
  });
}

async function runAllTests() {
  console.log('🧪 ACT Platform API Test Suite');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Test 1: Environment
  await testEnvironment();

  // Test 2: Supabase
  const supabaseOk = await testSupabaseConnection();

  // Test 3: Notion
  const notionOk = await testNotionConnection();

  // Test 4: Sync Service (only if Supabase and Notion are working)
  if (supabaseOk && notionOk) {
    await testSyncService();
  } else {
    addTest('Sync Service', 'failed',
      'Skipped - fix Supabase and Notion issues first');
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests:     ${results.summary.total}`);
  console.log(`✅ Passed:       ${results.summary.passed}`);
  console.log(`❌ Failed:       ${results.summary.failed}`);
  console.log(`⚠️  Warnings:     ${results.summary.warnings}`);
  console.log('='.repeat(60));

  const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%\n`);

  // Critical failures
  const criticalFailures = results.tests.filter(t =>
    t.status === 'failed' && !t.warning
  );

  if (criticalFailures.length > 0) {
    console.log('❌ CRITICAL ISSUES TO FIX:\n');
    criticalFailures.forEach(test => {
      console.log(`   • ${test.name}`);
      console.log(`     ${test.details}\n`);
    });
  }

  // Warnings
  const warnings = results.tests.filter(t => t.warning);
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (non-blocking):\n');
    warnings.forEach(test => {
      console.log(`   • ${test.name}`);
      console.log(`     ${test.details}\n`);
    });
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');

  if (criticalFailures.length === 0 && warnings.length === 0) {
    console.log('   ✅ All systems operational!');
    console.log('   ✅ Ready to run: node test-supabase-notion-sync.js --live');
    console.log('   ✅ Then deploy: node apps/backend/core/scripts/daily-sync.js --full');
  } else if (criticalFailures.length === 0) {
    console.log('   ✅ Core systems working!');
    console.log('   ⚠️  Some optional features need configuration');
    console.log('   ✅ Safe to proceed with sync deployment');
  } else {
    console.log('   ❌ Fix critical issues before deploying');
    console.log('   📖 See: .taskmaster/docs/ACTIVE_STRATEGY/SUPABASE_NOTION_SYNC_SETUP.md');
  }

  console.log('\n' + '='.repeat(60));

  // Save detailed report
  const fs = await import('fs/promises');
  const reportPath = '.taskmaster/docs/ACTIVE_STRATEGY/API_TEST_REPORT.json';
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportPath}\n`);

  return results;
}

// Run tests
runAllTests()
  .then(results => {
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
