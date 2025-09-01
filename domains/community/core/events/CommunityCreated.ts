/**
 * Community Created Domain Event
 *
 * Fired when a new community is created in the system.
 * Used for triggering side effects like notifications, analytics, etc.
 */

import { DomainEvent } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface CommunityCreatedData {
  communityId: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  foundedDate: Date;
}

export class CommunityCreated implements DomainEvent {
  public readonly eventType = 'CommunityCreated';
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  private constructor(
    public readonly aggregateId: string,
    public readonly data: CommunityCreatedData
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }

  public static create(data: CommunityCreatedData): CommunityCreated {
    return new CommunityCreated(data.communityId, data);
  }

  // Helper methods for event processing
  public get communityId(): string {
    return this.data.communityId;
  }

  public get communityName(): string {
    return this.data.name;
  }

  public get location(): { lat: number; lng: number; address: string } {
    return this.data.location;
  }

  public get foundedDate(): Date {
    return this.data.foundedDate;
  }

  public toPlainObject() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
      aggregateId: this.aggregateId,
      data: {
        ...this.data,
        foundedDate: this.data.foundedDate.toISOString(),
      },
    };
  }
}
