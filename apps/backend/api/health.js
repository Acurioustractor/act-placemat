// Simple health check endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'ACT Backend API is running on Vercel'
  });
}
