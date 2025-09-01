#!/bin/bash

# ACT Farmhand AI Agent - Enhanced Architecture Startup Script
# This script starts the complete ACT Farmhand system with Kafka, Redis, Neo4j

set -e

echo "🌾 Starting ACT Farmhand AI Agent Enhanced Architecture"
echo "=================================================="

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Check for required environment variables
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "NOTION_TOKEN"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these in your .env file or environment."
    echo "Optional but recommended: OPENAI_API_KEY for enhanced AI features"
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p data/kafka
mkdir -p data/zookeeper
mkdir -p data/redis
mkdir -p data/neo4j

echo "🔧 Installing/updating dependencies..."
cd apps/backend && npm install && cd ../..

echo "🚀 Starting ACT Farmhand infrastructure..."
docker-compose -f docker-compose.farmhand.yml up -d

echo "⏳ Waiting for infrastructure to be ready..."

# Wait for Kafka to be ready
echo "🔄 Waiting for Kafka..."
timeout 120 bash -c 'until docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list &>/dev/null; do sleep 2; done' || {
    echo "❌ Kafka failed to start within 120 seconds"
    docker-compose -f docker-compose.farmhand.yml logs kafka
    exit 1
}

# Wait for Redis to be ready
echo "🔄 Waiting for Redis..."
timeout 60 bash -c 'until docker-compose -f docker-compose.farmhand.yml exec -T redis redis-cli ping | grep PONG &>/dev/null; do sleep 2; done' || {
    echo "❌ Redis failed to start within 60 seconds"
    docker-compose -f docker-compose.farmhand.yml logs redis
    exit 1
}

# Wait for Neo4j to be ready
echo "🔄 Waiting for Neo4j..."
timeout 120 bash -c 'until docker-compose -f docker-compose.farmhand.yml exec -T neo4j cypher-shell -u neo4j -p actfarmhand2024 "RETURN 1" &>/dev/null; do sleep 2; done' || {
    echo "❌ Neo4j failed to start within 120 seconds"
    docker-compose -f docker-compose.farmhand.yml logs neo4j
    exit 1
}

# Create Kafka topics
echo "📋 Creating Kafka topics..."
docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 3 \
    --topic act.notion.updates

docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 3 \
    --topic act.stories.created

docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 3 \
    --topic act.gmail.intelligence

docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 1 \
    --topic act.farmhand.alerts

docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 1 \
    --topic act.farmhand.weekly_sprint

docker-compose -f docker-compose.farmhand.yml exec -T kafka kafka-topics \
    --create --if-not-exists \
    --bootstrap-server localhost:9092 \
    --replication-factor 1 \
    --partitions 1 \
    --topic act.health.check

echo "✅ Kafka topics created successfully"

# Initialize Neo4j knowledge graph
echo "📊 Initializing Neo4j knowledge graph..."
docker-compose -f docker-compose.farmhand.yml exec -T neo4j cypher-shell -u neo4j -p actfarmhand2024 "
CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (proj:Project) REQUIRE proj.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (org:Organization) REQUIRE org.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (opp:Opportunity) REQUIRE opp.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (story:Story) REQUIRE story.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (theme:Theme) REQUIRE theme.name IS UNIQUE;
"

echo "✅ Neo4j knowledge graph initialized"

# Display system status
echo ""
echo "🌾 ACT Farmhand AI Agent is ready!"
echo "=================================="
echo ""
echo "🖥️  System URLs:"
echo "   • Main Application: http://localhost:3000"
echo "   • Backend API: http://localhost:3000/api"
echo "   • Kafka UI: http://localhost:8080"
echo "   • Neo4j Browser: http://localhost:7474 (neo4j/actfarmhand2024)"
echo "   • Redis: localhost:6379"
echo ""
echo "🧠 AI Agent Endpoints:"
echo "   • Query Agent: POST /api/farmhand/query"
echo "   • Health Check: GET /api/farmhand/health"
echo "   • Weekly Sprint: GET /api/farmhand/weekly-sprint"
echo "   • Skill Pods: POST /api/farmhand/skill-pod/{podName}"
echo ""
echo "📊 Monitoring:"
echo "   • Backend Logs: docker-compose -f docker-compose.farmhand.yml logs -f backend"
echo "   • Worker Logs: docker-compose -f docker-compose.farmhand.yml logs -f farmhand-worker"
echo "   • All Logs: docker-compose -f docker-compose.farmhand.yml logs -f"
echo ""

# Test the Farmhand Agent
echo "🧪 Testing ACT Farmhand Agent..."
sleep 5

if curl -s -f http://localhost:3000/api/farmhand/health > /dev/null; then
    echo "✅ ACT Farmhand Agent is responding"
    
    # Display agent status
    echo ""
    echo "🤖 Agent Status:"
    curl -s http://localhost:3000/api/farmhand/health | jq .
else
    echo "⚠️  ACT Farmhand Agent is not responding yet. Check logs:"
    echo "   docker-compose -f docker-compose.farmhand.yml logs backend"
fi

echo ""
echo "🎯 Next Steps:"
echo "   1. Test the agent: curl -X POST http://localhost:3000/api/farmhand/query -H 'Content-Type: application/json' -d '{\"query\":\"What projects need attention?\"}'"
echo "   2. View the knowledge graph in Neo4j Browser"
echo "   3. Monitor Kafka topics in Kafka UI"
echo "   4. Check the weekly sprint: curl http://localhost:3000/api/farmhand/weekly-sprint"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.farmhand.yml down"
echo "🔄 To restart: ./start-farmhand.sh"