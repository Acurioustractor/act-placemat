#!/bin/sh

# ACT Platform - Production Entrypoint Script
# Handles initialization, health checks, and graceful startup

set -e

echo "🚀 Starting ACT Platform production container..."

# Validate required environment variables
required_vars="DATABASE_URL REDIS_URL JWT_SECRET ENCRYPTION_KEY"
missing_vars=""

for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        missing_vars="$missing_vars $var"
    fi
done

if [ -n "$missing_vars" ]; then
    echo "❌ Missing required environment variables:$missing_vars"
    echo "Please set these variables before starting the container"
    exit 1
fi

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT 1')
            .then(() => { console.log('Database connected'); process.exit(0); })
            .catch(() => process.exit(1));
    " 2>/dev/null; then
        echo "✅ Database connection established"
        break
    fi
    
    counter=$((counter + 1))
    echo "Waiting for database... ($counter/$timeout)"
    sleep 1
done

if [ $counter -eq $timeout ]; then
    echo "❌ Failed to connect to database after $timeout seconds"
    exit 1
fi

# Wait for Redis to be ready (if configured)
if [ -n "$REDIS_URL" ]; then
    echo "⏳ Waiting for Redis connection..."
    timeout=30
    counter=0

    while [ $counter -lt $timeout ]; do
        if node -e "
            const redis = require('redis');
            const client = redis.createClient({ url: process.env.REDIS_URL });
            client.connect()
                .then(() => client.ping())
                .then(() => { console.log('Redis connected'); process.exit(0); })
                .catch(() => process.exit(1))
                .finally(() => client.quit());
        " 2>/dev/null; then
            echo "✅ Redis connection established"
            break
        fi
        
        counter=$((counter + 1))
        echo "Waiting for Redis... ($counter/$timeout)"
        sleep 1
    done

    if [ $counter -eq $timeout ]; then
        echo "⚠️  Redis connection failed, continuing without cache"
    fi
fi

# Run database migrations
echo "🔄 Running database migrations..."
if [ -f "./apps/backend/scripts/migrate.js" ]; then
    node ./apps/backend/scripts/migrate.js || {
        echo "❌ Database migration failed"
        exit 1
    }
    echo "✅ Database migrations completed"
else
    echo "⚠️  No migration script found, skipping migrations"
fi

# Initialize compliance system
echo "🔐 Initializing compliance systems..."
if [ -f "./apps/backend/scripts/privacy-compliance-audit.js" ]; then
    # Run initial compliance check
    node ./apps/backend/scripts/privacy-compliance-audit.js --quick-check || {
        echo "⚠️  Initial compliance check failed, but continuing startup"
    }
fi

# Set up log rotation and monitoring
echo "📊 Setting up monitoring and logging..."

# Create log directory structure
mkdir -p ./data/logs/application
mkdir -p ./data/logs/access
mkdir -p ./data/logs/error
mkdir -p ./data/logs/audit

# Configure log cleanup (keep last 30 days)
cleanup_logs() {
    find ./data/logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
}

# Run log cleanup in background
cleanup_logs &

# Set up signal handlers for graceful shutdown
shutdown_handler() {
    echo "🛑 Received shutdown signal, gracefully stopping..."
    
    # Stop background processes
    jobs -p | xargs -r kill
    
    # Close database connections
    echo "📡 Closing database connections..."
    
    # Give processes time to clean up
    sleep 5
    
    echo "✅ Graceful shutdown completed"
    exit 0
}

# Trap signals
trap shutdown_handler TERM INT

# Validate application integrity
echo "🔍 Validating application integrity..."
if [ ! -f "./apps/backend/dist/server.js" ] && [ ! -f "./apps/backend/src/server.js" ]; then
    echo "❌ Application server not found"
    exit 1
fi

# Check if we need to serve frontend assets
if [ -d "./apps/frontend/dist" ]; then
    echo "🌐 Frontend assets available for serving"
    export SERVE_FRONTEND=true
else
    echo "⚠️  No frontend assets found, API-only mode"
    export SERVE_FRONTEND=false
fi

# Set up performance monitoring
if [ "$ENABLE_METRICS" = "true" ]; then
    echo "📈 Enabling performance metrics collection"
    export METRICS_ENABLED=true
fi

# Configure security headers
export SECURITY_HEADERS_ENABLED=true

# Start health check service in background
if [ -f "./healthcheck.js" ]; then
    node ./healthcheck.js --daemon &
    echo "❤️  Health check service started"
fi

# Print startup summary
echo ""
echo "🎯 ACT Platform Configuration:"
echo "   Environment: $NODE_ENV"
echo "   Port: $PORT"
echo "   Metrics Port: ${METRICS_PORT:-disabled}"
echo "   Frontend Serving: ${SERVE_FRONTEND:-false}"
echo "   Security Headers: ${SECURITY_HEADERS_ENABLED:-false}"
echo "   Metrics Collection: ${METRICS_ENABLED:-false}"
echo ""

# Start the main application
echo "🌟 Starting ACT Platform server..."

if [ -f "./apps/backend/dist/server.js" ]; then
    # Production build available
    exec node ./apps/backend/dist/server.js
else
    # Fallback to source files
    exec node ./apps/backend/src/server.js
fi