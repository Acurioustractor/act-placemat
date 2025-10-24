// Vercel serverless function wrapper for the Express app
// This allows the entire Express server to run as a single Vercel function

import app from '../server.js';

// Export the Express app as a Vercel serverless function
export default app;
