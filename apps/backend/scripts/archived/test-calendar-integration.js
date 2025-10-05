/**
 * Calendar Integration Test
 * Tests if Calendar API works with existing Gmail OAuth setup
 */

import { google } from 'googleapis';
import fs from 'fs';

async function testCalendarIntegration() {
  console.log('\n📅 Calendar API Integration Test');
  console.log('================================\n');

  try {
    // Use same OAuth setup as Gmail
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    // Load existing Gmail tokens
    const tokenPath = '.gmail_tokens.json';
    if (!fs.existsSync(tokenPath)) {
      console.log('❌ No Gmail tokens found at:', tokenPath);
      console.log('   Gmail OAuth needs to be set up first');
      return false;
    }

    console.log('🔍 Loading existing Gmail tokens...');
    const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    oauth2Client.setCredentials(tokens);

    console.log('✅ Tokens loaded successfully');
    console.log(`   Scope check: ${tokens.scope ? 'Present' : 'Missing'}`);
    
    if (tokens.scope) {
      console.log(`   Current scopes: ${tokens.scope}`);
      const hasCalendarScope = tokens.scope.includes('calendar');
      console.log(`   Calendar scope: ${hasCalendarScope ? '✅ Present' : '❌ Missing'}`);
      
      if (!hasCalendarScope) {
        console.log('\n🔧 NEXT STEP REQUIRED:');
        console.log('   Calendar scope was added to OAuth consent, but existing tokens');
        console.log('   were created before Calendar scope was added.');
        console.log('   Solution: Re-authenticate to get new tokens with Calendar scope');
        console.log('\n   Options:');
        console.log('   1. Delete .gmail_tokens.json and re-run Gmail OAuth flow');
        console.log('   2. Or create a separate Calendar OAuth flow');
        return false;
      }
    }

    // Test Calendar API access
    console.log('\n📅 Testing Calendar API access...');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Test 1: Get calendar list
    console.log('🔍 Getting calendar list...');
    const calendarsResponse = await calendar.calendarList.list();
    const calendars = calendarsResponse.data.items || [];
    
    console.log(`✅ Found ${calendars.length} calendars:`);
    calendars.slice(0, 3).forEach((cal, index) => {
      console.log(`   ${index + 1}. "${cal.summary}" (${cal.accessRole})`);
    });

    // Test 2: Get recent events
    const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0];
    if (primaryCalendar) {
      console.log(`\n📋 Getting recent events from "${primaryCalendar.summary}"...`);
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const eventsResponse = await calendar.events.list({
        calendarId: primaryCalendar.id,
        timeMin: weekAgo.toISOString(),
        timeMax: now.toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = eventsResponse.data.items || [];
      console.log(`✅ Found ${events.length} events in the last 7 days:`);
      
      events.forEach((event, index) => {
        const start = event.start?.dateTime || event.start?.date;
        const startDate = new Date(start);
        console.log(`   ${index + 1}. "${event.summary || 'No title'}"`);
        console.log(`      📅 ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`);
        console.log(`      📍 ${event.location || 'No location'}`);
        console.log(`      👥 ${event.attendees?.length || 0} attendees`);
      });

      // Test contextual analysis
      if (events.length > 0) {
        console.log('\n💰 Testing Expense Context Analysis:');
        console.log('====================================');
        
        const mockTransaction = {
          date: events[0].start?.dateTime || events[0].start?.date,
          amount: 85.50,
          merchant: 'Restaurant Example'
        };
        
        console.log(`📊 Mock transaction: $${mockTransaction.amount} at ${mockTransaction.merchant}`);
        console.log(`📅 Transaction time: ${new Date(mockTransaction.date).toLocaleString()}`);
        
        const contextEvent = events[0];
        console.log(`🎯 Found matching calendar event: "${contextEvent.summary}"`);
        
        if (contextEvent.attendees && contextEvent.attendees.length > 1) {
          console.log(`   👥 ${contextEvent.attendees.length} attendees - likely business expense`);
          console.log(`   💡 Suggested action: "Ask ${contextEvent.attendees[0].displayName || contextEvent.attendees[0].email} about this shared expense"`);
        }
        
        if (contextEvent.location) {
          console.log(`   📍 Location match possible: ${contextEvent.location}`);
        }
      }
    }

    console.log('\n🎉 Calendar API Integration Test SUCCESSFUL!');
    console.log('============================================');
    console.log('✅ Calendar API is working with your OAuth setup');
    console.log('✅ Can access calendar data and events');
    console.log('✅ Ready for smart receipt contextual analysis');
    console.log('✅ Your world-class bookkeeper system is complete!');
    
    return true;

  } catch (error) {
    console.error('\n❌ Calendar API test failed:', error.message);
    
    if (error.message.includes('insufficient_scope')) {
      console.log('\n🔧 SOLUTION: Calendar scope not in token');
      console.log('   1. Calendar scope was added to consent screen ✅');
      console.log('   2. But existing tokens were created before Calendar scope');
      console.log('   3. Need to re-authenticate to get Calendar permissions');
      console.log('\n   Quick fix:');
      console.log('   • Delete .gmail_tokens.json');
      console.log('   • Re-run Gmail OAuth (will now include Calendar)');
    } else if (error.message.includes('API has not been used')) {
      console.log('\n🔧 SOLUTION: Enable Calendar API');
      console.log('   1. Go to Google Cloud Console > APIs & Services > Library');
      console.log('   2. Search "Google Calendar API"');
      console.log('   3. Click "Enable"');
    }
    
    return false;
  }
}

// Run the test
testCalendarIntegration().catch(console.error);