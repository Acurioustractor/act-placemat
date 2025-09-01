/**
 * Community Activity Feed API
 * Task: 3.2 - Implement Real-Time Story Sharing System
 * Handles community activity feed and real-time story sharing
 */

import express from 'express'
import { apiKeyOrAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import socketService from '../services/socketService.js'

const router = express.Router()

/**
 * GET /api/community/activity-feed
 * Get paginated community activity feed
 */
router.get('/activity-feed', asyncHandler(async (req, res) => {
  const { limit = 10, offset = 0, type } = req.query
  
  // For now, return mock data - in production this would query the database
  const activities = generateMockActivityFeed(parseInt(limit), parseInt(offset), type)
  
  res.json({
    success: true,
    activities,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: 25 // Mock total
    },
    timestamp: new Date().toISOString()
  })
}))

/**
 * POST /api/community/share-story
 * Share a new story and broadcast real-time update
 */
router.post('/share-story', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { title, content, tags, projectId } = req.body
  
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: 'Title and content are required'
    })
  }
  
  // Create new story activity
  const newStoryActivity = {
    id: `story_${Date.now()}`,
    type: 'story',
    title: `New Story: ${title}`,
    description: content.length > 150 ? content.substring(0, 150) + '...' : content,
    author: {
      name: req.user?.name || 'Community Member',
      role: 'Community Storyteller'
    },
    timestamp: new Date().toISOString(),
    engagement: { likes: 0, comments: 0, shares: 0 },
    metadata: {
      storyId: `story_${Date.now()}`,
      projectId,
      tags
    }
  }
  
  // Broadcast real-time update to all connected clients
  if (socketService.getStatus().initialized) {
    socketService.broadcastToRoom('stories', 'new_story_shared', {
      activity: newStoryActivity,
      type: 'new_story',
      timestamp: new Date().toISOString()
    })
    
    // Also broadcast to community activity feed
    socketService.broadcastToRoom('community', 'activity_updated', {
      activity: newStoryActivity,
      operation: 'create'
    })
  }
  
  res.json({
    success: true,
    story: newStoryActivity,
    message: 'Story shared successfully and broadcasted to community',
    timestamp: new Date().toISOString()
  })
}))

/**
 * POST /api/community/project-update
 * Post a project update and broadcast real-time update
 */
router.post('/project-update', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { projectId, title, description, milestone } = req.body
  
  if (!projectId || !title || !description) {
    return res.status(400).json({
      success: false,
      error: 'ProjectId, title, and description are required'
    })
  }
  
  // Create new project update activity
  const projectUpdateActivity = {
    id: `project_update_${Date.now()}`,
    type: 'project_update',
    title,
    description,
    author: {
      name: req.user?.name || 'Project Team',
      role: 'Project Lead'
    },
    timestamp: new Date().toISOString(),
    engagement: { likes: 0, comments: 0, shares: 0 },
    metadata: {
      projectId,
      milestone
    }
  }
  
  // Broadcast real-time update
  if (socketService.getStatus().initialized) {
    socketService.broadcastToRoom('projects', 'project_updated', {
      activity: projectUpdateActivity,
      projectId,
      type: 'project_update'
    })
    
    socketService.broadcastToRoom('community', 'activity_updated', {
      activity: projectUpdateActivity,
      operation: 'create'
    })
  }
  
  res.json({
    success: true,
    update: projectUpdateActivity,
    message: 'Project update shared and broadcasted to community',
    timestamp: new Date().toISOString()
  })
}))

/**
 * POST /api/community/collaboration
 * Announce new collaboration and broadcast real-time update
 */
router.post('/collaboration', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { projectIds, title, description, collaborators } = req.body
  
  if (!projectIds || !title || !description) {
    return res.status(400).json({
      success: false,
      error: 'ProjectIds, title, and description are required'
    })
  }
  
  const collaborationActivity = {
    id: `collaboration_${Date.now()}`,
    type: 'collaboration',
    title,
    description,
    author: {
      name: req.user?.name || 'Partnership Coordinator',
      role: 'Collaboration Lead'
    },
    timestamp: new Date().toISOString(),
    engagement: { likes: 0, comments: 0, shares: 0 },
    metadata: {
      projectIds: Array.isArray(projectIds) ? projectIds : [projectIds],
      collaborators
    }
  }
  
  // Broadcast real-time update
  if (socketService.getStatus().initialized) {
    socketService.broadcastToRoom('collaboration', 'new_collaboration', {
      activity: collaborationActivity,
      projectIds,
      type: 'collaboration'
    })
    
    socketService.broadcastToRoom('community', 'activity_updated', {
      activity: collaborationActivity,
      operation: 'create'
    })
  }
  
  res.json({
    success: true,
    collaboration: collaborationActivity,
    message: 'Collaboration announced and broadcasted to community',
    timestamp: new Date().toISOString()
  })
}))

/**
 * POST /api/community/engagement
 * Handle engagement actions (like, comment, share) with real-time updates
 */
router.post('/engagement', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { activityId, action, data } = req.body
  
  if (!activityId || !action) {
    return res.status(400).json({
      success: false,
      error: 'ActivityId and action are required'
    })
  }
  
  const validActions = ['like', 'unlike', 'comment', 'share']
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`
    })
  }
  
  // Create engagement event
  const engagementEvent = {
    activityId,
    action,
    userId: req.user?.id || 'anonymous',
    userName: req.user?.name || 'Community Member',
    data,
    timestamp: new Date().toISOString()
  }
  
  // Broadcast real-time engagement update
  if (socketService.getStatus().initialized) {
    socketService.broadcastToRoom('community', 'engagement_updated', {
      engagement: engagementEvent,
      activityId,
      action
    })
  }
  
  res.json({
    success: true,
    engagement: engagementEvent,
    message: 'Engagement action processed and broadcasted',
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/community/realtime-status
 * Get real-time service status for community features
 */
router.get('/realtime-status', asyncHandler(async (req, res) => {
  const socketStatus = socketService.getStatus()
  
  res.json({
    success: true,
    realtime: {
      connected: socketStatus.initialized,
      connectedClients: socketStatus.metrics?.connectedClients || 0,
      communityRooms: ['stories', 'projects', 'collaboration', 'community'],
      supportedEvents: [
        'new_story_shared',
        'project_updated', 
        'new_collaboration',
        'activity_updated',
        'engagement_updated'
      ]
    },
    timestamp: new Date().toISOString()
  })
}))

// Mock data generator for development
function generateMockActivityFeed(limit = 10, offset = 0, type = null) {
  const allActivities = [
    {
      id: '1',
      type: 'story',
      title: 'New Community Story Published',
      description: 'Sarah shared her journey with the Empathy Ledger project and how it\'s transforming local mental health support networks.',
      author: { name: 'Sarah Chen', role: 'Community Storyteller' },
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      engagement: { likes: 12, comments: 3, shares: 2 }
    },
    {
      id: '2',
      type: 'project_update',
      title: 'Justice Hub Milestone Reached',
      description: 'The Justice Hub project has successfully onboarded 50 community legal advocates and processed over 200 support requests.',
      author: { name: 'Marcus Torres', role: 'Project Lead' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      engagement: { likes: 25, comments: 8, shares: 5 }
    },
    {
      id: '3',
      type: 'collaboration',
      title: 'Cross-Project Partnership Formed',
      description: 'The Empathy Ledger and Justice Hub teams are collaborating on a new mental health support framework for legal advocacy.',
      author: { name: 'Lisa Park', role: 'Partnership Coordinator' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      engagement: { likes: 18, comments: 12, shares: 7 }
    },
    {
      id: '4',
      type: 'new_member',
      title: 'Welcome New Community Members',
      description: '5 new storytellers joined this week, bringing fresh perspectives from Indigenous communities across Central Australia.',
      author: { name: 'Community Platform', role: 'System' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      engagement: { likes: 32, comments: 15, shares: 4 }
    },
    {
      id: '5',
      type: 'achievement',
      title: 'Grant Funding Success!',
      description: 'The PICC project has secured $150K in government funding to expand their digital inclusion programs across rural communities.',
      author: { name: 'Ben Knight', role: 'Platform Director' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      engagement: { likes: 45, comments: 20, shares: 12 }
    },
    {
      id: '6',
      type: 'story',
      title: 'Environmental Impact Story',
      description: 'Local environmental group shares how ACT platform helped coordinate their tree planting initiative across 15 communities.',
      author: { name: 'Green Adelaide Team', role: 'Environmental Advocates' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      engagement: { likes: 22, comments: 6, shares: 8 }
    }
  ]

  // Filter by type if specified
  let filteredActivities = type ? 
    allActivities.filter(activity => activity.type === type) : 
    allActivities

  // Apply pagination
  return filteredActivities.slice(offset, offset + limit)
}

export default router