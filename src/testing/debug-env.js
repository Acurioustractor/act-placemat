// Debug script to check environment variables
require('dotenv').config();

console.log('Environment variables:');
console.log('NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'Present (length: ' + process.env.NOTION_TOKEN.length + ')' : 'Missing');
console.log('NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID || 'Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set (defaults to development)');
console.log('PORT:', process.env.PORT || 'Not set (using default)');

// Check if .env file is being loaded
const fs = require('fs');
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  console.log('\n.env file exists with length:', envFile.length);
  
  // Check if NOTION_TOKEN is in the file
  if (envFile.includes('NOTION_TOKEN=')) {
    console.log('NOTION_TOKEN is defined in .env file');
    
    // Extract the token value (without showing the full token)
    const match = envFile.match(/NOTION_TOKEN=([^\n]+)/);
    if (match && match[1]) {
      const token = match[1];
      console.log('Token in file starts with:', token.substring(0, 5) + '...');
      console.log('Token length:', token.length);
    }
  } else {
    console.log('NOTION_TOKEN is NOT defined in .env file');
  }
} catch (error) {
  console.error('.env file could not be read:', error.message);
}