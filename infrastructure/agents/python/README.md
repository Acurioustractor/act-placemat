# ACT Placemat Python Agents

This directory contains Python-based AI agents for the ACT Placemat platform, providing intelligent automation and assistance capabilities.

## Architecture

The agent system is built with a modular architecture:

- `agents/` - Individual agent implementations
- `shared/` - Common utilities and base classes
- `config/` - Configuration files and settings
- `tests/` - Test suites

## Agents

### Core Agents

1. **Strategic Advisor Agent** (`agents/strategic_advisor.py`)
   - Provides strategic guidance and decision support
   - Analyses trends and opportunities
   - Generates recommendations for community initiatives

2. **Operations Manager Agent** (`agents/operations_manager.py`)
   - Manages workflow orchestration
   - Handles task delegation and monitoring
   - Coordinates between different system components

3. **Community Guardian Agent** (`agents/community_guardian.py`)
   - Ensures ethical AI practices and constitutional compliance
   - Monitors content and interactions
   - Enforces community guidelines and values

4. **Content Creation Agent** (`agents/content_creator.py`)
   - Generates engaging content for stories and projects
   - Assists with writing, editing, and content optimisation
   - Maintains brand consistency and Australian voice

5. **Research Analyst Agent** (`agents/research_analyst.py`)
   - Conducts market research and trend analysis
   - Gathers and synthesises information from multiple sources
   - Provides data-driven insights and reports

## Installation

### Using Poetry (Recommended)

```bash
cd infrastructure/agents/python
poetry install
poetry shell
```

### Using pip

```bash
cd infrastructure/agents/python
pip install -r requirements.txt
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/act_placemat

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS (for storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-2
```

## Usage

### Running Individual Agents

```bash
# Start the Strategic Advisor agent
poetry run python -m agents.strategic_advisor

# Start the Operations Manager
poetry run python -m agents.operations_manager

# Start all agents
poetry run python -m agents.orchestrator
```

### Using the CLI

```bash
# Get agent status
act-agent status

# Run a specific agent task
act-agent run strategic-advisor --task="analyse community trends"

# List available agents
act-agent list
```

### API Server

Start the FastAPI server for HTTP access:

```bash
poetry run uvicorn agents.api:app --host 0.0.0.0 --port 8080 --reload
```

The API will be available at `http://localhost:8080` with automatic documentation at `/docs`.

## Development

### Running Tests

```bash
poetry run pytest
```

### Code Quality

```bash
# Format code
poetry run black .
poetry run isort .

# Lint code  
poetry run flake8

# Type checking
poetry run mypy .
```

### Pre-commit Hooks

```bash
poetry run pre-commit install
```

## Agent Communication

Agents communicate through:

1. **Message Queue** (Redis/Celery) - For asynchronous task processing
2. **Database Events** - For data synchronisation
3. **HTTP API** - For external integrations
4. **WebSocket** - For real-time updates

## Monitoring and Logging

- Structured logging with `structlog`
- Health check endpoints for each agent
- Performance metrics and monitoring
- Error tracking and alerting

## Deployment

### Docker

```bash
docker build -t act-agents .
docker run -p 8080:8080 act-agents
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

## Security

- All API endpoints are secured with authentication
- Sensitive data is encrypted at rest and in transit  
- Regular security audits and dependency updates
- GDPR and Australian Privacy Act compliance

## Contributing

1. Create a feature branch
2. Implement your changes with tests
3. Ensure all quality checks pass
4. Submit a pull request

## License

MIT License - see LICENSE file for details.