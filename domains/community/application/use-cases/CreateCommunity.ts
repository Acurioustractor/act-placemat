/**
 * Create Community Use Case
 *
 * Implements the business logic for creating a new community.
 * This is part of the application layer in clean architecture.
 */

import {
  UseCase,
  Result,
  Success,
  Failure,
  EventPublisher,
  Logger,
} from '../../../shared/types';
import { Community } from '../../core/entities/Community';
import { CommunityRepository } from '../../core/repositories/CommunityRepository';
import {
  CreateCommunityCommand,
  CreateCommunityResponse,
} from '../dto/CreateCommunityDTO';
import {
  CommunityNameAlreadyExistsError,
  CommunityLocationTooCloseError,
  InvalidCommunityDataError,
} from '../errors/CommunityErrors';

export class CreateCommunityUseCase
  implements UseCase<CreateCommunityCommand, Result<CreateCommunityResponse, Error>>
{
  constructor(
    private readonly communityRepository: CommunityRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    command: CreateCommunityCommand
  ): Promise<Result<CreateCommunityResponse, Error>> {
    try {
      this.logger.info('Creating new community', {
        name: command.name,
        location: command.location.address,
      });

      // 1. Validate business rules
      const validationResult = await this.validateCommand(command);
      if (validationResult.isFailure) {
        return validationResult;
      }

      // 2. Check if community name already exists
      const existingCommunity = await this.communityRepository.findByName(command.name);
      if (existingCommunity) {
        const error = new CommunityNameAlreadyExistsError(command.name);
        this.logger.warn('Community name already exists', { name: command.name });
        return Failure(error);
      }

      // 3. Check if location is too close to existing communities
      const locationCheck = await this.checkLocationConflicts(command);
      if (locationCheck.isFailure) {
        return locationCheck;
      }

      // 4. Create the community aggregate
      const community = Community.create(
        command.name,
        command.description,
        command.location,
        command.foundedDate
      );

      // 5. Persist the community
      await this.communityRepository.save(community);

      // 6. Publish domain events
      const events = community.getDomainEvents();
      await this.eventPublisher.publish(events);
      community.markEventsAsDispatched();

      this.logger.info('Community created successfully', {
        communityId: community.id,
        name: community.name,
      });

      // 7. Return success response
      const response: CreateCommunityResponse = {
        communityId: community.id,
        name: community.name,
        description: community.description,
        location: community.location,
        foundedDate: community.foundedDate,
        createdAt: community.createdAt,
      };

      return Success(response);
    } catch (error) {
      this.logger.error('Failed to create community', error as Error, { command });
      return Failure(error as Error);
    }
  }

  private async validateCommand(
    command: CreateCommunityCommand
  ): Promise<Result<void, Error>> {
    const errors: string[] = [];

    // Basic validation
    if (!command.name || command.name.trim().length === 0) {
      errors.push('Community name is required');
    }

    if (!command.description || command.description.trim().length === 0) {
      errors.push('Community description is required');
    }

    if (!command.location) {
      errors.push('Community location is required');
    } else {
      if (
        typeof command.location.lat !== 'number' ||
        command.location.lat < -90 ||
        command.location.lat > 90
      ) {
        errors.push('Invalid latitude');
      }

      if (
        typeof command.location.lng !== 'number' ||
        command.location.lng < -180 ||
        command.location.lng > 180
      ) {
        errors.push('Invalid longitude');
      }

      if (!command.location.address || command.location.address.trim().length === 0) {
        errors.push('Location address is required');
      }
    }

    if (!command.foundedDate || command.foundedDate > new Date()) {
      errors.push('Founded date cannot be in the future');
    }

    // Business rule validation
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 100);

    if (command.foundedDate < oneYearAgo) {
      errors.push('Founded date cannot be more than 100 years ago');
    }

    if (errors.length > 0) {
      return Failure(new InvalidCommunityDataError(errors));
    }

    return Success(undefined);
  }

  private async checkLocationConflicts(
    command: CreateCommunityCommand
  ): Promise<Result<void, Error>> {
    try {
      // Import here to avoid circular dependencies
      const { GeographicLocation } = await import(
        '../../core/value-objects/GeographicLocation'
      );

      const location = GeographicLocation.create(
        command.location.lat,
        command.location.lng,
        command.location.address
      );

      // Check if there's already a community within 5km
      const nearbyCommunities = await this.communityRepository.findNearLocation(
        location,
        5
      );

      if (nearbyCommunities.length > 0) {
        const nearbyNames = nearbyCommunities.map(c => c.name).join(', ');
        return Failure(
          new CommunityLocationTooCloseError(
            `Communities already exist nearby: ${nearbyNames}`
          )
        );
      }

      return Success(undefined);
    } catch (error) {
      this.logger.error('Error checking location conflicts', error as Error);
      return Failure(error as Error);
    }
  }
}
