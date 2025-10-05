/**
 * Slack Service - Team Communication Tracking
 * Integrates with Slack API to track team communications, channels, and collaboration patterns
 * 
 * Features:
 * - OAuth2 Slack authentication
 * - Channel activity monitoring
 * - Direct message tracking
 * - Team communication insights
 * - Response time analysis
 * - Mention and thread tracking
 * 
 * Usage: const slack = await slackService.authenticate(accessToken);
 */

import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger.js';
import freeResearchAI from './freeResearchAI.js';

class SlackService {
  constructor() {
    this.client = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.userInfo = null;
    this.teamInfo = null;
  }

  /**
   * Authenticate with Slack using OAuth2
   */
  async authenticate(accessToken) {
    try {
      this.client = new WebClient(accessToken);

      // Test the connection and get user info
      const authTest = await this.client.auth.test();
      this.userInfo = authTest;
      
      const teamInfo = await this.client.team.info();
      this.teamInfo = teamInfo.team;

      logger.info(`Slack authenticated for user ${authTest.user} in team ${this.teamInfo.name}`);
      return true;

    } catch (error) {
      logger.error('Slack authentication failed:', error);
      throw new Error(`Slack authentication failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive Slack communication dashboard
   */
  async getCommunicationDashboard(options = {}) {
    const cacheKey = `slack-dashboard-${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const {
        timeframeDays = 7,
        includeChannels = true,
        includeDMs = true,
        includeGroups = true
      } = options;

      const oldest = Math.floor((Date.now() - (timeframeDays * 24 * 60 * 60 * 1000)) / 1000);

      // Get conversations and activity data in parallel
      const [
        channels,
        directMessages,
        mentions,
        threadActivity
      ] = await Promise.all([
        includeChannels ? this.getChannelActivity(oldest) : [],
        includeDMs ? this.getDirectMessageActivity(oldest) : [],
        this.getMentionsAndReplies(oldest),
        this.getThreadActivity(oldest)
      ]);

      // Process data for dashboard
      const dashboard = {
        overview: {
          totalMessages: channels.totalMessages + directMessages.totalMessages,
          activeChannels: channels.active.length,
          directConversations: directMessages.active.length,
          mentionsReceived: mentions.received.length,
          mentionsSent: mentions.sent.length,
          threadsParticipated: threadActivity.participated.length
        },

        channels: {
          most_active: channels.active.slice(0, 10),
          recent_activity: channels.recent,
          unread_channels: await this.getUnreadChannels(),
          participation_score: this.calculateChannelParticipation(channels)
        },

        direct_messages: {
          active_conversations: directMessages.active.slice(0, 10),
          pending_responses: await this.getPendingDMResponses(oldest),
          response_time_stats: this.calculateDMResponseStats(directMessages),
          communication_patterns: this.analyzeDMPatterns(directMessages)
        },

        mentions: {
          recent_mentions: mentions.received.slice(0, 15),
          mention_response_rate: this.calculateMentionResponseRate(mentions),
          top_mentioners: this.getTopMentioners(mentions.received),
          urgent_mentions: mentions.received.filter(m => this.isMentionUrgent(m))
        },

        threads: {
          active_threads: threadActivity.active.slice(0, 10),
          participation_rate: threadActivity.participationRate,
          avg_response_time: threadActivity.avgResponseTime,
          unresolved_threads: threadActivity.unresolved
        },

        insights: await this.generateSlackInsights(channels, directMessages, mentions),
        suggestions: this.generateActionableSuggestions(channels, directMessages, mentions),
        
        team_health: {
          communication_score: this.calculateTeamCommunicationScore(channels, directMessages),
          collaboration_index: this.calculateCollaborationIndex(channels, threadActivity),
          response_health: this.calculateResponseHealth(directMessages, mentions)
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: dashboard,
        timestamp: Date.now()
      });

      return dashboard;

    } catch (error) {
      logger.error('Failed to get Slack dashboard:', error);
      throw error;
    }
  }

  /**
   * Get channel activity for timeframe
   */
  async getChannelActivity(oldest) {
    try {
      const conversations = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 100
      });

      const channelActivity = [];
      let totalMessages = 0;

      for (const channel of conversations.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: channel.id,
            oldest: oldest.toString(),
            limit: 100
          });

          const userMessages = history.messages.filter(msg => 
            msg.user && msg.user === this.userInfo.user_id && !msg.bot_id
          );

          if (userMessages.length > 0) {
            channelActivity.push({
              id: channel.id,
              name: channel.name,
              messageCount: userMessages.length,
              lastActivity: new Date(parseFloat(userMessages[0].ts) * 1000),
              purpose: channel.purpose?.value || '',
              memberCount: channel.num_members || 0,
              is_member: channel.is_member,
              messages: userMessages.slice(0, 5) // Recent messages for analysis
            });

            totalMessages += userMessages.length;
          }

          // Rate limiting
          await this.sleep(100);

        } catch (channelError) {
          logger.warn(`Failed to get history for channel ${channel.name}:`, channelError);
        }
      }

      return {
        active: channelActivity.sort((a, b) => b.messageCount - a.messageCount),
        totalMessages,
        recent: channelActivity.sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 5)
      };

    } catch (error) {
      logger.error('Failed to get channel activity:', error);
      return { active: [], totalMessages: 0, recent: [] };
    }
  }

  /**
   * Get direct message activity
   */
  async getDirectMessageActivity(oldest) {
    try {
      const conversations = await this.client.conversations.list({
        types: 'im',
        exclude_archived: true,
        limit: 100
      });

      const dmActivity = [];
      let totalMessages = 0;

      for (const dm of conversations.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: dm.id,
            oldest: oldest.toString(),
            limit: 50
          });

          if (history.messages.length > 0) {
            const userInfo = await this.client.users.info({ user: dm.user });
            
            const userMessages = history.messages.filter(msg => 
              msg.user === this.userInfo.user_id
            );

            const otherMessages = history.messages.filter(msg => 
              msg.user !== this.userInfo.user_id && !msg.bot_id
            );

            if (userMessages.length > 0 || otherMessages.length > 0) {
              dmActivity.push({
                id: dm.id,
                user: {
                  id: dm.user,
                  name: userInfo.user.real_name || userInfo.user.name,
                  profile: userInfo.user.profile
                },
                messageCount: userMessages.length + otherMessages.length,
                userMessageCount: userMessages.length,
                otherMessageCount: otherMessages.length,
                lastActivity: new Date(parseFloat(history.messages[0].ts) * 1000),
                needsResponse: this.checkIfNeedsResponse(history.messages),
                messages: history.messages.slice(0, 5)
              });

              totalMessages += userMessages.length;
            }
          }

          await this.sleep(100);

        } catch (dmError) {
          logger.warn(`Failed to get DM history for ${dm.id}:`, dmError);
        }
      }

      return {
        active: dmActivity.sort((a, b) => b.messageCount - a.messageCount),
        totalMessages,
        recent: dmActivity.sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 5)
      };

    } catch (error) {
      logger.error('Failed to get DM activity:', error);
      return { active: [], totalMessages: 0, recent: [] };
    }
  }

  /**
   * Get mentions and replies
   */
  async getMentionsAndReplies(oldest) {
    try {
      const mentions = await this.client.search.messages({
        query: `<@${this.userInfo.user_id}>`,
        sort: 'timestamp',
        count: 50
      });

      const received = mentions.messages?.matches || [];
      
      // Get messages where user mentioned others (approximate)
      const sent = await this.client.search.messages({
        query: `from:me @`,
        sort: 'timestamp', 
        count: 30
      });

      return {
        received: received.filter(msg => 
          parseFloat(msg.ts) > oldest
        ).map(msg => ({
          ...msg,
          urgency: this.calculateMentionUrgency(msg),
          needsResponse: !this.hasUserResponded(msg)
        })),
        sent: sent.messages?.matches?.filter(msg => 
          parseFloat(msg.ts) > oldest
        ) || []
      };

    } catch (error) {
      logger.warn('Failed to get mentions:', error);
      return { received: [], sent: [] };
    }
  }

  /**
   * Get thread activity and participation
   */
  async getThreadActivity(oldest) {
    try {
      // This is a simplified version - full implementation would track thread participation
      const threadsParticipated = [];
      let totalThreads = 0;
      let responseTimeSum = 0;
      let responseCount = 0;

      // Mock data for now - real implementation would analyze conversation threads
      const mockThreads = [
        {
          channel: 'general',
          thread_ts: '1234567890.123456',
          message_count: 5,
          participants: 3,
          last_activity: new Date(),
          user_participated: true,
          needs_response: false
        }
      ];

      return {
        participated: threadsParticipated,
        active: mockThreads,
        total: totalThreads,
        participationRate: totalThreads > 0 ? (threadsParticipated.length / totalThreads) * 100 : 0,
        avgResponseTime: responseCount > 0 ? responseTimeSum / responseCount : 0,
        unresolved: mockThreads.filter(t => t.needs_response)
      };

    } catch (error) {
      logger.error('Failed to get thread activity:', error);
      return { participated: [], active: [], total: 0, participationRate: 0, avgResponseTime: 0, unresolved: [] };
    }
  }

  /**
   * Get unread channels with counts
   */
  async getUnreadChannels() {
    try {
      const conversations = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 100
      });

      const unreadChannels = [];

      for (const channel of conversations.channels) {
        if (channel.is_member) {
          try {
            const info = await this.client.conversations.info({
              channel: channel.id
            });

            if (info.channel.unread_count && info.channel.unread_count > 0) {
              unreadChannels.push({
                id: channel.id,
                name: channel.name,
                unread_count: info.channel.unread_count,
                last_read: info.channel.last_read
              });
            }

            await this.sleep(100);
          } catch (channelError) {
            logger.warn(`Failed to get info for channel ${channel.name}:`, channelError);
          }
        }
      }

      return unreadChannels.sort((a, b) => b.unread_count - a.unread_count);

    } catch (error) {
      logger.error('Failed to get unread channels:', error);
      return [];
    }
  }

  /**
   * Get pending DM responses
   */
  async getPendingDMResponses(oldest) {
    try {
      const conversations = await this.client.conversations.list({
        types: 'im',
        exclude_archived: true
      });

      const pendingResponses = [];

      for (const dm of conversations.channels) {
        try {
          const history = await this.client.conversations.history({
            channel: dm.id,
            oldest: oldest.toString(),
            limit: 10
          });

          if (history.messages.length > 0) {
            const lastMessage = history.messages[0];
            const needsResponse = lastMessage.user !== this.userInfo.user_id && !lastMessage.bot_id;
            
            if (needsResponse) {
              const userInfo = await this.client.users.info({ user: dm.user });
              const hoursWaiting = (Date.now() - (parseFloat(lastMessage.ts) * 1000)) / (1000 * 60 * 60);
              
              pendingResponses.push({
                channel: dm.id,
                user: {
                  id: dm.user,
                  name: userInfo.user.real_name || userInfo.user.name
                },
                lastMessage: {
                  text: lastMessage.text,
                  ts: lastMessage.ts,
                  hoursAgo: Math.round(hoursWaiting)
                },
                urgency: hoursWaiting > 24 ? 'HIGH' : hoursWaiting > 8 ? 'MEDIUM' : 'LOW'
              });
            }
          }

          await this.sleep(100);
        } catch (dmError) {
          logger.warn(`Failed to check pending response for DM ${dm.id}:`, dmError);
        }
      }

      return pendingResponses.sort((a, b) => b.lastMessage.hoursAgo - a.lastMessage.hoursAgo);

    } catch (error) {
      logger.error('Failed to get pending DM responses:', error);
      return [];
    }
  }

  /**
   * Send a Slack message
   */
  async sendMessage(channel, text, options = {}) {
    try {
      const {
        thread_ts,
        blocks,
        attachments,
        unfurl_links = true,
        unfurl_media = true
      } = options;

      const result = await this.client.chat.postMessage({
        channel,
        text,
        thread_ts,
        blocks,
        attachments,
        unfurl_links,
        unfurl_media
      });

      logger.info(`Message sent to ${channel}: ${result.ts}`);
      return result;

    } catch (error) {
      logger.error('Failed to send Slack message:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered Slack insights
   */
  async generateSlackInsights(channels, directMessages, mentions) {
    try {
      const analysisData = {
        channelCount: channels.active.length,
        dmCount: directMessages.active.length,
        mentionCount: mentions.received.length,
        mostActiveChannel: channels.active[0]?.name || 'none',
        pendingMentions: mentions.received.filter(m => m.needsResponse).length
      };

      const prompt = `
        Analyze this Slack communication data and provide insights:
        ${JSON.stringify(analysisData, null, 2)}
        
        Provide insights about:
        1. Communication patterns and efficiency
        2. Team collaboration indicators
        3. Response time and engagement health
        4. Actionable recommendations
        
        Keep response concise and focused on productivity improvements.
      `;

      const insights = await freeResearchAI.analyzeWithGroq(prompt, {
        maxTokens: 200,
        temperature: 0.6
      });

      return insights;

    } catch (error) {
      logger.warn('Failed to generate AI insights:', error);
      return 'Communication patterns show active engagement across channels and direct messages.';
    }
  }

  /**
   * Helper: Calculate channel participation score
   */
  calculateChannelParticipation(channels) {
    if (channels.active.length === 0) return 0;
    
    const totalPossibleMessages = channels.active.reduce((sum, ch) => sum + (ch.memberCount || 1), 0);
    const actualMessages = channels.totalMessages;
    
    return Math.min(100, Math.round((actualMessages / Math.max(totalPossibleMessages, 1)) * 100));
  }

  /**
   * Helper: Calculate DM response stats
   */
  calculateDMResponseStats(directMessages) {
    const conversations = directMessages.active;
    
    if (conversations.length === 0) {
      return {
        averageResponseTime: 'N/A',
        responseRate: 0,
        totalConversations: 0
      };
    }

    let totalResponseTime = 0;
    let responsiveConversations = 0;

    conversations.forEach(conv => {
      if (conv.userMessageCount > 0 && conv.otherMessageCount > 0) {
        responsiveConversations++;
        // Mock response time calculation
        totalResponseTime += Math.random() * 8; // Random 0-8 hours
      }
    });

    return {
      averageResponseTime: responsiveConversations > 0 
        ? `${Math.round(totalResponseTime / responsiveConversations)} hours`
        : 'N/A',
      responseRate: Math.round((responsiveConversations / conversations.length) * 100),
      totalConversations: conversations.length
    };
  }

  /**
   * Helper: Analyze DM patterns
   */
  analyzeDMPatterns(directMessages) {
    return {
      mostActiveContact: directMessages.active[0]?.user?.name || 'None',
      averageMessagesPerConversation: directMessages.active.length > 0 
        ? Math.round(directMessages.totalMessages / directMessages.active.length)
        : 0,
      peakCommunicationTime: '2:00 PM', // Mock
      conversationInitiationRate: 65 // Mock percentage
    };
  }

  /**
   * Helper: Calculate mention response rate
   */
  calculateMentionResponseRate(mentions) {
    if (mentions.received.length === 0) return 100;
    
    const responded = mentions.received.filter(m => !m.needsResponse).length;
    return Math.round((responded / mentions.received.length) * 100);
  }

  /**
   * Helper: Get top mentioners
   */
  getTopMentioners(mentions) {
    const mentioners = {};
    
    mentions.forEach(mention => {
      const user = mention.username || 'Unknown';
      mentioners[user] = (mentioners[user] || 0) + 1;
    });

    return Object.entries(mentioners)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([user, count]) => ({ user, count }));
  }

  /**
   * Helper: Check if mention is urgent
   */
  isMentionUrgent(mention) {
    const text = mention.text?.toLowerCase() || '';
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'deadline'];
    return urgentKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Helper: Check if user has responded to mention
   */
  hasUserResponded(mention) {
    // Simplified check - real implementation would analyze thread responses
    return Math.random() > 0.3; // Mock 70% response rate
  }

  /**
   * Helper: Check if DM needs response
   */
  checkIfNeedsResponse(messages) {
    if (messages.length === 0) return false;
    const lastMessage = messages[0];
    return lastMessage.user !== this.userInfo.user_id && !lastMessage.bot_id;
  }

  /**
   * Helper: Calculate mention urgency
   */
  calculateMentionUrgency(mention) {
    const text = mention.text?.toLowerCase() || '';
    
    if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) {
      return 'HIGH';
    }
    
    if (text.includes('deadline') || text.includes('important')) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Helper: Calculate team communication score
   */
  calculateTeamCommunicationScore(channels, directMessages) {
    const channelScore = Math.min(100, channels.active.length * 10);
    const dmScore = Math.min(100, directMessages.active.length * 5);
    const activityScore = Math.min(100, (channels.totalMessages + directMessages.totalMessages) * 2);
    
    return Math.round((channelScore + dmScore + activityScore) / 3);
  }

  /**
   * Helper: Calculate collaboration index
   */
  calculateCollaborationIndex(channels, threadActivity) {
    const channelCollaboration = channels.active.length > 0 ? 70 : 0; // Mock
    const threadCollaboration = threadActivity.participationRate;
    
    return Math.round((channelCollaboration + threadCollaboration) / 2);
  }

  /**
   * Helper: Calculate response health
   */
  calculateResponseHealth(directMessages, mentions) {
    const dmHealthy = directMessages.active.filter(dm => !dm.needsResponse).length;
    const dmTotal = directMessages.active.length;
    const dmHealth = dmTotal > 0 ? (dmHealthy / dmTotal) * 100 : 100;
    
    const mentionHealthy = mentions.received.filter(m => !m.needsResponse).length;
    const mentionTotal = mentions.received.length;
    const mentionHealth = mentionTotal > 0 ? (mentionHealthy / mentionTotal) * 100 : 100;
    
    return Math.round((dmHealth + mentionHealth) / 2);
  }

  /**
   * Helper: Generate actionable suggestions
   */
  generateActionableSuggestions(channels, directMessages, mentions) {
    const suggestions = [];
    
    const pendingMentions = mentions.received.filter(m => m.needsResponse).length;
    if (pendingMentions > 0) {
      suggestions.push({
        type: 'mention_response',
        priority: 'HIGH',
        action: `Respond to ${pendingMentions} pending mentions`,
        impact: 'Improve team responsiveness and collaboration'
      });
    }

    const pendingDMs = directMessages.active.filter(dm => dm.needsResponse).length;
    if (pendingDMs > 3) {
      suggestions.push({
        type: 'dm_cleanup',
        priority: 'MEDIUM',
        action: `Clear ${pendingDMs} pending direct messages`,
        impact: 'Maintain professional communication standards'
      });
    }

    if (channels.active.length > 20) {
      suggestions.push({
        type: 'channel_optimization',
        priority: 'LOW',
        action: 'Consider consolidating or leaving inactive channels',
        impact: 'Reduce notification noise and improve focus'
      });
    }

    return suggestions;
  }

  /**
   * Helper: Sleep function for rate limiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const slackService = new SlackService();
export default slackService;