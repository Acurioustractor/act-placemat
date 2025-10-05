/**
 * Enhanced Server Configuration
 * Production-ready server with all perfect system integrations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables FIRST - before any service imports
dotenv.config();

// Import all services AFTER env vars are loaded
import universalPlatformAPI, { initializeWebSocketServer } from './api/universalPlatformAPI.js';
import notionSyncEngine from './services/notionSyncEngine.js';
import intelligentInsightsEngine from './services/intelligentInsightsEngineSimple.js';
import UniversalIntelligenceOrchestrator from './services/universalIntelligenceOrchestrator.js';
import quickBusinessIntelligence from './api/quickBusinessIntelligence.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "https://api.anthropic.com", "https://api.openai.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      upgradeInsecureRequests: null
    }
  }
}));

// Compression for all responses
app.use(compression());

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://www.act.place',
      'https://act.place'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/platform', universalPlatformAPI);

// Universal Intelligence endpoint
app.post('/api/universal-intelligence/quick-insight', async (req, res) => {
  try {
    const orchestrator = new UniversalIntelligenceOrchestrator();
    const result = await orchestrator.answerBusinessQuestion(req.body.query, {
      depth: 'comprehensive',
      includeResearch: true
    });
    
    res.json({
      quick_insight: result,
      intelligence: result
    });
  } catch (error) {
    console.error('Universal Intelligence error:', error);
    res.status(500).json({ error: 'Intelligence analysis failed' });
  }
});

// Business Intelligence endpoint - using quick version for faster responses
app.use('/api/business-intelligence', quickBusinessIntelligence);

// Full intelligence endpoint (slower but more comprehensive)
app.post('/api/business-intelligence-full', async (req, res) => {
  try {
    const orchestrator = new UniversalIntelligenceOrchestrator();
    const result = await orchestrator.answerBusinessQuestion(req.body.query || req.body.question, {
      depth: 'comprehensive',
      includeResearch: true
    });
    
    res.json({
      quick_insight: result,
      intelligence: result,
      analysis: result.analysis || 'Analysis complete'
    });
  } catch (error) {
    console.error('Business Intelligence error:', error);
    res.status(500).json({ error: 'Intelligence analysis failed', message: error.message });
  }
});
app.use('/api/notion', (req, res) => {
  res.json({ message: 'Please use /api/platform endpoints' });
});

// Static file serving
app.use('/static', express.static(join(__dirname, '../public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Initialize WebSocket server
const wss = initializeWebSocketServer(server);

// Start background services
async function startBackgroundServices() {
  console.log('🚀 Starting background services...');
  
  try {
    // Initialize Notion sync
    await notionSyncEngine.performIncrementalSync();
    console.log('✅ Notion sync initialized');
    
    // Generate initial insights
    await intelligentInsightsEngine.generateInsights('7d');
    console.log('✅ Initial insights generated');
    
    // Start scheduled tasks
    setInterval(async () => {
      try {
        await notionSyncEngine.performIncrementalSync();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    }, 60000); // Every minute
    
    setInterval(async () => {
      try {
        const insights = await intelligentInsightsEngine.generateInsights('1d');
        // Broadcast insights to connected clients
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'insights_update',
              data: insights
            }));
          }
        });
      } catch (error) {
        console.error('Scheduled insights generation failed:', error);
      }
    }, 300000); // Every 5 minutes
    
    console.log('✅ Background services started');
  } catch (error) {
    console.error('Failed to start background services:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close WebSocket connections
  wss.clients.forEach(client => {
    client.close();
  });
  
  // Allow 10 seconds for graceful shutdown
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(0);
  }, 10000);
});

// Start server
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🚀 ACT PERFECT SYSTEM SERVER                           ║
║                                                              ║
║     Server:     http://${HOST}:${PORT}                      ║
║     WebSocket:  ws://${HOST}:${PORT}/live                   ║
║     Health:     http://${HOST}:${PORT}/health               ║
║     API Docs:   http://${HOST}:${PORT}/api/docs             ║
║                                                              ║
║     Environment: ${process.env.NODE_ENV || 'development'}   ║
║     Version:     ${process.env.npm_package_version || '1.0.0'} ║
║                                                              ║
║     Services:                                               ║
║     ✅ Universal Intelligence Orchestrator                  ║
║     ✅ Multi-Provider AI System                            ║
║     ✅ Notion Sync Engine                                  ║
║     ✅ Intelligent Insights Engine                         ║
║     ✅ WebSocket Real-time Updates                         ║
║     ✅ Pattern Detection & Predictions                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  // Start background services after server is running
  await startBackgroundServices();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to monitoring service
  // Don't exit in production, but log for investigation
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to monitoring service
});

export default app;