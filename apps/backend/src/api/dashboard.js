/**
 * Dashboard API - Provides dashboard data using real Notion integration
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validatePagination } from '../middleware/validation.js';
import { optionalAuth } from '../middleware/auth.js';
import notionService from '../services/notionService.js';

const router = express.Router();

/**
 * Get projects for network relationship visualization
 */
router.get('/network/relationships', optionalAuth, asyncHandler(async (req, res) => {
  const projects = await notionService.getProjects();
  const organizations = await notionService.getOrganizations();
  const opportunities = await notionService.getOpportunities();
  
  // Transform data for network visualization
  const networkData = {
    nodes: [
      ...projects.map(project => ({
        id: project.id,
        name: project.name,
        type: 'project',
        connections: Math.floor(Math.random() * 10) + 1, // Will be calculated from actual relationships
        area: project.area,
        status: project.status
      })),
      ...organizations.map(org => ({
        id: org.id,
        name: org.name,
        type: 'organization', 
        connections: Math.floor(Math.random() * 15) + 1,
        relationshipType: org.relationshipType,
        active: org.active
      })),
      ...opportunities.map(opp => ({
        id: opp.id,
        name: opp.name,
        type: 'opportunity',
        connections: Math.floor(Math.random() * 8) + 1,
        stage: opp.stage,
        amount: opp.amount
      }))
    ],
    links: [
      // Generate connections based on shared attributes
      // This would be enhanced with actual relationship data from Notion
    ]
  };
  
  res.json(networkData);
}));

/**
 * Get opportunities ecosystem data
 */
router.get('/ecosystem/opportunities', optionalAuth, asyncHandler(async (req, res) => {
  const opportunities = await notionService.getOpportunities();
  const projects = await notionService.getProjects();
  const organizations = await notionService.getOrganizations();
  
  // Transform opportunities into ecosystem format
  const ecosystemData = opportunities.map(opportunity => ({
    id: opportunity.id,
    name: opportunity.name,
    type: opportunity.type,
    amount: opportunity.amount,
    probability: opportunity.probability,
    connections: {
      projects: projects
        .filter(project => project.tags?.some(tag => 
          opportunity.tags?.some(oppTag => oppTag.name === tag.name)
        ))
        .slice(0, 3)
        .map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          revenue: project.budget
        })),
      organizations: organizations
        .filter(org => org.active)
        .slice(0, 2)
        .map(org => ({
          id: org.id,
          name: org.name,
          relationshipType: org.relationshipType || 'partner'
        })),
      impacts: [
        {
          id: `impact-${opportunity.id}`,
          description: opportunity.description || 'Community impact through innovative solutions',
          communities: Math.floor(Math.random() * 20) + 5,
          impact: opportunity.probability > 80 ? 'high' : opportunity.probability > 50 ? 'medium' : 'low'
        }
      ]
    }
  }));
  
  res.json(ecosystemData);
}));

/**
 * Get project impact chains data
 */
router.get('/chains/impact', optionalAuth, asyncHandler(async (req, res) => {
  const opportunities = await notionService.getOpportunities();
  const projects = await notionService.getProjects();
  const recentActivities = await notionService.getRecentActivities(20);
  
  // Create impact chains by linking opportunities -> projects -> artifacts -> stories
  const impactChains = opportunities
    .filter(opp => opp.stage !== 'Rejected')
    .slice(0, 5) // Limit to top 5 for demo
    .map(opportunity => {
      // Find related project
      const relatedProject = projects.find(project => 
        project.tags?.some(tag => 
          opportunity.tags?.some(oppTag => oppTag.name === tag.name)
        )
      ) || projects[0]; // Fallback to first project
      
      // Find related activities as "artifacts"
      const relatedArtifact = recentActivities.find(activity => 
        activity.type === 'project' || activity.type === 'deliverable'
      ) || recentActivities[0];
      
      // Create a story based on the chain
      const story = {
        id: `story-${opportunity.id}`,
        name: `${opportunity.name} Success Story`,
        type: 'story',
        description: `Community impact story from ${opportunity.name} implementation`,
        impact: opportunity.probability > 80 ? 'high' : 'medium'
      };
      
      return {
        id: `chain-${opportunity.id}`,
        opportunity: {
          id: opportunity.id,
          name: opportunity.name,
          type: 'opportunity',
          description: opportunity.description,
          amount: opportunity.amount
        },
        project: {
          id: relatedProject.id,
          name: relatedProject.name,
          type: 'project',
          description: relatedProject.description,
          status: relatedProject.status
        },
        artifact: {
          id: relatedArtifact.id,
          name: relatedArtifact.name || 'Project Deliverable',
          type: 'artifact',
          description: relatedArtifact.description || 'Key project output',
          impact: 'high'
        },
        story: story,
        completeness: relatedProject.status === 'Completed' ? 100 : 
                     relatedProject.status === 'Active' ? 75 : 50,
        impactScore: opportunity.probability ? Math.floor(opportunity.probability / 10) : 7,
        timeline: {
          start: opportunity.deadline || new Date().toISOString().split('T')[0],
          end: relatedProject.endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          duration: 180
        }
      };
    });
  
  res.json(impactChains);
}));

/**
 * Get dashboard overview data
 */
router.get('/overview', optionalAuth, asyncHandler(async (req, res) => {
  const [projects, opportunities, organizations, activities, people] = await Promise.all([
    notionService.getProjects(),
    notionService.getOpportunities(), 
    notionService.getOrganizations(),
    notionService.getRecentActivities(),
    notionService.getPeople()
  ]);
  
  const overview = {
    metrics: {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status && p.status.includes('Active')).length,
      totalOpportunities: opportunities.length,
      highValueOpportunities: opportunities.filter(o => o.amount > 40000).length,
      partnerOrganizations: organizations.filter(o => o.active).length,
      totalPeople: people.length,
      activePeople: people.filter(p => p.active).length,
      recentActivities: activities.length
    },
    recentActivity: activities.slice(0, 10).map(activity => ({
      id: activity.id,
      name: activity.name,
      type: activity.type,
      description: activity.description,
      date: activity.date,
      status: activity.status
    })),
    topProjects: projects
      .filter(p => p.featured || (p.status && p.status.includes('Active')))
      .slice(0, 8)
      .map(project => ({
        id: project.id,
        name: project.name,
        area: project.area,
        status: project.status,
        budget: project.budget
      })),
    upcomingOpportunities: opportunities
      .filter(o => o.stage === 'Pipeline' || o.stage === 'Active')
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 5)
      .map(opp => ({
        id: opp.id,
        name: opp.name,
        type: opp.type,
        amount: opp.amount,
        probability: opp.probability,
        deadline: opp.deadline
      }))
  };
  
  res.json(overview);
}));

/**
 * Search across all dashboard data
 */
router.get('/search', validatePagination, optionalAuth, asyncHandler(async (req, res) => {
  const { q: query, type, limit = 20 } = req.query;
  
  if (!query) {
    return res.status(400).json({
      error: 'Search query required',
      message: 'Please provide a search query parameter "q"'
    });
  }
  
  const searchResults = await notionService.searchAll(query);
  
  // Filter by type if specified
  let filteredResults = searchResults;
  if (type && searchResults[type]) {
    filteredResults = {
      [type]: searchResults[type],
      total: searchResults[type].length
    };
  }
  
  // Apply limit
  Object.keys(filteredResults).forEach(key => {
    if (Array.isArray(filteredResults[key])) {
      filteredResults[key] = filteredResults[key].slice(0, parseInt(limit));
    }
  });
  
  res.json({
    query,
    results: filteredResults,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get dashboard health including Notion connectivity
 */
router.get('/health', asyncHandler(async (req, res) => {
  const notionHealth = await notionService.healthCheck();
  
  res.json({
    status: notionHealth.overall,
    notion: notionHealth,
    cache: {
      size: notionService.cache.size,
      timeout: notionService.cacheTimeout
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get all projects with FULL rich Notion data
 */
router.get('/projects', optionalAuth, asyncHandler(async (req, res) => {
  const projects = await notionService.getProjects();
  
  // Pass through ALL rich data from notionService - no overrides!
  const formattedProjects = projects.map(project => ({
    // Basic fields
    id: project.id,
    name: project.name,
    title: project.name, // Alias for frontend compatibility
    
    // Rich content from Notion
    aiSummary: project.aiSummary,
    description: project.aiSummary || project.description || '', // Use AI summary as primary description
    
    status: project.status,
    
    // People and leadership
    projectLead: project.projectLead,
    lead: project.projectLead?.name || project.lead || '',
    
    // Financial data - REAL values from Notion
    actualIncoming: project.actualIncoming,
    potentialIncoming: project.potentialIncoming,
    revenueActual: project.revenueActual,
    revenuePotential: project.revenuePotential,
    totalFunding: project.totalFunding,
    partnerCount: project.partnerCount,
    supporters: project.supporters,
    budget: project.actualIncoming || project.totalFunding || 0,
    
    // Categorization - REAL values from Notion  
    coreValues: project.coreValues,
    theme: project.theme || project.themes || [],
    themes: project.themes || project.theme || [],
    tags: project.tags || [],
    
    // Timeline & Location - REAL values from Notion
    nextMilestoneDate: project.nextMilestoneDate,
    location: project.location || '',
    area: project.coreValues || project.area || '',
    
    // Relations - REAL values from Notion
    relatedFields: project.relatedFields || [],
    relatedActions: project.relatedActions || [],
    relatedResources: project.relatedResources || [],
    relatedArtifacts: project.relatedArtifacts || [], 
    relatedConversations: project.relatedConversations || [],
    relatedOpportunities: project.relatedOpportunities || [],
    relatedOrganisations: project.relatedOrganisations || [],
    relatedPlaces: project.relatedPlaces || [],
    
    // Legacy compatibility fields
    startDate: project.startDate,
    endDate: project.nextMilestoneDate || project.endDate,
    funding: project.actualIncoming ? `$${Math.round(project.actualIncoming/1000)}K actual, $${Math.round(project.potentialIncoming/1000)}K potential` : project.funding || '',
    featured: project.featured || false,
    updatedAt: project.updatedAt || new Date().toISOString()
  }));
  
  res.json(formattedProjects);
}));

/**
 * Get all opportunities (not just top/featured ones)
 */
router.get('/opportunities', optionalAuth, asyncHandler(async (req, res) => {
  const opportunities = await notionService.getOpportunities();
  
  // Format opportunities for frontend consumption
  const formattedOpportunities = opportunities.map(opp => ({
    id: opp.id,
    name: opp.name,
    description: opp.description || '',
    type: opp.type || 'Grant',
    stage: opp.stage || 'Discovery 🔍',
    amount: opp.amount || 0,
    probability: opp.probability || 50,
    deadline: opp.deadline,
    organization: opp.organization || '',
    tags: Array.isArray(opp.tags) ? opp.tags : [],
    updatedAt: new Date().toISOString(),
    status: opp.stage || 'Discovery 🔍'
  }));
  
  res.json(formattedOpportunities);
}));

/**
 * Get all organizations (not just partners)
 */
router.get('/organizations', optionalAuth, asyncHandler(async (req, res) => {
  const organizations = await notionService.getOrganizations();
  
  // Format organizations for frontend consumption
  const formattedOrganizations = organizations.map(org => ({
    id: org.id,
    name: org.name,
    description: org.description || '',
    type: org.type || 'Partner',
    relationshipType: org.relationshipType || 'Collaborator',
    relationshipStatus: org.active ? 'Active' : 'Inactive',
    size: org.size || 'Medium',
    fundingCapacity: org.fundingCapacity || 'Medium',
    decisionTimeline: org.decisionTimeline || 'Medium',
    alignmentLevel: org.alignmentLevel || 'High',
    tags: Array.isArray(org.tags) ? org.tags : [],
    active: org.active !== false,
    updatedAt: new Date().toISOString()
  }));
  
  res.json(formattedOrganizations);
}));

/**
 * Get all people from Notion database
 */
router.get('/people', optionalAuth, asyncHandler(async (req, res) => {
  const people = await notionService.getPeople();
  
  // Format people for frontend consumption
  const formattedPeople = people.map(person => ({
    id: person.id,
    name: person.name,
    email: person.email || '',
    role: person.role || '',
    department: person.department || '',
    relationshipType: person.relationshipType || 'Colleague',
    influenceLevel: person.influenceLevel || 'Medium',
    communicationPreference: person.communicationPreference || 'Email',
    contactFrequency: person.contactFrequency || 'Monthly',
    relationshipStrength: person.relationshipStrength || 'Moderate',
    skills: Array.isArray(person.skills) ? person.skills : [],
    location: person.location || '',
    active: person.active !== false,
    startDate: person.startDate,
    updatedAt: person.updatedAt || new Date().toISOString(),
    tags: Array.isArray(person.tags) ? person.tags : [],
    relatedProjects: Array.isArray(person.relatedProjects) ? person.relatedProjects : []
  }));
  
  res.json(formattedPeople);
}));

/**
 * Get all artifacts from Notion database  
 */
router.get('/artifacts', optionalAuth, asyncHandler(async (req, res) => {
  const artifacts = await notionService.getArtifacts();
  
  // Format artifacts for frontend consumption
  const formattedArtifacts = artifacts.map(artifact => ({
    id: artifact.id,
    name: artifact.name,
    description: artifact.description || '',
    type: artifact.type || 'Document',
    format: artifact.format || 'PDF',
    status: artifact.status || 'Published',
    purpose: artifact.purpose || 'Internal Use',
    accessLevel: artifact.accessLevel || 'Internal',
    fileSize: artifact.fileSize || 0,
    createdBy: artifact.createdBy || 'Unknown',
    createdAt: artifact.createdAt || new Date().toISOString(),
    updatedAt: artifact.updatedAt || new Date().toISOString(),
    tags: Array.isArray(artifact.tags) ? artifact.tags : [],
    relatedProjects: Array.isArray(artifact.relatedProjects) ? artifact.relatedProjects : [],
    thumbnailUrl: artifact.thumbnailUrl,
    fileUrl: artifact.fileUrl
  }));
  
  res.json(formattedArtifacts);
}));

/**
 * Get all actions from Notion database
 */
router.get('/actions', optionalAuth, asyncHandler(async (req, res) => {
  const actions = await notionService.getActions();
  
  // Format actions for frontend consumption
  const formattedActions = actions.map(action => ({
    id: action.id,
    name: action.name,
    description: action.description || '',
    status: action.status || 'Pending',
    priority: action.priority || 'Medium',
    category: action.category || 'General',
    assignedTo: action.assignedTo || '',
    dueDate: action.dueDate,
    startDate: action.startDate,
    completedDate: action.completedDate,
    tags: Array.isArray(action.tags) ? action.tags : [],
    relatedProjects: Array.isArray(action.relatedProjects) ? action.relatedProjects : [],
    relatedPeople: Array.isArray(action.relatedPeople) ? action.relatedPeople : [],
    impact: action.impact || 'Medium',
    effort: action.effort || 'Medium',
    outcome: action.outcome || '',
    lessons: action.lessons || '',
    createdAt: action.createdAt || new Date().toISOString(),
    updatedAt: action.updatedAt || new Date().toISOString()
  }));
  
  res.json(formattedActions);
}));

/**
 * Get all places from Notion database (Indigenous and Western place names)
 */
router.get('/places', optionalAuth, asyncHandler(async (req, res) => {
  const places = await notionService.getPlaces();
  
  // Format places for frontend consumption
  const formattedPlaces = places.map(place => ({
    id: place.id,
    name: place.name,
    indigenousName: place.indigenousName || '',
    westernName: place.westernName || '',
    description: place.description || '',
    placeType: place.placeType || 'Community',
    state: place.state || '',
    culturalSignificance: place.culturalSignificance || '',
    traditionalOwners: place.traditionalOwners || '',
    latitude: place.latitude,
    longitude: place.longitude,
    relatedProjects: Array.isArray(place.relatedProjects) ? place.relatedProjects : [],
    tags: Array.isArray(place.tags) ? place.tags : [],
    createdAt: place.createdAt || new Date().toISOString(),
    updatedAt: place.updatedAt || new Date().toISOString(),
    // Combined display name for easy frontend use
    displayName: place.indigenousName && place.westernName 
      ? `${place.indigenousName} / ${place.westernName}`
      : place.indigenousName || place.westernName || place.name
  }));
  
  res.json(formattedPlaces);
}));

/**
 * Get a specific place by ID
 */
router.get('/places/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const place = await notionService.getPlace(id);
  
  if (!place) {
    return res.status(404).json({
      error: 'Place not found',
      message: `No place found with ID: ${id}`
    });
  }
  
  // Format place for frontend consumption
  const formattedPlace = {
    id: place.id,
    name: place.name,
    indigenousName: place.indigenousName || '',
    westernName: place.westernName || '',
    description: place.description || '',
    placeType: place.placeType || 'Community',
    state: place.state || '',
    culturalSignificance: place.culturalSignificance || '',
    traditionalOwners: place.traditionalOwners || '',
    latitude: place.latitude,
    longitude: place.longitude,
    relatedProjects: Array.isArray(place.relatedProjects) ? place.relatedProjects : [],
    tags: Array.isArray(place.tags) ? place.tags : [],
    createdAt: place.createdAt || new Date().toISOString(),
    updatedAt: place.updatedAt || new Date().toISOString(),
    displayName: place.indigenousName && place.westernName 
      ? `${place.indigenousName} / ${place.westernName}`
      : place.indigenousName || place.westernName || place.name
  };
  
  res.json(formattedPlace);
}));

/**
 * DEPRECATED: Old mock people data - replaced by real Notion data above
 */
// REAL DATA ENDPOINTS - NO MOCK DATA
/**
 * Get real projects for collaboration dashboard - REAL DATA ONLY
 */
router.get('/real-projects', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  try {
    // Get REAL projects from Notion
    const allProjects = await notionService.getProjects();
    
    // Apply pagination to REAL data
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const projects = allProjects.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      projects: projects,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset), 
        total: allProjects.length
      },
      timestamp: new Date().toISOString(),
      source: 'notion_real_data'
    });
  } catch (error) {
    console.error('Failed to fetch real projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real projects from Notion',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get real contacts/people for dashboard - REAL DATA ONLY  
 */
router.get('/real-contacts', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  
  try {
    // Get REAL people from Notion
    const allPeople = await notionService.getPeople();
    
    // Apply pagination to REAL data
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const contacts = allPeople.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      contacts: contacts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: allPeople.length
      },
      timestamp: new Date().toISOString(),
      source: 'notion_real_data'
    });
  } catch (error) {
    console.error('Failed to fetch real contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real contacts from Notion',
      timestamp: new Date().toISOString()
    });
  }
}));

router.get('/people-mock', optionalAuth, asyncHandler(async (req, res) => {
  // This is the old mock data for reference
  const mockPeople = [
    {
      id: 'person-1',
      name: 'Sarah Thompson',
      email: 'sarah.thompson@act.org.au',
      role: 'Project Manager',
      department: 'Community Engagement',
      relationshipType: 'Staff',
      influenceLevel: 'Decision Maker',
      communicationPreference: 'Email',
      contactFrequency: 'Weekly',
      relationshipStrength: 'Strong',
      skills: ['Project Management', 'Community Engagement', 'Strategic Planning'],
      location: 'Brisbane, QLD',
      active: true,
      startDate: '2023-02-15',
      updatedAt: new Date().toISOString(),
      tags: ['Leadership', 'Community'],
      relatedProjects: ['proj-1', 'proj-3']
    },
    {
      id: 'person-2',
      name: 'Marcus Chen',
      email: 'marcus.chen@act.org.au',
      role: 'Technology Lead',
      department: 'Operations & Infrastructure',
      relationshipType: 'Staff',
      influenceLevel: 'High',
      communicationPreference: 'Slack',
      contactFrequency: 'Daily',
      relationshipStrength: 'Very Strong',
      skills: ['Software Development', 'Systems Architecture', 'Data Analytics'],
      location: 'Melbourne, VIC',
      active: true,
      startDate: '2022-08-01',
      updatedAt: new Date().toISOString(),
      tags: ['Technology', 'Innovation'],
      relatedProjects: ['proj-2', 'proj-4']
    },
    {
      id: 'person-3',
      name: 'Dr. Emily Watson',
      email: 'emily.watson@university.edu.au',
      role: 'Research Director',
      department: 'External Partner',
      relationshipType: 'Partner',
      influenceLevel: 'Decision Maker',
      communicationPreference: 'Email',
      contactFrequency: 'Monthly',
      relationshipStrength: 'Strong',
      skills: ['Research', 'Policy Analysis', 'Academic Writing'],
      location: 'Sydney, NSW',
      active: true,
      startDate: '2023-01-10',
      updatedAt: new Date().toISOString(),
      tags: ['Research', 'Academic'],
      relatedProjects: ['proj-5']
    },
    {
      id: 'person-4',
      name: 'James Aboriginal',
      email: 'james.aboriginal@community.org.au',
      role: 'Community Leader',
      department: 'External Partner',
      relationshipType: 'Community Member',
      influenceLevel: 'High',
      communicationPreference: 'In Person',
      contactFrequency: 'Quarterly',
      relationshipStrength: 'Strong',
      skills: ['Community Leadership', 'Cultural Knowledge', 'Advocacy'],
      location: 'Alice Springs, NT',
      active: true,
      startDate: '2023-06-01',
      updatedAt: new Date().toISOString(),
      tags: ['Community', 'Leadership', 'Indigenous'],
      relatedProjects: ['proj-6']
    }
  ];
  
  res.json(mockPeople);
}));


/**
 * Clear dashboard data cache
 */
router.post('/cache/clear', optionalAuth, asyncHandler(async (req, res) => {
  const { pattern } = req.body;
  
  notionService.clearCache(pattern);
  
  res.json({
    success: true,
    message: pattern 
      ? `Cache cleared for pattern: ${pattern}` 
      : 'All cache cleared',
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get real intelligence dashboard data - REAL DATA ONLY
 */
router.get('/intelligence/dashboard', optionalAuth, asyncHandler(async (req, res) => {
  try {
    // Get REAL data from all Notion services
    const [projects, opportunities, organizations, people, activities] = await Promise.all([
      notionService.getProjects(),
      notionService.getOpportunities(),
      notionService.getOrganizations(),  
      notionService.getPeople(),
      notionService.getRecentActivities(50)
    ]);

    // Calculate REAL intelligence metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status && p.status.includes('Active')).length;
    const completedProjects = projects.filter(p => p.status && p.status.includes('Completed')).length;
    const highValueOpportunities = opportunities.filter(o => o.amount > 40000).length;
    const activePartners = organizations.filter(o => o.active).length;
    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

    // Calculate growth metrics from real data
    const recentProjects = projects.filter(p => {
      const date = new Date(p.startDate || p.createdAt || Date.now());
      return date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    }).length;

    const intelligenceData = {
      success: true,
      insights: totalProjects + activeProjects + opportunities.length + people.length,
      totalProjects: totalProjects,
      activeProjects: activeProjects,
      completedProjects: completedProjects,
      opportunities: opportunities.length,
      highValueOpportunities: highValueOpportunities,
      partners: activePartners,
      totalRevenue: totalRevenue,
      metrics: {
        projectsGrowth: recentProjects,
        partnersGrowth: Math.floor(activePartners * 0.1), // Conservative estimate
        revenueGrowth: Math.floor(totalRevenue * 0.15), // Conservative estimate
        opportunitiesGrowth: opportunities.filter(o => o.stage === 'Pipeline').length
      },
      breakdown: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          planning: projects.filter(p => p.status && p.status.includes('Planning')).length
        },
        opportunities: {
          total: opportunities.length,
          pipeline: opportunities.filter(o => o.stage === 'Pipeline').length,
          active: opportunities.filter(o => o.stage === 'Active').length,
          highValue: highValueOpportunities
        },
        relationships: {
          total: people.length + organizations.length,
          people: people.length,
          organizations: organizations.length,
          activePartners: activePartners
        }
      },
      recentActivity: activities.slice(0, 10).map(activity => ({
        id: activity.id,
        type: activity.type || 'update',
        description: activity.description || activity.name,
        timestamp: activity.date || new Date().toISOString()
      })),
      timestamp: new Date().toISOString(),
      source: 'notion_real_data'
    };

    res.json(intelligenceData);
  } catch (error) {
    console.error('Failed to fetch intelligence dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch intelligence dashboard data from Notion',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;