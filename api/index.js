/**
 * Vercel Serverless Function for ACT Backend API
 * This wraps the Express app for serverless deployment
 */

// Load environment variables
process.env.NODE_ENV = 'production';

// Import the Express app (without the .listen() call)
// We'll need to modify server.js to export the app
import('../apps/backend/server.js').then(module => {
  // The Express app should be exported
  const app = module.default || module.app;
  
  // Vercel will handle the serverless function invocation
  export default app;
}).catch(err => {
  console.error('Failed to load backend:', err);
  throw err;
});
