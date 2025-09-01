/**
 * Notion-LinkedIn Integration API
 * Automatically suggests LinkedIn contacts for Notion projects
 * Provides real-time contact recommendations and project linking
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Note: Notion client will be added when package is properly installed

// ========================================
// NOTION PROJECT INTEGRATION ENDPOINTS
// ========================================

// Get AI-powered contact recommendations for a new project
router.post('/recommend-contacts-for-project', async (req, res) => {
  try {
    const { 
      projectTitle, 
      projectDescription, 
      targetSkills = [], 
      requiredExpertise = [],
      projectType = 'general',
      budgetRange,
      timeline 
    } = req.body;
    
    if (!projectTitle) {
      return res.status(400).json({
        success: false,
        error: 'Project title is required'
      });
    }
    
    console.log(`🔍 Finding LinkedIn contacts for project: ${projectTitle}`);
    
    // Analyze project requirements and find matching contacts
    const recommendations = await findMatchingLinkedInContacts({
      projectTitle,
      projectDescription,
      targetSkills,
      requiredExpertise,
      projectType,
      budgetRange,
      timeline
    });
    
    // Score and rank recommendations
    const rankedRecommendations = await scoreAndRankRecommendations(recommendations, {
      projectTitle,
      projectDescription,
      projectType
    });
    
    res.json({
      success: true,
      project: {
        title: projectTitle,
        type: projectType,
        description: projectDescription
      },
      recommendations: rankedRecommendations,
      totalMatches: rankedRecommendations.length,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Project contact recommendations failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate contact recommendations',
      details: error.message
    });
  }
});

// Create Notion project with automatic LinkedIn contact linking
router.post('/create-project-with-contacts', async (req, res) => {
  try {
    const {
      notionDatabaseId,
      projectTitle,
      projectDescription,
      recommendedContacts = [],
      autoLinkTopContacts = true,
      linkThreshold = 0.7
    } = req.body;
    
    if (!notionDatabaseId || !projectTitle) {
      return res.status(400).json({
        success: false,
        error: 'Notion database ID and project title are required'
      });
    }
    
    console.log(`📋 Creating Notion project: ${projectTitle} with LinkedIn integration`);
    
    // Create the Notion project
    const notionProject = await createNotionProject({
      databaseId: notionDatabaseId,
      title: projectTitle,
      description: projectDescription,
      contacts: recommendedContacts
    });
    
    let linkedContacts = [];
    
    if (autoLinkTopContacts && recommendedContacts.length > 0) {
      // Automatically link high-scoring contacts
      for (const contact of recommendedContacts) {
        if (contact.relevanceScore >= linkThreshold) {
          const linkResult = await linkContactToProject({
            contactId: contact.id,
            notionProjectId: notionProject.id,
            projectName: projectTitle,
            connectionType: contact.suggestedRole || 'stakeholder',
            relevanceScore: contact.relevanceScore,
            potentialRole: contact.recommendedRole,
            autoLinked: true
          });
          
          if (linkResult.success) {
            linkedContacts.push(linkResult.projectConnection);
          }
        }
      }
    }
    
    res.json({
      success: true,
      notionProject: {
        id: notionProject.id,
        title: projectTitle,
        url: notionProject.url
      },
      linkedContacts: linkedContacts.length,
      contactDetails: linkedContacts,
      createdAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Notion project creation with contacts failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Notion project with contacts',
      details: error.message
    });
  }
});

// Sync existing Notion project with LinkedIn contact recommendations
router.post('/sync-notion-project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { refreshRecommendations = true } = req.body;
    
    console.log(`🔄 Syncing Notion project ${projectId} with LinkedIn contacts`);
    
    // Get Notion project details
    const notionProject = await getNotionProject(projectId);
    
    if (!notionProject) {
      return res.status(404).json({
        success: false,
        error: 'Notion project not found'
      });
    }
    
    // Generate fresh contact recommendations
    const recommendations = await findMatchingLinkedInContacts({
      projectTitle: notionProject.title,
      projectDescription: notionProject.description,
      projectType: notionProject.type || 'general'
    });
    
    // Get existing LinkedIn connections for this project
    const { data: existingConnections, error: connectionsError } = await supabase
      .from('linkedin_project_connections')
      .select('*')
      .eq('notion_project_id', projectId);
    
    if (connectionsError) throw connectionsError;
    
    // Update Notion project with latest contact recommendations
    await updateNotionProjectWithContacts(projectId, recommendations);
    
    res.json({
      success: true,
      project: {
        id: projectId,
        title: notionProject.title,
        description: notionProject.description
      },
      existingConnections: existingConnections.length,
      newRecommendations: recommendations.length,
      recommendations: recommendations.slice(0, 10), // Top 10
      syncedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Notion project sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Notion project',
      details: error.message
    });
  }
});

// Get LinkedIn contact insights for existing Notion project
router.get('/project-contact-insights/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project connections from LinkedIn relationship intelligence
    const { data: projectConnections, error: connectionsError } = await supabase
      .from('vw_project_contact_recommendations')
      .select('*')
      .eq('notion_project_id', projectId);
    
    if (connectionsError) throw connectionsError;
    
    // Get interaction statistics for connected contacts
    const contactInsights = await generateContactInsights(projectConnections);
    
    res.json({
      success: true,
      projectId,
      totalConnections: projectConnections.length,
      connections: projectConnections,
      insights: contactInsights,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Project contact insights failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project contact insights',
      details: error.message
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Find matching LinkedIn contacts for project requirements
async function findMatchingLinkedInContacts(projectRequirements) {
  try {
    const {
      projectTitle,
      projectDescription,
      targetSkills,
      requiredExpertise,
      projectType
    } = projectRequirements;
    
    // Build search criteria based on project requirements
    const searchCriteria = buildSearchCriteria(projectRequirements);
    
    // Query LinkedIn contacts with relevance scoring
    const { data: contacts, error } = await supabase
      .from('linkedin_contacts')
      .select('*')
      .or(searchCriteria)
      .gte('relationship_score', 0.3) // Minimum relationship threshold
      .order('relationship_score', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Score each contact for project relevance
    const scoredContacts = contacts.map(contact => ({
      ...contact,
      relevanceScore: calculateProjectRelevance(contact, projectRequirements),
      suggestedRole: suggestContactRole(contact, projectRequirements),
      recommendedRole: generateRecommendedRole(contact, projectRequirements),
      matchingFactors: identifyMatchingFactors(contact, projectRequirements)
    }));
    
    // Filter and sort by relevance
    return scoredContacts
      .filter(contact => contact.relevanceScore > 0.4)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
  } catch (error) {
    console.error('❌ Failed to find matching LinkedIn contacts:', error);
    return [];
  }
}

// Build Supabase search criteria from project requirements
function buildSearchCriteria(requirements) {
  const criteria = [];
  
  // Search by alignment tags
  const relevantTags = extractRelevantTags(requirements);
  if (relevantTags.length > 0) {
    criteria.push(`alignment_tags.ov.{${relevantTags.join(',')}}`);
  }
  
  // Search by strategic value
  criteria.push(`strategic_value.in.(high,medium)`);
  
  // Search by industry keywords in position/company
  const industryKeywords = extractIndustryKeywords(requirements);
  if (industryKeywords.length > 0) {
    for (const keyword of industryKeywords) {
      criteria.push(`current_position.ilike.%${keyword}%`);
      criteria.push(`current_company.ilike.%${keyword}%`);
    }
  }
  
  return criteria.join(',');
}

// Extract relevant alignment tags from project requirements
function extractRelevantTags(requirements) {
  const { projectTitle, projectDescription, projectType } = requirements;
  const content = `${projectTitle} ${projectDescription} ${projectType}`.toLowerCase();
  
  const tagMappings = {
    'indigenous': ['indigenous', 'aboriginal', 'cultural', 'traditional'],
    'government': ['government', 'policy', 'regulatory', 'public sector'],
    'funding': ['funding', 'grant', 'investment', 'financial'],
    'community_services': ['community', 'social', 'housing', 'education', 'health'],
    'leadership': ['leadership', 'executive', 'management', 'strategic'],
    'youth': ['youth', 'young', 'student', 'education'],
    'social_impact': ['impact', 'charity', 'nonprofit', 'foundation']
  };
  
  const relevantTags = [];
  
  for (const [tag, keywords] of Object.entries(tagMappings)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      relevantTags.push(tag);
    }
  }
  
  return relevantTags;
}

// Extract industry keywords from project requirements
function extractIndustryKeywords(requirements) {
  const { projectTitle, projectDescription, requiredExpertise = [] } = requirements;
  const content = `${projectTitle} ${projectDescription} ${requiredExpertise.join(' ')}`.toLowerCase();
  
  const industryKeywords = [
    'technology', 'software', 'digital', 'platform',
    'community', 'social', 'cultural', 'indigenous',
    'government', 'policy', 'public', 'council',
    'education', 'training', 'development', 'capacity',
    'health', 'housing', 'youth', 'family',
    'environment', 'sustainability', 'conservation',
    'finance', 'funding', 'investment', 'grant'
  ];
  
  return industryKeywords.filter(keyword => content.includes(keyword));
}

// Calculate project relevance score for a contact
function calculateProjectRelevance(contact, projectRequirements) {
  let score = 0;
  
  // Base score from existing relationship score
  score += (contact.relationship_score || 0) * 0.3;
  
  // Strategic value bonus
  if (contact.strategic_value === 'high') score += 0.25;
  else if (contact.strategic_value === 'medium') score += 0.15;
  
  // Alignment tags matching
  const relevantTags = extractRelevantTags(projectRequirements);
  const contactTags = contact.alignment_tags || [];
  const matchingTags = contactTags.filter(tag => relevantTags.includes(tag));
  score += matchingTags.length * 0.1;
  
  // Position/company keyword matching
  const industryKeywords = extractIndustryKeywords(projectRequirements);
  const positionCompany = `${contact.current_position || ''} ${contact.current_company || ''}`.toLowerCase();
  const keywordMatches = industryKeywords.filter(keyword => positionCompany.includes(keyword));
  score += keywordMatches.length * 0.05;
  
  // Project type specific bonuses
  if (projectRequirements.projectType === 'indigenous' && contactTags.includes('indigenous')) {
    score += 0.2;
  }
  if (projectRequirements.projectType === 'funding' && contactTags.includes('funding')) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

// Suggest appropriate role for contact in project
function suggestContactRole(contact, projectRequirements) {
  const tags = contact.alignment_tags || [];
  const position = (contact.current_position || '').toLowerCase();
  
  if (tags.includes('funding') || position.includes('investment')) {
    return 'funder';
  }
  
  if (tags.includes('government') || position.includes('government')) {
    return 'stakeholder';
  }
  
  if (tags.includes('leadership') || position.includes('ceo') || position.includes('director')) {
    return 'partner';
  }
  
  if (tags.includes('community_services')) {
    return 'implementer';
  }
  
  return 'advocate';
}

// Generate recommended role description
function generateRecommendedRole(contact, projectRequirements) {
  const role = suggestContactRole(contact, projectRequirements);
  const tags = contact.alignment_tags || [];
  
  const roleMappings = {
    'funder': 'Strategic Funding Partner & Financial Advisor',
    'stakeholder': 'Government Stakeholder & Policy Advisor',
    'partner': 'Strategic Partnership & Executive Sponsor',
    'implementer': 'Implementation Partner & Community Liaison',
    'advocate': 'Project Advocate & Subject Matter Expert'
  };
  
  let baseRole = roleMappings[role] || 'Strategic Collaborator';
  
  // Add specialized context based on tags
  if (tags.includes('indigenous')) {
    baseRole += ' (Indigenous Community Focus)';
  }
  if (tags.includes('youth')) {
    baseRole += ' (Youth Development Specialist)';
  }
  
  return baseRole;
}

// Identify specific matching factors for recommendation explanation
function identifyMatchingFactors(contact, projectRequirements) {
  const factors = [];
  
  // Strategic value
  if (contact.strategic_value === 'high') {
    factors.push('High strategic value contact');
  }
  
  // Relationship strength
  if (contact.relationship_score > 0.7) {
    factors.push('Strong existing relationship');
  }
  
  // Tag alignment
  const relevantTags = extractRelevantTags(projectRequirements);
  const contactTags = contact.alignment_tags || [];
  const matchingTags = contactTags.filter(tag => relevantTags.includes(tag));
  
  if (matchingTags.length > 0) {
    factors.push(`Aligned expertise: ${matchingTags.join(', ')}`);
  }
  
  // Position relevance
  const position = contact.current_position || '';
  if (position.toLowerCase().includes('ceo') || position.toLowerCase().includes('director')) {
    factors.push('Senior leadership position');
  }
  
  return factors;
}

// Score and rank recommendations
async function scoreAndRankRecommendations(contacts, projectContext) {
  return contacts
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 20) // Top 20 recommendations
    .map((contact, index) => ({
      ...contact,
      rank: index + 1,
      confidence: calculateConfidenceScore(contact, projectContext)
    }));
}

// Calculate confidence in recommendation
function calculateConfidenceScore(contact, projectContext) {
  let confidence = contact.relevanceScore;
  
  // Boost confidence based on interaction history
  if (contact.total_interactions > 0) {
    confidence += 0.1;
  }
  
  // Boost confidence for existing project connections
  if (contact.project_connections > 0) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 1.0);
}

// Create Notion project (placeholder - integrate with existing Notion API)
async function createNotionProject(projectData) {
  // This would integrate with your existing Notion API setup
  console.log('🔄 Creating Notion project:', projectData.title);
  
  // Placeholder response - replace with actual Notion API call
  return {
    id: `notion-${Date.now()}`,
    title: projectData.title,
    url: `https://notion.so/project-${Date.now()}`
  };
}

// Get Notion project details (placeholder)
async function getNotionProject(projectId) {
  // This would integrate with your existing Notion API setup
  console.log('🔍 Getting Notion project:', projectId);
  
  // Placeholder response - replace with actual Notion API call
  return {
    id: projectId,
    title: 'Sample Project',
    description: 'Project description from Notion',
    type: 'community'
  };
}

// Update Notion project with contact recommendations (placeholder)
async function updateNotionProjectWithContacts(projectId, recommendations) {
  console.log(`📝 Updating Notion project ${projectId} with ${recommendations.length} contact recommendations`);
  
  // This would integrate with your existing Notion API to add contact information
  // to the project page or database
  
  return true;
}

// Link contact to project in Supabase
async function linkContactToProject(linkData) {
  try {
    const { data: projectConnection, error } = await supabase
      .from('linkedin_project_connections')
      .insert({
        contact_id: linkData.contactId,
        notion_project_id: linkData.notionProjectId,
        project_name: linkData.projectName,
        connection_type: linkData.connectionType,
        relevance_score: linkData.relevanceScore,
        potential_role: linkData.potentialRole,
        recommended_action: `Auto-linked from Notion project creation`,
        notes: linkData.autoLinked ? 'Automatically linked during project creation' : null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, projectConnection };
    
  } catch (error) {
    console.error('❌ Failed to link contact to project:', error);
    return { success: false, error: error.message };
  }
}

// Generate contact insights for project
async function generateContactInsights(projectConnections) {
  const insights = {
    totalConnections: projectConnections.length,
    connectionTypes: {},
    statusBreakdown: {},
    avgRelevanceScore: 0,
    highValueContacts: 0,
    recommendedActions: []
  };
  
  if (projectConnections.length === 0) {
    return insights;
  }
  
  // Analyze connection types
  projectConnections.forEach(conn => {
    insights.connectionTypes[conn.connection_type] = 
      (insights.connectionTypes[conn.connection_type] || 0) + 1;
    
    insights.statusBreakdown[conn.contact_status] = 
      (insights.statusBreakdown[conn.contact_status] || 0) + 1;
    
    insights.avgRelevanceScore += conn.relevance_score || 0;
    
    if (conn.relevance_score > 0.8) {
      insights.highValueContacts++;
    }
  });
  
  insights.avgRelevanceScore = insights.avgRelevanceScore / projectConnections.length;
  
  // Generate recommended actions
  if (insights.statusBreakdown.identified > 0) {
    insights.recommendedActions.push(
      `Reach out to ${insights.statusBreakdown.identified} identified contacts`
    );
  }
  
  if (insights.highValueContacts > 0) {
    insights.recommendedActions.push(
      `Prioritize ${insights.highValueContacts} high-value contacts (score > 0.8)`
    );
  }
  
  return insights;
}

export default router;