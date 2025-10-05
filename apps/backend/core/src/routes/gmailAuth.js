import express from 'express';

const router = express.Router();

router.get('/connect', (req, res) => {
  res.status(501).json({ error: 'gmail_oauth_disabled', message: 'Gmail OAuth not configured in this environment.' });
});

router.get('/callback', (req, res) => {
  res.status(501).json({ error: 'gmail_oauth_disabled', message: 'Gmail OAuth callback not configured.' });
});

export default router;
