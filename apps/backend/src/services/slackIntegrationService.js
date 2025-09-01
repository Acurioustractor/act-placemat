/**
 * ACT Slack Integration Service
 * 
 * Philosophy: "Insights that serve community action - delivered where teams collaborate"
 * Embodies ACT values: Curious, Collaborative, Action-Oriented
 * 
 * Features:
 * - Real-time community insights delivery
 * - Story emergence notifications
 * - Supporter connection opportunities
 * - Project momentum tracking
 * - Empathy flow updates
 */

import { logger } from '../utils/logger.js';

class SlackIntegrationService {
    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.botToken = process.env.SLACK_BOT_TOKEN;
        this.channels = {
            community_insights: process.env.SLACK_COMMUNITY_CHANNEL || '#community-insights',
            project_updates: process.env.SLACK_PROJECTS_CHANNEL || '#project-updates',
            story_emergence: process.env.SLACK_STORIES_CHANNEL || '#story-emergence',
            supporter_connections: process.env.SLACK_SUPPORTERS_CHANNEL || '#supporter-connections',
            empathy_flow: process.env.SLACK_EMPATHY_CHANNEL || '#empathy-flow',
            general: process.env.SLACK_GENERAL_CHANNEL || '#general'
        };
        
        this.insightTemplates = new Map();
        this.setupInsightTemplates();
    }

    /**
     * Send community insight to appropriate Slack channel
     */
    async sendCommunityInsight(insight, channel = 'community_insights') {
        try {
            const message = this.formatInsightMessage(insight);
            const targetChannel = this.channels[channel] || this.channels.general;
            
            await this.sendSlackMessage(message, targetChannel);
            
            logger.info('Community insight sent to Slack', {
                channel: targetChannel,
                insightType: insight.type,
                confidence: insight.confidence
            });
            
        } catch (error) {
            logger.error('Failed to send community insight to Slack:', error);
        }
    }

    /**
     * Send story emergence notification
     */
    async notifyStoryEmergence(story, communityContext) {
        try {
            const message = {
                text: "🌟 *Community Story Emerging*",
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🌟 Community Story Emerging"
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Story Theme:* ${story.theme}\n*Community:* ${communityContext.location}\n*Empathy Score:* ${Math.round(story.empathyScore * 100)}%`
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Story Preview:*\n"${story.excerpt}"`
                        }
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Consent Status: ${story.consentVerified ? '✅ Verified' : '⏳ Pending'} | Community Voice: ${story.communityVoice ? '✅ Authentic' : '⚠️ External'}`
                            }
                        ]
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Review Story"
                                },
                                style: "primary",
                                url: `${process.env.FRONTEND_URL}/stories/${story.id}`
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Connect Supporter"
                                },
                                url: `${process.env.FRONTEND_URL}/supporters/match/${story.id}`
                            }
                        ]
                    }
                ]
            };

            await this.sendSlackMessage(message, this.channels.story_emergence);
            
        } catch (error) {
            logger.error('Failed to notify story emergence:', error);
        }
    }

    /**
     * Send project momentum update
     */
    async updateProjectMomentum(project, momentumData) {
        try {
            const momentumIcon = this.getMomentumIcon(momentumData.direction);
            const statusColor = this.getStatusColor(project.status);
            
            const message = {
                text: `${momentumIcon} Project Momentum Update: ${project.name}`,
                attachments: [
                    {
                        color: statusColor,
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `*${project.name}* ${momentumIcon}\n*Status:* ${project.status}\n*Community Ownership:* ${Math.round(project.communityOwnership * 100)}%`
                                }
                            },
                            {
                                type: "section",
                                fields: [
                                    {
                                        type: "mrkdwn",
                                        text: `*Momentum:* ${momentumData.score}/100`
                                    },
                                    {
                                        type: "mrkdwn",
                                        text: `*Direction:* ${momentumData.direction}`
                                    },
                                    {
                                        type: "mrkdwn",
                                        text: `*Stories:* ${momentumData.storyCount}`
                                    },
                                    {
                                        type: "mrkdwn",
                                        text: `*Connections:* ${momentumData.connectionCount}`
                                    }
                                ]
                            },
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `*Next Breakthrough:* ${momentumData.nextBreakthrough}`
                                }
                            }
                        ]
                    }
                ]
            };

            await this.sendSlackMessage(message, this.channels.project_updates);
            
        } catch (error) {
            logger.error('Failed to send project momentum update:', error);
        }
    }

    /**
     * Notify about supporter connection opportunity
     */
    async notifySupporterConnection(supporter, community, matchScore) {
        try {
            const message = {
                text: "🤝 *Supporter Connection Opportunity*",
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🤝 Supporter Connection Opportunity"
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*Supporter:* ${supporter.name}\n*Location:* ${supporter.location}\n*Values Alignment:* ${Math.round(matchScore.valuesAlignment * 100)}%`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Community:* ${community.name}\n*Focus Area:* ${community.focusArea}\n*Empathy Match:* ${Math.round(matchScore.empathyAlignment * 100)}%`
                            }
                        ]
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Connection Potential:* ${matchScore.overallScore}/100\n*Recommended Action:* ${this.getConnectionRecommendation(matchScore)}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Facilitate Introduction"
                                },
                                style: "primary",
                                url: `${process.env.FRONTEND_URL}/connections/facilitate/${supporter.id}/${community.id}`
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View Profiles"
                                },
                                url: `${process.env.FRONTEND_URL}/supporters/${supporter.id}`
                            }
                        ]
                    }
                ]
            };

            await this.sendSlackMessage(message, this.channels.supporter_connections);
            
        } catch (error) {
            logger.error('Failed to notify supporter connection:', error);
        }
    }

    /**
     * Send empathy flow update
     */
    async updateEmpathyFlow(flowData) {
        try {
            const trendIcon = flowData.trend === 'increasing' ? '📈' : flowData.trend === 'decreasing' ? '📉' : '➡️';
            
            const message = {
                text: `${trendIcon} *Empathy Flow Update*`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `${trendIcon} *Empathy Flow Analysis*\n\n*Overall Flow Score:* ${flowData.overallScore}/100\n*Trend:* ${flowData.trend} (${flowData.change}% this week)`
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Top Empathy Channels:*\n${flowData.topChannels.map(channel => `• ${channel.name}: ${channel.score}/100`).join('\n')}`
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Community Insight:* ${flowData.insight}\n\n*Recommended Actions:*\n${flowData.recommendations.map(rec => `• ${rec}`).join('\n')}`
                        }
                    }
                ]
            };

            await this.sendSlackMessage(message, this.channels.empathy_flow);
            
        } catch (error) {
            logger.error('Failed to send empathy flow update:', error);
        }
    }

    /**
     * Collect team insights from Slack conversations
     */
    async collectTeamInsights(channelId, timeframe = '24h') {
        try {
            if (!this.botToken) {
                logger.warn('Slack bot token not configured - cannot collect insights');
                return null;
            }

            // This would use Slack API to analyze team conversations
            // for ACT values, project mentions, community insights, etc.
            const insights = await this.analyzeSlackConversations(channelId, timeframe);
            
            return {
                channelId,
                timeframe,
                insights: insights.map(insight => ({
                    ...insight,
                    actValuesScore: this.calculateACTValuesFromText(insight.text),
                    communityFocus: this.detectCommunityFocus(insight.text),
                    empathyIndicators: this.detectEmpathyIndicators(insight.text)
                }))
            };
            
        } catch (error) {
            logger.error('Failed to collect team insights from Slack:', error);
            return null;
        }
    }

    /**
     * Send daily ecosystem digest
     */
    async sendDailyDigest(ecosystemData) {
        try {
            const message = {
                text: "🌱 *Daily ACT Ecosystem Digest*",
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "🌱 Daily ACT Ecosystem Digest"
                        }
                    },
                    {
                        type: "section",
                        fields: [
                            {
                                type: "mrkdwn",
                                text: `*Active Projects:* ${ecosystemData.activeProjects}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*New Stories:* ${ecosystemData.newStories}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Community Connections:* ${ecosystemData.newConnections}`
                            },
                            {
                                type: "mrkdwn",
                                text: `*Empathy Flow:* ${ecosystemData.empathyFlow}/100`
                            }
                        ]
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*🚀 Today's Breakthrough:*\n${ecosystemData.todaysBreakthrough}`
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*🌟 Community Highlight:*\n${ecosystemData.communityHighlight}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View Full Dashboard"
                                },
                                style: "primary",
                                url: `${process.env.FRONTEND_URL}/ecosystem`
                            }
                        ]
                    }
                ]
            };

            await this.sendSlackMessage(message, this.channels.general);
            
        } catch (error) {
            logger.error('Failed to send daily digest:', error);
        }
    }

    /**
     * Setup insight message templates
     */
    setupInsightTemplates() {
        this.insightTemplates.set('community-growth', {
            icon: '🌱',
            title: 'Community Growth Insight',
            color: '#2eb886'
        });
        
        this.insightTemplates.set('relationship-density', {
            icon: '🕸️',
            title: 'Relationship Network Insight',
            color: '#36c5f0'
        });
        
        this.insightTemplates.set('community-voice', {
            icon: '🗣️',
            title: 'Community Voice Insight',
            color: '#ecb22e'
        });
        
        this.insightTemplates.set('breakthrough-opportunity', {
            icon: '🚀',
            title: 'Breakthrough Opportunity',
            color: '#e01e5a'
        });
    }

    /**
     * Format insight message for Slack
     */
    formatInsightMessage(insight) {
        const template = this.insightTemplates.get(insight.type) || {
            icon: '💡',
            title: 'Community Insight',
            color: '#666666'
        };

        return {
            text: `${template.icon} *${template.title}*`,
            attachments: [
                {
                    color: template.color,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*${insight.title}*\n${insight.description}`
                            }
                        },
                        {
                            type: "section",
                            fields: [
                                {
                                    type: "mrkdwn",
                                    text: `*Confidence:* ${Math.round(insight.confidence * 100)}%`
                                },
                                {
                                    type: "mrkdwn",
                                    text: `*Actionable:* ${insight.actionable ? '✅ Yes' : '⏳ Analysis'}`
                                }
                            ]
                        },
                        ...(insight.evidence && insight.evidence.length > 0 ? [{
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Evidence:*\n${insight.evidence.slice(0, 3).map(e => `• ${e.description}`).join('\n')}`
                            }
                        }] : []),
                        ...(insight.communityImpact ? [{
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Community Impact:* ${insight.communityImpact}`
                            }
                        }] : [])
                    ]
                }
            ]
        };
    }

    /**
     * Send message to Slack
     */
    async sendSlackMessage(message, channel) {
        try {
            if (!this.webhookUrl && !this.botToken) {
                logger.warn('Slack integration not configured - message not sent');
                return;
            }

            // Use webhook URL for simple messages, bot token for complex interactions
            const response = await fetch(this.webhookUrl || 'https://hooks.slack.com/services/your/webhook/url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel: channel,
                    ...message
                })
            });

            if (!response.ok) {
                throw new Error(`Slack API error: ${response.status}`);
            }

            logger.debug('Message sent to Slack successfully', { channel });
            
        } catch (error) {
            logger.error('Failed to send Slack message:', error);
            throw error;
        }
    }

    // Helper methods
    getMomentumIcon(direction) {
        switch (direction) {
            case 'accelerating': return '🚀';
            case 'growing': return '📈';
            case 'steady': return '➡️';
            case 'slowing': return '📉';
            case 'stalled': return '⏸️';
            default: return '📊';
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'sprouting': return '#2eb886';
            case 'growing': return '#36c5f0';
            case 'harvesting': return '#ecb22e';
            case 'seed': return '#666666';
            default: return '#e01e5a';
        }
    }

    getConnectionRecommendation(matchScore) {
        if (matchScore.overallScore >= 80) return 'Direct introduction with shared story';
        if (matchScore.overallScore >= 60) return 'Facilitated conversation about shared values';
        if (matchScore.overallScore >= 40) return 'Group activity or community event invitation';
        return 'Continue relationship building before direct connection';
    }

    calculateACTValuesFromText(text) {
        // Simplified ACT values detection
        const lowerText = text.toLowerCase();
        let score = 0;
        
        if (lowerText.includes('community') || lowerText.includes('grassroots')) score += 0.2;
        if (lowerText.includes('empathy') || lowerText.includes('listening')) score += 0.2;
        if (lowerText.includes('curious') || lowerText.includes('learning')) score += 0.2;
        if (lowerText.includes('action') || lowerText.includes('change')) score += 0.2;
        if (lowerText.includes('authentic') || lowerText.includes('truth')) score += 0.2;
        
        return Math.min(score, 1.0);
    }

    detectCommunityFocus(text) {
        const communityKeywords = ['community', 'grassroots', 'local', 'neighborhood', 'resident', 'citizen'];
        return communityKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    detectEmpathyIndicators(text) {
        const empathyKeywords = ['empathy', 'understand', 'listen', 'feel', 'care', 'support', 'heal'];
        return empathyKeywords.filter(keyword => text.toLowerCase().includes(keyword));
    }

    async analyzeSlackConversations(channelId, timeframe) {
        // Placeholder for Slack API conversation analysis
        // Would fetch messages, analyze for ACT values, community focus, etc.
        return [];
    }
}

export default new SlackIntegrationService();