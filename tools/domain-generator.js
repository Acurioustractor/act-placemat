#!/usr/bin/env node

/**
 * Domain Generator Tool
 *
 * Generates boilerplate code for new domains following DDD patterns.
 *
 * Usage: node tools/domain-generator.js <domain-name> [entity-name]
 * Example: node tools/domain-generator.js partnerships Partnership
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class DomainGenerator {
  constructor(domainName, entityName = null) {
    this.domainName = domainName.toLowerCase();
    this.entityName = entityName || this.capitalize(domainName.slice(0, -1)); // Remove 's' and capitalize
    this.domainPath = path.join(projectRoot, 'domains', this.domainName);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async generate() {
    console.log(`🚀 Generating domain: ${this.domainName}`);
    console.log(`📊 Primary entity: ${this.entityName}`);

    try {
      await this.createDomainStructure();
      await this.generateEntity();
      await this.generateValueObjects();
      await this.generateEvents();
      await this.generateRepository();
      await this.generateUseCase();
      await this.generateDTOs();
      await this.generateErrors();
      await this.generateController();

      console.log(`✅ Domain '${this.domainName}' generated successfully!`);
      console.log(`📂 Location: ${this.domainPath}`);
      console.log(`\n🎯 Next steps:`);
      console.log(`1. Review generated files in domains/${this.domainName}/`);
      console.log(`2. Customize business logic in core/entities/${this.entityName}.ts`);
      console.log(`3. Implement repository adapter in infrastructure/repositories/`);
      console.log(`4. Add API routes in presentation/controllers/`);
    } catch (error) {
      console.error(`❌ Error generating domain:`, error.message);
      process.exit(1);
    }
  }

  async createDomainStructure() {
    const directories = [
      'core/entities',
      'core/value-objects',
      'core/services',
      'core/repositories',
      'core/events',
      'application/use-cases',
      'application/handlers',
      'application/dto',
      'application/errors',
      'application/ports',
      'infrastructure/repositories',
      'infrastructure/external-apis',
      'infrastructure/messaging',
      'infrastructure/persistence',
      'presentation/controllers',
      'presentation/graphql',
      'presentation/middlewares',
      'presentation/validators',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.domainPath, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  async generateEntity() {
    const entityCode = `/**
 * ${this.entityName} Aggregate Root
 * 
 * Core business entity for the ${this.domainName} domain.
 * Implements business rules and maintains data consistency.
 */

import { AggregateRoot, DomainEvent } from '../../../shared/types';
import { ${this.entityName}Id } from '../value-objects/${this.entityName}Id';
import { ${this.entityName}Created } from '../events/${this.entityName}Created';

export interface ${this.entityName}Props {
  id: ${this.entityName}Id;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class ${this.entityName} implements AggregateRoot<string> {
  private readonly _domainEvents: DomainEvent[] = [];
  private _eventsDispatched = false;

  private constructor(private readonly props: ${this.entityName}Props) {}

  // =============================================================================
  // FACTORY METHODS
  // =============================================================================

  public static create(name: string, description: string): ${this.entityName} {
    const ${this.domainName}Id = ${this.entityName}Id.generate();
    const now = new Date();

    const ${this.domainName} = new ${this.entityName}({
      id: ${this.domainName}Id,
      name,
      description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    ${this.domainName}.addDomainEvent(
      ${this.entityName}Created.create({
        ${this.domainName}Id: ${this.domainName}Id.value,
        name,
        description,
      })
    );

    return ${this.domainName};
  }

  public static reconstitute(props: ${this.entityName}Props): ${this.entityName} {
    return new ${this.entityName}(props);
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
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  // =============================================================================
  // BUSINESS METHODS
  // =============================================================================

  public updateName(newName: string): void {
    if (newName === this.props.name) return;
    
    this.props.name = newName;
    this.props.updatedAt = new Date();
    this.props.version += 1;
    
    // Add domain event if needed
  }

  public updateDescription(newDescription: string): void {
    if (newDescription === this.props.description) return;
    
    this.props.description = newDescription;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  public deactivate(): void {
    if (!this.props.isActive) return;
    
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  public reactivate(): void {
    if (this.props.isActive) return;
    
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.props.version += 1;
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

  public toSnapshot(): ${this.entityName}Props {
    return { ...this.props };
  }

  public equals(other: ${this.entityName}): boolean {
    return other instanceof ${this.entityName} && this.id === other.id;
  }
}`;

    await fs.writeFile(
      path.join(this.domainPath, 'core', 'entities', `${this.entityName}.ts`),
      entityCode
    );
  }

  async generateValueObjects() {
    // Generate ID value object
    const idCode = `/**
 * ${this.entityName} ID Value Object
 */

import { ValueObject, ValidationError } from '../../../shared/types';
import { v4 as uuidv4, validate as isValidUuid } from 'uuid';

export class ${this.entityName}Id implements ValueObject {
  private constructor(private readonly _value: string) {
    if (!_value || !isValidUuid(_value)) {
      throw new ValidationError(\`Invalid ${this.entityName} ID: \${_value}\`);
    }
  }

  public static create(value: string): ${this.entityName}Id {
    return new ${this.entityName}Id(value);
  }

  public static generate(): ${this.entityName}Id {
    return new ${this.entityName}Id(uuidv4());
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    return other instanceof ${this.entityName}Id && this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}`;

    await fs.writeFile(
      path.join(this.domainPath, 'core', 'value-objects', `${this.entityName}Id.ts`),
      idCode
    );
  }

  async generateEvents() {
    const eventCode = `/**
 * ${this.entityName} Created Domain Event
 */

import { DomainEvent } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface ${this.entityName}CreatedData {
  ${this.domainName}Id: string;
  name: string;
  description: string;
}

export class ${this.entityName}Created implements DomainEvent {
  public readonly eventType = '${this.entityName}Created';
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number = 1;

  private constructor(
    public readonly aggregateId: string,
    public readonly data: ${this.entityName}CreatedData
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }

  public static create(data: ${this.entityName}CreatedData): ${this.entityName}Created {
    return new ${this.entityName}Created(data.${this.domainName}Id, data);
  }
}`;

    await fs.writeFile(
      path.join(this.domainPath, 'core', 'events', `${this.entityName}Created.ts`),
      eventCode
    );
  }

  async generateRepository() {
    const repoCode = `/**
 * ${this.entityName} Repository Interface
 */

import { Repository } from '../../../shared/types';
import { ${this.entityName} } from '../entities/${this.entityName}';

export interface ${this.entityName}Repository extends Repository<${this.entityName}, string> {
  findByName(name: string): Promise<${this.entityName} | null>;
  findActive(): Promise<${this.entityName}[]>;
  existsWithName(name: string): Promise<boolean>;
}`;

    await fs.writeFile(
      path.join(
        this.domainPath,
        'core',
        'repositories',
        `${this.entityName}Repository.ts`
      ),
      repoCode
    );
  }

  async generateUseCase() {
    const useCaseCode = `/**
 * Create ${this.entityName} Use Case
 */

import { UseCase, Result, Success, Failure, EventPublisher, Logger } from '../../../shared/types';
import { ${this.entityName} } from '../../core/entities/${this.entityName}';
import { ${this.entityName}Repository } from '../../core/repositories/${this.entityName}Repository';
import { Create${this.entityName}Command, Create${this.entityName}Response } from '../dto/Create${this.entityName}DTO';
import { ${this.entityName}NameAlreadyExistsError } from '../errors/${this.entityName}Errors';

export class Create${this.entityName}UseCase implements UseCase<Create${this.entityName}Command, Result<Create${this.entityName}Response, Error>> {
  constructor(
    private readonly ${this.domainName}Repository: ${this.entityName}Repository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(command: Create${this.entityName}Command): Promise<Result<Create${this.entityName}Response, Error>> {
    try {
      this.logger.info('Creating new ${this.domainName}', { name: command.name });

      // Check if name already exists
      const existing = await this.${this.domainName}Repository.findByName(command.name);
      if (existing) {
        return Failure(new ${this.entityName}NameAlreadyExistsError(command.name));
      }

      // Create the entity
      const ${this.domainName} = ${this.entityName}.create(command.name, command.description);

      // Persist
      await this.${this.domainName}Repository.save(${this.domainName});

      // Publish events
      const events = ${this.domainName}.getDomainEvents();
      await this.eventPublisher.publish(events);
      ${this.domainName}.markEventsAsDispatched();

      const response: Create${this.entityName}Response = {
        ${this.domainName}Id: ${this.domainName}.id,
        name: ${this.domainName}.name,
        description: ${this.domainName}.description,
        createdAt: ${this.domainName}.createdAt,
      };

      return Success(response);
    } catch (error) {
      this.logger.error('Failed to create ${this.domainName}', error as Error);
      return Failure(error as Error);
    }
  }
}`;

    await fs.writeFile(
      path.join(
        this.domainPath,
        'application',
        'use-cases',
        `Create${this.entityName}.ts`
      ),
      useCaseCode
    );
  }

  async generateDTOs() {
    const dtoCode = `/**
 * Create ${this.entityName} DTOs
 */

import { Command } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export interface Create${this.entityName}Command extends Command {
  name: string;
  description: string;
}

export const create${this.entityName}Command = (params: {
  name: string;
  description: string;
}): Create${this.entityName}Command => ({
  commandId: uuidv4(),
  timestamp: new Date(),
  ...params,
});

export interface Create${this.entityName}Response {
  ${this.domainName}Id: string;
  name: string;
  description: string;
  createdAt: Date;
}`;

    await fs.writeFile(
      path.join(
        this.domainPath,
        'application',
        'dto',
        `Create${this.entityName}DTO.ts`
      ),
      dtoCode
    );
  }

  async generateErrors() {
    const errorCode = `/**
 * ${this.entityName} Domain Errors
 */

import { DomainError } from '../../../shared/types';

export class ${this.entityName}NameAlreadyExistsError extends DomainError {
  readonly errorCode = '${this.entityName.toUpperCase()}_NAME_EXISTS';
  readonly statusCode = 409;

  constructor(name: string) {
    super(\`${this.entityName} with name '\${name}' already exists\`, { name });
  }
}

export class ${this.entityName}NotFoundError extends DomainError {
  readonly errorCode = '${this.entityName.toUpperCase()}_NOT_FOUND';
  readonly statusCode = 404;

  constructor(identifier: string) {
    super(\`${this.entityName} not found: \${identifier}\`, { identifier });
  }
}`;

    await fs.writeFile(
      path.join(
        this.domainPath,
        'application',
        'errors',
        `${this.entityName}Errors.ts`
      ),
      errorCode
    );
  }

  async generateController() {
    const controllerCode = `/**
 * ${this.entityName} Controller
 */

import { Request, Response } from 'express';
import { Create${this.entityName}UseCase } from '../../../application/use-cases/Create${this.entityName}';
import { create${this.entityName}Command } from '../../../application/dto/Create${this.entityName}DTO';

export class ${this.entityName}Controller {
  constructor(
    private readonly create${this.entityName}UseCase: Create${this.entityName}UseCase
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const command = create${this.entityName}Command({
        name: req.body.name,
        description: req.body.description,
      });

      const result = await this.create${this.entityName}UseCase.execute(command);

      if (result.isSuccess) {
        res.status(201).json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(result.error.statusCode || 400).json({
          success: false,
          error: result.error.message,
          code: result.error.errorCode,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}`;

    await fs.writeFile(
      path.join(
        this.domainPath,
        'presentation',
        'controllers',
        `${this.entityName}Controller.ts`
      ),
      controllerCode
    );
  }
}

// CLI execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
🏗️  Domain Generator Tool

Usage: node tools/domain-generator.js <domain-name> [entity-name]

Examples:
  node tools/domain-generator.js partnerships Partnership
  node tools/domain-generator.js intelligence Insight  
  node tools/domain-generator.js financial Transaction

This will generate a complete domain structure following DDD patterns.
`);
  process.exit(1);
}

const [domainName, entityName] = args;
const generator = new DomainGenerator(domainName, entityName);
generator.generate();
