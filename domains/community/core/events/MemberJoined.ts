/**
 * Member Joined Domain Event
 *
 * Fired when a member joins a community.
 */

import { DomainEvent } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface MemberJoinedData {
  communityId: string;
  memberId: string;
  memberName: string;
  memberCount: number;
}

export class MemberJoined implements DomainEvent {
  public readonly eventType = 'MemberJoined';
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  private constructor(
    public readonly aggregateId: string,
    public readonly data: MemberJoinedData
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }

  public static create(data: MemberJoinedData): MemberJoined {
    return new MemberJoined(data.communityId, data);
  }
}
