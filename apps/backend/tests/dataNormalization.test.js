/**
 * Data Normalization Service Tests
 * Comprehensive testing of data transformation, validation, and quality management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('Data Normalization API', () => {
  let testData;

  beforeEach(() => {
    testData = {
      story: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Community Garden Initiative',
        content: 'This is a story about a community garden that transformed a vacant lot into a thriving space for local food production and community building. The project brought together diverse residents and created lasting connections.',
        themes: ['community', 'sustainability', 'food security'],
        created_at: '2024-01-15T10:30:00Z'
      },
      storyteller: {
        id: '987fcdeb-51d2-43a1-b456-426614174000',
        full_name: 'Sarah Chen',
        bio: 'Community organizer with 10 years of experience in sustainable development projects.',
        key_insights: [
          'Community engagement is crucial for project success',
          'Local knowledge should inform design decisions'
        ],
        expertise_areas: ['community development', 'sustainability', 'project management']
      },
      invalidStory: {
        title: '', // Too short
        content: 'Short', // Too short
        themes: ['valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'valid', 'too', 'many'] // Too many themes
      }
    };
  });

  describe('GET /api/data-normalization/schemas', () => {
    it('should return available schemas and transformers', async () => {
      const response = await request(app)
        .get('/api/data-normalization/schemas')
        .expect(200);

      expect(response.body).toHaveProperty('schemas');
      expect(response.body).toHaveProperty('transformers');
      expect(response.body).toHaveProperty('quality_dimensions');
      expect(response.body).toHaveProperty('cleaning_operations');

      // Check schema structure
      expect(response.body.schemas).toHaveProperty('story');
      expect(response.body.schemas).toHaveProperty('storyteller');
      expect(response.body.schemas).toHaveProperty('document');

      // Check quality dimensions
      expect(response.body.quality_dimensions).toContain('completeness');
      expect(response.body.quality_dimensions).toContain('accuracy');
      expect(response.body.quality_dimensions).toContain('consistency');
      expect(response.body.quality_dimensions).toContain('validity');
    });
  });

  describe('POST /api/data-normalization/transform', () => {
    it('should transform valid story data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: testData.story,
          sourceType: 'supabase:stories',
          targetSchema: 'story'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      
      const transformedStory = response.body.results[0];
      expect(transformedStory).toHaveProperty('title');
      expect(transformedStory).toHaveProperty('content');
      expect(transformedStory).toHaveProperty('metadata');
      expect(transformedStory.metadata).toHaveProperty('word_count');
      expect(transformedStory.metadata).toHaveProperty('reading_time');
      expect(transformedStory.metadata).toHaveProperty('quality_score');
    });

    it('should transform valid storyteller data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: testData.storyteller,
          sourceType: 'supabase:storytellers',
          targetSchema: 'storyteller'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      
      const transformedStoryteller = response.body.results[0];
      expect(transformedStoryteller).toHaveProperty('full_name');
      expect(transformedStoryteller).toHaveProperty('bio');
      expect(transformedStoryteller).toHaveProperty('metadata');
      expect(transformedStoryteller.metadata).toHaveProperty('engagement_score');
      expect(transformedStoryteller.metadata).toHaveProperty('expertise_diversity');
    });

    it('should handle text file transformation with chunking', async () => {
      const largeTextData = {
        id: 'text-file-123',
        filename: 'large-document.txt',
        content: 'This is a very long document. '.repeat(100), // Create large content
        size: 3000,
        extension: '.txt'
      };

      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: largeTextData,
          sourceType: 'file:text',
          targetSchema: 'document'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(1); // Should be chunked
      
      // Check chunk properties
      response.body.results.forEach((chunk, index) => {
        expect(chunk).toHaveProperty('chunk_index', index);
        expect(chunk).toHaveProperty('total_chunks', response.body.results.length);
        expect(chunk).toHaveProperty('source_type', 'document');
      });
    });

    it('should return validation-only results when validateOnly is true', async () => {
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: testData.story,
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transformation.validateOnly).toBe(true);
      expect(response.body.results).toHaveLength(1);
    });

    it('should handle multiple data items', async () => {
      const multipleData = [testData.story, testData.storyteller];
      
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: multipleData,
          sourceType: 'generic',
          targetSchema: 'document'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transformation.inputCount).toBe(2);
      expect(response.body.results.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 400 for missing data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          sourceType: 'supabase:stories',
          targetSchema: 'story'
        })
        .expect(400);

      expect(response.body.error).toContain('Data is required');
    });
  });

  describe('POST /api/data-normalization/validate', () => {
    it('should validate good quality data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          data: testData.story,
          schema: 'story'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation_summary.valid_items).toBe(1);
      expect(response.body.validation_summary.pass_rate).toBeGreaterThan(70);
      
      const result = response.body.results[0];
      expect(result.valid).toBe(true);
      expect(result.quality_score).toBeGreaterThan(70);
    });

    it('should identify low quality data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          data: testData.invalidStory,
          schema: 'story'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation_summary.valid_items).toBe(0);
      expect(response.body.validation_summary.pass_rate).toBeLessThan(70);
      
      const result = response.body.results[0];
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should validate multiple items', async () => {
      const multipleData = [testData.story, testData.invalidStory];
      
      const response = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          data: multipleData,
          schema: 'story'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation_summary.total_items).toBe(2);
      expect(response.body.validation_summary.valid_items).toBe(1);
      expect(response.body.validation_summary.invalid_items).toBe(1);
    });

    it('should return 400 for missing data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          schema: 'story'
        })
        .expect(400);

      expect(response.body.error).toContain('Data is required');
    });
  });

  describe('POST /api/data-normalization/quality-check', () => {
    it('should provide comprehensive quality analysis', async () => {
      const response = await request(app)
        .post('/api/data-normalization/quality-check')
        .send({
          data: [testData.story, testData.invalidStory],
          includeRecommendations: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.quality_analysis).toHaveProperty('overall_score');
      expect(response.body.quality_analysis).toHaveProperty('dimension_scores');
      expect(response.body.quality_analysis).toHaveProperty('item_analysis');
      expect(response.body.quality_analysis).toHaveProperty('recommendations');

      // Check dimension scores
      const dimensions = response.body.quality_analysis.dimension_scores;
      expect(dimensions).toHaveProperty('completeness');
      expect(dimensions).toHaveProperty('accuracy');
      expect(dimensions).toHaveProperty('consistency');
      expect(dimensions).toHaveProperty('validity');

      // Check recommendations
      expect(response.body.quality_analysis.recommendations).toBeInstanceOf(Array);
      expect(response.body.summary).toHaveProperty('items_analyzed', 2);
      expect(response.body.summary).toHaveProperty('quality_grade');
    });

    it('should analyze item-level quality details', async () => {
      const response = await request(app)
        .post('/api/data-normalization/quality-check')
        .send({
          data: testData.story
        })
        .expect(200);

      const itemAnalysis = response.body.quality_analysis.item_analysis[0];
      expect(itemAnalysis).toHaveProperty('overall_score');
      expect(itemAnalysis).toHaveProperty('dimension_scores');
      expect(itemAnalysis).toHaveProperty('content_stats');
      expect(itemAnalysis.content_stats).toHaveProperty('has_content', true);
      expect(itemAnalysis.content_stats).toHaveProperty('content_length');
    });
  });

  describe('POST /api/data-normalization/clean', () => {
    it('should clean data with moderate aggressiveness', async () => {
      const dirtyData = [
        {
          id: '1',
          content: 'This   has    excessive     whitespace!!!!!!',
          title: 'Test Story'
        },
        {
          id: '2',
          content: 'This is a duplicate story',
          title: 'Duplicate'
        },
        {
          id: '3',
          content: 'This is a duplicate story', // Exact duplicate
          title: 'Duplicate 2'
        }
      ];

      const response = await request(app)
        .post('/api/data-normalization/clean')
        .send({
          data: dirtyData,
          operations: ['text_cleaning', 'deduplication'],
          aggressiveness: 'moderate'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cleaning_report).toHaveProperty('operations_performed');
      expect(response.body.cleaning_report.operations_performed).toHaveLength(2);
      
      // Should have removed duplicate
      expect(response.body.cleaned_data.length).toBeLessThan(dirtyData.length);
      
      // Should have cleaned whitespace
      const cleanedContent = response.body.cleaned_data[0].content;
      expect(cleanedContent).not.toMatch(/\s{2,}/); // No multiple spaces
    });

    it('should perform different cleaning operations', async () => {
      const response = await request(app)
        .post('/api/data-normalization/clean')
        .send({
          data: [testData.story],
          operations: ['validation', 'enhancement'],
          aggressiveness: 'conservative'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const operations = response.body.cleaning_report.operations_performed;
      expect(operations.some(op => op.operation === 'validation')).toBe(true);
      expect(operations.some(op => op.operation === 'enhancement')).toBe(true);
    });

    it('should return 400 for non-array data', async () => {
      const response = await request(app)
        .post('/api/data-normalization/clean')
        .send({
          data: testData.story, // Should be array
          operations: ['text_cleaning']
        })
        .expect(400);

      expect(response.body.error).toContain('Data array is required');
    });
  });

  describe('GET /api/data-normalization/metrics', () => {
    it('should return quality metrics', async () => {
      const response = await request(app)
        .get('/api/data-normalization/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('quality_metrics');
      expect(response.body).toHaveProperty('system_health');
      expect(response.body.system_health.normalization_service).toBe('operational');
    });
  });

  describe('POST /api/data-normalization/metrics/reset', () => {
    it('should reset quality metrics', async () => {
      const response = await request(app)
        .post('/api/data-normalization/metrics/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: { malformed: 'data' },
          sourceType: 'invalid:source',
          targetSchema: 'invalid_schema'
        })
        .expect(500);

      expect(response.body.error).toContain('transformation failed');
      expect(response.body).toHaveProperty('suggestions');
    });

    it('should handle validation errors gracefully', async () => {
      // Send malformed data that will cause validation to fail
      const response = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          data: null,
          schema: 'story'
        })
        .expect(500);

      expect(response.body.error).toContain('validation failed');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete transformation workflow', async () => {
      // 1. Transform data
      const transformResponse = await request(app)
        .post('/api/data-normalization/transform')
        .send({
          data: testData.story,
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true // Don't store for test
        })
        .expect(200);

      expect(transformResponse.body.success).toBe(true);
      
      // 2. Validate transformed data
      const validateResponse = await request(app)
        .post('/api/data-normalization/validate')
        .send({
          data: transformResponse.body.results[0],
          schema: 'story'
        })
        .expect(200);

      expect(validateResponse.body.validation_summary.valid_items).toBe(1);
      
      // 3. Quality check
      const qualityResponse = await request(app)
        .post('/api/data-normalization/quality-check')
        .send({
          data: transformResponse.body.results[0]
        })
        .expect(200);

      expect(qualityResponse.body.quality_analysis.overall_score).toBeGreaterThan(70);
    });

    it('should provide consistent quality scoring', async () => {
      // Test the same data multiple times to ensure consistent scoring
      const responses = await Promise.all([
        request(app).post('/api/data-normalization/quality-check').send({ data: testData.story }),
        request(app).post('/api/data-normalization/quality-check').send({ data: testData.story }),
        request(app).post('/api/data-normalization/quality-check').send({ data: testData.story })
      ]);

      const scores = responses.map(r => r.body.quality_analysis.overall_score);
      
      // All scores should be the same (deterministic)
      expect(scores[0]).toBe(scores[1]);
      expect(scores[1]).toBe(scores[2]);
    });
  });
});

describe('Data Normalization Service Unit Tests', () => {
  describe('Text Processing Functions', () => {
    it('should handle edge cases in text cleaning', async () => {
      const edgeCases = [
        { content: '', title: 'Empty Content' },
        { content: '   ', title: 'Whitespace Only' },
        { content: 'a'.repeat(10001), title: 'Too Long' },
        { content: 'Normal content', title: '' },
        { content: 'Content with\x00null\uFFFDbytes', title: 'Invalid Chars' }
      ];

      for (const testCase of edgeCases) {
        const response = await request(app)
          .post('/api/data-normalization/transform')
          .send({
            data: testCase,
            sourceType: 'generic',
            targetSchema: 'document',
            validateOnly: true
          });

        // Should not crash, even with edge cases
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should normalize various theme formats', async () => {
      const themeTestCases = [
        { themes: ['  Community  ', 'SUSTAINABILITY', 'food-security'] },
        { themes: ['duplicate', 'theme', 'duplicate', 'theme'] },
        { themes: ['valid'] },
        { themes: [] },
        { themes: null }
      ];

      for (const testCase of themeTestCases) {
        const response = await request(app)
          .post('/api/data-normalization/transform')
          .send({
            data: { ...testData.story, ...testCase },
            sourceType: 'supabase:stories',
            targetSchema: 'story',
            validateOnly: true
          });

        if (response.status === 200) {
          const themes = response.body.results[0]?.themes || [];
          expect(Array.isArray(themes)).toBe(true);
          // Should be normalized to lowercase, trimmed, and deduplicated
          themes.forEach(theme => {
            expect(theme).toBe(theme.toLowerCase().trim());
          });
        }
      }
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate reading time correctly', async () => {
      const shortContent = 'This is a short story.';
      const longContent = 'This is a much longer story. '.repeat(100);

      const responses = await Promise.all([
        request(app).post('/api/data-normalization/transform').send({
          data: { ...testData.story, content: shortContent },
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true
        }),
        request(app).post('/api/data-normalization/transform').send({
          data: { ...testData.story, content: longContent },
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true
        })
      ]);

      const shortReadingTime = responses[0].body.results[0]?.metadata?.reading_time || 0;
      const longReadingTime = responses[1].body.results[0]?.metadata?.reading_time || 0;

      expect(longReadingTime).toBeGreaterThan(shortReadingTime);
      expect(shortReadingTime).toBeGreaterThanOrEqual(1); // Minimum 1 minute
    });

    it('should calculate complexity scores appropriately', async () => {
      const simpleContent = 'This is simple. Easy to read. Short sentences.';
      const complexContent = 'This extraordinarily sophisticated narrative demonstrates the multifaceted intricacies inherent within contemporary socioeconomic paradigms, necessitating comprehensive analytical frameworks for adequate comprehension.';

      const responses = await Promise.all([
        request(app).post('/api/data-normalization/transform').send({
          data: { ...testData.story, content: simpleContent },
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true
        }),
        request(app).post('/api/data-normalization/transform').send({
          data: { ...testData.story, content: complexContent },
          sourceType: 'supabase:stories',
          targetSchema: 'story',
          validateOnly: true
        })
      ]);

      const simpleComplexity = responses[0].body.results[0]?.metadata?.complexity_score || 0;
      const complexComplexity = responses[1].body.results[0]?.metadata?.complexity_score || 0;

      expect(complexComplexity).toBeGreaterThan(simpleComplexity);
    });
  });
});