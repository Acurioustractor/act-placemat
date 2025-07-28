# ACT Placemat - Practical Implementation Plan

## 🎯 Goal: Transform Data into Action

This plan focuses on creating immediate value and organizational momentum through practical, actionable implementations.

---

## Phase 1: Quick Wins (Week 1-2)
*Start with what drives immediate action*

### 1.1 Opportunity Alert System
**What**: Real-time notifications when opportunities match ACT's capabilities
**Why**: Never miss funding opportunities again
**How**:
```javascript
// Add to server.js
const checkOpportunities = async () => {
    const opportunities = await notion.fetchOpportunities();
    
    opportunities.forEach(opp => {
        // Alert on high-value opportunities
        if (opp.amount > 50000 && opp.stage === 'Discovery') {
            sendAlert({
                to: 'leadership@act.org.au',
                subject: `🎯 New ${opp.amount} opportunity: ${opp.name}`,
                priority: 'high',
                action: `Review by ${opp.deadline}`
            });
        }
        
        // Alert on approaching deadlines
        const daysUntilDeadline = daysBetween(new Date(), opp.deadline);
        if (daysUntilDeadline <= 7 && opp.stage !== 'Closed Won') {
            sendAlert({
                to: opp.primaryContact,
                subject: `⏰ ${opp.name} deadline in ${daysUntilDeadline} days`,
                priority: 'urgent',
                action: 'Submit proposal'
            });
        }
    });
};

// Run every morning at 8am
cron.schedule('0 8 * * *', checkOpportunities);
```

### 1.2 Weekly Action Dashboard
**What**: Monday morning email with key actions for the week
**Why**: Keeps everyone aligned and accountable
**Implementation**:

Create `weekly-action-generator.js`:
```javascript
const generateWeeklyActions = async () => {
    const data = await gatherWeeklyData();
    
    return {
        // Critical Actions
        urgentActions: [
            ...data.opportunities.filter(o => o.daysUntilDeadline <= 7),
            ...data.projects.filter(p => p.nextMilestone <= 7),
            ...data.budgets.filter(b => b.utilization > 90)
        ],
        
        // Opportunities This Week
        opportunitiesToProgress: data.opportunities
            .filter(o => o.stage === 'Qualification' || o.stage === 'Proposal')
            .map(o => ({
                name: o.name,
                value: o.amount,
                nextAction: o.nextAction,
                owner: o.primaryContact
            })),
        
        // Project Milestones
        upcomingMilestones: data.projects
            .filter(p => p.nextMilestoneDate <= 14)
            .map(p => ({
                project: p.name,
                milestone: p.nextMilestone,
                date: p.nextMilestoneDate,
                lead: p.lead
            })),
        
        // Financial Snapshot
        financialHealth: {
            weeklyRevenue: data.revenue.thisWeek,
            pipelineValue: data.opportunities.totalWeighted,
            cashPosition: data.finance.currentCash,
            burnRate: data.finance.weeklyBurn
        }
    };
};
```

### 1.3 Project Status Traffic Lights
**What**: Visual status system that triggers action
**Why**: Makes problems visible immediately
**How**:

Add to `index.html`:
```html
<div class="status-indicators">
    <div class="indicator red" id="at-risk-projects">
        <span class="count">0</span>
        <label>At Risk</label>
    </div>
    <div class="indicator yellow" id="needs-attention">
        <span class="count">0</span>
        <label>Needs Attention</label>
    </div>
    <div class="indicator green" id="on-track">
        <span class="count">0</span>
        <label>On Track</label>
    </div>
</div>

<script>
// Auto-categorize projects based on health metrics
function categorizeProjectHealth(project) {
    const health = {
        budgetHealth: project.spent / project.budget,
        scheduleHealth: project.daysUntilMilestone,
        fundingHealth: project.fundingStatus
    };
    
    if (health.budgetHealth > 0.9 || health.scheduleHealth < 0 || 
        health.fundingHealth === 'At Risk') {
        return 'red';
    } else if (health.budgetHealth > 0.75 || health.scheduleHealth < 7) {
        return 'yellow';
    }
    return 'green';
}
</script>
```

---

## Phase 2: Action Triggers (Week 3-4)
*Automate responses to key events*

### 2.1 Opportunity Win Playbook
**Trigger**: Opportunity stage → "Closed Won"
**Actions**:
```javascript
const opportunityWonPlaybook = async (opportunity) => {
    // 1. Create project automatically
    const project = await notion.createProject({
        name: `${opportunity.name} - Implementation`,
        area: opportunity.area,
        status: 'Active',
        funding: 'Funded',
        budget: opportunity.amount,
        lead: opportunity.primaryContact,
        startDate: new Date(),
        endDate: calculateEndDate(opportunity)
    });
    
    // 2. Create task list
    const tasks = await createProjectTasks(project, opportunity.type);
    
    // 3. Schedule kickoff meeting
    await scheduleKickoff({
        project: project.name,
        attendees: [opportunity.primaryContact, ...opportunity.decisionMakers],
        suggestedTimes: getNextWeekSlots()
    });
    
    // 4. Set up financial tracking
    await finance.createBudget({
        projectId: project.id,
        totalAmount: opportunity.amount,
        categories: getStandardCategories(opportunity.type)
    });
    
    // 5. Notify stakeholders
    await notify.celebrate({
        channel: '#wins',
        message: `🎉 Won: ${opportunity.name} - $${opportunity.amount}`,
        details: project
    });
};
```

### 2.2 Budget Alert Escalation
**What**: Progressive alerts based on severity
**Implementation**:
```javascript
const budgetEscalation = {
    levels: [
        { threshold: 75, recipients: ['project.lead'], frequency: 'weekly' },
        { threshold: 85, recipients: ['project.lead', 'finance'], frequency: 'daily' },
        { threshold: 95, recipients: ['project.lead', 'finance', 'leadership'], frequency: 'immediate' }
    ],
    
    async check(project) {
        const utilization = project.spent / project.budget * 100;
        const level = this.levels.find(l => utilization >= l.threshold);
        
        if (level) {
            await this.sendAlert(project, level, utilization);
        }
    }
};
```

### 2.3 Relationship Nurturing System
**What**: Automated reminders to maintain key relationships
```javascript
const relationshipActions = {
    // Check-in reminders
    async generateCheckIns() {
        const people = await airtable.fetchPeople();
        const actions = [];
        
        people.forEach(person => {
            const daysSinceContact = daysSince(person.lastContactDate);
            
            // Based on relationship importance
            if (person.relationshipStrength === 'Key' && daysSinceContact > 30) {
                actions.push({
                    type: 'urgent',
                    action: `Check in with ${person.fullName}`,
                    reason: 'Key relationship - no contact for 30+ days',
                    suggestions: this.getCheckInSuggestions(person)
                });
            }
        });
        
        return actions;
    },
    
    getCheckInSuggestions(person) {
        return [
            `Share update on ${person.interests[0]} project`,
            `Invite to upcoming ${person.expertise[0]} workshop`,
            `Coffee catch-up to discuss ${person.organization}`
        ];
    }
};
```

---

## Phase 3: Decision Support (Week 5-6)
*Turn data into decisions*

### 3.1 Opportunity Scoring System
**What**: Automatic scoring to prioritize efforts
```javascript
class OpportunityScorer {
    score(opportunity) {
        const scores = {
            // Financial Impact (40%)
            financial: (opportunity.amount / 100000) * 40,
            
            // Probability (20%)
            probability: (opportunity.probability / 100) * 20,
            
            // Strategic Alignment (20%)
            alignment: this.calculateAlignment(opportunity) * 20,
            
            // Effort Required (20%)
            effort: (100 - opportunity.effortEstimate) / 100 * 20
        };
        
        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        
        return {
            total,
            breakdown: scores,
            recommendation: this.getRecommendation(total)
        };
    }
    
    getRecommendation(score) {
        if (score > 80) return { action: 'pursue', priority: 'high', color: 'green' };
        if (score > 60) return { action: 'evaluate', priority: 'medium', color: 'yellow' };
        return { action: 'deprioritize', priority: 'low', color: 'red' };
    }
}
```

### 3.2 Resource Allocation Dashboard
**What**: See where effort is going vs. where value is
```javascript
const resourceAnalysis = {
    async analyze() {
        const projects = await notion.fetchProjects();
        const people = await airtable.fetchPeople();
        
        return {
            // Time allocation by area
            timeByArea: this.calculateTimeAllocation(projects, people),
            
            // Revenue per person
            productivity: this.calculateProductivity(projects, people),
            
            // Bottlenecks
            bottlenecks: this.identifyBottlenecks(projects, people),
            
            // Recommendations
            recommendations: this.generateRecommendations()
        };
    }
};
```

---

## Phase 4: Organizational Habits (Week 7-8)
*Build sustainable practices*

### 4.1 Monday Morning Standup Bot
```javascript
const mondayStandup = {
    async generate() {
        const template = `
# ACT Monday Standup - ${formatDate(new Date())}

## 🎯 This Week's Priorities
${await this.getWeekPriorities()}

## 💰 Opportunities to Progress
${await this.getOpportunityActions()}

## 🚨 Needs Immediate Attention
${await this.getUrgentItems()}

## 🎉 Last Week's Wins
${await this.getRecentWins()}

## 📊 Key Metrics
${await this.getKeyMetrics()}

*Reply with your top 3 priorities for the week*
        `;
        
        return template;
    }
};
```

### 4.2 Friday Reflection & Planning
```javascript
const fridayReview = {
    async generate() {
        return {
            // What got done
            completed: await this.getCompletedTasks(),
            
            // What didn't and why
            blockers: await this.getBlockers(),
            
            // Next week's setup
            nextWeek: await this.prepareNextWeek(),
            
            // Celebration moments
            wins: await this.identifyWins()
        };
    }
};
```

---

## Implementation Checklist

### Week 1-2: Foundation
- [ ] Set up opportunity alerts
- [ ] Create weekly action email template
- [ ] Implement project health indicators
- [ ] Test with leadership team

### Week 3-4: Automation
- [ ] Deploy opportunity win playbook
- [ ] Set up budget escalation system
- [ ] Launch relationship nurturing
- [ ] Train team on new automations

### Week 5-6: Intelligence
- [ ] Implement opportunity scoring
- [ ] Create resource dashboard
- [ ] Set up decision alerts
- [ ] Gather feedback and refine

### Week 7-8: Habits
- [ ] Launch Monday standup bot
- [ ] Implement Friday reviews
- [ ] Create monthly board reports
- [ ] Document all processes

---

## Measuring Success

### Immediate Metrics (Month 1)
- Response time to opportunities: Target < 48 hours
- Proposal submission rate: Target 90% on-time
- Weekly action completion: Target 80%

### Growth Metrics (Month 2-3)
- Pipeline value increase: Target 25%
- Win rate improvement: Target 10%
- Time saved on admin: Target 10 hours/week

### Impact Metrics (Month 6)
- Revenue growth: Target 30%
- Project success rate: Target 95%
- Team satisfaction: Target 8/10

---

## Quick Start Actions

### This Week
1. **Monday**: Install and test opportunity alerts
2. **Tuesday**: Set up first weekly action email
3. **Wednesday**: Configure project health dashboard
4. **Thursday**: Run first opportunity scoring
5. **Friday**: Generate first weekly review

### Next Steps
1. Schedule team training (2 hours)
2. Set up daily standup to review alerts (15 min)
3. Designate automation champions
4. Create feedback channel

---

## Support Resources

### Templates
- Email templates: `/templates/emails/`
- Automation workflows: `/workflows/`
- Dashboard configs: `/dashboards/`

### Training
- Video walkthrough: [link]
- User guide: `/docs/user-guide.md`
- FAQ: `/docs/faq.md`

### Help
- Technical support: tech@act.org.au
- Process questions: ops@act.org.au
- Feature requests: `/feedback`

---

## Remember: Start Small, Scale Fast

1. Pick ONE automation this week
2. Use it daily for a week
3. Measure the impact
4. Add the next automation
5. Build momentum

The goal is sustainable change that makes everyone's life easier and ACT more effective.