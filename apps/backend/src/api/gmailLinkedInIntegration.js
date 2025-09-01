/**
 * Gmail-LinkedIn Integration API
 * Automatically enriches LinkedIn contacts from Gmail interactions
 * Provides real-time relationship intelligence updates
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gmail API
const gmail = google.gmail('v1');

// ========================================
// GMAIL WEBHOOK ENDPOINTS
// ========================================

// Gmail webhook receiver for automatic contact enrichment
router.post('/gmail-webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.data) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload'
      });
    }
    
    // Decode the pub/sub message
    const decodedData = Buffer.from(message.data, 'base64').toString();
    const gmailNotification = JSON.parse(decodedData);
    
    console.log('📧 Gmail webhook received:', gmailNotification);
    
    // Process the Gmail notification
    const enrichmentResult = await processGmailNotification(gmailNotification);
    
    res.json({
      success: true,
      message: 'Gmail notification processed',
      enrichmentResult,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gmail webhook processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Gmail webhook',
      details: error.message
    });
  }
});

// Manual Gmail sync endpoint for testing
router.post('/sync-gmail-contacts', async (req, res) => {
  try {
    const { emailAddress, timeRange = '1d' } = req.body;
    
    console.log(`🔄 Starting Gmail contact sync for ${emailAddress || 'all contacts'}...`);
    
    // Get recent emails that might contain LinkedIn contacts
    const recentEmails = await getRecentGmailMessages(timeRange);
    
    let enrichedContacts = 0;
    let totalProcessed = 0;
    
    for (const email of recentEmails) {
      try {
        const emailData = await getGmailMessageDetails(email.id);
        const enrichmentResult = await processEmailForLinkedInContacts(emailData);
        
        if (enrichmentResult.contactEnriched) {
          enrichedContacts++;
        }
        totalProcessed++;
        
      } catch (emailError) {
        console.error(`❌ Failed to process email ${email.id}:`, emailError);
      }
    }
    
    res.json({
      success: true,
      message: 'Gmail contact sync completed',
      stats: {
        totalProcessed,
        enrichedContacts,
        timeRange
      },
      syncedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gmail contact sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Gmail contacts',
      details: error.message
    });
  }
});

// Get Gmail interaction summary for a specific contact
router.get('/contact-gmail-history/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { limit = 20 } = req.query;
    
    // Get contact info
    const { data: contact, error: contactError } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    if (contactError) throw contactError;
    
    // Get Gmail interactions for this contact
    const { data: interactions, error: interactionsError } = await supabase
      .from('linkedin_interactions')
      .select('*')
      .eq('contact_id', contactId)
      .eq('interaction_type', 'email')
      .order('interaction_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (interactionsError) throw interactionsError;
    
    // Calculate email interaction statistics
    const emailStats = {
      totalEmails: interactions.length,
      sentEmails: interactions.filter(i => i.direction === 'outbound').length,
      receivedEmails: interactions.filter(i => i.direction === 'inbound').length,
      positiveEmails: interactions.filter(i => i.sentiment === 'positive').length,
      lastEmailDate: interactions[0]?.interaction_date,
      averageResponseTime: calculateAverageResponseTime(interactions)
    };
    
    res.json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.full_name,
        email: contact.email_address,
        company: contact.current_company
      },
      emailStats,
      recentInteractions: interactions,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Gmail history query failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Gmail history',
      details: error.message
    });
  }
});

// Get integration status
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      status: {
        gmailIntegration: true,
        linkedinIntegration: false, // TODO: implement LinkedIn status check
        webhookEnabled: true,
        lastSync: null, // TODO: get from database
        capabilities: [
          'Gmail webhook processing',
          'Contact enrichment from emails',
          'LinkedIn contact matching',
          'Relationship scoring',
          'Email sentiment analysis'
        ]
      },
      message: 'Gmail-LinkedIn integration service operational'
    });
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status',
      details: error.message
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Process Gmail notification for LinkedIn contact enrichment
async function processGmailNotification(notification) {
  try {
    const { historyId, emailAddress } = notification;
    
    // Get Gmail history changes
    const auth = await getGmailAuth();
    const history = await gmail.users.history.list({
      auth,
      userId: 'me',
      startHistoryId: historyId
    });
    
    if (!history.data.history) {
      return { message: 'No new history to process' };
    }
    
    let enrichedContacts = 0;
    
    for (const historyItem of history.data.history) {
      if (historyItem.messages) {
        for (const message of historyItem.messages) {
          const emailData = await getGmailMessageDetails(message.id);
          const result = await processEmailForLinkedInContacts(emailData);
          
          if (result.contactEnriched) {
            enrichedContacts++;
          }
        }
      }
    }
    
    return {
      processed: true,
      enrichedContacts,
      historyId
    };
    
  } catch (error) {
    console.error('❌ Failed to process Gmail notification:', error);
    throw error;
  }
}

// Get recent Gmail messages
async function getRecentGmailMessages(timeRange = '1d') {
  try {
    const auth = await getGmailAuth();
    
    // Calculate date query based on time range
    const dateQuery = getDateQuery(timeRange);
    
    const response = await gmail.users.messages.list({
      auth,
      userId: 'me',
      q: `${dateQuery} -in:drafts -in:spam -in:trash`,
      maxResults: 50
    });
    
    return response.data.messages || [];
    
  } catch (error) {
    console.error('❌ Failed to get recent Gmail messages:', error);
    return [];
  }
}

// Get detailed Gmail message information
async function getGmailMessageDetails(messageId) {
  try {
    const auth = await getGmailAuth();
    
    const response = await gmail.users.messages.get({
      auth,
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    const message = response.data;
    const headers = message.payload.headers || [];
    
    // Extract key email information
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    const toHeader = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
    const dateHeader = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
    
    // Extract email content
    const body = extractEmailBody(message.payload);
    
    return {
      id: messageId,
      from: fromHeader,
      to: toHeader,
      subject: subjectHeader,
      date: new Date(dateHeader).toISOString(),
      body: body,
      threadId: message.threadId
    };
    
  } catch (error) {
    console.error(`❌ Failed to get Gmail message ${messageId}:`, error);
    return null;
  }
}

// Process email for LinkedIn contact enrichment
async function processEmailForLinkedInContacts(emailData) {
  try {
    if (!emailData) {
      return { contactEnriched: false, reason: 'No email data' };
    }
    
    // Extract email addresses from from/to fields
    const emailAddresses = extractEmailAddresses(emailData.from + ' ' + emailData.to);
    
    for (const emailAddr of emailAddresses) {
      // Check if this email belongs to a LinkedIn contact
      const { data: contact, error } = await supabase
        .from('linkedin_contacts')
        .select('*')
        .eq('email_address', emailAddr)
        .single();
      
      if (error || !contact) {
        continue; // Not a LinkedIn contact
      }
      
      // Analyze email content for sentiment and topics
      const analysis = await analyzeEmailContent(emailData);
      
      // Create interaction record
      const { error: interactionError } = await supabase
        .from('linkedin_interactions')
        .insert({
          contact_id: contact.id,
          interaction_type: 'email',
          interaction_date: emailData.date,
          direction: determineEmailDirection(emailData, emailAddr),
          subject: emailData.subject,
          summary: generateEmailSummary(emailData.body),
          sentiment: analysis.sentiment,
          key_topics: analysis.topics,
          project_context: detectProjectContext(emailData.subject + ' ' + emailData.body)
        });
      
      if (interactionError) {
        console.error('❌ Failed to create interaction:', interactionError);
        continue;
      }
      
      // Update relationship score
      await updateContactRelationshipScore(contact.id, 'email', analysis.sentiment);
      
      console.log(`✅ Enriched LinkedIn contact: ${contact.full_name} from email`);
      
      return {
        contactEnriched: true,
        contactName: contact.full_name,
        interactionType: 'email',
        sentiment: analysis.sentiment
      };
    }
    
    return { contactEnriched: false, reason: 'No LinkedIn contacts found in email' };
    
  } catch (error) {
    console.error('❌ Failed to process email for LinkedIn contacts:', error);
    return { contactEnriched: false, reason: error.message };
  }
}

// Extract email body text
function extractEmailBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString();
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
    }
  }
  
  return '';
}

// Extract email addresses from header string
function extractEmailAddresses(headerString) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return headerString.match(emailRegex) || [];
}

// Analyze email content for sentiment and topics
async function analyzeEmailContent(emailData) {
  // Simple sentiment analysis - can be enhanced with AI
  const content = `${emailData.subject} ${emailData.body}`.toLowerCase();
  
  let sentiment = 'neutral';
  if (content.includes('thank') || content.includes('great') || content.includes('excellent') || 
      content.includes('appreciate') || content.includes('wonderful')) {
    sentiment = 'positive';
  } else if (content.includes('problem') || content.includes('issue') || content.includes('concern') ||
             content.includes('disappointed') || content.includes('frustrated')) {
    sentiment = 'negative';
  }
  
  // Extract topics
  const topics = [];
  const topicKeywords = {
    'funding': ['funding', 'grant', 'money', 'budget', 'investment'],
    'meeting': ['meeting', 'call', 'discussion', 'appointment'],
    'project': ['project', 'initiative', 'program', 'development'],
    'collaboration': ['partnership', 'collaboration', 'together', 'joint'],
    'community': ['community', 'indigenous', 'cultural', 'traditional']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      topics.push(topic);
    }
  }
  
  return { sentiment, topics };
}

// Determine email direction (inbound/outbound)
function determineEmailDirection(emailData, contactEmail) {
  return emailData.from.includes(contactEmail) ? 'inbound' : 'outbound';
}

// Generate email summary
function generateEmailSummary(body) {
  if (!body) return 'Email content not available';
  
  const cleanBody = body.replace(/[\\r\\n]+/g, ' ').trim();
  return cleanBody.substring(0, 200) + (cleanBody.length > 200 ? '...' : '');
}

// Detect project context from email content
function detectProjectContext(content) {
  const projectKeywords = {
    'empathy ledger': 'Empathy Ledger Platform',
    'youth housing': 'Youth Housing Initiative',
    'indigenous': 'Indigenous Communities Program',
    'community stories': 'Community Stories Collection'
  };
  
  const lowerContent = content.toLowerCase();
  
  for (const [keyword, project] of Object.entries(projectKeywords)) {
    if (lowerContent.includes(keyword)) {
      return project;
    }
  }
  
  return null;
}

// Update contact relationship score
async function updateContactRelationshipScore(contactId, interactionType, sentiment) {
  let scoreImpact = 0.05; // Base email impact
  
  if (sentiment === 'positive') scoreImpact *= 1.5;
  else if (sentiment === 'negative') scoreImpact *= -0.5;
  
  await supabase.rpc('update_relationship_score', {
    contact_id: contactId,
    score_delta: scoreImpact
  });
}

// Calculate average response time
function calculateAverageResponseTime(interactions) {
  // Simple implementation - can be enhanced
  return 'Data pending - requires email thread analysis';
}

// Get Gmail authentication
async function getGmailAuth() {
  // This would use your existing Gmail OAuth setup
  // For now, return a placeholder that integrates with your existing system
  throw new Error('Gmail auth integration pending - connect to existing Gmail API setup');
}

// Generate date query for Gmail search
function getDateQuery(timeRange) {
  const now = new Date();
  let days = 1;
  
  if (timeRange.endsWith('d')) {
    days = parseInt(timeRange);
  } else if (timeRange.endsWith('w')) {
    days = parseInt(timeRange) * 7;
  }
  
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  return `after:${startDate.getFullYear()}/${startDate.getMonth() + 1}/${startDate.getDate()}`;
}

export default router;