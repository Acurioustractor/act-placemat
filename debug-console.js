#!/usr/bin/env node
/**
 * Browser Console Debugger
 * Captures console output from the enhanced goods demo page
 */

const puppeteer = require('puppeteer');

async function captureConsoleOutput() {
  console.log('🚀 Starting browser console capture...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true if you don't want to see the browser
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Filter for our debug messages
    if (text.includes('🔧 TRANSFORM INPUT:') || 
        text.includes('🎯 TRANSFORM OUTPUT:') ||
        text.includes('Debug: title=') ||
        text.includes('API Response:') ||
        text.includes('Projects data:')) {
      console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
    }
  });
  
  // Navigate to the page
  console.log('📍 Navigating to enhanced goods demo...');
  await page.goto('http://localhost:5175/enhanced-goods-demo');
  
  // Wait for the page to load and API calls to complete
  console.log('⏳ Waiting for API calls to complete...');
  await page.waitForTimeout(5000);
  
  console.log('✅ Console capture complete');
  await browser.close();
}

// Handle errors
captureConsoleOutput().catch(error => {
  console.error('❌ Error capturing console:', error);
  process.exit(1);
});