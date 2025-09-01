#!/bin/bash

# ACT Placemat - Metabase Analytics Dashboard Startup Script
# Starts Metabase with PostgreSQL integration for community analytics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"
COMPOSE_FILE="$DOCKER_DIR/metabase-compose.yml"
ENV_FILE="$DOCKER_DIR/.env.metabase"

echo -e "${BLUE}🚀 ACT Placemat - Starting Metabase Analytics Dashboard${NC}"
echo "=================================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Docker Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi

# Check environment configuration
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}📝 Creating default environment file...${NC}"
    cp "$ENV_FILE.example" "$ENV_FILE" 2>/dev/null || echo "# Add your Metabase configuration here" > "$ENV_FILE"
fi

# Function to check if service is healthy
check_service_health() {
    local service_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    echo -e "${BLUE}🔍 Checking $service_name health...${NC}"
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service_name" | grep -q "healthy\|Up"; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)${NC}"
        sleep 10
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy${NC}"
    return 1
}

# Function to display service URLs
show_service_info() {
    local metabase_port=$(grep "METABASE_PORT" "$ENV_FILE" | cut -d'=' -f2 | tr -d ' ' || echo "3001")
    
    echo -e "${GREEN}🎉 Metabase Analytics Dashboard is ready!${NC}"
    echo "=================================================="
    echo -e "${BLUE}📊 Metabase Dashboard:${NC} http://localhost:$metabase_port"
    echo -e "${BLUE}🔧 Admin Setup:${NC} http://localhost:$metabase_port/setup"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Complete the Metabase setup wizard"
    echo "2. Connect to your ACT PostgreSQL database"
    echo "3. Import dashboard templates"
    echo "4. Configure user permissions"
    echo ""
    echo -e "${BLUE}🛠️  Useful Commands:${NC}"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $COMPOSE_FILE down"
    echo "  Restart: $0"
}

# Parse command line arguments
PROFILE="default"
DETACHED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --standalone)
            PROFILE="standalone"
            shift
            ;;
        --with-cache)
            PROFILE="cache"
            shift
            ;;
        --detached|-d)
            DETACHED=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --standalone     Use standalone PostgreSQL for Metabase"
            echo "  --with-cache     Include Redis cache service"
            echo "  --detached, -d   Run in detached mode"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Change to docker directory
cd "$DOCKER_DIR"

# Load environment variables
if [[ -f "$ENV_FILE" ]]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

echo -e "${BLUE}🔧 Configuration:${NC}"
echo "  Profile: $PROFILE"
echo "  Detached: $DETACHED"
echo "  Environment: $ENV_FILE"
echo ""

# Pull latest images
echo -e "${BLUE}📦 Pulling latest images...${NC}"
docker-compose -f "$COMPOSE_FILE" --profile "$PROFILE" pull

# Start services
echo -e "${BLUE}🚀 Starting Metabase services...${NC}"
if [[ "$DETACHED" == "true" ]]; then
    docker-compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d
else
    docker-compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d
fi

# Wait for services to be healthy
if [[ "$PROFILE" == "standalone" ]]; then
    check_service_health "metabase-db" 30
fi

check_service_health "metabase" 60

# Display service information
show_service_info

# If not detached, show logs
if [[ "$DETACHED" == "false" ]]; then
    echo -e "${BLUE}📝 Showing logs (Ctrl+C to exit):${NC}"
    echo "=================================================="
    docker-compose -f "$COMPOSE_FILE" --profile "$PROFILE" logs -f
fi