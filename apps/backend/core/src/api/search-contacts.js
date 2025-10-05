/**
 * Search Contacts API - Check for specific contacts in database
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zwwdyjqjsnlmjnchcnze.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3d2R5anFqc25sbWpuY2hjbnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2ODE3MjEsImV4cCI6MjA0MTI1NzcyMX0.sSHKDHgYUTUu7_7Ue1vr6kHyKnNyTG0fI2dxkUNmIng'
);

/**
 * GET /api/search-contacts
 * Search for contacts by name
 */
router.get('/', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name parameter is required'
      });
    }

    const { data: contacts, error } = await supabase
      .from('linkedin_contacts')
      .select('name, current_company, industry, strategic_value, relationship_score')
      .ilike('name', `%${name}%`)
      .limit(5);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        query: name,
        found: contacts.length > 0,
        contacts: contacts || []
      }
    });

  } catch (error) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/search-contacts/bulk
 * Search for multiple contacts at once
 */
router.post('/bulk', async (req, res) => {
  try {
    const { names } = req.body;

    if (!Array.isArray(names)) {
      return res.status(400).json({
        success: false,
        error: 'Names must be an array'
      });
    }

    const results = [];

    for (const name of names) {
      const { data: contacts, error } = await supabase
        .from('linkedin_contacts')
        .select('name, current_company, industry, strategic_value, relationship_score')
        .ilike('name', `%${name}%`)
        .limit(3);

      results.push({
        query: name,
        found: !error && contacts && contacts.length > 0,
        contacts: contacts || [],
        error: error?.message
      });
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Bulk search contacts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;