# 🔒 ACT Placemat - Bulletproof Development Tools

**Never fuck around with missing .env files again!**

This directory contains bulletproof development tools, environment management, and scripts that ensure ACT Placemat is always ready for development.

## 🚀 Bulletproof Environment Management

### Super Fast Commands
```bash
# Fix any environment issues instantly
../../env-quick.sh fix

# Check environment health  
../../env-quick.sh check

# Create backup right now
../../env-quick.sh backup

# Emergency restore from latest backup
../../env-quick.sh restore
```

## 📁 Directory Structure

### Core Environment Tools
- **env-manager.js** - 🔒 Bulletproof environment management system
- **env-backup.sh** - 💾 Secure backup and recovery system
- **check_notion_relations.py** - 🔗 Notion database relationship checker

### Development Scripts  
- **setup-development.sh** - Development environment setup
- **setup-automations.sh** - Automation setup script
- **test-apps.sh** - Application testing script
- **final-test.sh** - Final testing procedures
- **start-internal.sh** - Internal server startup
- **start-public.sh** - Public server startup
- **start-first-task.sh** - Task management starter
- **track-subtask-progress.sh** - Progress tracking

### Development Logs
- **logs/development.log** - General development logging
- **logs/frontend.log** - Frontend development logs
- **logs/server.log** - Server operation logs
- **logs/frontend-restart.log** - Frontend restart logs

## 🚀 Quick Start Scripts

### Development Environment
```bash
# Setup development environment
./Development/Scripts/setup-development.sh

# Start development servers
./Development/Scripts/start-internal.sh  # Internal development
./Development/Scripts/start-public.sh   # Public development
```

### Testing
```bash
# Run application tests
./Development/Scripts/test-apps.sh

# Final testing before deployment
./Development/Scripts/final-test.sh
```

## 🔧 Development Tools

### Database Tools
- Use **check_notion_relations.py** to validate Notion database relationships
- Check logs in **Logs/** for debugging information

### Script Usage
All scripts should be run from the project root directory:
```bash
./Development/Scripts/script-name.sh
```

## 📋 Maintenance

### Adding New Development Artifacts
1. **Scripts** → Place in `Scripts/` directory
2. **Tools** → Place in `Tools/` directory  
3. **Logs** → Automatically generated in `Logs/` directory
4. **Update this README** with new additions

### Log Management
- Logs are automatically generated during development
- Review logs for debugging and monitoring
- Consider periodic cleanup of old log files

---

*Development artifacts organized during Phase 4 consolidation - August 2025*