/**
 * AI Business Agent
 * Intelligent assistant for business questions, research, and decisions
 * Uses: Anthropic Claude + Perplexity + your data (Xero, Notion, Gmail, Calendar)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Client as NotionClient } from '@notionhq/client';

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Lazy-load data clients
let _supabase = null;
let _notion = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SUPABASE_KEY) return null;
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}

function getNotion() {
  if (_notion) return _notion;
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  if (!NOTION_TOKEN) return null;
  _notion = new NotionClient({ auth: NOTION_TOKEN });
  return _notion;
}

/**
 * Gather context from all data sources based on question
 */
async function gatherContext(question) {
  const context = {
    bankTransactions: [],
    projects: [],
    contacts: [],
    recentActivity: {},
    financialSummary: {}
  };

  const supabase = getSupabase();
  const notion = getNotion();

  if (!supabase || !notion) {
    return context;
  }

  try {
    // Get financial summary
    const { data: transactions } = await supabase
      .from('xero_bank_transactions')
      .select('*')
      .neq('status', 'DELETED')
      .order('date', { ascending: false })
      .limit(100);

    if (transactions) {
      const moneyIn = transactions.filter(t => t.type === 'RECEIVE')
        .reduce((sum, t) => sum + (t.total || 0), 0);
      const moneyOut = transactions.filter(t => t.type === 'SPEND')
        .reduce((sum, t) => sum + Math.abs(t.total || 0), 0);

      context.financialSummary = {
        recentTransactionCount: transactions.length,
        totalMoneyIn: moneyIn,
        totalMoneyOut: moneyOut,
        netCashFlow: moneyIn - moneyOut
      };

      context.bankTransactions = transactions.slice(0, 20); // Most recent 20
    }

    // Get ACT projects
    const NOTION_DB_ID = process.env.NOTION_DATABASE_ID || '177ebcf9-81cf-80dd-9514-f1ec32f3314c';
    const response = await notion.databases.query({
      database_id: NOTION_DB_ID,
      page_size: 20
    });

    context.projects = response.results.map(page => ({
      id: page.id,
      name: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      status: page.properties.Status?.status?.name || 'Unknown',
      category: page.properties.Category?.select?.name || 'Uncategorized'
    }));

    // Get contacts (for vendor analysis)
    const { data: contacts } = await supabase
      .from('xero_contacts')
      .select('name, email, is_customer, is_supplier')
      .limit(50);

    context.contacts = contacts || [];

  } catch (error) {
    console.error('Error gathering context:', error);
  }

  return context;
}

/**
 * Use Perplexity for web research (when needed)
 */
async function doWebResearch(query) {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{
          role: 'user',
          content: query
        }]
      })
    });

    const result = await response.json();
    return result.choices?.[0]?.message?.content || 'No research results found';

  } catch (error) {
    console.error('Perplexity research error:', error);
    return null;
  }
}

export default function aiBusinessAgentRoutes(app) {

  /**
   * POST /api/v2/agent/ask
   * Ask the AI Business Agent a question
   */
  app.post('/api/v2/agent/ask', async (req, res) => {
    try {
      const { question, includeResearch = false } = req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        });
      }

      console.log(`🤖 AI Agent Question: "${question}"`);

      // Step 1: Gather relevant context from your data
      const context = await gatherContext(question);

      // Step 2: Do web research if requested
      let researchData = null;
      if (includeResearch) {
        console.log('🔍 Performing web research...');
        researchData = await doWebResearch(question);
      }

      // Step 3: Build AI prompt with context
      const systemPrompt = `You are an intelligent business assistant for ACT Placemat, a community organization in Australia.

You have access to the following data:
- Financial transactions from Xero (bank accounts, income, expenses)
- ACT community projects from Notion
- Contact/vendor information
${researchData ? '- Recent web research results' : ''}

Your job is to:
1. Answer business and financial questions accurately
2. Provide insights and recommendations
3. Help with decision-making
4. Suggest actions to take

Be concise, practical, and focused on helping the business succeed.`;

      const userPrompt = `Question: ${question}

Available Context:
- Recent transactions: ${context.bankTransactions.length} transactions
- Total money in (recent): $${context.financialSummary.totalMoneyIn?.toFixed(2) || 0}
- Total money out (recent): $${context.financialSummary.totalMoneyOut?.toFixed(2) || 0}
- Net cash flow (recent): $${context.financialSummary.netCashFlow?.toFixed(2) || 0}
- ACT Projects: ${context.projects.length} projects
- Top projects: ${context.projects.slice(0, 5).map(p => p.name).join(', ')}

Recent Transactions (sample):
${context.bankTransactions.slice(0, 5).map(t =>
  `- ${t.date}: ${t.contact_name || 'Unknown'} - $${Math.abs(t.total || 0).toFixed(2)} (${t.type})`
).join('\n')}

${researchData ? `\nWeb Research Results:\n${researchData}` : ''}

Please answer the question with specific data and actionable insights.`;

      // Step 4: Call Claude AI
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        system: systemPrompt
      });

      const answer = message.content[0].text;

      console.log(`✅ AI Answer: ${answer.substring(0, 100)}...`);

      // Step 5: Extract actionable items from the answer
      const actions = [];
      if (answer.toLowerCase().includes('recommend') || answer.toLowerCase().includes('should')) {
        actions.push({
          type: 'recommendation',
          description: 'AI has made recommendations - review them'
        });
      }

      if (answer.toLowerCase().includes('receipt') || answer.toLowerCase().includes('missing')) {
        actions.push({
          type: 'check_receipts',
          description: 'Check Missing Receipts tab in Financial Reports'
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        question,
        answer,
        actions,
        sources: {
          bankTransactions: context.bankTransactions.length,
          projects: context.projects.length,
          contacts: context.contacts.length,
          researchUsed: !!researchData
        },
        metadata: {
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: message.usage.input_tokens + message.usage.output_tokens
        }
      });

    } catch (error) {
      console.error('❌ AI Agent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/v2/agent/research
   * Do web research on a topic
   */
  app.post('/api/v2/agent/research', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Research query is required'
        });
      }

      console.log(`🔍 Research Query: "${query}"`);

      const researchResult = await doWebResearch(query);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        query,
        result: researchResult,
        source: 'Perplexity AI (web search)'
      });

    } catch (error) {
      console.error('❌ Research error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/v2/agent/suggestions
   * Get proactive AI suggestions based on current data
   */
  app.get('/api/v2/agent/suggestions', async (req, res) => {
    try {
      const context = await gatherContext('general business health');

      const suggestions = [];

      // Analyze cash flow
      if (context.financialSummary.netCashFlow < 0) {
        suggestions.push({
          type: 'warning',
          category: 'cash_flow',
          title: 'Negative Cash Flow Detected',
          description: `Recent spending ($${Math.abs(context.financialSummary.totalMoneyOut).toFixed(0)}) exceeds income ($${context.financialSummary.totalMoneyIn.toFixed(0)})`,
          action: 'Review expenses in Top Vendors tab',
          priority: 'high'
        });
      }

      // Check for unmatched transactions
      const unmatchedCount = context.bankTransactions.filter(t =>
        !context.projects.some(p => t.contact_name?.toLowerCase().includes(p.name.toLowerCase()))
      ).length;

      if (unmatchedCount > 10) {
        suggestions.push({
          type: 'info',
          category: 'project_tracking',
          title: `${unmatchedCount} Unmatched Transactions`,
          description: 'These transactions are not linked to any ACT project',
          action: 'Visit Projects tab to assign them',
          priority: 'medium'
        });
      }

      // Suggest BAS check (quarterly)
      const now = new Date();
      const isEndOfQuarter = [2, 5, 8, 11].includes(now.getMonth());
      if (isEndOfQuarter) {
        suggestions.push({
          type: 'reminder',
          category: 'compliance',
          title: 'BAS Quarter Ending Soon',
          description: 'Time to prepare quarterly BAS submission',
          action: 'Review BAS data in Bookkeeping tab',
          priority: 'high'
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        suggestions,
        summary: {
          total: suggestions.length,
          high: suggestions.filter(s => s.priority === 'high').length,
          medium: suggestions.filter(s => s.priority === 'medium').length,
          low: suggestions.filter(s => s.priority === 'low').length
        }
      });

    } catch (error) {
      console.error('❌ Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
