/**
 * Community Name Value Object
 *
 * Represents a valid community name with business rules and validation.
 */

import { ValueObject, ValidationError } from '../../../shared/types';

export class CommunityName implements ValueObject {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 100;
  private static readonly FORBIDDEN_WORDS = [
    'admin',
    'administrator',
    'moderator',
    'system',
    'api',
    'test',
  ];

  private constructor(private readonly _value: string) {
    this.validate(_value);
  }

  public static create(value: string): CommunityName {
    return new CommunityName(value);
  }

  get value(): string {
    return this._value;
  }

  public equals(other: ValueObject): boolean {
    return other instanceof CommunityName && this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Community name must be a non-empty string');
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length < CommunityName.MIN_LENGTH) {
      throw new ValidationError(
        `Community name must be at least ${CommunityName.MIN_LENGTH} characters long`
      );
    }

    if (trimmedValue.length > CommunityName.MAX_LENGTH) {
      throw new ValidationError(
        `Community name cannot exceed ${CommunityName.MAX_LENGTH} characters`
      );
    }

    // Check for forbidden words
    const lowerCaseName = trimmedValue.toLowerCase();
    const containsForbiddenWord = CommunityName.FORBIDDEN_WORDS.some(word =>
      lowerCaseName.includes(word)
    );

    if (containsForbiddenWord) {
      throw new ValidationError('Community name contains forbidden words');
    }

    // Check for basic profanity or inappropriate content patterns
    if (this.containsInappropriateContent(lowerCaseName)) {
      throw new ValidationError('Community name contains inappropriate content');
    }

    // Ensure it contains at least some alphabetic characters
    if (!/[a-zA-Z]/.test(trimmedValue)) {
      throw new ValidationError(
        'Community name must contain at least one alphabetic character'
      );
    }
  }

  private containsInappropriateContent(name: string): boolean {
    // Basic inappropriate content detection
    // In production, this would use a more sophisticated content filter
    const inappropriatePatterns = [
      /\b(hate|racist|nazi|terrorist)\b/i,
      /\b(fuck|shit|damn|hell)\b/i, // Basic profanity check
    ];

    return inappropriatePatterns.some(pattern => pattern.test(name));
  }

  // Helper methods for business logic
  public get displayName(): string {
    return this._value.trim();
  }

  public get slug(): string {
    return this._value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  public get searchTokens(): string[] {
    return this._value
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length >= 2);
  }
}
