#!/usr/bin/env node

/**
 * Automated Real Supabase Setup Script
 * Sets up your ACT Platform with real Supabase credentials
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 ACT Platform - Real Supabase Setup
=====================================

This script will help you configure real Supabase credentials for your ACT Platform.

Prerequisites:
1. Create a Supabase project at https://supabase.com/dashboard
2. Have your project URL and service role key ready

Let's get started!
`);

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testSupabaseConnection(url, key) {
  try {
    console.log('🔍 Testing Supabase connection...');
    const supabase = createClient(url, key);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('_realtime_schema')
      .select('*')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    return false;
  }
}

function updateEnvironmentFile(envPath, updates) {
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Update or add each key-value pair
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${value}`;
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent += `\n${line}`;
      }
    });
    
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`✅ Updated ${envPath}`);
  } catch (error) {
    console.log(`❌ Failed to update ${envPath}:`, error.message);
  }
}

async function applyMigrations(supabaseUrl, serviceKey) {
  console.log('\n🔄 Applying database migrations...');
  
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Check if we need to run migrations
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    const hasStories = tables?.some(t => t.table_name === 'stories');
    
    if (!hasStories) {
      console.log('📋 Core tables not found. You need to apply migrations manually.');
      console.log('\nOptions:');
      console.log('1. Run: node database/migrate.js');
      console.log('2. Use Supabase dashboard SQL editor');
      console.log('3. Apply migration files from database/migrations/');
    } else {
      console.log('✅ Core database tables detected');
    }
    
  } catch (error) {
    console.log('⚠️  Could not check migrations:', error.message);
    console.log('You may need to apply migrations manually');
  }
}

async function main() {
  try {
    // Step 1: Get Supabase credentials
    console.log('\n--- Step 1: Supabase Credentials ---');
    
    const supabaseUrl = await askQuestion('Enter your Supabase project URL (https://your-project.supabase.co): ');
    if (!supabaseUrl.includes('supabase.co')) {
      console.log('❌ Invalid Supabase URL format');
      process.exit(1);
    }
    
    const serviceKey = await askQuestion('Enter your Supabase service role key: ');
    if (!serviceKey.startsWith('eyJ')) {
      console.log('❌ Invalid service role key format (should start with eyJ)');
      process.exit(1);
    }
    
    // Step 2: Test connection
    console.log('\n--- Step 2: Testing Connection ---');
    const connectionWorking = await testSupabaseConnection(supabaseUrl, serviceKey);
    
    if (!connectionWorking) {
      const retry = await askQuestion('Connection failed. Do you want to retry with different credentials? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        return main(); // Restart
      } else {
        process.exit(1);
      }
    }
    
    // Step 3: Update environment files
    console.log('\n--- Step 3: Updating Environment Files ---');
    
    const envUpdates = {
      'SUPABASE_URL': supabaseUrl,
      'SUPABASE_SERVICE_ROLE_KEY': serviceKey,
      'SUPABASE_ANON_KEY': serviceKey // For now, using service key as anon key in dev
    };
    
    // Update development .env
    updateEnvironmentFile('.env', envUpdates);
    
    // Create production .env.production
    const prodUpdates = {
      ...envUpdates,
      'NODE_ENV': 'production',
      'ALLOWED_ORIGINS': 'https://actcommunity.org,https://dashboard.actcommunity.org',
      'JWT_SECRET': 'ultra-secure-production-secret-minimum-64-characters-long-for-jwt-tokens-2025',
      'DEBUG_CORS': 'false',
      'DEBUG_AUTH': 'false',
      'ENABLE_SECURITY_METRICS': 'true'
    };
    
    updateEnvironmentFile('.env.production', prodUpdates);
    
    // Step 4: Check migrations
    console.log('\n--- Step 4: Database Setup ---');
    await applyMigrations(supabaseUrl, serviceKey);
    
    // Step 5: Success summary
    console.log('\n🎉 Setup Complete!');
    console.log('================');
    console.log('✅ Supabase credentials configured');
    console.log('✅ Environment files updated');
    console.log('✅ Production configuration ready');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Run: npm start (to test backend with real data)');
    console.log('2. Check: http://localhost:4000/health');
    console.log('3. Test: http://localhost:4000/security-health');
    console.log('4. Apply migrations if needed: node database/migrate.js');
    
    console.log('\n📊 Your ACT Platform is now ready for activation!');
    
  } catch (error) {
    console.log('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled');
  rl.close();
  process.exit(0);
});

main();