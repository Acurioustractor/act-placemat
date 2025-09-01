#!/usr/bin/env node

/**
 * Weekly Action Email Generator
 * Creates a prioritized action list for the week
 * Run this every Monday morning: 0 7 * * 1 node weekly-action-email.js
 */

require('dotenv').config();
const { PlacematNotionIntegrationEnhanced } = require('../notion-mcp-enhanced.js');

class WeeklyActionEmail {
    constructor() {
        this.notion = new PlacematNotionIntegrationEnhanced();
        this.weekData = {
            opportunities: [],
            projects: [],
            people: [],
            organizations: [],
            financials: {}
        };
    }

    async generate() {
        console.log('📧 Generating Weekly Action Email...');
        console.log(`Date: ${new Date().toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`);
        console.log('-'.repeat(50));

        try {
            // Gather all data
            await this.gatherWeeklyData();
            
            // Generate email content
            const emailHtml = this.generateEmailHtml();
            const emailText = this.generateEmailText();
            
            // Save to file (in production, this would send actual email)
            await this.saveEmail(emailHtml, emailText);
            
            console.log('✅ Weekly action email generated successfully!');
            
        } catch (error) {
            console.error('❌ Error generating weekly email:', error);
        }
    }

    async gatherWeeklyData() {
        try {
            // Fetch all data from Notion
            const allData = await this.notion.getAllData();
            
            this.weekData.projects = allData.projects || [];
            this.weekData.opportunities = allData.opportunities || [];
            this.weekData.people = allData.people || [];
            this.weekData.organizations = allData.organizations || [];
            
            // Calculate financial summary
            this.weekData.financials = this.calculateFinancials(
                this.weekData.projects, 
                this.weekData.opportunities
            );
            
            console.log('✅ Data gathered successfully');
            console.log(`   Projects: ${this.weekData.projects.length}`);
            console.log(`   Opportunities: ${this.weekData.opportunities.length}`);
            console.log(`   People: ${this.weekData.people.length}`);
            console.log(`   Organizations: ${this.weekData.organizations.length}`);
            
        } catch (error) {
            console.error('Error gathering data:', error);
            console.log('ℹ️  Some databases may not be configured yet');
        }
    }

    calculateFinancials(projects, opportunities) {
        return {
            currentRevenue: projects.reduce((sum, p) => sum + (p.revenueActual || 0), 0),
            potentialRevenue: projects.reduce((sum, p) => sum + (p.revenuePotential || 0), 0),
            pipelineValue: opportunities
                .filter(o => o.stage !== 'Closed Lost')
                .reduce((sum, o) => sum + (o.amount || 0), 0),
            weightedPipeline: opportunities
                .filter(o => o.stage !== 'Closed Lost' && o.stage !== 'Closed Won')
                .reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 50) / 100), 0)
        };
    }

    generateEmailHtml() {
        const urgentActions = this.getUrgentActions();
        const thisWeekActions = this.getThisWeekActions();
        const upcomingMilestones = this.getUpcomingMilestones();
        const relationshipActions = this.getRelationshipActions();
        
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .header {
            background: #3498db;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .section {
            background: #f8f9fa;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .urgent {
            background: #fee;
            border-left-color: #e74c3c;
        }
        .metric {
            display: inline-block;
            padding: 10px 20px;
            background: white;
            border-radius: 5px;
            margin: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .action-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .priority-high {
            border-left: 4px solid #e74c3c;
        }
        .priority-medium {
            border-left: 4px solid #f39c12;
        }
        .priority-low {
            border-left: 4px solid #27ae60;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #3498db;
            color: white;
        }
        .footer {
            margin-top: 40px;
            padding: 20px;
            background: #2c3e50;
            color: white;
            border-radius: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 ACT Weekly Action Plan</h1>
        <p>Week of ${this.getWeekDateRange()}</p>
    </div>

    <!-- Financial Snapshot -->
    <div class="section">
        <h2>💰 Financial Snapshot</h2>
        <div>
            <div class="metric">
                <strong>Current Revenue</strong><br>
                $${this.formatCurrency(this.weekData.financials.currentRevenue)}
            </div>
            <div class="metric">
                <strong>Pipeline Value</strong><br>
                $${this.formatCurrency(this.weekData.financials.pipelineValue)}
            </div>
            <div class="metric">
                <strong>Weighted Pipeline</strong><br>
                $${this.formatCurrency(this.weekData.financials.weightedPipeline)}
            </div>
        </div>
    </div>

    ${urgentActions.length > 0 ? `
    <!-- Urgent Actions -->
    <div class="section urgent">
        <h2>🚨 Urgent Actions Required</h2>
        ${urgentActions.map(action => `
            <div class="action-item priority-high">
                <h3>${action.title}</h3>
                <p><strong>Due:</strong> ${action.due}</p>
                <p><strong>Owner:</strong> ${action.owner}</p>
                <p>${action.description}</p>
                <p><strong>Action:</strong> ${action.action}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <!-- This Week's Priorities -->
    <div class="section">
        <h2>📋 This Week's Priorities</h2>
        <table>
            <thead>
                <tr>
                    <th>Priority</th>
                    <th>Item</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Action Required</th>
                </tr>
            </thead>
            <tbody>
                ${thisWeekActions.map(action => `
                    <tr>
                        <td><span class="priority-${action.priority}">${action.priority.toUpperCase()}</span></td>
                        <td><strong>${action.item}</strong></td>
                        <td>${action.owner}</td>
                        <td>${action.due}</td>
                        <td>${action.action}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <!-- Upcoming Milestones -->
    <div class="section">
        <h2>🎯 Upcoming Project Milestones</h2>
        ${upcomingMilestones.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Milestone</th>
                        <th>Date</th>
                        <th>Lead</th>
                    </tr>
                </thead>
                <tbody>
                    ${upcomingMilestones.map(milestone => `
                        <tr>
                            <td>${milestone.project}</td>
                            <td>${milestone.milestone}</td>
                            <td>${milestone.date}</td>
                            <td>${milestone.lead}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>No milestones in the next 2 weeks</p>'}
    </div>

    <!-- Relationship Management -->
    <div class="section">
        <h2>🤝 Relationship Actions</h2>
        ${relationshipActions.length > 0 ? 
            relationshipActions.map(action => `
                <div class="action-item priority-${action.priority}">
                    <h4>${action.person}</h4>
                    <p>${action.reason}</p>
                    <p><strong>Suggested Action:</strong> ${action.suggestion}</p>
                </div>
            `).join('')
            : '<p>All key relationships are up to date</p>'
        }
    </div>

    <!-- Quick Stats -->
    <div class="section">
        <h2>📊 Quick Stats</h2>
        <ul>
            <li>Active Projects: ${this.weekData.projects.filter(p => p.status === 'Active').length}</li>
            <li>Open Opportunities: ${this.weekData.opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').length}</li>
            <li>Actions This Week: ${thisWeekActions.length}</li>
            <li>Overdue Items: ${urgentActions.length}</li>
        </ul>
    </div>

    <div class="footer">
        <p><strong>What's your top priority this week?</strong></p>
        <p>Reply to this email with your #1 focus for the week</p>
        <p style="font-size: 0.9em; opacity: 0.8;">Generated by ACT Placemat • ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
        `;
    }

    generateEmailText() {
        const urgentActions = this.getUrgentActions();
        const thisWeekActions = this.getThisWeekActions();
        
        return `
ACT WEEKLY ACTION PLAN
Week of ${this.getWeekDateRange()}
${'='.repeat(50)}

FINANCIAL SNAPSHOT
------------------
Current Revenue: $${this.formatCurrency(this.weekData.financials.currentRevenue)}
Pipeline Value: $${this.formatCurrency(this.weekData.financials.pipelineValue)}
Weighted Pipeline: $${this.formatCurrency(this.weekData.financials.weightedPipeline)}

${urgentActions.length > 0 ? `
URGENT ACTIONS REQUIRED
-----------------------
${urgentActions.map(action => `
• ${action.title}
  Due: ${action.due}
  Owner: ${action.owner}
  Action: ${action.action}
`).join('\n')}
` : ''}

THIS WEEK'S PRIORITIES
----------------------
${thisWeekActions.map((action, i) => `
${i + 1}. ${action.item}
   Priority: ${action.priority.toUpperCase()}
   Owner: ${action.owner}
   Due: ${action.due}
   Action: ${action.action}
`).join('\n')}

Reply with your #1 priority for this week.

---
Generated by ACT Placemat
${new Date().toLocaleString()}
        `;
    }

    getUrgentActions() {
        const actions = [];
        const now = new Date();
        
        // Check opportunities with deadlines this week
        this.weekData.opportunities.forEach(opp => {
            if (opp.deadline) {
                const deadline = new Date(opp.deadline);
                const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 3 && daysUntil >= 0 && opp.stage !== 'Closed Won') {
                    actions.push({
                        title: `Opportunity Deadline: ${opp.name}`,
                        due: deadline.toLocaleDateString(),
                        owner: opp.primaryContact || 'Unassigned',
                        description: `${opp.stage} stage opportunity worth $${this.formatCurrency(opp.amount)}`,
                        action: this.getOpportunityAction(opp),
                        priority: 'high'
                    });
                }
            }
        });
        
        // Check overdue project milestones
        this.weekData.projects.forEach(project => {
            if (project.nextMilestone) {
                const milestoneDate = new Date(project.nextMilestone);
                if (milestoneDate < now && project.status === 'Active') {
                    actions.push({
                        title: `Overdue Milestone: ${project.name}`,
                        due: 'OVERDUE',
                        owner: project.lead || 'Unassigned',
                        description: `Project milestone was due ${Math.ceil((now - milestoneDate) / (1000 * 60 * 60 * 24))} days ago`,
                        action: 'Update milestone or escalate blockers',
                        priority: 'high'
                    });
                }
            }
        });
        
        return actions;
    }

    getThisWeekActions() {
        const actions = [];
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Opportunity actions
        this.weekData.opportunities.forEach(opp => {
            if (opp.nextActionDate) {
                const actionDate = new Date(opp.nextActionDate);
                if (actionDate >= now && actionDate <= weekEnd) {
                    actions.push({
                        item: opp.name,
                        owner: opp.primaryContact || 'Unassigned',
                        due: actionDate.toLocaleDateString(),
                        action: opp.nextAction || 'Follow up',
                        priority: this.getPriority(opp)
                    });
                }
            }
        });
        
        // Project milestones
        this.weekData.projects.forEach(project => {
            if (project.nextMilestone) {
                const milestoneDate = new Date(project.nextMilestone);
                if (milestoneDate >= now && milestoneDate <= weekEnd) {
                    actions.push({
                        item: `${project.name} - Milestone`,
                        owner: project.lead || 'Unassigned',
                        due: milestoneDate.toLocaleDateString(),
                        action: 'Complete milestone deliverables',
                        priority: 'high'
                    });
                }
            }
        });
        
        // Sort by date and priority
        return actions.sort((a, b) => {
            const dateA = new Date(a.due);
            const dateB = new Date(b.due);
            return dateA - dateB;
        });
    }

    getUpcomingMilestones() {
        const milestones = [];
        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        this.weekData.projects
            .filter(p => p.nextMilestone && p.status === 'Active')
            .forEach(project => {
                const milestoneDate = new Date(project.nextMilestone);
                if (milestoneDate >= now && milestoneDate <= twoWeeks) {
                    milestones.push({
                        project: project.name,
                        milestone: 'Project Milestone', // Would be better with actual milestone name
                        date: milestoneDate.toLocaleDateString(),
                        lead: project.lead || 'Unassigned'
                    });
                }
            });
        
        return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    getRelationshipActions() {
        const actions = [];
        const now = new Date();
        
        this.weekData.people
            .filter(p => p.relationshipType === 'Key' || p.influenceLevel === 'Decision Maker')
            .forEach(person => {
                if (person.lastContactDate) {
                    const lastContact = new Date(person.lastContactDate);
                    const daysSince = Math.ceil((now - lastContact) / (1000 * 60 * 60 * 24));
                    
                    if (daysSince > 30) {
                        actions.push({
                            person: person.fullName,
                            reason: `No contact for ${daysSince} days`,
                            suggestion: this.getContactSuggestion(person),
                            priority: daysSince > 60 ? 'high' : 'medium'
                        });
                    }
                }
            });
        
        return actions.slice(0, 5); // Limit to top 5
    }

    getContactSuggestion(person) {
        const suggestions = [
            'Schedule a coffee catch-up',
            'Send project update email',
            'Invite to upcoming event',
            'Share relevant article or resource',
            'Check in on their recent initiatives'
        ];
        
        // Customize based on person's role/interests
        if (person.interests && person.interests.length > 0) {
            return `Share update on ${person.interests[0]} initiatives`;
        }
        
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    getOpportunityAction(opp) {
        const actions = {
            'Discovery': 'Complete initial assessment',
            'Qualification': 'Submit qualification documents',
            'Proposal': 'Submit final proposal',
            'Negotiation': 'Finalize contract terms'
        };
        return actions[opp.stage] || 'Update opportunity status';
    }

    getPriority(opportunity) {
        if (opportunity.amount > 100000) return 'high';
        if (opportunity.amount > 50000) return 'medium';
        return 'low';
    }

    getWeekDateRange() {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(monday.getDate() - monday.getDay() + 1);
        
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        
        return `${monday.toLocaleDateString()} - ${sunday.toLocaleDateString()}`;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    async saveEmail(html, text) {
        const fs = require('fs').promises;
        const date = new Date().toISOString().split('T')[0];
        
        // Create alerts directory if it doesn't exist
        try {
            await fs.mkdir('alerts', { recursive: true });
        } catch (e) {}
        
        // Save HTML version
        await fs.writeFile(
            `alerts/weekly-action-${date}.html`,
            html
        );
        
        // Save text version
        await fs.writeFile(
            `alerts/weekly-action-${date}.txt`,
            text
        );
        
        // Save JSON data for integration
        await fs.writeFile(
            `alerts/weekly-action-${date}.json`,
            JSON.stringify({
                date: new Date().toISOString(),
                urgentActions: this.getUrgentActions(),
                weekActions: this.getThisWeekActions(),
                milestones: this.getUpcomingMilestones(),
                relationships: this.getRelationshipActions(),
                financials: this.weekData.financials
            }, null, 2)
        );
        
        console.log(`\n📁 Files saved to alerts/ directory`);
        console.log(`   - weekly-action-${date}.html`);
        console.log(`   - weekly-action-${date}.txt`);
        console.log(`   - weekly-action-${date}.json`);
    }
}

// Run if called directly
if (require.main === module) {
    const emailGenerator = new WeeklyActionEmail();
    emailGenerator.generate().catch(console.error);
}

module.exports = WeeklyActionEmail;