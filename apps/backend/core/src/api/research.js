/**
 * Research API - Curious Tractor + Tavily Integration
 *
 * Features:
 * - Save and retrieve research topics
 * - AI-powered research with Tavily
 * - Research thread management
 * - Knowledge graph connections
 */

import axios from 'axios';
import { Client } from '@notionhq/client';

// Initialize clients
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = 'https://api.tavily.com/search';

// In-memory storage for research topics (could be moved to database)
let researchTopics = new Map();
let researchThreads = new Map();

/**
 * Run AI research query using Tavily
 */
async function runTavilyResearch(query) {
  if (!TAVILY_API_KEY) {
    throw new Error('Tavily API key not configured');
  }

  try {
    console.log(`🔍 Running Tavily research: "${query}"`);

    const response = await axios.post(
      TAVILY_API_URL,
      {
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: true,
        include_domains: [],
        exclude_domains: []
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;

    // Transform Tavily results into research insights
    const insights = (data.results || []).slice(0, 3).map((result, idx) => ({
      id: `insight-${Date.now()}-${idx}`,
      title: result.title || 'Research Finding',
      summary: result.content || result.snippet || '',
      impactArea: 'Research'
    }));

    const sources = (data.results || []).map((result, idx) => ({
      id: `source-${Date.now()}-${idx}`,
      label: result.title || result.url,
      url: result.url,
      type: 'Web Research',
      relevance: result.score ? `${Math.round(result.score * 100)}% relevant` : 'High'
    }));

    const thread = {
      summary: data.answer || `Research findings for: ${query}`,
      keyInsights: insights,
      recommendedActions: [
        'Review research findings and validate with community partners',
        'Connect findings to relevant ACT projects in Notion',
        'Save promising opportunities for further exploration'
      ],
      sources: sources,
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ Research complete: ${insights.length} insights, ${sources.length} sources`);
    return thread;

  } catch (error) {
    console.error('❌ Tavily research error:', error.message);
    throw new Error(`Research failed: ${error.message}`);
  }
}

/**
 * Register routes
 */
export default function registerResearchRoutes(app) {
  // Get all saved research topics
  app.get('/api/curious-tractor/topics', (req, res) => {
    const topics = Array.from(researchTopics.values());
    res.json({
      success: true,
      count: topics.length,
      topics
    });
  });

  // Get a specific research topic and its thread
  app.get('/api/curious-tractor/topics/:id', (req, res) => {
    const { id } = req.params;
    const topic = researchTopics.get(id);

    if (!topic) {
      return res.status(404).json({
        error: 'Topic not found'
      });
    }

    const thread = researchThreads.get(id);

    res.json({
      success: true,
      topic,
      thread: thread || null
    });
  });

  // Run custom research query
  app.post('/api/curious-tractor/research/custom', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          error: 'Query is required'
        });
      }

      const thread = await runTavilyResearch(query);

      // Save as anonymous topic
      const topicId = `custom-${Date.now()}`;
      const topic = {
        id: topicId,
        title: `Custom Research: ${query.substring(0, 50)}`,
        description: 'Ad-hoc research query',
        query: query,
        lastUpdated: new Date().toISOString()
      };

      researchTopics.set(topicId, topic);
      researchThreads.set(topicId, thread);

      res.json({
        success: true,
        topic,
        ...thread
      });

    } catch (error) {
      console.error('Error running custom research:', error);
      res.status(500).json({
        error: 'Failed to run research',
        message: error.message
      });
    }
  });

  // Save a research topic
  app.post('/api/curious-tractor/topics', async (req, res) => {
    try {
      const { title, description, query } = req.body;

      if (!title || !query) {
        return res.status(400).json({
          error: 'Title and query are required'
        });
      }

      const topicId = `topic-${Date.now()}`;
      const topic = {
        id: topicId,
        title,
        description: description || '',
        query,
        lastUpdated: new Date().toISOString()
      };

      // Run initial research
      const thread = await runTavilyResearch(query);

      researchTopics.set(topicId, topic);
      researchThreads.set(topicId, thread);

      res.json({
        success: true,
        topic,
        thread
      });

    } catch (error) {
      console.error('Error saving research topic:', error);
      res.status(500).json({
        error: 'Failed to save research topic',
        message: error.message
      });
    }
  });

  // Delete a research topic
  app.delete('/api/curious-tractor/topics/:id', (req, res) => {
    const { id } = req.params;

    if (!researchTopics.has(id)) {
      return res.status(404).json({
        error: 'Topic not found'
      });
    }

    researchTopics.delete(id);
    researchThreads.delete(id);

    res.json({
      success: true,
      message: 'Topic deleted'
    });
  });

  console.log('✅ Research API routes registered');
}
