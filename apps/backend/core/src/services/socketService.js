/**
 * Socket.IO Real-Time Communication Service
 * Task: 10.1 - Set Up Socket.IO v4+ for Real-Time Communication
 * Handles WebSocket connections and real-time data synchronization
 */

import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.roomSubscriptions = new Map();
    this.initialized = false;
  }

  /**
   * Initialize Socket.IO server with HTTP server
   * @param {Object} httpServer - Express HTTP server instance
   * @param {Object} redisClient - Redis client for scaling across multiple servers
   */
  async initialize(httpServer, redisClient = null) {
    try {
      console.log('🔌 Initializing Socket.IO v4+ real-time communication...');

      // Create Socket.IO server with comprehensive configuration
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin:
            process.env.NODE_ENV === 'production'
              ? [
                  'https://act.org.au',
                  'https://placemat.act.org.au',
                  'https://dashboard.act.org.au',
                ]
              : [
                  'http://localhost:3000',
                  'http://localhost:3001',
                  'http://localhost:5173',
                  'http://localhost:5174',
                  'http://localhost:5175',
                ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        transports: ['websocket', 'polling'],
        allowEIO3: true,
      });

      // Set up Redis adapter for horizontal scaling if Redis is available
      if (redisClient) {
        try {
          const pubClient = redisClient;
          const subClient = redisClient.duplicate();
          this.io.adapter(createAdapter(pubClient, subClient));
          console.log('✅ Socket.IO Redis adapter configured for scaling');
        } catch (redisError) {
          console.warn(
            '⚠️ Redis adapter setup failed, using memory adapter:',
            redisError.message
          );
        }
      }

      // Authentication middleware
      this.io.use(async (socket, next) => {
        try {
          const token =
            socket.handshake.auth.token ||
            socket.handshake.headers.authorization?.replace('Bearer ', '');

          if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId || decoded.user_id || decoded.id;
            socket.userEmail = decoded.email;
            socket.authenticated = true;
          } else {
            // Allow unauthenticated connections but with limited functionality
            socket.authenticated = false;
          }

          next();
        } catch (authError) {
          console.warn('⚠️ Socket authentication failed:', authError.message);
          socket.authenticated = false;
          next(); // Still allow connection but mark as unauthenticated
        }
      });

      // Connection event handlers
      this.setupConnectionHandlers();

      // Data synchronization event handlers
      this.setupDataSyncHandlers();

      this.initialized = true;
      console.log(
        '✅ Socket.IO real-time communication service initialized successfully'
      );

      return true;
    } catch (error) {
      console.error('❌ Socket.IO initialization failed:', error);
      return false;
    }
  }

  /**
   * Set up connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', socket => {
      const clientInfo = {
        id: socket.id,
        userId: socket.userId,
        email: socket.userEmail,
        authenticated: socket.authenticated,
        connectedAt: new Date().toISOString(),
        rooms: new Set(),
      };

      this.connectedClients.set(socket.id, clientInfo);

      console.log(
        `🔌 Client connected: ${socket.id} ${socket.authenticated ? `(User: ${socket.userEmail})` : '(Anonymous)'}`
      );

      // Handle client joining specific rooms for targeted updates
      socket.on('join_room', roomName => {
        if (this.isValidRoomName(roomName, socket)) {
          socket.join(roomName);
          clientInfo.rooms.add(roomName);

          // Track room subscriptions
          if (!this.roomSubscriptions.has(roomName)) {
            this.roomSubscriptions.set(roomName, new Set());
          }
          this.roomSubscriptions.get(roomName).add(socket.id);

          socket.emit('room_joined', {
            room: roomName,
            timestamp: new Date().toISOString(),
          });
          console.log(`📍 Client ${socket.id} joined room: ${roomName}`);
        } else {
          socket.emit('room_error', {
            message: 'Invalid or unauthorized room',
            room: roomName,
          });
        }
      });

      // Handle client leaving rooms
      socket.on('leave_room', roomName => {
        socket.leave(roomName);
        clientInfo.rooms.delete(roomName);

        if (this.roomSubscriptions.has(roomName)) {
          this.roomSubscriptions.get(roomName).delete(socket.id);
          if (this.roomSubscriptions.get(roomName).size === 0) {
            this.roomSubscriptions.delete(roomName);
          }
        }

        socket.emit('room_left', {
          room: roomName,
          timestamp: new Date().toISOString(),
        });
        console.log(`📍 Client ${socket.id} left room: ${roomName}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', reason => {
        this.handleClientDisconnection(socket, reason);
      });

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        authenticated: socket.authenticated,
        serverTime: new Date().toISOString(),
        supportedEvents: this.getSupportedEvents(),
      });
    });
  }

  /**
   * Set up data synchronization event handlers
   */
  setupDataSyncHandlers() {
    this.io.on('connection', socket => {
      // Story updates
      socket.on('story_update', data => {
        if (socket.authenticated) {
          this.broadcastToRoom('stories', 'story_updated', {
            ...data,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Project updates
      socket.on('project_update', data => {
        if (socket.authenticated) {
          this.broadcastToRoom('projects', 'project_updated', {
            ...data,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Organization updates
      socket.on('organization_update', data => {
        if (socket.authenticated) {
          this.broadcastToRoom('organizations', 'organization_updated', {
            ...data,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Dashboard data updates
      socket.on('dashboard_refresh', () => {
        if (socket.authenticated) {
          this.broadcastToRoom('dashboard', 'dashboard_data_refresh', {
            triggeredBy: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Real-time metrics updates
      socket.on('subscribe_metrics', metricTypes => {
        if (socket.authenticated && Array.isArray(metricTypes)) {
          metricTypes.forEach(metricType => {
            socket.join(`metrics:${metricType}`);
          });
          socket.emit('metrics_subscribed', {
            metricTypes,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  }

  /**
   * Validate room names and check permissions
   */
  isValidRoomName(roomName, socket) {
    const validRooms = [
      'stories',
      'projects',
      'organizations',
      'dashboard',
      'notifications',
    ];

    // Check if it's a user-specific room
    if (roomName.startsWith('user:') && socket.authenticated) {
      const requestedUserId = roomName.replace('user:', '');
      return requestedUserId === socket.userId;
    }

    // Check if it's a metrics room
    if (roomName.startsWith('metrics:') && socket.authenticated) {
      return true;
    }

    return validRooms.includes(roomName);
  }

  /**
   * Handle client disconnection cleanup
   */
  handleClientDisconnection(socket, reason) {
    const clientInfo = this.connectedClients.get(socket.id);

    if (clientInfo) {
      // Clean up room subscriptions
      clientInfo.rooms.forEach(roomName => {
        if (this.roomSubscriptions.has(roomName)) {
          this.roomSubscriptions.get(roomName).delete(socket.id);
          if (this.roomSubscriptions.get(roomName).size === 0) {
            this.roomSubscriptions.delete(roomName);
          }
        }
      });

      this.connectedClients.delete(socket.id);
    }

    console.log(
      `🔌 Client disconnected: ${socket.id} (${reason}) ${socket.authenticated ? `(User: ${socket.userEmail})` : '(Anonymous)'}`
    );
  }

  /**
   * Broadcast data update to specific room
   */
  broadcastToRoom(roomName, eventName, data) {
    if (!this.initialized || !this.io) {
      console.warn('⚠️ Socket.IO not initialized, cannot broadcast');
      return false;
    }

    this.io.to(roomName).emit(eventName, {
      ...data,
      serverTimestamp: new Date().toISOString(),
    });

    console.log(
      `📡 Broadcasted '${eventName}' to room '${roomName}' with ${this.roomSubscriptions.get(roomName)?.size || 0} clients`
    );
    return true;
  }

  /**
   * Send data to specific user
   */
  sendToUser(userId, eventName, data) {
    if (!this.initialized || !this.io) {
      console.warn('⚠️ Socket.IO not initialized, cannot send to user');
      return false;
    }

    this.io.to(`user:${userId}`).emit(eventName, {
      ...data,
      serverTimestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Broadcast system-wide notification
   */
  broadcastSystemNotification(message, type = 'info') {
    if (!this.initialized || !this.io) {
      console.warn('⚠️ Socket.IO not initialized, cannot broadcast notification');
      return false;
    }

    this.io.emit('system_notification', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    console.log(`📢 Broadcasted system notification: ${message}`);
    return true;
  }

  /**
   * Get real-time metrics for monitoring
   */
  getMetrics() {
    return {
      connectedClients: this.connectedClients.size,
      authenticatedClients: Array.from(this.connectedClients.values()).filter(
        client => client.authenticated
      ).length,
      activeRooms: this.roomSubscriptions.size,
      totalRoomSubscriptions: Array.from(this.roomSubscriptions.values()).reduce(
        (total, roomClients) => total + roomClients.size,
        0
      ),
      uptime: this.initialized ? Date.now() - this.initializeTime : 0,
    };
  }

  /**
   * Get list of supported real-time events
   */
  getSupportedEvents() {
    return {
      clientEvents: [
        'join_room',
        'leave_room',
        'ping',
        'story_update',
        'project_update',
        'organization_update',
        'dashboard_refresh',
        'subscribe_metrics',
      ],
      serverEvents: [
        'connected',
        'room_joined',
        'room_left',
        'room_error',
        'pong',
        'story_updated',
        'project_updated',
        'organization_updated',
        'dashboard_data_refresh',
        'metrics_update',
        'system_notification',
      ],
    };
  }

  /**
   * Get service status and health information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      server: this.io ? 'running' : 'not_running',
      metrics: this.getMetrics(),
      rooms: Array.from(this.roomSubscriptions.keys()),
      supportedEvents: this.getSupportedEvents(),
    };
  }

  /**
   * Trigger real-time data sync events from API operations
   */
  triggerDataSync(dataType, operation, data) {
    if (!this.initialized || !this.io) {
      return false;
    }

    const eventName = `${dataType}_${operation}`;
    const eventData = {
      type: dataType,
      operation,
      data,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to relevant rooms
    this.broadcastToRoom(dataType, eventName, eventData);

    // Also send to dashboard room for general updates
    this.broadcastToRoom('dashboard', 'data_sync_event', eventData);

    return true;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
