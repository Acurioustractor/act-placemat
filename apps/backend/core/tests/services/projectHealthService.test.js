import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectHealthService } from '../../src/services/projectHealthService.js';

describe('ProjectHealthService', () => {
  let service;

  beforeEach(() => {
    service = new ProjectHealthService();
  });

  describe('calculateMilestoneHealth', () => {
    it('flags overdue milestones and exposes the number of days overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-10T00:00:00Z'));

      const result = service.calculateMilestoneHealth({
        nextMilestoneDate: '2024-01-05T00:00:00Z'
      });

      expect(result.status).toBe('overdue');
      expect(result.daysToMilestone).toBeLessThan(0);
      expect(result.daysOverdue).toBe(5);
      expect(result.recommendation).toContain('urgent action');
    });

    it('records upcoming milestone days without marking as overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-10T00:00:00Z'));

      const result = service.calculateMilestoneHealth({
        nextMilestoneDate: '2024-01-14T00:00:00Z'
      });

      expect(result.status).toBe('at_risk');
      expect(result.daysToMilestone).toBe(4);
      expect(result.daysOverdue).toBeNull();
    });
  });

  it('calculates suggested time even when milestone data is missing', () => {
    const metrics = {
      timeAllocation: { score: 20 },
      milestoneProgress: {},
      momentum: { score: 85 }
    };

    const suggestion = service.calculateSuggestedTime(metrics, {});

    expect(suggestion.hours).toBeCloseTo(4.5);
    expect(suggestion.priority).toBe('high');
    expect(() => service.calculateSuggestedTime(metrics, {})).not.toThrow();
  });

  it('describes milestone pressure when work is due within a week', () => {
    const reason = service.getTimeAllocationReason({
      timeAllocation: { score: 70 },
      milestoneProgress: { daysToMilestone: 3 },
      momentum: { score: 40 }
    });

    expect(reason).toBe('Milestone approaching');
  });

  describe('calculateIntelligentUrgency', () => {
    it('raises urgency to MEDIUM for low overall scores alone', () => {
      const metrics = {
        milestoneProgress: { daysToMilestone: 12, daysOverdue: null },
        budgetHealth: { score: 60 },
        momentum: { score: 60 },
        stakeholderEngagement: { score: 60 }
      };

      const urgency = service.calculateIntelligentUrgency(
        metrics,
        { budget: 10000 },
        30
      );

      expect(urgency).toBe('MEDIUM');
    });

    it('escalates to HIGH when multiple critical factors collide', () => {
      const metrics = {
        milestoneProgress: { daysToMilestone: 5, daysOverdue: null },
        budgetHealth: { score: 20 },
        momentum: { score: 40 },
        stakeholderEngagement: { score: 40 }
      };

      const urgency = service.calculateIntelligentUrgency(
        metrics,
        { budget: 75000 },
        30
      );

      expect(urgency).toBe('HIGH');
    });
  });
});
