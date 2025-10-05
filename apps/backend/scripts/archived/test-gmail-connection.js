#!/usr/bin/env node

/**
 * Gmail Connection Health Check
 * Tests Gmail authentication and basic functionality
 */

import dotenv from 'dotenv';
import ProductionGmailService from './src/services/productionGmailService.js';

// Load environment variables
dotenv.config();

async function testGmailConnection() {
  console.log('🔍 Testing Gmail Connection Health...');
  console.log('====================================');

  const gmailService = new ProductionGmailService();

  try {
    // Test initialization
    console.log('1️⃣ Initializing Gmail service...');
    const initialized = await gmailService.initialize();
    
    if (!initialized) {
      console.log('❌ Gmail initialization failed');
      console.log('💡 Run: node setup-gmail-once.js');
      return;
    }

    // Test basic connection
    console.log('2️⃣ Testing Gmail connection...');
    const status = gmailService.getStatus();
    console.log('   Status:', status);

    if (!status.authenticated) {
      console.log('❌ Gmail not authenticated');
      console.log('💡 Run: node setup-gmail-once.js');
      return;
    }

    // Test message retrieval
    console.log('3️⃣ Testing message retrieval...');
    const messages = await gmailService.getMessages({ maxResults: 5 });
    console.log(`   Retrieved ${messages.length} messages`);

    // Test search functionality
    console.log('4️⃣ Testing search functionality...');
    const searchResults = await gmailService.searchEmails({
      keywords: ['ACT', 'community'],
      maxResults: 3
    });
    console.log(`   Found ${searchResults.length} relevant messages`);

    // Test contact extraction
    if (searchResults.length > 0) {
      console.log('5️⃣ Testing contact extraction...');
      const contacts = gmailService.extractContactsFromMessages(searchResults);
      console.log(`   Extracted ${contacts.length} unique contacts`);
    }

    console.log('');
    console.log('✅ Gmail Connection Health Check PASSED');
    console.log('🎯 Gmail Intelligence is ready!');
    console.log('');
    console.log('Available capabilities:');
    console.log('   📧 Email search and analysis');
    console.log('   👥 Contact extraction and mapping');
    console.log('   🔍 Project and opportunity detection');
    console.log('   📊 Communication pattern analysis');
    console.log('   🤖 AI-powered email intelligence');

  } catch (error) {
    console.error('❌ Gmail connection test failed:', error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Check your .env file has correct Gmail credentials');
    console.log('   2. Run: node setup-gmail-once.js');
    console.log('   3. Ensure Gmail API is enabled in Google Cloud Console');
  }
}

testGmailConnection();