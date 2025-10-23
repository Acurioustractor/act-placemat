import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔍 Debugging Morning Brief Initialization...\n');

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const TOKEN_PATH = path.join(__dirname, '.gmail_tokens.json');

console.log('CLIENT_ID:', GMAIL_CLIENT_ID ? '✅ Found' : '❌ Missing');
console.log('CLIENT_SECRET:', GMAIL_CLIENT_SECRET ? '✅ Found' : '❌ Missing');
console.log('TOKEN_PATH:', TOKEN_PATH);
console.log('Token file exists:', fs.existsSync(TOKEN_PATH) ? '✅ Yes' : '❌ No');

if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  console.log('\nToken contents:');
  console.log('  - access_token:', tokens.access_token ? '✅ Present' : '❌ Missing');
  console.log('  - refresh_token:', tokens.refresh_token ? '✅ Present' : '❌ Missing');
  console.log('  - expiry_date:', new Date(tokens.expiry_date).toLocaleString());
  console.log('  - scopes:', tokens.scope);
}

// Now test the actual path used in morningBrief.js
const MORNING_BRIEF_PATH = path.join(__dirname, '../../../.gmail_tokens.json');
console.log('\nMorning Brief token path:', MORNING_BRIEF_PATH);
console.log('File exists at that path:', fs.existsSync(MORNING_BRIEF_PATH) ? '✅ Yes' : '❌ No');
