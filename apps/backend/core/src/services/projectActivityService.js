import notionService from './notionService.js';
import { createClient } from '@supabase/supabase-js';
import calendarService from './googleCalendarService.js';
import gmailService from './gmailService.js';
import fs from 'fs';
import path from 'path';

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

const EMAIL_TOKENS_PATH = path.resolve(process.cwd(), 'apps/backend/.gmail_tokens.json');

const parseEmailAddress = (value) => {
  if (!value) return { email: null, name: null };
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1]?.replace(/"/g, '').trim() || null,
      email: match[2]?.trim() || null
    };
  }
  return { email: value.trim(), name: null };
};

const parseEmailList = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => parseEmailAddress(part).email)
    .filter(Boolean);
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const calculateDurationMinutes = (start, end) => {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
};

class ProjectActivityService {
  constructor() {
    this.supabase = getSupabase();
  }

  async getActivitySummary(projectId) {
    if (!this.supabase) return null;
    const { data } = await this.supabase
      .from('project_activity_summary')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    return data || null;
  }

  async refreshProjectActivity(project) {
    if (!this.supabase) return null;
    const [notionStats, calendarStats, gmailStats] = await Promise.all([
      this.getNotionStats(project),
      this.getCalendarStats(project),
      this.getGmailStats(project)
    ]);

    const summary = {
      project_id: project.supabaseProjectId || project.id,
      notion_edit_minutes: notionStats.totalMinutes,
      notion_edit_count: notionStats.editCount,
      calendar_meeting_minutes: calendarStats.totalMinutes,
      calendar_meeting_count: calendarStats.meetingCount,
      gmail_thread_count: gmailStats.threadCount,
      gmail_recent_contacts: gmailStats.recentContacts,
      last_notation_activity: notionStats.lastActivity,
      last_calendar_activity: calendarStats.lastActivity,
      last_gmail_activity: gmailStats.lastActivity,
      last_synced: new Date().toISOString()
    };

    await this.supabase.from('project_activity_summary').upsert(summary);
    return summary;
  }

  async getNotionStats(project) {
    try {
      if (typeof notionService.getProjectEditHistory !== 'function') {
        const lastActivity =
          project.updatedAt || project.lastEditedTime || project.last_edited_time || null;
        return {
          editCount: project.activity?.notionEdits || 0,
          totalMinutes: project.activity?.notionMinutes || 0,
          lastActivity
        };
      }

      const edits = await notionService.getProjectEditHistory(project.id);
      let totalMinutes = 0;
      let lastActivity = null;

      edits.forEach(edit => {
        if (edit.durationMinutes) {
          totalMinutes += edit.durationMinutes;
        }
        if (!lastActivity || new Date(edit.timestamp) > new Date(lastActivity)) {
          lastActivity = edit.timestamp;
        }
      });

      return {
        editCount: edits.length,
        totalMinutes,
        lastActivity
      };
    } catch (error) {
      console.warn('Notion stats unavailable:', error.message);
      return { editCount: 0, totalMinutes: 0, lastActivity: project.updatedAt || null };
    }
  }

  async getCalendarStats(project) {
    try {
      if (!calendarService || typeof calendarService.getProjectEvents !== 'function') {
        return { totalMinutes: 0, meetingCount: 0, lastActivity: null };
      }

      const events = await calendarService.getProjectEvents(project, { days: 90 });
      let totalMinutes = 0;
      let meetingCount = 0;
      let lastActivity = null;

      events.forEach(event => {
        const duration = event.durationMinutes || 0;
        totalMinutes += duration;
        meetingCount += 1;
        if (!lastActivity || new Date(event.start) > new Date(lastActivity)) {
          lastActivity = event.start;
        }
      });

      return { totalMinutes, meetingCount, lastActivity };
    } catch (error) {
      console.warn('Calendar stats unavailable:', error.message);
      return { totalMinutes: 0, meetingCount: 0, lastActivity: null };
    }
  }

  async getGmailStats(project) {
    try {
      if (!gmailService?.gmail || typeof gmailService.findThreadsForProject !== 'function') {
        return { threadCount: 0, recentContacts: [], lastActivity: null };
      }
      const threads = await gmailService.findThreadsForProject(project);
      let lastActivity = null;
      const contactsMap = new Map();

      threads.forEach(thread => {
        if (!lastActivity || new Date(thread.lastMessageDate) > new Date(lastActivity)) {
          lastActivity = thread.lastMessageDate;
        }
        thread.participants?.forEach(participant => {
          if (!contactsMap.has(participant.email)) {
            contactsMap.set(participant.email, {
              email: participant.email,
              name: participant.name,
              lastInteraction: thread.lastMessageDate
            });
          }
        });
      });

      const recentContacts = Array.from(contactsMap.values())
        .sort((a, b) => new Date(b.lastInteraction) - new Date(a.lastInteraction))
        .slice(0, 5);

      return {
        threadCount: threads.length,
        recentContacts,
        lastActivity
      };
    } catch (error) {
      console.warn('Gmail stats unavailable:', error.message);
      return { threadCount: 0, recentContacts: [], lastActivity: null };
    }
  }

  async getProjectCommunications({ projectId = null, limit = 25, days = 30 } = {}) {
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const communicationsResult = {
      emails: [],
      meetings: [],
      timeline: [],
      projects: {},
      stats: { emailCount: 0, meetingCount: 0, windowStart }
    };

    try {
      let emails = [];
      let meetings = [];

      if (this.supabase) {
        const emailQuery = this.supabase
          .from('gmail_messages')
          .select(
            `id,gmail_id,thread_id,subject,snippet,from_email,from_name,to_emails,cc_emails,bcc_emails,sent_date,received_date,projects_mentioned,ai_summary,importance,follow_up_required,labels`
          )
          .order('sent_date', { ascending: false })
          .gte('sent_date', windowStart)
          .limit(limit);

        if (projectId) {
          emailQuery.contains('projects_mentioned', [projectId]);
        }

        const { data: emailData = [], error: emailError } = await emailQuery;
        if (emailError) {
          throw emailError;
        }
        emails = emailData;

        const meetingQuery = this.supabase
          .from('calendar_events')
          .select(
            `id,google_event_id,title,description,location,meeting_link,start_time,end_time,duration_minutes,attendees,mentioned_projects,ai_summary,event_type,status`
          )
          .order('start_time', { ascending: false })
          .gte('start_time', windowStart)
          .limit(limit);

        if (projectId) {
          meetingQuery.contains('mentioned_projects', [projectId]);
        }

        const { data: meetingData = [], error: meetingError } = await meetingQuery;
        if (meetingError) {
          throw meetingError;
        }
        meetings = meetingData;
      }

      if (emails.length === 0) {
        const liveEmails = await this.fetchLiveGmailMessages(limit, projectId);
        if (liveEmails.length > 0) {
          emails = liveEmails;
        }
      }

      if (meetings.length === 0) {
        const liveMeetings = await this.fetchLiveCalendarEvents(limit, days, projectId);
        if (liveMeetings.length > 0) {
          meetings = liveMeetings;
        }
      }

      const projectIds = new Set();
      emails.forEach((email) => (email.projects_mentioned || []).forEach((id) => projectIds.add(id)));
      meetings.forEach((meeting) => (meeting.mentioned_projects || []).forEach((id) => projectIds.add(id)));

      let projectsLookup = {};
      if (projectIds.size > 0 && this.supabase) {
        const { data: projectRecords = [], error: projectError } = await this.supabase
          .from('projects')
          .select('id,name,status,stage,summary')
          .in('id', Array.from(projectIds));
        if (projectError) {
          throw projectError;
        }
        projectsLookup = projectRecords.reduce((acc, project) => {
          acc[project.id] = project;
          return acc;
        }, {});
      }

      const timelineEntries = [
        ...emails.map((email) => ({
          type: 'email',
          id: email.id,
          occurredAt: email.sent_date || email.received_date,
          title: email.subject || 'No subject',
          summary: email.ai_summary || email.snippet,
          importance: email.importance,
          followUpRequired: email.follow_up_required,
          participants: [email.from_email, ...(email.to_emails || []), ...(email.cc_emails || [])].filter(Boolean),
          projects: email.projects_mentioned || []
        })),
        ...meetings.map((meeting) => ({
          type: 'meeting',
          id: meeting.id,
          occurredAt: meeting.start_time,
          title: meeting.title || 'Untitled meeting',
          summary: meeting.ai_summary || meeting.description,
          meetingType: meeting.event_type,
          durationMinutes: meeting.duration_minutes,
          participants: Array.isArray(meeting.attendees)
            ? meeting.attendees.map((att) => att.email || att.name).filter(Boolean)
            : [],
          projects: meeting.mentioned_projects || []
        }))
      ].filter((entry) => Boolean(entry.occurredAt));

      timelineEntries.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

      communicationsResult.emails = emails;
      communicationsResult.meetings = meetings;
      communicationsResult.timeline = timelineEntries;
      communicationsResult.projects = projectsLookup;
      communicationsResult.stats = {
        emailCount: emails.length,
        meetingCount: meetings.length,
        windowStart
      };

      return communicationsResult;
    } catch (error) {
      console.error('Failed to load project communications:', error.message);
      return communicationsResult;
    }
  }

  async ensureGmailReady() {
    if (gmailService?.gmail) {
      return true;
    }

    let accessToken =
      process.env.GOOGLE_ACCESS_TOKEN ||
      process.env.GMAIL_ACCESS_TOKEN ||
      null;
    let refreshToken =
      process.env.GOOGLE_REFRESH_TOKEN ||
      process.env.GMAIL_REFRESH_TOKEN ||
      null;

    if ((!accessToken || !refreshToken) && fs.existsSync(EMAIL_TOKENS_PATH)) {
      try {
        const stored = JSON.parse(fs.readFileSync(EMAIL_TOKENS_PATH, 'utf8'));
        accessToken = accessToken || stored.access_token;
        refreshToken = refreshToken || stored.refresh_token;
      } catch (error) {
        console.warn('Failed to read Gmail tokens file:', error.message);
      }
    }

    if (!accessToken) {
      console.warn('Gmail access token not available for communications view');
      return false;
    }

    try {
      await gmailService.authenticate(accessToken, refreshToken || null);
      return true;
    } catch (error) {
      console.warn('Gmail authentication failed for communications view:', error.message);
      return false;
    }
  }

  async fetchLiveGmailMessages(limit, projectId) {
    try {
      const ready = await this.ensureGmailReady();
      if (!ready) return [];

      const response = await gmailService.gmail.users.messages.list({
        userId: 'me',
        maxResults: Math.max(5, Math.min(limit ?? 25, 50)),
        q: projectId ? `"${projectId}"` : 'in:inbox OR in:sent'
      });

      const messages = response.data.messages || [];
      if (messages.length === 0) return [];

      const detailedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            return await gmailService.getEmailDetails(message.id);
          } catch (error) {
            console.warn('Failed to load Gmail message details:', error.message);
            return null;
          }
        })
      );

      return detailedMessages
        .filter(Boolean)
        .map((detail) => {
          const from = parseEmailAddress(detail.from);
          return {
            id: detail.id,
            gmail_id: detail.id,
            thread_id: detail.threadId,
            subject: detail.subject,
            snippet: detail.snippet,
            from_email: from.email,
            from_name: from.name,
            to_emails: parseEmailList(detail.to),
            cc_emails: parseEmailList(detail.cc),
            bcc_emails: parseEmailList(detail.bcc),
            sent_date: normalizeDateValue(detail.date),
            received_date: normalizeDateValue(detail.date),
            projects_mentioned: [],
            ai_summary: detail.snippet,
            importance: detail.importance || null,
            follow_up_required: false,
            labels: detail.labels || []
          };
        });
    } catch (error) {
      console.warn('Live Gmail fetch failed:', error.message);
      return [];
    }
  }

  async fetchLiveCalendarEvents(limit, days, projectId) {
    if (!calendarService || typeof calendarService.getEventsWithProjectOverlay !== 'function') {
      return [];
    }

    try {
      const windowMs = days * 24 * 60 * 60 * 1000;
      const timeMin = new Date(Date.now() - windowMs).toISOString();
      const timeMax = new Date(Date.now() + windowMs).toISOString();

      const overlay = await calendarService.getEventsWithProjectOverlay({
        maxResults: Math.max(5, Math.min(limit ?? 25, 50)),
        timeMin,
        timeMax
      });

      const events = Array.isArray(overlay?.events) ? overlay.events : [];
      if (events.length === 0) return [];

      return events
        .filter((event) => {
          if (!projectId) return true;
          const eventProjectId = event.projectInfo?.id;
          return eventProjectId ? eventProjectId === projectId : false;
        })
        .slice(0, limit)
        .map((event) => {
          const start = event.start?.dateTime || event.start?.date || event.date || event.startDate;
          const end = event.end?.dateTime || event.end?.date || event.endDate;
          const duration = event.duration_minutes || event.durationMinutes || calculateDurationMinutes(start, end);
          const relatedProjectId = event.projectInfo?.id;

          return {
            id: event.id || event.google_event_id || `live-${event.summary}-${start || ''}`,
            google_event_id: event.id || null,
            title: event.summary || event.title || 'Untitled meeting',
            description: event.description || null,
            location: event.location || null,
            meeting_link: event.meetingLink || event.meeting_link || event.hangoutLink || null,
            start_time: normalizeDateValue(start),
            end_time: normalizeDateValue(end),
            duration_minutes: duration,
            attendees: event.attendees || [],
            mentioned_projects: relatedProjectId ? [relatedProjectId] : [],
            ai_summary: event.ai_summary || event.description || event.summary || null,
            event_type: event.event_type || (event.isProjectBlock ? 'project_block' : null),
            status: event.status || null
          };
        });
    } catch (error) {
      console.warn('Live calendar fetch failed:', error.message);
      return [];
    }
  }
}

const projectActivityService = new ProjectActivityService();
export default projectActivityService;
