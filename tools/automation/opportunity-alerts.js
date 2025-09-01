#!/usr/bin/env node

/**
 * Opportunity Alert System
 * Sends daily alerts for opportunities that need action
 * Run this as a cron job: 0 8 * * * node opportunity-alerts.js
 */

require('dotenv').config();
const { PlacematNotionIntegrationEnhanced } = require('../notion-mcp-enhanced.js');

// Configuration
const CONFIG = {
    highValueThreshold: 50000,
    urgentDaysThreshold: 7,
    emailEnabled: process.env.EMAIL_ENABLED === 'true',
    slackEnabled: process.env.SLACK_ENABLED === 'true',
    recipients: {
        leadership: process.env.LEADERSHIP_EMAIL || 'leadership@act.org.au',
        finance: process.env.FINANCE_EMAIL || 'finance@act.org.au',
        ops: process.env.OPS_EMAIL || 'ops@act.org.au'
    }
};

class OpportunityAlerts {
    constructor() {
        this.notion = new PlacematNotionIntegrationEnhanced();
        this.alerts = [];
    }

    async run() {
        console.log('🚀 Starting Opportunity Alert Check...');
        console.log(`Time: ${new Date().toLocaleString()}`);
        console.log('-'.repeat(50));

        try {
            // Fetch opportunities from both sources
            const opportunities = await this.fetchAllOpportunities();
            
            // Analyze opportunities
            this.checkHighValueOpportunities(opportunities);
            this.checkUrgentDeadlines(opportunities);
            this.checkStagnantOpportunities(opportunities);
            this.checkMissingInformation(opportunities);
            
            // Send alerts
            if (this.alerts.length > 0) {
                await this.sendAlerts();
            } else {
                console.log('✅ No alerts needed today - all opportunities on track!');
            }
            
            // Summary
            this.printSummary(opportunities);
            
        } catch (error) {
            console.error('❌ Error running opportunity alerts:', error);
            this.alerts.push({
                type: 'error',
                priority: 'high',
                title: 'Opportunity Alert System Error',
                message: error.message,
                recipients: [CONFIG.recipients.ops]
            });
            await this.sendAlerts();
        }
    }

    async fetchAllOpportunities() {
        try {
            console.log('Fetching opportunities from Notion...');
            const opportunities = await this.notion.getOpportunities();
            
            console.log(`📊 Found ${opportunities.length} opportunities in Notion`);
            return opportunities;
        } catch (error) {
            console.error('Error fetching opportunities:', error);
            console.log('ℹ️  Make sure the Opportunities database is configured in Notion');
            console.log('   Set NOTION_OPPORTUNITIES_DB in your .env file');
            return [];
        }
    }

    checkHighValueOpportunities(opportunities) {
        const highValue = opportunities.filter(opp => 
            opp.amount >= CONFIG.highValueThreshold && 
            opp.stage === 'Discovery'
        );
        
        highValue.forEach(opp => {
            this.alerts.push({
                type: 'high_value',
                priority: 'high',
                title: `🎯 High-Value Opportunity: ${opp.name}`,
                message: `
                    Amount: $${this.formatCurrency(opp.amount)}
                    Organization: ${opp.organization || 'Unknown'}
                    Type: ${opp.type || 'Unknown'}
                    Stage: ${opp.stage}
                    
                    Action Required: Assign team and begin qualification process
                `,
                opportunity: opp,
                recipients: [CONFIG.recipients.leadership, CONFIG.recipients.finance]
            });
        });
        
        if (highValue.length > 0) {
            console.log(`💰 Found ${highValue.length} high-value opportunities`);
        }
    }

    checkUrgentDeadlines(opportunities) {
        const now = new Date();
        const urgent = opportunities.filter(opp => {
            if (!opp.deadline || opp.stage === 'Closed Won' || opp.stage === 'Closed Lost') {
                return false;
            }
            
            const deadline = new Date(opp.deadline);
            const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            
            return daysRemaining <= CONFIG.urgentDaysThreshold && daysRemaining >= 0;
        });
        
        urgent.forEach(opp => {
            const deadline = new Date(opp.deadline);
            const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            
            this.alerts.push({
                type: 'urgent_deadline',
                priority: daysRemaining <= 3 ? 'critical' : 'high',
                title: `⏰ Deadline Approaching: ${opp.name}`,
                message: `
                    Deadline: ${deadline.toLocaleDateString()} (${daysRemaining} days)
                    Amount: $${this.formatCurrency(opp.amount)}
                    Stage: ${opp.stage}
                    Probability: ${opp.probability}%
                    
                    Action Required: ${this.getDeadlineAction(opp)}
                `,
                opportunity: opp,
                recipients: this.getDeadlineRecipients(opp, daysRemaining)
            });
        });
        
        if (urgent.length > 0) {
            console.log(`⏰ Found ${urgent.length} opportunities with urgent deadlines`);
        }
    }

    checkStagnantOpportunities(opportunities) {
        const now = new Date();
        const stagnant = opportunities.filter(opp => {
            if (!opp.lastModified || opp.stage === 'Closed Won' || opp.stage === 'Closed Lost') {
                return false;
            }
            
            const lastModified = new Date(opp.lastModified);
            const daysSinceUpdate = Math.ceil((now - lastModified) / (1000 * 60 * 60 * 24));
            
            // Different thresholds for different stages
            const stagnantThresholds = {
                'Discovery': 14,
                'Qualification': 10,
                'Proposal': 7,
                'Negotiation': 5
            };
            
            const threshold = stagnantThresholds[opp.stage] || 14;
            return daysSinceUpdate > threshold;
        });
        
        stagnant.forEach(opp => {
            const lastModified = new Date(opp.lastModified);
            const daysSinceUpdate = Math.ceil((now - lastModified) / (1000 * 60 * 60 * 24));
            
            this.alerts.push({
                type: 'stagnant',
                priority: 'medium',
                title: `🐌 Stagnant Opportunity: ${opp.name}`,
                message: `
                    No updates for ${daysSinceUpdate} days
                    Stage: ${opp.stage}
                    Amount: $${this.formatCurrency(opp.amount)}
                    Last Action: ${opp.nextAction || 'None specified'}
                    
                    Action Required: Update status or close opportunity
                `,
                opportunity: opp,
                recipients: [opp.primaryContact || CONFIG.recipients.ops]
            });
        });
        
        if (stagnant.length > 0) {
            console.log(`🐌 Found ${stagnant.length} stagnant opportunities`);
        }
    }

    checkMissingInformation(opportunities) {
        const incomplete = opportunities.filter(opp => {
            const required = ['amount', 'deadline', 'primaryContact', 'nextAction'];
            return required.some(field => !opp[field]) && 
                   opp.stage !== 'Closed Won' && 
                   opp.stage !== 'Closed Lost';
        });
        
        incomplete.forEach(opp => {
            const missing = [];
            if (!opp.amount) missing.push('Amount');
            if (!opp.deadline) missing.push('Deadline');
            if (!opp.primaryContact) missing.push('Primary Contact');
            if (!opp.nextAction) missing.push('Next Action');
            
            this.alerts.push({
                type: 'incomplete',
                priority: 'low',
                title: `📝 Incomplete Opportunity: ${opp.name}`,
                message: `
                    Missing Information: ${missing.join(', ')}
                    Stage: ${opp.stage}
                    
                    Action Required: Update opportunity with missing information
                `,
                opportunity: opp,
                recipients: [opp.primaryContact || CONFIG.recipients.ops]
            });
        });
        
        if (incomplete.length > 0) {
            console.log(`📝 Found ${incomplete.length} opportunities with missing information`);
        }
    }

    getDeadlineAction(opp) {
        const actions = {
            'Discovery': 'Schedule qualification call',
            'Qualification': 'Complete needs assessment and prepare proposal',
            'Proposal': 'Submit final proposal',
            'Negotiation': 'Finalize terms and close deal'
        };
        return actions[opp.stage] || 'Review and update opportunity status';
    }

    getDeadlineRecipients(opp, daysRemaining) {
        const recipients = [opp.primaryContact || CONFIG.recipients.ops];
        
        if (daysRemaining <= 3) {
            recipients.push(CONFIG.recipients.leadership);
        }
        
        if (opp.amount >= CONFIG.highValueThreshold) {
            recipients.push(CONFIG.recipients.finance);
        }
        
        return [...new Set(recipients)]; // Remove duplicates
    }

    async sendAlerts() {
        // Group alerts by priority
        const critical = this.alerts.filter(a => a.priority === 'critical');
        const high = this.alerts.filter(a => a.priority === 'high');
        const medium = this.alerts.filter(a => a.priority === 'medium');
        const low = this.alerts.filter(a => a.priority === 'low');
        
        console.log('\n📬 Sending Alerts:');
        console.log(`   Critical: ${critical.length}`);
        console.log(`   High: ${high.length}`);
        console.log(`   Medium: ${medium.length}`);
        console.log(`   Low: ${low.length}`);
        
        // In production, this would send actual emails/Slack messages
        // For now, we'll output to console
        
        if (critical.length > 0) {
            console.log('\n🚨 CRITICAL ALERTS:');
            critical.forEach(alert => this.displayAlert(alert));
        }
        
        if (high.length > 0) {
            console.log('\n❗ HIGH PRIORITY ALERTS:');
            high.forEach(alert => this.displayAlert(alert));
        }
        
        if (medium.length > 0) {
            console.log('\n⚠️  MEDIUM PRIORITY ALERTS:');
            medium.forEach(alert => this.displayAlert(alert));
        }
        
        if (low.length > 0) {
            console.log('\nℹ️  LOW PRIORITY ALERTS:');
            low.forEach(alert => this.displayAlert(alert));
        }
        
        // Save alerts to file for email processing
        await this.saveAlertsForEmail();
    }

    displayAlert(alert) {
        console.log(`\n${alert.title}`);
        console.log(alert.message);
        console.log(`Recipients: ${alert.recipients.join(', ')}`);
        console.log('-'.repeat(50));
    }

    async saveAlertsForEmail() {
        const fs = require('fs').promises;
        const alertData = {
            date: new Date().toISOString(),
            alerts: this.alerts,
            summary: {
                total: this.alerts.length,
                critical: this.alerts.filter(a => a.priority === 'critical').length,
                high: this.alerts.filter(a => a.priority === 'high').length,
                medium: this.alerts.filter(a => a.priority === 'medium').length,
                low: this.alerts.filter(a => a.priority === 'low').length
            }
        };
        
        await fs.writeFile(
            `alerts/opportunity-alerts-${new Date().toISOString().split('T')[0]}.json`,
            JSON.stringify(alertData, null, 2)
        );
    }

    printSummary(opportunities) {
        console.log('\n📊 OPPORTUNITY PIPELINE SUMMARY:');
        console.log('='.repeat(50));
        
        // Stage summary
        const stages = {};
        opportunities.forEach(opp => {
            stages[opp.stage] = (stages[opp.stage] || 0) + 1;
        });
        
        console.log('\nBy Stage:');
        Object.entries(stages).forEach(([stage, count]) => {
            console.log(`   ${stage}: ${count}`);
        });
        
        // Value summary
        const totalPipeline = opportunities
            .filter(o => o.stage !== 'Closed Lost')
            .reduce((sum, o) => sum + (o.amount || 0), 0);
            
        const weightedPipeline = opportunities
            .filter(o => o.stage !== 'Closed Lost' && o.stage !== 'Closed Won')
            .reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 50) / 100), 0);
        
        console.log('\nPipeline Value:');
        console.log(`   Total: $${this.formatCurrency(totalPipeline)}`);
        console.log(`   Weighted: $${this.formatCurrency(weightedPipeline)}`);
        
        // This week's actions
        const thisWeek = opportunities.filter(opp => {
            if (!opp.nextActionDate) return false;
            const actionDate = new Date(opp.nextActionDate);
            const daysUntil = Math.ceil((actionDate - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7;
        });
        
        console.log(`\nActions This Week: ${thisWeek.length}`);
        
        console.log('\n✅ Alert check complete!');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }
}

// Run if called directly
if (require.main === module) {
    const alerts = new OpportunityAlerts();
    alerts.run().catch(console.error);
}

module.exports = OpportunityAlerts;