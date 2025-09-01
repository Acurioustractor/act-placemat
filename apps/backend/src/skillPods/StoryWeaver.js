/**
 * Story Weaver Skill Pod - World-Class Narrative Intelligence Engine
 * 
 * Philosophy: "Stories are the architecture of change" - Weaving narratives that heal
 * 
 * This sophisticated weaver provides:
 * - Cultural protocol-aware story collection and curation
 * - AI-powered narrative analysis and theme extraction
 * - Community consent management and sovereignty protection
 * - Multi-modal storytelling across digital platforms
 * - Impact measurement through story engagement analytics
 * - Trauma-informed story handling and ethical publishing
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import OpenAI from 'openai';
import neo4j from 'neo4j-driver';
import * as tf from '@tensorflow/tfjs-node';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

class StoryWeaver {
  constructor(agent) {
    this.agent = agent;
    this.name = 'Story Weaver';
    
    // Initialize connections
    this.kafka = new Kafka({
      clientId: 'act-story-weaver',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'story-weaver-group' });
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Supabase for story storage
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Neo4j for story relationship mapping
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    // OpenAI for narrative intelligence
    this.openai = null;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Story classification models
    this.models = {
      themeExtractor: null,
      sentimentAnalyzer: null,
      culturalSensitivityDetector: null,
      impactPredictor: null
    };
    
    // Cultural protocols for storytelling
    this.culturalProtocols = this.initializeCulturalProtocols();
    
    // Story categorization system
    this.storyCategories = this.initializeStoryCategories();
    
    // Consent and privacy framework
    this.consentFramework = this.initializeConsentFramework();
    
    // Story analytics and metrics
    this.analyticsFramework = this.initializeAnalyticsFramework();
    
    // Storytelling platforms integration
    this.platforms = this.initializePlatformIntegrations();
    
    console.log('📖 Story Weaver initialized - Crafting narratives that change the world');
  }

  initializeCulturalProtocols() {
    return {
      indigenous: {
        acknowledgement: {
          required: true,
          template: 'We acknowledge that this story was shared on the traditional lands of [Traditional Owners] and honor their continuing connection to country.',
          verification_required: true
        },
        
        sovereignty: {
          principle: 'Stories belong to storytellers and communities',
          requirements: [
            'Explicit consent for collection, use, and sharing',
            'Community ownership recognition',
            'Right to withdraw consent at any time',
            'Cultural protocol adherence'
          ]
        },
        
        sacred_knowledge: {
          protection: 'Absolute protection of sacred, ceremonial, or restricted cultural content',
          detection_keywords: [
            'ceremony', 'sacred', 'secret', 'initiated',
            'men\\'s business', 'women\\'s business', 'sorry business',
            'dreaming', 'songline', 'traditional law'
          ],
          action: 'immediate_flag_and_review'
        },
        
        attribution: {
          mandatory_fields: ['storyteller_name', 'community_affiliation', 'country_connection'],
          optional_fields: ['family_permission', 'elder_endorsement'],
          anonymity_respect: true
        }
      },
      
      trauma_informed: {
        recognition: {
          trauma_indicators: [
            'abuse', 'violence', 'suicide', 'self_harm',
            'addiction', 'removal', 'discrimination',
            'loss', 'grief', 'family_separation'
          ],
          response: 'enhanced_care_and_support'
        },
        
        safety: {
          content_warnings: 'Required for potentially triggering content',
          storyteller_support: 'Ongoing support and check-ins',
          community_care: 'Consider broader community impact'
        },
        
        healing_focus: {
          approach: 'Stories as healing tools, not exploitation',
          empowerment: 'Center storyteller agency and healing journey',
          collective_healing: 'Consider community healing potential'
        }
      },
      
      youth_protection: {
        under_18: {
          guardian_consent: 'Required for all youth stories',
          identity_protection: 'Enhanced privacy protections',
          platform_restrictions: 'Age-appropriate platform sharing only'
        },
        
        vulnerable_youth: {
          additional_protections: [
            'Social worker approval',
            'Therapeutic review',
            'Long-term safety consideration'
          ]
        }
      },
      
      privacy: {
        default_private: 'All stories private by default',
        explicit_consent: 'Required for any public sharing',
        granular_permissions: 'Platform-specific sharing permissions',
        right_to_deletion: 'Stories can be removed at any time'
      }
    };
  }

  initializeStoryCategories() {
    return {
      impact_themes: {
        healing: {
          keywords: ['healing', 'recovery', 'transformation', 'growth', 'resilience'],
          color_scheme: '#4CAF50',
          icon: '🌱'
        },
        
        justice: {
          keywords: ['justice', 'rights', 'fairness', 'equality', 'advocacy'],
          color_scheme: '#F44336',
          icon: '⚖️'
        },
        
        connection: {
          keywords: ['community', 'family', 'belonging', 'culture', 'identity'],
          color_scheme: '#2196F3',
          icon: '🤝'
        },
        
        empowerment: {
          keywords: ['empowerment', 'strength', 'leadership', 'voice', 'agency'],
          color_scheme: '#FF9800',
          icon: '💪'
        },
        
        hope: {
          keywords: ['hope', 'future', 'possibility', 'dreams', 'aspiration'],
          color_scheme: '#9C27B0',
          icon: '⭐'
        }
      },
      
      story_types: {
        personal_journey: {
          description: 'Individual transformation and growth stories',
          typical_length: 'medium',
          sharing_level: 'high_consent_required'
        },
        
        community_impact: {
          description: 'Stories of community programs and collective change',
          typical_length: 'long',
          sharing_level: 'community_consent_required'
        },
        
        cultural_preservation: {
          description: 'Stories preserving and sharing cultural knowledge',
          typical_length: 'variable',
          sharing_level: 'elder_review_required'
        },
        
        system_change: {
          description: 'Stories of challenging and changing systems',
          typical_length: 'long',
          sharing_level: 'strategic_sharing'
        },
        
        celebration: {
          description: 'Stories of achievement, milestones, and joy',
          typical_length: 'short',
          sharing_level: 'easier_sharing'
        }
      },
      
      media_formats: {
        written: {
          formats: ['article', 'blog_post', 'report', 'social_post'],
          ai_assistance: 'editing_and_enhancement',
          accessibility: 'text_to_speech_compatible'
        },
        
        audio: {
          formats: ['podcast', 'interview', 'story_circle', 'oral_history'],
          ai_assistance: 'transcription_and_analysis',
          accessibility: 'hearing_impaired_transcripts'
        },
        
        visual: {
          formats: ['photo_essay', 'infographic', 'social_media', 'presentation'],
          ai_assistance: 'design_suggestions',
          accessibility: 'alt_text_generation'
        },
        
        video: {
          formats: ['documentary', 'testimonial', 'story_shorts', 'presentation'],
          ai_assistance: 'editing_and_captions',
          accessibility: 'captions_and_audio_description'
        },
        
        interactive: {
          formats: ['digital_story', 'web_experience', 'AR_story', 'VR_experience'],
          ai_assistance: 'experience_design',
          accessibility: 'multi_modal_access'
        }
      }
    };
  }

  initializeConsentFramework() {
    return {
      collection_consent: {
        informed: {
          information_provided: [
            'Purpose of collection',
            'How story will be used',
            'Who will have access',
            'Sharing platforms and reach',
            'Rights and protections'
          ],
          language_accessible: true,
          cultural_appropriate: true
        },
        
        ongoing: {
          check_in_schedule: 'quarterly',
          consent_renewal: 'annual',
          easy_withdrawal: 'one_click_removal'
        },
        
        revocable: {
          immediate_effect: 'Story removed within 24 hours',
          platform_notification: 'All platforms notified immediately',
          data_deletion: 'Complete removal from all systems'
        }
      },
      
      sharing_consent: {
        platform_specific: {
          internal_use: 'Use within ACT systems only',
          website: 'Public website sharing',
          social_media: 'Social media platform sharing',
          media_interviews: 'Journalist and media access',
          academic_research: 'Research and analysis use',
          government_reports: 'Policy and government submissions'
        },
        
        audience_specific: {
          community_only: 'Community members only',
          stakeholder_access: 'Funders and partners',
          public_sharing: 'General public access',
          media_sharing: 'Media and journalist access'
        },
        
        duration_limits: {
          temporary: 'Time-limited sharing (specify period)',
          campaign_specific: 'Specific campaign or initiative only',
          permanent: 'Ongoing sharing permission'
        }
      },
      
      protection_levels: {
        minimal_protection: {
          anonymization: false,
          location_sharing: true,
          full_attribution: true,
          photo_sharing: true
        },
        
        standard_protection: {
          anonymization: 'first_name_only',
          location_sharing: 'general_area_only',
          full_attribution: 'storyteller_choice',
          photo_sharing: 'with_consent'
        },
        
        enhanced_protection: {
          anonymization: 'pseudonym_only',
          location_sharing: 'state_level_only',
          full_attribution: false,
          photo_sharing: 'heavily_modified_or_none'
        },
        
        maximum_protection: {
          anonymization: 'complete_anonymity',
          location_sharing: false,
          full_attribution: false,
          photo_sharing: false
        }
      }
    };
  }

  initializeAnalyticsFramework() {
    return {
      story_engagement: {
        metrics: ['views', 'reads', 'shares', 'comments', 'reactions'],
        platforms: ['website', 'social_media', 'email', 'presentations'],
        demographic_analysis: 'aggregate_only_for_privacy'
      },
      
      impact_measurement: {
        direct_impact: [
          'policy_changes_influenced',
          'funding_secured_through_stories',
          'partnerships_formed',
          'media_coverage_generated'
        ],
        
        community_impact: [
          'storyteller_empowerment',
          'community_healing_conversations',
          'cultural_knowledge_preserved',
          'connection_building'
        ],
        
        system_impact: [
          'awareness_raising',
          'attitude_changes',
          'behavior_modifications',
          'systemic_policy_shifts'
        ]
      },
      
      storyteller_journey: {
        empowerment_indicators: [
          'increased_confidence',
          'leadership_development',
          'skill_building',
          'network_expansion'
        ],
        
        wellbeing_factors: [
          'healing_progress',
          'community_connection',
          'sense_of_purpose',
          'agency_development'
        ]
      }
    };
  }

  initializePlatformIntegrations() {
    return {
      website: {
        cms: 'supabase_cms',
        features: ['story_pages', 'search', 'filtering', 'multimedia'],
        accessibility: 'wcag_aa_compliant'
      },
      
      social_media: {
        platforms: ['facebook', 'instagram', 'linkedin', 'twitter'],
        auto_posting: 'with_approval',
        format_optimization: 'platform_specific'
      },
      
      email: {
        newsletter: 'story_highlights',
        storyteller_updates: 'journey_sharing',
        stakeholder_reports: 'impact_summaries'
      },
      
      presentations: {
        formats: ['slides', 'infographics', 'video_summaries'],
        consent_tracking: 'presentation_specific',
        audience_reporting: 'aggregate_feedback'
      },
      
      media: {
        press_kits: 'media_ready_story_packages',
        interview_facilitation: 'storyteller_support',
        attribution_tracking: 'media_mention_monitoring'
      }
    };
  }

  async process(query, context) {
    console.log(`📖 Story Weaver processing: "${query}"`);
    
    try {
      // Determine story operation intent
      const intent = await this.analyzeStoryIntent(query, context);
      
      let response = {};
      
      switch (intent.type) {
        case 'collection':
          response = await this.handleStoryCollection(intent, context);
          break;
        
        case 'analysis':
          response = await this.analyzeStories(intent, context);
          break;
        
        case 'curation':
          response = await this.curateStories(intent, context);
          break;
        
        case 'sharing':
          response = await this.manageStorySharing(intent, context);
          break;
        
        case 'impact':
          response = await this.measureStoryImpact(intent, context);
          break;
        
        case 'consent':
          response = await this.manageConsent(intent, context);
          break;
        
        default:
          response = await this.comprehensiveStoryAnalysis(context);
      }
      
      // Enhanced response with Story Weaver intelligence
      const enhancedResponse = {
        pod: this.name,
        timestamp: new Date().toISOString(),
        intent: intent,
        ...response,
        
        cultural_compliance: await this.checkCulturalCompliance(response),
        consent_status: await this.verifyConsentStatus(response),
        recommendations: await this.generateStoryRecommendations(response, context),
        alerts: [],
        actions: []
      };
      
      // Generate alerts for consent issues
      if (enhancedResponse.consent_status?.violations?.length > 0) {
        enhancedResponse.alerts.push({
          type: 'CONSENT_VIOLATION',
          severity: 'CRITICAL',
          message: 'Consent protocol violations detected',
          details: enhancedResponse.consent_status.violations
        });
      }
      
      // Generate alerts for cultural sensitivity
      if (enhancedResponse.cultural_compliance?.risk_level === 'HIGH') {
        enhancedResponse.alerts.push({
          type: 'CULTURAL_SENSITIVITY',
          severity: 'HIGH',
          message: 'Cultural sensitivity review required',
          details: enhancedResponse.cultural_compliance.concerns
        });
      }
      
      // Store story intelligence
      await this.storeStoryIntelligence(enhancedResponse);
      
      // Publish to Kafka
      await this.publishStoryIntelligence(enhancedResponse);
      
      // Update story network graph
      await this.updateStoryGraph(enhancedResponse);
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('🚨 Story Weaver error:', error);
      throw error;
    }
  }

  async analyzeStories(intent, context) {
    const analysis = {
      story_collection: {},
      theme_analysis: {},
      sentiment_analysis: {},
      cultural_analysis: {},
      impact_potential: {},
      recommendations: []
    };
    
    try {
      // Retrieve stories from database
      const { data: stories, error } = await this.supabase
        .from('stories')
        .select('*')
        .limit(100); // Analyze recent 100 stories
      
      if (error) throw error;
      
      if (!stories || stories.length === 0) {
        return {
          message: 'No stories found for analysis',
          suggestion: 'Begin story collection to enable analysis'
        };
      }
      
      analysis.story_collection = {
        total_stories: stories.length,
        active_storytellers: new Set(stories.map(s => s.storyteller_id)).size,
        recent_stories: stories.filter(s => 
          new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        consent_status: {
          fully_consented: stories.filter(s => s.consent_status === 'active').length,
          pending: stories.filter(s => s.consent_status === 'pending').length,
          withdrawn: stories.filter(s => s.consent_status === 'withdrawn').length
        }
      };
      
      // Theme extraction using ML and AI
      analysis.theme_analysis = await this.extractThemes(stories);
      
      // Sentiment analysis
      analysis.sentiment_analysis = await this.analyzeSentiment(stories);
      
      // Cultural analysis
      analysis.cultural_analysis = await this.analyzeCulturalElements(stories);
      
      // Impact potential assessment
      analysis.impact_potential = await this.assessImpactPotential(stories);
      
      // Generate recommendations
      analysis.recommendations = await this.generateAnalysisRecommendations(analysis);
      
    } catch (error) {
      console.error('Story analysis error:', error);
      analysis.error = error.message;
    }
    
    return analysis;
  }

  async extractThemes(stories) {
    const themes = {
      dominant_themes: [],
      emerging_themes: [],
      theme_evolution: {},
      cross_story_patterns: []
    };
    
    try {
      // Use AI for theme extraction if available
      if (this.openai) {
        const combinedNarratives = stories
          .slice(0, 20) // Analyze top 20 stories
          .map(s => s.content)
          .join('\n\n---\n\n');
        
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are analyzing community stories for themes. Focus on:\n- Healing and resilience themes\n- Justice and advocacy themes\n- Community connection themes\n- Cultural preservation themes\n- Empowerment and growth themes\n\nBe respectful and culturally sensitive. Extract meaningful themes, not just keywords.`
            },
            {
              role: 'user',
              content: `Analyze these community stories and extract the dominant themes:\n\n${combinedNarratives}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });
        
        const aiThemes = JSON.parse(completion.choices[0].message.content);
        themes.ai_extracted_themes = aiThemes;
      }
      
      // Rule-based theme extraction as fallback
      const keywordThemes = {};
      for (const [themeName, themeConfig] of Object.entries(this.storyCategories.impact_themes)) {
        keywordThemes[themeName] = 0;
        
        for (const story of stories) {
          const content = (story.content || '').toLowerCase();
          for (const keyword of themeConfig.keywords) {
            if (content.includes(keyword)) {
              keywordThemes[themeName]++;
              break; // Count once per story
            }
          }
        }
      }
      
      // Sort themes by frequency
      themes.dominant_themes = Object.entries(keywordThemes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme, count]) => ({
          theme,
          frequency: count,
          percentage: (count / stories.length * 100).toFixed(1)
        }));
      
      // Identify cross-story patterns
      themes.cross_story_patterns = await this.identifyStoryPatterns(stories);
      
    } catch (error) {
      console.error('Theme extraction error:', error);
    }
    
    return themes;
  }

  async analyzeSentiment(stories) {
    const sentiment = {
      overall_sentiment: 0,
      sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
      emotional_journey: [],
      healing_indicators: []
    };
    
    try {
      let totalSentiment = 0;
      const sentimentScores = [];
      
      for (const story of stories) {
        if (!story.content) continue;
        
        // Simple sentiment analysis (can be enhanced with ML models)
        const storysentiment = this.calculateBasicSentiment(story.content);
        sentimentScores.push(storysentiment);
        totalSentiment += storysentiment;
        
        if (storysentiment > 0.3) sentiment.sentiment_distribution.positive++;
        else if (storysentiment < -0.3) sentiment.sentiment_distribution.negative++;
        else sentiment.sentiment_distribution.neutral++;
      }
      
      sentiment.overall_sentiment = stories.length > 0 ? totalSentiment / stories.length : 0;
      
      // Identify healing indicators
      sentiment.healing_indicators = this.identifyHealingIndicators(stories);
      
      // Track emotional journey over time
      sentiment.emotional_journey = this.trackEmotionalJourney(stories, sentimentScores);
      
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
    
    return sentiment;
  }

  async analyzeCulturalElements(stories) {
    const cultural = {
      indigenous_stories: 0,
      cultural_themes: [],
      language_diversity: {},
      cultural_protocols_met: 0,
      cultural_sensitivity_score: 0
    };
    
    try {
      for (const story of stories) {
        // Check for Indigenous elements
        if (this.detectIndigenousContent(story.content || '')) {
          cultural.indigenous_stories++;
        }
        
        // Check cultural protocol compliance
        if (story.cultural_protocols_acknowledged === true) {
          cultural.cultural_protocols_met++;
        }
        
        // Language detection (placeholder - could use actual language detection)
        const detectedLang = this.detectLanguageElements(story.content || '');
        if (detectedLang) {
          cultural.language_diversity[detectedLang] = (cultural.language_diversity[detectedLang] || 0) + 1;
        }
      }
      
      // Calculate cultural sensitivity score
      cultural.cultural_sensitivity_score = stories.length > 0 
        ? cultural.cultural_protocols_met / stories.length 
        : 0;
      
    } catch (error) {
      console.error('Cultural analysis error:', error);
    }
    
    return cultural;
  }

  async assessImpactPotential(stories) {
    const impact = {
      high_impact_stories: [],
      viral_potential: [],
      policy_influence_stories: [],
      community_healing_stories: [],
      media_ready_stories: []
    };
    
    try {
      for (const story of stories) {
        const storyImpact = await this.calculateStoryImpact(story);
        
        if (storyImpact.overall_score > 0.8) {
          impact.high_impact_stories.push({
            id: story.id,
            title: story.title,
            impact_score: storyImpact.overall_score,
            impact_types: storyImpact.impact_types
          });
        }
        
        if (storyImpact.viral_potential > 0.7) {
          impact.viral_potential.push({
            id: story.id,
            title: story.title,
            viral_score: storyImpact.viral_potential
          });
        }
        
        if (storyImpact.policy_relevance > 0.6) {
          impact.policy_influence_stories.push({
            id: story.id,
            title: story.title,
            policy_areas: storyImpact.policy_areas
          });
        }
        
        if (storyImpact.healing_potential > 0.7) {
          impact.community_healing_stories.push({
            id: story.id,
            title: story.title,
            healing_aspects: storyImpact.healing_aspects
          });
        }
        
        if (storyImpact.media_readiness > 0.75) {
          impact.media_ready_stories.push({
            id: story.id,
            title: story.title,
            media_formats: storyImpact.suitable_formats
          });
        }
      }
      
      // Sort by impact scores
      impact.high_impact_stories.sort((a, b) => b.impact_score - a.impact_score);
      impact.viral_potential.sort((a, b) => b.viral_score - a.viral_score);
      
    } catch (error) {
      console.error('Impact assessment error:', error);
    }
    
    return impact;
  }

  async manageStorySharing(intent, context) {
    const sharing = {
      sharing_strategy: {},
      platform_optimization: {},
      consent_verification: {},
      scheduled_publications: [],
      performance_tracking: {}
    };
    
    try {
      // Get stories ready for sharing
      const { data: readyStories } = await this.supabase
        .from('stories')
        .select('*')
        .eq('consent_status', 'active')
        .eq('publication_ready', true);
      
      if (readyStories && readyStories.length > 0) {
        // Develop sharing strategy for each story
        for (const story of readyStories.slice(0, 10)) {
          const strategy = await this.developSharingStrategy(story);
          sharing.sharing_strategy[story.id] = strategy;
        }
        
        // Optimize content for different platforms
        sharing.platform_optimization = await this.optimizeForPlatforms(readyStories);
        
        // Verify consent for sharing
        sharing.consent_verification = await this.verifyConsentForSharing(readyStories);
        
        // Create publication schedule
        sharing.scheduled_publications = await this.createPublicationSchedule(readyStories);
        
        // Set up performance tracking
        sharing.performance_tracking = this.setupPerformanceTracking(readyStories);
      }
      
    } catch (error) {
      console.error('Story sharing management error:', error);
      sharing.error = error.message;
    }
    
    return sharing;
  }

  async measureStoryImpact(intent, context) {
    const impact = {
      engagement_metrics: {},
      community_impact: {},
      policy_influence: {},
      media_coverage: {},
      storyteller_outcomes: {},
      longitudinal_analysis: {}
    };
    
    try {
      // Get published stories with engagement data
      const { data: publishedStories } = await this.supabase
        .from('stories')
        .select('*, story_analytics(*)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      
      if (publishedStories && publishedStories.length > 0) {
        // Analyze engagement metrics
        impact.engagement_metrics = this.analyzeEngagementMetrics(publishedStories);
        
        // Measure community impact
        impact.community_impact = await this.measureCommunityImpact(publishedStories);
        
        // Track policy influence
        impact.policy_influence = await this.trackPolicyInfluence(publishedStories);
        
        // Monitor media coverage
        impact.media_coverage = await this.monitorMediaCoverage(publishedStories);
        
        // Assess storyteller outcomes
        impact.storyteller_outcomes = await this.assessStorytellerOutcomes(publishedStories);
        
        // Longitudinal impact analysis
        impact.longitudinal_analysis = await this.performLongitudinalAnalysis(publishedStories);
      }
      
    } catch (error) {
      console.error('Impact measurement error:', error);
      impact.error = error.message;
    }
    
    return impact;
  }

  // Helper methods
  calculateBasicSentiment(text) {
    const positiveWords = [
      'healing', 'hope', 'joy', 'success', 'growth', 'connection',
      'empowerment', 'strength', 'resilience', 'community', 'love',
      'celebration', 'achievement', 'progress', 'transformation'
    ];
    
    const negativeWords = [
      'pain', 'struggle', 'discrimination', 'violence', 'loss',
      'trauma', 'injustice', 'fear', 'isolation', 'despair',
      'abuse', 'poverty', 'racism', 'exclusion', 'suffering'
    ];
    
    const words = text.toLowerCase().split(/\\s+/);
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    // Normalize score
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  }

  detectIndigenousContent(text) {
    const indigenousIndicators = [
      'aboriginal', 'torres strait', 'indigenous', 'first nations',
      'traditional owner', 'country', 'dreamtime', 'elder',
      'community', 'cultural', 'ancestral', 'sovereignty'
    ];
    
    const lowerText = text.toLowerCase();
    return indigenousIndicators.some(indicator => lowerText.includes(indicator));
  }

  detectLanguageElements(text) {
    // Simple language detection - could be enhanced with proper language detection
    const languages = {
      'pitjantjatjara': ['anangu', 'tjukurpa', 'palya'],
      'yolngu': ['yolngu', 'balanda', 'rom'],
      'kriol': ['bin', 'gotta', 'longa']
    };
    
    const lowerText = text.toLowerCase();
    for (const [lang, words] of Object.entries(languages)) {
      if (words.some(word => lowerText.includes(word))) {
        return lang;
      }
    }
    
    return 'english';
  }

  async calculateStoryImpact(story) {
    const impact = {
      overall_score: 0,
      viral_potential: 0,
      policy_relevance: 0,
      healing_potential: 0,
      media_readiness: 0,
      impact_types: [],
      policy_areas: [],
      healing_aspects: [],
      suitable_formats: []
    };
    
    const content = (story.content || '').toLowerCase();
    
    // Calculate viral potential
    const viralIndicators = ['inspiring', 'shocking', 'heartwarming', 'breakthrough', 'unique'];
    impact.viral_potential = viralIndicators.filter(i => content.includes(i)).length / viralIndicators.length;
    
    // Calculate policy relevance
    const policyKeywords = ['policy', 'government', 'law', 'system', 'change', 'reform'];
    impact.policy_relevance = policyKeywords.filter(k => content.includes(k)).length / policyKeywords.length;
    
    // Calculate healing potential
    const healingKeywords = ['healing', 'recovery', 'transformation', 'growth', 'resilience'];
    impact.healing_potential = healingKeywords.filter(h => content.includes(h)).length / healingKeywords.length;
    
    // Calculate media readiness
    impact.media_readiness = (
      (story.title ? 0.2 : 0) +
      (story.content && story.content.length > 500 ? 0.3 : 0) +
      (story.consent_status === 'active' ? 0.3 : 0) +
      (story.cultural_protocols_acknowledged ? 0.2 : 0)
    );
    
    // Overall score
    impact.overall_score = (
      impact.viral_potential * 0.25 +
      impact.policy_relevance * 0.25 +
      impact.healing_potential * 0.25 +
      impact.media_readiness * 0.25
    );
    
    return impact;
  }

  async storeStoryIntelligence(intelligence) {
    const key = `story:intelligence:${Date.now()}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(intelligence)); // 7 days
    
    // Add to timeline index
    await this.redis.zadd('story:intelligence:timeline', Date.now(), key);
  }

  async publishStoryIntelligence(intelligence) {
    try {
      await this.producer.send({
        topic: 'act.stories.intelligence',
        messages: [{
          key: `story_intelligence_${Date.now()}`,
          value: JSON.stringify(intelligence)
        }]
      });
    } catch (error) {
      console.error('Failed to publish story intelligence:', error);
    }
  }

  async updateStoryGraph(intelligence) {
    const session = this.neo4j.session();
    
    try {
      // Create story analysis nodes and relationships
      await session.run(`
        CREATE (sa:StoryAnalysis {
          id: $id,
          timestamp: datetime($timestamp),
          total_stories: $totalStories,
          themes_identified: $themesCount
        })
      `, {
        id: `analysis_${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalStories: intelligence.story_collection?.total_stories || 0,
        themesCount: intelligence.theme_analysis?.dominant_themes?.length || 0
      });
      
    } catch (error) {
      console.error('Failed to update story graph:', error);
    } finally {
      await session.close();
    }
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    console.log('📖 Story Weaver connected to Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.redis.quit();
    await this.neo4j.close();
    console.log('📖 Story Weaver disconnected');
  }

  async healthCheck() {
    return {
      name: this.name,
      status: 'healthy',
      supabase_connected: Boolean(this.supabase),
      openai_configured: Boolean(this.openai),
      cultural_protocols: Object.keys(this.culturalProtocols).length,
      story_categories: Object.keys(this.storyCategories.impact_themes).length,
      platform_integrations: Object.keys(this.platforms).length
    };
  }

  // Additional helper methods would include:
  // - analyzeStoryIntent()
  // - handleStoryCollection()
  // - curateStories()
  // - manageConsent()
  // - comprehensiveStoryAnalysis()
  // - checkCulturalCompliance()
  // - verifyConsentStatus()
  // - generateStoryRecommendations()
  // - identifyStoryPatterns()
  // - identifyHealingIndicators()
  // - trackEmotionalJourney()
  // - generateAnalysisRecommendations()
  // - developSharingStrategy()
  // - optimizeForPlatforms()
  // - verifyConsentForSharing()
  // - createPublicationSchedule()
  // - setupPerformanceTracking()
  // - analyzeEngagementMetrics()
  // - measureCommunityImpact()
  // - trackPolicyInfluence()
  // - monitorMediaCoverage()
  // - assessStorytellerOutcomes()
  // - performLongitudinalAnalysis()
}

export default StoryWeaver;