// Tests for validation utilities

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateEmail,
  validateUrl,
  validatePhone,
  validateEnum,
  validateProject,
  validateOpportunity,
  validateOrganization,
  validatePerson,
  validateArtifact,
  validateForm,
  isValidDate,
  sanitizeString,
  validateStringArray
} from '../validation';
import {
  ProjectArea,
  ProjectStatus,
  OpportunityStage,
  OrganizationType,
  RelationshipStatus,
  ArtifactType
} from '../../types';

describe('Validation Utilities', () => {
  describe('validateRequired', () => {
    it('should return null for valid non-empty string', () => {
      expect(validateRequired('test', 'Field')).toBeNull();
    });

    it('should return error for null value', () => {
      expect(validateRequired(null, 'Field')).toBe('Field is required');
    });

    it('should return error for undefined value', () => {
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });

    it('should return error for empty string', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
    });

    it('should return null for number zero (valid)', () => {
      expect(validateRequired(0, 'Field')).toBeNull();
    });

    it('should return null for boolean false (valid)', () => {
      expect(validateRequired(false, 'Field')).toBeNull();
    });

    it('should return null for non-empty arrays', () => {
      expect(validateRequired(['item'], 'Field')).toBeNull();
    });

    it('should return null for objects', () => {
      expect(validateRequired({ key: 'value' }, 'Field')).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should return null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
      expect(validateEmail('user.name@domain.co.uk')).toBeNull();
      expect(validateEmail('user+tag@example.com')).toBeNull();
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid')).toBe('Invalid email format');
      expect(validateEmail('invalid@')).toBe('Invalid email format');
      expect(validateEmail('@example.com')).toBe('Invalid email format');
      expect(validateEmail('invalid@domain')).toBe('Invalid email format');
    });

    it('should return error for email with spaces', () => {
      expect(validateEmail('test @example.com')).toBe('Invalid email format');
      expect(validateEmail('test@ example.com')).toBe('Invalid email format');
    });

    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Invalid email format');
    });

    it('should return error for email without @', () => {
      expect(validateEmail('testexample.com')).toBe('Invalid email format');
    });
  });

  describe('validateUrl', () => {
    it('should return null for valid HTTP URL', () => {
      expect(validateUrl('http://example.com')).toBeNull();
    });

    it('should return null for valid HTTPS URL', () => {
      expect(validateUrl('https://example.com')).toBeNull();
    });

    it('should return null for URL with path', () => {
      expect(validateUrl('https://example.com/path/to/page')).toBeNull();
    });

    it('should return null for URL with query parameters', () => {
      expect(validateUrl('https://example.com?key=value')).toBeNull();
    });

    it('should return error for invalid URL', () => {
      expect(validateUrl('not-a-url')).toBe('Invalid URL format');
    });

    it('should return error for URL without protocol', () => {
      expect(validateUrl('example.com')).toBe('Invalid URL format');
    });

    it('should return error for empty string', () => {
      expect(validateUrl('')).toBe('Invalid URL format');
    });

    it('should return null for localhost URL', () => {
      expect(validateUrl('http://localhost:3000')).toBeNull();
    });
  });

  describe('validatePhone', () => {
    it('should return null for valid international phone number', () => {
      expect(validatePhone('+1234567890')).toBeNull();
    });

    it('should return null for phone number without prefix', () => {
      expect(validatePhone('1234567890')).toBeNull();
    });

    it('should return null for phone number with spaces', () => {
      expect(validatePhone('+1 234 567 890')).toBeNull();
    });

    it('should return null for phone number with hyphens', () => {
      expect(validatePhone('+1-234-567-890')).toBeNull();
    });

    it('should return null for phone number with parentheses', () => {
      expect(validatePhone('+1 (234) 567-890')).toBeNull();
    });

    it('should return error for invalid phone number', () => {
      expect(validatePhone('invalid')).toBe('Invalid phone number format');
    });

    it('should return error for phone starting with 0', () => {
      expect(validatePhone('0234567890')).toBe('Invalid phone number format');
    });

    it('should return error for empty phone number', () => {
      expect(validatePhone('')).toBe('Invalid phone number format');
    });

    it('should return error for phone with letters', () => {
      expect(validatePhone('+1234abc7890')).toBe('Invalid phone number format');
    });
  });

  describe('validateEnum', () => {
    it('should return null for valid enum value', () => {
      expect(validateEnum(ProjectStatus.ACTIVE, ProjectStatus, 'Status')).toBeNull();
    });

    it('should return error for invalid enum value', () => {
      const error = validateEnum('INVALID', ProjectStatus, 'Status');
      expect(error).toContain('Status must be one of');
      expect(error).toContain(ProjectStatus.ACTIVE);
    });

    it('should handle all ProjectStatus values', () => {
      expect(validateEnum(ProjectStatus.ACTIVE, ProjectStatus, 'Status')).toBeNull();
      expect(validateEnum(ProjectStatus.IDEATION, ProjectStatus, 'Status')).toBeNull();
      expect(validateEnum(ProjectStatus.SUNSETTING, ProjectStatus, 'Status')).toBeNull();
      expect(validateEnum(ProjectStatus.TRANSFERRED, ProjectStatus, 'Status')).toBeNull();
    });

    it('should handle all ProjectArea values', () => {
      expect(validateEnum(ProjectArea.STORY_SOVEREIGNTY, ProjectArea, 'Area')).toBeNull();
      expect(validateEnum(ProjectArea.ECONOMIC_FREEDOM, ProjectArea, 'Area')).toBeNull();
      expect(validateEnum(ProjectArea.COMMUNITY_ENGAGEMENT, ProjectArea, 'Area')).toBeNull();
    });

    it('should return error for empty string', () => {
      const error = validateEnum('', ProjectStatus, 'Status');
      expect(error).toContain('Status must be one of');
    });
  });

  describe('validateProject', () => {
    it('should validate a complete valid project', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe',
        revenueActual: 10000,
        revenuePotential: 20000,
        websiteLinks: 'https://example.com'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const project = {
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should return error for missing area', () => {
      const project = {
        name: 'Test Project',
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project area is required');
    });

    it('should return error for missing status', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        lead: 'John Doe'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project status is required');
    });

    it('should return error for missing lead', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Project lead is required');
    });

    it('should return error for invalid area enum', () => {
      const project = {
        name: 'Test Project',
        area: 'INVALID_AREA' as ProjectArea,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Project area must be one of'))).toBe(true);
    });

    it('should return error for invalid status enum', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: 'INVALID_STATUS' as ProjectStatus,
        lead: 'John Doe'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Project status must be one of'))).toBe(true);
    });

    it('should return error for negative actual revenue', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe',
        revenueActual: -1000
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Actual revenue cannot be negative');
    });

    it('should return error for negative potential revenue', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe',
        revenuePotential: -2000
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Potential revenue cannot be negative');
    });

    it('should return error for invalid website URL', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe',
        websiteLinks: 'not-a-url'
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Website link'))).toBe(true);
    });

    it('should allow zero revenue values', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe',
        revenueActual: 0,
        revenuePotential: 0
      };

      const result = validateProject(project);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateOpportunity', () => {
    it('should validate a complete valid opportunity', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        amount: 50000,
        probability: 75
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const opportunity = {
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Opportunity name is required');
    });

    it('should return error for missing organization', () => {
      const opportunity = {
        name: 'Test Opportunity',
        stage: OpportunityStage.DISCOVERY
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization is required');
    });

    it('should return error for missing stage', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org'
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stage is required');
    });

    it('should return error for invalid stage enum', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: 'INVALID_STAGE' as OpportunityStage
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Stage must be one of'))).toBe(true);
    });

    it('should return error for negative amount', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        amount: -1000
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot be negative');
    });

    it('should return error for probability less than 0', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        probability: -5
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Probability must be between 0 and 100');
    });

    it('should return error for probability greater than 100', () => {
      const opportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        probability: 105
      };

      const result = validateOpportunity(opportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Probability must be between 0 and 100');
    });

    it('should allow probability of 0 and 100', () => {
      const opportunity1 = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        probability: 0
      };

      const opportunity2 = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        probability: 100
      };

      expect(validateOpportunity(opportunity1).isValid).toBe(true);
      expect(validateOpportunity(opportunity2).isValid).toBe(true);
    });
  });

  describe('validateOrganization', () => {
    it('should validate a complete valid organization', () => {
      const organization = {
        name: 'Test Organization',
        type: OrganizationType.NONPROFIT,
        website: 'https://example.com',
        annualBudget: 100000,
        relationshipStatus: RelationshipStatus.PARTNER
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const organization = {
        type: OrganizationType.NONPROFIT
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization name is required');
    });

    it('should return error for missing type', () => {
      const organization = {
        name: 'Test Organization'
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization type is required');
    });

    it('should return error for invalid type enum', () => {
      const organization = {
        name: 'Test Organization',
        type: 'INVALID_TYPE' as OrganizationType
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Organization type must be one of'))).toBe(true);
    });

    it('should return error for invalid website URL', () => {
      const organization = {
        name: 'Test Organization',
        type: OrganizationType.NONPROFIT,
        website: 'not-a-url'
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Website'))).toBe(true);
    });

    it('should return error for negative annual budget', () => {
      const organization = {
        name: 'Test Organization',
        type: OrganizationType.NONPROFIT,
        annualBudget: -50000
      };

      const result = validateOrganization(organization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Annual budget cannot be negative');
    });
  });

  describe('validatePerson', () => {
    it('should validate a complete valid person', () => {
      const person = {
        fullName: 'John Doe',
        organization: 'Test Org',
        email: 'john@example.com',
        phone: '+1234567890',
        linkedin: 'https://linkedin.com/in/johndoe'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const person = {
        organization: 'Test Org'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Full name is required');
    });

    it('should return error for missing organization', () => {
      const person = {
        fullName: 'John Doe'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization is required');
    });

    it('should return error for invalid email', () => {
      const person = {
        fullName: 'John Doe',
        organization: 'Test Org',
        email: 'invalid-email'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should return error for invalid phone', () => {
      const person = {
        fullName: 'John Doe',
        organization: 'Test Org',
        phone: 'invalid-phone'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('should return error for invalid LinkedIn URL', () => {
      const person = {
        fullName: 'John Doe',
        organization: 'Test Org',
        linkedin: 'not-a-url'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('LinkedIn'))).toBe(true);
    });

    it('should allow optional email, phone, and linkedin', () => {
      const person = {
        fullName: 'John Doe',
        organization: 'Test Org'
      };

      const result = validatePerson(person);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateArtifact', () => {
    it('should validate a complete valid artifact', () => {
      const artifact = {
        name: 'Test Document',
        type: ArtifactType.PROPOSAL,
        createdBy: 'John Doe',
        fileUrl: 'https://example.com/file.pdf',
        version: 1
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const artifact = {
        type: ArtifactType.PROPOSAL,
        createdBy: 'John Doe'
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Artifact name is required');
    });

    it('should return error for missing type', () => {
      const artifact = {
        name: 'Test Document',
        createdBy: 'John Doe'
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Artifact type is required');
    });

    it('should return error for missing createdBy', () => {
      const artifact = {
        name: 'Test Document',
        type: ArtifactType.PROPOSAL
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Created by is required');
    });

    it('should return error for invalid file URL', () => {
      const artifact = {
        name: 'Test Document',
        type: ArtifactType.PROPOSAL,
        createdBy: 'John Doe',
        fileUrl: 'not-a-url'
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('File URL'))).toBe(true);
    });

    it('should return error for version less than 1', () => {
      const artifact = {
        name: 'Test Document',
        type: ArtifactType.PROPOSAL,
        createdBy: 'John Doe',
        version: 0
      };

      const result = validateArtifact(artifact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Version must be at least 1');
    });
  });

  describe('validateForm', () => {
    it('should apply validator function to data', () => {
      const project = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'John Doe'
      };

      const result = validateForm(project, validateProject);
      expect(result.isValid).toBe(true);
    });

    it('should return validation errors from validator', () => {
      const invalidProject = {
        name: 'Test Project'
        // Missing required fields
      };

      const result = validateForm(invalidProject, validateProject);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
    });

    it('should return false for invalid date', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for non-date values', () => {
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(123456789)).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should handle mixed content', () => {
      expect(sanitizeString('  <div>Hello World</div>  ')).toBe('divHello World/div');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle string with only whitespace', () => {
      expect(sanitizeString('   ')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });
  });

  describe('validateStringArray', () => {
    it('should return null for valid string array', () => {
      expect(validateStringArray(['a', 'b', 'c'], 'Tags')).toBeNull();
    });

    it('should return error for non-array', () => {
      expect(validateStringArray('not-an-array', 'Tags')).toBe('Tags must be an array');
    });

    it('should return error for array with non-string elements', () => {
      const error = validateStringArray(['a', 1, 'c'], 'Tags');
      expect(error).toBe('Tags[1] must be a string');
    });

    it('should return error for array with null elements', () => {
      const error = validateStringArray(['a', null, 'c'], 'Tags');
      expect(error).toBe('Tags[1] must be a string');
    });

    it('should return error for array with undefined elements', () => {
      const error = validateStringArray(['a', undefined, 'c'], 'Tags');
      expect(error).toBe('Tags[1] must be a string');
    });

    it('should return null for empty array', () => {
      expect(validateStringArray([], 'Tags')).toBeNull();
    });

    it('should handle mixed types in array', () => {
      const error = validateStringArray(['valid', 123, true, 'another'], 'Items');
      expect(error).toBe('Items[1] must be a string');
    });
  });
});
