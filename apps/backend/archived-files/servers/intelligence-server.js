#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import intelligenceRouter from './api/intelligence.js';

// Load environment from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = process.env.INTELLIGENCE_PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ACT Intelligence API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Intelligence API routes
app.use('/api/intelligence', intelligenceRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ACT 5-Source Intelligence API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/intelligence/status': 'System status and data source health',
      'GET /api/intelligence/examples': 'Example queries for testing',
      'POST /api/intelligence/query': 'Process natural language intelligence queries',
      'POST /api/intelligence/demo': 'Run demo query showcasing system capabilities'
    },
    dataSources: [
      'Notion (Projects & Opportunities)',
      'Supabase (Stories & Community)', 
      'Xero (Financial Intelligence)',
      'Gmail (Communication Intelligence)',
      'LinkedIn (Network Intelligence)'
    ],
    capabilities: [
      'Multi-source data correlation',
      'Grant opportunity matching',
      'Network relationship analysis',
      'Financial intelligence tracking',
      'Community story alignment'
    ]
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/intelligence/status',
      'GET /api/intelligence/examples',
      'POST /api/intelligence/query',
      'POST /api/intelligence/demo'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ACT Intelligence API Server Starting...\n');
  console.log('='*60);
  console.log(`🌟 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧠 Intelligence API: http://localhost:${PORT}/api/intelligence`);
  console.log(`📊 System status: http://localhost:${PORT}/api/intelligence/status`);
  console.log(`💡 Example queries: http://localhost:${PORT}/api/intelligence/examples`);
  console.log('='*60);
  console.log('🎯 Ready to process intelligence queries!');
  console.log('📋 Data Sources: Notion, Supabase, Xero, Gmail, LinkedIn');
  console.log('🔍 Capabilities: Grant matching, Network analysis, Financial intelligence');
  console.log('\n💡 Test with: curl -X POST http://localhost:' + PORT + '/api/intelligence/query \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"query": "What is our current financial position?"}\'');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down Intelligence API server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down Intelligence API server...');
  process.exit(0);
});