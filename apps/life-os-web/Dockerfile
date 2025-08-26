# Life OS Web Application - Next.js 14+ with Beautiful Obsolescence
# Multi-stage build for optimal container size and security

# =====================================
# Dependencies Stage
# =====================================
FROM node:20-alpine AS deps
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared packages
COPY packages/types packages/types/
COPY packages/utils packages/utils/
COPY packages/shared packages/shared/

# Copy Life OS specific configuration
COPY apps/life-os-web/tsconfig.json ./apps/life-os-web/

# Install dependencies (skip husky hooks in Docker)
RUN npm ci --legacy-peer-deps --ignore-scripts && npm cache clean --force

# =====================================
# Builder Stage
# =====================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY apps/life-os-web ./apps/life-os-web
COPY package*.json ./
COPY tsconfig.base.json ./

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build shared packages first
WORKDIR /app
RUN cd packages/types && npm run build || npx tsc
RUN cd packages/utils && npm run build || npx tsc
RUN cd packages/shared && npm run build || npx tsc

# Build Life OS application
WORKDIR /app/apps/life-os-web
# Use Docker-specific config and build with Next.js
RUN cp next.config.docker.mjs next.config.mjs
RUN npx next build

# =====================================
# Production Stage
# =====================================
FROM node:20-alpine AS runner
WORKDIR /app

# Australian timezone and locale
ENV TZ=Australia/Sydney
ENV LOCALE=en-AU
ENV CURRENCY=AUD
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Install runtime dependencies only
RUN apk add --no-cache \
    tini \
    tzdata \
    curl \
    && cp /usr/share/zoneinfo/Australia/Sydney /etc/localtime \
    && echo "Australia/Sydney" > /etc/timezone

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/life-os-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/life-os-web/.next/static ./apps/life-os-web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/life-os-web/public ./apps/life-os-web/public

# Copy shared package builds if they exist
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Security: Set proper permissions
RUN chown -R nextjs:nodejs /app \
    && chmod -R 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/hello || exit 1

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Life OS Beautiful Obsolescence Metadata
LABEL org.opencontainers.image.title="ACT Life OS Web" \
      org.opencontainers.image.description="Beautiful Obsolescence - Life Operating System Web Interface" \
      org.opencontainers.image.vendor="A Curious Tractor" \
      org.opencontainers.image.version="1.0.0" \
      data-residency="Australia" \
      compliance-framework="Australian Privacy Act 1988" \
      beautiful-obsolescence="true" \
      target-year="2027" \
      community-control="enabled" \
      extractive-obsolescence="true"

# Start application with tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/life-os-web/server.js"]