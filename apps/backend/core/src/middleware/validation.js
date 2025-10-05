export function validatePagination(req, res, next) {
  const { limit, page } = req.query || {}

  const parsedLimit = limit !== undefined ? Number(limit) : undefined
  const parsedPage = page !== undefined ? Number(page) : undefined

  if (parsedLimit !== undefined && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
    return res.status(400).json({ error: 'invalid_limit', message: 'limit must be a positive number' })
  }

  if (parsedPage !== undefined && (!Number.isInteger(parsedPage) || parsedPage < 1)) {
    return res.status(400).json({ error: 'invalid_page', message: 'page must be an integer >= 1' })
  }

  if (parsedLimit !== undefined) {
    req.query.limit = parsedLimit
  }
  if (parsedPage !== undefined) {
    req.query.page = parsedPage
  }

  next()
}

export default {
  validatePagination
}
