/**
 * Community Aggregate Root
 *
 * Represents the core community entity in the ACT Platform,
 * responsible for managing community membership, stories, and collective impact.
 */

import { AggregateRoot, DomainEvent } from '../../../shared/types';
import { CommunityId } from '../value-objects/CommunityId';
import { CommunityName } from '../value-objects/CommunityName';
import { CommunityDescription } from '../value-objects/CommunityDescription';
import { GeographicLocation } from '../value-objects/GeographicLocation';
import { CommunityCreated } from '../events/CommunityCreated';
import { CommunityUpdated } from '../events/CommunityUpdated';
import { StoryAdded } from '../events/StoryAdded';
import { MemberJoined } from '../events/MemberJoined';

export interface CommunityProps {
  id: CommunityId;
  name: CommunityName;
  description: CommunityDescription;
  location: GeographicLocation;
  foundedDate: Date;
  memberCount: number;
  storyCount: number;
  totalImpact: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Community implements AggregateRoot<string> {
  private readonly _domainEvents: DomainEvent[] = [];
  private _eventsDispatched = false;

  private constructor(private readonly props: CommunityProps) {}

  // =============================================================================
  // FACTORY METHODS
  // =============================================================================

  public static create(
    name: string,
    description: string,
    location: { lat: number; lng: number; address: string },
    foundedDate: Date
  ): Community {
    const communityId = CommunityId.generate();
    const now = new Date();

    const community = new Community({
      id: communityId,
      name: CommunityName.create(name),
      description: CommunityDescription.create(description),
      location: GeographicLocation.create(location.lat, location.lng, location.address),
      foundedDate,
      memberCount: 0,
      storyCount: 0,
      totalImpact: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    community.addDomainEvent(
      CommunityCreated.create({
        communityId: communityId.value,
        name: name,
        location: location,
        foundedDate,
      })
    );

    return community;
  }

  public static reconstitute(props: CommunityProps): Community {
    return new Community(props);
  }

  // =============================================================================
  // AGGREGATE ROOT INTERFACE
  // =============================================================================

  get id(): string {
    return this.props.id.value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get version(): number {
    return this.props.version;
  }

  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  public markEventsAsDispatched(): void {
    this._eventsDispatched = true;
  }

  // =============================================================================
  // BUSINESS PROPERTIES
  // =============================================================================

  get name(): string {
    return this.props.name.value;
  }

  get description(): string {
    return this.props.description.value;
  }

  get location(): { lat: number; lng: number; address: string } {
    return this.props.location.toPlainObject();
  }

  get foundedDate(): Date {
    return this.props.foundedDate;
  }

  get memberCount(): number {
    return this.props.memberCount;
  }

  get storyCount(): number {
    return this.props.storyCount;
  }

  get totalImpact(): number {
    return this.props.totalImpact;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get ageInYears(): number {
    const now = new Date();
    return Math.floor(
      (now.getTime() - this.props.foundedDate.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
  }

  get impactPerMember(): number {
    return this.props.memberCount > 0
      ? this.props.totalImpact / this.props.memberCount
      : 0;
  }

  // =============================================================================
  // BUSINESS METHODS
  // =============================================================================

  public updateDetails(
    name?: string,
    description?: string,
    location?: { lat: number; lng: number; address: string }
  ): void {
    const hasChanges =
      (name && name !== this.props.name.value) ||
      (description && description !== this.props.description.value) ||
      (location &&
        !this.props.location.equals(
          GeographicLocation.create(location.lat, location.lng, location.address)
        ));

    if (!hasChanges) return;

    const oldName = this.props.name.value;

    if (name) {
      this.props.name = CommunityName.create(name);
    }

    if (description) {
      this.props.description = CommunityDescription.create(description);
    }

    if (location) {
      this.props.location = GeographicLocation.create(
        location.lat,
        location.lng,
        location.address
      );
    }

    this.props.updatedAt = new Date();
    this.props.version += 1;

    this.addDomainEvent(
      CommunityUpdated.create({
        communityId: this.id,
        oldName,
        newName: this.props.name.value,
        updatedFields: {
          name: name !== undefined,
          description: description !== undefined,
          location: location !== undefined,
        },
      })
    );
  }

  public addMember(memberId: string, memberName: string): void {
    if (!this.isActive) {
      throw new Error('Cannot add members to inactive community');
    }

    this.props.memberCount += 1;
    this.props.updatedAt = new Date();
    this.props.version += 1;

    this.addDomainEvent(
      MemberJoined.create({
        communityId: this.id,
        memberId,
        memberName,
        memberCount: this.props.memberCount,
      })
    );
  }

  public addStory(storyId: string, impactValue: number): void {
    if (!this.isActive) {
      throw new Error('Cannot add stories to inactive community');
    }

    if (impactValue < 0) {
      throw new Error('Impact value cannot be negative');
    }

    this.props.storyCount += 1;
    this.props.totalImpact += impactValue;
    this.props.updatedAt = new Date();
    this.props.version += 1;

    this.addDomainEvent(
      StoryAdded.create({
        communityId: this.id,
        storyId,
        impactValue,
        storyCount: this.props.storyCount,
        totalImpact: this.props.totalImpact,
      })
    );
  }

  public deactivate(): void {
    if (!this.isActive) return;

    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.props.version += 1;

    // Could add CommunityDeactivated event if needed
  }

  public reactivate(): void {
    if (this.isActive) return;

    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.props.version += 1;

    // Could add CommunityReactivated event if needed
  }

  // =============================================================================
  // BUSINESS RULES & VALIDATION
  // =============================================================================

  public canAddMembers(): boolean {
    return this.isActive;
  }

  public canAddStories(): boolean {
    return this.isActive && this.memberCount > 0;
  }

  public isEstablished(): boolean {
    return this.ageInYears >= 1 && this.memberCount >= 10 && this.storyCount >= 5;
  }

  public isHighImpact(): boolean {
    return this.totalImpact >= 1000 || this.impactPerMember >= 100;
  }

  // =============================================================================
  // DOMAIN EVENT MANAGEMENT
  // =============================================================================

  private addDomainEvent(event: DomainEvent): void {
    if (!this._eventsDispatched) {
      this._domainEvents.push(event);
    }
  }

  // =============================================================================
  // SERIALIZATION
  // =============================================================================

  public toSnapshot(): CommunityProps {
    return {
      ...this.props,
      // Create new instances to avoid mutation
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      location: this.props.location,
    };
  }

  public equals(other: Community): boolean {
    return other instanceof Community && this.id === other.id;
  }
}
