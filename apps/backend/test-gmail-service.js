#!/usr/bin/env node

import ProductionGmailService from './src/services/productionGmailService.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function testService() {
  console.log('🔍 Testing Gmail Service Token Loading...');
  
  const gmailService = new ProductionGmailService();
  const initialized = await gmailService.initialize();
  
  console.log('Initialized:', initialized);
  console.log('Status:', gmailService.getStatus());
  
  if (gmailService.isAuthenticated) {
    console.log('✅ Gmail service is working!');
  } else {
    console.log('❌ Gmail service not authenticated');
  }
}

testService().catch(console.error);