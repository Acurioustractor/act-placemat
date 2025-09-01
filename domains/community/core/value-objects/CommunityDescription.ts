/**
 * Community Description Value Object
 *
 * Represents a valid community description with business rules and validation.
 */

import { ValueObject, ValidationError } from '../../../shared/types';

export class CommunityDescription implements ValueObject {
  private static readonly MIN_LENGTH = 10;
  private static readonly MAX_LENGTH = 1000;

  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  public static create(value: string): CommunityDescription {
    return new CommunityDescription(value);
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    return other instanceof CommunityDescription && this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Community description must be a non-empty string');
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < CommunityDescription.MIN_LENGTH) {
      throw new ValidationError(
        `Community description must be at least ${CommunityDescription.MIN_LENGTH} characters long`
      );
    }

    if (trimmedValue.length > CommunityDescription.MAX_LENGTH) {
      throw new ValidationError(
        `Community description cannot exceed ${CommunityDescription.MAX_LENGTH} characters`
      );
    }
  }

  // Helper methods for business logic
  public get preview(): string {
    return this._value.length > 100
      ? `${this._value.substring(0, 97)}...`
      : this._value;
  }

  public get wordCount(): number {
    return this._value.trim().split(/\s+/).length;
  }

  public get searchTokens(): string[] {
    return this._value
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length >= 3)
      .filter(token => !/^(the|and|or|but|for|in|on|at|to|from)$/.test(token));
  }
}
