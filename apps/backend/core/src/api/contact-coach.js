import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import contactCoachService from '../services/contactCoachService.js'

const router = express.Router()

router.get('/', asyncHandler(async (_req, res) => {
  const summary = await contactCoachService.generateSummary()

  if (!summary.success) {
    const status = summary.reason === 'missing_supabase_credentials' ? 503 : 500
    return res.status(status).json(summary)
  }

  res.json(summary)
}))

router.post('/preferences', asyncHandler(async (req, res) => {
  const { contactId, projectId, status, notes, pinnedRank } = req.body || {}

  const preference = await contactCoachService.setSupportPreference({
    contactId,
    projectId,
    status,
    notes,
    pinnedRank
  })

  res.json({ success: true, preference })
}))

router.delete('/preferences', asyncHandler(async (req, res) => {
  const payload = req.body && Object.keys(req.body).length ? req.body : req.query
  const { contactId, projectId } = payload || {}

  await contactCoachService.removeSupportPreference({ contactId, projectId })

  res.json({ success: true })
}))

export default router
