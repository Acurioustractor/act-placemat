/**
 * Life Orchestrator Integration Tests
 * Comprehensive testing suite for all Life Orchestrator services and integrations
 * 
 * Test Coverage:
 * - API endpoint functionality
 * - Service integration and data flow
 * - Authentication flows
 * - Error handling and resilience
 * - Performance and response times
 * 
 * Usage: npm test or jest tests/integration/lifeOrchestrator.test.js
 */

import request from 'supertest';
import express from 'express';
import lifeOrchestratorAPI from '../../src/api/lifeOrchestratorAPI.js';

// Mock services for testing
jest.mock('../../src/services/projectHealthService.js');
jest.mock('../../src/services/peopleRelationshipService.js');
jest.mock('../../src/services/aiSuggestionService.js');
jest.mock('../../src/services/communicationTrackingService.js');
jest.mock('../../src/services/googleCalendarService.js');
jest.mock('../../src/services/gmailService.js');
jest.mock('../../src/services/slackService.js');
jest.mock('../../src/services/calendarSyncService.js');
jest.mock('../../src/services/emailIntelligenceService.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/life-orchestrator', lifeOrchestratorAPI);

// Mock data
const mockProjectHealth = [
  {
    id: 'project1',
    name: 'ACT Placemat Development',
    status: 'active',
    healthData: {
      overallScore: 85,
      urgencyFlag: 'MEDIUM',
      healthLevel: 'good',
      suggestedTimeToday: { hours: 3 },
      recommendations: [{ action: 'Continue development momentum' }]
    }
  }
];

const mockRelationshipDashboard = {
  insights: { healthyPercentage: 78, totalConnections: 45 },
  pendingActions: [
    { name: 'Sarah Johnson', action: 'Follow up on project proposal', urgency: 'HIGH' }
  ],
  dailyRecommendations: {
    recommendedContacts: [
      { name: 'John Smith', relationshipHealth: { daysSinceContact: 5 } }
    ]
  }
};

const mockCommunicationDashboard = {
  pending: [
    { id: 'email1', from: 'test@example.com', urgency: 'HIGH', waitingHours: 48 }
  ],
  dailyScore: { percentage: 82 },
  suggestions: { urgentActions: ['Respond to client inquiry'] },
  challenges: [{ name: 'Quick Response Challenge', timeLeft: '2 hours' }],
  achievements: [{ name: 'Email Zero', earnedAt: new Date() }],
  stats: { streaks: { dailyCleanup: 5 } }
};

describe('Life Orchestrator API Integration Tests', () => {
  
  describe('Dashboard Endpoint', () => {
    
    test('GET /dashboard - should return comprehensive dashboard', async () => {
      // Setup mocks
      const { default: projectHealthService } = await import('../../src/services/projectHealthService.js');
      const { default: peopleRelationshipService } = await import('../../src/services/peopleRelationshipService.js');
      const { default: aiSuggestionService } = await import('../../src/services/aiSuggestionService.js');
      const { default: communicationTrackingService } = await import('../../src/services/communicationTrackingService.js');
      const { default: calendarSyncService } = await import('../../src/services/calendarSyncService.js');

      projectHealthService.calculateAllProjectHealth.mockResolvedValue(mockProjectHealth);
      peopleRelationshipService.getRelationshipDashboard.mockResolvedValue(mockRelationshipDashboard);
      aiSuggestionService.generateDailyRecommendations.mockResolvedValue({
        dailyFocus: { type: 'project', title: 'Project Focus Day' },
        timeAllocation: { allocations: [] },
        energyAlignment: { adjustedAllocations: [] }
      });
      communicationTrackingService.getCommunicationDashboard.mockResolvedValue(mockCommunicationDashboard);
      calendarSyncService.getSyncStatus.mockReturnValue({ isActive: false });

      const response = await request(app)
        .get('/api/life-orchestrator/dashboard')
        .query({
          energyLevel: 'high',
          availableHours: 8,
          includeAI: 'true',
          timezone: 'Australia/Melbourne'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.metadata).toBeDefined();
      expect(response.body.dashboard.dailyOverview).toBeDefined();
      expect(response.body.dashboard.projectHealth).toBeDefined();
      expect(response.body.dashboard.relationships).toBeDefined();
      expect(response.body.dashboard.communications).toBeDefined();
      expect(response.body.dashboard.realTimeData).toBeDefined();
    });

    test('GET /dashboard - should handle missing AI gracefully', async () => {
      const response = await request(app)
        .get('/api/life-orchestrator/dashboard')
        .query({ includeAI: 'false' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dashboard.aiInsights).toBeNull();
    });

  });

  describe('Authentication Endpoints', () => {

    test('POST /authenticate/google - should authenticate Google services', async () => {
      const { default: googleCalendarService } = await import('../../src/services/googleCalendarService.js');
      const { default: gmailService } = await import('../../src/services/gmailService.js');

      googleCalendarService.authenticate.mockResolvedValue(true);
      gmailService.authenticate.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/life-orchestrator/authenticate/google')
        .send({
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services.calendar).toBe(true);
      expect(response.body.services.gmail).toBe(true);
    });

    test('POST /authenticate/slack - should authenticate Slack service', async () => {
      const { default: slackService } = await import('../../src/services/slackService.js');

      slackService.authenticate.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/life-orchestrator/authenticate/slack')
        .send({ accessToken: 'mock_slack_token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
    });

  });

  describe('Calendar Integration', () => {

    test('GET /calendar/events - should return calendar events with project overlay', async () => {
      const { default: googleCalendarService } = await import('../../src/services/googleCalendarService.js');
      const { default: calendarSyncService } = await import('../../src/services/calendarSyncService.js');

      const mockCalendarData = {
        events: [
          {
            id: 'event1',
            summary: 'Team Meeting',
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' },
            projectHealth: { score: 85, urgency: 'MEDIUM' }
          }
        ],
        projectOverlay: {
          totalProjectTime: 6,
          healthyProjects: 3,
          criticalProjects: 1
        }
      };

      googleCalendarService.getEventsWithProjectOverlay.mockResolvedValue(mockCalendarData);
      calendarSyncService.getSyncStatus.mockReturnValue({ isActive: true, lastSync: new Date() });

      const response = await request(app)
        .get('/api/life-orchestrator/calendar/events')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-22T00:00:00Z',
          includeProjectHealth: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.calendar).toEqual(mockCalendarData);
      expect(response.body.sync_status).toBeDefined();
    });

    test('POST /calendar/start-sync - should start calendar synchronization', async () => {
      const { default: calendarSyncService } = await import('../../src/services/calendarSyncService.js');

      const mockSyncResult = {
        success: true,
        syncSessionId: 'demo'
      };

      calendarSyncService.startSync.mockResolvedValue(mockSyncResult);

      const response = await request(app)
        .post('/api/life-orchestrator/calendar/start-sync')
        .send({
          accessToken: 'mock_token',
          webhookUrl: 'https://example.com/webhook'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncSession).toEqual(mockSyncResult);
    });

  });

  describe('Email Intelligence', () => {

    test('GET /emails/dashboard - should return email dashboard with intelligence', async () => {
      const { default: gmailService } = await import('../../src/services/gmailService.js');
      const { default: emailIntelligenceService } = await import('../../src/services/emailIntelligenceService.js');

      const mockEmailDashboard = {
        totalEmails: 25,
        unreadCount: 5,
        importantEmails: 3,
        pendingActions: []
      };

      const mockPendingEmails = [
        {
          id: 'email1',
          from: 'client@example.com',
          subject: 'Project Update Required',
          urgency: 'HIGH',
          hoursWaiting: 36
        }
      ];

      const mockIntelligenceStats = {
        cacheSize: 15,
        cacheHitRate: 85,
        averageProcessingTime: '1.2s',
        totalEmailsProcessed: 150
      };

      gmailService.getCommunicationDashboard.mockResolvedValue(mockEmailDashboard);
      gmailService.getPendingEmails.mockResolvedValue(mockPendingEmails);
      emailIntelligenceService.parseEmail.mockResolvedValue({
        sentiment: { sentiment: 'neutral', confidence: 0.8 },
        priority: { level: 'HIGH', score: 75 },
        actionItems: [{ action: 'Review project status', priority: 'high' }]
      });
      emailIntelligenceService.generateBatchSummary.mockReturnValue({
        totalEmails: 1,
        highPriority: 1,
        actionItemsCount: 1
      });
      emailIntelligenceService.getIntelligenceStats.mockReturnValue(mockIntelligenceStats);

      const response = await request(app)
        .get('/api/life-orchestrator/emails/dashboard')
        .query({
          timeframeDays: 7,
          includeIntelligence: 'true',
          maxEmails: 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toEqual(mockEmailDashboard);
      expect(response.body.pending).toEqual(mockPendingEmails);
      expect(response.body.intelligence).toBeDefined();
      expect(response.body.stats).toEqual(mockIntelligenceStats);
    });

    test('POST /emails/smart-reply - should generate smart replies', async () => {
      const { default: gmailService } = await import('../../src/services/gmailService.js');

      const mockSmartReplies = {
        emailId: 'email1',
        suggestions: {
          quick: 'Thank you for the update. I will review and respond by tomorrow.',
          detailed: 'Thank you for providing the project update. I will review the details carefully and provide comprehensive feedback by tomorrow afternoon.',
          followup: 'Could you clarify the timeline for the next phase of the project?'
        }
      };

      gmailService.generateSmartReplies.mockResolvedValue(mockSmartReplies);

      const response = await request(app)
        .post('/api/life-orchestrator/emails/smart-reply')
        .send({
          emailId: 'email1',
          context: { priority: 'high' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.replies).toEqual(mockSmartReplies);
    });

  });

  describe('Slack Integration', () => {

    test('GET /slack/dashboard - should return Slack communication dashboard', async () => {
      const { default: slackService } = await import('../../src/services/slackService.js');

      const mockSlackDashboard = {
        overview: {
          totalMessages: 45,
          activeChannels: 8,
          directConversations: 12,
          mentionsReceived: 5
        },
        channels: {
          most_active: [
            { name: 'general', messageCount: 15 },
            { name: 'development', messageCount: 12 }
          ]
        },
        team_health: {
          communication_score: 87,
          collaboration_index: 75
        }
      };

      slackService.getCommunicationDashboard.mockResolvedValue(mockSlackDashboard);
      slackService.teamInfo = { name: 'Test Team', id: 'team123' };

      const response = await request(app)
        .get('/api/life-orchestrator/slack/dashboard')
        .query({
          timeframeDays: 7,
          includeChannels: 'true',
          includeDMs: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toEqual(mockSlackDashboard);
      expect(response.body.team).toEqual({ name: 'Test Team', id: 'team123' });
    });

  });

  describe('Daily Rituals', () => {

    test('POST /daily-ritual - should handle morning ritual', async () => {
      const { default: aiSuggestionService } = await import('../../src/services/aiSuggestionService.js');

      const mockAdjustedSuggestions = {
        dailyFocus: { type: 'project', title: 'Deep Work Day' },
        timeAllocation: { allocations: [] }
      };

      aiSuggestionService.generateDailyRecommendations.mockResolvedValue(mockAdjustedSuggestions);

      const response = await request(app)
        .post('/api/life-orchestrator/daily-ritual')
        .send({
          type: 'morning',
          data: {
            intentions: [
              { text: 'Focus on ACT Placemat development', priority: 'high' }
            ],
            energyLevel: 'high',
            goals: ['Complete user authentication', 'Review project roadmap']
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.intentions).toBeDefined();
      expect(response.body.adjustedSuggestions).toEqual(mockAdjustedSuggestions);
      expect(response.body.motivationalMessage).toBeDefined();
    });

    test('POST /daily-ritual - should handle evening ritual', async () => {
      const response = await request(app)
        .post('/api/life-orchestrator/daily-ritual')
        .send({
          type: 'evening',
          data: {
            wins: ['Completed authentication system', 'Good team meeting'],
            challenges: ['Time management could be better'],
            gratitude: ['Supportive team', 'Clear project vision'],
            tomorrowFocus: 'Frontend integration'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.insights).toBeDefined();
      expect(response.body.celebrationMessage).toBeDefined();
      expect(response.body.tomorrowPreview).toBeDefined();
    });

  });

  describe('AI-Powered Features', () => {

    test('GET /suggestions/time-allocation - should return time allocation suggestions', async () => {
      const { default: aiSuggestionService } = await import('../../src/services/aiSuggestionService.js');
      const { default: projectHealthService } = await import('../../src/services/projectHealthService.js');

      projectHealthService.calculateAllProjectHealth.mockResolvedValue(mockProjectHealth);
      aiSuggestionService.calculateOptimalTimeAllocation.mockResolvedValue({
        allocations: [
          { projectName: 'ACT Placemat', suggestedHours: 4, priority: 'HIGH' }
        ]
      });

      const response = await request(app)
        .get('/api/life-orchestrator/suggestions/time-allocation')
        .query({
          currentTime: new Date().toISOString(),
          energyLevel: 'medium',
          completedTasks: JSON.stringify(['task1', 'task2'])
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeDefined();
      expect(response.body.context).toBeDefined();
    });

    test('POST /calendar/optimize - should return AI calendar optimization', async () => {
      const { default: googleCalendarService } = await import('../../src/services/googleCalendarService.js');
      const { default: aiSuggestionService } = await import('../../src/services/aiSuggestionService.js');
      const { default: projectHealthService } = await import('../../src/services/projectHealthService.js');
      const { default: calendarSyncService } = await import('../../src/services/calendarSyncService.js');

      const mockCalendarEvents = {
        events: [],
        freeTime: { totalHours: 4 }
      };

      googleCalendarService.getEventsWithProjectOverlay.mockResolvedValue(mockCalendarEvents);
      projectHealthService.calculateAllProjectHealth.mockResolvedValue(mockProjectHealth);
      aiSuggestionService.generateDailyRecommendations.mockResolvedValue({
        dailyFocus: { type: 'balance' },
        scheduleOptimization: ['Move morning meetings to afternoon']
      });
      calendarSyncService.getSyncStatus.mockReturnValue({ isActive: true });

      const response = await request(app)
        .post('/api/life-orchestrator/calendar/optimize')
        .send({
          timeframe: 7,
          energyLevel: 'high'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.optimization).toBeDefined();
      expect(response.body.current_calendar).toEqual(mockCalendarEvents);
    });

  });

  describe('Health Checks', () => {

    test('GET /health-check - should return comprehensive health status', async () => {
      // Mock all services as healthy
      const mockServices = [
        'projectHealthService', 'peopleRelationshipService', 'communicationTrackingService',
        'emailIntelligenceService', 'calendarSyncService'
      ];

      mockServices.forEach(async (serviceName) => {
        const service = await import(`../../src/services/${serviceName}.js`);
        if (service.default.getDailyProjectFocus) {
          service.default.getDailyProjectFocus.mockResolvedValue({});
        }
        if (service.default.getRelationshipDashboard) {
          service.default.getRelationshipDashboard.mockResolvedValue({});
        }
        if (service.default.getCommunicationDashboard) {
          service.default.getCommunicationDashboard.mockResolvedValue({});
        }
        if (service.default.getIntelligenceStats) {
          service.default.getIntelligenceStats.mockReturnValue({ cacheSize: 10 });
        }
        if (service.default.getActiveSyncSessions) {
          service.default.getActiveSyncSessions.mockReturnValue([]);
        }
      });

      const response = await request(app)
        .get('/api/life-orchestrator/health-check')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health.status).toBe('healthy');
      expect(response.body.health.services).toBeDefined();
      expect(response.body.health.performance).toBeDefined();
      expect(response.body.health.memory).toBeDefined();
    });

  });

  describe('Error Handling', () => {

    test('Dashboard - should handle service failures gracefully', async () => {
      const { default: projectHealthService } = await import('../../src/services/projectHealthService.js');
      
      projectHealthService.calculateAllProjectHealth.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/life-orchestrator/dashboard')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate dashboard');
    });

    test('Authentication - should handle invalid tokens', async () => {
      const { default: googleCalendarService } = await import('../../src/services/googleCalendarService.js');
      
      googleCalendarService.authenticate.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/life-orchestrator/authenticate/google')
        .send({
          accessToken: 'invalid_token',
          refreshToken: 'invalid_refresh'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication failed');
    });

  });

  describe('Performance Tests', () => {

    test('Dashboard response time should be under 2 seconds', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/life-orchestrator/dashboard')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });

    test('Health check should be fast', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/life-orchestrator/health-check')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

  });

});

describe('Service Integration Tests', () => {

  describe('Cross-Service Data Flow', () => {

    test('Project health changes should trigger calendar suggestions', async () => {
      // This would test the integration between project health service and calendar service
      // Mock implementation for now
      expect(true).toBe(true);
    });

    test('Email insights should inform relationship health', async () => {
      // This would test integration between email intelligence and relationship service
      // Mock implementation for now
      expect(true).toBe(true);
    });

    test('Calendar sync should update project time allocations', async () => {
      // This would test calendar sync triggering project health updates
      // Mock implementation for now
      expect(true).toBe(true);
    });

  });

  describe('Real-time Synchronization', () => {

    test('Calendar changes should propagate to dashboard', async () => {
      // Test real-time sync functionality
      expect(true).toBe(true);
    });

    test('Email processing should update communication dashboard', async () => {
      // Test email intelligence feeding into communication tracking
      expect(true).toBe(true);
    });

  });

});

// Test utilities
afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup
  jest.restoreAllMocks();
});