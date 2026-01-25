/**
 * Tests for Personal Intelligence Relationship Services
 *
 * Phase 2 migration: followup-detector, communication-planner,
 * relationship-intelligence, threshold-learner
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database helper
const mockDb = {
  main: {
    from: vi.fn(),
  },
  ghl: {
    from: vi.fn(),
  },
  isConfigured: vi.fn(() => ({ main: true, ghl: true })),
};

vi.mock('../../src/services/personalIntelligence/databaseHelper', () => ({
  db: mockDb,
  default: mockDb,
}));

// ============================================
// Threshold Learner Service Tests
// ============================================
describe('ThresholdLearnerService', () => {
  let ThresholdLearnerService;
  let thresholdLearner;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../src/services/personalIntelligence/thresholdLearnerService');
    ThresholdLearnerService = module.ThresholdLearnerService;
    thresholdLearner = new ThresholdLearnerService();
  });

  describe('getDefaultThreshold', () => {
    it('returns default stale_days for default segment', () => {
      const result = thresholdLearner.getDefaultThreshold('stale_days', 'default');
      expect(result).toBe(14);
    });

    it('returns segment-specific stale_days for funder', () => {
      const result = thresholdLearner.getDefaultThreshold('stale_days', 'funder');
      expect(result).toBe(7);
    });

    it('returns segment-specific stale_days for partner', () => {
      const result = thresholdLearner.getDefaultThreshold('stale_days', 'partner');
      expect(result).toBe(10);
    });

    it('returns segment-specific stale_days for community', () => {
      const result = thresholdLearner.getDefaultThreshold('stale_days', 'community');
      expect(result).toBe(30);
    });

    it('falls back to default segment for unknown segments', () => {
      const result = thresholdLearner.getDefaultThreshold('stale_days', 'unknown_segment');
      expect(result).toBe(14);
    });
  });

  describe('getThreshold', () => {
    it('returns learned threshold when database has data', async () => {
      mockDb.main.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { value: 10, confidence: 0.85, sample_size: 50 },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await thresholdLearner.getThreshold('stale_days', 'funder');
      expect(result.value).toBe(10);
      expect(result.confidence).toBe(0.85);
      expect(result.isLearned).toBe(true);
      expect(result.sampleSize).toBe(50);
    });

    it('returns default threshold when database has no data', async () => {
      mockDb.main.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await thresholdLearner.getThreshold('stale_days', 'funder');
      expect(result.value).toBe(7); // default for funder
      expect(result.confidence).toBe(0.5);
      expect(result.isLearned).toBe(false);
    });
  });

  describe('bayesianUpdate', () => {
    it('returns prior value when no observations', () => {
      const result = thresholdLearner.bayesianUpdate(14, 2.0, []);
      expect(result.value).toBe(14);
      expect(result.confidence).toBe(0.5);
    });

    it('updates value with observations', () => {
      const observations = [10, 12, 11, 13, 10];
      const result = thresholdLearner.bayesianUpdate(14, 2.0, observations);

      // With 5 observations averaging 11.2, and prior of 14 with strength 2,
      // posterior should be weighted average closer to observations
      expect(result.value).toBeLessThan(14);
      expect(result.value).toBeGreaterThan(10);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('confidence increases with more observations', () => {
      const smallObs = [10, 12];
      const largeObs = [10, 12, 11, 13, 10, 9, 11, 12, 10, 11];

      const smallResult = thresholdLearner.bayesianUpdate(14, 2.0, smallObs);
      const largeResult = thresholdLearner.bayesianUpdate(14, 2.0, largeObs);

      expect(largeResult.confidence).toBeGreaterThan(smallResult.confidence);
    });
  });
});

// ============================================
// Followup Detector Service Tests
// ============================================
describe('FollowupDetectorService', () => {
  let FollowupDetectorService;
  let followupDetector;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../src/services/personalIntelligence/followupDetectorService');
    FollowupDetectorService = module.FollowupDetectorService;
    followupDetector = new FollowupDetectorService();
  });

  describe('daysSince', () => {
    it('calculates correct days since a date', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const result = followupDetector.daysSince('2024-01-10T00:00:00Z');
      expect(result).toBe(5);
    });

    it('returns null for null date', () => {
      const result = followupDetector.daysSince(null);
      expect(result).toBeNull();
    });
  });

  describe('getContactSegment', () => {
    it('returns funder for contacts with funder tags', () => {
      const contact = { tags: ['Funder', 'VIP'] };
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('funder');
    });

    it('returns funder for contacts with funding tags', () => {
      const contact = { tags: ['Funding Partner'] };
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('funder');
    });

    it('returns partner for contacts with partner tags', () => {
      const contact = { tags: ['Strategic Partner'] };
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('partner');
    });

    it('returns community for contacts with community tags', () => {
      const contact = { tags: ['Community Member'] };
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('community');
    });

    it('returns default for contacts without specific tags', () => {
      const contact = { tags: ['General'] };
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('default');
    });

    it('returns default for contacts with no tags', () => {
      const contact = {};
      const result = followupDetector.getContactSegment(contact);
      expect(result).toBe('default');
    });
  });

  describe('calculatePriority', () => {
    it('calculates higher priority for funders', () => {
      const funderContact = { tags: ['Funder'], projects: [] };
      const defaultContact = { tags: [], projects: [] };

      const funderPriority = followupDetector.calculatePriority(funderContact, 10, 'attention');
      const defaultPriority = followupDetector.calculatePriority(defaultContact, 10, 'attention');

      expect(funderPriority).toBeGreaterThan(defaultPriority);
    });

    it('adds bonus for project involvement', () => {
      const withProjects = { tags: [], projects: ['Project A', 'Project B'] };
      const withoutProjects = { tags: [], projects: [] };

      const withPriority = followupDetector.calculatePriority(withProjects, 10, 'attention');
      const withoutPriority = followupDetector.calculatePriority(withoutProjects, 10, 'attention');

      expect(withPriority).toBeGreaterThan(withoutPriority);
    });

    it('adds higher bonus for urgent alert level', () => {
      const contact = { tags: [], projects: [] };

      const urgentPriority = followupDetector.calculatePriority(contact, 20, 'urgent');
      const normalPriority = followupDetector.calculatePriority(contact, 20, 'normal');

      expect(urgentPriority).toBeGreaterThan(normalPriority);
    });
  });

  describe('generateReason', () => {
    it('includes segment label and days in reason', () => {
      const contact = { projects: [] };
      const result = followupDetector.generateReason(contact, 14, 'funder');

      expect(result).toContain('Funder');
      expect(result).toContain('14');
    });

    it('includes project name when single project', () => {
      const contact = { projects: ['Climate Tech'] };
      const result = followupDetector.generateReason(contact, 7, 'default');

      expect(result).toContain('Climate Tech');
    });
  });

  describe('suggestAction', () => {
    it('suggests catch-up call for very stale contacts', () => {
      const contact = { tags: [] };
      const result = followupDetector.suggestAction(contact, 35);

      expect(result).toContain('catch-up call');
    });

    it('suggests project update for funders', () => {
      const contact = { tags: ['Funder'] };
      const result = followupDetector.suggestAction(contact, 10);

      expect(result).toContain('project update');
    });

    it('suggests check-in for partners', () => {
      const contact = { tags: ['Partner'] };
      const result = followupDetector.suggestAction(contact, 10);

      expect(result).toContain('collaboration');
    });

    it('suggests brief email for regular contacts', () => {
      const contact = { tags: [] };
      const result = followupDetector.suggestAction(contact, 10);

      expect(result).toContain('check-in email');
    });
  });
});

// ============================================
// Relationship Intelligence Service Tests
// ============================================
describe('RelationshipIntelligenceService', () => {
  let RelationshipIntelligenceService;
  let relationshipIntelligence;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../src/services/personalIntelligence/relationshipIntelligenceService');
    RelationshipIntelligenceService = module.RelationshipIntelligenceService;
    relationshipIntelligence = new RelationshipIntelligenceService();
  });

  describe('calculateHealthScore', () => {
    it('returns 0 for no touchpoints', () => {
      const result = relationshipIntelligence.calculateHealthScore([]);
      expect(result).toBe(0);
    });

    it('returns 0 for null touchpoints', () => {
      const result = relationshipIntelligence.calculateHealthScore(null);
      expect(result).toBe(0);
    });

    it('scores higher for recent contacts', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const recentTouchpoints = [
        { occurred_at: '2024-01-14T00:00:00Z', direction: 'inbound' },
        { occurred_at: '2024-01-10T00:00:00Z', direction: 'outbound' },
      ];

      const oldTouchpoints = [
        { occurred_at: '2023-06-01T00:00:00Z', direction: 'inbound' },
        { occurred_at: '2023-05-01T00:00:00Z', direction: 'outbound' },
      ];

      const recentScore = relationshipIntelligence.calculateHealthScore(recentTouchpoints);
      const oldScore = relationshipIntelligence.calculateHealthScore(oldTouchpoints);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('scores higher for balanced reciprocity', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const balancedTouchpoints = [
        { occurred_at: '2024-01-14T00:00:00Z', direction: 'inbound' },
        { occurred_at: '2024-01-13T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-12T00:00:00Z', direction: 'inbound' },
        { occurred_at: '2024-01-11T00:00:00Z', direction: 'outbound' },
      ];

      const oneWayTouchpoints = [
        { occurred_at: '2024-01-14T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-13T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-12T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-11T00:00:00Z', direction: 'outbound' },
      ];

      const balancedScore = relationshipIntelligence.calculateHealthScore(balancedTouchpoints);
      const oneWayScore = relationshipIntelligence.calculateHealthScore(oneWayTouchpoints);

      expect(balancedScore).toBeGreaterThan(oneWayScore);
    });
  });

  describe('determineStage', () => {
    it('returns Strong Partner for high score with many touchpoints', () => {
      const result = relationshipIntelligence.determineStage(75, new Array(15));
      expect(result).toBe('Strong Partner');
    });

    it('returns Active Relationship for medium-high score', () => {
      const result = relationshipIntelligence.determineStage(55, new Array(7));
      expect(result).toBe('Active Relationship');
    });

    it('returns Developing for medium score', () => {
      const result = relationshipIntelligence.determineStage(35, new Array(3));
      expect(result).toBe('Developing');
    });

    it('returns New Connection for low score with some touchpoints', () => {
      const result = relationshipIntelligence.determineStage(20, new Array(1));
      expect(result).toBe('New Connection');
    });

    it('returns Prospect for no touchpoints', () => {
      const result = relationshipIntelligence.determineStage(0, []);
      expect(result).toBe('Prospect');
    });
  });

  describe('detectSignals', () => {
    it('returns empty array for no touchpoints', () => {
      const result = relationshipIntelligence.detectSignals([]);
      expect(result).toEqual([]);
    });

    it('detects engagement signal for recent inbound messages', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const touchpoints = [
        { occurred_at: '2024-01-14T00:00:00Z', direction: 'inbound' },
        { occurred_at: '2024-01-13T00:00:00Z', direction: 'inbound' },
      ];

      const result = relationshipIntelligence.detectSignals(touchpoints);

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'engagement',
          priority: 'high',
        })
      );
    });

    it('detects drift signal for long gap since last contact', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const touchpoints = [
        { occurred_at: '2023-10-01T00:00:00Z', direction: 'inbound' },
      ];

      const result = relationshipIntelligence.detectSignals(touchpoints);

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'drift',
          priority: 'medium',
        })
      );
    });

    it('detects no-response signal for one-way outbound', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));

      const touchpoints = [
        { occurred_at: '2024-01-14T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-10T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-05T00:00:00Z', direction: 'outbound' },
        { occurred_at: '2024-01-01T00:00:00Z', direction: 'outbound' },
      ];

      const result = relationshipIntelligence.detectSignals(touchpoints);

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'no-response',
          priority: 'low',
        })
      );
    });
  });
});

// ============================================
// Communication Planner Service Tests
// ============================================
describe('CommunicationPlannerService', () => {
  let CommunicationPlannerService;
  let communicationPlanner;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../../src/services/personalIntelligence/communicationPlannerService');
    CommunicationPlannerService = module.CommunicationPlannerService;
    communicationPlanner = new CommunicationPlannerService();
  });

  describe('normalizeProjectName', () => {
    it('normalizes project names to lowercase alphanumeric', () => {
      const result = communicationPlanner.normalizeProjectName('Climate Tech Initiative');
      expect(result).toBe('climatetechinitiative');
    });

    it('removes special characters', () => {
      const result = communicationPlanner.normalizeProjectName('ACT-2024 (Phase 1)');
      expect(result).toBe('act2024phase1');
    });
  });

  describe('matchContactToProjects', () => {
    it('matches by explicit project field', () => {
      const contact = { projects: ['Climate Tech'], tags: [], company: '' };
      const projects = [
        { name: 'Climate Tech' },
        { name: 'Other Project' },
      ];

      const result = communicationPlanner.matchContactToProjects(contact, projects);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Climate Tech');
    });

    it('matches by tag', () => {
      const contact = { projects: [], tags: ['Climate-Tech-Team'], company: '' };
      const projects = [
        { name: 'Climate Tech' },
        { name: 'Other Project' },
      ];

      const result = communicationPlanner.matchContactToProjects(contact, projects);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Climate Tech');
    });

    it('matches by company name', () => {
      const contact = { projects: [], tags: [], company: 'Climate Tech Corp' };
      const projects = [
        { name: 'Climate Tech' },
        { name: 'Other Project' },
      ];

      const result = communicationPlanner.matchContactToProjects(contact, projects);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Climate Tech');
    });

    it('returns empty array when no matches', () => {
      const contact = { projects: [], tags: [], company: '' };
      const projects = [
        { name: 'Climate Tech' },
        { name: 'Other Project' },
      ];

      const result = communicationPlanner.matchContactToProjects(contact, projects);

      expect(result).toHaveLength(0);
    });
  });

  describe('determinePriority', () => {
    it('returns high for low relationship score', () => {
      const result = communicationPlanner.determinePriority(20, 30);
      expect(result).toBe('high');
    });

    it('returns high for very long time since contact', () => {
      const result = communicationPlanner.determinePriority(50, 75);
      expect(result).toBe('high');
    });

    it('returns medium for moderate relationship issues', () => {
      const result = communicationPlanner.determinePriority(45, 40);
      expect(result).toBe('medium');
    });

    it('returns low for healthy relationships', () => {
      const result = communicationPlanner.determinePriority(70, 10);
      expect(result).toBe('low');
    });
  });

  describe('determineChannel', () => {
    it('recommends call for very long absence', () => {
      const result = communicationPlanner.determineChannel(100);
      expect(result).toBe('call');
    });

    it('recommends newsletter for new contacts', () => {
      const result = communicationPlanner.determineChannel(null);
      expect(result).toBe('newsletter');
    });

    it('recommends directOutreach for normal follow-ups', () => {
      const result = communicationPlanner.determineChannel(15);
      expect(result).toBe('directOutreach');
    });
  });
});
