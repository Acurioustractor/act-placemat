// Data validation utilities for the ACT Placemat application

import {
  Project,
  Opportunity,
  Organization,
  Person,
  Artifact,
  ProjectArea,
  ProjectStatus,
  OpportunityStage,
  OpportunityType,
  OrganizationType,
  RelationshipStatus
} from '../types';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that a value is not null, undefined, or empty string.
 * Generic validation helper used across all validation functions.
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {string | null} Error message if validation fails, null if valid
 * @example
 * const error = validateRequired(project.name, 'Project name');
 * if (error) console.error(error);
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates email address format using regex pattern.
 * Checks for basic email structure: localpart@domain.tld
 *
 * @param {string} email - The email address to validate
 * @returns {string | null} Error message if invalid, null if valid
 * @example
 * const error = validateEmail('user@example.com');
 * if (!error) console.log('Email is valid');
 */
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

/**
 * Validates URL format using the URL constructor.
 * Checks if the string is a valid, parseable URL.
 *
 * @param {string} url - The URL to validate
 * @returns {string | null} Error message if invalid, null if valid
 * @example
 * const error = validateUrl('https://example.com');
 * if (!error) console.log('URL is valid');
 */
export function validateUrl(url: string): string | null {
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Validates phone number format using regex pattern.
 * Accepts international format with optional + prefix and up to 16 digits.
 *
 * @param {string} phone - The phone number to validate
 * @returns {string | null} Error message if invalid, null if valid
 * @example
 * const error = validatePhone('+1234567890');
 * if (!error) console.log('Phone number is valid');
 */
export function validatePhone(phone: string): string | null {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-()]/g, ''))) {
    return 'Invalid phone number format';
  }
  return null;
}

/**
 * Validates that a value exists in a TypeScript enum.
 * Checks if the provided value matches any enum value.
 *
 * @template T - The enum type
 * @param {string} value - The value to validate against the enum
 * @param {T} enumObject - The TypeScript enum object
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {string | null} Error message listing valid values if invalid, null if valid
 * @example
 * const error = validateEnum(status, ProjectStatus, 'Project status');
 * if (error) console.error(error);
 */
export function validateEnum<T extends object>(value: string, enumObject: T, fieldName: string): string | null {
  const enumValues = Object.values(enumObject);
  if (!enumValues.includes(value)) {
    return `${fieldName} must be one of: ${enumValues.join(', ')}`;
  }
  return null;
}

/**
 * Validates a project object comprehensively.
 * Checks required fields, enum values, numeric ranges, and URL formats.
 *
 * @param {Partial<Project>} project - The project object to validate (can be partial for updates)
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validateProject(projectData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateProject(project: Partial<Project>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  const requiredError = validateRequired(project.name, 'Project name');
  if (requiredError) errors.push(requiredError);

  const areaError = validateRequired(project.area, 'Project area');
  if (areaError) errors.push(areaError);

  const statusError = validateRequired(project.status, 'Project status');
  if (statusError) errors.push(statusError);

  const leadError = validateRequired(project.lead, 'Project lead');
  if (leadError) errors.push(leadError);

  // Enum validation
  if (project.area) {
    const enumError = validateEnum(project.area, ProjectArea, 'Project area');
    if (enumError) errors.push(enumError);
  }

  if (project.status) {
    const enumError = validateEnum(project.status, ProjectStatus, 'Project status');
    if (enumError) errors.push(enumError);
  }

  // Numeric validation
  if (project.revenueActual !== undefined && project.revenueActual < 0) {
    errors.push('Actual revenue cannot be negative');
  }

  if (project.revenuePotential !== undefined && project.revenuePotential < 0) {
    errors.push('Potential revenue cannot be negative');
  }

  // URL validation
  if (project.websiteLinks && project.websiteLinks.trim()) {
    const urls = project.websiteLinks.split(',').map(url => url.trim());
    for (const url of urls) {
      const urlError = validateUrl(url);
      if (urlError) errors.push(`Website link: ${urlError}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an opportunity object comprehensively.
 * Checks required fields, enum values, numeric ranges, and probability bounds.
 *
 * @param {Partial<Opportunity>} opportunity - The opportunity object to validate (can be partial for updates)
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validateOpportunity(opportunityData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateOpportunity(opportunity: Partial<Opportunity>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  const nameError = validateRequired(opportunity.name, 'Opportunity name');
  if (nameError) errors.push(nameError);

  const orgError = validateRequired(opportunity.organization, 'Organization');
  if (orgError) errors.push(orgError);

  const stageError = validateRequired(opportunity.stage, 'Stage');
  if (stageError) errors.push(stageError);

  // Enum validation
  if (opportunity.stage) {
    const enumError = validateEnum(opportunity.stage, OpportunityStage, 'Stage');
    if (enumError) errors.push(enumError);
  }

  if (opportunity.type) {
    const enumError = validateEnum(opportunity.type, OpportunityType, 'Opportunity type');
    if (enumError) errors.push(enumError);
  }

  // Numeric validation
  if (opportunity.amount !== undefined && opportunity.amount < 0) {
    errors.push('Amount cannot be negative');
  }

  if (opportunity.probability !== undefined) {
    if (opportunity.probability < 0 || opportunity.probability > 100) {
      errors.push('Probability must be between 0 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an organization object comprehensively.
 * Checks required fields, enum values, numeric ranges, and URL formats.
 *
 * @param {Partial<Organization>} organization - The organization object to validate (can be partial for updates)
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validateOrganization(orgData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateOrganization(organization: Partial<Organization>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  const nameError = validateRequired(organization.name, 'Organization name');
  if (nameError) errors.push(nameError);

  const typeError = validateRequired(organization.type, 'Organization type');
  if (typeError) errors.push(typeError);

  // Enum validation
  if (organization.type) {
    const enumError = validateEnum(organization.type, OrganizationType, 'Organization type');
    if (enumError) errors.push(enumError);
  }

  if (organization.relationshipStatus) {
    const enumError = validateEnum(organization.relationshipStatus, RelationshipStatus, 'Relationship status');
    if (enumError) errors.push(enumError);
  }

  // URL validation
  if (organization.website && organization.website.trim()) {
    const urlError = validateUrl(organization.website);
    if (urlError) errors.push(`Website: ${urlError}`);
  }

  // Numeric validation
  if (organization.annualBudget !== undefined && organization.annualBudget < 0) {
    errors.push('Annual budget cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a person/contact object comprehensively.
 * Checks required fields, email format, phone format, and URL formats.
 *
 * @param {Partial<Person>} person - The person object to validate (can be partial for updates)
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validatePerson(personData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validatePerson(person: Partial<Person>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  const nameError = validateRequired(person.fullName, 'Full name');
  if (nameError) errors.push(nameError);

  const orgError = validateRequired(person.organization, 'Organization');
  if (orgError) errors.push(orgError);

  // Email validation
  if (person.email && person.email.trim()) {
    const emailError = validateEmail(person.email);
    if (emailError) errors.push(emailError);
  }

  // Phone validation
  if (person.phone && person.phone.trim()) {
    const phoneError = validatePhone(person.phone);
    if (phoneError) errors.push(phoneError);
  }

  // LinkedIn URL validation
  if (person.linkedin && person.linkedin.trim()) {
    const urlError = validateUrl(person.linkedin);
    if (urlError) errors.push(`LinkedIn: ${urlError}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an artifact/document object comprehensively.
 * Checks required fields, URL formats, and version numbers.
 *
 * @param {Partial<Artifact>} artifact - The artifact object to validate (can be partial for updates)
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validateArtifact(artifactData);
 * if (!result.isValid) {
 *   console.error('Validation errors:', result.errors);
 * }
 */
export function validateArtifact(artifact: Partial<Artifact>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  const nameError = validateRequired(artifact.name, 'Artifact name');
  if (nameError) errors.push(nameError);

  const typeError = validateRequired(artifact.type, 'Artifact type');
  if (typeError) errors.push(typeError);

  const createdByError = validateRequired(artifact.createdBy, 'Created by');
  if (createdByError) errors.push(createdByError);

  // URL validation
  if (artifact.fileUrl && artifact.fileUrl.trim()) {
    const urlError = validateUrl(artifact.fileUrl);
    if (urlError) errors.push(`File URL: ${urlError}`);
  }

  // Version validation
  if (artifact.version !== undefined && artifact.version < 1) {
    errors.push('Version must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generic form validation wrapper.
 * Applies a specific validator function to form data.
 *
 * @template T - The data type being validated
 * @param {Partial<T>} data - The form data to validate
 * @param {(data: Partial<T>) => ValidationResult} validator - The validator function to apply
 * @returns {ValidationResult} Object containing isValid flag and array of error messages
 * @example
 * const result = validateForm(projectFormData, validateProject);
 * if (!result.isValid) {
 *   setErrors(result.errors);
 * }
 */
export function validateForm<T>(data: Partial<T>, validator: (data: Partial<T>) => ValidationResult): ValidationResult {
  return validator(data);
}

/**
 * Checks if a value is a valid Date object.
 * Verifies the value is an instance of Date and not Invalid Date.
 *
 * @param {unknown} date - The value to check
 * @returns {boolean} True if valid date, false otherwise
 * @example
 * if (isValidDate(project.startDate)) {
 *   console.log('Start date is valid');
 * }
 */
export function isValidDate(date: unknown): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitizes string input by removing potentially dangerous characters.
 * Trims whitespace and removes angle brackets to prevent XSS attacks.
 *
 * @param {string} input - The string to sanitize
 * @returns {string} Sanitized string with whitespace trimmed and angle brackets removed
 * @example
 * const cleanName = sanitizeString(userInput);
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validates that a value is an array of strings.
 * Checks array type and ensures all elements are strings.
 *
 * @param {unknown} arr - The value to validate
 * @param {string} fieldName - The name of the field being validated (for error messages)
 * @returns {string | null} Error message if validation fails, null if valid
 * @example
 * const error = validateStringArray(project.tags, 'Tags');
 * if (error) console.error(error);
 */
export function validateStringArray(arr: unknown, fieldName: string): string | null {
  if (!Array.isArray(arr)) {
    return `${fieldName} must be an array`;
  }

  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'string') {
      return `${fieldName}[${i}] must be a string`;
    }
  }

  return null;
}