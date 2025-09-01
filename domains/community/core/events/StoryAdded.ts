/**
 * Story Added Domain Event
 *
 * Fired when a story is added to a community.
 */

import { DomainEvent } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface StoryAddedData {
  communityId: string;
  storyId: string;
  impactValue: number;
  storyCount: number;
  totalImpact: number;
}

export class StoryAdded implements DomainEvent {
  public readonly eventType = 'StoryAdded';
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  private constructor(
    public readonly aggregateId: string,
    public readonly data: StoryAddedData
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }

  public static create(data: StoryAddedData): StoryAdded {
    return new StoryAdded(data.communityId, data);
  }
}
