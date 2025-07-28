#!/usr/bin/env node

/**
 * ACT Public Dashboard Backend Server
 * Connects to existing Empathy Ledger database
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import empathyLedgerService from './services/empathyLedgerService.js';
import platformMediaRouter from './api/platform-media.js';
import notionProxyRouter from './api/notion-proxy.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection by checking stories table
    const { data, error } = await supabase
      .from('stories')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      empathy_ledger: 'accessible'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes

// Homepage data (combines existing Empathy Ledger data)
app.get('/api/homepage', async (req, res) => {
  try {
    // Get stories from existing Empathy Ledger
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .neq('privacy_level', 'private')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (storiesError) throw storiesError;

    // Get stats from existing data
    const stats = await empathyLedgerService.getEmpathyLedgerStats();
    
    // Format response
    const homepageData = {
      featured_stories: stories?.map(story => ({
        id: story.id,
        title: story.title,
        excerpt: story.summary || story.content?.substring(0, 150) + '...' || '',
        author: story.storyteller_id, // We'll need to join with storytellers later
        published_at: story.created_at,
        image_url: story.story_image_url,
        tags: story.themes || []
      })) || [],
      
      key_metrics: [
        {
          label: 'Community Stories',
          value: stats.total_stories,
          unit: 'stories',
          icon: '📚'
        },
        {
          label: 'AI Insights',
          value: stats.ai_insights,
          unit: 'insights',
          icon: '🤖'
        },
        {
          label: 'Active Themes',
          value: stats.active_themes,
          unit: 'themes',
          icon: '🎯'
        },
        {
          label: 'Partner Organizations',
          value: stats.partner_organizations,
          unit: 'partners',
          icon: '🤝'
        }
      ],
      
      active_projects: [], // Will populate when we add projects table
      featured_partners: [] // Will populate when we add partners table
    };
    
    res.json(homepageData);
    
  } catch (error) {
    console.error('Homepage API error:', error);
    res.status(500).json({
      error: 'Failed to load homepage data',
      message: error.message
    });
  }
});

// Stories endpoint
app.get('/api/stories', async (req, res) => {
  try {
    const { limit = 10, featured, tags } = req.query;
    
    let query = supabase
      .from('stories')
      .select('*')
      .neq('privacy_level', 'private')
      .order('created_at', { ascending: false });
    
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    
    if (tags) {
      const tagArray = tags.split(',');
      query = query.overlaps('themes', tagArray);
    }
    
    query = query.limit(parseInt(limit));
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      stories: data || [],
      total: data?.length || 0
    });
    
  } catch (error) {
    console.error('Stories API error:', error);
    res.status(500).json({
      error: 'Failed to load stories',
      message: error.message
    });
  }
});

// Themes endpoint
app.get('/api/themes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) throw error;
    
    res.json(data || []);
    
  } catch (error) {
    console.error('Themes API error:', error);
    res.status(500).json({
      error: 'Failed to load themes',
      message: error.message
    });
  }
});

// Organizations endpoint  
app.get('/api/organizations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    res.json(data || []);
    
  } catch (error) {
    console.error('Organizations API error:', error);
    res.status(500).json({
      error: 'Failed to load organizations',
      message: error.message
    });
  }
});

// Storytellers endpoint
app.get('/api/storytellers', async (req, res) => {
  try {
    const { active_only, with_stories } = req.query;
    
    let query = supabase
      .from('storytellers')
      .select('*')
      .order('full_name');
    
    if (active_only === 'true') {
      query = query.eq('consent_given', true);
    }
    
    if (with_stories === 'true') {
      // Only include storytellers who have published stories
      query = query.not('story_count', 'is', null).gt('story_count', 0);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data || []);
    
  } catch (error) {
    console.error('Storytellers API error:', error);
    res.status(500).json({
      error: 'Failed to load storytellers',
      message: error.message
    });
  }
});

// Newsletter signup (will need to create table later)
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, first_name, last_name, interests } = req.body;
    
    // For now, just log the signup until we create the table
    console.log('Newsletter signup:', { email, first_name, last_name, interests });
    
    res.json({ 
      success: true, 
      message: 'Thank you for subscribing! (Currently logging to console - table will be created soon)' 
    });
    
  } catch (error) {
    console.error('Newsletter signup error:', error);
    res.status(500).json({
      error: 'Failed to process subscription',
      message: error.message
    });
  }
});

// Contact form (will need to create table later)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, organization, inquiry_type, subject, message } = req.body;
    
    // For now, just log the inquiry until we create the table
    console.log('Contact inquiry:', { name, email, organization, inquiry_type, subject, message });
    
    res.json({ 
      success: true, 
      message: 'Thank you for your inquiry! We will get back to you soon. (Currently logging to console - table will be created soon)' 
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      error: 'Failed to process inquiry',
      message: error.message
    });
  }
});

// Platform Media Management API Routes
app.use('/api/platform', platformMediaRouter);

// Notion Integration API Routes
app.use('/api/notion', notionProxyRouter);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ACT Backend Server started!`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🗄️  Connected to Empathy Ledger database`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`\n📊 Available endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /api/homepage        - Homepage data`);
  console.log(`   GET  /api/stories         - Community stories`);
  console.log(`   GET  /api/themes          - Story themes`);
  console.log(`   GET  /api/organizations   - Partner organizations`);
  console.log(`   GET  /api/storytellers    - Community storytellers`);
  console.log(`   POST /api/newsletter/subscribe - Newsletter signup`);
  console.log(`   POST /api/contact         - Contact form`);
  console.log(`\n📸 Platform Media Management endpoints:`);
  console.log(`   GET  /api/platform/health - Platform health check`);
  console.log(`   GET  /api/platform/act/info - ACT organization info`);
  console.log(`   GET  /api/platform/act/items - Browse ACT media library`);
  console.log(`   POST /api/platform/act/upload - Upload ACT photos/videos`);
  console.log(`   GET  /api/platform/act/collections - Manage ACT galleries`);
  console.log(`\n🤝 Collaborative Partner Integration:`);
  console.log(`   GET  /api/notion/health - Notion connection status`);
  console.log(`   GET  /api/notion/partners - Partner data (Notion + fallback)`);
  console.log(`\n🚜 Ready to deploy ACT's revolutionary platform trial!\n`);
});

export default app;