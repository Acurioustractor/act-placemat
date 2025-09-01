/**
 * Community Domain Errors
 *
 * Application-specific errors for the Community domain.
 */

import { DomainError } from '../../../shared/types';

export class CommunityNameAlreadyExistsError extends DomainError {
  readonly errorCode = 'COMMUNITY_NAME_EXISTS';
  readonly statusCode = 409;

  constructor(name: string) {
    super(`Community with name '${name}' already exists`, { name });
  }
}

export class CommunityLocationTooCloseError extends DomainError {
  readonly errorCode = 'COMMUNITY_LOCATION_TOO_CLOSE';
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
  }
}

export class InvalidCommunityDataError extends DomainError {
  readonly errorCode = 'INVALID_COMMUNITY_DATA';
  readonly statusCode = 400;

  constructor(errors: string[]) {
    super(`Invalid community data: ${errors.join(', ')}`, { errors });
  }
}

export class CommunityNotFoundError extends DomainError {
  readonly errorCode = 'COMMUNITY_NOT_FOUND';
  readonly statusCode = 404;

  constructor(identifier: string) {
    super(`Community not found: ${identifier}`, { identifier });
  }
}

export class CommunityInactiveError extends DomainError {
  readonly errorCode = 'COMMUNITY_INACTIVE';
  readonly statusCode = 422;

  constructor(communityId: string) {
    super(`Community is inactive: ${communityId}`, { communityId });
  }
}
