# ACT Platform - Community-Owned Impact Platform

## The World's First Community-Owned Impact Platform

A Curious Tractor is building revolutionary technology that serves community ownership rather than institutional convenience. Our goal is **Beautiful Obsolescence** - where communities no longer need ACT because they have complete control of their own platforms and futures.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start backend
cd apps/backend
node server.js

# 3. Start frontend
cd apps/frontend
npm run dev

# 4. Access the platform
open http://localhost:5175
```

**📖 Detailed Guide**: [Docs/00-Getting-Started/Quick-Start.md](./Docs/00-Getting-Started/Quick-Start.md)

### 💰 Xero Mastery Sprint (January 2026)

Master Xero features to unlock $40K+ R&D tax credits and maximize tax efficiency:

- **🚀 [Xero Quick Start Guide](./XERO_QUICK_START.md)** - Everything you need to start Week 1
- **📘 [Week 1 Complete Guide](./docs/WEEK1_COMPLETE_GUIDE.md)** - Self-guided lessons (no AI needed!)
- **📊 [4-Week Playbook](./docs/XERO_MASTERY_GUIDE.md)** - Complete mastery curriculum
- **🤖 [Xero Expert MCP](./mcp-servers/xero-expert/)** - Always-available Xero assistant

**Week 1 Goal**: 80%+ auto-categorization rate | **Year 1 ROI**: $57K-$85K (400-800%)

---

## 🏗️ System Architecture

### Core Components

- **🤖 AI Business Agent** - Always-on autonomous monitoring for Australian business operations
- **📊 Intelligence Layer** - Real-time insights from Gmail, Calendar, LinkedIn, Notion, Xero
- **🌐 Unified API** - Consistent v2 API architecture across all services
- **💾 Supabase Database** - Production-grade PostgreSQL with row-level security
- **⚛️ React Frontend** - Modern UI with real-time updates

### Data Integrations

| Integration | Status | Records | Purpose |
|-------------|--------|---------|---------|
| 🟢 Gmail | Connected | 1,243 emails | Contact intelligence |
| 🟢 Calendar | Connected | 87 events | Meeting insights |
| 🟢 LinkedIn | Connected | 4,491 contacts | Relationship intelligence |
| 🟢 Notion | Connected | 156 projects | Project management |
| 🟢 Xero | Connected | 234 transactions | Financial data |
| 🟢 Supabase | Connected | Real-time | Data storage |

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./Docs/00-Getting-Started/Quick-Start.md)** - Get up and running in 5 minutes
- **[Installation](./Docs/00-Getting-Started/Installation.md)** - Detailed setup instructions
- **[Configuration](./Docs/00-Getting-Started/Configuration.md)** - Environment setup

### Product
- **[Product Vision](./Docs/01-Product/README.md)** - ACT Platform vision and goals
- **[Product Requirements](./Docs/01-Product/PRD.md)** - Comprehensive PRD
- **[Use Cases](./Docs/01-Product/ACT_PLACEMAT_REAL_WORLD_USE_CASE_BLUEPRINT.md)** - Real-world applications
- **[Beautiful Obsolescence](./Docs/01-Product/CORE_ECOSYSTEM_FRAMEWORK.md)** - Community independence framework

### Architecture
- **[System Overview](./Docs/02-Architecture/README.md)** - High-level architecture
- **[API Design](./Docs/02-Architecture/API-Design.md)** - API v2 architecture
- **[Database Schema](./Docs/02-Architecture/Database-Schema.md)** - Supabase schema
- **[Integration Architecture](./Docs/02-Architecture/Integration-Architecture.md)** - Data flow

### Development
- **[Setup Guide](./Docs/03-Development/Setup-Guide.md)** - Developer environment
- **[API Reference](./Docs/03-Development/API-Reference.md)** - Complete API docs
- **[Testing Guide](./Docs/03-Development/Testing-Guide.md)** - Testing strategy
- **[Contributing](./Docs/03-Development/Contributing.md)** - How to contribute

### AI Agent
- **[Agent Overview](./Docs/04-AI-Agent/README.md)** - AI agent capabilities
- **[Business Intelligence](./Docs/04-AI-Agent/BUSINESS_AGENT_README.md)** - Australian business agent
- **[Research Integration](./Docs/04-AI-Agent/Research-Integration.md)** - AI research tools
- **[Conversational AI](./Docs/04-AI-Agent/Conversational-AI.md)** - Chat interface

### Integrations
- **[Gmail Integration](./Docs/05-Integrations/Gmail.md)** - Email intelligence
- **[Calendar Integration](./Docs/05-Integrations/Calendar.md)** - Meeting insights
- **[LinkedIn Integration](./Docs/05-Integrations/LinkedIn.md)** - Network intelligence
- **[Notion Integration](./Docs/05-Integrations/Notion.md)** - Project management
- **[Xero Integration](./Docs/05-Integrations/Xero.md)** - Financial data
- **[Supabase](./Docs/05-Integrations/Supabase.md)** - Database

### Deployment
- **[Production Deployment](./Docs/06-Deployment/Production.md)** - Go-live guide
- **[Monitoring](./Docs/06-Deployment/Monitoring.md)** - System monitoring
- **[Scaling](./Docs/06-Deployment/Scaling.md)** - Performance optimization

### Security
- **[Authentication](./Docs/07-Security/Authentication.md)** - OAuth and JWT
- **[Data Privacy](./Docs/07-Security/Data-Privacy.md)** - Australian Privacy Act
- **[Compliance](./Docs/07-Security/Compliance.md)** - Security compliance

---

## 🤖 AI Business Agent

The ACT Platform includes an **always-on business intelligence agent** specifically designed for Australian business operations.

### Capabilities

- **💰 Financial Monitoring** - Real-time Xero tracking, cash flow forecasting
- **📋 Compliance Tracking** - BAS, PAYG, Superannuation, R&D Tax Incentives
- **🎯 Grant Discovery** - Automatic scanning of grants.gov.au and Indigenous programs
- **🤝 Relationship Intelligence** - LinkedIn network analysis (4,491 contacts)
- **📁 Project Health** - Notion project monitoring

### Features

```
User: "What's my BAS obligation?"
Agent: "Your next BAS is due October 28 (in 28 days):
        - GST collected: $12,400
        - GST paid: $8,200
        - Net payable: $4,200
        Would you like me to schedule a payment reminder?"

User: "Are there grants I should apply for?"
Agent: "I found 3 relevant opportunities:
        1. Indigenous Business Direct ($50K-$250K) - Due in 6 weeks
        2. R&D Tax Incentive (38.5% of $120K = $46K benefit)
        3. Entrepreneurs' Programme (up to $1M) - Rolling

        I recommend the R&D Tax Incentive first.
        Your tech development qualifies. Want me to draft it?"
```

**📖 Full Documentation**: [Docs/04-AI-Agent/BUSINESS_AGENT_README.md](./Docs/04-AI-Agent/BUSINESS_AGENT_README.md)

---

## 🌐 API Architecture

### v2 API Endpoints

```
/api/v2/
├── /agent/                    ← AI Agent
│   ├── /chat                  ← Conversational interface
│   ├── /ask                   ← Questions
│   ├── /research              ← Deep research
│   └── /status                ← Health
│
├── /data/                     ← Data Access
│   ├── /contacts              ← Unified contacts
│   ├── /projects              ← Projects
│   ├── /finance               ← Financial data
│   └── /calendar              ← Events
│
├── /intelligence/             ← Intelligence
│   ├── /relationships         ← Relationship mapping
│   ├── /opportunities         ← Opportunities
│   └── /compliance            ← Compliance
│
└── /monitoring/               ← Monitoring
    ├── /health                ← System health
    └── /integrations          ← Integration status
```

**📖 API Reference**: [Docs/03-Development/API-Reference.md](./Docs/03-Development/API-Reference.md)

---

## 🔐 Security & Privacy

- ✅ **Row-Level Security** - Supabase RLS for all tables
- ✅ **OAuth 2.0** - Secure authentication for all integrations
- ✅ **Data Encryption** - At rest and in transit
- ✅ **Australian Privacy Act** - Compliant data handling
- ✅ **Indigenous Data Sovereignty** - Community-controlled data

**📖 Security Guide**: [Docs/07-Security/README.md](./Docs/07-Security/README.md)

---

## 📊 Current Status

### Technical Metrics
- ✅ **API Uptime**: 99.9%
- ✅ **Response Time**: <500ms (95th percentile)
- ✅ **Data Sources**: 6 active integrations
- ✅ **Test Coverage**: 75% (target: 90%)

### Business Metrics
- ✅ **Projects Tracked**: 156
- ✅ **Contacts Managed**: 4,491
- ✅ **Financial Transactions**: 234
- ✅ **Community Stories**: Growing

---

## 🚀 Roadmap

### ✅ Phase 1: Production Data Foundation (Complete)
- Production-grade Supabase database
- Stabilized API endpoints
- Real-time data synchronization
- Automated health monitoring

### 🔄 Phase 2: Community Interface (In Progress)
- Real-time dashboard
- Story management system
- Project showcase pages
- Export tools

### 📋 Phase 3: Intelligence Layer (Next)
- Enhanced AI research capabilities
- Perplexity and Tavily integration
- Conversational business assistant
- Advanced analytics

### 🎯 Phase 4: Community Ownership (Planned)
- Complete data export tools
- Platform forking capabilities
- Mobile React Native app
- Revenue sharing automation

**📖 Detailed Roadmap**: [Docs/01-Product/Roadmap.md](./Docs/01-Product/Roadmap.md)

---

## 💡 Philosophy: Beautiful Obsolescence

Our ultimate success metric is **Beautiful Obsolescence** - communities saying:

> "ACT? We don't need them anymore. We run this ourselves now."

We're not building dependency. We're building **community power**.

Communities don't need external saviors - they need:
- ✅ Superior tools
- ✅ Authentic partnerships
- ✅ Systems designed for their ownership

**📖 Learn More**: [Docs/01-Product/CORE_ECOSYSTEM_FRAMEWORK.md](./Docs/01-Product/CORE_ECOSYSTEM_FRAMEWORK.md)

---

## 🤝 Contributing

We welcome contributions that advance our mission of community empowerment.

1. **Read** the [Contributing Guide](./Docs/03-Development/Contributing.md)
2. **Check** the [Task Master](./Docs/.taskmaster/tasks/tasks.json) for current tasks
3. **Fork** the repository
4. **Create** a feature branch
5. **Submit** a pull request

**Questions?** Open an issue or reach out via [contact details].

---

## 📄 License

Copyright © 2025 A Curious Tractor
All Rights Reserved

This project is built for Australian Indigenous communities with the goal of Beautiful Obsolescence - complete community independence and control.

---

## 🙏 Acknowledgments

Built with love for Australian Indigenous communities and all communities worldwide working toward self-determination and sovereignty.

**Technology Stack:**
- React 19 + TypeScript
- Node.js + Express
- Supabase PostgreSQL
- Anthropic Claude AI
- OpenAI GPT-4
- Perplexity AI
- And many more amazing open-source tools

---

## 📞 Support

- **Documentation**: [Docs/README.md](./Docs/README.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Issues**: GitHub Issues
- **Email**: support@acurioustractor.com.au

---

**Built with ❤️ in Australia for communities worldwide 🇦🇺🌏**