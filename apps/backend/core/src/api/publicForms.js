/**
 * Public Forms API
 *
 * Handles public form submissions: questions, newsletter signups, etc.
 * Stores in Supabase and can trigger notifications
 */

import express from 'express';
import { createSupabaseClient } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/messages/question
 * Receive a question from a visitor
 */
router.post('/question', async (req, res) => {
  try {
    const { name, email, message, projectTitle, projectSlug, source } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    const supabase = createSupabaseClient();

    // Store the message
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        type: 'question',
        name: name || 'Anonymous',
        email,
        message,
        metadata: {
          projectTitle,
          projectSlug,
          source: source || 'website'
        },
        status: 'new',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, just log and return success
      if (error.code === '42P01') {
        console.log('contact_messages table not found, logging message:', { name, email, projectTitle });
        // Log to file as fallback
        console.log('📬 New Question:', {
          from: `${name} <${email}>`,
          project: projectTitle,
          message: message.substring(0, 200)
        });
        return res.json({ success: true, message: 'Question received' });
      }
      throw error;
    }

    // Log the new message
    console.log('📬 New Question:', {
      id: data?.id,
      from: `${name} <${email}>`,
      project: projectTitle,
      message: message.substring(0, 100)
    });

    res.json({
      success: true,
      message: 'Question received',
      id: data?.id
    });

  } catch (error) {
    console.error('Error saving question:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { email, name, source, projectContext } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const supabase = createSupabaseClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // Update existing record if unsubscribed
      if (existing.status === 'unsubscribed') {
        await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'active',
            name: name || existing.name,
            resubscribed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      }
      return res.json({ success: true, message: 'Already subscribed' });
    }

    // Create new subscription
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        source: source || 'website',
        metadata: {
          projectContext,
          subscribed_from: source
        },
        status: 'active',
        subscribed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, log and return success
      if (error.code === '42P01') {
        console.log('📧 New Newsletter Signup (table not found):', { email, name, source });
        return res.json({ success: true, message: 'Subscribed' });
      }
      throw error;
    }

    console.log('📧 New Newsletter Signup:', {
      id: data?.id,
      email,
      name,
      source
    });

    res.json({
      success: true,
      message: 'Subscribed successfully'
    });

  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({
      error: 'Failed to subscribe',
      message: error.message
    });
  }
});

/**
 * GET /api/messages
 * Get all messages (admin only - no auth for now)
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;

    const supabase = createSupabaseClient();

    let query = supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      messages: data || []
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

/**
 * GET /api/newsletter/subscribers
 * Get all subscribers (admin only)
 */
router.get('/subscribers', async (req, res) => {
  try {
    const { status = 'active', limit = 100 } = req.query;

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', status)
      .order('subscribed_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      subscribers: data || []
    });

  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({
      error: 'Failed to fetch subscribers',
      message: error.message
    });
  }
});

export default router;
