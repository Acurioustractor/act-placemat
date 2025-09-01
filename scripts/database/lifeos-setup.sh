#!/bin/bash

# Life OS Database Setup Script
# Sets up PostgreSQL, Neo4j, and Redis for ACT Life Operating System
# Australian compliance and Beautiful Obsolescence principles

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.lifeos.yml"
ENV_FILE="${PROJECT_ROOT}/.env"

# Default configuration
LIFEOS_DATA_ROOT="${PROJECT_ROOT}/data"
LIFEOS_POSTGRES_PASSWORD=${LIFEOS_POSTGRES_PASSWORD:-lifeos_secure_password_2024}
LIFEOS_NEO4J_PASSWORD=${LIFEOS_NEO4J_PASSWORD:-neo4j_secure_password_2024}
LIFEOS_REDIS_PASSWORD=${LIFEOS_REDIS_PASSWORD:-redis_secure_password_2024}

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_message $BLUE "Checking prerequisites for Life OS database setup..."
    
    if ! command_exists docker; then
        print_message $RED "Error: Docker is not installed"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_message $RED "Error: Docker Compose is not installed"
        exit 1
    fi
    
    # Check Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_message $RED "Error: Docker daemon is not running"
        exit 1
    fi
    
    print_message $GREEN "✓ Prerequisites check passed"
}

# Function to create data directories
create_data_directories() {
    print_message $BLUE "Creating data directories for Australian data residency..."
    
    local directories=(
        "${LIFEOS_DATA_ROOT}/lifeos/postgres"
        "${LIFEOS_DATA_ROOT}/lifeos/neo4j/data"
        "${LIFEOS_DATA_ROOT}/lifeos/neo4j/logs"
        "${LIFEOS_DATA_ROOT}/lifeos/neo4j/import"
        "${LIFEOS_DATA_ROOT}/lifeos/neo4j/plugins"
        "${LIFEOS_DATA_ROOT}/lifeos/neo4j/conf"
        "${LIFEOS_DATA_ROOT}/lifeos/redis"
        "${LIFEOS_DATA_ROOT}/lifeos/backups"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            print_message $GREEN "Created directory: $dir"
        else
            print_message $YELLOW "Directory already exists: $dir"
        fi
    done
    
    # Set appropriate permissions for database directories
    chmod 755 "${LIFEOS_DATA_ROOT}/lifeos"
    chmod 700 "${LIFEOS_DATA_ROOT}/lifeos/postgres"
    chmod 755 "${LIFEOS_DATA_ROOT}/lifeos/neo4j"
    chmod 755 "${LIFEOS_DATA_ROOT}/lifeos/redis"
    chmod 755 "${LIFEOS_DATA_ROOT}/lifeos/backups"
    
    print_message $GREEN "✓ Data directories created with appropriate permissions"
}

# Function to setup environment variables
setup_environment() {
    print_message $BLUE "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f "$ENV_FILE" ]]; then
        touch "$ENV_FILE"
        print_message $GREEN "Created .env file"
    fi
    
    # Check and add environment variables
    local env_vars=(
        "LIFEOS_DATA_ROOT=${LIFEOS_DATA_ROOT}"
        "LIFEOS_POSTGRES_PASSWORD=${LIFEOS_POSTGRES_PASSWORD}"
        "LIFEOS_NEO4J_PASSWORD=${LIFEOS_NEO4J_PASSWORD}"
        "LIFEOS_REDIS_PASSWORD=${LIFEOS_REDIS_PASSWORD}"
        "LIFEOS_POSTGRES_PORT=5433"
        "LIFEOS_NEO4J_HTTP_PORT=7475"
        "LIFEOS_NEO4J_BOLT_PORT=7688"
        "LIFEOS_REDIS_PORT=6380"
    )
    
    for env_var in "${env_vars[@]}"; do
        local key=$(echo "$env_var" | cut -d= -f1)
        if ! grep -q "^${key}=" "$ENV_FILE"; then
            echo "$env_var" >> "$ENV_FILE"
            print_message $GREEN "Added $key to .env file"
        else
            print_message $YELLOW "$key already exists in .env file"
        fi
    done
    
    print_message $GREEN "✓ Environment variables configured"
}

# Function to setup PostgreSQL configuration
setup_postgres_config() {
    print_message $BLUE "Setting up PostgreSQL configuration files..."
    
    local config_dir="${PROJECT_ROOT}/docker/postgres"
    
    # Ensure configuration files exist
    if [[ ! -f "${config_dir}/postgresql-lifeos.conf" ]]; then
        print_message $RED "Error: PostgreSQL configuration file not found"
        exit 1
    fi
    
    if [[ ! -f "${config_dir}/lifeos-init.sql" ]]; then
        print_message $RED "Error: PostgreSQL initialization script not found"
        exit 1
    fi
    
    if [[ ! -f "${config_dir}/lifeos-seed-data.sql" ]]; then
        print_message $RED "Error: PostgreSQL seed data script not found"
        exit 1
    fi
    
    # Create pgpass file for admin operations
    local pgpass_file="${config_dir}/pgpass"
    if [[ ! -f "$pgpass_file" ]]; then
        cat > "$pgpass_file" << EOF
lifeos-postgres:5432:lifeos_database:lifeos_user:${LIFEOS_POSTGRES_PASSWORD}
lifeos-postgres:5432:*:postgres:${LIFEOS_POSTGRES_PASSWORD}
EOF
        chmod 600 "$pgpass_file"
        print_message $GREEN "Created pgpass file for PostgreSQL admin operations"
    fi
    
    print_message $GREEN "✓ PostgreSQL configuration ready"
}

# Function to setup Neo4j configuration
setup_neo4j_config() {
    print_message $BLUE "Setting up Neo4j configuration and data..."
    
    local config_dir="${PROJECT_ROOT}/docker/neo4j"
    local import_dir="${LIFEOS_DATA_ROOT}/lifeos/neo4j/import"
    
    # Ensure Neo4j configuration exists
    if [[ ! -f "${config_dir}/neo4j-lifeos.conf" ]]; then
        print_message $RED "Error: Neo4j configuration file not found"
        exit 1
    fi
    
    # Copy configuration to data directory
    cp "${config_dir}/neo4j-lifeos.conf" "${LIFEOS_DATA_ROOT}/lifeos/neo4j/conf/"
    print_message $GREEN "Copied Neo4j configuration to data directory"
    
    # Copy initialization scripts to import directory
    if [[ -f "${PROJECT_ROOT}/infrastructure/neo4j/setup.cypher" ]]; then
        cp "${PROJECT_ROOT}/infrastructure/neo4j/setup.cypher" "$import_dir/"
        print_message $GREEN "Copied Neo4j setup script to import directory"
    fi
    
    if [[ -f "${PROJECT_ROOT}/infrastructure/neo4j/query-library.cypher" ]]; then
        cp "${PROJECT_ROOT}/infrastructure/neo4j/query-library.cypher" "$import_dir/"
        print_message $GREEN "Copied Neo4j query library to import directory"
    fi
    
    print_message $GREEN "✓ Neo4j configuration ready"
}

# Function to setup Redis configuration
setup_redis_config() {
    print_message $BLUE "Setting up Redis configuration..."
    
    local config_dir="${PROJECT_ROOT}/docker/redis"
    
    if [[ ! -f "${config_dir}/redis-lifeos.conf" ]]; then
        print_message $RED "Error: Redis configuration file not found"
        exit 1
    fi
    
    print_message $GREEN "✓ Redis configuration ready"
}

# Function to start services
start_services() {
    print_message $BLUE "Starting Life OS database services..."
    
    # Change to project root for Docker Compose
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    print_message $BLUE "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Start services in background
    print_message $BLUE "Starting database containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    print_message $GREEN "✓ Life OS database services started"
}

# Function to wait for services to be ready
wait_for_services() {
    print_message $BLUE "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    # Wait for PostgreSQL
    print_message $BLUE "Waiting for PostgreSQL..."
    while ! docker exec lifeos-postgres pg_isready -U lifeos_user -d lifeos_database >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            print_message $RED "PostgreSQL failed to start within timeout"
            exit 1
        fi
        sleep 2
    done
    print_message $GREEN "✓ PostgreSQL is ready"
    
    # Wait for Neo4j
    print_message $BLUE "Waiting for Neo4j..."
    attempt=0
    while ! docker exec lifeos-neo4j cypher-shell -u neo4j -p "$LIFEOS_NEO4J_PASSWORD" 'RETURN 1 AS health' >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            print_message $RED "Neo4j failed to start within timeout"
            exit 1
        fi
        sleep 3
    done
    print_message $GREEN "✓ Neo4j is ready"
    
    # Wait for Redis
    print_message $BLUE "Waiting for Redis..."
    attempt=0
    while ! docker exec lifeos-redis redis-cli -a "$LIFEOS_REDIS_PASSWORD" ping >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            print_message $RED "Redis failed to start within timeout"
            exit 1
        fi
        sleep 2
    done
    print_message $GREEN "✓ Redis is ready"
    
    print_message $GREEN "✓ All services are ready"
}

# Function to initialize databases
initialize_databases() {
    print_message $BLUE "Initializing Life OS databases with Beautiful Obsolescence data..."
    
    # Initialize Neo4j with Life OS graph schema
    if [[ -f "${LIFEOS_DATA_ROOT}/lifeos/neo4j/import/setup.cypher" ]]; then
        print_message $BLUE "Loading Neo4j Life OS schema..."
        docker exec -i lifeos-neo4j cypher-shell -u neo4j -p "$LIFEOS_NEO4J_PASSWORD" < "${LIFEOS_DATA_ROOT}/lifeos/neo4j/import/setup.cypher"
        print_message $GREEN "✓ Neo4j schema loaded"
    fi
    
    # Test database connections
    print_message $BLUE "Testing database connections..."
    
    # Test PostgreSQL
    if docker exec lifeos-postgres psql -U lifeos_user -d lifeos_database -c "SELECT 'PostgreSQL connection successful!' as status;" >/dev/null 2>&1; then
        print_message $GREEN "✓ PostgreSQL connection test passed"
    else
        print_message $RED "✗ PostgreSQL connection test failed"
        exit 1
    fi
    
    # Test Neo4j
    if docker exec lifeos-neo4j cypher-shell -u neo4j -p "$LIFEOS_NEO4J_PASSWORD" 'RETURN "Neo4j connection successful!" as status' >/dev/null 2>&1; then
        print_message $GREEN "✓ Neo4j connection test passed"
    else
        print_message $RED "✗ Neo4j connection test failed"
        exit 1
    fi
    
    # Test Redis
    if docker exec lifeos-redis redis-cli -a "$LIFEOS_REDIS_PASSWORD" set lifeos:test:connection "Redis connection successful!" >/dev/null 2>&1; then
        print_message $GREEN "✓ Redis connection test passed"
        docker exec lifeos-redis redis-cli -a "$LIFEOS_REDIS_PASSWORD" del lifeos:test:connection >/dev/null 2>&1
    else
        print_message $RED "✗ Redis connection test failed"
        exit 1
    fi
    
    print_message $GREEN "✓ Database initialization completed"
}

# Function to display connection information
display_connection_info() {
    print_message $BLUE "Life OS Database Services Connection Information:"
    echo ""
    print_message $GREEN "PostgreSQL 16+ (Relational Data):"
    echo "  Host: localhost"
    echo "  Port: 5433"
    echo "  Database: lifeos_database"
    echo "  Username: lifeos_user"
    echo "  Password: [from environment]"
    echo "  Connection URL: postgresql://lifeos_user:${LIFEOS_POSTGRES_PASSWORD}@localhost:5433/lifeos_database"
    echo ""
    
    print_message $GREEN "Neo4j 5.x (Graph Relationships):"
    echo "  Browser: http://localhost:7475"
    echo "  Bolt: bolt://localhost:7688"
    echo "  Username: neo4j"
    echo "  Password: [from environment]"
    echo "  Database: lifeos"
    echo ""
    
    print_message $GREEN "Redis 7+ (Caching & Sessions):"
    echo "  Host: localhost"
    echo "  Port: 6380"
    echo "  Password: [from environment]"
    echo "  Connection: redis://localhost:6380"
    echo ""
    
    print_message $YELLOW "Beautiful Obsolescence Compliance:"
    echo "  ✓ Australian data residency (timezone: Australia/Sydney)"
    echo "  ✓ Community control enabled"
    echo "  ✓ Extractive system tracking active"
    echo "  ✓ Target timeline: 2027"
    echo ""
    
    print_message $BLUE "Data Directories:"
    echo "  Root: ${LIFEOS_DATA_ROOT}/lifeos/"
    echo "  PostgreSQL: ${LIFEOS_DATA_ROOT}/lifeos/postgres/"
    echo "  Neo4j: ${LIFEOS_DATA_ROOT}/lifeos/neo4j/"
    echo "  Redis: ${LIFEOS_DATA_ROOT}/lifeos/redis/"
    echo "  Backups: ${LIFEOS_DATA_ROOT}/lifeos/backups/"
}

# Function to create management aliases
create_aliases() {
    print_message $BLUE "Creating management aliases..."
    
    local aliases_file="${PROJECT_ROOT}/.lifeos_aliases"
    
    cat > "$aliases_file" << 'EOF'
#!/bin/bash
# Life OS Database Management Aliases

# Service management
alias lifeos-start='docker-compose -f docker-compose.lifeos.yml up -d'
alias lifeos-stop='docker-compose -f docker-compose.lifeos.yml down'
alias lifeos-restart='docker-compose -f docker-compose.lifeos.yml restart'
alias lifeos-logs='docker-compose -f docker-compose.lifeos.yml logs -f'
alias lifeos-status='docker-compose -f docker-compose.lifeos.yml ps'

# Database connections
alias lifeos-psql='docker exec -it lifeos-postgres psql -U lifeos_user -d lifeos_database'
alias lifeos-neo4j='docker exec -it lifeos-neo4j cypher-shell -u neo4j'
alias lifeos-redis='docker exec -it lifeos-redis redis-cli -a ${LIFEOS_REDIS_PASSWORD:-redis_secure_password_2024}'

# Backup and maintenance
alias lifeos-backup='docker exec lifeos-admin /usr/local/bin/lifeos-backup.sh'
alias lifeos-health='docker exec lifeos-admin /usr/local/bin/lifeos-health-check.sh'
alias lifeos-maintenance='docker exec lifeos-admin /usr/local/bin/lifeos-maintenance.sh'

# Beautiful Obsolescence monitoring
alias lifeos-compliance='docker exec -it lifeos-postgres psql -U lifeos_user -d lifeos_database -c "SELECT * FROM lifeos.beautiful_obsolescence_report();"'
alias lifeos-audit='docker exec -it lifeos-postgres psql -U lifeos_user -d lifeos_database -c "SELECT * FROM lifeos.community_data_sovereignty_audit();"'

echo "Life OS Database aliases loaded! Available commands:"
echo "  lifeos-start, lifeos-stop, lifeos-restart, lifeos-logs, lifeos-status"
echo "  lifeos-psql, lifeos-neo4j, lifeos-redis"
echo "  lifeos-backup, lifeos-health, lifeos-maintenance"
echo "  lifeos-compliance, lifeos-audit"
EOF
    
    print_message $GREEN "✓ Management aliases created at $aliases_file"
    print_message $YELLOW "To load aliases, run: source $aliases_file"
}

# Main function
main() {
    print_message $BLUE "========================================"
    print_message $BLUE "Life OS Database Setup Script"
    print_message $BLUE "Beautiful Obsolescence by 2027"
    print_message $BLUE "========================================"
    echo ""
    
    check_prerequisites
    create_data_directories
    setup_environment
    setup_postgres_config
    setup_neo4j_config
    setup_redis_config
    start_services
    wait_for_services
    initialize_databases
    create_aliases
    
    echo ""
    print_message $GREEN "========================================"
    print_message $GREEN "Life OS Database Setup Complete! 🎉"
    print_message $GREEN "========================================"
    echo ""
    
    display_connection_info
    
    print_message $YELLOW "Next steps:"
    echo "1. Load management aliases: source ${PROJECT_ROOT}/.lifeos_aliases"
    echo "2. Test connections using the provided URLs"
    echo "3. Run Prisma migrations: npx prisma migrate deploy"
    echo "4. Start your Life OS applications!"
    echo ""
    
    print_message $GREEN "For Beautiful Obsolescence by 2027! 🌟"
}

# Run main function
main "$@"