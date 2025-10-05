/**
 * Google Calendar Integration Service
 * Full Google Calendar API integration with OAuth2 authentication
 * 
 * Features:
 * - OAuth2 authentication flow
 * - Read/write calendar events
 * - Real-time calendar sync
 * - Project time blocking
 * - Smart event suggestions
 * - Calendar overlay with project health
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import projectHealthService from './projectHealthService.js';
import aiSuggestionService from './aiSuggestionService.js';

export class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
    this.calendarCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    
    // Initialize OAuth2 client
    this.initializeOAuth();
    
    console.log('📅 Google Calendar Service initialized');
  }

  /**
   * Initialize OAuth2 client
   */
  initializeOAuth() {
    const clientId =
      process.env.GOOGLE_CALENDAR_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GMAIL_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GMAIL_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GMAIL_REDIRECT_URI ||
      'http://localhost:3000/auth/google/callback';

    if (!clientId || !clientSecret) {
      console.warn('Google Calendar credentials not configured');
      return;
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Check for stored tokens
    const tokens = this.getStoredTokens();
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('✅ Google Calendar authenticated with stored tokens');
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticateWithCode(code) {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Initialize calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Store tokens securely
      this.storeTokens(tokens);
      
      // Test the connection
      await this.testConnection();
      
      console.log('✅ Google Calendar authentication successful');
      return { success: true, tokens };

    } catch (error) {
      console.error('Failed to authenticate with Google Calendar:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get user's calendars
   */
  async getCalendars() {
    try {
      this.ensureAuthenticated();
      
      const cacheKey = 'calendars_list';
      if (this.calendarCache.has(cacheKey)) {
        return this.calendarCache.get(cacheKey);
      }

      const response = await this.calendar.calendarList.list();
      const calendars = response.data.items.map(cal => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor
      }));

      this.calendarCache.set(cacheKey, calendars);
      setTimeout(() => this.calendarCache.delete(cacheKey), this.cacheTimeout);

      return calendars;

    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw new Error(`Failed to retrieve calendars: ${error.message}`);
    }
  }

  /**
   * Get events from calendar with project overlay
   */
  async getEventsWithProjectOverlay(options = {}) {
    try {
      const {
        calendarId = 'primary',
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        maxResults = 50
      } = options;

      this.ensureAuthenticated();

      // Get calendar events
      const response = await this.calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Get project health data for overlay
      const projectHealth = await projectHealthService.calculateAllProjectHealth();
      
      // Enhanced events with project information
      const enhancedEvents = await this.enhanceEventsWithProjectData(events, projectHealth);
      
      // Get AI suggestions for free time slots
      const freeTimeSlots = this.identifyFreeTimeSlots(events, timeMin, timeMax);
      const aiSuggestions = await this.generateTimeBlockSuggestions(freeTimeSlots, projectHealth);

      return {
        events: enhancedEvents,
        freeTimeSlots,
        aiSuggestions,
        projectOverlay: this.generateProjectOverlay(projectHealth),
        calendarStats: this.calculateCalendarStats(events)
      };

    } catch (error) {
      console.error('Failed to get events with project overlay:', error);
      throw new Error(`Failed to retrieve events: ${error.message}`);
    }
  }

  /**
   * Create project-based time blocks
   */
  async createProjectTimeBlocks(timeBlocks) {
    try {
      this.ensureAuthenticated();
      
      const createdEvents = [];
      
      for (const block of timeBlocks) {
        const event = {
          summary: `🎯 ${block.projectName}`,
          description: this.generateProjectEventDescription(block),
          start: {
            dateTime: new Date(block.startTime).toISOString(),
            timeZone: 'Australia/Melbourne'
          },
          end: {
            dateTime: new Date(block.endTime).toISOString(),
            timeZone: 'Australia/Melbourne'
          },
          colorId: this.getProjectColorId(block.urgency),
          extendedProperties: {
            private: {
              projectId: block.projectId,
              projectHealth: block.healthScore.toString(),
              urgency: block.urgency,
              generatedBy: 'life-orchestrator'
            }
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 15 },
              { method: 'popup', minutes: 5 }
            ]
          }
        };

        const createdEvent = await this.calendar.events.insert({
          calendarId: 'primary',
          resource: event
        });

        createdEvents.push({
          ...createdEvent.data,
          projectInfo: block
        });

        console.log(`✅ Created time block for ${block.projectName}`);
      }

      return createdEvents;

    } catch (error) {
      console.error('Failed to create project time blocks:', error);
      throw new Error(`Failed to create time blocks: ${error.message}`);
    }
  }

  /**
   * Get today's schedule with AI optimization
   */
  async getTodaysOptimizedSchedule() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const eventsData = await this.getEventsWithProjectOverlay({
        timeMin: startOfDay,
        timeMax: endOfDay
      });

      // Generate AI-optimized schedule
      const aiOptimization = await aiSuggestionService.optimizeSchedule(
        eventsData.events,
        { allocations: eventsData.aiSuggestions }
      );

      return {
        currentSchedule: eventsData.events,
        freeTimeSlots: eventsData.freeTimeSlots,
        aiOptimization,
        recommendations: {
          timeBlocks: eventsData.aiSuggestions.slice(0, 3),
          energyAlignment: this.alignWithEnergyLevels(eventsData.freeTimeSlots),
          focusBlocks: this.suggestFocusBlocks(eventsData.freeTimeSlots)
        },
        stats: eventsData.calendarStats
      };

    } catch (error) {
      console.error('Failed to get optimized schedule:', error);
      throw new Error(`Failed to generate optimized schedule: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  enhanceEventsWithProjectData(events, projectHealth) {
    return events.map(event => {
      const projectId = event.extendedProperties?.private?.projectId;
      const relatedProject = projectId ? 
        projectHealth.find(p => p.id === projectId) : null;

      return {
        ...event,
        projectInfo: relatedProject ? {
          id: relatedProject.id,
          name: relatedProject.name,
          healthScore: relatedProject.healthData.overallScore,
          urgency: relatedProject.healthData.urgencyFlag,
          recommendations: relatedProject.healthData.recommendations.slice(0, 2)
        } : null,
        isProjectBlock: Boolean(event.extendedProperties?.private?.generatedBy === 'life-orchestrator'),
        enhancedTitle: this.generateEnhancedEventTitle(event, relatedProject)
      };
    });
  }

  identifyFreeTimeSlots(events, timeMin, timeMax) {
    const freeSlots = [];
    
    // Simple algorithm to find gaps between events
    const sortedEvents = events
      .filter(e => e.start?.dateTime) // Only timed events
      .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

    let currentTime = new Date(timeMin);
    
    for (const event of sortedEvents) {
      const eventStart = new Date(event.start.dateTime);
      
      // If there's a gap, it's a free slot
      if (currentTime < eventStart && (eventStart - currentTime) >= 30 * 60 * 1000) { // 30+ min gaps
        const slotDuration = (eventStart - currentTime) / (1000 * 60); // minutes
        
        if (slotDuration >= 30) {
          freeSlots.push({
            start: currentTime.toISOString(),
            end: eventStart.toISOString(),
            duration: Math.floor(slotDuration),
            suitableFor: this.categorizeFreeSlot(slotDuration)
          });
        }
      }
      
      currentTime = new Date(Math.max(currentTime, new Date(event.end.dateTime)));
    }

    return freeSlots;
  }

  async generateTimeBlockSuggestions(freeTimeSlots, projectHealth) {
    const suggestions = [];
    
    // Get AI recommendations
    const aiRecs = await aiSuggestionService.calculateOptimalTimeAllocation(projectHealth, 8);
    
    for (const allocation of (aiRecs.allocations || []).slice(0, 3)) {
      const suitableSlots = freeTimeSlots.filter(slot => 
        slot.duration >= allocation.suggestedHours * 60
      );

      if (suitableSlots.length > 0) {
        suggestions.push({
          projectId: allocation.projectId,
          projectName: allocation.projectName,
          suggestedHours: allocation.suggestedHours,
          priority: allocation.priority,
          availableSlots: suitableSlots.slice(0, 3),
          reasoning: allocation.reasoning
        });
      }
    }

    return suggestions;
  }

  generateProjectOverlay(projectHealth) {
    return {
      totalProjects: projectHealth.length,
      criticalProjects: projectHealth.filter(p => p.healthData.urgencyFlag === 'HIGH').length,
      healthyProjects: projectHealth.filter(p => p.healthData.overallScore > 70).length,
      averageHealth: Math.round(
        projectHealth.reduce((sum, p) => sum + p.healthData.overallScore, 0) / projectHealth.length
      ),
      topPriorities: projectHealth.slice(0, 3).map(p => ({
        name: p.name,
        health: p.healthData.overallScore,
        urgency: p.healthData.urgencyFlag,
        suggestedTime: p.healthData.suggestedTimeToday.hours
      }))
    };
  }

  calculateCalendarStats(events) {
    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.start.dateTime || e.start.date) > now);
    const projectBlocks = events.filter(e => e.extendedProperties?.private?.generatedBy === 'life-orchestrator');
    
    return {
      totalEvents: events.length,
      upcomingEvents: upcomingEvents.length,
      projectBlocks: projectBlocks.length,
      freeTimePercentage: this.calculateFreeTimePercentage(events),
      nextEvent: upcomingEvents[0] || null
    };
  }

  generateProjectEventDescription(block) {
    return `🎯 Focused work session for ${block.projectName}

Health Score: ${block.healthScore || 'N/A'}% 
Priority: ${block.urgency}
Estimated Duration: ${block.suggestedHours}h

Generated by Life Orchestrator 🎼`;
  }

  getProjectColorId(urgency) {
    const colorMap = {
      'HIGH': '11', // Red
      'MEDIUM': '5', // Yellow  
      'LOW': '2'    // Green
    };
    return colorMap[urgency] || '1'; // Default blue
  }

  generateEnhancedEventTitle(event, project) {
    if (!project) return event.summary;
    
    const healthEmoji = project.healthData.overallScore > 70 ? '🟢' : 
                       project.healthData.overallScore > 50 ? '🟡' : '🔴';
    
    return `${healthEmoji} ${event.summary} (${project.healthData.overallScore}%)`;
  }

  categorizeFreeSlot(durationMinutes) {
    if (durationMinutes >= 120) return ['deep_work', 'project_focus', 'creative_tasks'];
    if (durationMinutes >= 60) return ['meetings', 'planning', 'moderate_tasks'];
    if (durationMinutes >= 30) return ['quick_calls', 'email', 'admin_tasks'];
    return ['break', 'transition'];
  }

  alignWithEnergyLevels(freeTimeSlots) {
    return freeTimeSlots.map(slot => {
      const hour = new Date(slot.start).getHours();
      let energyLevel = 'medium';
      
      if (hour >= 9 && hour <= 11) energyLevel = 'high'; // Morning peak
      if (hour >= 14 && hour <= 16) energyLevel = 'high'; // Afternoon peak
      if (hour >= 12 && hour <= 13) energyLevel = 'low';  // Lunch dip
      if (hour >= 17) energyLevel = 'low'; // Evening wind-down
      
      return {
        ...slot,
        energyLevel,
        recommendedFor: this.getEnergyRecommendations(energyLevel)
      };
    });
  }

  getEnergyRecommendations(energyLevel) {
    const recommendations = {
      high: ['Complex problem solving', 'Creative work', 'Important decisions'],
      medium: ['Meetings', 'Planning', 'Regular tasks'],
      low: ['Admin tasks', 'Email', 'Planning tomorrow']
    };
    return recommendations[energyLevel] || recommendations.medium;
  }

  suggestFocusBlocks(freeTimeSlots) {
    return freeTimeSlots
      .filter(slot => slot.duration >= 90) // 1.5+ hour blocks
      .map(slot => ({
        ...slot,
        focusType: 'Deep Work',
        suggestions: [
          'Turn off notifications',
          'Set status to "Do Not Disturb"',
          'Have water and snacks ready',
          'Define clear outcome for the session'
        ]
      }));
  }

  calculateFreeTimePercentage(events) {
    // Simple calculation - would be more sophisticated in real implementation
    const workingHours = 8 * 60; // 8 hours in minutes
    const eventMinutes = events.reduce((total, event) => {
      if (event.start.dateTime && event.end.dateTime) {
        const duration = new Date(event.end.dateTime) - new Date(event.start.dateTime);
        return total + (duration / (1000 * 60));
      }
      return total;
    }, 0);
    
    return Math.max(0, Math.round(((workingHours - eventMinutes) / workingHours) * 100));
  }

  ensureAuthenticated() {
    if (!this.calendar || !this.oauth2Client) {
      throw new Error('Google Calendar not authenticated. Please authenticate first.');
    }
  }

  async testConnection() {
    try {
      await this.calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  getStoredTokens() {
    const candidatePaths = [];
    if (process.env.GOOGLE_CALENDAR_TOKENS_PATH) {
      candidatePaths.push(process.env.GOOGLE_CALENDAR_TOKENS_PATH);
    }

    const cwd = process.cwd();
    candidatePaths.push(
      path.join(cwd, '.google_calendar_tokens.json'),
      path.join(cwd, '..', '.google_calendar_tokens.json'),
      path.join(cwd, '.gmail_tokens.json'),
      path.join(cwd, '..', '.gmail_tokens.json'),
      path.join(cwd, '..', '..', '.gmail_tokens.json')
    );

    const seen = new Set();
    for (const candidate of candidatePaths) {
      if (!candidate || seen.has(candidate)) continue;
      seen.add(candidate);

      try {
        if (fs.existsSync(candidate)) {
          const raw = fs.readFileSync(candidate, 'utf8');
          if (raw) {
            console.log(`🔐 Loaded Google Calendar tokens from ${candidate}`);
            return JSON.parse(raw);
          }
        }
      } catch (fileError) {
        logger?.warn?.(`Failed to read Calendar token file at ${candidate}: ${fileError.message}`);
      }
    }

    // Fallback to environment variables when token files are not available
    const refreshToken =
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      process.env.GMAIL_REFRESH_TOKEN ||
      null;
    const accessToken =
      process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ||
      process.env.GOOGLE_ACCESS_TOKEN ||
      process.env.GMAIL_ACCESS_TOKEN ||
      null;

    if (refreshToken || accessToken) {
      console.log('🔐 Loaded Google Calendar tokens from environment variables');
      return {
        refresh_token: refreshToken,
        access_token: accessToken
      };
    }

    return null;
  }

  storeTokens(tokens) {
    // In production, store tokens securely
    // For demo purposes, log them (in real app, save to secure storage)
    console.log('🔐 Google Calendar tokens received (store these securely)');
    if (tokens.refresh_token) {
      console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
    }
    if (tokens.access_token) {
      console.log(`GOOGLE_CALENDAR_ACCESS_TOKEN=${tokens.access_token}`);
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
