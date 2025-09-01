#!/usr/bin/env node

/**
 * Test Data Consistency Validation
 * Demonstrates the data consistency validation between Supabase and Neo4j
 */

import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import dataConsistencyValidatorService from './src/services/dataConsistencyValidatorService.js';

async function testDataConsistency() {
  console.log('🔍 Testing Data Consistency Validation System\n');

  try {
    // Initialize the service
    console.log('1️⃣ Initializing Data Consistency Validator Service...');
    const initialized = await dataConsistencyValidatorService.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to initialize service');
      process.exit(1);
    }
    
    console.log('✅ Service initialized successfully\n');

    // Perform quick health check
    console.log('2️⃣ Performing Quick Health Check...');
    const healthCheck = await dataConsistencyValidatorService.quickHealthCheck();
    
    console.log('📊 Health Check Results:');
    console.log(`   Healthy: ${healthCheck.healthy ? '✅' : '⚠️'}`);
    console.log(`   Supabase Users: ${healthCheck.counts.supabase_users}`);
    console.log(`   Neo4j Users: ${healthCheck.counts.neo4j_users}`);
    console.log(`   Issues Found: ${healthCheck.issues.length}`);
    
    if (healthCheck.issues.length > 0) {
      console.log('   Issues Details:');
      healthCheck.issues.forEach(issue => {
        console.log(`     - ${issue.type}: ${issue.table} (${issue.difference} difference)`);
      });
    }
    console.log();

    // Perform comprehensive validation
    console.log('3️⃣ Performing Comprehensive Data Validation...');
    const validationResult = await dataConsistencyValidatorService.performFullValidation({
      autoRepair: false,
      batchSize: 50,
      reportFormat: 'detailed'
    });

    if (validationResult.success) {
      console.log('✅ Comprehensive validation completed successfully');
      console.log(`   Duration: ${validationResult.duration}ms`);
      
      const summary = validationResult.summary;
      console.log('\n📈 Validation Summary:');
      console.log(`   Total Records Checked: ${summary.totalRecords}`);
      console.log(`   Consistent Records: ${summary.consistentRecords}`);
      console.log(`   Inconsistent Records: ${summary.inconsistentRecords}`);
      console.log(`   Missing Records: ${summary.missingRecords}`);
      console.log(`   Orphaned Records: ${summary.orphanedRecords}`);
      console.log(`   Consistency Percentage: ${summary.consistencyPercentage}%`);
      console.log(`   Overall Health: ${summary.healthy ? '✅ Healthy' : '⚠️ Issues Detected'}`);

      const results = validationResult.results;
      
      // Show missing records
      if (results.missing.neo4j.length > 0) {
        console.log('\n🔍 Missing Records in Neo4j:');
        results.missing.neo4j.forEach((missing, index) => {
          console.log(`   ${index + 1}. ${missing.table} - Key: ${missing.keyValue}`);
          console.log(`      Email: ${missing.supabaseRecord.email}`);
          console.log(`      Display Name: ${missing.supabaseRecord.display_name}`);
        });
      }

      if (results.missing.supabase.length > 0) {
        console.log('\n🔍 Missing Records in Supabase:');
        results.missing.supabase.forEach((missing, index) => {
          console.log(`   ${index + 1}. ${missing.table} - Key: ${missing.keyValue}`);
        });
      }

      // Show orphaned records
      if (results.orphaned.neo4j.length > 0) {
        console.log('\n🗑️ Orphaned Records in Neo4j:');
        results.orphaned.neo4j.forEach((orphaned, index) => {
          console.log(`   ${index + 1}. ${orphaned.label} - Key: ${orphaned.keyValue}`);
        });
      }

      // Show inconsistencies
      if (results.inconsistencies.length > 0) {
        console.log('\n⚠️ Field Inconsistencies:');
        results.inconsistencies.forEach((inconsistency, index) => {
          console.log(`   ${index + 1}. ${inconsistency.table}.${inconsistency.field}`);
          console.log(`      Supabase: "${inconsistency.supabaseValue}"`);
          console.log(`      Neo4j: "${inconsistency.neo4jValue}"`);
        });
      }

      // Show relationship issues
      if (results.relationshipIssues.length > 0) {
        console.log('\n🔗 Relationship Issues:');
        results.relationshipIssues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.type}: ${issue.relationshipType}`);
          if (issue.expectedCount !== undefined) {
            console.log(`      Expected: ${issue.expectedCount}, Actual: ${issue.actualCount}`);
          }
        });
      }

      console.log('\n4️⃣ Testing Auto-Repair Simulation...');
      
      // Perform auto-repair simulation (dry run)
      const repairResult = await dataConsistencyValidatorService.performFullValidation({
        autoRepair: true,
        batchSize: 10,
        reportFormat: 'summary'
      });

      if (repairResult.success && repairResult.results.repairActions.length > 0) {
        console.log('🔧 Auto-Repair Actions Performed:');
        repairResult.results.repairActions.forEach((action, index) => {
          console.log(`   ${index + 1}. ${action.action} - ${action.success ? '✅' : '❌'}`);
          if (action.error) {
            console.log(`      Error: ${action.error}`);
          }
        });
      } else {
        console.log('ℹ️ No auto-repair actions needed or available');
      }

    } else {
      console.error('❌ Comprehensive validation failed:', validationResult.error);
    }

    console.log('\n✅ Data Consistency Validation Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testDataConsistency();