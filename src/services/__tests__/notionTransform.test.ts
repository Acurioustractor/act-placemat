// Tests for Notion transformation utilities

import { describe, it, expect } from 'vitest';
import {
  extractPlainText,
  extractDate,
  extractNumber,
  extractSelect,
  extractMultiSelect,
  extractProbabilityFromSelect,
  transformNotionProject,
  transformNotionOpportunity,
  transformNotionResponse
} from '../notionTransform';
import { ProjectArea, ProjectStatus } from '../../types';

describe('Notion Transformation Utilities', () => {
  describe('extractPlainText', () => {
    it('should extract plain text from rich text array', () => {
      const richText = [
        { plain_text: 'Hello' },
        { plain_text: ' world' }
      ];
      
      expect(extractPlainText(richText)).toBe('Hello world');
    });
    
    it('should return empty string for empty array', () => {
      expect(extractPlainText([])).toBe('');
    });
    
    it('should return empty string for undefined input', () => {
      expect(extractPlainText(undefined as any)).toBe('');
    });
  });
  
  describe('extractDate', () => {
    it('should extract date from date property', () => {
      const dateProperty = { start: '2023-01-01' };
      const result = extractDate(dateProperty);
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().substring(0, 10)).toBe('2023-01-01');
    });
    
    it('should return undefined for undefined input', () => {
      expect(extractDate(undefined)).toBeUndefined();
    });
    
    it('should return undefined for invalid date property', () => {
      expect(extractDate({ end: '2023-01-01' })).toBeUndefined();
    });
  });
  
  describe('extractNumber', () => {
    it('should extract number from number property', () => {
      expect(extractNumber(42)).toBe(42);
    });
    
    it('should return 0 for undefined input', () => {
      expect(extractNumber(undefined)).toBe(0);
    });
    
    it('should return 0 for non-numeric input', () => {
      expect(extractNumber('not a number' as any)).toBe(0);
    });
  });
  
  describe('extractSelect', () => {
    it('should extract select value from select property', () => {
      const selectProperty = { name: 'Option 1' };
      expect(extractSelect(selectProperty)).toBe('Option 1');
    });
    
    it('should return empty string for undefined input', () => {
      expect(extractSelect(undefined)).toBe('');
    });
    
    it('should return empty string for invalid select property', () => {
      expect(extractSelect({ id: '123' })).toBe('');
    });
  });
  
  describe('extractMultiSelect', () => {
    it('should extract values from multi-select property', () => {
      const multiSelectProperty = [
        { name: 'Option 1' },
        { name: 'Option 2' }
      ];
      
      expect(extractMultiSelect(multiSelectProperty)).toEqual(['Option 1', 'Option 2']);
    });
    
    it('should return empty array for undefined input', () => {
      expect(extractMultiSelect(undefined as any)).toEqual([]);
    });
    
    it('should filter out items without name', () => {
      const multiSelectProperty = [
        { name: 'Option 1' },
        { id: '123' }
      ];
      
      expect(extractMultiSelect(multiSelectProperty)).toEqual(['Option 1']);
    });
  });
  
  describe('extractProbabilityFromSelect', () => {
    it('should extract numeric probability from percentage string', () => {
      const selectProperty = { name: '75%' };
      expect(extractProbabilityFromSelect(selectProperty)).toBe(75);
    });
    
    it('should work with different percentage values', () => {
      expect(extractProbabilityFromSelect({ name: '10%' })).toBe(10);
      expect(extractProbabilityFromSelect({ name: '25%' })).toBe(25);
      expect(extractProbabilityFromSelect({ name: '50%' })).toBe(50);
      expect(extractProbabilityFromSelect({ name: '90%' })).toBe(90);
    });
    
    it('should handle numeric strings without percentage sign', () => {
      const selectProperty = { name: '75' };
      expect(extractProbabilityFromSelect(selectProperty)).toBe(75);
    });
    
    it('should return 0 for undefined input', () => {
      expect(extractProbabilityFromSelect(undefined)).toBe(0);
    });
    
    it('should return 0 for non-numeric strings', () => {
      expect(extractProbabilityFromSelect({ name: 'High' })).toBe(0);
      expect(extractProbabilityFromSelect({ name: 'Very likely' })).toBe(0);
    });
    
    it('should return 0 for empty select property', () => {
      expect(extractProbabilityFromSelect({ name: '' })).toBe(0);
      expect(extractProbabilityFromSelect({})).toBe(0);
    });
  });
  
  describe('transformNotionProject', () => {
    it('should transform Notion page to Project model', () => {
      const notionPage = {
        id: 'page-id',
        last_edited_time: '2023-01-01T00:00:00.000Z',
        properties: {
          Name: {
            title: [{ plain_text: 'Test Project' }]
          },
          Area: {
            select: { name: ProjectArea.STORY_SOVEREIGNTY }
          },
          Status: {
            select: { name: ProjectStatus.ACTIVE }
          },
          Description: {
            rich_text: [{ plain_text: 'Project description' }]
          },
          'Project Lead': {
            people: [{ name: 'John Doe' }]
          },
          'Revenue Actual': {
            number: 10000
          },
          'Revenue Potential': {
            number: 20000
          },
          'Start Date': {
            date: { start: '2023-01-01' }
          }
        }
      };
      
      const project = transformNotionProject(notionPage);
      
      expect(project.id).toBe('page-id');
      expect(project.name).toBe('Test Project');
      expect(project.area).toBe(ProjectArea.STORY_SOVEREIGNTY);
      expect(project.status).toBe(ProjectStatus.ACTIVE);
      expect(project.description).toBe('Project description');
      expect(project.lead).toBe('John Doe');
      expect(project.revenueActual).toBe(10000);
      expect(project.revenuePotential).toBe(20000);
      expect(project.startDate?.toISOString().substring(0, 10)).toBe('2023-01-01');
      expect(project.lastModified.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });
  });
  
  describe('transformNotionOpportunity', () => {
    it('should transform Notion opportunity with probability select field', () => {
      const notionPage = {
        id: 'opportunity-id',
        last_edited_time: '2023-01-01T00:00:00.000Z',
        properties: {
          Name: {
            title: [{ plain_text: 'Test Opportunity' }]
          },
          Organization: {
            rich_text: [{ plain_text: 'Test Organization' }]
          },
          Stage: {
            select: { name: 'Discovery' }
          },
          Amount: {
            number: 50000
          },
          Probability: {
            select: { name: '75%' }
          }
        }
      };
      
      const opportunity = transformNotionOpportunity(notionPage);
      
      expect(opportunity.id).toBe('opportunity-id');
      expect(opportunity.name).toBe('Test Opportunity');
      expect(opportunity.organization).toBe('Test Organization');
      expect(opportunity.stage).toBe('Discovery');
      expect(opportunity.amount).toBe(50000);
      expect(opportunity.probability).toBe(75); // Should extract 75 from "75%"
      expect(opportunity.weightedValue).toBe(37500); // 50000 * 75 / 100
      expect(opportunity.lastModified.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });
    
    it('should handle different probability percentage values', () => {
      const testCases = [
        { input: '10%', expected: 10 },
        { input: '25%', expected: 25 },
        { input: '50%', expected: 50 },
        { input: '90%', expected: 90 }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const notionPage = {
          id: 'test-id',
          last_edited_time: '2023-01-01T00:00:00.000Z',
          properties: {
            Name: { title: [{ plain_text: 'Test' }] },
            Organization: { rich_text: [{ plain_text: 'Test Org' }] },
            Stage: { select: { name: 'Discovery' } },
            Amount: { number: 10000 },
            Probability: { select: { name: input } }
          }
        };
        
        const opportunity = transformNotionOpportunity(notionPage);
        expect(opportunity.probability).toBe(expected);
      });
    });
  });
  
  describe('transformNotionResponse', () => {
    it('should transform Notion response to array of models', () => {
      const notionResponse = {
        object: 'list' as const,
        results: [
          {
            id: 'page-1',
            last_edited_time: '2023-01-01T00:00:00.000Z',
            properties: {
              Name: {
                title: [{ plain_text: 'Project 1' }]
              }
            }
          },
          {
            id: 'page-2',
            last_edited_time: '2023-01-02T00:00:00.000Z',
            properties: {
              Name: {
                title: [{ plain_text: 'Project 2' }]
              }
            }
          }
        ],
        next_cursor: null,
        has_more: false,
        type: 'page_or_database' as const,
        page_or_database: {}
      };
      
      const transformer = (page: any) => ({
        id: page.id,
        name: extractPlainText(page.properties.Name?.title || []),
        lastModified: new Date(page.last_edited_time)
      });
      
      const result = transformNotionResponse(notionResponse, transformer);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('page-1');
      expect(result[0].name).toBe('Project 1');
      expect(result[1].id).toBe('page-2');
      expect(result[1].name).toBe('Project 2');
    });
    
    it('should return empty array for invalid response', () => {
      expect(transformNotionResponse(undefined as any, () => ({}))).toEqual([]);
      expect(transformNotionResponse({ results: null } as any, () => ({}))).toEqual([]);
      expect(transformNotionResponse({ results: 'not an array' } as any, () => ({}))).toEqual([]);
    });
  });
});