// Tests for data models and validation

import { describe, it, expect } from 'vitest';
import {
  validateProject,
  validateOpportunity,
  validateOrganization,
  validatePerson
} from '../../utils/validation';
import {
  getMockProjects,
  getMockOpportunities,
  getMockOrganizations,
  getMockPeople,
  getMockArtifacts
} from '../../utils/mockData';
import {
  ProjectArea,
  ProjectStatus,
  OpportunityStage,
  OrganizationType
} from '../enums';

describe('Data Models', () => {
  describe('Mock Data', () => {
    it('should provide valid mock projects', () => {
      const projects = getMockProjects();
      expect(projects).toHaveLength(3);
      
      const project = projects[0];
      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(Object.values(ProjectArea)).toContain(project.area);
      expect(Object.values(ProjectStatus)).toContain(project.status);
    });

    it('should provide valid mock opportunities', () => {
      const opportunities = getMockOpportunities();
      expect(opportunities).toHaveLength(3);
      
      const opportunity = opportunities[0];
      expect(opportunity.id).toBeDefined();
      expect(opportunity.name).toBeDefined();
      expect(Object.values(OpportunityStage)).toContain(opportunity.stage);
      expect(opportunity.amount).toBeGreaterThan(0);
      expect(opportunity.probability).toBeGreaterThanOrEqual(0);
      expect(opportunity.probability).toBeLessThanOrEqual(100);
    });

    it('should provide valid mock organizations', () => {
      const organizations = getMockOrganizations();
      expect(organizations).toHaveLength(2);
      
      const organization = organizations[0];
      expect(organization.id).toBeDefined();
      expect(organization.name).toBeDefined();
      expect(Object.values(OrganizationType)).toContain(organization.type);
    });

    it('should provide valid mock people', () => {
      const people = getMockPeople();
      expect(people).toHaveLength(2);
      
      const person = people[0];
      expect(person.id).toBeDefined();
      expect(person.fullName).toBeDefined();
      expect(person.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should provide valid mock artifacts', () => {
      const artifacts = getMockArtifacts();
      expect(artifacts).toHaveLength(2);
      
      const artifact = artifacts[0];
      expect(artifact.id).toBeDefined();
      expect(artifact.name).toBeDefined();
      expect(artifact.version).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate valid project data', () => {
      const validProject = {
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        lead: 'Test Lead',
        description: 'Test description',
        revenueActual: 1000,
        revenuePotential: 2000
      };

      const result = validateProject(validProject);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid project data', () => {
      const invalidProject = {
        name: '', // Required field empty
        area: 'Invalid Area' as ProjectArea, // Invalid enum value
        revenueActual: -1000 // Negative revenue
      };

      const result = validateProject(invalidProject);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate valid opportunity data', () => {
      const validOpportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        amount: 50000,
        probability: 75
      };

      const result = validateOpportunity(validOpportunity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject opportunity with invalid probability', () => {
      const invalidOpportunity = {
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        amount: 50000,
        probability: 150 // Invalid probability > 100
      };

      const result = validateOpportunity(invalidOpportunity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Probability must be between 0 and 100');
    });

    it('should validate email format in person data', () => {
      const invalidPerson = {
        fullName: 'Test Person',
        organization: 'Test Org',
        email: 'invalid-email' // Invalid email format
      };

      const result = validatePerson(invalidPerson);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should validate URL format in organization data', () => {
      const invalidOrganization = {
        name: 'Test Org',
        type: OrganizationType.NONPROFIT,
        website: 'not-a-url' // Invalid URL format
      };

      const result = validateOrganization(invalidOrganization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Website: Invalid URL format');
    });
  });

  describe('Enums', () => {
    it('should have all required project areas', () => {
      const areas = Object.values(ProjectArea);
      expect(areas).toContain('Story & Sovereignty');
      expect(areas).toContain('Economic Freedom');
      expect(areas).toContain('Community Engagement');
      expect(areas).toContain('Operations & Infrastructure');
      expect(areas).toContain('Research & Development');
    });

    it('should have all required opportunity stages', () => {
      const stages = Object.values(OpportunityStage);
      expect(stages).toContain('Discovery 🔍');
      expect(stages).toContain('Qualification 📋');
      expect(stages).toContain('Proposal 📄');
      expect(stages).toContain('Negotiation 🤝');
      expect(stages).toContain('Closed Won ✅');
      expect(stages).toContain('Closed Lost ❌');
    });
  });
});