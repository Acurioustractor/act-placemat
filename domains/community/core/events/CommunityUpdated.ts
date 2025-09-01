/**
 * Community Updated Domain Event
 *
 * Fired when a community's details are updated.
 */

import { DomainEvent } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface CommunityUpdatedData {
  communityId: string;
  oldName: string;
  newName: string;
  updatedFields: {
    name: boolean;
    description: boolean;
    location: boolean;
  };
}

export class CommunityUpdated implements DomainEvent {
  public readonly eventType = 'CommunityUpdated';
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  private constructor(
    public readonly aggregateId: string,
    public readonly data: CommunityUpdatedData
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }

  public static create(data: CommunityUpdatedData): CommunityUpdated {
    return new CommunityUpdated(data.communityId, data);
  }
}
