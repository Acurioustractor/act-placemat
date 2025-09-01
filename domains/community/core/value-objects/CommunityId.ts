/**
 * Community ID Value Object
 *
 * Strongly-typed identifier for Community aggregates.
 * Implements immutability and validation for community identifiers.
 */

import { ValueObject, ValidationError } from '../../../shared/types';
import { v4 as uuidv4, validate as isValidUuid } from 'uuid';

export class CommunityId implements ValueObject {
  private constructor(private readonly _value: string) {
    if (!_value) {
      throw new ValidationError('Community ID cannot be empty');
    }

    if (!isValidUuid(_value)) {
      throw new ValidationError(`Invalid Community ID format: ${_value}`);
    }
  }

  public static create(value: string): CommunityId {
    return new CommunityId(value);
  }

  public static generate(): CommunityId {
    return new CommunityId(uuidv4());
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    return other instanceof CommunityId && this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
