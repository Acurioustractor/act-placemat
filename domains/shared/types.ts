/**
 * Shared Types for Domain-Driven Design Architecture
 *
 * These types provide the foundation for implementing DDD patterns
 * across all domains in the ACT Community Platform.
 */

// =============================================================================
// BASE DOMAIN TYPES
// =============================================================================

export interface Entity<T = string> {
  readonly id: T;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AggregateRoot<T = string> extends Entity<T> {
  readonly version: number;
  getDomainEvents(): DomainEvent[];
  clearDomainEvents(): void;
  markEventsAsDispatched(): void;
}

export interface ValueObject {
  equals(other: ValueObject): boolean;
}

export interface DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly eventVersion: number;
  readonly eventType: string;
}

// =============================================================================
// REPOSITORY PATTERNS
// =============================================================================

export interface Repository<T extends AggregateRoot, K = string> {
  findById(id: K): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: K): Promise<void>;
}

export interface ReadOnlyRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findMany(criteria?: Partial<T>): Promise<T[]>;
  count(criteria?: Partial<T>): Promise<number>;
}

// =============================================================================
// USE CASE PATTERNS
// =============================================================================

export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

export interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
}

export interface Query {
  readonly queryId: string;
  readonly timestamp: Date;
}

export interface CommandHandler<TCommand extends Command, TResponse = void> {
  handle(command: TCommand): Promise<TResponse>;
}

export interface QueryHandler<TQuery extends Query, TResponse> {
  handle(query: TQuery): Promise<TResponse>;
}

// =============================================================================
// EVENT PATTERNS
// =============================================================================

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
  canHandle(event: DomainEvent): boolean;
}

export interface EventStore {
  append(streamId: string, events: DomainEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;
}

export interface EventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}

export interface EventSubscriber {
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>
  ): void;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export abstract class DomainError extends Error {
  abstract readonly errorCode: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  readonly errorCode = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class NotFoundError extends DomainError {
  readonly errorCode = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class BusinessRuleViolationError extends DomainError {
  readonly errorCode = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 422;
}

export class UnauthorizedError extends DomainError {
  readonly errorCode = 'UNAUTHORIZED';
  readonly statusCode = 401;
}

export class ForbiddenError extends DomainError {
  readonly errorCode = 'FORBIDDEN';
  readonly statusCode = 403;
}

// =============================================================================
// RESULT PATTERNS
// =============================================================================

export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly isSuccess: true;
  readonly isFailure: false;
  readonly data: T;
}

export interface Failure<E> {
  readonly isSuccess: false;
  readonly isFailure: true;
  readonly error: E;
}

export const Success = <T>(data: T): Success<T> => ({
  isSuccess: true,
  isFailure: false,
  data,
});

export const Failure = <E>(error: E): Failure<E> => ({
  isSuccess: false,
  isFailure: true,
  error,
});

// =============================================================================
// PAGINATION & FILTERING
// =============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface FilterCriteria {
  [key: string]: unknown;
}

// =============================================================================
// AUDIT & METADATA
// =============================================================================

export interface AuditableEntity extends Entity {
  readonly createdBy: string;
  readonly updatedBy: string;
}

export interface SoftDeletableEntity extends Entity {
  readonly deletedAt?: Date;
  readonly deletedBy?: string;
  readonly isDeleted: boolean;
}

export interface VersionedEntity extends Entity {
  readonly version: number;
  readonly previousVersionId?: string;
}

// =============================================================================
// DOMAIN SPECIFICATIONS
// =============================================================================

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private specification: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.specification.isSatisfiedBy(candidate);
  }
}

// =============================================================================
// DEPENDENCY INJECTION
// =============================================================================

export interface Container {
  register<T>(token: string | symbol, implementation: T): void;
  resolve<T>(token: string | symbol): T;
  isRegistered(token: string | symbol): boolean;
}

export const TOKENS = {
  // Repositories
  COMMUNITY_REPOSITORY: Symbol('CommunityRepository'),
  STORY_REPOSITORY: Symbol('StoryRepository'),
  PARTNERSHIP_REPOSITORY: Symbol('PartnershipRepository'),
  FINANCIAL_REPOSITORY: Symbol('FinancialRepository'),

  // Services
  EVENT_PUBLISHER: Symbol('EventPublisher'),
  EVENT_STORE: Symbol('EventStore'),
  LOGGER: Symbol('Logger'),

  // External Services
  AI_SERVICE: Symbol('AIService'),
  EMAIL_SERVICE: Symbol('EmailService'),
  STORAGE_SERVICE: Symbol('StorageService'),
} as const;

// =============================================================================
// LOGGING & OBSERVABILITY
// =============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

export interface HealthCheck {
  name: string;
  check(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, unknown>;
}

// =============================================================================
// EXTERNAL SERVICE PATTERNS
// =============================================================================

export interface ExternalServiceAdapter<TRequest, TResponse> {
  call(request: TRequest): Promise<Result<TResponse, Error>>;
  healthCheck(): Promise<HealthStatus>;
}

export interface CircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): 'closed' | 'open' | 'half-open';
}

export interface RetryPolicy {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export type * from './types';
