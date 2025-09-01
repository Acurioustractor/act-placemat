/**
 * DNA Guardian Skill Pod - World-Class Values Alignment Engine
 * 
 * Philosophy: "First we listen" - Every decision tested against ACT's DNA
 * 
 * This sophisticated guardian embodies ACT's core values through:
 * - Deep semantic understanding of values alignment
 * - Cultural protocol recognition and respect
 * - Community-first decision validation
 * - Regenerative impact assessment
 * - Truth-telling and transparency verification
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import OpenAI from 'openai';
import neo4j from 'neo4j-driver';

class DNAGuardian {
  constructor(agent) {
    this.agent = agent;
    this.name = 'DNA Guardian';
    
    // Initialize connections
    this.kafka = new Kafka({
      clientId: 'act-dna-guardian',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Neo4j for values graph
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    // OpenAI for advanced alignment analysis
    this.openai = null;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // ACT's Core Values Matrix
    this.valuesMatrix = this.initializeValuesMatrix();
    
    // Cultural Protocol Database
    this.culturalProtocols = this.initializeCulturalProtocols();
    
    // Decision History for Learning
    this.decisionHistory = new Map();
    
    // Alignment Thresholds
    this.thresholds = {
      strong: 0.85,
      moderate: 0.65,
      weak: 0.45,
      misaligned: 0.25
    };
    
    console.log('🧬 DNA Guardian initialized - Protecting ACT\'s values');
  }

  initializeValuesMatrix() {
    return {
      humility: {
        weight: 1.0,
        keywords: ['listen', 'learn', 'understand', 'respect', 'acknowledge', 'honor'],
        antipatterns: ['impose', 'dictate', 'assume', 'override', 'dismiss'],
        manifestations: [
          'First we listen',
          'Community voices lead',
          'We don\'t have all the answers',
          'Indigenous knowledge first',
          'Learn before acting'
        ],
        culturalContext: {
          indigenous: 'Respect for Elders and traditional knowledge',
          community: 'Local wisdom guides solutions',
          practice: 'Sitting with not knowing'
        }
      },
      
      curiosity: {
        weight: 0.9,
        keywords: ['question', 'explore', 'wonder', 'investigate', 'discover', 'ask'],
        antipatterns: ['certainty', 'dogma', 'rigid', 'closed', 'fixed'],
        manifestations: [
          'Ask better questions',
          'Challenge assumptions',
          'Explore unexpected connections',
          'What if we tried differently?',
          'Learn from failure'
        ],
        culturalContext: {
          indigenous: 'Learning from Country',
          community: 'Everyone has something to teach',
          practice: 'Playful experimentation'
        }
      },
      
      disruption: {
        weight: 0.85,
        keywords: ['challenge', 'transform', 'reimagine', 'overturn', 'revolutionize'],
        antipatterns: ['maintain', 'preserve', 'protect', 'status quo', 'traditional'],
        manifestations: [
          'Challenge systems that harm',
          'Break cycles of injustice',
          'Create new possibilities',
          'Disrupt with love',
          'Revolutionary kindness'
        ],
        culturalContext: {
          indigenous: 'Decolonizing systems',
          community: 'Grassroots transformation',
          practice: 'Building alternatives'
        }
      },
      
      truth: {
        weight: 0.95,
        keywords: ['honest', 'transparent', 'authentic', 'genuine', 'real', 'actual'],
        antipatterns: ['hide', 'obscure', 'pretend', 'fake', 'mislead'],
        manifestations: [
          'Honest about what works and what doesn\'t',
          'Name the hard truths',
          'Transparent with communities',
          'Own our mistakes',
          'Share power and resources'
        ],
        culturalContext: {
          indigenous: 'Truth-telling and treaty',
          community: 'Radical honesty builds trust',
          practice: 'Data sovereignty and transparency'
        }
      },
      
      peoplefirst: {
        weight: 1.0,
        keywords: ['community', 'human', 'person', 'family', 'mob', 'collective'],
        antipatterns: ['process', 'system', 'bureaucracy', 'efficiency', 'scale'],
        manifestations: [
          'Community over process',
          'Relationships before transactions',
          'Human dignity always',
          'No one left behind',
          'Collective liberation'
        ],
        culturalContext: {
          indigenous: 'Kinship and connection',
          community: 'Ubuntu - I am because we are',
          practice: 'Slow down to connect'
        }
      },
      
      regenerative: {
        weight: 0.9,
        keywords: ['restore', 'heal', 'nurture', 'grow', 'sustain', 'renew'],
        antipatterns: ['extract', 'deplete', 'consume', 'exhaust', 'damage'],
        manifestations: [
          'Leave things better than we found them',
          'Seven generations thinking',
          'Healing not punishment',
          'Build soil don\'t mine it',
          'Circular not linear'
        ],
        culturalContext: {
          indigenous: 'Caring for Country',
          community: 'Intergenerational wealth',
          practice: 'Composting failures into wisdom'
        }
      }
    };
  }

  initializeCulturalProtocols() {
    return {
      indigenous: {
        acknowledgement: {
          required: true,
          pattern: 'Always acknowledge Country and Traditional Owners',
          verification: ['country', 'traditional', 'elder', 'acknowledge']
        },
        
        sovereignty: {
          required: true,
          pattern: 'Respect Indigenous data sovereignty',
          verification: ['consent', 'ownership', 'control', 'access']
        },
        
        storytelling: {
          required: true,
          pattern: 'Stories belong to storytellers',
          verification: ['permission', 'consent', 'attribution', 'ownership']
        },
        
        sacred: {
          required: true,
          pattern: 'Some knowledge is not for sharing',
          verification: ['sacred', 'ceremony', 'men\'s business', 'women\'s business', 'sorry business']
        }
      },
      
      community: {
        consent: {
          required: true,
          pattern: 'Informed, ongoing, revocable consent',
          verification: ['consent', 'permission', 'agree', 'authorize']
        },
        
        benefit: {
          required: true,
          pattern: 'Benefits flow back to community',
          verification: ['return', 'share', 'distribute', 'community benefit']
        },
        
        participation: {
          required: true,
          pattern: 'Nothing about us without us',
          verification: ['involve', 'participate', 'co-design', 'collaborate']
        }
      },
      
      privacy: {
        trauma: {
          required: true,
          pattern: 'Trauma-informed data handling',
          verification: ['sensitive', 'trauma', 'trigger', 'safety']
        },
        
        youth: {
          required: true,
          pattern: 'Extra protection for young people',
          verification: ['youth', 'young', 'child', 'minor']
        },
        
        vulnerable: {
          required: true,
          pattern: 'Protect vulnerable community members',
          verification: ['vulnerable', 'at-risk', 'marginalised', 'disadvantaged']
        }
      }
    };
  }

  async process(query, context) {
    console.log(`🧬 DNA Guardian processing: "${query}"`);
    
    try {
      // Deep alignment analysis
      const alignmentAnalysis = await this.analyzeAlignment(query, context);
      
      // Cultural protocol check
      const protocolCheck = await this.checkCulturalProtocols(query, context);
      
      // Community impact assessment
      const impactAssessment = await this.assessCommunityImpact(query, context);
      
      // Power dynamics analysis
      const powerAnalysis = await this.analyzePowerDynamics(query, context);
      
      // Generate comprehensive response
      const response = {
        pod: this.name,
        timestamp: new Date().toISOString(),
        
        alignment: {
          overall_score: alignmentAnalysis.score,
          rating: alignmentAnalysis.rating,
          breakdown: alignmentAnalysis.breakdown,
          strengths: alignmentAnalysis.strengths,
          concerns: alignmentAnalysis.concerns
        },
        
        cultural_protocols: {
          status: protocolCheck.status,
          protocols_checked: protocolCheck.protocols,
          violations: protocolCheck.violations,
          recommendations: protocolCheck.recommendations
        },
        
        community_impact: {
          positive_impacts: impactAssessment.positive,
          potential_harms: impactAssessment.harms,
          mitigation_strategies: impactAssessment.mitigations,
          community_benefit_score: impactAssessment.benefitScore
        },
        
        power_dynamics: {
          power_balance: powerAnalysis.balance,
          voice_amplification: powerAnalysis.voices,
          resource_distribution: powerAnalysis.resources,
          decision_power: powerAnalysis.decisions
        },
        
        recommendations: await this.generateRecommendations(
          alignmentAnalysis,
          protocolCheck,
          impactAssessment,
          powerAnalysis
        ),
        
        flags: [],
        suggested_actions: []
      };
      
      // Set flags for critical issues
      if (alignmentAnalysis.score < this.thresholds.weak) {
        response.flags.push({
          type: 'CRITICAL',
          message: 'Action significantly misaligned with ACT values',
          severity: 'high'
        });
      }
      
      if (protocolCheck.violations.length > 0) {
        response.flags.push({
          type: 'PROTOCOL_VIOLATION',
          message: 'Cultural protocol violations detected',
          severity: 'high',
          details: protocolCheck.violations
        });
      }
      
      if (impactAssessment.harms.length > 0) {
        response.flags.push({
          type: 'POTENTIAL_HARM',
          message: 'Potential community harm identified',
          severity: 'medium',
          details: impactAssessment.harms
        });
      }
      
      // Store in decision history for learning
      await this.storeDecisionHistory(query, context, response);
      
      // Publish to Kafka for system-wide awareness
      await this.publishAlignmentCheck(response);
      
      // Update Neo4j values graph
      await this.updateValuesGraph(query, response);
      
      return response;
      
    } catch (error) {
      console.error('🚨 DNA Guardian error:', error);
      throw error;
    }
  }

  async analyzeAlignment(query, context) {
    const analysis = {
      score: 0,
      rating: 'unknown',
      breakdown: {},
      strengths: [],
      concerns: []
    };
    
    const queryLower = query.toLowerCase();
    const contextString = JSON.stringify(context).toLowerCase();
    const combinedText = queryLower + ' ' + contextString;
    
    // Analyze against each value
    for (const [valueName, valueConfig] of Object.entries(this.valuesMatrix)) {
      let valueScore = 0;
      let matchCount = 0;
      
      // Check for positive keywords
      for (const keyword of valueConfig.keywords) {
        if (combinedText.includes(keyword)) {
          valueScore += 0.15;
          matchCount++;
        }
      }
      
      // Check for antipatterns (negative impact)
      for (const antipattern of valueConfig.antipatterns) {
        if (combinedText.includes(antipattern)) {
          valueScore -= 0.2;
          analysis.concerns.push(`Potential conflict with ${valueName}: "${antipattern}" detected`);
        }
      }
      
      // Check for manifestations (strong positive)
      for (const manifestation of valueConfig.manifestations) {
        if (this.textSimilarity(combinedText, manifestation.toLowerCase()) > 0.7) {
          valueScore += 0.25;
          analysis.strengths.push(`Strong alignment with ${valueName}: "${manifestation}"`);
        }
      }
      
      // Apply value weight
      valueScore = Math.max(0, Math.min(1, valueScore)) * valueConfig.weight;
      analysis.breakdown[valueName] = {
        score: valueScore,
        matches: matchCount
      };
      
      analysis.score += valueScore;
    }
    
    // Normalize score
    const totalWeight = Object.values(this.valuesMatrix).reduce((sum, v) => sum + v.weight, 0);
    analysis.score = analysis.score / totalWeight;
    
    // Determine rating
    if (analysis.score >= this.thresholds.strong) {
      analysis.rating = 'STRONG';
    } else if (analysis.score >= this.thresholds.moderate) {
      analysis.rating = 'MODERATE';
    } else if (analysis.score >= this.thresholds.weak) {
      analysis.rating = 'WEAK';
    } else {
      analysis.rating = 'MISALIGNED';
    }
    
    // Use OpenAI for deeper analysis if available
    if (this.openai) {
      const deepAnalysis = await this.performDeepAlignmentAnalysis(query, context);
      analysis.ai_insights = deepAnalysis;
    }
    
    return analysis;
  }

  async checkCulturalProtocols(query, context) {
    const check = {
      status: 'PASS',
      protocols: [],
      violations: [],
      recommendations: []
    };
    
    const combinedText = (query + ' ' + JSON.stringify(context)).toLowerCase();
    
    // Check Indigenous protocols
    for (const [protocolName, protocol] of Object.entries(this.culturalProtocols.indigenous)) {
      const protocolCheck = {
        name: protocolName,
        required: protocol.required,
        checked: false,
        passed: false
      };
      
      // Check for protocol verification keywords
      for (const keyword of protocol.verification) {
        if (combinedText.includes(keyword)) {
          protocolCheck.checked = true;
          
          // Additional verification logic
          if (protocolName === 'sovereignty' && !combinedText.includes('consent')) {
            check.violations.push({
              protocol: 'Indigenous Data Sovereignty',
              issue: 'Missing consent mechanism',
              recommendation: 'Implement clear consent and data ownership protocols'
            });
          }
          
          if (protocolName === 'sacred' && this.detectSacredKnowledge(combinedText)) {
            check.violations.push({
              protocol: 'Sacred Knowledge Protection',
              issue: 'Potential exposure of sacred/ceremonial information',
              recommendation: 'Review with Cultural Advisors before proceeding'
            });
          }
          
          break;
        }
      }
      
      if (protocol.required && !protocolCheck.checked) {
        check.recommendations.push(`Consider: ${protocol.pattern}`);
      }
      
      check.protocols.push(protocolCheck);
    }
    
    // Check Community protocols
    for (const [protocolName, protocol] of Object.entries(this.culturalProtocols.community)) {
      if (protocolName === 'consent' && !this.detectConsent(combinedText)) {
        check.violations.push({
          protocol: 'Community Consent',
          issue: 'No clear consent mechanism identified',
          recommendation: 'Implement informed, ongoing, revocable consent process'
        });
      }
      
      if (protocolName === 'benefit' && !this.detectBenefitSharing(combinedText)) {
        check.recommendations.push('Ensure community benefit-sharing is explicitly defined');
      }
    }
    
    // Check Privacy protocols
    if (this.detectSensitiveContent(combinedText)) {
      const privacyProtocols = this.culturalProtocols.privacy;
      
      if (combinedText.includes('youth') || combinedText.includes('young')) {
        check.recommendations.push('Apply extra privacy protections for young people');
      }
      
      if (combinedText.includes('trauma') || combinedText.includes('violence')) {
        check.recommendations.push('Apply trauma-informed data handling practices');
      }
    }
    
    // Set overall status
    if (check.violations.length > 0) {
      check.status = 'FAIL';
    } else if (check.recommendations.length > 3) {
      check.status = 'REVIEW';
    }
    
    return check;
  }

  async assessCommunityImpact(query, context) {
    const assessment = {
      positive: [],
      harms: [],
      mitigations: [],
      benefitScore: 0
    };
    
    // Analyze positive community impacts
    const positiveIndicators = [
      { pattern: 'empower', impact: 'Community empowerment', score: 0.2 },
      { pattern: 'voice', impact: 'Amplifying community voices', score: 0.15 },
      { pattern: 'benefit', impact: 'Direct community benefit', score: 0.25 },
      { pattern: 'healing', impact: 'Supporting community healing', score: 0.2 },
      { pattern: 'connection', impact: 'Strengthening connections', score: 0.15 },
      { pattern: 'opportunity', impact: 'Creating opportunities', score: 0.15 },
      { pattern: 'culture', impact: 'Cultural preservation/celebration', score: 0.2 }
    ];
    
    const combinedText = (query + ' ' + JSON.stringify(context)).toLowerCase();
    
    for (const indicator of positiveIndicators) {
      if (combinedText.includes(indicator.pattern)) {
        assessment.positive.push(indicator.impact);
        assessment.benefitScore += indicator.score;
      }
    }
    
    // Analyze potential harms
    const harmIndicators = [
      { pattern: 'extract', harm: 'Extractive practices', mitigation: 'Implement reciprocal value exchange' },
      { pattern: 'burden', harm: 'Adding burden to community', mitigation: 'Provide resources and support' },
      { pattern: 'tokenistic', harm: 'Tokenistic engagement', mitigation: 'Ensure meaningful participation' },
      { pattern: 'exploit', harm: 'Exploitation risk', mitigation: 'Implement fair compensation and recognition' },
      { pattern: 'appropriate', harm: 'Cultural appropriation risk', mitigation: 'Engage Cultural Advisors' }
    ];
    
    for (const indicator of harmIndicators) {
      if (combinedText.includes(indicator.pattern)) {
        assessment.harms.push(indicator.harm);
        assessment.mitigations.push(indicator.mitigation);
        assessment.benefitScore -= 0.3;
      }
    }
    
    // Context-specific impact analysis
    if (context.projects && context.projects.length > 0) {
      const communityProjects = context.projects.filter(p => 
        p.type === 'community' || p.type === 'justice' || p.type === 'empowerment'
      );
      
      if (communityProjects.length > 0) {
        assessment.positive.push(`Aligns with ${communityProjects.length} community-focused projects`);
        assessment.benefitScore += 0.1 * communityProjects.length;
      }
    }
    
    // Ensure benefit score is between 0 and 1
    assessment.benefitScore = Math.max(0, Math.min(1, assessment.benefitScore));
    
    return assessment;
  }

  async analyzePowerDynamics(query, context) {
    const analysis = {
      balance: 'unknown',
      voices: [],
      resources: {},
      decisions: {}
    };
    
    const combinedText = (query + ' ' + JSON.stringify(context)).toLowerCase();
    
    // Analyze voice and representation
    const voiceIndicators = {
      amplifying: ['amplify', 'elevate', 'platform', 'spotlight', 'feature'],
      silencing: ['override', 'ignore', 'dismiss', 'exclude', 'marginalize']
    };
    
    for (const indicator of voiceIndicators.amplifying) {
      if (combinedText.includes(indicator)) {
        analysis.voices.push(`Amplifying marginalized voices through "${indicator}"`);
      }
    }
    
    for (const indicator of voiceIndicators.silencing) {
      if (combinedText.includes(indicator)) {
        analysis.voices.push(`⚠️ Risk of silencing voices through "${indicator}"`);
      }
    }
    
    // Analyze resource distribution
    if (combinedText.includes('fund') || combinedText.includes('resource') || combinedText.includes('budget')) {
      analysis.resources = {
        community_controlled: combinedText.includes('community control'),
        transparent: combinedText.includes('transparent'),
        equitable: combinedText.includes('equitable') || combinedText.includes('fair'),
        return_to_community: combinedText.includes('return') || combinedText.includes('benefit sharing')
      };
    }
    
    // Analyze decision-making power
    const decisionIndicators = {
      shared: ['co-design', 'collaborate', 'consensus', 'collective', 'together'],
      concentrated: ['decide', 'determine', 'control', 'direct', 'manage']
    };
    
    let sharedPowerScore = 0;
    let concentratedPowerScore = 0;
    
    for (const indicator of decisionIndicators.shared) {
      if (combinedText.includes(indicator)) {
        sharedPowerScore++;
      }
    }
    
    for (const indicator of decisionIndicators.concentrated) {
      if (combinedText.includes(indicator)) {
        concentratedPowerScore++;
      }
    }
    
    analysis.decisions = {
      shared_indicators: sharedPowerScore,
      concentrated_indicators: concentratedPowerScore,
      recommendation: sharedPowerScore > concentratedPowerScore ? 
        'Power appears to be shared' : 
        'Consider redistributing decision-making power'
    };
    
    // Determine overall power balance
    if (sharedPowerScore > concentratedPowerScore && analysis.voices.filter(v => !v.includes('⚠️')).length > 0) {
      analysis.balance = 'BALANCED';
    } else if (concentratedPowerScore > sharedPowerScore * 2) {
      analysis.balance = 'IMBALANCED';
    } else {
      analysis.balance = 'NEEDS_REVIEW';
    }
    
    return analysis;
  }

  async generateRecommendations(alignmentAnalysis, protocolCheck, impactAssessment, powerAnalysis) {
    const recommendations = [];
    
    // Alignment-based recommendations
    if (alignmentAnalysis.score < this.thresholds.moderate) {
      recommendations.push({
        priority: 'HIGH',
        type: 'alignment',
        action: 'Review action against ACT values framework',
        specific_steps: [
          'Consult with community stakeholders',
          'Identify value conflicts and address them',
          'Consider alternative approaches that better align with ACT DNA'
        ]
      });
    }
    
    // Protocol-based recommendations
    if (protocolCheck.violations.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'protocol',
        action: 'Address cultural protocol violations immediately',
        specific_steps: protocolCheck.violations.map(v => v.recommendation)
      });
    }
    
    // Impact-based recommendations
    if (impactAssessment.benefitScore < 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'impact',
        action: 'Enhance community benefit',
        specific_steps: [
          'Increase direct community involvement',
          'Implement benefit-sharing agreements',
          'Create feedback loops with affected communities'
        ]
      });
    }
    
    // Power-based recommendations
    if (powerAnalysis.balance === 'IMBALANCED') {
      recommendations.push({
        priority: 'HIGH',
        type: 'power',
        action: 'Redistribute power and decision-making',
        specific_steps: [
          'Implement co-design processes',
          'Transfer resource control to communities',
          'Create community governance structures'
        ]
      });
    }
    
    // Generate holistic recommendation if using OpenAI
    if (this.openai && recommendations.length > 0) {
      const holisticRec = await this.generateHolisticRecommendation(
        alignmentAnalysis,
        protocolCheck,
        impactAssessment,
        powerAnalysis
      );
      
      if (holisticRec) {
        recommendations.unshift({
          priority: 'STRATEGIC',
          type: 'holistic',
          action: holisticRec.action,
          specific_steps: holisticRec.steps,
          expected_outcome: holisticRec.outcome
        });
      }
    }
    
    return recommendations;
  }

  async performDeepAlignmentAnalysis(query, context) {
    if (!this.openai) return null;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are analyzing alignment with A Curious Tractor's values:
            - Humility: "First we listen"
            - Curiosity: Always ask better questions
            - Disruption: Challenge systems that harm
            - Truth: Honest about what works and what doesn't
            - People First: Community over process
            - Regenerative: Leave things better than we found them
            
            Analyze the query and context for deep alignment, hidden assumptions, and potential conflicts.`
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nContext: ${JSON.stringify(context, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.warn('Deep alignment analysis failed:', error);
      return null;
    }
  }

  async generateHolisticRecommendation(alignment, protocol, impact, power) {
    if (!this.openai) return null;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate a strategic recommendation that addresses all identified issues while strengthening ACT values.'
          },
          {
            role: 'user',
            content: JSON.stringify({ alignment, protocol, impact, power }, null, 2)
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.warn('Holistic recommendation generation failed:', error);
      return null;
    }
  }

  textSimilarity(text1, text2) {
    // Simple Jaccard similarity - could be enhanced with embeddings
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  detectSacredKnowledge(text) {
    const sacredIndicators = [
      'ceremony', 'sacred', 'secret', 'initiated',
      'men\'s business', 'women\'s business', 'sorry business',
      'ceremonial', 'ritual', 'songline', 'dreaming'
    ];
    
    return sacredIndicators.some(indicator => text.includes(indicator));
  }

  detectConsent(text) {
    const consentIndicators = [
      'consent', 'permission', 'agree', 'authorize',
      'approve', 'endorse', 'opt-in', 'voluntary'
    ];
    
    return consentIndicators.some(indicator => text.includes(indicator));
  }

  detectBenefitSharing(text) {
    const benefitIndicators = [
      'benefit sharing', 'profit sharing', 'return to community',
      'community benefit', 'shared value', 'reciprocal'
    ];
    
    return benefitIndicators.some(indicator => text.includes(indicator));
  }

  detectSensitiveContent(text) {
    const sensitiveIndicators = [
      'trauma', 'abuse', 'violence', 'suicide',
      'self-harm', 'mental health', 'addiction',
      'incarceration', 'youth', 'vulnerable'
    ];
    
    return sensitiveIndicators.some(indicator => text.includes(indicator));
  }

  async storeDecisionHistory(query, context, response) {
    const decision = {
      id: `decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
      query,
      context_summary: {
        projects: context.projects?.length || 0,
        people: context.people?.length || 0,
        stories: context.stories?.length || 0
      },
      alignment_score: response.alignment.overall_score,
      rating: response.alignment.rating,
      violations: response.cultural_protocols.violations.length,
      recommendations: response.recommendations.length
    };
    
    // Store in Redis
    await this.redis.setex(
      `dna:decision:${decision.id}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(decision)
    );
    
    // Add to decision history index
    await this.redis.zadd(
      'dna:decisions:timeline',
      Date.now(),
      decision.id
    );
    
    // Update decision history map
    this.decisionHistory.set(decision.id, decision);
    
    // Keep only last 1000 decisions in memory
    if (this.decisionHistory.size > 1000) {
      const firstKey = this.decisionHistory.keys().next().value;
      this.decisionHistory.delete(firstKey);
    }
  }

  async publishAlignmentCheck(response) {
    try {
      await this.producer.send({
        topic: 'act.dna.alignment_checks',
        messages: [{
          key: `alignment_${Date.now()}`,
          value: JSON.stringify(response)
        }]
      });
    } catch (error) {
      console.error('Failed to publish alignment check:', error);
    }
  }

  async updateValuesGraph(query, response) {
    const session = this.neo4j.session();
    
    try {
      // Create alignment node
      await session.run(
        `
        CREATE (a:Alignment {
          id: $id,
          query: $query,
          score: $score,
          rating: $rating,
          timestamp: datetime($timestamp)
        })
        `,
        {
          id: `alignment_${Date.now()}`,
          query: query,
          score: response.alignment.overall_score,
          rating: response.alignment.rating,
          timestamp: response.timestamp
        }
      );
      
      // Create relationships to values
      for (const [valueName, valueData] of Object.entries(response.alignment.breakdown)) {
        await session.run(
          `
          MATCH (a:Alignment {id: $alignmentId})
          MERGE (v:Value {name: $valueName})
          CREATE (a)-[:ALIGNS_WITH {score: $score}]->(v)
          `,
          {
            alignmentId: `alignment_${Date.now()}`,
            valueName: valueName,
            score: valueData.score
          }
        );
      }
      
    } catch (error) {
      console.error('Failed to update values graph:', error);
    } finally {
      await session.close();
    }
  }

  async connect() {
    await this.producer.connect();
    console.log('🧬 DNA Guardian connected to Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.redis.quit();
    await this.neo4j.close();
    console.log('🧬 DNA Guardian disconnected');
  }

  async healthCheck() {
    return {
      name: this.name,
      status: 'healthy',
      openai_configured: Boolean(this.openai),
      decision_history_size: this.decisionHistory.size,
      values_loaded: Object.keys(this.valuesMatrix).length,
      protocols_loaded: Object.keys(this.culturalProtocols).length
    };
  }
}

export default DNAGuardian;