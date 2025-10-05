#!/usr/bin/env node

/**
 * ACT Contact Intelligence Hub - AI ENHANCED
 *
 * PURPOSE: Cloud AI-powered contact enrichment
 * - Groq (FREE) for fast AI analysis
 * - Tavily (1000 FREE/month) for research
 * - Real contact enrichment, email discovery, project matching
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';
import { MultiProviderAI } from './core/src/services/multiProviderAI.js';
import { FreeResearchAI } from './core/src/services/freeResearchAI.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Initialize AI services
const ai = new MultiProviderAI();
const researcher = new FreeResearchAI();

console.log('🧠 Contact Intelligence Hub - AI ENHANCED');
console.log(`   Managing ${(20398).toLocaleString()} LinkedIn contacts`);
console.log('   ✅ Groq AI (FREE, ultra-fast)');
console.log('   ✅ Tavily Research (1000/month FREE)');
console.log('   ✅ Multi-provider AI with auto-fallback');

// ============================================================================
// AI CONTACT ENRICHMENT - REAL IMPLEMENTATION
// ============================================================================

app.post('/api/contacts/:id/enrich', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'cloud' } = req.body; // cloud | local | hybrid

    console.log(`🔍 Enriching contact ${id} with ${mode} AI...`);

    // Get contact
    const { data: contact, error: contactError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (contactError) throw contactError;

    const startTime = Date.now();

    // Step 1: Research the person using Tavily (or DuckDuckGo fallback)
    const researchQuery = `${contact.full_name} ${contact.current_company || ''} ${contact.current_position || ''}`;
    console.log(`   📚 Researching: ${researchQuery}`);

    const researchResults = await researcher.research(researchQuery, {
      maxResults: 5,
      depth: 'basic'
    });

    // Step 2: Analyze with AI (Groq or Claude fallback)
    console.log(`   🤖 Analyzing with AI (mode: ${mode})...`);

    const systemPrompt = `You are a business intelligence analyst specializing in contact enrichment and relationship intelligence.`;

    const userPrompt = `Analyze this contact for potential collaboration:

**Contact Information:**
- Name: ${contact.full_name}
- Company: ${contact.current_company || 'Unknown'}
- Position: ${contact.current_position || 'Unknown'}
- Location: ${contact.location || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Current Email: ${contact.email_address || 'Not found'}
- LinkedIn: ${contact.linkedin_url || 'Not provided'}

**Research Findings:**
${researchResults.sources?.map((s, i) => `${i + 1}. ${s.title}\n   Source: ${s.url}\n   Content: ${s.content}`).join('\n\n') || 'No research results available'}

${researchResults.analysis?.content ? `**AI Research Analysis:**\n${researchResults.analysis.content}` : ''}

**Please provide:**

1. **Email Discovery** (if not already found):
   - Potential email patterns based on company domain
   - Likelihood of finding email via Gmail sync or LinkedIn
   - Email verification confidence (high/medium/low)

2. **Professional Background**:
   - Key expertise areas
   - Notable achievements or recent work
   - Career trajectory and current focus

3. **Collaboration Potential**:
   - What types of projects would this person be good for?
   - Specific skills or experiences that stand out
   - Potential value they could bring to community projects

4. **Outreach Strategy**:
   - Best approach for initial contact
   - Topics/angles that would resonate
   - Recommended timing (immediate / wait for event / seasonal)

Format as JSON with these keys: emailDiscovery, background, collaborationPotential, outreachStrategy`;

    const aiOptions = {
      preferSpeed: mode === 'cloud',
      preferQuality: mode === 'local'
    };

    const enrichmentAnalysis = await ai.generateResponse(
      userPrompt,
      {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.7,
        ...aiOptions
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   ✅ Enrichment complete in ${duration}s`);
    console.log(`   🎯 AI Provider: ${enrichmentAnalysis.provider}`);
    console.log(`   ⚡ Model: ${enrichmentAnalysis.model}`);

    // Parse AI response (try JSON, fall back to text)
    let parsedAnalysis;
    try {
      // Try to extract JSON from response
      const jsonMatch = enrichmentAnalysis.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: structure the raw text
        parsedAnalysis = {
          rawAnalysis: enrichmentAnalysis.response,
          structured: false
        };
      }
    } catch (parseError) {
      parsedAnalysis = {
        rawAnalysis: enrichmentAnalysis.response,
        structured: false
      };
    }

    res.json({
      contact_id: id,
      contact_name: contact.full_name,
      enrichment_mode: mode,
      ai_provider: enrichmentAnalysis.provider,
      ai_model: enrichmentAnalysis.model,
      processing_time_seconds: duration,
      research: {
        provider: researchResults.provider,
        sources_found: researchResults.sources?.length || 0,
        sources: researchResults.sources?.map(s => ({
          title: s.title,
          url: s.url,
          snippet: s.content?.substring(0, 200) + '...'
        })) || []
      },
      analysis: parsedAnalysis,
      cost_estimate: enrichmentAnalysis.provider === 'groq' ? '$0 (FREE)' : 'within free tier',
      next_steps: [
        parsedAnalysis.emailDiscovery ? 'Verify email address' : 'Find email via Gmail sync',
        'Review collaboration potential',
        'Draft personalized outreach',
        'Add to relevant project network'
      ]
    });

  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    res.status(500).json({
      error: error.message,
      details: 'AI enrichment failed. Check API keys and try again.'
    });
  }
});

// ============================================================================
// AI PROJECT MATCHING
// ============================================================================

app.post('/api/contacts/:id/match-projects', async (req, res) => {
  try {
    const { id } = req.params;
    const { projects = [] } = req.body;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (projects.length === 0) {
      return res.status(400).json({
        error: 'No projects provided. Pass array of project names/descriptions in request body.'
      });
    }

    console.log(`🎯 Matching ${contact.full_name} to ${projects.length} projects...`);

    const systemPrompt = `You are a project matching expert. Analyze a contact's background and recommend which projects they'd be best suited for.`;

    const userPrompt = `**Contact:**
- Name: ${contact.full_name}
- Position: ${contact.current_position || 'Unknown'}
- Company: ${contact.current_company || 'Unknown'}
- Industry: ${contact.industry || 'Unknown'}
- Location: ${contact.location || 'Unknown'}

**Projects to Evaluate:**
${projects.map((p, i) => `${i + 1}. ${typeof p === 'string' ? p : p.name || p.title || 'Project ' + (i + 1)}`).join('\n')}

For each project, provide:
1. Match score (0-100)
2. Key reasons for the score
3. Specific contributions this person could make
4. Potential concerns or gaps

Return as JSON array with: projectName, matchScore, reasons, contributions, concerns`;

    const matchAnalysis = await ai.generateResponse(userPrompt, {
      systemPrompt,
      maxTokens: 1000,
      preferSpeed: true
    });

    res.json({
      contact_id: id,
      contact_name: contact.full_name,
      projects_analyzed: projects.length,
      ai_provider: matchAnalysis.provider,
      matches: matchAnalysis.response,
      cost: '$0 (FREE with Groq)'
    });

  } catch (error) {
    console.error('❌ Project matching failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI EMAIL DRAFTING
// ============================================================================

app.post('/api/contacts/:id/draft-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose, context = '', tone = 'professional' } = req.body;

    // Get contact
    const { data: contact } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', id)
      .single();

    console.log(`✉️ Drafting email to ${contact.full_name}...`);

    const systemPrompt = `You are an expert at writing personalized, authentic outreach emails for community collaboration and projects.`;

    const userPrompt = `Draft a ${tone} email to:

**Recipient:**
- Name: ${contact.full_name}
- Position: ${contact.current_position || 'Unknown'}
- Company: ${contact.current_company || 'Unknown'}
- Location: ${contact.location || 'Unknown'}

**Purpose:** ${purpose || 'General introduction and exploring collaboration'}

**Context:** ${context || 'No specific context provided'}

**Requirements:**
- Personalized based on their background
- Authentic and values-aligned (not corporate/salesy)
- Clear call to action
- Appropriate length (200-300 words)
- Subject line included

Return as JSON with: subject, body, callToAction, timing_recommendation`;

    const emailDraft = await ai.generateResponse(userPrompt, {
      systemPrompt,
      maxTokens: 800,
      temperature: 0.8,
      preferSpeed: true
    });

    res.json({
      contact_id: id,
      recipient: contact.full_name,
      recipient_email: contact.email_address || 'Email not found - needs discovery first',
      draft: emailDraft.response,
      ai_provider: emailDraft.provider,
      cost: '$0 (FREE)'
    });

  } catch (error) {
    console.error('❌ Email drafting failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SYSTEM STATUS
// ============================================================================

app.get('/api/status', async (req, res) => {
  try {
    const aiStatus = await ai.getProviderStatus();
    const researchHealth = await researcher.checkHealth();

    res.json({
      service: 'Contact Intelligence Hub - AI Enhanced',
      status: 'online',
      ai_providers: aiStatus,
      research_providers: researchHealth,
      features: {
        contact_enrichment: '✅ Real AI analysis with Groq/Claude',
        research: `✅ ${researchHealth.primary} (${researchHealth.ai} AI)`,
        project_matching: '✅ AI-powered skill/experience analysis',
        email_drafting: '✅ Personalized outreach generation',
        cost: '$0 for most operations (FREE tiers)'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 Contact Intelligence Hub - AI ENHANCED');
  console.log(`${'='.repeat(60)}`);
  console.log(`\n   📡 Server: http://localhost:${PORT}`);
  console.log(`   🧠 AI Status: http://localhost:${PORT}/api/status`);
  console.log(`\n   Available Endpoints:`);
  console.log(`   POST /api/contacts/:id/enrich - AI enrichment`);
  console.log(`   POST /api/contacts/:id/match-projects - Project matching`);
  console.log(`   POST /api/contacts/:id/draft-email - Email generation`);
  console.log(`\n   💡 All powered by FREE cloud AI (Groq + Tavily)`);
  console.log(`${'='.repeat(60)}\n`);
});
