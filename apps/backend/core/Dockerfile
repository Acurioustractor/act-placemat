# Life Orchestrator Backend Dockerfile
# Multi-stage build for production deployment

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY apps/backend ./apps/backend

# Build application (if there are build steps)
WORKDIR /app/apps/backend
RUN npm run build 2>/dev/null || echo "No build script found, skipping..."

# Production stage
FROM node:18-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S lifeorchestrator -u 1001

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/apps/backend ./apps/backend

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/uploads && \
    chown -R lifeorchestrator:nodejs /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node apps/backend/health-check.js || exit 1

# Switch to non-root user
USER lifeorchestrator

# Expose port
EXPOSE 8080

# Start application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "apps/backend/server.js"]