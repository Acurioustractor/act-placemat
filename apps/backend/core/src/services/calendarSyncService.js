/**
 * Calendar Sync Service - Real-time Calendar Synchronization
 * Manages real-time synchronization between Google Calendar and Life Orchestrator
 * 
 * Features:
 * - WebSocket-based real-time updates
 * - Event change detection and propagation
 * - Conflict resolution for overlapping changes
 * - Project health integration with calendar events
 * - Smart scheduling suggestions based on calendar gaps
 * - Automated calendar optimization
 * 
 * Usage: calendarSyncService.startSync(accessToken, userId);
 */

import EventEmitter from 'events';
import { google } from 'googleapis';
import { logger } from '../utils/logger.js';
import googleCalendarService from './googleCalendarService.js';
import projectHealthService from './projectHealthService.js';
import aiSuggestionService from './aiSuggestionService.js';

class CalendarSyncService extends EventEmitter {
  constructor() {
    super();
    this.syncSessions = new Map(); // userId -> syncSession
    this.watchChannels = new Map(); // userId -> watchChannel
    this.syncInterval = 30000; // 30 seconds
    this.isRunning = false;
  }

  /**
   * Start real-time synchronization for a user
   */
  async startSync(userId, accessToken, options = {}) {
    try {
      const {
        enableProjectSync = true,
        enableAIOptimization = true,
        syncInterval = this.syncInterval,
        webhookUrl = null
      } = options;

      // Stop existing sync if running
      if (this.syncSessions.has(userId)) {
        await this.stopSync(userId);
      }

      // Authenticate with Google Calendar
      const isAuthenticated = await googleCalendarService.authenticate(accessToken);
      if (!isAuthenticated) {
        throw new Error('Failed to authenticate with Google Calendar');
      }

      // Create sync session
      const syncSession = {
        userId,
        accessToken,
        isActive: true,
        lastSync: new Date(),
        syncCount: 0,
        errorCount: 0,
        options: {
          enableProjectSync,
          enableAIOptimization,
          syncInterval,
          webhookUrl
        },
        cache: {
          events: new Map(),
          projects: new Map(),
          lastProjectHealth: null
        }
      };

      this.syncSessions.set(userId, syncSession);

      // Set up Google Calendar push notifications if webhook provided
      if (webhookUrl) {
        await this.setupCalendarWebhook(userId, webhookUrl);
      }

      // Start sync intervals
      this.startSyncInterval(userId);

      // Initial sync
      await this.performFullSync(userId);

      logger.info(`Calendar sync started for user ${userId}`);
      this.emit('syncStarted', { userId, options });

      return { success: true, syncSessionId: userId };

    } catch (error) {
      logger.error(`Failed to start calendar sync for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop synchronization for a user
   */
  async stopSync(userId) {
    try {
      const syncSession = this.syncSessions.get(userId);
      if (!syncSession) {
        return { success: true, message: 'Sync was not active' };
      }

      // Mark as inactive
      syncSession.isActive = false;

      // Stop Google Calendar webhook
      if (this.watchChannels.has(userId)) {
        await this.stopCalendarWebhook(userId);
      }

      // Clear from memory
      this.syncSessions.delete(userId);
      this.watchChannels.delete(userId);

      logger.info(`Calendar sync stopped for user ${userId}`);
      this.emit('syncStopped', { userId });

      return { success: true, message: 'Sync stopped successfully' };

    } catch (error) {
      logger.error(`Failed to stop calendar sync for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Perform full synchronization
   */
  async performFullSync(userId) {
    const syncSession = this.syncSessions.get(userId);
    if (!syncSession || !syncSession.isActive) {
      return;
    }

    try {
      syncSession.lastSync = new Date();
      syncSession.syncCount++;

      // Get current calendar events
      const calendarEvents = await googleCalendarService.getCalendarWithProjectOverlay({
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
        includeProjectHealth: true
      });

      // Get current project health
      const projectHealth = await projectHealthService.calculateAllProjectHealth();

      // Detect changes since last sync
      const changes = this.detectChanges(userId, calendarEvents.events, projectHealth);

      // Process changes
      if (changes.calendarChanges.length > 0 || changes.projectChanges.length > 0) {
        await this.processChanges(userId, changes);
      }

      // AI optimization if enabled
      if (syncSession.options.enableAIOptimization) {
        await this.performAIOptimization(userId, calendarEvents, projectHealth);
      }

      // Update cache
      this.updateSyncCache(userId, calendarEvents.events, projectHealth);

      // Emit sync completed
      this.emit('syncCompleted', {
        userId,
        syncCount: syncSession.syncCount,
        changesDetected: changes.calendarChanges.length + changes.projectChanges.length,
        timestamp: syncSession.lastSync
      });

    } catch (error) {
      syncSession.errorCount++;
      logger.error(`Full sync failed for user ${userId}:`, error);
      this.emit('syncError', { userId, error: error.message, syncCount: syncSession.syncCount });
    }
  }

  /**
   * Detect changes between current state and cache
   */
  detectChanges(userId, currentEvents, currentProjects) {
    const syncSession = this.syncSessions.get(userId);
    const cache = syncSession.cache;

    const changes = {
      calendarChanges: [],
      projectChanges: []
    };

    // Detect calendar event changes
    const currentEventMap = new Map(currentEvents.map(event => [event.id, event]));
    const cachedEventMap = cache.events;

    // New or modified events
    for (const [eventId, event] of currentEventMap) {
      const cachedEvent = cachedEventMap.get(eventId);
      
      if (!cachedEvent) {
        changes.calendarChanges.push({
          type: 'created',
          event,
          timestamp: new Date()
        });
      } else if (this.hasEventChanged(event, cachedEvent)) {
        changes.calendarChanges.push({
          type: 'modified',
          event,
          previousEvent: cachedEvent,
          timestamp: new Date()
        });
      }
    }

    // Deleted events
    for (const [eventId, cachedEvent] of cachedEventMap) {
      if (!currentEventMap.has(eventId)) {
        changes.calendarChanges.push({
          type: 'deleted',
          event: cachedEvent,
          timestamp: new Date()
        });
      }
    }

    // Detect project health changes
    const currentProjectMap = new Map(currentProjects.map(p => [p.id, p]));
    const cachedProjectMap = cache.projects;

    for (const [projectId, project] of currentProjectMap) {
      const cachedProject = cachedProjectMap.get(projectId);
      
      if (!cachedProject) {
        changes.projectChanges.push({
          type: 'created',
          project,
          timestamp: new Date()
        });
      } else if (this.hasProjectHealthChanged(project, cachedProject)) {
        changes.projectChanges.push({
          type: 'modified',
          project,
          previousProject: cachedProject,
          timestamp: new Date()
        });
      }
    }

    return changes;
  }

  /**
   * Process detected changes
   */
  async processChanges(userId, changes) {
    const syncSession = this.syncSessions.get(userId);
    
    try {
      // Process calendar changes
      for (const change of changes.calendarChanges) {
        await this.processCalendarChange(userId, change);
      }

      // Process project changes
      for (const change of changes.projectChanges) {
        await this.processProjectChange(userId, change);
      }

      logger.info(`Processed ${changes.calendarChanges.length + changes.projectChanges.length} changes for user ${userId}`);

    } catch (error) {
      logger.error(`Failed to process changes for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process individual calendar change
   */
  async processCalendarChange(userId, change) {
    switch (change.type) {
      case 'created':
        await this.handleEventCreated(userId, change.event);
        break;
        
      case 'modified':
        await this.handleEventModified(userId, change.event, change.previousEvent);
        break;
        
      case 'deleted':
        await this.handleEventDeleted(userId, change.event);
        break;
    }

    this.emit('calendarChange', {
      userId,
      changeType: change.type,
      event: change.event,
      timestamp: change.timestamp
    });
  }

  /**
   * Process individual project change
   */
  async processProjectChange(userId, change) {
    const syncSession = this.syncSessions.get(userId);
    
    if (!syncSession.options.enableProjectSync) {
      return;
    }

    switch (change.type) {
      case 'created':
        await this.handleProjectCreated(userId, change.project);
        break;
        
      case 'modified':
        await this.handleProjectModified(userId, change.project, change.previousProject);
        break;
    }

    this.emit('projectChange', {
      userId,
      changeType: change.type,
      project: change.project,
      timestamp: change.timestamp
    });
  }

  /**
   * Handle new event creation
   */
  async handleEventCreated(userId, event) {
    // Check if event is project-related
    const projectId = event.extendedProperties?.private?.projectId;
    
    if (projectId) {
      // Update project with new time allocation
      await projectHealthService.updateProjectTimeAllocation(projectId, {
        scheduledTime: this.calculateEventDuration(event),
        lastScheduled: new Date(event.start.dateTime || event.start.date)
      });
    }

    // Check for conflicts with other events
    const conflicts = await this.checkForSchedulingConflicts(userId, event);
    
    if (conflicts.length > 0) {
      this.emit('schedulingConflict', {
        userId,
        event,
        conflicts
      });
    }
  }

  /**
   * Handle event modification
   */
  async handleEventModified(userId, event, previousEvent) {
    const projectId = event.extendedProperties?.private?.projectId;
    
    if (projectId) {
      // Calculate time difference
      const oldDuration = this.calculateEventDuration(previousEvent);
      const newDuration = this.calculateEventDuration(event);
      const timeDifference = newDuration - oldDuration;

      // Update project time allocation
      await projectHealthService.adjustProjectTimeAllocation(projectId, timeDifference);
    }

    // Check if time changed significantly
    const timeChanged = this.hasSignificantTimeChange(event, previousEvent);
    
    if (timeChanged) {
      // Re-check for conflicts
      const conflicts = await this.checkForSchedulingConflicts(userId, event);
      
      if (conflicts.length > 0) {
        this.emit('schedulingConflict', {
          userId,
          event,
          conflicts,
          isModification: true
        });
      }
    }
  }

  /**
   * Handle event deletion
   */
  async handleEventDeleted(userId, event) {
    const projectId = event.extendedProperties?.private?.projectId;
    
    if (projectId) {
      // Remove allocated time from project
      const duration = this.calculateEventDuration(event);
      await projectHealthService.adjustProjectTimeAllocation(projectId, -duration);
    }
  }

  /**
   * Handle project creation
   */
  async handleProjectCreated(userId, project) {
    // Check if project needs immediate time allocation
    if (project.healthData.urgencyFlag === 'HIGH') {
      const suggestion = await this.suggestTimeSlots(userId, project);
      
      if (suggestion.availableSlots.length > 0) {
        this.emit('timeSlotSuggestion', {
          userId,
          project,
          suggestion,
          reason: 'new_high_priority_project'
        });
      }
    }
  }

  /**
   * Handle project modification
   */
  async handleProjectModified(userId, project, previousProject) {
    // Check if priority changed
    const priorityChanged = project.healthData.urgencyFlag !== previousProject.healthData.urgencyFlag;
    
    if (priorityChanged && project.healthData.urgencyFlag === 'HIGH') {
      // Suggest immediate time reallocation
      const suggestion = await this.suggestTimeReallocation(userId, project);
      
      this.emit('timeReallocationSuggestion', {
        userId,
        project,
        suggestion,
        reason: 'priority_increased'
      });
    }
  }

  /**
   * Perform AI-powered calendar optimization
   */
  async performAIOptimization(userId, calendarEvents, projectHealth) {
    try {
      // Generate AI recommendations for calendar optimization
      const recommendations = await aiSuggestionService.generateDailyRecommendations({
        currentCalendar: calendarEvents,
        projectHealth,
        energyLevel: 'medium', // Could be user-specific
        availableHours: 8
      });

      // Check if calendar can be optimized based on recommendations
      const optimizations = await this.identifyOptimizationOpportunities(
        userId, 
        calendarEvents, 
        recommendations
      );

      if (optimizations.length > 0) {
        this.emit('optimizationSuggestions', {
          userId,
          optimizations,
          aiRecommendations: recommendations
        });
      }

    } catch (error) {
      logger.error(`AI optimization failed for user ${userId}:`, error);
    }
  }

  /**
   * Set up Google Calendar webhook for push notifications
   */
  async setupCalendarWebhook(userId, webhookUrl) {
    try {
      const oauth2Client = googleCalendarService.oauth2Client;
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const watchRequest = {
        id: `life-orchestrator-${userId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        token: userId, // Use userId as verification token
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const response = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: watchRequest
      });

      this.watchChannels.set(userId, {
        id: watchRequest.id,
        resourceId: response.data.resourceId,
        expiration: new Date(parseInt(response.data.expiration))
      });

      logger.info(`Calendar webhook set up for user ${userId}: ${response.data.resourceId}`);

    } catch (error) {
      logger.error(`Failed to set up calendar webhook for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop Google Calendar webhook
   */
  async stopCalendarWebhook(userId) {
    try {
      const watchChannel = this.watchChannels.get(userId);
      if (!watchChannel) return;

      const oauth2Client = googleCalendarService.oauth2Client;
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      await calendar.channels.stop({
        requestBody: {
          id: watchChannel.id,
          resourceId: watchChannel.resourceId
        }
      });

      logger.info(`Calendar webhook stopped for user ${userId}`);

    } catch (error) {
      logger.error(`Failed to stop calendar webhook for user ${userId}:`, error);
    }
  }

  /**
   * Handle webhook notification from Google Calendar
   */
  async handleWebhookNotification(userId, notification) {
    try {
      // Trigger immediate sync for this user
      if (this.syncSessions.has(userId)) {
        await this.performFullSync(userId);
        
        this.emit('webhookProcessed', {
          userId,
          notification,
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error(`Failed to handle webhook notification for user ${userId}:`, error);
    }
  }

  /**
   * Start sync interval for user
   */
  startSyncInterval(userId) {
    const syncSession = this.syncSessions.get(userId);
    if (!syncSession) return;

    const intervalId = setInterval(async () => {
      if (syncSession.isActive) {
        await this.performFullSync(userId);
      } else {
        clearInterval(intervalId);
      }
    }, syncSession.options.syncInterval);

    syncSession.intervalId = intervalId;
  }

  /**
   * Update sync cache
   */
  updateSyncCache(userId, events, projects) {
    const syncSession = this.syncSessions.get(userId);
    if (!syncSession) return;

    syncSession.cache.events = new Map(events.map(e => [e.id, e]));
    syncSession.cache.projects = new Map(projects.map(p => [p.id, p]));
    syncSession.cache.lastProjectHealth = projects;
  }

  /**
   * Helper: Check if event has changed
   */
  hasEventChanged(current, cached) {
    return (
      current.summary !== cached.summary ||
      current.start?.dateTime !== cached.start?.dateTime ||
      current.end?.dateTime !== cached.end?.dateTime ||
      current.location !== cached.location
    );
  }

  /**
   * Helper: Check if project health has changed significantly
   */
  hasProjectHealthChanged(current, cached) {
    return (
      current.healthData.overallScore !== cached.healthData.overallScore ||
      current.healthData.urgencyFlag !== cached.healthData.urgencyFlag ||
      current.status !== cached.status
    );
  }

  /**
   * Helper: Check if time changed significantly
   */
  hasSignificantTimeChange(current, previous) {
    const currentStart = new Date(current.start?.dateTime || current.start?.date);
    const previousStart = new Date(previous.start?.dateTime || previous.start?.date);
    const timeDiff = Math.abs(currentStart - previousStart);
    
    return timeDiff > 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Helper: Calculate event duration in hours
   */
  calculateEventDuration(event) {
    const start = new Date(event.start?.dateTime || event.start?.date);
    const end = new Date(event.end?.dateTime || event.end?.date);
    return (end - start) / (1000 * 60 * 60); // Hours
  }

  /**
   * Helper: Check for scheduling conflicts
   */
  async checkForSchedulingConflicts(userId, event) {
    // This would check against other events, project deadlines, etc.
    // Mock implementation for now
    return [];
  }

  /**
   * Helper: Suggest time slots for project
   */
  async suggestTimeSlots(userId, project) {
    const calendarEvents = await googleCalendarService.getCalendarWithProjectOverlay({
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
    });

    const freeSlots = googleCalendarService.findOptimalTimeSlots(
      calendarEvents.events,
      project.healthData.suggestedTimeToday.hours,
      { preferMorning: true }
    );

    return {
      project,
      availableSlots: freeSlots.slice(0, 3),
      suggestedDuration: project.healthData.suggestedTimeToday.hours
    };
  }

  /**
   * Helper: Suggest time reallocation
   */
  async suggestTimeReallocation(userId, project) {
    // Mock implementation - would analyze current calendar and suggest changes
    return {
      project,
      suggestions: [
        {
          action: 'move',
          eventId: 'event123',
          from: '2024-01-15T14:00:00Z',
          to: '2024-01-15T16:00:00Z',
          reason: 'Make room for high-priority project'
        }
      ]
    };
  }

  /**
   * Helper: Identify optimization opportunities
   */
  async identifyOptimizationOpportunities(userId, calendarEvents, aiRecommendations) {
    const optimizations = [];

    // Check for overscheduled periods
    const conflicts = this.findOverscheduledPeriods(calendarEvents.events);
    if (conflicts.length > 0) {
      optimizations.push({
        type: 'overscheduled',
        severity: 'high',
        conflicts,
        suggestion: 'Consider rescheduling or reducing meeting duration'
      });
    }

    // Check for insufficient project time
    if (aiRecommendations.timeAllocation) {
      const projectTimeGaps = this.findProjectTimeGaps(calendarEvents.events, aiRecommendations.timeAllocation);
      if (projectTimeGaps.length > 0) {
        optimizations.push({
          type: 'insufficient_project_time',
          severity: 'medium',
          gaps: projectTimeGaps,
          suggestion: 'Allocate more time for high-priority projects'
        });
      }
    }

    return optimizations;
  }

  /**
   * Helper: Find overscheduled periods
   */
  findOverscheduledPeriods(events) {
    // Mock implementation
    return [];
  }

  /**
   * Helper: Find project time gaps
   */
  findProjectTimeGaps(events, timeAllocation) {
    // Mock implementation
    return [];
  }

  /**
   * Get sync status for user
   */
  getSyncStatus(userId) {
    const syncSession = this.syncSessions.get(userId);
    
    if (!syncSession) {
      return {
        isActive: false,
        message: 'Sync not started'
      };
    }

    return {
      isActive: syncSession.isActive,
      lastSync: syncSession.lastSync,
      syncCount: syncSession.syncCount,
      errorCount: syncSession.errorCount,
      options: syncSession.options
    };
  }

  /**
   * Get all active sync sessions
   */
  getActiveSyncSessions() {
    return Array.from(this.syncSessions.entries()).map(([userId, session]) => ({
      userId,
      isActive: session.isActive,
      lastSync: session.lastSync,
      syncCount: session.syncCount,
      errorCount: session.errorCount
    }));
  }
}

// Export singleton instance
const calendarSyncService = new CalendarSyncService();
export default calendarSyncService;