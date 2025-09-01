# 🏗️ Domain-Driven Design Architecture

This directory contains the core business domains of the ACT Community Platform, implemented using Domain-Driven Design (DDD) principles with Clean Architecture and Hexagonal patterns.

## 📂 Domain Structure

### Core Domains

Each domain represents a distinct business context with clear boundaries:

```
📁 domains/
├── 🏘️ community/     # Community stories, engagement, impact
├── 🧠 intelligence/   # AI/ML insights, research, analytics  
├── 🤝 partnerships/   # Partner management, opportunities
├── 💰 financial/      # Financial management, bookkeeping
└── 🏗️ platform/      # Platform operations, governance
```

## 🎯 Domain Boundaries

### 🏘️ Community Domain
**Purpose**: Empower community storytelling and collective impact
- **Aggregates**: Community, Story, Storyteller, Engagement
- **Key Capabilities**: Story creation, community management, impact tracking
- **External Integrations**: Media storage, social platforms

### 🧠 Intelligence Domain  
**Purpose**: AI-powered insights and decision support
- **Aggregates**: Insight, Research, Analysis, Recommendation
- **Key Capabilities**: AI analysis, research automation, intelligence generation
- **External Integrations**: OpenAI, Anthropic, Perplexity, knowledge graphs

### 🤝 Partnerships Domain
**Purpose**: Strategic relationship building and opportunity discovery
- **Aggregates**: Partner, Opportunity, Connection, Collaboration  
- **Key Capabilities**: Partnership management, opportunity tracking
- **External Integrations**: LinkedIn, Gmail, CRM systems

### 💰 Financial Domain
**Purpose**: Transparent financial management and business intelligence
- **Aggregates**: Transaction, Budget, Report, Receipt
- **Key Capabilities**: Financial tracking, receipt processing, reporting
- **External Integrations**: Xero, Stripe, banking APIs

### 🏗️ Platform Domain
**Purpose**: Secure platform operations and compliance
- **Aggregates**: User, Permission, AuditLog, Configuration
- **Key Capabilities**: User management, security, platform health
- **External Integrations**: Auth providers, monitoring tools

## 🏛️ Hexagonal Architecture Pattern

Each domain follows a consistent 4-layer architecture:

```
📁 {domain}/
├── 🎯 core/           # Business Logic (Domain Layer)
│   ├── entities/      # Core business entities
│   ├── value-objects/ # Immutable value representations
│   ├── services/      # Domain business logic
│   ├── repositories/  # Data access interfaces (ports)
│   └── events/        # Domain events
├── 📋 application/    # Application Logic (Use Cases)
│   ├── use-cases/     # Business use case implementations
│   ├── handlers/      # Event and command handlers
│   ├── dto/          # Data transfer objects
│   └── ports/        # Application service interfaces
├── 🔌 infrastructure/ # External Adapters
│   ├── repositories/ # Database implementation
│   ├── external-apis/ # Third-party service adapters
│   ├── messaging/    # Event publishing/subscribing
│   └── persistence/  # Database configuration
└── 🌐 presentation/   # API/UI Layer
    ├── controllers/   # HTTP request handlers
    ├── graphql/      # GraphQL resolvers
    ├── middlewares/  # Request/response middleware
    └── validators/   # Input validation schemas
```

## 🔄 Cross-Domain Communication

Domains communicate through:

1. **Domain Events** - Asynchronous event-driven communication
2. **Application Services** - Orchestrated use cases across domains
3. **Read Models** - Denormalized views for cross-domain queries
4. **Anti-Corruption Layers** - Safe integration with external systems

## 🚀 Development Guidelines

### Domain Purity Rules
- **Core layer** depends on nothing external (pure business logic)
- **Application layer** orchestrates domain entities and external services
- **Infrastructure layer** implements interfaces defined in core/application
- **Presentation layer** handles HTTP/GraphQL concerns only

### Naming Conventions
- **Entities**: `PascalCase` (e.g., `Story`, `Partnership`)
- **Value Objects**: `PascalCase` with suffix (e.g., `StoryContent`, `EmailAddress`)
- **Use Cases**: `PascalCase` with verb (e.g., `CreateStory`, `FindPartnership`)
- **Events**: `PascalCase` with past tense (e.g., `StoryCreated`, `PartnershipFormed`)

### Testing Strategy
- **Unit Tests**: Core domain logic (90%+ coverage)
- **Integration Tests**: Use cases with real dependencies
- **Contract Tests**: API boundary testing
- **End-to-End Tests**: Critical user journeys

## 📊 Migration Path

From current monolithic structure to DDD domains:

### Phase 1: Foundation (✅ Complete)
- ✅ Create domain folder structure
- ✅ Define domain boundaries and responsibilities
- ✅ Establish architectural documentation

### Phase 2: Domain Implementation (🔄 In Progress)
- 🔄 Implement core entities and value objects
- 🔄 Create repository interfaces and implementations  
- 🔄 Build application use cases
- 🔄 Set up domain event infrastructure

### Phase 3: API Integration (📋 Planned)
- 📋 Migrate existing APIs to domain controllers
- 📋 Implement GraphQL federation
- 📋 Add comprehensive validation and error handling
- 📋 Create API documentation and testing

### Phase 4: Optimization (📋 Planned)  
- 📋 Performance optimization and caching
- 📋 Advanced monitoring and observability
- 📋 Security hardening and compliance
- 📋 Developer tooling and automation

## 🎯 Business Impact

This architecture enables:
- **🚀 Faster Development** - Clear boundaries reduce complexity
- **🔧 Better Maintainability** - Explicit dependencies and contracts  
- **📈 Improved Scalability** - Independent domain evolution
- **🛡️ Enhanced Security** - Domain-level access control
- **📊 Better Testing** - Isolated, testable business logic

---

*Building a world-class community development platform through principled architecture.*