/**
 * Vercel Serverless Function for ACT Backend API
 * This wraps the Express app for serverless deployment
 */

// Load environment variables
process.env.NODE_ENV = 'production';

let cachedApp = null;

async function getApp() {
  if (!cachedApp) {
    try {
      const module = await import('../apps/backend/server.js');
      cachedApp = module.default || module.app;
    } catch (err) {
      console.error('Failed to load backend:', err);
      throw err;
    }
  }
  return cachedApp;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
