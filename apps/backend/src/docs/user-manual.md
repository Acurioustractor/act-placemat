# ACT Farmhand AI - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Using Skill Pods](#using-skill-pods)
5. [Workflow Tasks](#workflow-tasks)
6. [Intelligence Queries](#intelligence-queries)
7. [System Integration](#system-integration)
8. [Cultural Safety Protocols](#cultural-safety-protocols)
9. [API Usage](#api-usage)
10. [Troubleshooting](#troubleshooting)

## Introduction

ACT Farmhand AI is an intelligent community support system designed with cultural safety protocols and Indigenous data sovereignty principles at its core. The system uses a farm metaphor to make complex AI operations accessible and culturally appropriate.

### Key Features
- **8 Specialized Skill Pods**: Each handling specific aspects of community intelligence
- **Cultural Safety First**: Automated cultural protocol validation and community consent management
- **Farm Metaphor Interface**: Intuitive visualization of AI processes as farm operations
- **Real-time Intelligence**: Continuous processing and insight generation
- **System Integration**: Seamless connection with existing ACT systems

### Farm Metaphor Guide
- **Seeded**: New tasks or insights beginning to develop
- **Growing**: Active processing and development
- **Blooming**: Near completion with rich insights emerging
- **Harvested**: Completed work ready for action

## Getting Started

### Accessing the Dashboard
1. Navigate to the ACT Farmhand AI dashboard at `/farmhand/dashboard`
2. The system loads automatically with real-time data
3. No authentication required for basic viewing; API keys needed for advanced features

### Dashboard Layout
The dashboard is organized into 5 main tabs:
- **Overview**: System status and quick query interface
- **Skill Pods**: Individual AI worker status and performance
- **Workflow Tasks**: Current and completed tasks
- **Intelligence**: Advanced query processing
- **System Integration**: Backend system connections and health

## Dashboard Overview

### Status Cards
The overview displays key metrics:
- **Active Tasks**: Current workflow items being processed
- **Total Insights**: Cumulative knowledge generated
- **Skill Pods Active**: Number of AI workers currently operational
- **Cultural Safety**: Percentage score for protocol compliance

### Quick Query Interface
Submit natural language queries like:
- "What community stories should we prioritize for our next grant application?"
- "Analyze the cultural impact of our recent storytelling programs"
- "Find funding opportunities aligned with our Indigenous values"

### Real-time Activity Feed
Monitor recent system activity including:
- Query processing results
- Task completions
- Cultural safety validations
- System integration events

## Using Skill Pods

Each skill pod represents a specialized AI worker with unique capabilities:

### DNA Guardian (Sacred Grove)
- **Purpose**: Cultural protocol validation and values alignment
- **Capabilities**: 
  - Community consent management
  - Cultural safety scoring
  - Protocol enforcement
- **Farm Element**: Sacred Grove - protecting the spiritual heart of operations

### Knowledge Librarian (Seed Library)
- **Purpose**: Information retrieval and relationship mapping
- **Capabilities**:
  - Knowledge synthesis
  - Relationship analysis
  - Information categorization
- **Farm Element**: Seed Library - storing and organizing community wisdom

### Compliance Sentry (Boundary Fence)
- **Purpose**: Regulatory compliance and risk management
- **Capabilities**:
  - Legal requirement monitoring
  - Risk assessment
  - Compliance validation
- **Farm Element**: Boundary Fence - protecting against regulatory risks

### Finance Copilot (Resource Silo)
- **Purpose**: Financial analysis and budget optimization
- **Capabilities**:
  - SROI calculations
  - Budget analysis
  - Financial forecasting
- **Farm Element**: Resource Silo - managing and optimizing resources

### Opportunity Scout (Watchtower)
- **Purpose**: Funding and partnership discovery
- **Capabilities**:
  - Grant opportunity scanning
  - Partnership analysis
  - Market research
- **Farm Element**: Watchtower - surveying the landscape for opportunities

### Story Weaver (Storytelling Circle)
- **Purpose**: Narrative analysis and cultural storytelling
- **Capabilities**:
  - Story analysis
  - Cultural narrative generation
  - Theme extraction
- **Farm Element**: Storytelling Circle - weaving community narratives

### Systems Seeder (Innovation Plot)
- **Purpose**: System improvement and capacity building
- **Capabilities**:
  - Process optimization
  - System enhancement recommendations
  - Innovation identification
- **Farm Element**: Innovation Plot - cultivating new ideas and improvements

### Impact Analyst (Harvest Scale)
- **Purpose**: Impact measurement and visualization
- **Capabilities**:
  - Impact calculation
  - Outcome tracking
  - Visualization preparation
- **Farm Element**: Harvest Scale - measuring the fruits of community work

## Workflow Tasks

### Task States
Tasks progress through farm-themed stages:
- **Seeded**: Newly created, awaiting processing
- **Growing**: In active development
- **Blooming**: Near completion with insights emerging
- **Harvested**: Complete and ready for action

### Priority Levels
- **Low**: Background processing
- **Medium**: Standard importance
- **High**: Elevated priority
- **Urgent**: Immediate attention required

### Task Types
- **Story Collection**: Community narrative gathering and analysis
- **Funding Opportunity**: Grant and partnership discovery
- **Impact Analysis**: Outcome measurement and evaluation
- **System Improvement**: Process and capacity enhancements
- **General Intelligence**: Flexible analysis and insights

### Cultural Safety Monitoring
Every task includes cultural safety scoring:
- **95%+**: Excellent cultural alignment
- **90-94%**: Good alignment with minor considerations
- **Below 90%**: Requires cultural review and adjustment

## Intelligence Queries

### Natural Language Processing
Submit queries in plain English. The system processes through multiple skill pods and provides:
- **Primary Insight**: Main answer or recommendation
- **Confidence Score**: Reliability percentage
- **Cultural Safety Score**: Protocol compliance rating
- **Recommendations**: Actionable next steps
- **Processing Time**: System performance metric

### Query Examples

#### Community Story Analysis
```
Query: "What themes are emerging from our recent community stories?"
Response: Insights on common narratives, cultural patterns, and community priorities
```

#### Funding Strategy
```
Query: "Which grant opportunities best match our cultural values?"
Response: Prioritized funding options with alignment analysis and application guidance
```

#### Impact Measurement
```
Query: "Calculate the SROI for our storytelling program"
Response: Comprehensive impact analysis with financial and cultural metrics
```

#### System Optimization
```
Query: "How can we improve our community engagement processes?"
Response: Process improvement recommendations with implementation guidance
```

## System Integration

### Connected Systems
- **Empathy Ledger**: Community stories and data
- **Opportunity Ecosystem View**: Partnerships and funding
- **Notion Knowledge Base**: Documentation and workflows

### Data Pipelines
Automated intelligence processing:
- **Story Intelligence** (Daily): Analyzes community stories
- **Opportunity Discovery** (Weekly): Scans for funding/partnerships
- **Impact Measurement** (Monthly): Calculates comprehensive SROI
- **System Optimization** (Continuous): Identifies improvements

### Health Monitoring
System integration status includes:
- **Integration Hub Status**: Overall system health
- **Active Pipelines**: Number of running processes
- **Connected Systems**: External system connections
- **Cultural Safety Metrics**: Protocol compliance across systems

## Cultural Safety Protocols

### Indigenous Data Sovereignty
- All data handling respects Indigenous data rights
- Community consent tracked and validated
- Sacred knowledge protection protocols active
- Cultural protocol compliance monitoring

### Safety Scoring System
- **98%+**: Exceptional cultural alignment
- **95-97%**: Strong cultural safety
- **90-94%**: Acceptable with monitoring
- **Below 90%**: Requires immediate cultural review

### Community Consent Management
- Consent status tracking for all community data
- Withdrawal mechanisms available
- Community-level consent validation
- Ongoing consent verification

## API Usage

### RESTful API Endpoints

#### Farm Workflow
```bash
GET /api/farm-workflow/status          # Get farm status
POST /api/farm-workflow/query          # Process natural language query
GET /api/farm-workflow/tasks           # Get workflow tasks
GET /api/farm-workflow/skill-pods      # Get skill pod status
```

#### System Integration
```bash
GET /api/system-integration/status     # Get integration status
POST /api/system-integration/sync      # Trigger system sync
GET /api/system-integration/metrics    # Get performance metrics
POST /api/system-integration/pipelines/:name/run  # Run pipeline
```

#### GraphQL Endpoint
```bash
POST /graphql                          # GraphQL queries and mutations
WS /graphql                           # GraphQL subscriptions
```

### Authentication
- Most endpoints work without authentication
- API keys or Bearer tokens provide enhanced access
- Contact admin for API key provisioning

### Rate Limits
- General endpoints: 100 requests/minute
- AI processing endpoints: 10 requests/minute
- System integration endpoints: 50 requests/minute

## Troubleshooting

### Common Issues

#### Dashboard Not Loading
1. Check internet connection
2. Verify backend services are running
3. Clear browser cache and refresh
4. Check browser console for errors

#### Query Processing Slow
1. Verify all skill pods are operational
2. Check system performance metrics
3. Consider simplifying query complexity
4. Monitor cultural safety processing overhead

#### Cultural Safety Scores Low
1. Review query content for cultural sensitivity
2. Ensure community consent is properly documented
3. Check for sacred knowledge protection triggers
4. Consult cultural protocols documentation

#### System Integration Issues
1. Check integration hub status
2. Verify connected systems are online
3. Review pipeline execution logs
4. Test individual system connections

### Getting Help

#### Self-Service Resources
- Review system status dashboard
- Check integration health metrics
- Consult cultural safety guidelines
- Review API documentation

#### Support Contacts
- Technical Support: tech@act.place
- Cultural Protocols: cultural-safety@act.place
- System Administration: admin@act.place

#### Emergency Procedures
- Cultural safety concerns: Immediate escalation to cultural team
- System outages: Check status page and contact support
- Data sovereignty issues: Contact Indigenous data governance team

## Best Practices

### Query Formulation
- Use clear, specific language
- Include cultural context when relevant
- Respect community protocols
- Review results for cultural appropriateness

### Task Management
- Monitor cultural safety scores
- Review task progress regularly
- Address blockers promptly
- Document outcomes for community benefit

### System Maintenance
- Regular status monitoring
- Pipeline health checks
- Cultural safety score reviews
- Community feedback integration

## Updates and Versioning

### Current Version: 1.0.0
- Initial production release
- All 8 skill pods operational
- Complete system integration
- Cultural safety protocols active

### Update Notifications
- System updates announced via dashboard
- Breaking changes communicated in advance
- Cultural protocol updates require community review
- Automatic backup before major updates

---

**Document Version**: 1.0.0  
**Last Updated**: August 2025  
**Next Review**: November 2025

For the most current information, always refer to the live dashboard and API documentation.