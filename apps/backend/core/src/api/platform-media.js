/**
 * Platform Media API - Stub file to fix import errors
 * This file exists to resolve import dependencies during development
 */

import express from 'express';

const router = express.Router();

// Basic status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'platform-media',
    version: '1.0.0',
    status: 'operational'
  });
});

export default router;