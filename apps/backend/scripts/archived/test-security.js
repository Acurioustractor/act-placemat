#!/usr/bin/env node
/**
 * World-Class Security Test Server
 * Tests the security implementation without external dependencies
 */
import express from 'express';
import { createSecureCORS, createSecurityHealthCheck } from './src/config/security-migration.js';

const app = express();
const PORT = 4001; // Different port to avoid conflicts

// Apply world-class security
const worldClassCORS = createSecureCORS();
app.use(worldClassCORS);

// Basic middleware
app.use(express.json());

// Test endpoints
app.get('/test/cors', (req, res) => {
  res.json({
    success: true,
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.get('/security-health', createSecurityHealthCheck());

app.get('/test/intelligence', (req, res) => {
  // Mock intelligence data
  res.json({
    success: true,
    intelligence: {
      operations: {
        totalProjects: 55,
        activeProjects: 28,
        dataSource: 'test_data'
      },
      community: {
        totalStorytellers: 226,
        dataSource: 'test_data'
      },
      network: {
        totalContacts: 20042,
        dataSource: 'test_data'
      }
    },
    security: {
      corsEnabled: true,
      worldClassSecurity: true,
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

// Start test server
app.listen(PORT, () => {
  console.log(`🧪 Security Test Server running on http://localhost:${PORT}`);
  console.log(`🔒 World-class CORS security: ACTIVE`);
  console.log(`\n🧪 Test endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/test/cors`);
  console.log(`   GET  http://localhost:${PORT}/test/intelligence`);
  console.log(`   GET  http://localhost:${PORT}/security-health`);
  console.log(`\n✅ Ready for CORS testing from frontend port 5176`);
});

export default app;