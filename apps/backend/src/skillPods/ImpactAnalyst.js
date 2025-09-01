/**
 * Impact Analyst Skill Pod - World-Class Impact Measurement Engine
 * 
 * Philosophy: "What gets measured gets transformed" - Quantifying change that matters
 * 
 * This sophisticated analyst provides:
 * - Multi-dimensional impact measurement and evaluation
 * - Social Return on Investment (SROI) calculation
 * - Community-defined outcomes tracking
 * - Longitudinal impact analysis with predictive modeling
 * - Cultural impact assessment and Indigenous evaluation frameworks
 * - Real-time impact dashboards and automated reporting
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import OpenAI from 'openai';
import neo4j from 'neo4j-driver';
import * as tf from '@tensorflow/tfjs-node';
import { createClient } from '@supabase/supabase-js';

class ImpactAnalyst {
  constructor(agent) {
    this.agent = agent;
    this.name = 'Impact Analyst';
    
    // Initialize connections
    this.kafka = new Kafka({
      clientId: 'act-impact-analyst',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'impact-analyst-group' });
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Supabase for impact data storage
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Neo4j for impact relationship mapping
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    // OpenAI for impact intelligence
    this.openai = null;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Impact measurement frameworks
    this.impactFrameworks = this.initializeImpactFrameworks();
    
    // Evaluation methodologies
    this.evaluationMethods = this.initializeEvaluationMethods();
    
    // Cultural evaluation protocols
    this.culturalEvaluation = this.initializeCulturalEvaluation();
    
    // Impact models and predictors
    this.models = {
      impactPredictor: null,
      outcomeAnalyzer: null,
      troiCalculator: null, // Theory-based Return on Investment
      communityValueModel: null
    };
    
    // Impact intelligence cache
    this.impactCache = new Map();
    this.outcomeMatrices = new Map();
    this.benchmarkData = new Map();
    
    // Measurement thresholds and benchmarks
    this.benchmarks = this.initializeBenchmarks();
    
    console.log('📊 Impact Analyst initialized - Measuring transformation that matters');
  }

  initializeImpactFrameworks() {
    return {
      theory_of_change: {
        name: 'Theory of Change Framework',
        components: [
          'long_term_goals',
          'outcomes',
          'outputs',
          'activities',
          'assumptions',
          'external_factors'
        ],
        
        measurement_approach: {
          inputs: 'Resources invested (time, money, people, knowledge)',
          activities: 'Actions taken to create change',
          outputs: 'Direct products of activities',
          outcomes: 'Changes in people, organizations, communities',
          impact: 'Fundamental, sustainable changes'
        },
        
        validation_methods: [
          'stakeholder_verification',
          'evidence_triangulation',
          'assumption_testing',
          'external_validation'
        ]
      },
      
      social_return_investment: {
        name: 'Social Return on Investment (SROI)',
        methodology: 'Monetary valuation of social, environmental, and economic outcomes',
        
        calculation_steps: [
          'identify_stakeholders',
          'map_outcomes',
          'evidence_outcomes',
          'value_outcomes',
          'calculate_sroi',
          'report_and_embed'
        ],
        
        valuation_techniques: {
          revealed_preference: 'Using market prices where available',
          stated_preference: 'Asking people what they would pay',
          wellbeing_valuation: 'Using wellbeing research data',
          cost_based: 'Using cost of alternative provision'
        },
        
        quality_principles: [
          'involve_stakeholders',
          'understand_what_changes',
          'value_what_matters',
          'only_include_what_is_material',
          'do_not_overclaim',
          'be_transparent'
        ]
      },
      
      indigenous_evaluation: {
        name: 'Indigenous and Culturally Responsive Evaluation',
        principles: [
          'self_determination',
          'cultural_sovereignty',
          'holistic_wellbeing',
          'intergenerational_thinking',
          'relationship_centeredness',
          'strength_based_approach'
        ],
        
        methodologies: {
          yarning_circles: {
            description: 'Conversational method for gathering qualitative data',
            cultural_protocol: 'Follow appropriate cultural protocols for storytelling'
          },
          
          cultural_mapping: {
            description: 'Mapping cultural connections, knowledge, and practices',
            respect_requirements: 'Sacred and restricted knowledge protection'
          },
          
          community_indicators: {
            description: 'Community-defined measures of wellbeing and success',
            ownership: 'Community maintains ownership and control of indicators'
          },
          
          strength_assessment: {
            description: 'Focus on community assets, knowledge, and resilience',
            approach: 'Build on existing strengths rather than deficit-based thinking'
          }
        }
      },
      
      developmental_evaluation: {
        name: 'Developmental Evaluation for Complex Change',
        purpose: 'Support innovation and adaptation in complex, emergent situations',
        
        characteristics: [
          'real_time_feedback',
          'adaptive_learning',
          'complexity_aware',
          'innovation_focused',
          'systems_oriented'
        ],
        
        methods: {
          most_significant_change: {
            description: 'Participatory narrative approach to monitoring change',
            process: 'Collect, select, and analyze stories of change'
          },
          
          outcome_harvesting: {
            description: 'Identify actual outcomes and work backwards to activities',
            verification: 'Verify outcomes with stakeholders and evidence'
          },
          
          ripple_effects_mapping: {
            description: 'Map unintended consequences and broader impacts',
            scope: 'Include positive and negative ripple effects'
          }
        }
      },
      
      participatory_evaluation: {
        name: 'Participatory and Community-Led Evaluation',
        philosophy: 'Those most affected by programs should lead evaluation processes',
        
        approaches: {
          community_based_participatory_evaluation: {
            leadership: 'Community members lead all aspects',
            capacity_building: 'Build evaluation skills within community',
            ownership: 'Community owns evaluation process and findings'
          },
          
          peer_evaluation: {
            evaluators: 'Program participants evaluate each other',
            mutual_learning: 'Focus on shared learning and improvement',
            trust_building: 'Build relationships and mutual support'
          },
          
          collaborative_evaluation: {
            partnership: 'Partnership between evaluators and stakeholders',
            shared_decision_making: 'Joint decisions about methods and focus',
            capacity_sharing: 'Exchange skills and knowledge'
          }
        }
      }
    };
  }

  initializeEvaluationMethods() {
    return {
      quantitative_methods: {
        randomized_controlled_trials: {
          strength: 'High internal validity for causal inference',
          limitations: 'May not be ethical or feasible for all interventions',
          applications: 'Testing specific interventions with clear outcomes'
        },
        
        quasi_experimental_designs: {
          types: ['difference_in_differences', 'regression_discontinuity', 'propensity_score_matching'],
          strength: 'Good causal inference when randomization not possible',
          requirements: 'Good comparison groups and longitudinal data'
        },
        
        survey_research: {
          applications: ['baseline_data', 'outcome_measurement', 'stakeholder_feedback'],
          considerations: ['cultural_appropriateness', 'language_accessibility', 'response_bias']
        },
        
        administrative_data_analysis: {
          sources: ['government_records', 'service_utilization', 'academic_records'],
          advantages: ['longitudinal_tracking', 'objective_measures', 'population_level_data']
        }
      },
      
      qualitative_methods: {
        in_depth_interviews: {
          purpose: 'Deep understanding of individual experiences and perspectives',
          protocols: ['semi_structured', 'life_history', 'key_informant']
        },
        
        focus_groups: {
          purpose: 'Group perspectives and community dialogue',
          considerations: ['power_dynamics', 'cultural_protocols', 'safe_spaces']
        },
        
        participant_observation: {
          purpose: 'Understanding context, culture, and natural behaviors',
          ethics: ['informed_consent', 'privacy_protection', 'cultural_sensitivity']
        },
        
        case_studies: {
          purpose: 'In-depth analysis of specific instances or examples',
          types: ['single_case', 'multiple_case', 'embedded_case']
        },
        
        narrative_methods: {
          approaches: ['storytelling', 'digital_stories', 'photovoice'],
          benefits: ['participant_voice', 'cultural_relevance', 'empowerment']
        }
      },
      
      mixed_methods: {
        sequential_explanatory: {
          sequence: 'Quantitative data collection followed by qualitative exploration',
          purpose: 'Explain or elaborate on quantitative findings'
        },
        
        sequential_exploratory: {
          sequence: 'Qualitative exploration followed by quantitative validation',
          purpose: 'Develop instruments or test theory'
        },
        
        concurrent_triangulation: {
          approach: 'Simultaneous quantitative and qualitative data collection',
          purpose: 'Corroborate findings and provide comprehensive understanding'
        }
      },
      
      innovative_methods: {
        digital_evaluation: {
          tools: ['mobile_apps', 'wearable_sensors', 'social_media_analytics'],
          benefits: ['real_time_data', 'reduced_burden', 'behavioral_insights']
        },
        
        arts_based_evaluation: {
          methods: ['visual_arts', 'performance', 'music', 'poetry'],
          benefits: ['cultural_expression', 'accessibility', 'emotional_connection']
        },
        
        systems_mapping: {
          techniques: ['network_analysis', 'systems_constellation', 'causal_loop_diagrams'],
          purpose: 'Understanding complex relationships and feedback loops'
        }
      }
    };
  }

  initializeCulturalEvaluation() {
    return {
      indigenous_protocols: {
        relationship_building: {
          importance: 'Evaluation relationships must be built over time',
          processes: ['introductions', 'trust_building', 'reciprocity_establishment'],
          ongoing: 'Relationship maintenance throughout evaluation process'
        },
        
        cultural_advisors: {
          role: 'Guide evaluation design and implementation',
          selection: 'Community-nominated cultural advisors',
          compensation: 'Appropriate recognition and compensation for expertise'
        },
        
        data_sovereignty: {
          principle: 'Indigenous peoples have right to control data about them',
          implementation: ['community_ownership', 'access_control', 'use_permissions'],
          storage: 'Culturally appropriate data storage and management'
        },
        
        knowledge_protocols: {
          sacred_knowledge: 'Absolute protection of sacred or restricted knowledge',
          sharing_permissions: 'Clear protocols for knowledge sharing',
          attribution: 'Proper attribution and acknowledgment'
        }
      },
      
      multicultural_considerations: {
        language_accessibility: {
          translation: 'Professional translation services',
          interpretation: 'Cultural interpretation, not just linguistic',
          materials: 'Culturally appropriate evaluation materials'
        },
        
        cultural_concepts: {
          wellbeing_definitions: 'Culture-specific definitions of success and wellbeing',
          measurement_concepts: 'Culturally relevant indicators and measures',
          value_systems: 'Understanding different value systems and priorities'
        },
        
        power_dynamics: {
          historical_context: 'Understanding historical trauma and mistrust',
          evaluation_team: 'Diverse and culturally competent evaluation team',
          community_control: 'Maximum community control over evaluation process'
        }
      },
      
      ethical_frameworks: {
        community_consent: {
          informed: 'Full information about evaluation purpose, methods, and use',
          ongoing: 'Continuous consent throughout evaluation process',
          revocable: 'Right to withdraw participation at any time'
        },
        
        benefit_sharing: {
          evaluation_benefits: 'Evaluation benefits shared with community',
          capacity_building: 'Build evaluation capacity within community',
          knowledge_transfer: 'Transfer evaluation skills and knowledge'
        },
        
        cultural_safety: {
          environment: 'Culturally safe evaluation environment',
          processes: 'Culturally safe evaluation processes',
          outcomes: 'Culturally appropriate use of evaluation findings'
        }
      }
    };
  }

  initializeBenchmarks() {
    return {
      community_outcomes: {
        wellbeing_indicators: {
          individual: {
            mental_health: { baseline: 0.6, good: 0.75, excellent: 0.85 },
            physical_health: { baseline: 0.65, good: 0.78, excellent: 0.88 },
            life_satisfaction: { baseline: 0.62, good: 0.76, excellent: 0.86 },
            sense_of_purpose: { baseline: 0.58, good: 0.72, excellent: 0.84 }
          },
          
          community: {
            social_cohesion: { baseline: 0.55, good: 0.70, excellent: 0.82 },
            civic_engagement: { baseline: 0.45, good: 0.65, excellent: 0.80 },
            cultural_vitality: { baseline: 0.60, good: 0.75, excellent: 0.87 },
            economic_resilience: { baseline: 0.50, good: 0.68, excellent: 0.78 }
          }
        },
        
        program_effectiveness: {
          participation_rates: { low: 0.30, medium: 0.55, high: 0.75 },
          completion_rates: { low: 0.40, medium: 0.65, high: 0.80 },
          satisfaction_scores: { low: 0.60, medium: 0.75, high: 0.88 },
          skill_acquisition: { low: 0.35, medium: 0.58, high: 0.75 }
        }
      },
      
      organizational_impact: {
        capacity_indicators: {
          leadership_development: { baseline: 0.50, target: 0.75, excellent: 0.85 },
          organizational_learning: { baseline: 0.55, target: 0.72, excellent: 0.82 },
          innovation_capacity: { baseline: 0.45, target: 0.68, excellent: 0.78 },
          partnership_quality: { baseline: 0.60, target: 0.75, excellent: 0.85 }
        },
        
        sustainability_metrics: {
          financial_health: { at_risk: 0.40, stable: 0.65, strong: 0.80 },
          community_support: { weak: 0.35, moderate: 0.60, strong: 0.78 },
          adaptive_capacity: { low: 0.30, medium: 0.55, high: 0.75 },
          mission_alignment: { poor: 0.45, good: 0.70, excellent: 0.85 }
        }
      },
      
      systems_change: {
        influence_indicators: {
          policy_engagement: { minimal: 0.20, moderate: 0.50, high: 0.75 },
          public_discourse: { limited: 0.25, moderate: 0.55, significant: 0.80 },
          institutional_change: { none: 0.10, emerging: 0.40, established: 0.70 },
          movement_building: { isolated: 0.15, connected: 0.45, leading: 0.75 }
        }
      }
    };
  }

  async process(query, context) {
    console.log(`📊 Impact Analyst processing: "${query}"`);
    
    try {
      // Determine impact analysis intent
      const intent = await this.analyzeImpactIntent(query, context);
      
      let response = {};
      
      switch (intent.type) {
        case 'measurement':
          response = await this.measureImpact(intent, context);
          break;
        
        case 'evaluation':
          response = await this.conductEvaluation(intent, context);
          break;
        
        case 'sroi':
          response = await this.calculateSROI(intent, context);
          break;
        
        case 'outcomes':
          response = await this.trackOutcomes(intent, context);
          break;
        
        case 'prediction':
          response = await this.predictImpact(intent, context);
          break;
        
        case 'reporting':
          response = await this.generateReports(intent, context);
          break;
        
        default:
          response = await this.comprehensiveImpactAnalysis(context);
      }
      
      // Enhanced response with Impact Analyst intelligence
      const enhancedResponse = {
        pod: this.name,
        timestamp: new Date().toISOString(),
        intent: intent,
        ...response,
        
        impact_summary: await this.generateImpactSummary(response),
        benchmark_analysis: await this.compareToBenchmarks(response),
        recommendations: await this.generateImpactRecommendations(response, context),
        cultural_assessment: await this.assessCulturalAppropri ateness(response),
        alerts: [],
        actions: []
      };
      
      // Generate alerts for significant impact findings
      if (enhancedResponse.impact_summary?.overall_score < 0.5) {
        enhancedResponse.alerts.push({
          type: 'LOW_IMPACT',
          severity: 'HIGH',
          message: 'Overall impact scores below acceptable threshold',
          recommendation: 'Review program design and implementation'
        });
      }
      
      // Generate alerts for cultural appropriateness issues
      if (enhancedResponse.cultural_assessment?.compliance_score < 0.7) {
        enhancedResponse.alerts.push({
          type: 'CULTURAL_CONCERN',
          severity: 'MEDIUM',
          message: 'Cultural appropriateness concerns identified',
          recommendation: 'Engage cultural advisors for evaluation review'
        });
      }
      
      // Store impact intelligence
      await this.storeImpactIntelligence(enhancedResponse);
      
      // Publish to Kafka
      await this.publishImpactIntelligence(enhancedResponse);
      
      // Update impact graph
      await this.updateImpactGraph(enhancedResponse);
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('🚨 Impact Analyst error:', error);
      throw error;
    }
  }

  async measureImpact(intent, context) {
    const measurement = {
      impact_overview: {},
      outcome_measurement: {},
      output_analysis: {},
      stakeholder_value: {},
      longitudinal_trends: {},
      comparative_analysis: {}
    };
    
    try {
      // Get impact data from multiple sources
      const impactData = await this.gatherImpactData(context);
      
      // Generate impact overview
      measurement.impact_overview = await this.createImpactOverview(impactData);
      
      // Measure outcomes across different domains
      measurement.outcome_measurement = await this.measureOutcomes(impactData, context);
      
      // Analyze outputs and deliverables
      measurement.output_analysis = await this.analyzeOutputs(impactData);
      
      // Assess value creation for different stakeholders
      measurement.stakeholder_value = await this.assessStakeholderValue(impactData, context);
      
      // Track longitudinal trends and patterns
      measurement.longitudinal_trends = await this.analyzeLongitudinalTrends(impactData);
      
      // Compare with benchmarks and similar organizations
      measurement.comparative_analysis = await this.performComparativeAnalysis(impactData);
      
      // Use ML models for enhanced analysis if available
      if (this.models.impactPredictor) {
        measurement.ml_insights = await this.applyMLModels(impactData);
      }
      
    } catch (error) {
      console.error('Impact measurement error:', error);
      measurement.error = error.message;
    }
    
    return measurement;
  }

  async calculateSROI(intent, context) {
    const sroi = {
      stakeholder_analysis: {},
      outcome_mapping: {},
      impact_valuation: {},
      sroi_calculation: {},
      sensitivity_analysis: {},
      quality_assurance: {}
    };
    
    try {
      // Step 1: Identify and engage stakeholders
      sroi.stakeholder_analysis = await this.identifyStakeholders(context);
      
      // Step 2: Map outcomes for each stakeholder group
      sroi.outcome_mapping = await this.mapOutcomes(sroi.stakeholder_analysis, context);
      
      // Step 3: Evidence outcomes and assign monetary values
      sroi.impact_valuation = await this.valueOutcomes(sroi.outcome_mapping);
      
      // Step 4: Calculate SROI ratio
      sroi.sroi_calculation = await this.performSROICalculation(sroi.impact_valuation, context);
      
      // Step 5: Sensitivity analysis
      sroi.sensitivity_analysis = await this.conductSensitivityAnalysis(sroi.sroi_calculation);
      
      // Step 6: Quality assurance and validation
      sroi.quality_assurance = await this.validateSROIAnalysis(sroi);
      
      // Generate narrative report
      if (this.openai) {
        sroi.narrative_report = await this.generateSROINarrative(sroi);
      }
      
    } catch (error) {
      console.error('SROI calculation error:', error);
      sroi.error = error.message;
    }
    
    return sroi;
  }

  async trackOutcomes(intent, context) {
    const tracking = {
      outcome_framework: {},
      measurement_plan: {},
      data_collection: {},
      progress_analysis: {},
      achievement_assessment: {},
      continuous_improvement: {}
    };
    
    try {
      // Develop or retrieve outcome framework
      tracking.outcome_framework = await this.developOutcomeFramework(intent, context);
      
      // Create detailed measurement plan
      tracking.measurement_plan = await this.createMeasurementPlan(tracking.outcome_framework);
      
      // Collect outcome data
      tracking.data_collection = await this.collectOutcomeData(tracking.measurement_plan, context);
      
      // Analyze progress toward outcomes
      tracking.progress_analysis = await this.analyzeOutcomeProgress(tracking.data_collection);
      
      // Assess outcome achievement
      tracking.achievement_assessment = await this.assessOutcomeAchievement(
        tracking.progress_analysis,
        tracking.outcome_framework
      );
      
      // Identify improvement opportunities
      tracking.continuous_improvement = await this.identifyImprovementOpportunities(tracking);
      
    } catch (error) {
      console.error('Outcome tracking error:', error);
      tracking.error = error.message;
    }
    
    return tracking;
  }

  async predictImpact(intent, context) {
    const prediction = {
      predictive_models: {},
      scenario_analysis: {},
      risk_assessment: {},
      optimization_suggestions: {},
      confidence_intervals: {}
    };
    
    try {
      // Historical data analysis
      const historicalData = await this.gatherHistoricalImpactData(context);
      
      // Apply predictive models
      if (this.models.impactPredictor) {
        prediction.predictive_models = await this.applyPredictiveModels(historicalData, intent);
      }
      
      // Scenario analysis
      prediction.scenario_analysis = await this.conductScenarioAnalysis(historicalData, context);
      
      // Risk assessment
      prediction.risk_assessment = await this.assessImpactRisks(prediction.scenario_analysis);
      
      // Generate optimization suggestions
      prediction.optimization_suggestions = await this.generateOptimizationSuggestions(
        prediction.predictive_models,
        prediction.scenario_analysis
      );
      
      // Calculate confidence intervals
      prediction.confidence_intervals = await this.calculateConfidenceIntervals(prediction);
      
    } catch (error) {
      console.error('Impact prediction error:', error);
      prediction.error = error.message;
    }
    
    return prediction;
  }

  async generateImpactSummary(analysisResponse) {
    const summary = {
      overall_score: 0,
      key_achievements: [],
      areas_for_improvement: [],
      stakeholder_satisfaction: 0,
      sustainability_outlook: 'unknown',
      impact_trends: {}
    };
    
    try {
      // Calculate overall impact score
      const scores = [];
      if (analysisResponse.outcome_measurement?.overall_score) {
        scores.push(analysisResponse.outcome_measurement.overall_score);
      }
      if (analysisResponse.stakeholder_value?.average_satisfaction) {
        scores.push(analysisResponse.stakeholder_value.average_satisfaction);
      }
      if (analysisResponse.sroi_calculation?.sroi_ratio) {
        // Normalize SROI ratio to 0-1 scale
        scores.push(Math.min(analysisResponse.sroi_calculation.sroi_ratio / 5, 1));
      }
      
      summary.overall_score = scores.length > 0 ? 
        scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      
      // Extract key achievements
      if (analysisResponse.impact_overview?.significant_outcomes) {
        summary.key_achievements = analysisResponse.impact_overview.significant_outcomes
          .slice(0, 5)
          .map(outcome => ({
            outcome: outcome.description,
            value: outcome.value_created,
            stakeholders_affected: outcome.stakeholders_affected
          }));
      }
      
      // Identify improvement areas
      if (analysisResponse.benchmark_analysis?.below_benchmark) {
        summary.areas_for_improvement = analysisResponse.benchmark_analysis.below_benchmark
          .slice(0, 5)
          .map(area => ({
            area: area.indicator,
            current_score: area.current_score,
            benchmark: area.benchmark_score,
            gap: area.benchmark_score - area.current_score
          }));
      }
      
      // Assess sustainability outlook
      if (analysisResponse.longitudinal_trends?.trend_direction) {
        const trends = analysisResponse.longitudinal_trends.trend_direction;
        const positiveCount = Object.values(trends).filter(t => t === 'improving').length;
        const totalCount = Object.keys(trends).length;
        
        if (positiveCount / totalCount >= 0.7) {
          summary.sustainability_outlook = 'strong';
        } else if (positiveCount / totalCount >= 0.5) {
          summary.sustainability_outlook = 'moderate';
        } else {
          summary.sustainability_outlook = 'concerning';
        }
      }
      
    } catch (error) {
      console.error('Impact summary generation error:', error);
    }
    
    return summary;
  }

  async compareToBenchmarks(analysisResponse) {
    const comparison = {
      overall_performance: 'unknown',
      above_benchmark: [],
      at_benchmark: [],
      below_benchmark: [],
      peer_ranking: null,
      improvement_potential: {}
    };
    
    try {
      // Compare to established benchmarks
      for (const [category, benchmarks] of Object.entries(this.benchmarks)) {
        if (analysisResponse[category]) {
          const categoryResults = await this.compareCategoryToBenchmarks(
            analysisResponse[category], 
            benchmarks
          );
          
          comparison.above_benchmark.push(...categoryResults.above);
          comparison.at_benchmark.push(...categoryResults.at);
          comparison.below_benchmark.push(...categoryResults.below);
        }
      }
      
      // Calculate overall performance rating
      const totalIndicators = comparison.above_benchmark.length + 
                            comparison.at_benchmark.length + 
                            comparison.below_benchmark.length;
      
      if (totalIndicators > 0) {
        const aboveRatio = comparison.above_benchmark.length / totalIndicators;
        const atRatio = comparison.at_benchmark.length / totalIndicators;
        
        if (aboveRatio >= 0.6) {
          comparison.overall_performance = 'excellent';
        } else if (aboveRatio + atRatio >= 0.7) {
          comparison.overall_performance = 'good';
        } else if (aboveRatio + atRatio >= 0.5) {
          comparison.overall_performance = 'fair';
        } else {
          comparison.overall_performance = 'needs_improvement';
        }
      }
      
      // Calculate improvement potential
      comparison.improvement_potential = this.calculateImprovementPotential(
        comparison.below_benchmark
      );
      
    } catch (error) {
      console.error('Benchmark comparison error:', error);
    }
    
    return comparison;
  }

  async generateImpactRecommendations(analysisResponse, context) {
    const recommendations = [];
    
    try {
      // Performance improvement recommendations
      if (analysisResponse.impact_summary?.overall_score < 0.6) {
        recommendations.push({
          priority: 'HIGH',
          category: 'performance',
          action: 'Strengthen program implementation and outcomes',
          rationale: `Current impact score of ${(analysisResponse.impact_summary.overall_score * 100).toFixed(0)}% indicates significant improvement potential`,
          specific_steps: [
            'Review program logic and theory of change',
            'Enhance stakeholder engagement and feedback mechanisms',
            'Improve data collection and monitoring systems',
            'Invest in staff capacity and program resources'
          ],
          timeline: '3-6 months',
          expected_impact: '20-30% improvement in overall impact scores'
        });
      }
      
      // Measurement system recommendations
      if (analysisResponse.data_quality?.completeness < 0.7) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'measurement',
          action: 'Enhance impact measurement and evaluation systems',
          rationale: 'Incomplete data limits ability to demonstrate and improve impact',
          specific_steps: [
            'Implement systematic data collection protocols',
            'Train staff in evaluation methods and tools',
            'Establish regular reporting and analysis cycles',
            'Engage external evaluation expertise where needed'
          ],
          timeline: '2-4 months',
          expected_impact: 'Improved evidence base for decision-making and reporting'
        });
      }
      
      // Stakeholder engagement recommendations
      if (analysisResponse.stakeholder_value?.average_satisfaction < 0.7) {
        recommendations.push({
          priority: 'HIGH',
          category: 'stakeholder_engagement',
          action: 'Strengthen stakeholder engagement and satisfaction',
          rationale: 'Low stakeholder satisfaction threatens program sustainability and impact',
          specific_steps: [
            'Conduct stakeholder feedback sessions',
            'Implement participatory program design processes',
            'Establish regular communication and update mechanisms',
            'Create stakeholder advisory groups'
          ],
          timeline: '1-3 months',
          expected_impact: 'Increased stakeholder buy-in and program effectiveness'
        });
      }
      
      // Sustainability recommendations
      if (analysisResponse.impact_summary?.sustainability_outlook === 'concerning') {
        recommendations.push({
          priority: 'STRATEGIC',
          category: 'sustainability',
          action: 'Develop long-term sustainability strategy',
          rationale: 'Current trends suggest sustainability concerns',
          specific_steps: [
            'Diversify funding sources and revenue streams',
            'Build community ownership and local capacity',
            'Develop partnership and collaboration strategies',
            'Create systems for knowledge transfer and continuity'
          ],
          timeline: '6-12 months',
          expected_impact: 'Enhanced long-term program viability and impact'
        });
      }
      
      // Innovation and improvement recommendations
      if (analysisResponse.comparative_analysis?.peer_ranking === 'below_average') {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'innovation',
          action: 'Explore innovative approaches and best practices',
          rationale: 'Performance below peer organizations suggests opportunity for innovation',
          specific_steps: [
            'Research and visit high-performing peer organizations',
            'Pilot innovative program approaches and methods',
            'Engage in communities of practice and learning networks',
            'Invest in technology and digital solutions'
          ],
          timeline: '3-9 months',
          expected_impact: 'Improved program effectiveness and innovation capacity'
        });
      }
      
      // AI-generated recommendations if available
      if (this.openai && analysisResponse) {
        const aiRecommendations = await this.generateAIImpactRecommendations(analysisResponse, context);
        if (aiRecommendations && aiRecommendations.length > 0) {
          recommendations.push(...aiRecommendations);
        }
      }
      
    } catch (error) {
      console.error('Impact recommendations generation error:', error);
    }
    
    return recommendations;
  }

  // Helper methods
  async analyzeImpactIntent(query, context) {
    const intent = {
      type: 'general',
      focus_areas: [],
      timeframe: 'current',
      stakeholder_groups: [],
      evaluation_type: 'formative'
    };
    
    const queryLower = query.toLowerCase();
    
    // Detect intent type
    if (queryLower.includes('measure') || queryLower.includes('assessment')) {
      intent.type = 'measurement';
    } else if (queryLower.includes('evaluate') || queryLower.includes('evaluation')) {
      intent.type = 'evaluation';
    } else if (queryLower.includes('sroi') || queryLower.includes('social return')) {
      intent.type = 'sroi';
    } else if (queryLower.includes('outcome') || queryLower.includes('result')) {
      intent.type = 'outcomes';
    } else if (queryLower.includes('predict') || queryLower.includes('forecast')) {
      intent.type = 'prediction';
    } else if (queryLower.includes('report') || queryLower.includes('summary')) {
      intent.type = 'reporting';
    }
    
    // Extract focus areas
    const focusKeywords = {
      community: ['community', 'local', 'grassroots', 'neighborhood'],
      individual: ['individual', 'person', 'participant', 'beneficiary'],
      organizational: ['organization', 'institutional', 'systems', 'capacity'],
      social: ['social', 'society', 'collective', 'public'],
      economic: ['economic', 'financial', 'cost', 'value'],
      environmental: ['environment', 'sustainability', 'climate', 'green']
    };
    
    for (const [area, keywords] of Object.entries(focusKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        intent.focus_areas.push(area);
      }
    }
    
    // Determine timeframe
    if (queryLower.includes('long') || queryLower.includes('longitudinal')) {
      intent.timeframe = 'longitudinal';
    } else if (queryLower.includes('historical') || queryLower.includes('past')) {
      intent.timeframe = 'historical';
    } else if (queryLower.includes('future') || queryLower.includes('projected')) {
      intent.timeframe = 'future';
    }
    
    return intent;
  }

  async storeImpactIntelligence(intelligence) {
    const key = `impact:intelligence:${Date.now()}`;
    await this.redis.setex(key, 14 * 24 * 60 * 60, JSON.stringify(intelligence)); // 14 days
    
    // Add to timeline index
    await this.redis.zadd('impact:intelligence:timeline', Date.now(), key);
  }

  async publishImpactIntelligence(intelligence) {
    try {
      await this.producer.send({
        topic: 'act.impact.intelligence',
        messages: [{
          key: `impact_intelligence_${Date.now()}`,
          value: JSON.stringify(intelligence)
        }]
      });
    } catch (error) {
      console.error('Failed to publish impact intelligence:', error);
    }
  }

  async updateImpactGraph(intelligence) {
    const session = this.neo4j.session();
    
    try {
      // Create impact analysis nodes and relationships
      await session.run(`
        CREATE (ia:ImpactAnalysis {
          id: $id,
          timestamp: datetime($timestamp),
          overall_score: $overallScore,
          stakeholder_satisfaction: $stakeholderSatisfaction,
          sustainability_outlook: $sustainabilityOutlook
        })
      `, {
        id: `impact_analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        overallScore: intelligence.impact_summary?.overall_score || 0,
        stakeholderSatisfaction: intelligence.impact_summary?.stakeholder_satisfaction || 0,
        sustainabilityOutlook: intelligence.impact_summary?.sustainability_outlook || 'unknown'
      });
      
    } catch (error) {
      console.error('Failed to update impact graph:', error);
    } finally {
      await session.close();
    }
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    console.log('📊 Impact Analyst connected to Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.redis.quit();
    await this.neo4j.close();
    console.log('📊 Impact Analyst disconnected');
  }

  async healthCheck() {
    return {
      name: this.name,
      status: 'healthy',
      supabase_connected: Boolean(this.supabase),
      openai_configured: Boolean(this.openai),
      frameworks_loaded: {
        impact_frameworks: Object.keys(this.impactFrameworks).length,
        evaluation_methods: Object.keys(this.evaluationMethods).length,
        cultural_evaluation: Object.keys(this.culturalEvaluation).length
      },
      models_loaded: {
        impact_predictor: Boolean(this.models.impactPredictor),
        outcome_analyzer: Boolean(this.models.outcomeAnalyzer),
        troi_calculator: Boolean(this.models.troiCalculator),
        community_value_model: Boolean(this.models.communityValueModel)
      },
      benchmarks_loaded: Object.keys(this.benchmarks).length,
      cached_analyses: this.impactCache.size
    };
  }

  // Additional helper methods would include:
  // - conductEvaluation()
  // - generateReports()
  // - comprehensiveImpactAnalysis()
  // - gatherImpactData()
  // - createImpactOverview()
  // - measureOutcomes()
  // - analyzeOutputs()
  // - assessStakeholderValue()
  // - analyzeLongitudinalTrends()
  // - performComparativeAnalysis()
  // - applyMLModels()
  // - identifyStakeholders()
  // - mapOutcomes()
  // - valueOutcomes()
  // - performSROICalculation()
  // - conductSensitivityAnalysis()
  // - validateSROIAnalysis()
  // - generateSROINarrative()
  // - developOutcomeFramework()
  // - createMeasurementPlan()
  // - collectOutcomeData()
  // - analyzeOutcomeProgress()
  // - assessOutcomeAchievement()
  // - identifyImprovementOpportunities()
  // - gatherHistoricalImpactData()
  // - applyPredictiveModels()
  // - conductScenarioAnalysis()
  // - assessImpactRisks()
  // - generateOptimizationSuggestions()
  // - calculateConfidenceIntervals()
  // - assessCulturalAppropriateness()
  // - compareCategoryToBenchmarks()
  // - calculateImprovementPotential()
  // - generateAIImpactRecommendations()
}

export default ImpactAnalyst;