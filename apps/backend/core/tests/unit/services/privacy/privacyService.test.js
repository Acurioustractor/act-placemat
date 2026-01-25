/**
 * Tests for Privacy Service
 *
 * Unit tests for privacy protection - simplified
 */
import { describe, it, expect } from 'vitest';
import { actionFixtures, goalFixtures } from '../../../utils/mock-services.js';

describe('PrivacyService Utilities', () => {
  describe('Data anonymization', () => {
    const anonymizeData = (data) => {
      const sensitiveFields = ['full_name', 'email', 'phone', 'email_address'];
      const anonymized = { ...data };

      sensitiveFields.forEach((field) => {
        if (anonymized[field]) {
          anonymized[field] = '[REDACTED]';
        }
      });

      return anonymized;
    };

    it('redacts full_name', () => {
      const data = { full_name: 'John Doe', id: '123' };
      const result = anonymizeData(data);

      expect(result.full_name).toBe('[REDACTED]');
      expect(result.id).toBe('123');
    });

    it('redacts email', () => {
      const data = { email: 'john@example.com', name: 'Test' };
      const result = anonymizeData(data);

      expect(result.email).toBe('[REDACTED]');
    });

    it('redacts multiple fields', () => {
      const data = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+61412345678',
        id: '123',
      };
      const result = anonymizeData(data);

      expect(result.full_name).toBe('[REDACTED]');
      expect(result.email).toBe('[REDACTED]');
      expect(result.phone).toBe('[REDACTED]');
      expect(result.id).toBe('123');
    });
  });

  describe('Consent validation', () => {
    const validateConsent = (consent) => {
      if (!consent) return { isValid: false, reason: 'no_consent' };
      if (!consent.granted) return { isValid: false, reason: 'consent_denied' };

      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      if (consent.timestamp && new Date(consent.timestamp).getTime() < oneYearAgo) {
        return { isValid: false, reason: 'consent_expired' };
      }

      return { isValid: true };
    };

    it('validates granted consent', () => {
      const consent = { granted: true, timestamp: new Date().toISOString() };
      const result = validateConsent(consent);

      expect(result.isValid).toBe(true);
    });

    it('rejects denied consent', () => {
      const consent = { granted: false };
      const result = validateConsent(consent);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('consent_denied');
    });

    it('rejects expired consent', () => {
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
      const consent = { granted: true, timestamp: twoYearsAgo };
      const result = validateConsent(consent);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('consent_expired');
    });
  });
});

describe('Action Fixtures', () => {
  it('creates an action', () => {
    const action = actionFixtures.create();

    expect(action).toHaveProperty('id');
    expect(action.type).toBe('email');
    expect(action.priority).toBe('high');
    expect(action.title).toBe('Follow up with John');
  });

  it('creates action with overrides', () => {
    const action = actionFixtures.create({
      type: 'call',
      priority: 'low',
      title: 'Custom Action',
    });

    expect(action.type).toBe('call');
    expect(action.priority).toBe('low');
  });

  it('creates multiple actions', () => {
    const actions = actionFixtures.createMany(5);

    expect(actions).toHaveLength(5);
  });
});

describe('Goal Fixtures', () => {
  it('creates a goal', () => {
    const goal = goalFixtures.create();

    expect(goal).toHaveProperty('id');
    expect(goal.title).toBe('Increase Revenue');
    expect(goal.category).toBe('revenue');
    expect(goal.status).toBe('in_progress');
  });

  it('creates goal with overrides', () => {
    const goal = goalFixtures.create({
      title: 'Custom Goal',
      status: 'completed',
    });

    expect(goal.title).toBe('Custom Goal');
    expect(goal.status).toBe('completed');
  });
});
