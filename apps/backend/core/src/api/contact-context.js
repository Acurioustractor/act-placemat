import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import contactContextService from '../services/contactContextService.js'

const router = express.Router()

router.get('/', asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim()

  const result = await contactContextService.getContext(email)

  if (!result.success) {
    const status = result.reason === 'missing_email' ? 400 : 503
    return res.status(status).json(result)
  }

  res.json(result)
}))

export default router
