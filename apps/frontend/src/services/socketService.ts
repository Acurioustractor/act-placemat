/**
 * Frontend Socket.IO Service
 * Task: 3.2 - Implement Real-Time Story Sharing System
 * Handles real-time communication with the backend Socket.IO server
 */

import { io, Socket } from 'socket.io-client'

interface ActivityUpdate {
  activity: any
  type: string
  timestamp: string
}

interface EngagementUpdate {
  engagement: any
  activityId: string
  action: string
}

export class SocketService {
  private socket: Socket | null = null
  private connected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private disabled = true // Temporarily disable all socket functionality

  // Event listeners for different types of real-time updates
  private listeners: {
    [key: string]: Array<(data: any) => void>
  } = {}

  constructor() {
    // Temporarily disabled - backend socket service is not initialized
    // this.connect()
    console.log('🔌 Socket service initialized but connection disabled until backend is ready')
  }

  /**
   * Connect to the Socket.IO server
   */
  async connect() {
    if (this.disabled) {
      console.log('🔌 Socket service is disabled')
      return
    }

    if (this.socket?.connected) {
      console.log('⚡ Already connected to real-time server')
      return
    }

    try {
      console.log('🔌 Connecting to real-time server...')

      this.socket = io('http://localhost:4000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: true,
        timeout: 20000
      })

      this.setupEventHandlers()
      
    } catch (error) {
      console.error('❌ Failed to connect to real-time server:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time server:', this.socket?.id)
      this.connected = true
      this.reconnectAttempts = 0

      // Join community rooms for real-time updates
      this.joinRoom('community')
      this.joinRoom('stories')
      this.joinRoom('projects')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from real-time server:', reason)
      this.connected = false
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      this.connected = false
      this.scheduleReconnect()
    })

    // Real-time data updates
    this.socket.on('new_story_shared', (data: ActivityUpdate) => {
      console.log('📖 New story shared:', data)
      this.emit('story_shared', data)
    })

    this.socket.on('project_updated', (data: ActivityUpdate) => {
      console.log('🚀 Project updated:', data)
      this.emit('project_updated', data)
    })

    this.socket.on('new_collaboration', (data: ActivityUpdate) => {
      console.log('🤝 New collaboration:', data)
      this.emit('collaboration_added', data)
    })

    this.socket.on('activity_updated', (data: ActivityUpdate) => {
      console.log('🌟 Community activity updated:', data)
      this.emit('activity_updated', data)
    })

    this.socket.on('engagement_updated', (data: EngagementUpdate) => {
      console.log('👍 Engagement updated:', data)
      this.emit('engagement_updated', data)
    })

    this.socket.on('system_notification', (data: any) => {
      console.log('📢 System notification:', data)
      this.emit('system_notification', data)
    })

    this.socket.on('room_joined', (data: any) => {
      console.log('📍 Joined room:', data.room)
    })

    this.socket.on('room_error', (data: any) => {
      console.error('❌ Room error:', data)
    })
  }

  /**
   * Join a specific room for targeted updates
   */
  joinRoom(roomName: string) {
    if (this.disabled) return
    if (this.socket?.connected) {
      this.socket.emit('join_room', roomName)
    }
  }

  /**
   * Leave a specific room
   */
  leaveRoom(roomName: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomName)
    }
  }

  /**
   * Share a new story with real-time broadcast
   */
  async shareStory(storyData: {
    title: string
    content: string
    tags?: string[]
    projectId?: string
  }) {
    if (this.disabled) {
      console.log('🔌 Socket service is disabled - story sharing unavailable')
      throw new Error('Real-time service unavailable')
    }
    
    try {
      const response = await fetch('http://localhost:4000/api/community/share-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storyData)
      })

      if (!response.ok) {
        throw new Error('Failed to share story')
      }

      const result = await response.json()
      console.log('✅ Story shared successfully:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to share story:', error)
      throw error
    }
  }

  /**
   * Post a project update with real-time broadcast
   */
  async postProjectUpdate(updateData: {
    projectId: string
    title: string
    description: string
    milestone?: string
  }) {
    try {
      const response = await fetch('http://localhost:4000/api/community/project-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to post project update')
      }

      const result = await response.json()
      console.log('✅ Project update posted successfully:', result)
      return result
    } catch (error) {
      console.error('❌ Failed to post project update:', error)
      throw error
    }
  }

  /**
   * Handle engagement actions (like, comment, share)
   */
  async handleEngagement(activityId: string, action: 'like' | 'unlike' | 'comment' | 'share', data?: any) {
    if (this.disabled) {
      console.log('🔌 Socket service is disabled - engagement unavailable')
      throw new Error('Real-time service unavailable')
    }
    
    try {
      const response = await fetch('http://localhost:4000/api/community/engagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activityId, action, data })
      })

      if (!response.ok) {
        throw new Error('Failed to process engagement')
      }

      const result = await response.json()
      console.log(`✅ Engagement ${action} processed:`, result)
      return result
    } catch (error) {
      console.error(`❌ Failed to process ${action}:`, error)
      throw error
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = []
    }
    this.listeners[eventType].push(callback)
  }

  /**
   * Unsubscribe from event types
   */
  off(eventType: string, callback: (data: any) => void) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback)
    }
  }

  /**
   * Emit events to listeners
   */
  private emit(eventType: string, data: any) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error)
        }
      })
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (this.disabled) {
      return {
        connected: false,
        socketId: null,
        reconnectAttempts: 0,
        disabled: true
      }
    }
    
    return {
      connected: this.connected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService