#!/bin/bash

# ACT Placemat Intelligence Hub - Network Setup Script
# Australian-compliant networking configuration for multi-agent system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="act-placemat"
NETWORK_BASE="172.20"
LOG_DIR="/opt/act-placemat/logs"
DATA_DIR="/opt/act-placemat/data"
CONFIG_DIR="/opt/act-placemat/config"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Consider running as a regular user with sudo for security."
    fi
}

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "curl" "jq")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install missing dependencies before continuing."
        exit 1
    fi
    
    print_success "All dependencies found"
}

# Function to create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    local dirs=(
        "$LOG_DIR"
        "$LOG_DIR/nginx"
        "$LOG_DIR/fluentd"
        "$LOG_DIR/intelligence-hub"
        "$DATA_DIR"
        "$DATA_DIR/postgres"
        "$DATA_DIR/redis"
        "$CONFIG_DIR"
        "/opt/act-placemat/monitoring/prometheus"
        "/opt/act-placemat/monitoring/grafana"
        "/opt/act-placemat/security"
        "/opt/act-placemat/backup"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            sudo mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    # Set permissions for Australian compliance
    sudo chown -R $(whoami):docker /opt/act-placemat 2>/dev/null || \
    sudo chown -R $(whoami):$(whoami) /opt/act-placemat
    sudo chmod -R 755 /opt/act-placemat
    
    print_success "Directory structure created"
}

# Function to configure Docker networks
configure_docker_networks() {
    print_status "Configuring Docker networks..."
    
    # Remove existing networks if they exist
    local networks=("${PROJECT_NAME}-web" "${PROJECT_NAME}-intelligence" "${PROJECT_NAME}-database" "${PROJECT_NAME}-monitoring")
    
    for network in "${networks[@]}"; do
        if docker network ls | grep -q "$network"; then
            print_status "Removing existing network: $network"
            docker network rm "$network" 2>/dev/null || true
        fi
    done
    
    # Create networks with Australian compliance labels
    docker network create \
        --driver bridge \
        --subnet="${NETWORK_BASE}.1.0/24" \
        --gateway="${NETWORK_BASE}.1.1" \
        --label="purpose=public-web" \
        --label="security-zone=dmz" \
        --label="data-residency=australia" \
        "${PROJECT_NAME}-web" || print_warning "Web network already exists"
    
    docker network create \
        --driver bridge \
        --subnet="${NETWORK_BASE}.2.0/24" \
        --gateway="${NETWORK_BASE}.2.1" \
        --label="purpose=agent-communication" \
        --label="security-zone=internal" \
        --label="data-residency=australia" \
        "${PROJECT_NAME}-intelligence" || print_warning "Intelligence network already exists"
    
    docker network create \
        --driver bridge \
        --subnet="${NETWORK_BASE}.3.0/24" \
        --gateway="${NETWORK_BASE}.3.1" \
        --internal=true \
        --label="purpose=database-access" \
        --label="security-zone=data" \
        --label="data-residency=australia" \
        "${PROJECT_NAME}-database" || print_warning "Database network already exists"
    
    docker network create \
        --driver bridge \
        --subnet="${NETWORK_BASE}.4.0/24" \
        --gateway="${NETWORK_BASE}.4.1" \
        --label="purpose=monitoring" \
        --label="security-zone=admin" \
        --label="data-residency=australia" \
        "${PROJECT_NAME}-monitoring" || print_warning "Monitoring network already exists"
    
    print_success "Docker networks configured"
}

# Function to configure firewall rules
configure_firewall() {
    print_status "Configuring firewall rules..."
    
    # Check if UFW is available
    if command -v ufw &> /dev/null; then
        print_status "Configuring UFW firewall..."
        
        # Allow SSH (adjust port as needed)
        sudo ufw allow 22/tcp comment "SSH access"
        
        # Allow HTTP/HTTPS
        sudo ufw allow 80/tcp comment "HTTP - NGINX"
        sudo ufw allow 443/tcp comment "HTTPS - NGINX"
        
        # Allow monitoring (restricted to local network)
        sudo ufw allow from 172.20.0.0/16 to any port 9090 comment "Prometheus"
        sudo ufw allow from 172.20.0.0/16 to any port 3000 comment "Grafana"
        
        # Allow application port (restricted)
        sudo ufw allow from 172.20.0.0/16 to any port 3002 comment "Intelligence Hub"
        
        # Block direct database access from outside
        sudo ufw deny 5432/tcp comment "Block external PostgreSQL"
        sudo ufw deny 6379/tcp comment "Block external Redis"
        
        # Enable UFW if not already enabled
        sudo ufw --force enable
        
        print_success "UFW firewall configured"
    else
        print_warning "UFW not found. Please configure firewall manually."
    fi
}

# Function to create environment file
create_environment_file() {
    print_status "Creating environment configuration..."
    
    local env_file=".env"
    
    if [[ ! -f "$env_file" ]]; then
        cat > "$env_file" << EOF
# ACT Placemat Intelligence Hub Environment Configuration
# Australian Data Residency and Compliance Settings

# Database Configuration
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
POSTGRES_PROMETHEUS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Redis Configuration
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Application Secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Monitoring Configuration
GRAFANA_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Domain Configuration
DOMAIN=localhost

# AI API Keys (add your actual keys)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Australian Compliance
TZ=Australia/Sydney
LOCALE=en-AU
CURRENCY=AUD
DATA_RESIDENCY=Australia
COMPLIANCE_FRAMEWORK=Australian-Privacy-Act

# Network Configuration
NETWORK_BASE=${NETWORK_BASE}
PROJECT_NAME=${PROJECT_NAME}

# Logging Configuration
LOG_LEVEL=info
LOG_RETENTION_DAYS=2555  # 7 years for Australian compliance

# Security Configuration
SECURITY_HEADERS_ENABLED=true
RATE_LIMITING_ENABLED=true
FAIL2BAN_ENABLED=true
EOF
        
        chmod 600 "$env_file"
        print_success "Environment file created at $env_file"
        print_warning "Please update API keys in $env_file before starting services"
    else
        print_status "Environment file already exists"
    fi
}

# Function to configure monitoring
configure_monitoring() {
    print_status "Configuring monitoring..."
    
    # Create Prometheus configuration directory
    mkdir -p docker/prometheus/rules
    
    # Create basic alerting rules
    cat > docker/prometheus/rules/intelligence-hub.yml << EOF
groups:
  - name: intelligence-hub
    rules:
      - alert: IntelligenceHubDown
        expr: up{job="intelligence-hub"} == 0
        for: 1m
        labels:
          severity: critical
          service: intelligence-hub
          data_residency: australia
        annotations:
          summary: "Intelligence Hub is down"
          description: "Intelligence Hub has been down for more than 1 minute"
          
      - alert: HighTaskQueueSize
        expr: redis_key_size{key="task_queue"} > 100
        for: 5m
        labels:
          severity: warning
          service: task-queue
          data_residency: australia
        annotations:
          summary: "High task queue size"
          description: "Task queue has more than 100 pending tasks"
          
      - alert: DatabaseConnectionFailure
        expr: up{job="postgresql"} == 0
        for: 30s
        labels:
          severity: critical
          service: database
          data_residency: australia
        annotations:
          summary: "Database connection failure"
          description: "PostgreSQL database is not responding"
EOF
    
    print_success "Monitoring configuration created"
}

# Function to validate network configuration
validate_network() {
    print_status "Validating network configuration..."
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if networks were created
    local networks=("${PROJECT_NAME}-web" "${PROJECT_NAME}-intelligence" "${PROJECT_NAME}-database" "${PROJECT_NAME}-monitoring")
    local missing_networks=()
    
    for network in "${networks[@]}"; do
        if ! docker network ls | grep -q "$network"; then
            missing_networks+=("$network")
        fi
    done
    
    if [[ ${#missing_networks[@]} -gt 0 ]]; then
        print_error "Missing networks: ${missing_networks[*]}"
        return 1
    fi
    
    # Test network connectivity
    print_status "Testing network connectivity..."
    
    # Create a temporary container to test networks
    for network in "${networks[@]}"; do
        if docker run --rm --network="$network" alpine:latest ping -c 1 google.com &> /dev/null; then
            print_success "Network $network: External connectivity OK"
        else
            if [[ "$network" == *"database"* ]]; then
                print_success "Network $network: Internal-only (expected)"
            else
                print_warning "Network $network: External connectivity failed"
            fi
        fi
    done
    
    print_success "Network validation completed"
}

# Function to create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start-intelligence-hub.sh << 'EOF'
#!/bin/bash

# ACT Placemat Intelligence Hub Startup Script
# Australian-compliant multi-agent system deployment

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check environment file
if [[ ! -f ".env" ]]; then
    echo "Error: .env file not found. Please run setup-networking.sh first."
    exit 1
fi

# Load environment variables
source .env

print_status "Starting ACT Placemat Intelligence Hub..."
print_status "Data Residency: $DATA_RESIDENCY"
print_status "Compliance Framework: $COMPLIANCE_FRAMEWORK"

# Pre-flight checks
print_status "Running pre-flight checks..."

# Check API keys
if [[ "$OPENAI_API_KEY" == "your_openai_api_key_here" ]] && [[ "$ANTHROPIC_API_KEY" == "your_anthropic_api_key_here" ]]; then
    print_warning "Please update API keys in .env file before starting"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start services
print_status "Starting services with Docker Compose..."
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
services=("act-intelligence-hub" "act-nginx" "act-postgres" "act-redis" "act-prometheus" "act-grafana")
for service in "${services[@]}"; do
    if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
        print_success "Service $service: Running"
    else
        print_warning "Service $service: Not running or unhealthy"
    fi
done

# Display access information
print_success "ACT Placemat Intelligence Hub is starting up!"
echo
echo "🇦🇺 Australian-Compliant Multi-Agent System"
echo
echo "Access URLs:"
echo "  Intelligence Hub: http://localhost:3002/dashboard"
echo "  API Endpoint:     http://localhost:3002/api"
echo "  Monitoring:       http://localhost:9090 (Prometheus)"
echo "  Dashboards:       http://localhost:3000 (Grafana)"
echo
echo "Default Credentials:"
echo "  Grafana: admin / $GRAFANA_PASSWORD"
echo
echo "Data Residency: $DATA_RESIDENCY"
echo "Compliance: $COMPLIANCE_FRAMEWORK"
echo "Timezone: $TZ"
echo
echo "🛡️ Security Features Enabled:"
echo "  - Network Segmentation"
echo "  - Fail2ban Protection"
echo "  - Australian Privacy Act Compliance"
echo "  - Community-First Governance"
echo
print_status "Services are starting up. Please wait 1-2 minutes for full initialization."
EOF

    chmod +x start-intelligence-hub.sh
    print_success "Startup script created: start-intelligence-hub.sh"
}

# Function to create shutdown script
create_shutdown_script() {
    print_status "Creating shutdown script..."
    
    cat > stop-intelligence-hub.sh << 'EOF'
#!/bin/bash

# ACT Placemat Intelligence Hub Shutdown Script

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "Stopping ACT Placemat Intelligence Hub..."

# Graceful shutdown
docker-compose down --remove-orphans

print_status "Cleaning up containers..."
docker container prune -f

print_status "Cleaning up networks..."
docker network prune -f

print_success "ACT Placemat Intelligence Hub stopped successfully"
print_status "Data is preserved in /opt/act-placemat/"
EOF

    chmod +x stop-intelligence-hub.sh
    print_success "Shutdown script created: stop-intelligence-hub.sh"
}

# Main execution
main() {
    echo "🇦🇺 ACT Placemat Intelligence Hub - Network Setup"
    echo "=================================================="
    echo
    
    check_root
    check_dependencies
    create_directories
    configure_docker_networks
    configure_firewall
    create_environment_file
    configure_monitoring
    validate_network
    create_startup_script
    create_shutdown_script
    
    echo
    print_success "Network setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Update API keys in .env file"
    echo "2. Run: ./start-intelligence-hub.sh"
    echo "3. Access dashboard: http://localhost:3002/dashboard"
    echo
    echo "🇦🇺 Australian-compliant multi-agent system ready for deployment!"
}

# Run main function
main "$@"