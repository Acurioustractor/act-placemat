#!/usr/bin/env node

/**
 * GMAIL APP PASSWORD SETUP
 * Fuck OAuth - use app passwords instead
 */

import dotenv from 'dotenv';
import Imap from 'imap';

// Load environment variables
dotenv.config({ path: '../../.env' });

console.log('🚀 GMAIL APP PASSWORD SETUP');
console.log('============================');
console.log('');
console.log('❌ Google OAuth is broken bullshit that never works');
console.log('✅ Using Gmail App Passwords instead - MUCH simpler!');
console.log('');

async function setupGmailAppPassword() {
  console.log('📋 SETUP INSTRUCTIONS:');
  console.log('');
  console.log('1. Go to: https://myaccount.google.com/apppasswords');
  console.log('2. Sign in to your Google account');
  console.log('3. Click "Select app" → Choose "Mail"');
  console.log('4. Click "Select device" → Choose "Other" → Type "ACT Placemat"');
  console.log('5. Click "GENERATE"');
  console.log('6. Copy the 16-character password (like: abcd efgh ijkl mnop)');
  console.log('');
  console.log('7. Add these lines to your .env file:');
  console.log('   GMAIL_USER=benjamin@act.place');
  console.log('   GMAIL_APP_PASSWORD=your_16_char_password_no_spaces');
  console.log('');

  // Check if already configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('✅ Gmail credentials found in .env file');
    console.log('🔍 Testing connection...');
    
    const config = {
      user: process.env.GMAIL_USER,
      password: process.env.GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    };

    try {
      await testConnection(config);
      console.log('');
      console.log('🎯 SUCCESS! Gmail App Password authentication works!');
      console.log('✅ Your Gmail integration is ready to use');
      console.log('🚀 You can now start your backend server');
    } catch (error) {
      console.log('');
      console.log('❌ Connection failed:', error.message);
      console.log('💡 Double-check your app password is correct');
      console.log('💡 Make sure 2-factor auth is enabled on your Google account');
    }
  } else {
    console.log('⚠️  Gmail credentials not found in .env file');
    console.log('📝 Follow the instructions above to set them up');
  }
}

function testConnection(config) {
  return new Promise((resolve, reject) => {
    const imap = new Imap(config);
    
    imap.once('ready', () => {
      console.log('✅ IMAP connection successful');
      imap.end();
      resolve();
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

setupGmailAppPassword();