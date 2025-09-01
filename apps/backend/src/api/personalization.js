/**
 * Personalization API Endpoints - Handle user preference storage, behavior tracking, and sync
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
)

/**
 * Get user personalization profile
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('user_personalization_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error is ok
      throw error
    }

    // Get recent behaviors
    const { data: behaviors, error: behaviorError } = await supabase
      .from('user_behaviors')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (behaviorError) {
      console.warn('Failed to fetch behaviors:', behaviorError)
    }

    res.json({
      profile: profile || null,
      behaviors: behaviors || [],
      lastSync: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching personalization profile:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

/**
 * Update or create user personalization profile
 */
router.post('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { profile, behaviors = [] } = req.body

    // Upsert user profile
    const { data: savedProfile, error: profileError } = await supabase
      .from('user_personalization_profiles')
      .upsert({
        user_id: userId,
        preferences: profile.preferences || {},
        insights: profile.insights || {},
        segments: profile.segments || [],
        last_updated: new Date().toISOString(),
        version: (profile.version || 0) + 1
      })
      .select()
      .single()

    if (profileError) {
      throw profileError
    }

    // Save new behaviors if provided
    if (behaviors.length > 0) {
      const behaviorRecords = behaviors.map(behavior => ({
        user_id: userId,
        session_id: behavior.sessionId,
        type: behavior.type,
        element: behavior.element,
        element_id: behavior.elementId,
        element_type: behavior.elementType,
        context: behavior.context || {},
        metadata: behavior.metadata || {},
        timestamp: new Date(behavior.timestamp).toISOString()
      }))

      const { error: behaviorError } = await supabase
        .from('user_behaviors')
        .insert(behaviorRecords)

      if (behaviorError) {
        console.warn('Failed to save behaviors:', behaviorError)
      }
    }

    res.json({
      success: true,
      profile: savedProfile,
      behaviorsSaved: behaviors.length
    })
  } catch (error) {
    console.error('Error saving personalization profile:', error)
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

/**
 * Track user behavior (batch endpoint)
 */
router.post('/behaviors/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { behaviors } = req.body

    if (!Array.isArray(behaviors) || behaviors.length === 0) {
      return res.status(400).json({ error: 'Invalid behaviors data' })
    }

    const behaviorRecords = behaviors.map(behavior => ({
      user_id: userId,
      session_id: behavior.sessionId,
      type: behavior.type,
      element: behavior.element,
      element_id: behavior.elementId,
      element_type: behavior.elementType,
      context: behavior.context || {},
      metadata: behavior.metadata || {},
      timestamp: new Date(behavior.timestamp).toISOString()
    }))

    const { data, error } = await supabase
      .from('user_behaviors')
      .insert(behaviorRecords)
      .select()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      saved: data.length
    })
  } catch (error) {
    console.error('Error saving user behaviors:', error)
    res.status(500).json({ error: 'Failed to save behaviors' })
  }
})

/**
 * Get user preferences
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabase
      .from('user_personalization_profiles')
      .select('preferences, insights')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    res.json({
      preferences: data?.preferences || {},
      insights: data?.insights || {}
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

/**
 * Update specific user preference
 */
router.put('/preferences/:userId/:key', async (req, res) => {
  try {
    const { userId, key } = req.params
    const { value, source = 'explicit', confidence = 1.0 } = req.body

    // Get current profile
    const { data: currentProfile } = await supabase
      .from('user_personalization_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .single()

    const preferences = currentProfile?.preferences || {}
    preferences[key] = {
      key,
      value,
      confidence,
      source,
      timestamp: Date.now(),
      weight: 1.0
    }

    // Update profile
    const { data, error } = await supabase
      .from('user_personalization_profiles')
      .upsert({
        user_id: userId,
        preferences,
        last_updated: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      preference: preferences[key]
    })
  } catch (error) {
    console.error('Error updating user preference:', error)
    res.status(500).json({ error: 'Failed to update preference' })
  }
})

/**
 * Get A/B test assignments for user
 */
router.get('/ab-tests/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabase
      .from('user_ab_tests')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    const assignments = {}
    data.forEach(assignment => {
      assignments[assignment.test_name] = {
        variant: assignment.variant,
        enrolled: assignment.enrolled,
        enrolledAt: assignment.enrolled_at
      }
    })

    res.json({ assignments })
  } catch (error) {
    console.error('Error fetching A/B test assignments:', error)
    res.status(500).json({ error: 'Failed to fetch A/B test assignments' })
  }
})

/**
 * Enroll user in A/B test
 */
router.post('/ab-tests/:userId/:testName', async (req, res) => {
  try {
    const { userId, testName } = req.params
    const { variant, variants = [] } = req.body

    // If no variant provided, randomly assign one
    const assignedVariant = variant || variants[Math.floor(Math.random() * variants.length)]

    if (!assignedVariant) {
      return res.status(400).json({ error: 'No variant provided or available' })
    }

    const { data, error } = await supabase
      .from('user_ab_tests')
      .upsert({
        user_id: userId,
        test_name: testName,
        variant: assignedVariant,
        enrolled: true,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      testName,
      variant: assignedVariant,
      enrollment: data
    })
  } catch (error) {
    console.error('Error enrolling in A/B test:', error)
    res.status(500).json({ error: 'Failed to enroll in A/B test' })
  }
})

/**
 * Track A/B test conversion
 */
router.post('/ab-tests/:userId/:testName/convert', async (req, res) => {
  try {
    const { userId, testName } = req.params
    const { metric, value = 1 } = req.body

    // Get current assignment
    const { data: assignment } = await supabase
      .from('user_ab_tests')
      .select('variant')
      .eq('user_id', userId)
      .eq('test_name', testName)
      .single()

    if (!assignment) {
      return res.status(404).json({ error: 'A/B test assignment not found' })
    }

    // Record conversion
    const { data, error } = await supabase
      .from('ab_test_conversions')
      .insert({
        user_id: userId,
        test_name: testName,
        variant: assignment.variant,
        metric,
        value,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json({
      success: true,
      conversion: data
    })
  } catch (error) {
    console.error('Error tracking A/B test conversion:', error)
    res.status(500).json({ error: 'Failed to track conversion' })
  }
})

/**
 * Get personalized recommendations for user
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { type, limit = 10 } = req.query

    // This would implement recommendation algorithm
    // For now, return mock recommendations
    const recommendations = [
      {
        id: `rec_${Date.now()}_1`,
        type: 'widget_add',
        confidence: 0.8,
        reason: 'Based on your activity patterns, you might find this widget useful',
        data: { widgetType: 'project-overview' },
        priority: 'medium'
      },
      {
        id: `rec_${Date.now()}_2`,
        type: 'content_highlight',
        confidence: 0.9,
        reason: 'New opportunities matching your interests are available',
        data: { contentType: 'opportunities', category: 'environment' },
        priority: 'high'
      }
    ]

    let filteredRecs = recommendations
    if (type) {
      filteredRecs = recommendations.filter(rec => rec.type === type)
    }

    res.json({
      recommendations: filteredRecs.slice(0, parseInt(limit))
    })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'personalization-api',
    timestamp: new Date().toISOString()
  })
})

export default router