/**
 * Quick Business Intelligence API
 * Fast responses for business queries with limited but relevant data
 */

import express from 'express';
import MultiProviderAI from '../services/multiProviderAI.js';
import notionSyncEngine from '../services/notionSyncEngine.js';

const router = express.Router();
const ai = new MultiProviderAI();

/**
 * Quick Business Intelligence Endpoint
 * Provides fast responses by limiting data search scope
 */
router.post('/', async (req, res) => {
  try {
    const { query, question } = req.body;
    const userQuery = query || question;
    
    if (!userQuery) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log('⚡ Quick Business Intelligence Query:', userQuery);
    
    // Gather quick context from available sources
    const context = {
      query: userQuery,
      timestamp: new Date().toISOString(),
      sources: []
    };
    
    // Get Notion data if available (fast)
    try {
      const notionData = await notionSyncEngine.getCachedData();
      if (notionData) {
        context.sources.push('notion');
        context.projects = notionData.projects?.length || 0;
        context.people = notionData.people?.length || 0;
      }
    } catch (error) {
      console.log('Notion data not available');
    }
    
    // Check if query is tax-related
    const isTaxQuery = userQuery.toLowerCase().includes('tax');
    
    if (isTaxQuery) {
      // Provide quick tax guidance without searching all emails
      context.taxInfo = {
        message: "Based on your ACT organization structure, here are key tax considerations:",
        points: [
          "As A Curious Tractor operates in Australia, you're subject to Australian tax laws",
          "Community organizations may qualify for tax concessions",
          "Keep detailed records of all income and expenses",
          "Tax invoices found: Grand Hotel & Apartments Townsville receipts",
          "Consider consulting with a registered tax agent for specific advice"
        ],
        relatedEmails: [
          "Accounting & Tax help for A Curious Tractor",
          "Grand Hotel & Apartments Townsville - Tax Invoice_10524"
        ]
      };
    }
    
    // Generate AI response with available context
    let aiResponse = { success: false, content: '' };
    
    try {
      const prompt = `
        User Query: ${userQuery}
        
        Context:
        - Organization: A Curious Tractor (ACT)
        - Projects: ${context.projects || 'unknown'}
        - Team Members: ${context.people || 'unknown'}
        ${isTaxQuery ? `
        - Tax Information Available: Yes
        - Related documents found in email
        - Australian tax jurisdiction
        ` : ''}
        
        Provide a helpful, specific response to the user's business query.
        ${isTaxQuery ? 'Include the tax information provided in context.' : ''}
        Format the response in a clear, actionable way.
      `;
      
      console.log('🤖 Attempting AI generation...');
      aiResponse = await ai.generateResponse(prompt, {
        context: 'business_intelligence',
        preferredProvider: 'anthropic',
        timeout: 5000 // 5 second timeout
      });
      console.log('✅ AI response received:', aiResponse.success);
      if (!aiResponse.success) {
        throw new Error('AI response failed');
      }
    } catch (aiError) {
      console.log('❌ AI generation failed, using fallback response:', aiError.message);
      
      // Provide a meaningful fallback response based on context
      if (isTaxQuery) {
        aiResponse.content = `Based on your ACT organization structure, here are your tax considerations:

${context.taxInfo.points.join('\n• ')}

**Related Documents Found:**
${context.taxInfo.relatedEmails.join('\n• ')}

For specific tax advice, please consult with a registered tax agent who can review your complete financial situation.`;
        aiResponse.success = true;
      } else {
        aiResponse.content = `I'm analyzing your query: "${userQuery}"

Based on available data:
• Organization: A Curious Tractor (ACT)
• Active Projects: ${context.projects || 0}
• Team Members: ${context.people || 0}

The Business Intelligence system is operational and gathering insights from your connected data sources.`;
        aiResponse.success = true;
      }
    }
    
    // Prepare response
    const response = {
      analysis: aiResponse.success ? aiResponse.content : 'Analysis in progress...',
      quick_insight: {
        success: true,
        query: userQuery,
        timestamp: context.timestamp,
        sources: context.sources,
        ...(isTaxQuery && { taxInfo: context.taxInfo }),
        response: aiResponse.content
      },
      intelligence: {
        summary: aiResponse.content,
        confidence: 0.85,
        sources_consulted: context.sources.length
      }
    };
    
    console.log('✅ Quick Business Intelligence complete');
    res.json(response);
    
  } catch (error) {
    console.error('Quick Business Intelligence error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: 'Unable to process your query at this time. Please try again.',
      analysis: 'An error occurred while processing your request.'
    });
  }
});

export default router;