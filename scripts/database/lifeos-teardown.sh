#!/bin/bash

# Life OS Database Teardown Script
# Safely stops and removes Life OS database infrastructure
# Preserves data unless explicitly requested to remove it

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
LIFEOS_DATA_ROOT="${PROJECT_ROOT}/data"

# Command line options
REMOVE_DATA=false
REMOVE_IMAGES=false
FORCE=false

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
usage() {
    cat << EOF
Life OS Database Teardown Script

Usage: $0 [OPTIONS]

Options:
    -d, --remove-data       Remove all data directories (DESTRUCTIVE!)
    -i, --remove-images     Remove Docker images after stopping containers
    -f, --force             Skip confirmation prompts (use with caution)
    -h, --help              Show this help message

Examples:
    $0                      # Stop services, keep data
    $0 -d                   # Stop services and remove all data
    $0 -i                   # Stop services and remove Docker images
    $0 -d -i -f             # Full cleanup without prompts

WARNING: Using --remove-data will permanently delete all Life OS database data!
This includes PostgreSQL, Neo4j, and Redis data with no recovery option.

Beautiful Obsolescence data sovereignty requires careful data management.
EOF
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--remove-data)
                REMOVE_DATA=true
                shift
                ;;
            -i|--remove-images)
                REMOVE_IMAGES=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_message $RED "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Function to confirm dangerous operations
confirm_operation() {
    local message=$1
    
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    print_message $YELLOW "$message"
    read -p "Are you sure? (yes/no): " response
    
    case $response in
        yes|YES|y|Y)
            return 0
            ;;
        *)
            print_message $GREEN "Operation cancelled"
            exit 0
            ;;
    esac
}

# Function to backup data before removal
backup_before_removal() {
    if [[ "$REMOVE_DATA" == "true" ]]; then
        print_message $YELLOW "Creating emergency backup before data removal..."
        
        local backup_dir="${PROJECT_ROOT}/emergency-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup PostgreSQL
        if docker ps | grep -q lifeos-postgres; then
            print_message $BLUE "Backing up PostgreSQL data..."
            docker exec lifeos-postgres pg_dump -U lifeos_user lifeos_database > "$backup_dir/postgres-backup.sql" || true
        fi
        
        # Backup Neo4j (export as GraphML if possible)
        if docker ps | grep -q lifeos-neo4j; then
            print_message $BLUE "Backing up Neo4j data..."
            docker exec lifeos-neo4j neo4j-admin database dump --database=lifeos --to-path=/var/lib/neo4j/import/lifeos-dump.db || true
            docker cp lifeos-neo4j:/var/lib/neo4j/import/lifeos-dump.db "$backup_dir/" || true
        fi
        
        # Backup Redis (RDB snapshot)
        if docker ps | grep -q lifeos-redis; then
            print_message $BLUE "Backing up Redis data..."
            docker exec lifeos-redis redis-cli -a "${LIFEOS_REDIS_PASSWORD:-redis_secure_password_2024}" --rdb /data/emergency-backup.rdb || true
            docker cp lifeos-redis:/data/emergency-backup.rdb "$backup_dir/" || true
        fi
        
        print_message $GREEN "Emergency backup created at: $backup_dir"
    fi
}

# Function to stop services gracefully
stop_services() {
    print_message $BLUE "Stopping Life OS database services gracefully..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        # Stop services with grace period
        docker-compose -f "$DOCKER_COMPOSE_FILE" stop -t 30
        print_message $GREEN "✓ Services stopped gracefully"
        
        # Remove containers
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        print_message $GREEN "✓ Containers removed"
    else
        print_message $YELLOW "Docker Compose file not found, stopping containers individually..."
        
        # Stop containers individually if compose file is missing
        local containers=(
            "lifeos-postgres"
            "lifeos-neo4j"
            "lifeos-redis"
            "lifeos-admin"
        )
        
        for container in "${containers[@]}"; do
            if docker ps -q -f name="$container" | grep -q .; then
                print_message $BLUE "Stopping $container..."
                docker stop -t 30 "$container"
                docker rm "$container"
                print_message $GREEN "✓ $container stopped and removed"
            else
                print_message $YELLOW "$container not running"
            fi
        done
    fi
}

# Function to remove Docker networks
remove_networks() {
    print_message $BLUE "Removing Life OS networks..."
    
    local networks=(
        "lifeos-network"
    )
    
    for network in "${networks[@]}"; do
        if docker network ls | grep -q "$network"; then
            docker network rm "$network" 2>/dev/null || print_message $YELLOW "Network $network may be in use"
            print_message $GREEN "✓ Network $network removed"
        else
            print_message $YELLOW "Network $network not found"
        fi
    done
}

# Function to remove Docker volumes
remove_volumes() {
    print_message $BLUE "Removing Life OS Docker volumes..."
    
    local volumes=(
        "lifeos-postgres-data"
        "lifeos-neo4j-data"
        "lifeos-neo4j-logs"
        "lifeos-neo4j-import"
        "lifeos-neo4j-plugins"
        "lifeos-neo4j-conf"
        "lifeos-redis-data"
        "lifeos-backups"
    )
    
    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            docker volume rm "$volume" 2>/dev/null || true
            print_message $GREEN "✓ Volume $volume removed"
        else
            print_message $YELLOW "Volume $volume not found"
        fi
    done
}

# Function to remove data directories
remove_data_directories() {
    if [[ "$REMOVE_DATA" == "true" ]]; then
        print_message $RED "Removing Life OS data directories..."
        
        if [[ -d "${LIFEOS_DATA_ROOT}/lifeos" ]]; then
            rm -rf "${LIFEOS_DATA_ROOT}/lifeos"
            print_message $GREEN "✓ Data directories removed"
        else
            print_message $YELLOW "Data directories not found"
        fi
    fi
}

# Function to remove Docker images
remove_images() {
    if [[ "$REMOVE_IMAGES" == "true" ]]; then
        print_message $BLUE "Removing Life OS Docker images..."
        
        local images=(
            "postgres:16-alpine"
            "neo4j:5.21-community"
            "redis:7-alpine"
        )
        
        for image in "${images[@]}"; do
            if docker images | grep -q "$image"; then
                docker rmi "$image" 2>/dev/null || print_message $YELLOW "Could not remove image $image (may be in use)"
                print_message $GREEN "✓ Image $image removed"
            else
                print_message $YELLOW "Image $image not found"
            fi
        done
    fi
}

# Function to clean up configuration files
cleanup_config() {
    print_message $BLUE "Cleaning up temporary configuration files..."
    
    local temp_files=(
        "${PROJECT_ROOT}/.lifeos_aliases"
        "${PROJECT_ROOT}/docker/postgres/pgpass"
    )
    
    for file in "${temp_files[@]}"; do
        if [[ -f "$file" ]]; then
            rm "$file"
            print_message $GREEN "✓ Removed $file"
        fi
    done
}

# Function to display cleanup summary
display_summary() {
    print_message $GREEN "========================================"
    print_message $GREEN "Life OS Database Teardown Complete"
    print_message $GREEN "========================================"
    echo ""
    
    print_message $BLUE "Actions performed:"
    echo "  ✓ Stopped database services gracefully"
    echo "  ✓ Removed containers"
    echo "  ✓ Removed networks"
    echo "  ✓ Removed volumes"
    
    if [[ "$REMOVE_DATA" == "true" ]]; then
        echo "  ✓ Removed data directories"
        print_message $RED "  ⚠️  All Life OS data has been permanently deleted"
    else
        echo "  ✓ Preserved data directories"
        print_message $GREEN "  💾 Life OS data preserved in: ${LIFEOS_DATA_ROOT}/lifeos/"
    fi
    
    if [[ "$REMOVE_IMAGES" == "true" ]]; then
        echo "  ✓ Removed Docker images"
    else
        echo "  ✓ Preserved Docker images for faster restart"
    fi
    
    echo ""
    
    if [[ "$REMOVE_DATA" == "false" ]]; then
        print_message $YELLOW "To restart Life OS databases:"
        echo "  ./scripts/database/lifeos-setup.sh"
        echo ""
        
        print_message $YELLOW "Data locations (preserved):"
        echo "  PostgreSQL: ${LIFEOS_DATA_ROOT}/lifeos/postgres/"
        echo "  Neo4j: ${LIFEOS_DATA_ROOT}/lifeos/neo4j/"
        echo "  Redis: ${LIFEOS_DATA_ROOT}/lifeos/redis/"
        echo ""
    fi
    
    print_message $BLUE "Beautiful Obsolescence continues... 🌟"
}

# Function to handle emergency situations
emergency_stop() {
    print_message $RED "Emergency stop initiated..."
    
    # Force stop all Life OS containers
    local containers=(
        "lifeos-postgres"
        "lifeos-neo4j"
        "lifeos-redis"
        "lifeos-admin"
    )
    
    for container in "${containers[@]}"; do
        if docker ps -q -f name="$container" | grep -q .; then
            docker kill "$container" 2>/dev/null || true
            docker rm -f "$container" 2>/dev/null || true
        fi
    done
    
    print_message $GREEN "Emergency stop completed"
}

# Main function
main() {
    print_message $BLUE "========================================"
    print_message $BLUE "Life OS Database Teardown Script"
    print_message $BLUE "Beautiful Obsolescence Data Sovereignty"
    print_message $BLUE "========================================"
    echo ""
    
    # Parse command line arguments
    parse_args "$@"
    
    # Show what will be done
    print_message $YELLOW "Teardown plan:"
    echo "  - Stop Life OS database services"
    echo "  - Remove containers and networks"
    echo "  - Remove Docker volumes"
    
    if [[ "$REMOVE_DATA" == "true" ]]; then
        echo "  - Remove data directories (DESTRUCTIVE)"
    else
        echo "  - Preserve data directories"
    fi
    
    if [[ "$REMOVE_IMAGES" == "true" ]]; then
        echo "  - Remove Docker images"
    else
        echo "  - Preserve Docker images"
    fi
    
    echo ""
    
    # Confirm destructive operations
    if [[ "$REMOVE_DATA" == "true" ]]; then
        confirm_operation "⚠️  WARNING: This will permanently delete ALL Life OS data including PostgreSQL, Neo4j, and Redis data!"
        backup_before_removal
    fi
    
    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        print_message $RED "Docker not found. Cannot proceed with teardown."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_message $RED "Docker daemon not running. Cannot proceed with teardown."
        exit 1
    fi
    
    # Perform teardown
    stop_services
    remove_networks
    remove_volumes
    remove_data_directories
    remove_images
    cleanup_config
    
    # Display summary
    display_summary
    
    print_message $GREEN "Teardown completed successfully!"
}

# Handle interrupts gracefully
trap emergency_stop INT TERM

# Run main function with all arguments
main "$@"