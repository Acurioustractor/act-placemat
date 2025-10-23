/**
 * Project Intelligence API
 * Links projects to Gmail emails, Calendar events, and Supabase contacts
 */

import { google } from 'googleapis';
import gmailService from '../services/gmailService.js';

export default function projectIntelligenceRoutes(app, supabase) {

  /**
   * GET /api/projects/:projectId/emails
   * Get emails related to a specific project
   */
  app.get('/api/projects/:projectId/emails', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 20 } = req.query;

      // Get project details from the projects cache (already in memory)
      const projectsResponse = await fetch('http://localhost:4000/api/real/projects');
      const projectsData = await projectsResponse.json();
      const project = projectsData.projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if Gmail is authenticated
      const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
      if (!accessToken) {
        return res.json({
          emails: [],
          message: 'Gmail not configured. Please authenticate with Gmail to see related emails.'
        });
      }

      // Authenticate with Gmail
      try {
        await gmailService.authenticate(accessToken, process.env.GOOGLE_REFRESH_TOKEN);
      } catch (authError) {
        console.error('Gmail auth error:', authError);
        return res.json({
          emails: [],
          message: 'Gmail authentication failed. Please re-authenticate.'
        });
      }

      // Search for emails mentioning this project
      const searchQuery = `"${project.name}"`;

      const emails = await gmailService.searchEmails({
        query: searchQuery,
        maxResults: parseInt(limit)
      });

      // Format emails for frontend
      const formattedEmails = emails.map(email => ({
        id: email.id,
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: email.date,
        snippet: email.snippet,
        threadId: email.threadId
      }));

      res.json({
        projectId,
        projectName: project.name,
        emails: formattedEmails,
        count: formattedEmails.length
      });

    } catch (error) {
      console.error('Error fetching project emails:', error);
      res.status(500).json({
        error: 'Failed to fetch project emails',
        message: error.message,
        emails: []
      });
    }
  });

  /**
   * GET /api/projects/:projectId/calendar
   * Get calendar events related to a specific project
   */
  app.get('/api/projects/:projectId/calendar', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit = 20, timeMin, timeMax } = req.query;

      // Get project details
      const projectsResponse = await fetch('http://localhost:4000/api/real/projects');
      const projectsData = await projectsResponse.json();
      const project = projectsData.projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if Google Calendar is authenticated
      const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
      if (!accessToken) {
        return res.json({
          events: [],
          message: 'Google Calendar not configured. Please authenticate to see related events.'
        });
      }

      // Set up Google Calendar API
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Search for events mentioning this project
      const searchQuery = project.name;

      const response = await calendar.events.list({
        calendarId: 'primary',
        q: searchQuery,
        maxResults: parseInt(limit),
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: timeMin || new Date().toISOString(), // Default to future events
        timeMax: timeMax || undefined
      });

      const events = response.data.items || [];

      // Format events for frontend
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map(a => a.email) || [],
        link: event.htmlLink
      }));

      res.json({
        projectId,
        projectName: project.name,
        events: formattedEvents,
        count: formattedEvents.length
      });

    } catch (error) {
      console.error('Error fetching project calendar events:', error);
      res.status(500).json({
        error: 'Failed to fetch calendar events',
        message: error.message,
        events: []
      });
    }
  });

  /**
   * GET /api/projects/:projectId/contacts
   * Get contacts related to a specific project from Supabase
   */
  app.get('/api/projects/:projectId/contacts', async (req, res) => {
    try {
      const { projectId } = req.params;

      if (!supabase) {
        return res.json({
          contacts: [],
          message: 'Supabase not configured'
        });
      }

      // Get project details to find related contacts
      const projectsResponse = await fetch('http://localhost:4000/api/real/projects');
      const projectsData = await projectsResponse.json();
      const project = projectsData.projects.find(p => p.id === projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Query Supabase for contacts related to this project
      // This could be done via:
      // 1. Project lead email
      // 2. Contacts table with project_id foreign key
      // 3. Junction table linking contacts to projects

      const contacts = [];

      // Try to find the project lead in contacts
      if (project.projectLead?.email) {
        const { data: leadContact, error: leadError } = await supabase
          .from('contacts')
          .select('*')
          .ilike('email', project.projectLead.email)
          .limit(1)
          .single();

        if (!leadError && leadContact) {
          contacts.push({
            id: leadContact.id,
            name: leadContact.full_name || leadContact.name,
            email: leadContact.email,
            phone: leadContact.phone,
            role: 'Project Lead',
            organization: leadContact.organization
          });
        }
      }

      // Try to find contacts linked to this project via project_id
      const { data: projectContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('project_id', projectId);

      if (!contactsError && projectContacts) {
        projectContacts.forEach(contact => {
          contacts.push({
            id: contact.id,
            name: contact.full_name || contact.name,
            email: contact.email,
            phone: contact.phone,
            role: contact.role || 'Team Member',
            organization: contact.organization
          });
        });
      }

      // Try to find contacts via junction table (if it exists)
      const { data: junctionContacts, error: junctionError } = await supabase
        .from('project_contacts')
        .select(`
          contact_id,
          role,
          contacts (
            id,
            full_name,
            name,
            email,
            phone,
            organization
          )
        `)
        .eq('project_id', projectId);

      if (!junctionError && junctionContacts) {
        junctionContacts.forEach(junction => {
          const contact = junction.contacts;
          if (contact) {
            contacts.push({
              id: contact.id,
              name: contact.full_name || contact.name,
              email: contact.email,
              phone: contact.phone,
              role: junction.role || 'Team Member',
              organization: contact.organization
            });
          }
        });
      }

      // Remove duplicates based on email
      const uniqueContacts = contacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.email === contact.email)
      );

      res.json({
        projectId,
        projectName: project.name,
        contacts: uniqueContacts,
        count: uniqueContacts.length
      });

    } catch (error) {
      console.error('Error fetching project contacts:', error);
      res.status(500).json({
        error: 'Failed to fetch project contacts',
        message: error.message,
        contacts: []
      });
    }
  });

  /**
   * GET /api/projects/:projectId/intelligence
   * Get all intelligence for a project (emails, calendar, contacts) in one call
   */
  app.get('/api/projects/:projectId/intelligence', async (req, res) => {
    try {
      const { projectId } = req.params;

      // Fetch all intelligence in parallel
      const [emailsRes, calendarRes, contactsRes] = await Promise.allSettled([
        fetch(`http://localhost:4000/api/projects/${projectId}/emails`).then(r => r.json()),
        fetch(`http://localhost:4000/api/projects/${projectId}/calendar`).then(r => r.json()),
        fetch(`http://localhost:4000/api/projects/${projectId}/contacts`).then(r => r.json())
      ]);

      res.json({
        projectId,
        emails: emailsRes.status === 'fulfilled' ? emailsRes.value : { emails: [], error: emailsRes.reason },
        calendar: calendarRes.status === 'fulfilled' ? calendarRes.value : { events: [], error: calendarRes.reason },
        contacts: contactsRes.status === 'fulfilled' ? contactsRes.value : { contacts: [], error: contactsRes.reason }
      });

    } catch (error) {
      console.error('Error fetching project intelligence:', error);
      res.status(500).json({
        error: 'Failed to fetch project intelligence',
        message: error.message
      });
    }
  });
}
