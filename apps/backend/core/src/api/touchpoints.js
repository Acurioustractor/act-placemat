import express from 'express'
import touchpointService from '../services/touchpointService.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

router.post('/backfill', asyncHandler(async (req, res) => {
  const { emailLimit, eventLimit, eventDays } = req.body || {}

  const result = await touchpointService.backfill({
    emailLimit: Number(emailLimit) || 200,
    eventLimit: Number(eventLimit) || 50,
    eventHorizonDays: Number(eventDays) || 21,
  })

  if (!result.success) {
    if (result.reason === 'table_missing') {
      return res.status(503).json({
        success: false,
        error: 'touchpoints_table_missing',
        message: 'touchpoints table not found. Create it with the SQL provided in docs before running backfill.'
      })
    }
    if (result.reason === 'missing_supabase_credentials') {
      return res.status(503).json({ success: false, error: 'missing_supabase_credentials' })
    }
    return res.status(500).json({ success: false, error: 'backfill_failed', detail: result.detail })
  }

  res.json({
    success: true,
    inserted: result.inserted,
    processed: result.total,
  })
}))

router.get('/', asyncHandler(async (req, res) => {
  const { limit, contactId, projectId, source } = req.query || {}

  const result = await touchpointService.list({
    limit: Number(limit) || 100,
    contactId: contactId ? String(contactId) : undefined,
    projectId: projectId ? String(projectId) : undefined,
    source: source ? String(source) : undefined,
  })

  if (!result.success) {
    if (result.reason === 'table_missing') {
      return res.status(503).json({
        success: false,
        error: 'touchpoints_table_missing',
        message: 'touchpoints table not found. Create it with the SQL provided in docs before querying.'
      })
    }
    if (result.reason === 'missing_supabase_credentials') {
      return res.status(503).json({ success: false, error: 'missing_supabase_credentials' })
    }
    return res.status(500).json({ success: false, error: 'list_failed', detail: result.detail })
  }

  res.json({ success: true, touchpoints: result.data, count: result.data.length })
}))

export default router
