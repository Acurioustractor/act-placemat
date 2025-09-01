# ACT Universal AI Business Platform - KC Implementation Guide

## Executive Summary

This implementation guide provides specific instructions for executing the ACT Universal AI Business Platform development using KC commands and specialized agents. The platform transformation leverages existing Task Master AI tasks (36-50) with KC workflow integration for efficient, values-driven implementation.

## 📋 Current Task Inventory

**Task Master Status**: 15 high-level tasks with 75 subtasks
**Completion**: 0% (Ready to begin implementation)
**Priority Focus**: Values Integration System → Micro-Frontend Shell → AI Enhancement → Real-Time Data Hub

### Core Implementation Tasks Overview

| Task ID | Task Name | Priority | Agent Assignment | KC Commands |
|---------|-----------|----------|------------------|-------------|
| 38 | Values Integration System | HIGHEST | python-backend-expert, values-compliance-agent | `/kc:impl`, `/kc:split-task` |
| 40 | Unified Frontend Dashboard | HIGH | nextjs-expert, frontend-architect-agent | `/kc:impl`, `/kc:test` |
| 43 | Intelligent Workflow Automation | HIGH | ai-agent-expert, python-backend-expert | `/kc:impl`, `/kc:research` |
| 41 | Real-Time Data Integration Hub | HIGH | backend-infrastructure-agent | `/kc:impl`, `/kc:split-task` |
| 49 | Compliance and Security | HIGH | security-expert, compliance-agent | `/kc:impl`, `/kc:audit` |
| 36 | Cloud-Native Architecture | HIGH | devops-expert, infrastructure-agent | `/kc:impl`, `/kc:deploy` |

## 🚀 Implementation Strategy

### Phase 1: Values Integration Foundation (Tasks 38-39)
**Duration**: 4-6 weeks  
**Community Benefit**: Immediate values compliance and transparency

#### Task 38: Values Integration System Implementation

**KC Command Sequence**:
```bash
# Start with research and analysis
/kc:research "Indigenous data sovereignty CARE principles implementation"
/kc:research "Australian ASIC APRA compliance automation"

# Begin implementation with specialized agents
/kc:impl --task=38 --agent=python-backend-expert
/kc:split-task --task=38.1 --focus="FastAPI microservice architecture"
/kc:impl --subtask=38.1 --agent=api-architect-agent
```

**Specialized Agent Assignments**:
- **python-backend-expert**: Core FastAPI microservices development
- **values-compliance-agent**: Indigenous data sovereignty validation
- **blockchain-expert**: Profit distribution transparency on Hyperledger
- **governance-agent**: Democratic decision-making framework

**Integration Points**:
- Existing Supabase database schemas: `/supabase/migrations/`
- Current compliance work: `/real-backend/`, `/apps/backend/`
- Community data: Existing Notion integration at `/apps/backend/src/integrations/notion-*`

**Implementation Steps**:
1. **Subtask 38.1**: Use `/kc:impl --agent=python-backend-expert` to create FastAPI microservice
2. **Subtask 38.2**: Use `/kc:impl --agent=analytics-agent` for community benefit tracking
3. **Subtask 38.3**: Use `/kc:impl --agent=blockchain-expert` for profit distribution ledger
4. **Subtask 38.4**: Use `/kc:impl --agent=values-compliance-agent` for data sovereignty
5. **Subtask 38.5**: Use `/kc:impl --agent=governance-agent` for voting and audit trails

### Phase 2: Micro-Frontend Shell (Task 40)
**Duration**: 3-4 weeks  
**Community Benefit**: Unified experience across all community tools

#### Task 40: Unified Frontend Dashboard Implementation

**KC Command Sequence**:
```bash
# Research modern micro-frontend patterns
/kc:research "Vite Module Federation with existing Next.js apps"
/kc:research "React 18 concurrent features for community platforms"

# Implement with frontend specialists
/kc:impl --task=40 --agent=nextjs-expert
/kc:split-task --task=40.1 --focus="Module Federation setup"
/kc:impl --subtask=40.1 --agent=frontend-architect-agent
```

**Specialized Agent Assignments**:
- **nextjs-expert**: Shell application and routing
- **frontend-architect-agent**: Module Federation orchestration
- **ui-design-agent**: Values-aligned component library
- **performance-expert**: Real-time updates and PWA features

**Integration Points**:
- Current Next.js frontend: `/apps/frontend/`
- Existing applications: `/apps/ai-workhouse/`, `/apps/intelligence/`, `/apps/analytics-dashboard/`
- Shared components: `/apps/frontend/src/components/`

**Implementation Steps**:
1. **Subtask 40.1**: Use `/kc:impl --agent=frontend-architect-agent` for Module Federation
2. **Subtask 40.2**: Use `/kc:impl --agent=ui-design-agent` for component library
3. **Subtask 40.3**: Use `/kc:impl --agent=real-time-expert` for WebSocket integration
4. **Subtask 40.4**: Use `/kc:impl --agent=ux-expert` for role-based navigation
5. **Subtask 40.5**: Use `/kc:test --agent=qa-automation-agent` for E2E testing

### Phase 3: AI-Native Intelligence Enhancement (Task 43)
**Duration**: 4-5 weeks  
**Community Benefit**: Democratic AI orchestration with community approval

#### Task 43: Intelligent Workflow Automation Implementation

**KC Command Sequence**:
```bash
# Research community-controlled AI patterns
/kc:research "Democratic AI agent orchestration frameworks"
/kc:research "Community-approved ML model deployment"

# Enhance existing Intelligence Hub
/kc:impl --task=43 --agent=ai-agent-expert
/kc:split-task --task=43.3 --focus="TensorFlow integration with existing Intelligence Hub"
```

**Specialized Agent Assignments**:
- **ai-agent-expert**: Democratic agent coordination
- **ml-engineering-agent**: TensorFlow model integration
- **workflow-expert**: Camunda/Temporal orchestration
- **community-ai-agent**: Community approval processes

**Integration Points**:
- Existing Intelligence Hub: `/apps/intelligence-hub/`, `/apps/intelligence/`
- Current AI integrations: `/apps/ai-backend/`, `/apps/ai-workhouse/`
- Community data patterns: Existing Supabase relationships

**Implementation Steps**:
1. **Subtask 43.1**: Use `/kc:impl --agent=workflow-expert` for architecture design
2. **Subtask 43.2**: Use `/kc:impl --agent=workflow-expert` for orchestration engine
3. **Subtask 43.3**: Use `/kc:impl --agent=ml-engineering-agent` for TensorFlow integration
4. **Subtask 43.4**: Use `/kc:impl --agent=monitoring-expert` for real-time monitoring
5. **Subtask 43.5**: Use `/kc:test --agent=ai-testing-agent` for end-to-end validation

### Phase 4: Real-Time Data Integration Hub (Task 41)
**Duration**: 3-4 weeks  
**Community Benefit**: Live community engagement with transparent data flows

#### Task 41: Real-Time Data Integration Implementation

**KC Command Sequence**:
```bash
# Research event-driven architecture patterns
/kc:research "Apache Kafka with existing Supabase database"
/kc:research "Neo4j knowledge graph for community relationships"

# Implement data integration layer
/kc:impl --task=41 --agent=backend-infrastructure-agent
/kc:split-task --task=41.2 --focus="Kafka integration with existing APIs"
```

**Specialized Agent Assignments**:
- **backend-infrastructure-agent**: Data lake and Kafka setup
- **database-expert**: ETL pipelines and Neo4j integration
- **search-expert**: Elasticsearch universal search
- **analytics-agent**: Apache Superset integration

**Integration Points**:
- Existing database: Supabase PostgreSQL with current schemas
- Current integrations: Notion, Xero, Gmail, LinkedIn APIs
- Existing analytics: `/archive/financial-reports/`, `/tools/analytics/`

## 🔧 KC Commands Reference Guide

### Core Implementation Commands

#### `/kc:impl` - Primary Implementation Command
```bash
# Full task implementation with agent assignment
/kc:impl --task=38 --agent=python-backend-expert --priority=values-alignment

# Subtask implementation with specific focus
/kc:impl --subtask=38.1 --agent=api-architect-agent --integration-point="/apps/backend"

# Implementation with testing integration
/kc:impl --task=40 --agent=nextjs-expert --include-tests=true
```

#### `/kc:split-task` - Task Decomposition
```bash
# Split complex tasks into implementable subtasks
/kc:split-task --task=36 --focus="Kubernetes deployment" --max-subtasks=5

# Split with agent assignment suggestions
/kc:split-task --task=38 --suggest-agents=true --priority=indigenous-sovereignty

# Split with existing codebase context
/kc:split-task --task=40 --codebase-context="/apps/frontend" --integration-focus=true
```

#### `/kc:research` - Research and Analysis
```bash
# Values-aligned research
/kc:research "Indigenous data sovereignty implementation patterns" --context=community-platform

# Technical research with integration focus
/kc:research "Vite Module Federation with Next.js" --existing-code="/apps/frontend"

# Compliance research
/kc:research "Australian ASIC APRA automation requirements" --focus=financial-reporting
```

#### `/kc:test` - Testing and Validation
```bash
# Comprehensive testing with values validation
/kc:test --task=38 --include-values-compliance=true --agent=qa-automation-agent

# Performance testing for real-time features
/kc:test --task=41 --performance-focus=true --benchmarks=real-time-latency

# Community acceptance testing
/kc:test --task=50 --community-validation=true --stakeholder-feedback=true
```

### Specialized Agent Assignments

#### Backend and Infrastructure Agents
- **python-backend-expert**: FastAPI, microservices, AI integration
- **backend-infrastructure-agent**: Kafka, data pipelines, system architecture
- **database-expert**: PostgreSQL, Neo4j, ETL processes
- **devops-expert**: Kubernetes, deployment, monitoring

#### Frontend and User Experience Agents
- **nextjs-expert**: React, Next.js, frontend architecture
- **frontend-architect-agent**: Module Federation, micro-frontends
- **ui-design-agent**: Component libraries, accessibility, design systems
- **ux-expert**: User flows, community engagement patterns

#### AI and Machine Learning Agents
- **ai-agent-expert**: Democratic AI orchestration, community ML
- **ml-engineering-agent**: TensorFlow, pattern recognition, predictive models
- **community-ai-agent**: Community-approved AI, values-aligned automation

#### Values and Compliance Agents
- **values-compliance-agent**: Indigenous data sovereignty, community values
- **security-expert**: Compliance, audit trails, data protection
- **governance-agent**: Democratic processes, community decision-making

## 📊 Task Execution Priority Matrix

### Immediate Priority (Week 1-2)
1. **Task 38.1**: Values compliance FastAPI service - `/kc:impl --agent=python-backend-expert`
2. **Task 38.4**: Indigenous data sovereignty framework - `/kc:impl --agent=values-compliance-agent`
3. **Task 40.1**: Module Federation shell setup - `/kc:impl --agent=frontend-architect-agent`

### High Priority (Week 3-6)
1. **Task 38.2-38.5**: Complete values integration system
2. **Task 40.2-40.5**: Complete unified dashboard
3. **Task 36.1-36.2**: Begin cloud-native architecture

### Medium Priority (Week 7-12)
1. **Task 43**: Intelligent workflow automation
2. **Task 41**: Real-time data integration
3. **Task 49**: Compliance and security frameworks

## 🔄 Continuous Integration Workflow

### Daily Development Cycle
```bash
# Morning: Check community priorities and values alignment
/kc:research "community feedback overnight" --source=notion-updates
/kc:impl --continue-task --values-check=true

# Development: Implement with specialized agents
/kc:impl --task=current --agent=appropriate-expert --community-approval=required

# Evening: Test and validate with community values
/kc:test --current-work --community-acceptance=true
/kc:commit --values-compliance-validated=true
```

### Weekly Sprint Planning
```bash
# Sprint planning with community input
/kc:research "community priorities this week" --source=democratic-voting
/kc:split-task --upcoming-tasks --community-priority-ranking=true

# Sprint execution with agent coordination
/kc:impl --sprint-tasks --multi-agent-coordination=true
/kc:test --sprint-validation --community-feedback-integration=true
```

## 🎯 Success Metrics and Validation

### Values-Aligned Success Criteria
- **95% Values Compliance**: Automated validation with each KC command
- **100% Community Transparency**: Real-time profit and decision sharing
- **70% Democratic Participation**: Community involvement in all major decisions
- **Zero Indigenous Data Violations**: Continuous sovereignty monitoring

### Technical Performance Benchmarks
- **<200ms API Response Times**: Validated with `/kc:test --performance`
- **<100ms Real-time Updates**: WebSocket latency monitoring
- **99.9% Platform Availability**: Kubernetes health monitoring
- **<3 Second App Switching**: Module Federation performance

### Implementation Quality Gates
Each task must pass:
1. **Values Compliance Check**: `/kc:test --values-compliance`
2. **Community Acceptance Test**: `/kc:test --community-validation`
3. **Technical Performance Test**: `/kc:test --performance-benchmarks`
4. **Security and Privacy Audit**: `/kc:test --security-audit`

## 🌟 Expected Outcomes

### Month 1: Values Integration Foundation
- Real-time values compliance monitoring active
- Indigenous data sovereignty framework deployed
- Community benefit tracking transparent and automated
- Democratic decision-making platform operational

### Month 2: Unified Platform Experience
- All 12+ applications integrated in micro-frontend shell
- Unified navigation with community context awareness
- Real-time cross-application state synchronization
- Mobile-responsive experience with offline capabilities

### Month 3: AI-Native Intelligence
- Democratic AI agent coordination operational
- Community-approved workflow automation active
- Pattern recognition serving community insights
- Innovation pipeline collecting and prioritizing community ideas

### 2027 Vision Achievement
- 1000+ community organisations empowered
- Beautiful obsolescence through community ownership transfer
- Template for ethical AI and Indigenous data sovereignty
- Sustainable revenue streams benefiting community organisations

## 📞 Implementation Support

### KC Command Help
- Use `/help kc:impl` for detailed implementation command options
- Use `/help kc:agents` for specialized agent capabilities
- Use `/help kc:values` for community values integration guidance

### Community Integration Points
- **Notion**: Project management and content collaboration
- **Supabase**: Community data and real-time synchronization
- **Existing APIs**: Xero, Gmail, LinkedIn relationship intelligence
- **Values Framework**: Continuous compliance and transparency monitoring

This implementation guide ensures that every technical decision honors community wisdom while delivering world-class technology platform capabilities that empower community organisations toward eventual self-ownership and control.

---

*Built with revolutionary love and technical excellence using KC commands and specialized agents - honoring community wisdom through systematic, values-driven implementation.*