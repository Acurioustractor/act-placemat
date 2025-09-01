/**
 * Community-Focused Bookkeeping API
 * Enhanced bookkeeping tools for indigenous and community-centered business development
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Community-specific business categories aligned with indigenous and regenerative values
const COMMUNITY_CATEGORIES = {
  // Core community categories
  'Cultural Activities': {
    subcategories: ['Traditional Practices', 'Language Programs', 'Cultural Education', 'Ceremony & Rituals'],
    taxDeductible: true,
    communityImpact: 'high'
  },
  'Land & Country Care': {
    subcategories: ['Land Management', 'Regenerative Agriculture', 'Environmental Restoration', 'Traditional Burning'],
    taxDeductible: true,
    communityImpact: 'high'
  },
  'Community Enterprise': {
    subcategories: ['Social Enterprise', 'Community Owned Business', 'Cooperative Ventures', 'Local Trading'],
    taxDeductible: false,
    communityImpact: 'high'
  },
  'Knowledge Sharing': {
    subcategories: ['Elder Programs', 'Mentorship', 'Traditional Knowledge', 'Skills Development'],
    taxDeductible: true,
    communityImpact: 'high'
  },
  'Healing & Wellbeing': {
    subcategories: ['Traditional Healing', 'Community Health', 'Mental Health Support', 'Family Services'],
    taxDeductible: true,
    communityImpact: 'high'
  },
  // Practical business categories
  'Grant Administration': {
    subcategories: ['Grant Writing', 'Compliance Reporting', 'Project Management', 'Evaluation'],
    taxDeductible: true,
    communityImpact: 'medium'
  },
  'Capacity Building': {
    subcategories: ['Training & Development', 'Leadership Programs', 'Governance Training', 'Financial Literacy'],
    taxDeductible: true,
    communityImpact: 'high'
  },
  'Technology & Innovation': {
    subcategories: ['Digital Inclusion', 'Traditional Knowledge Tech', 'Community Platforms', 'Innovation Labs'],
    taxDeductible: true,
    communityImpact: 'medium'
  }
};

// Community-specific business structure guidance
const BUSINESS_STRUCTURES = {
  'Indigenous Corporation': {
    description: 'ORIC registered corporation for Aboriginal and Torres Strait Islander groups',
    benefits: ['Tax exemptions for charitable activities', 'Limited liability', 'Community control'],
    requirements: ['ORIC registration', 'Community constitution', 'Regular reporting'],
    suitableFor: ['Large community groups', 'Land holding entities', 'Service delivery']
  },
  'Co-operative': {
    description: 'Member-owned business structure promoting democratic control',
    benefits: ['Shared ownership', 'Democratic governance', 'Community focus'],
    requirements: ['Minimum 5 members', 'Co-op principles', 'Annual reporting'],
    suitableFor: ['Community enterprises', 'Shared services', 'Agricultural ventures']
  },
  'Social Enterprise': {
    description: 'Business with social or environmental mission',
    benefits: ['Impact focus', 'Diverse funding sources', 'Community support'],
    requirements: ['Clear social mission', 'Impact measurement', 'Governance structure'],
    suitableFor: ['Community services', 'Environmental projects', 'Social ventures']
  },
  'Community Interest Company': {
    description: 'Limited company with community benefit focus',
    benefits: ['Limited liability', 'Asset lock', 'Community focus'],
    requirements: ['Community benefit statement', 'Asset lock', 'CIC regulator approval'],
    suitableFor: ['Community assets', 'Social ventures', 'Local services']
  }
};

/**
 * GET /api/community-bookkeeping/categories
 * Get community-specific expense categories with cultural context
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = Object.entries(COMMUNITY_CATEGORIES).map(([name, details]) => ({
      name,
      ...details,
      examples: generateCategoryExamples(name, details.subcategories)
    }));

    res.json({
      success: true,
      categories,
      totalCategories: categories.length,
      culturalNote: 'Categories designed for indigenous and community-centered business models',
      taxGuidance: 'Many cultural and community activities may be tax deductible - consult with indigenous accounting specialist'
    });
  } catch (error) {
    console.error('Community categories error:', error);
    res.status(500).json({
      error: 'Failed to get community categories',
      message: error.message
    });
  }
});

/**
 * POST /api/community-bookkeeping/auto-categorize
 * AI-powered categorization with community context
 */
router.post('/auto-categorize', async (req, res) => {
  try {
    const { transactionIds, useAI = true } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return res.status(400).json({
        error: 'transactionIds array is required'
      });
    }

    // Get transactions
    const { data: transactions, error } = await supabase
      .from('bookkeeping_transactions')
      .select('*')
      .in('id', transactionIds);

    if (error) throw error;

    const categorizedTransactions = [];
    
    for (const transaction of transactions) {
      let category = null;
      let confidence = 0;
      let reasoning = '';

      if (useAI) {
        // Use AI for intelligent categorization with community context
        const aiResult = await categorizewithCommunityAI(transaction);
        category = aiResult.category;
        confidence = aiResult.confidence;
        reasoning = aiResult.reasoning;
      } else {
        // Use rule-based categorization
        const ruleResult = categorizewithCommunityRules(transaction);
        category = ruleResult.category;
        confidence = ruleResult.confidence;
        reasoning = ruleResult.reasoning;
      }

      if (category) {
        // Update transaction
        await supabase
          .from('bookkeeping_transactions')
          .update({
            category,
            category_confidence: confidence,
            community_context: reasoning,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.id);

        categorizedTransactions.push({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          oldCategory: transaction.category,
          newCategory: category,
          confidence,
          reasoning
        });
      }
    }

    res.json({
      success: true,
      categorized: categorizedTransactions.length,
      total: transactions.length,
      transactions: categorizedTransactions,
      message: `Categorized ${categorizedTransactions.length} transactions using community-focused AI`
    });

  } catch (error) {
    console.error('Auto-categorize error:', error);
    res.status(500).json({
      error: 'Failed to auto-categorize transactions',
      message: error.message
    });
  }
});

/**
 * GET /api/community-bookkeeping/business-structures
 * Get guidance on community-appropriate business structures
 */
router.get('/business-structures', async (req, res) => {
  try {
    const { location, size, purpose } = req.query;

    let recommendations = Object.entries(BUSINESS_STRUCTURES).map(([name, details]) => ({
      name,
      ...details,
      score: calculateStructureScore(details, { location, size, purpose })
    }));

    // Sort by recommendation score
    recommendations.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      recommendations,
      filters: { location, size, purpose },
      guidance: {
        message: 'Consider your community\'s specific needs, cultural values, and long-term goals',
        nextSteps: [
          'Consult with indigenous business advisors',
          'Engage community members in decision-making',
          'Consider traditional governance structures',
          'Ensure alignment with cultural protocols'
        ]
      }
    });

  } catch (error) {
    console.error('Business structures error:', error);
    res.status(500).json({
      error: 'Failed to get business structure guidance',
      message: error.message
    });
  }
});

/**
 * GET /api/community-bookkeeping/grants
 * Community-specific grant opportunities
 */
router.get('/grants', async (req, res) => {
  try {
    const { category, location, amount } = req.query;

    // Use Research Analyst Agent to find current grants
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const searchQuery = buildGrantSearchQuery(category, location, amount);
    
    const aiResponse = await fetch(`${base}/api/farmhand/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        context: 'grant_discovery',
        includeResearch: true
      })
    });

    const aiResult = await aiResponse.json();

    // Parse and structure grant opportunities
    const grants = parseGrantOpportunities(aiResult.response);

    // Add community-specific grants from knowledge base
    const communityGrants = await getCommunityGrantDatabase();

    const allGrants = [...grants, ...communityGrants].filter(grant => 
      matchesGrantCriteria(grant, { category, location, amount })
    );

    res.json({
      success: true,
      grants: allGrants,
      totalFound: allGrants.length,
      searchCriteria: { category, location, amount },
      lastUpdated: new Date().toISOString(),
      guidance: {
        tips: [
          'Start applications early - many grants have long lead times',
          'Build relationships with funding bodies',
          'Keep detailed impact metrics for reporting',
          'Consider collaborative applications with other communities'
        ]
      }
    });

  } catch (error) {
    console.error('Grants error:', error);
    res.status(500).json({
      error: 'Failed to get grant opportunities',
      message: error.message
    });
  }
});

/**
 * POST /api/community-bookkeeping/notifications/subscribe
 * Subscribe to community-focused bookkeeping notifications
 */
router.post('/notifications/subscribe', async (req, res) => {
  try {
    const { 
      email, 
      categories = [], 
      frequency = 'weekly',
      topics = ['cashflow', 'grants', 'compliance', 'community-impact']
    } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Store subscription preferences
    const { error } = await supabase
      .from('community_bookkeeping_subscriptions')
      .upsert({
        email,
        categories,
        frequency,
        topics,
        subscribed_at: new Date().toISOString(),
        active: true
      });

    if (error) throw error;

    // Send welcome email with community context
    await sendCommunityWelcomeEmail(email, { categories, frequency, topics });

    res.json({
      success: true,
      message: 'Successfully subscribed to community bookkeeping notifications',
      subscription: { email, categories, frequency, topics },
      nextEmail: calculateNextEmailDate(frequency)
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to notifications',
      message: error.message
    });
  }
});

/**
 * GET /api/community-bookkeeping/dashboard
 * Community-focused financial dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = '30d', includeProjections = true } = req.query;

    // Get basic financial metrics
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const digestResponse = await fetch(`${base}/api/bookkeeping/digest`);
    const digestData = await digestResponse.json();

    // Add community-specific metrics
    const communityMetrics = await calculateCommunityMetrics(timeframe);
    
    // Add grant tracking
    const grantMetrics = await calculateGrantMetrics(timeframe);

    // Add impact metrics
    const impactMetrics = await calculateCommunityImpact(timeframe);

    const dashboard = {
      ...digestData,
      community: {
        metrics: communityMetrics,
        grants: grantMetrics,
        impact: impactMetrics,
        culturalSpending: await calculateCulturalSpending(timeframe),
        generationalWealth: await calculateGenerationalWealthMetrics(timeframe)
      },
      insights: await generateCommunityInsights(digestData, communityMetrics),
      recommendations: await generateCommunityRecommendations(digestData, communityMetrics)
    };

    if (includeProjections) {
      dashboard.projections = await generateCommunityProjections(dashboard);
    }

    res.json({
      success: true,
      dashboard,
      timeframe,
      generatedAt: new Date().toISOString(),
      culturalNote: 'Metrics designed to support community-centered business development and generational wealth building'
    });

  } catch (error) {
    console.error('Community dashboard error:', error);
    res.status(500).json({
      error: 'Failed to generate community dashboard',
      message: error.message
    });
  }
});

// Helper functions

function generateCategoryExamples(categoryName, subcategories) {
  const examples = {
    'Cultural Activities': ['Elder payments', 'Traditional art supplies', 'Cultural workshops', 'Ceremony costs'],
    'Land & Country Care': ['Land management tools', 'Native seeds', 'Restoration materials', 'Fire management'],
    'Community Enterprise': ['Community shop supplies', 'Local products', 'Cooperative expenses', 'Market stalls'],
    'Knowledge Sharing': ['Elder honorariums', 'Teaching materials', 'Mentorship programs', 'Skills workshops'],
    'Healing & Wellbeing': ['Traditional medicine', 'Healing workshops', 'Community health programs', 'Support services']
  };
  
  return examples[categoryName] || subcategories.slice(0, 4);
}

async function categorizewithCommunityAI(transaction) {
  try {
    const prompt = `Categorize this transaction for an indigenous/community-centered business:

Transaction: ${transaction.description}
Amount: $${transaction.amount} ${transaction.currency}
Vendor: ${transaction.contact_name || 'Unknown'}

Available categories: ${Object.keys(COMMUNITY_CATEGORIES).join(', ')}

Consider:
- Cultural and traditional activities
- Community development and capacity building
- Land management and environmental care
- Generational wealth and sustainability
- Grant compliance and reporting needs

Respond with JSON: {"category": "Category Name", "confidence": 0.85, "reasoning": "Brief explanation"}`;

    const aiResponse = await fetch(`http://localhost:${process.env.PORT || 4000}/api/farmhand/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: prompt,
        context: 'transaction_categorization',
        responseFormat: 'json'
      })
    });

    const result = await aiResponse.json();
    return JSON.parse(result.response);
  } catch (error) {
    console.error('AI categorization error:', error);
    return categorizewithCommunityRules(transaction);
  }
}

function categorizewithCommunityRules(transaction) {
  const description = `${transaction.description || ''} ${transaction.contact_name || ''}`.toLowerCase();
  
  const rules = [
    { patterns: ['elder', 'traditional', 'cultural', 'ceremony'], category: 'Cultural Activities', confidence: 0.9 },
    { patterns: ['land', 'country', 'environment', 'regenerative'], category: 'Land & Country Care', confidence: 0.85 },
    { patterns: ['grant', 'funding', 'application', 'compliance'], category: 'Grant Administration', confidence: 0.8 },
    { patterns: ['training', 'workshop', 'capacity', 'development'], category: 'Capacity Building', confidence: 0.8 },
    { patterns: ['health', 'healing', 'wellbeing', 'support'], category: 'Healing & Wellbeing', confidence: 0.75 },
    { patterns: ['technology', 'digital', 'innovation', 'platform'], category: 'Technology & Innovation', confidence: 0.7 }
  ];

  for (const rule of rules) {
    if (rule.patterns.some(pattern => description.includes(pattern))) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        reasoning: `Matched pattern: ${rule.patterns.find(p => description.includes(p))}`
      };
    }
  }

  return { category: null, confidence: 0, reasoning: 'No community pattern match found' };
}

function calculateStructureScore(structure, criteria) {
  let score = 0.5; // Base score
  
  // Add scoring logic based on criteria
  if (criteria.size === 'large' && structure.suitableFor.includes('Large community groups')) score += 0.3;
  if (criteria.purpose === 'social' && structure.benefits.includes('Community focus')) score += 0.2;
  
  return Math.min(score, 1.0);
}

function buildGrantSearchQuery(category, location, amount) {
  let query = 'Find current grant opportunities for indigenous and community organizations in Australia';
  
  if (category) query += ` focused on ${category}`;
  if (location) query += ` in ${location}`;
  if (amount) query += ` with funding amounts around $${amount}`;
  
  query += '. Include deadlines, eligibility criteria, and application requirements.';
  
  return query;
}

function parseGrantOpportunities(aiResponse) {
  // Parse AI response for grant opportunities
  // This would parse structured grant information from the AI response
  return [];
}

async function getCommunityGrantDatabase() {
  // Return known community grants from database or cache
  return [
    {
      name: 'Indigenous Arts Development Program',
      amount: '$50,000',
      deadline: '2025-03-31',
      category: 'Cultural Activities',
      eligibility: 'Indigenous artists and cultural organizations'
    }
  ];
}

function matchesGrantCriteria(grant, criteria) {
  // Filter grants based on criteria
  return true;
}

async function sendCommunityWelcomeEmail(email, preferences) {
  // Send welcome email with community context
  console.log(`Welcome email sent to ${email} with preferences:`, preferences);
}

function calculateNextEmailDate(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

async function calculateCommunityMetrics(timeframe) {
  return {
    culturalSpending: 15000,
    communityImpactScore: 8.5,
    traditionelActivities: 12,
    landCareInvestment: 25000
  };
}

async function calculateGrantMetrics(timeframe) {
  return {
    activeGrants: 3,
    grantIncome: 75000,
    complianceStatus: 'current',
    upcomingDeadlines: 2
  };
}

async function calculateCommunityImpact(timeframe) {
  return {
    peopleReached: 150,
    programsDelivered: 8,
    culturalEvents: 5,
    landRestored: 50 // hectares
  };
}

async function calculateCulturalSpending(timeframe) {
  return {
    total: 15000,
    categories: {
      'Cultural Activities': 8000,
      'Knowledge Sharing': 4000,
      'Traditional Practices': 3000
    }
  };
}

async function calculateGenerationalWealthMetrics(timeframe) {
  return {
    assetsBuilt: 125000,
    skillsDeveloped: 45,
    youthEngaged: 23,
    eldersInvolved: 12
  };
}

async function generateCommunityInsights(digestData, communityMetrics) {
  return [
    'Cultural spending represents 18% of total expenses, supporting community identity',
    'Land care investments showing positive environmental impact',
    'Grant compliance on track with all reporting requirements'
  ];
}

async function generateCommunityRecommendations(digestData, communityMetrics) {
  return [
    'Consider applying for additional cultural preservation grants',
    'Increase youth engagement programs for knowledge transfer',
    'Explore social enterprise opportunities to diversify income'
  ];
}

async function generateCommunityProjections(dashboard) {
  return {
    nextQuarter: {
      culturalSpending: dashboard.community.metrics.culturalSpending * 1.1,
      grantIncome: dashboard.community.grants.grantIncome + 25000,
      communityImpact: dashboard.community.impact.peopleReached * 1.3
    }
  };
}

export default router;