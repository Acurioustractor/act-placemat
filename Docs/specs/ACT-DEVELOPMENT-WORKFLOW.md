# ACT Universal AI Platform - Development Workflow

## Overview

The ACT platform development now uses the Learntube Claude Code Template framework for intelligent task management, automated quality assurance, and specialized agent coordination.

## 🚀 Complete Development Cycle

### Phase 1: Requirements & Design
```bash
# 1. Transform ideas into structured requirements
--agent kiro-requirement "Create requirements for democratic governance system"

# 2. Create comprehensive technical design
--agent kiro-design "Design multi-agent coordination architecture"

# 3. Generate actionable task lists
--agent kiro-plan "Plan implementation for financial intelligence system"

# 4. Break down into manageable tasks
/kc:split-task community-intelligence
```

### Phase 2: Implementation
```bash
# 5. Implement tasks systematically with specialized agents
/kc:impl 0001  # Uses appropriate specialist (nextjs-expert, python-backend-expert)
/kc:impl 0002  # Automated testing and review included
/kc:impl 0003  # Creates git branches and proper commits

# 6. Launch parallel development with multiple agents
--agent nextjs-expert "Build empathy ledger dashboard components"
--agent python-backend-expert "Implement Xero integration API"
```

### Phase 3: Quality Assurance
```bash
# 7. Automated code review and security analysis
--agent code-reviewer "Review universal agent orchestration system"

# 8. Fix identified issues automatically
/kc:bug-fix 123 --with-tests --security-review
```

### Phase 4: Documentation & Deployment
```bash
# 9. Generate comprehensive documentation
--agent technical-documentation-writer "Document AI agent coordination API"

# 10. Create and manage pull requests
/kc:pr-list  # Review priority and progress
```

## 🏗️ ACT Platform Specific Features

### Australian Compliance Integration
- All agents configured with Australian English spelling
- ASIC, APRA, and Privacy Act compliance built into financial agents
- Indigenous data sovereignty protocols in community intelligence

### Community Benefit Optimization
- 40% minimum community benefit sharing validated in code review
- Transparent profit distribution tracking in financial intelligence
- Democratic decision-making workflows in governance platform

### Multi-Business Function Support
The framework supports all ACT business areas:

1. **Financial Intelligence** (`financial-intelligence`)
   - Smart receipt processing with Xero integration
   - R&D tax automation
   - Democratic profit distribution

2. **Partnership Management** (`partnership-management`)
   - 142+ organization relationship intelligence
   - Automated communication workflows
   - Community network analysis

3. **Story Collection** (`story-collection`)
   - Ethical content gathering with consent management
   - Cultural protocol compliance
   - Community narrative preservation

4. **Impact Tracking** (`impact-tracking`)
   - Multi-dimensional value measurement
   - Community benefit quantification
   - Transparency reporting

5. **Governance Platform** (`governance-platform`)
   - Democratic decision-making tools
   - Indigenous protocol integration
   - Community voting systems

## 🔧 Automated Quality Assurance

### Pre-Tool Use Hooks
- **Security Protection**: Prevents dangerous command execution
- **Commit Quality**: Ensures clean commit messages without AI signatures

### Post-Tool Use Hooks
- **Auto-Formatting**: `ruff` for Python, `prettier` for TypeScript/JavaScript
- **Code Quality**: Automated linting and type checking

### Developer Experience
- **Sound Notifications**: Audio feedback for status changes
- **Parallel Processing**: Multiple agent coordination
- **Branch Management**: Automated git workflow

## 📋 Daily Development Workflow

### Morning Startup
```bash
# Check current development status
/kc:pr-list

# Get next priority task
--agent kiro-executor "Continue with highest priority ACT platform task"

# Review recent work
git log --oneline -10
```

### During Development
```bash
# Implement specific features
/kc:impl 0001  # Automated implementation with testing

# Handle urgent issues
/kc:bug-fix 456 --security-review

# Get specialized help
--agent nextjs-expert "Optimize the universal dashboard performance"
```

### End of Day
```bash
# Review progress and create PRs
/kc:pr-list

# Document work completed
--agent technical-documentation-writer "Update API documentation for today's changes"
```

## 🎯 Integration with ACT Systems

### Existing ACT Infrastructure
- **Supabase**: Multi-tenant data architecture
- **Notion**: 142+ organization intelligence
- **Xero**: Financial automation
- **Gmail/Calendar**: Communication workflows
- **LinkedIn**: Partnership management

### New AI Agent Coordination
- **Intelligence Hub**: Central AI orchestration at `localhost:3002`
- **Agent Squads**: Financial, Business, Community, Strategic intelligence
- **Democratic Prioritization**: Community voting on AI task priorities
- **Real-time Sync**: WebSocket coordination across all systems

## ⚙️ Configuration Files

### Claude Code Settings
```json
{
  "hooks": {
    "PreToolUse": [
      {"matcher": "Bash", "hooks": [
        {"type": "command", "command": "~/.claude/hooks/deny_check.sh"},
        {"type": "command", "command": "~/.claude/hooks/check_ai_commit.sh"}
      ]}
    ],
    "PostToolUse": [
      {"matcher": "Write|Edit|MultiEdit", "hooks": [
        {"type": "command", "command": "~/.claude/hooks/formatter.sh"}
      ]}
    ]
  }
}
```

### Project Structure
```
ACT Placemat/
├── docs/specs/                    # Feature specifications
│   ├── universal-agent-hub/       # Agent coordination
│   ├── financial-intelligence/    # Smart financial tools
│   ├── community-intelligence/    # Democratic governance
│   └── {feature}/tasks/          # Implementation tasks
├── apps/                         # Core applications
│   ├── frontend/                 # Next.js universal dashboard
│   ├── backend/                  # Express.js API gateway
│   └── intelligence-hub/         # Python AI orchestration
└── packages/                     # Shared utilities
```

## 🌟 Success Metrics

### Development Velocity
- **Task Completion**: Automated tracking via KC commands
- **Code Quality**: Automated review and security analysis
- **Bug Resolution**: Automated fixing with `/kc:bug-fix`

### Community Impact
- **40% Benefit Sharing**: Validated in all financial operations
- **Transparent Decision Making**: Democratic prioritization of AI tasks
- **Cultural Protocol Compliance**: Indigenous data sovereignty maintained

### Platform Stability
- **Automated Testing**: Built into every implementation
- **Security Scanning**: Pre-commit and post-deployment
- **Australian Compliance**: Built into every business function

---

*This workflow supports ACT's mission of beautiful obsolescence by 2027 through intelligent automation and community-driven development* 🏜️