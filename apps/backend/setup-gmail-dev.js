#!/usr/bin/env node

/**
 * GMAIL DEVELOPMENT SETUP - BYPASS GOOGLE VERIFICATION
 * Creates a personal Google Cloud project setup that works in development
 */

console.log('🚨 GOOGLE OAUTH BLOCKED - DEVELOPMENT BYPASS NEEDED');
console.log('====================================================');
console.log('');
console.log('Google blocked the OAuth because the app isn\'t verified.');
console.log('For development, we need to create your own Google Cloud project.');
console.log('');
console.log('📋 FOLLOW THESE STEPS:');
console.log('');
console.log('1. 🌐 Go to: https://console.cloud.google.com/');
console.log('2. 🆕 Create a new project called "ACT Gmail Intelligence"');
console.log('3. 🔧 Enable the Gmail API:');
console.log('   • Go to APIs & Services > Library');
console.log('   • Search for "Gmail API"');
console.log('   • Click "Enable"');
console.log('');
console.log('4. 🔑 Create OAuth credentials:');
console.log('   • Go to APIs & Services > Credentials');
console.log('   • Click "Create Credentials" > "OAuth 2.0 Client IDs"');
console.log('   • Application type: "Web application"');
console.log('   • Name: "ACT Gmail Intelligence"');
console.log('   • Authorized redirect URIs: http://localhost:3333/callback');
console.log('   • Click "Create"');
console.log('');
console.log('5. 📝 Copy the Client ID and Client Secret');
console.log('6. 👤 Add your email (benjamin@act.place) as a test user:');
console.log('   • Go to OAuth consent screen');
console.log('   • Scroll to "Test users"');
console.log('   • Click "Add users"');
console.log('   • Add: benjamin@act.place');
console.log('');
console.log('7. 🔧 Update your .env file with the new credentials:');
console.log('   GMAIL_CLIENT_ID=your_new_client_id');
console.log('   GMAIL_CLIENT_SECRET=your_new_client_secret');
console.log('');
console.log('8. 🚀 Run the setup again: node setup-gmail-once.js');
console.log('');
console.log('💡 This creates YOUR personal Google project that bypasses verification!');
console.log('');

// Alternative: Check if we can use application-specific passwords
console.log('🔄 ALTERNATIVE: Use Gmail App Password');
console.log('==================================');
console.log('');
console.log('If you have 2FA enabled on your Gmail:');
console.log('1. Go to: https://myaccount.google.com/apppasswords');
console.log('2. Generate an app password for "Mail"');
console.log('3. We can use IMAP instead of OAuth (simpler but less secure)');
console.log('');
console.log('Which approach do you want to take?');
console.log('A) Create your own Google Cloud project (recommended)');
console.log('B) Use Gmail app password with IMAP (faster setup)');
console.log('');