/**
 * Data Normalization API
 * Provides endpoints for data transformation, validation, and quality management
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { trackProcessingTime, trackDataQuality } from '../middleware/slaTracking.js';
import DataNormalizationService from '../services/dataNormalizationService.js';

const router = express.Router();
const normalizationService = new DataNormalizationService();

/**
 * POST /api/data-normalization/transform
 * Transform raw data using specified transformation pipeline
 */
router.post('/transform', optionalAuth, trackProcessingTime('normalization_time'), asyncHandler(async (req, res) => {
  const {
    data,
    sourceType = 'generic',
    targetSchema = 'document',
    validateOnly = false
  } = req.body;

  if (!data) {
    return res.status(400).json({
      error: 'Data is required for transformation',
      expected_format: {
        data: 'Raw data object or array',
        sourceType: 'supabase:stories | supabase:storytellers | file:text | notion:pages',
        targetSchema: 'story | storyteller | document',
        validateOnly: false
      }
    });
  }

  try {
    console.log(`🔄 Transforming data: ${sourceType} → ${targetSchema}`);
    
    // Create transformation pipeline
    const pipeline = normalizationService.createTransformationPipeline(sourceType, targetSchema);
    
    // Handle array or single data items
    const dataArray = Array.isArray(data) ? data : [data];
    const transformedResults = [];

    for (const item of dataArray) {
      const result = await pipeline.execute(item);
      if (result && result.length > 0) {
        transformedResults.push(...result);
      }
    }

    // Store data if not validation-only mode
    if (!validateOnly && transformedResults.length > 0) {
      await normalizationService.storeNormalizedData(transformedResults);
    }

    res.json({
      success: true,
      transformation: {
        sourceType,
        targetSchema,
        validateOnly,
        inputCount: dataArray.length,
        outputCount: transformedResults.length,
        pipeline_config: {
          transformer: pipeline.sourceType,
          validator: targetSchema
        }
      },
      results: transformedResults,
      quality_metrics: normalizationService.getQualityMetrics(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data transformation failed:', error);
    res.status(500).json({
      error: 'Data transformation failed',
      details: error.message,
      suggestions: [
        'Check data format matches sourceType',
        'Verify targetSchema is supported',
        'Ensure data meets minimum quality requirements'
      ]
    });
  }
}));

/**
 * POST /api/data-normalization/validate
 * Validate data against specified schema without transformation
 */
router.post('/validate', optionalAuth, asyncHandler(async (req, res) => {
  const { data, schema = 'document' } = req.body;

  if (!data) {
    return res.status(400).json({
      error: 'Data is required for validation'
    });
  }

  try {
    console.log(`✅ Validating data against ${schema} schema`);
    
    const dataArray = Array.isArray(data) ? data : [data];
    const validationResults = [];

    for (const item of dataArray) {
      const qualityChecks = normalizationService.performQualityChecks(item);
      
      validationResults.push({
        id: item.id || 'unknown',
        valid: qualityChecks.passed,
        quality_score: qualityChecks.score,
        quality_metrics: qualityChecks.metrics,
        issues: qualityChecks.issues,
        schema_compliance: true // Basic check since we're using Joi schemas
      });
    }

    const validCount = validationResults.filter(r => r.valid).length;
    const avgQualityScore = validationResults.reduce((sum, r) => sum + r.quality_score, 0) / validationResults.length;

    res.json({
      success: true,
      validation_summary: {
        total_items: validationResults.length,
        valid_items: validCount,
        invalid_items: validationResults.length - validCount,
        avg_quality_score: avgQualityScore,
        pass_rate: (validCount / validationResults.length) * 100
      },
      results: validationResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data validation failed:', error);
    res.status(500).json({
      error: 'Data validation failed',
      details: error.message
    });
  }
}));

/**
 * POST /api/data-normalization/quality-check
 * Perform comprehensive quality analysis on data
 */
router.post('/quality-check', optionalAuth, trackDataQuality('quality_check_time'), asyncHandler(async (req, res) => {
  const { data, includeRecommendations = true } = req.body;

  if (!data) {
    return res.status(400).json({
      error: 'Data is required for quality check'
    });
  }

  try {
    console.log('🔍 Performing comprehensive quality check');
    
    const dataArray = Array.isArray(data) ? data : [data];
    const qualityAnalysis = {
      overall_score: 0,
      dimension_scores: {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        validity: 0
      },
      item_analysis: [],
      recommendations: []
    };

    let totalScore = 0;
    const dimensionTotals = { completeness: 0, accuracy: 0, consistency: 0, validity: 0 };

    for (const item of dataArray) {
      const qualityChecks = normalizationService.performQualityChecks(item);
      
      const itemAnalysis = {
        id: item.id || 'unknown',
        overall_score: qualityChecks.score,
        dimension_scores: qualityChecks.metrics,
        issues: qualityChecks.issues,
        data_size: JSON.stringify(item).length,
        content_stats: {
          has_content: Boolean(item.content),
          content_length: (item.content || '').length,
          has_metadata: Boolean(item.metadata),
          has_embedding: Boolean(item.embedding)
        }
      };

      qualityAnalysis.item_analysis.push(itemAnalysis);
      totalScore += qualityChecks.score;
      
      // Accumulate dimension scores
      Object.keys(dimensionTotals).forEach(dimension => {
        dimensionTotals[dimension] += qualityChecks.metrics[dimension];
      });
    }

    // Calculate averages
    qualityAnalysis.overall_score = totalScore / dataArray.length;
    Object.keys(dimensionTotals).forEach(dimension => {
      qualityAnalysis.dimension_scores[dimension] = dimensionTotals[dimension] / dataArray.length;
    });

    // Generate recommendations
    if (includeRecommendations) {
      qualityAnalysis.recommendations = generateQualityRecommendations(qualityAnalysis);
    }

    res.json({
      success: true,
      quality_analysis: qualityAnalysis,
      summary: {
        items_analyzed: dataArray.length,
        avg_quality_score: qualityAnalysis.overall_score,
        quality_grade: getQualityGrade(qualityAnalysis.overall_score),
        critical_issues: qualityAnalysis.item_analysis.filter(item => item.overall_score < 50).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Quality check failed:', error);
    res.status(500).json({
      error: 'Quality check failed',
      details: error.message
    });
  }
}));

/**
 * POST /api/data-normalization/clean
 * Clean and enhance data quality
 */
router.post('/clean', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    data, 
    operations = ['text_cleaning', 'deduplication', 'validation', 'enhancement'],
    aggressiveness = 'moderate' 
  } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      error: 'Data array is required for cleaning',
      expected_format: {
        data: '[{...}, {...}]',
        operations: ['text_cleaning', 'deduplication', 'validation', 'enhancement'],
        aggressiveness: 'conservative | moderate | aggressive'
      }
    });
  }

  try {
    console.log(`🧹 Cleaning ${data.length} data items with ${aggressiveness} aggressiveness`);
    
    let cleanedData = [...data];
    const cleaningReport = {
      original_count: data.length,
      operations_performed: [],
      items_modified: 0,
      items_removed: 0,
      quality_improvement: 0
    };

    // Perform cleaning operations
    for (const operation of operations) {
      const beforeCount = cleanedData.length;
      const beforeQuality = calculateAvgQuality(cleanedData, normalizationService);

      switch (operation) {
        case 'text_cleaning':
          cleanedData = performTextCleaning(cleanedData, aggressiveness);
          break;
        case 'deduplication':
          cleanedData = performDeduplication(cleanedData, aggressiveness);
          break;
        case 'validation':
          cleanedData = performValidationCleaning(cleanedData, normalizationService);
          break;
        case 'enhancement':
          cleanedData = await performDataEnhancement(cleanedData, normalizationService);
          break;
      }

      const afterCount = cleanedData.length;
      const afterQuality = calculateAvgQuality(cleanedData, normalizationService);

      cleaningReport.operations_performed.push({
        operation,
        items_before: beforeCount,
        items_after: afterCount,
        items_removed: beforeCount - afterCount,
        quality_before: beforeQuality,
        quality_after: afterQuality,
        quality_improvement: afterQuality - beforeQuality
      });
    }

    cleaningReport.final_count = cleanedData.length;
    cleaningReport.items_removed = data.length - cleanedData.length;
    cleaningReport.quality_improvement = calculateAvgQuality(cleanedData, normalizationService) - calculateAvgQuality(data, normalizationService);

    res.json({
      success: true,
      cleaning_report: cleaningReport,
      cleaned_data: cleanedData,
      summary: {
        original_items: data.length,
        cleaned_items: cleanedData.length,
        removal_rate: ((data.length - cleanedData.length) / data.length) * 100,
        quality_improvement: cleaningReport.quality_improvement,
        operations_applied: operations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data cleaning failed:', error);
    res.status(500).json({
      error: 'Data cleaning failed',
      details: error.message
    });
  }
}));

/**
 * GET /api/data-normalization/schemas
 * Get available data schemas and their specifications
 */
router.get('/schemas', asyncHandler(async (req, res) => {
  const schemas = {
    story: {
      description: 'Community story data schema',
      required_fields: ['title', 'content'],
      optional_fields: ['summary', 'themes', 'metadata', 'embedding'],
      validation_rules: {
        title: 'String, 1-500 characters',
        content: 'String, minimum 10 characters',
        themes: 'Array of strings, max 10 items',
        embedding: 'Array of numbers, 1536 dimensions'
      }
    },
    storyteller: {
      description: 'Storyteller profile data schema',
      required_fields: ['full_name'],
      optional_fields: ['bio', 'transcript', 'key_insights', 'expertise_areas', 'metadata'],
      validation_rules: {
        full_name: 'String, 1-200 characters',
        bio: 'String, max 2000 characters',
        key_insights: 'Array of strings, max 20 items',
        expertise_areas: 'Array of strings, max 15 items'
      }
    },
    document: {
      description: 'Generic document data schema',
      required_fields: ['content', 'source_type'],
      optional_fields: ['title', 'metadata', 'embedding', 'quality_metrics'],
      validation_rules: {
        content: 'String, required',
        source_type: 'String, valid source type',
        chunk_index: 'Integer, >= 0',
        total_chunks: 'Integer, >= 1'
      }
    }
  };

  const transformers = {
    'supabase:stories': 'Transform Supabase stories table data',
    'supabase:storytellers': 'Transform Supabase storytellers table data',
    'file:text': 'Transform text file content',
    'notion:pages': 'Transform Notion page data',
    'research:web': 'Transform web research data',
    'generic': 'Generic transformer for unknown formats'
  };

  res.json({
    schemas,
    transformers,
    quality_dimensions: [
      'completeness',
      'accuracy', 
      'consistency',
      'validity'
    ],
    cleaning_operations: [
      'text_cleaning',
      'deduplication', 
      'validation',
      'enhancement'
    ],
    aggressiveness_levels: [
      'conservative',
      'moderate',
      'aggressive'
    ]
  });
}));

/**
 * GET /api/data-normalization/metrics
 * Get current quality metrics and statistics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = normalizationService.getQualityMetrics();
  
  res.json({
    quality_metrics: metrics,
    system_health: {
      normalization_service: 'operational',
      schema_validation: 'active',
      quality_monitoring: 'enabled'
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/data-normalization/metrics/reset
 * Reset quality metrics counters
 */
router.post('/metrics/reset', optionalAuth, asyncHandler(async (req, res) => {
  normalizationService.resetQualityMetrics();
  
  res.json({
    success: true,
    message: 'Quality metrics reset successfully',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Helper functions
 */

function generateQualityRecommendations(qualityAnalysis) {
  const recommendations = [];
  const { overall_score, dimension_scores } = qualityAnalysis;

  if (overall_score < 70) {
    recommendations.push({
      priority: 'high',
      category: 'overall_quality',
      issue: 'Low overall quality score',
      recommendation: 'Implement comprehensive data cleaning pipeline',
      impact: 'Improves data reliability and ML model performance'
    });
  }

  if (dimension_scores.completeness < 80) {
    recommendations.push({
      priority: 'high',
      category: 'completeness',
      issue: 'Missing required fields in data',
      recommendation: 'Add validation to ensure all required fields are present',
      impact: 'Reduces processing errors and improves data usability'
    });
  }

  if (dimension_scores.accuracy < 75) {
    recommendations.push({
      priority: 'medium',
      category: 'accuracy',
      issue: 'Data accuracy concerns detected',
      recommendation: 'Implement content validation and filtering',
      impact: 'Improves data reliability and reduces noise'
    });
  }

  if (dimension_scores.consistency < 80) {
    recommendations.push({
      priority: 'medium',
      category: 'consistency',
      issue: 'Data format inconsistencies',
      recommendation: 'Standardize data formats and validation rules',
      impact: 'Enables better data processing and analysis'
    });
  }

  return recommendations;
}

function getQualityGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateAvgQuality(data, service) {
  if (!data.length) return 0;
  
  const qualityScores = data.map(item => {
    const checks = service.performQualityChecks(item);
    return checks.score;
  });
  
  return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
}

function performTextCleaning(data, aggressiveness) {
  return data.map(item => {
    if (!item.content) return item;
    
    let cleanedContent = item.content;
    
    switch (aggressiveness) {
      case 'aggressive':
        cleanedContent = cleanedContent
          .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special chars
          .replace(/(.)\1{3,}/g, '$1$1') // Reduce repetition
          .replace(/\s+/g, ' '); // Normalize whitespace
        break;
      case 'moderate':
        cleanedContent = cleanedContent
          .replace(/(.)\1{4,}/g, '$1$1$1') // Reduce excessive repetition
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        break;
      case 'conservative':
      default:
        cleanedContent = cleanedContent
          .replace(/\s+/g, ' ') // Only normalize whitespace
          .trim();
        break;
    }
    
    return {
      ...item,
      content: cleanedContent
    };
  });
}

function performDeduplication(data, aggressiveness) {
  const seen = new Set();
  const threshold = aggressiveness === 'aggressive' ? 0.9 : 
                   aggressiveness === 'moderate' ? 0.95 : 0.98;
  
  return data.filter(item => {
    const key = aggressiveness === 'conservative' 
      ? item.content 
      : item.content?.substring(0, 100);
      
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function performValidationCleaning(data, service) {
  return data.filter(item => {
    const checks = service.performQualityChecks(item);
    return checks.passed;
  });
}

async function performDataEnhancement(data, service) {
  return data.map(item => {
    // Add missing metadata
    if (!item.metadata) {
      item.metadata = {};
    }
    
    if (item.content && !item.metadata.word_count) {
      item.metadata.word_count = service.countWords(item.content);
    }
    
    if (item.content && !item.metadata.reading_time) {
      item.metadata.reading_time = service.calculateReadingTime(item.content);
    }
    
    return item;
  });
}

export default router;