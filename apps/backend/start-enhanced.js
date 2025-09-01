#!/usr/bin/env node

/**
 * Starter script for enhanced server
 * Ensures environment variables are loaded before importing modules
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '.env') });

// Verify critical environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ SUPABASE_URL is not set in .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log('🚀 Starting enhanced server...');

// Now import and start the server
import('./src/server-enhanced.js').catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});