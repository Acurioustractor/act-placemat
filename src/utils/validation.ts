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

// Generic validation helper
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

export function validateUrl(url: string): string | null {
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

export function validatePhone(phone: string): string | null {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return 'Invalid phone number format';
  }
  return null;
}

export function validateEnum<T>(value: string, enumObject: T, fieldName: string): string | null {
  const enumValues = Object.values(enumObject as any);
  if (!enumValues.includes(value)) {
    return `${fieldName} must be one of: ${enumValues.join(', ')}`;
  }
  return null;
}

// Project validation
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

// Opportunity validation
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

// Organization validation
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

// Person validation
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

// Artifact validation
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

// Generic form validation helper
export function validateForm<T>(data: Partial<T>, validator: (data: Partial<T>) => ValidationResult): ValidationResult {
  return validator(data);
}

// Utility to check if a date is valid
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// Utility to sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Utility to validate array of strings
export function validateStringArray(arr: any, fieldName: string): string | null {
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