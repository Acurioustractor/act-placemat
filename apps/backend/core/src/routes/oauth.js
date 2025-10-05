import express from 'express';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'oauth_disabled', message: 'OAuth routes are not configured in this environment.' });
});

export default router;
