/**
 * ACT Slack-Kafka Data Connector
 * Real-time Slack message processing for ACT Farmhand AI Agent
 */

import { Kafka } from 'kafkajs';
import { WebClient } from '@slack/web-api';
import { createEventAdapter } from '@slack/events-api';
import Redis from 'ioredis';

class SlackKafkaConnector {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'act-slack-connector',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize Slack Web API client
    this.slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Initialize Slack Events API adapter
    this.slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
    
    this.isConnected = false;
    this.messageBuffer = [];
    this.lastProcessedTimestamp = new Map(); // Channel -> timestamp mapping
    
    console.log('🔗 Slack-Kafka Connector initialized');
  }

  async connect() {
    try {
      // Connect to Kafka
      await this.producer.connect();
      
      // Setup Slack event listeners
      this.setupSlackEventListeners();
      
      // Load last processed timestamps from Redis
      await this.loadLastProcessedTimestamps();
      
      this.isConnected = true;
      console.log('✅ Slack-Kafka Connector connected');
      
      // Start background sync for historical messages
      this.startHistoricalSync();
      
    } catch (error) {
      console.error('🚨 Failed to connect Slack-Kafka Connector:', error);
      throw error;
    }
  }

  setupSlackEventListeners() {
    // Listen for new messages
    this.slackEvents.on('message', async (event) => {
      await this.processSlackMessage(event);
    });
    
    // Listen for app mentions
    this.slackEvents.on('app_mention', async (event) => {
      await this.processSlackMention(event);
    });
    
    // Listen for reactions (sentiment indicators)
    this.slackEvents.on('reaction_added', async (event) => {
      await this.processSlackReaction(event, 'added');
    });
    
    this.slackEvents.on('reaction_removed', async (event) => {
      await this.processSlackReaction(event, 'removed');
    });
    
    // Handle member joined/left events
    this.slackEvents.on('member_joined_channel', async (event) => {
      await this.processChannelMemberChange(event, 'joined');
    });
    
    this.slackEvents.on('member_left_channel', async (event) => {
      await this.processChannelMemberChange(event, 'left');
    });
    
    console.log('🎧 Slack event listeners configured');
  }

  async processSlackMessage(event) {
    try {
      // Skip bot messages and messages without text
      if (event.bot_id || event.subtype === 'bot_message' || !event.text) {
        return;
      }
      
      // Get channel info
      const channel = await this.getChannelInfo(event.channel);
      
      // Get user info
      const user = await this.getUserInfo(event.user);
      
      // Extract mentions, links, and threads
      const messageData = {
        id: event.ts,
        timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
        channel: {
          id: event.channel,
          name: channel?.name || 'unknown',
          is_private: channel?.is_private || false
        },
        user: {
          id: event.user,
          name: user?.real_name || user?.name || 'unknown',
          email: user?.profile?.email
        },
        text: event.text,
        thread_ts: event.thread_ts,
        mentions: this.extractMentions(event.text),
        links: this.extractLinks(event.text),
        files: event.files || [],
        reactions: [],
        message_type: 'standard'
      };
      
      // Check for ACT-relevant keywords
      const relevanceScore = this.calculateRelevanceScore(event.text, channel?.name);
      messageData.relevance_score = relevanceScore;
      
      // Only process messages with some relevance
      if (relevanceScore > 0.1) {
        await this.sendToKafka('act.slack.messages', event.ts, messageData);
        
        // Cache for quick lookup
        await this.cacheSlackData('message', event.ts, messageData);
      }
      
      // Update last processed timestamp for channel
      await this.updateLastProcessedTimestamp(event.channel, event.ts);
      
    } catch (error) {
      console.error('Error processing Slack message:', error);
    }
  }

  async processSlackMention(event) {
    try {
      const channel = await this.getChannelInfo(event.channel);
      const user = await this.getUserInfo(event.user);
      
      const mentionData = {
        id: event.ts,
        timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
        channel: {
          id: event.channel,
          name: channel?.name || 'unknown'
        },
        user: {
          id: event.user,
          name: user?.real_name || user?.name || 'unknown'
        },
        text: event.text,
        message_type: 'mention',
        requires_response: true
      };
      
      await this.sendToKafka('act.slack.mentions', event.ts, mentionData);
      
      // Auto-respond with Farmhand Agent if configured
      if (process.env.SLACK_AUTO_RESPOND === 'true') {
        await this.respondToMention(event);
      }
      
    } catch (error) {
      console.error('Error processing Slack mention:', error);
    }
  }

  async processSlackReaction(event, action) {
    try {
      const reactionData = {
        message_ts: event.item.ts,
        channel: event.item.channel,
        user: event.user,
        reaction: event.reaction,
        action: action, // 'added' or 'removed'
        timestamp: new Date().toISOString()
      };
      
      await this.sendToKafka('act.slack.reactions', `${event.item.ts}_${event.reaction}`, reactionData);
      
    } catch (error) {
      console.error('Error processing Slack reaction:', error);
    }
  }

  async processChannelMemberChange(event, action) {
    try {
      const channel = await this.getChannelInfo(event.channel);
      const user = await this.getUserInfo(event.user);
      
      const memberChangeData = {
        channel: {
          id: event.channel,
          name: channel?.name || 'unknown'
        },
        user: {
          id: event.user,
          name: user?.real_name || user?.name || 'unknown'
        },
        action: action, // 'joined' or 'left'
        timestamp: new Date().toISOString()
      };
      
      await this.sendToKafka('act.slack.member_changes', `${event.channel}_${event.user}`, memberChangeData);
      
    } catch (error) {
      console.error('Error processing channel member change:', error);
    }
  }

  extractMentions(text) {
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  extractLinks(text) {
    const linkRegex = /<(https?:\/\/[^>|]+)(\|([^>]+))?>/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
      links.push({
        url: match[1],
        title: match[3] || match[1]
      });
    }
    
    return links;
  }

  calculateRelevanceScore(text, channelName) {
    const actKeywords = [
      // Core ACT concepts
      'community', 'justice', 'story', 'stories', 'empathy', 'ledger',
      'tractor', 'curious', 'farmhand', 'goods', 'justicehub', 'picc',
      
      // Australian context
      'indigenous', 'aboriginal', 'torres strait', 'first nations',
      'mob', 'country', 'land rights', 'sovereignty',
      
      // Justice themes
      'incarceration', 'prison', 'justice reform', 'court', 'legal',
      'restorative justice', 'therapeutic', 'healing',
      
      // Community themes
      'wellbeing', 'mental health', 'culture', 'connection',
      'healing', 'trauma', 'recovery', 'support',
      
      // Funding/grants
      'grant', 'funding', 'application', 'submission',
      'budget', 'financial', 'resource'
    ];
    
    const textLower = text.toLowerCase();
    let score = 0;
    
    // Keyword matching
    for (const keyword of actKeywords) {
      if (textLower.includes(keyword)) {
        score += 0.1;
      }
    }
    
    // Channel-based relevance
    if (channelName) {
      const channelLower = channelName.toLowerCase();
      if (channelLower.includes('act') || channelLower.includes('community') || 
          channelLower.includes('justice') || channelLower.includes('story')) {
        score += 0.2;
      }
    }
    
    // Message length consideration
    const wordCount = text.split(' ').length;
    if (wordCount > 10) score += 0.1;
    if (wordCount > 50) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  async getChannelInfo(channelId) {
    const cacheKey = `slack:channel:${channelId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const result = await this.slack.conversations.info({
        channel: channelId
      });
      
      const channelInfo = result.channel;
      
      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(channelInfo));
      
      return channelInfo;
    } catch (error) {
      console.warn(`Failed to get channel info for ${channelId}:`, error.message);
      return null;
    }
  }

  async getUserInfo(userId) {
    const cacheKey = `slack:user:${userId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    try {
      const result = await this.slack.users.info({
        user: userId
      });
      
      const userInfo = result.user;
      
      // Cache for 4 hours
      await this.redis.setex(cacheKey, 14400, JSON.stringify(userInfo));
      
      return userInfo;
    } catch (error) {
      console.warn(`Failed to get user info for ${userId}:`, error.message);
      return null;
    }
  }

  async sendToKafka(topic, key, data) {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: key,
          value: JSON.stringify(data),
          timestamp: Date.now().toString()
        }]
      });
      
      console.log(`📨 Sent Slack data to Kafka topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to send to Kafka topic ${topic}:`, error);
      // Add to buffer for retry
      this.messageBuffer.push({ topic, key, data });
    }
  }

  async cacheSlackData(type, id, data) {
    const cacheKey = `slack:${type}:${id}`;
    await this.redis.setex(cacheKey, 86400, JSON.stringify(data)); // 24 hours
  }

  async respondToMention(event) {
    try {
      // Simple auto-response - could integrate with ACT Farmhand Agent
      const response = "👋 Thanks for mentioning me! I'm the ACT Farmhand AI Agent. I'm processing your message and will help identify any opportunities or actions. For detailed analysis, you can also use our web interface.";
      
      await this.slack.chat.postMessage({
        channel: event.channel,
        text: response,
        thread_ts: event.ts, // Reply in thread
        username: 'ACT Farmhand',
        icon_emoji: ':tractor:'
      });
    } catch (error) {
      console.error('Failed to respond to mention:', error);
    }
  }

  async startHistoricalSync() {
    console.log('🔄 Starting historical Slack message sync...');
    
    try {
      // Get list of channels
      const channels = await this.slack.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 100
      });
      
      for (const channel of channels.channels) {
        // Skip channels we shouldn't access
        if (channel.is_archived || channel.is_external) continue;
        
        await this.syncChannelHistory(channel.id, channel.name);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('✅ Historical sync completed');
    } catch (error) {
      console.error('🚨 Historical sync failed:', error);
    }
  }

  async syncChannelHistory(channelId, channelName) {
    try {
      const lastProcessed = await this.getLastProcessedTimestamp(channelId);
      const oldest = lastProcessed || (Date.now() / 1000 - 7 * 24 * 60 * 60); // Last 7 days
      
      const result = await this.slack.conversations.history({
        channel: channelId,
        oldest: oldest.toString(),
        limit: 100
      });
      
      console.log(`📥 Syncing ${result.messages.length} messages from #${channelName}`);
      
      for (const message of result.messages.reverse()) {
        await this.processSlackMessage({
          ...message,
          channel: channelId
        });
        
        // Small delay to avoid overwhelming Kafka
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.warn(`Failed to sync channel ${channelName}:`, error.message);
    }
  }

  async loadLastProcessedTimestamps() {
    const keys = await this.redis.keys('slack:last_processed:*');
    
    for (const key of keys) {
      const channelId = key.split(':').pop();
      const timestamp = await this.redis.get(key);
      this.lastProcessedTimestamp.set(channelId, parseFloat(timestamp));
    }
  }

  async getLastProcessedTimestamp(channelId) {
    return this.lastProcessedTimestamp.get(channelId) ||
           parseFloat(await this.redis.get(`slack:last_processed:${channelId}`)) ||
           null;
  }

  async updateLastProcessedTimestamp(channelId, timestamp) {
    const ts = parseFloat(timestamp);
    this.lastProcessedTimestamp.set(channelId, ts);
    await this.redis.set(`slack:last_processed:${channelId}`, ts.toString());
  }

  async disconnect() {
    this.isConnected = false;
    
    try {
      await this.producer.disconnect();
      await this.redis.quit();
      console.log('✅ Slack-Kafka Connector disconnected');
    } catch (error) {
      console.error('🚨 Error disconnecting Slack-Kafka Connector:', error);
    }
  }

  // Health check for monitoring
  async healthCheck() {
    return {
      connected: this.isConnected,
      buffer_size: this.messageBuffer.length,
      channels_tracked: this.lastProcessedTimestamp.size,
      last_activity: new Date().toISOString()
    };
  }
}

export default SlackKafkaConnector;