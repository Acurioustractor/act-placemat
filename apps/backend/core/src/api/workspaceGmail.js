/**
 * Workspace Gmail API Routes
 * Multi-account email access for all ACT workspace accounts:
 * - benjamin@act.place
 * - nicholas@act.place
 * - hi@act.place
 * - accounts@act.place
 */

import express from 'express'
import workspaceGmailService from '../services/workspaceGmailService.js'

const router = express.Router()

// Track initialization state
let isInitialized = false
let initError = null

// Initialize on first request
async function ensureInitialized() {
  if (isInitialized) return true

  try {
    const result = await workspaceGmailService.initialize()
    isInitialized = result.success
    if (!result.success) {
      initError = 'No accounts connected'
    }
    return result.success
  } catch (error) {
    initError = error.message
    return false
  }
}

// GET /api/workspace-gmail/status - Get connection status for all accounts
router.get('/status', async (req, res) => {
  try {
    await ensureInitialized()
    const status = workspaceGmailService.getStatus()

    res.json({
      success: true,
      ...status,
      initError,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/workspace-gmail/stats - Get email statistics across all accounts
router.get('/stats', async (req, res) => {
  try {
    const initialized = await ensureInitialized()
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Gmail not initialized',
        message: initError,
        timestamp: new Date().toISOString()
      })
    }

    const days = parseInt(req.query.days) || 7
    const stats = await workspaceGmailService.getOrganizationStats(days)

    res.json({
      success: true,
      stats,
      timeframeDays: days,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/workspace-gmail/emails - Get recent emails from all accounts
router.get('/emails', async (req, res) => {
  try {
    const initialized = await ensureInitialized()
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Gmail not initialized',
        message: initError,
        timestamp: new Date().toISOString()
      })
    }

    const maxPerAccount = parseInt(req.query.limit) || 10
    const emails = await workspaceGmailService.getMorningBriefEmails({ maxPerAccount })

    res.json({
      success: true,
      count: emails.length,
      accounts: workspaceGmailService.getConnectedAccounts(),
      emails,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/workspace-gmail/search - Search emails across all accounts
router.get('/search', async (req, res) => {
  try {
    const initialized = await ensureInitialized()
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Gmail not initialized',
        message: initError,
        timestamp: new Date().toISOString()
      })
    }

    const query = req.query.q || req.query.query
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Missing search query. Use ?q=your+search+terms',
        timestamp: new Date().toISOString()
      })
    }

    const maxResults = parseInt(req.query.limit) || 20
    const timeframe = req.query.timeframe || '30d'

    const results = await workspaceGmailService.searchAllAccounts(query, { maxResults, timeframe })

    res.json({
      success: true,
      query,
      count: results.length,
      accounts: workspaceGmailService.getConnectedAccounts(),
      emails: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/workspace-gmail/contact/:email - Get emails for a specific contact
router.get('/contact/:email', async (req, res) => {
  try {
    const initialized = await ensureInitialized()
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Gmail not initialized',
        message: initError,
        timestamp: new Date().toISOString()
      })
    }

    const contactEmail = req.params.email
    const maxResults = parseInt(req.query.limit) || 20
    const timeframeDays = parseInt(req.query.days) || 90

    const emails = await workspaceGmailService.getContactEmails(contactEmail, { maxResults, timeframeDays })

    res.json({
      success: true,
      contact: contactEmail,
      count: emails.length,
      emails,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export default router
