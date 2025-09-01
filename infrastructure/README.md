# 🏗️ ACT Placemat Infrastructure

## Directory Structure

### ⚙️ `/config`
Configuration files for various services
- `ecosystem.config.js` - PM2 ecosystem configuration

### 🐳 Docker Compose Files
- `docker-compose.dev.yml` - Development environment setup
- `docker-compose.farmhand.yml` - Farmhand application setup

### 📜 `/scripts`
Infrastructure automation scripts
- Various deployment and maintenance scripts

## Configuration Files

### ecosystem.config.js
PM2 process manager configuration for running multiple services:
- Defines all applications and their settings
- Environment variables
- Clustering configuration
- Log management

## Usage

### Starting Services with PM2
```bash
pm2 start infrastructure/config/ecosystem.config.js
```

### Viewing Service Status
```bash
pm2 status
```

### Monitoring Services
```bash
pm2 monit
```

### Viewing Logs
```bash
pm2 logs
```

## Docker Usage

### Development Environment
```bash
# Start development environment
docker-compose -f infrastructure/docker-compose.dev.yml up

# Start in background
docker-compose -f infrastructure/docker-compose.dev.yml up -d

# Stop development environment
docker-compose -f infrastructure/docker-compose.dev.yml down
```

### Farmhand Application
```bash
# Start Farmhand
docker-compose -f infrastructure/docker-compose.farmhand.yml up

# View logs
docker-compose -f infrastructure/docker-compose.farmhand.yml logs -f

# Stop Farmhand
docker-compose -f infrastructure/docker-compose.farmhand.yml down
```

---

*Infrastructure configuration is kept separate from application code for better maintainability.*
