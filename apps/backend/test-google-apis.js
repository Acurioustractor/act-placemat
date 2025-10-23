import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const TOKEN_PATH = path.join(__dirname, '.gmail_tokens.json');

console.log('🔍 Testing Google APIs...\n');

try {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'http://localhost:4000/auth/google/callback'
  );
  oauth2Client.setCredentials(tokens);

  // Test Calendar
  console.log('📅 Testing Calendar API...');
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const calendarResponse = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime'
  });

  const events = calendarResponse.data.items || [];
  console.log(`✅ Calendar API working! Found ${events.length} events today`);
  if (events.length > 0) {
    events.forEach(event => {
      const start = event.start.dateTime || event.start.date;
      console.log(`   - ${event.summary} at ${start}`);
    });
  }

  // Test Gmail
  console.log('\n📧 Testing Gmail API...');
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const gmailResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5,
    q: 'is:inbox -from:me'
  });

  const messages = gmailResponse.data.messages || [];
  console.log(`✅ Gmail API working! Found ${messages.length} inbox messages`);
  
  if (messages.length > 0) {
    console.log('\n   Recent emails:');
    for (const msg of messages.slice(0, 3)) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });
      
      const headers = detail.data.payload.headers;
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      console.log(`   - From: ${from}`);
      console.log(`     Subject: ${subject}\n`);
    }
  }

  console.log('✅ All Google APIs are working correctly!');
  process.exit(0);

} catch (error) {
  console.error('❌ Error testing Google APIs:', error.message);
  process.exit(1);
}
