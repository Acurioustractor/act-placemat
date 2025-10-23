/**
 * Opportunities API - Grant Discovery & Application Tracking
 *
 * Features:
 * - List opportunities from Notion
 * - AI-powered grant discovery (Tavily)
 * - Match scoring against ACT projects
 * - Application tracking
 *
 * Best Practices:
 * - Error handling with try/catch
 * - Input validation
 * - Caching for performance
 * - Logging for debugging
 */

import { Client } from '@notionhq/client';
import axios from 'axios';

// Initialize Notion client
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const notion = NOTION_TOKEN ? new Client({ auth: NOTION_TOKEN }) : null;
const OPPORTUNITIES_DB = process.env.NOTION_OPPORTUNITIES_DATABASE_ID;
const PROJECTS_DB = process.env.NOTION_PROJECTS_DATABASE_ID;

// Tavily API for grant research
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = 'https://api.tavily.com/search';

// Cache for opportunities (5 minute TTL)
let opportunitiesCache = {
  data: [],
  lastFetch: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

/**
 * Fetch opportunities from Notion database
 */
async function fetchNotionOpportunities() {
  const now = Date.now();

  // Return cached data if valid
  if (opportunitiesCache.data.length > 0 &&
      (now - opportunitiesCache.lastFetch) < opportunitiesCache.ttl) {
    return opportunitiesCache.data;
  }

  if (!notion || !OPPORTUNITIES_DB) {
    console.log('⚠️  Notion client or database ID not configured');
    return [];
  }

  try {
    console.log('📋 Fetching opportunities from Notion...');

    const response = await notion.databases.query({
      database_id: OPPORTUNITIES_DB,
      sorts: [
        {
          property: 'Deadline',
          direction: 'ascending'
        }
      ]
    });

    const opportunities = response.results.map(page => {
      const props = page.properties;

      return {
        id: page.id,
        title: props.Name?.title?.[0]?.plain_text || 'Untitled',
        source: props.Source?.rich_text?.[0]?.plain_text || '',
        amount: props.Amount?.number || 0,
        deadline: props.Deadline?.date?.start || null,
        status: props.Status?.select?.name || 'Open',
        description: props.Description?.rich_text?.[0]?.plain_text || '',
        requirements: props.Requirements?.rich_text?.[0]?.plain_text || '',
        url: props.URL?.url || '',
        matchScore: props['Match Score']?.number || 0,
        tags: props.Tags?.multi_select?.map(tag => tag.name) || [],
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };
    });

    // Update cache
    opportunitiesCache.data = opportunities;
    opportunitiesCache.lastFetch = now;

    console.log(`✅ Loaded ${opportunities.length} opportunities`);
    return opportunities;

  } catch (error) {
    console.error('❌ Error fetching opportunities:', error.message);
    return opportunitiesCache.data; // Return stale data on error
  }
}

/**
 * Discover new grant opportunities using Tavily AI search
 */
async function discoverGrantsWithTavily(query, maxResults = 5) {
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  try {
    console.log(`🔍 Discovering grants: "${query}"`);

    const response = await axios.post(
      TAVILY_API_URL,
      {
        api_key: TAVILY_API_KEY,
        query: `${query} grants funding opportunities Australia`,
        search_depth: 'advanced',
        max_results: maxResults,
        include_domains: [
          'grants.gov.au',
          'business.gov.au',
          'indigenous.gov.au',
          'ausindustry.gov.au'
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const results = response.data.results || [];

    console.log(`✅ Found ${results.length} grant opportunities`);

    return results.map(result => ({
      title: result.title,
      description: result.content,
      url: result.url,
      source: new URL(result.url).hostname,
      relevanceScore: result.score || 0
    }));

  } catch (error) {
    console.error('❌ Tavily discovery error:', error.message);
    throw new Error(`Grant discovery failed: ${error.message}`);
  }
}

/**
 * Calculate match score between opportunity and project
 */
function calculateMatchScore(opportunity, project) {
  let score = 0;

  // Tag matching (40 points)
  const oppTags = opportunity.tags?.map(t => t.toLowerCase()) || [];
  const projTags = project.tags?.map(t => t.toLowerCase()) || [];
  const tagMatches = oppTags.filter(tag => projTags.includes(tag)).length;
  score += Math.min(tagMatches * 10, 40);

  // Description keyword matching (30 points)
  const oppKeywords = (opportunity.description || '').toLowerCase().split(' ');
  const projKeywords = (project.description || '').toLowerCase().split(' ');
  const keywordMatches = oppKeywords.filter(kw =>
    kw.length > 4 && projKeywords.includes(kw)
  ).length;
  score += Math.min(keywordMatches * 5, 30);

  // Amount compatibility (20 points)
  if (opportunity.amount > 0 && project.budget) {
    const ratio = Math.min(opportunity.amount, project.budget) /
                  Math.max(opportunity.amount, project.budget);
    score += ratio * 20;
  }

  // Deadline proximity (10 points)
  if (opportunity.deadline) {
    const daysUntil = Math.floor(
      (new Date(opportunity.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil > 30) score += 10; // Good time to apply
    else if (daysUntil > 14) score += 5; // Tight but doable
  }

  return Math.round(score);
}

/**
 * Register API routes
 */
export default function registerOpportunitiesRoutes(app) {

  // GET /api/opportunities - List all opportunities
  app.get('/api/opportunities', async (req, res) => {
    try {
      const { status, minAmount, maxAmount } = req.query;

      let opportunities = await fetchNotionOpportunities();

      // Filter by status
      if (status) {
        opportunities = opportunities.filter(opp =>
          opp.status.toLowerCase() === status.toLowerCase()
        );
      }

      // Filter by amount range
      if (minAmount) {
        opportunities = opportunities.filter(opp =>
          opp.amount >= parseInt(minAmount)
        );
      }
      if (maxAmount) {
        opportunities = opportunities.filter(opp =>
          opp.amount <= parseInt(maxAmount)
        );
      }

      res.json({
        success: true,
        count: opportunities.length,
        opportunities
      });

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/opportunities/discover - AI-powered grant discovery
  app.post('/api/opportunities/discover', async (req, res) => {
    try {
      const { query, maxResults = 5 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required'
        });
      }

      const results = await discoverGrantsWithTavily(query, maxResults);

      res.json({
        success: true,
        query,
        count: results.length,
        results
      });

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/opportunities/match/:projectId - Match opportunities to project
  app.get('/api/opportunities/match/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;

      // Fetch project from Notion
      const project = await notion.pages.retrieve({
        page_id: projectId
      });

      const projectData = {
        id: project.id,
        title: project.properties.Name?.title?.[0]?.plain_text || '',
        description: project.properties.Description?.rich_text?.[0]?.plain_text || '',
        tags: project.properties.Tags?.multi_select?.map(t => t.name) || [],
        budget: project.properties.Budget?.number || 0
      };

      // Fetch all opportunities
      const opportunities = await fetchNotionOpportunities();

      // Calculate match scores
      const matchedOpportunities = opportunities
        .map(opp => ({
          ...opp,
          matchScore: calculateMatchScore(opp, projectData)
        }))
        .filter(opp => opp.matchScore > 20) // Only show decent matches
        .sort((a, b) => b.matchScore - a.matchScore);

      res.json({
        success: true,
        project: projectData,
        count: matchedOpportunities.length,
        opportunities: matchedOpportunities
      });

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/opportunities/:id - Get single opportunity
  app.get('/api/opportunities/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const page = await notion.pages.retrieve({
        page_id: id
      });

      const props = page.properties;

      const opportunity = {
        id: page.id,
        title: props.Name?.title?.[0]?.plain_text || 'Untitled',
        source: props.Source?.rich_text?.[0]?.plain_text || '',
        amount: props.Amount?.number || 0,
        deadline: props.Deadline?.date?.start || null,
        status: props.Status?.select?.name || 'Open',
        description: props.Description?.rich_text?.[0]?.plain_text || '',
        requirements: props.Requirements?.rich_text?.[0]?.plain_text || '',
        url: props.URL?.url || '',
        matchScore: props['Match Score']?.number || 0,
        tags: props.Tags?.multi_select?.map(tag => tag.name) || [],
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };

      res.json({
        success: true,
        opportunity
      });

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  console.log('✅ Opportunities API routes registered');
}
