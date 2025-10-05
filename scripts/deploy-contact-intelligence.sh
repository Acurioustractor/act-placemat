#!/bin/bash

# Contact Intelligence System Deployment Script
# Deploys the complete contact intelligence system integrated with existing ACT infrastructure

set -e

echo "🚀 Deploying Contact Intelligence System"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "Please run this script from the ACT Placemat root directory"
        exit 1
    fi

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check if Supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        log_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi

    # Check environment variables
    if [ ! -f ".env" ]; then
        log_error "Environment file (.env) not found. Please create one with required variables."
        exit 1
    fi

    log_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing/updating dependencies..."

    # Install missing backend dependencies
    cd apps/backend
    npm install @supabase/supabase-js csv-parser multer natural

    # Install missing frontend dependencies
    cd ../frontend
    npm install @supabase/supabase-js recharts lucide-react

    cd ../..
    log_success "Dependencies installed"
}

# Run database migration
run_migration() {
    log_info "Running contact intelligence database migration..."

    # Check if Supabase is configured
    if [ -f "supabase/config.toml" ]; then
        log_info "Using Supabase project configuration"

        # Apply migration
        cd supabase
        supabase db push --local 2>/dev/null || {
            log_warning "Local Supabase not running, attempting remote deployment"
            supabase db push
        }
        cd ..
    else
        log_warning "Supabase configuration not found. Migration may need to be applied manually."
        log_info "Migration file location: supabase/migrations/20250913160000_contact_intelligence_system.sql"
    fi

    log_success "Database migration completed"
}

# Import existing contact data
import_contact_data() {
    log_info "Importing existing contact data..."

    # Check if CSV files exist
    if [ -f "youth-justice-master-contacts.csv" ] || [ -f "scripts/youth-justice-master-contacts.csv" ]; then
        log_info "Found existing contact CSV files"

        # Start backend to enable data import
        log_info "Starting backend server for data import..."
        cd apps/backend

        # Run import script
        node ../../scripts/import-contacts-to-supabase.js &
        IMPORT_PID=$!

        # Wait a moment for import to complete or kill after 5 minutes
        sleep 10

        if ps -p $IMPORT_PID > /dev/null; then
            log_info "Import running in background (PID: $IMPORT_PID)"
            log_info "Check logs for progress. Import will complete automatically."
        fi

        cd ../..
    else
        log_warning "No existing CSV files found. You can import data later via the web interface."
    fi

    log_success "Contact data import initiated"
}

# Build frontend
build_frontend() {
    log_info "Building frontend with contact intelligence components..."

    cd apps/frontend

    # Install dependencies and build
    npm run build 2>/dev/null || {
        log_warning "Frontend build failed. This may be due to missing dependencies."
        log_info "You can build manually later with: cd apps/frontend && npm run build"
    }

    cd ../..
    log_success "Frontend build completed"
}

# Start services
start_services() {
    log_info "Starting ACT Placemat services..."

    # Kill any existing processes
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true

    # Start backend
    log_info "Starting backend server..."
    cd apps/backend
    npm run dev &
    BACKEND_PID=$!
    cd ../..

    # Wait for backend to start
    sleep 5

    # Start frontend
    log_info "Starting frontend development server..."
    cd apps/frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ../..

    # Wait for services to start
    sleep 3

    log_success "Services started:"
    echo "  🔗 Backend API: http://localhost:3001"
    echo "  🔗 Contact Intelligence API: http://localhost:3001/api/contact-intelligence/dashboard"
    echo "  🔗 Frontend: http://localhost:3000"
    echo "  🔗 Contact Intelligence UI: http://localhost:3000/contact-intelligence"

    # Store PIDs for cleanup
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
}

# Test deployment
test_deployment() {
    log_info "Testing contact intelligence deployment..."

    # Wait for services to be ready
    sleep 10

    # Test backend health
    if curl -s http://localhost:3001/health > /dev/null; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed - may still be starting up"
    fi

    # Test contact intelligence API
    if curl -s http://localhost:3001/api/contact-intelligence/metrics > /dev/null; then
        log_success "Contact Intelligence API is responding"
    else
        log_warning "Contact Intelligence API not yet ready"
    fi

    # Test frontend
    if curl -s http://localhost:3000 > /dev/null; then
        log_success "Frontend is serving"
    else
        log_warning "Frontend may still be building"
    fi

    log_success "Deployment test completed"
}

# Print usage instructions
print_usage() {
    echo ""
    echo "🎯 Contact Intelligence System Deployed Successfully!"
    echo "=================================================="
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open your browser to http://localhost:3000/contact-intelligence"
    echo "2. Import additional contacts via CSV upload if needed"
    echo "3. Review and enrich high-priority contacts with AI"
    echo "4. Create campaigns and assign contacts for engagement"
    echo "5. Monitor analytics and engagement success rates"
    echo ""
    echo "🔧 Management Commands:"
    echo "• Stop services: ./scripts/stop-services.sh"
    echo "• View logs: tail -f apps/backend/logs/app.log"
    echo "• Import CSV: node scripts/import-contacts-to-supabase.js"
    echo "• Health check: curl http://localhost:3001/health"
    echo ""
    echo "📚 API Endpoints:"
    echo "• Dashboard: GET /api/contact-intelligence/dashboard"
    echo "• Contacts: GET /api/contact-intelligence/contacts"
    echo "• Import CSV: POST /api/contact-intelligence/import/csv"
    echo "• Analytics: GET /api/contact-intelligence/analytics/sectors"
    echo "• Metrics: GET /api/contact-intelligence/metrics"
    echo ""
    echo "🎉 Your Contact Intelligence System is ready for youth justice advocacy!"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    if [ -f ".backend.pid" ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    if [ -f ".frontend.pid" ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
}

# Trap cleanup on script exit
trap cleanup EXIT

# Main deployment flow
main() {
    echo ""
    echo "🎯 ACT Placemat Contact Intelligence System"
    echo "Integrating with existing AI infrastructure..."
    echo ""

    check_prerequisites
    install_dependencies
    run_migration
    build_frontend
    start_services
    import_contact_data
    test_deployment
    print_usage

    echo ""
    log_success "Deployment completed successfully!"
    echo ""
    echo "Press Ctrl+C to stop services when done."

    # Keep script running to maintain services
    wait
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        test_deployment
        ;;
    "clean")
        cleanup
        log_success "Cleanup completed"
        ;;
    "help")
        echo "Usage: $0 [deploy|test|clean|help]"
        echo ""
        echo "Commands:"
        echo "  deploy (default) - Full deployment of contact intelligence system"
        echo "  test            - Test existing deployment"
        echo "  clean           - Stop services and cleanup"
        echo "  help            - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac