/**
 * Real-Time Communication API Routes
 * Task: 10.1 - Set Up Socket.IO v4+ for Real-Time Communication
 * Provides REST endpoints to interact with the Socket.IO service
 */

import express from 'express';
import socketService from '../services/socketService.js';
import { apiKeyOrAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/realtime/status
 * Get Socket.IO service status and metrics
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const status = socketService.getStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/realtime/metrics
 * Get detailed real-time metrics
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const metrics = socketService.getMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/realtime/events
 * Get list of supported real-time events
 */
router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const events = socketService.getSupportedEvents();

    res.json({
      success: true,
      events,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/realtime/broadcast
 * Broadcast a system notification to all connected clients (authenticated endpoint)
 */
router.post(
  '/broadcast',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { message, type = 'info' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const broadcasted = socketService.broadcastSystemNotification(message, type);

    res.json({
      success: true,
      broadcasted,
      message: 'Notification broadcasted to all connected clients',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/realtime/trigger-sync
 * Trigger a data synchronization event (authenticated endpoint)
 */
router.post(
  '/trigger-sync',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { dataType, operation, data } = req.body;

    if (!dataType || !operation) {
      return res.status(400).json({
        success: false,
        error: 'dataType and operation are required',
      });
    }

    const triggered = socketService.triggerDataSync(dataType, operation, data);

    res.json({
      success: true,
      triggered,
      message: `Data sync event triggered: ${dataType}_${operation}`,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/realtime/send-to-room
 * Send a message to a specific room (authenticated endpoint)
 */
router.post(
  '/send-to-room',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { roomName, eventName, data } = req.body;

    if (!roomName || !eventName) {
      return res.status(400).json({
        success: false,
        error: 'roomName and eventName are required',
      });
    }

    const broadcasted = socketService.broadcastToRoom(roomName, eventName, data);

    res.json({
      success: true,
      broadcasted,
      message: `Message sent to room: ${roomName}`,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/realtime/send-to-user
 * Send a message to a specific user (authenticated endpoint)
 */
router.post(
  '/send-to-user',
  apiKeyOrAuth,
  asyncHandler(async (req, res) => {
    const { userId, eventName, data } = req.body;

    if (!userId || !eventName) {
      return res.status(400).json({
        success: false,
        error: 'userId and eventName are required',
      });
    }

    const sent = socketService.sendToUser(userId, eventName, data);

    res.json({
      success: true,
      sent,
      message: `Message sent to user: ${userId}`,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/realtime/health
 * Health check endpoint for Socket.IO service
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const status = socketService.getStatus();
    const healthy = status.initialized && status.server === 'running';

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      details: status,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/realtime/test
 * Test endpoint for Socket.IO functionality
 */
router.get(
  '/test',
  asyncHandler(async (req, res) => {
    const testResults = {
      serviceInitialized: socketService.getStatus().initialized,
      connectedClients: socketService.getMetrics().connectedClients,
      supportedEvents: socketService.getSupportedEvents(),
      testMessage: 'Socket.IO service is operational',
      timestamp: new Date().toISOString(),
    };

    // Trigger a test broadcast
    if (socketService.getStatus().initialized) {
      socketService.broadcastSystemNotification('Test broadcast from REST API', 'info');
      testResults.testBroadcast = true;
    } else {
      testResults.testBroadcast = false;
    }

    res.json({
      success: true,
      test: testResults,
    });
  })
);

export default router;
