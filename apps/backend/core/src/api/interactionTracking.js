import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Add new interaction
router.post('/interactions', async (req, res) => {
  try {
    const {
      contact_id,
      interaction_type,
      notes,
      interaction_date = new Date(),
      outcome
    } = req.body;

    // Validate required fields
    if (!contact_id || !interaction_type) {
      return res.status(400).json({
        error: 'contact_id and interaction_type are required'
      });
    }

    // Insert interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('linkedin_interactions')
      .insert({
        contact_id,
        interaction_type, // email, meeting, call, social, message
        interaction_date,
        notes,
        outcome, // positive, neutral, negative
        created_at: new Date()
      })
      .select()
      .single();

    if (interactionError) {
      console.error('Error creating interaction:', interactionError);
      return res.status(500).json({ error: 'Failed to create interaction' });
    }

    // Update contact's last interaction and increment count
    const { error: updateError } = await supabase
      .from('linkedin_contacts')
      .update({
        last_interaction: interaction_date,
        interaction_count: supabase.sql`interaction_count + 1`,
        updated_at: new Date()
      })
      .eq('id', contact_id);

    if (updateError) {
      console.error('Error updating contact:', updateError);
    }

    res.json({
      success: true,
      interaction,
      message: 'Interaction logged successfully'
    });

  } catch (error) {
    console.error('Interaction tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interactions for a contact
router.get('/contacts/:id/interactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const { data: interactions, error } = await supabase
      .from('linkedin_interactions')
      .select('*')
      .eq('contact_id', id)
      .order('interaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching interactions:', error);
      return res.status(500).json({ error: 'Failed to fetch interactions' });
    }

    res.json({
      interactions,
      total: interactions.length
    });

  } catch (error) {
    console.error('Fetch interactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick interaction endpoints for common actions
router.post('/quick-interactions/email-sent', async (req, res) => {
  try {
    const { contact_id, subject, notes } = req.body;

    const { data, error } = await supabase
      .from('linkedin_interactions')
      .insert({
        contact_id,
        interaction_type: 'email',
        notes: `Email sent: ${subject}${notes ? ' - ' + notes : ''}`,
        outcome: 'positive',
        interaction_date: new Date(),
        created_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    // Update contact
    await supabase
      .from('linkedin_contacts')
      .update({
        last_interaction: new Date(),
        interaction_count: supabase.sql`interaction_count + 1`
      })
      .eq('id', contact_id);

    res.json({ success: true, interaction: data });
  } catch (error) {
    console.error('Quick email tracking error:', error);
    res.status(500).json({ error: 'Failed to log email' });
  }
});

router.post('/quick-interactions/meeting-scheduled', async (req, res) => {
  try {
    const { contact_id, meeting_date, notes } = req.body;

    const { data, error } = await supabase
      .from('linkedin_interactions')
      .insert({
        contact_id,
        interaction_type: 'meeting',
        notes: `Meeting scheduled for ${meeting_date}${notes ? ' - ' + notes : ''}`,
        outcome: 'positive',
        interaction_date: new Date(),
        created_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    // Update contact
    await supabase
      .from('linkedin_contacts')
      .update({
        last_interaction: new Date(),
        interaction_count: supabase.sql`interaction_count + 1`
      })
      .eq('id', contact_id);

    res.json({ success: true, interaction: data });
  } catch (error) {
    console.error('Quick meeting tracking error:', error);
    res.status(500).json({ error: 'Failed to log meeting' });
  }
});

// Get overdue contacts for follow-up alerts
router.get('/overdue-contacts', async (req, res) => {
  try {
    const { days = 30, strategic_value, limit = 100 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let query = supabase
      .from('linkedin_contacts')
      .select(`
        id,
        first_name,
        last_name,
        current_company,
        current_position,
        strategic_value,
        relationship_score,
        last_interaction,
        interaction_count
      `)
      .or(`last_interaction.lt.${cutoffDate.toISOString()},last_interaction.is.null`)
      .order('strategic_value', { ascending: false })
      .order('relationship_score', { ascending: false })
      .limit(limit);

    if (strategic_value) {
      query = query.eq('strategic_value', strategic_value);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching overdue contacts:', error);
      return res.status(500).json({ error: 'Failed to fetch overdue contacts' });
    }

    // Calculate days overdue
    const contactsWithDays = contacts.map(contact => ({
      ...contact,
      days_overdue: contact.last_interaction
        ? Math.floor((new Date() - new Date(contact.last_interaction)) / (1000 * 60 * 60 * 24))
        : 999 // No interaction ever
    }));

    res.json({
      contacts: contactsWithDays,
      total: contactsWithDays.length,
      cutoff_date: cutoffDate
    });

  } catch (error) {
    console.error('Overdue contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk mark as contacted
router.post('/bulk-mark-contacted', async (req, res) => {
  try {
    const { contact_ids, interaction_type = 'outreach', notes } = req.body;

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return res.status(400).json({ error: 'contact_ids array is required' });
    }

    // Create interactions for all contacts
    const interactions = contact_ids.map(contact_id => ({
      contact_id,
      interaction_type,
      notes: notes || 'Bulk outreach',
      outcome: 'positive',
      interaction_date: new Date(),
      created_at: new Date()
    }));

    const { data: createdInteractions, error: interactionError } = await supabase
      .from('linkedin_interactions')
      .insert(interactions)
      .select();

    if (interactionError) {
      console.error('Error creating bulk interactions:', interactionError);
      return res.status(500).json({ error: 'Failed to create interactions' });
    }

    // Update all contacts
    const { error: updateError } = await supabase
      .from('linkedin_contacts')
      .update({
        last_interaction: new Date(),
        interaction_count: supabase.sql`interaction_count + 1`,
        updated_at: new Date()
      })
      .in('id', contact_ids);

    if (updateError) {
      console.error('Error updating contacts:', updateError);
    }

    res.json({
      success: true,
      interactions_created: createdInteractions.length,
      message: `Successfully logged interactions for ${contact_ids.length} contacts`
    });

  } catch (error) {
    console.error('Bulk mark contacted error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;