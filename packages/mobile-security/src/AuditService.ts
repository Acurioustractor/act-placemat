/**
 * Audit Service for React Native
 * 
 * Provides security event logging with Australian compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SecurityEvent, AuditLevel } from './types';

export class AuditService {
  private static instance: AuditService;
  private maxEvents = 1000;

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logSecurityEvent(
    type: SecurityEvent['type'],
    level: AuditLevel,
    source: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        type,
        level,
        source,
        metadata,
        timestamp: new Date().toISOString(),
      };

      const existingEvents = await this.getAuditEvents();
      const updatedEvents = [event, ...existingEvents];

      // Keep only the most recent events
      if (updatedEvents.length > this.maxEvents) {
        updatedEvents.splice(this.maxEvents);
      }

      await AsyncStorage.setItem('security_audit_log', JSON.stringify(updatedEvents));

      // Log to console for development
      if (__DEV__) {
        console.log(`🔒 Security Event [${level}]: ${type} from ${source}`, metadata);
      }
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  }

  async getAuditEvents(): Promise<SecurityEvent[]> {
    try {
      const eventsData = await AsyncStorage.getItem('security_audit_log');
      return eventsData ? JSON.parse(eventsData) : [];
    } catch (error) {
      console.warn('Failed to retrieve audit events:', error);
      return [];
    }
  }

  async clearAuditLog(): Promise<void> {
    try {
      await AsyncStorage.removeItem('security_audit_log');
    } catch (error) {
      console.warn('Failed to clear audit log:', error);
    }
  }

  async getAuditSummary(): Promise<Record<string, number>> {
    const events = await this.getAuditEvents();
    const summary: Record<string, number> = {};

    events.forEach(event => {
      const key = `${event.type}-${event.level}`;
      summary[key] = (summary[key] || 0) + 1;
    });

    return summary;
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();