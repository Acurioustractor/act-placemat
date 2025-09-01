/**
 * Google Calendar Integration Service
 * Provides calendar data for ACT Farmhand Dashboard
 */

import { google } from 'googleapis';

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Check if Google Calendar credentials are configured
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
      const calendarId = process.env.GOOGLE_CALENDAR_ID;

      if (!clientEmail || !privateKey || !calendarId) {
        console.log('⚠️  Google Calendar not configured - using mock data');
        return false;
      }

      // Initialize Google Calendar API with service account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.calendarId = calendarId;
      this.initialized = true;

      console.log('✅ Google Calendar service initialized');
      return true;
    } catch (error) {
      console.error('❌ Google Calendar initialization failed:', error.message);
      return false;
    }
  }

  async getUpcomingEvents(maxResults = 10) {
    if (!this.initialized) {
      return this.getMockEvents();
    }

    try {
      const now = new Date().toISOString();
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: now,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      return events.map(event => ({
        id: event.id,
        title: event.summary || 'No Title',
        date: this.formatDate(event.start?.dateTime || event.start?.date),
        time: this.formatTime(event.start?.dateTime),
        location: event.location || null,
        type: this.categorizeEvent(event.summary || ''),
        description: event.description || null,
        attendees: event.attendees?.length || 0
      }));

    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error.message);
      return this.getMockEvents();
    }
  }

  formatDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  formatTime(dateTimeString) {
    if (!dateTimeString) return 'All day';
    
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-AU', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  categorizeEvent(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('board') || titleLower.includes('meeting')) return 'meeting';
    if (titleLower.includes('deadline') || titleLower.includes('due')) return 'deadline';
    if (titleLower.includes('travel') || titleLower.includes('visit')) return 'travel';
    if (titleLower.includes('consultation') || titleLower.includes('community')) return 'event';
    
    return 'event';
  }

  getMockEvents() {
    // Fallback mock data when Google Calendar is not configured
    return [
      {
        id: '1',
        title: 'Board Meeting',
        date: '2025-08-25',
        time: '10:00 AM',
        location: 'Brisbane Office',
        type: 'meeting',
        description: 'Monthly board meeting to discuss strategic priorities',
        attendees: 8
      },
      {
        id: '2',
        title: 'Grant Application Deadline',
        date: '2025-09-15',
        time: '11:59 PM',
        location: null,
        type: 'deadline',
        description: 'Australia Council Indigenous Arts Grant application due',
        attendees: 0
      },
      {
        id: '3',
        title: 'Community Consultation - Alice Springs',
        date: '2025-09-02',
        time: '2:00 PM',
        location: 'Alice Springs',
        type: 'travel',
        description: 'Community engagement session for housing project',
        attendees: 25
      },
      {
        id: '4',
        title: 'Storytelling Workshop',
        date: '2025-08-28',
        time: '1:00 PM',
        location: 'Virtual',
        type: 'event',
        description: 'Monthly storytelling workshop for community members',
        attendees: 15
      }
    ];
  }

  async getCalendarHealth() {
    return {
      initialized: this.initialized,
      calendar_configured: Boolean(process.env.GOOGLE_CALENDAR_ID),
      service_account_configured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      status: this.initialized ? 'connected' : 'mock_data',
      last_check: new Date().toISOString()
    };
  }
}

const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;