# 🚀 ACT Placemat - Quick Start Guide

Get the ACT community platform running quickly with this comprehensive guide.

## TL;DR - Get Running in 60 Seconds

```bash
# 1. Auto-setup and start (recommended)
./dev.sh auto

# 2. Access your application  
open http://localhost:3000    # Docker mode
# OR
open http://localhost:5173    # Simple/PM2 mode

# 3. Stop everything
./stop.sh
```

## 🚀 What You're Getting

A fully integrated ecosystem where:
- **Farmhand Agents** provide strategic intelligence and values alignment  
- **Universal Bots** handle operational execution (invoicing, compliance, etc.)
- **Learning System** continuously improves both layers
- **Command Center** gives you unified control

## ⚡ Quick Test (5 minutes)

Test the integration without any setup:

```bash
# Run the integration demo
node test-ecosystem-integration.js
```

This shows you exactly how the systems work together with mock data.

## 🎯 Development Modes

### 🐳 Docker Mode (Recommended - Most Reliable)
```bash
./dev.sh docker
```
- **Single entry point**: http://localhost:3000
- **Isolated environment** with automatic port conflict resolution  
- **Health monitoring** and auto-restart
- **Production-like setup** with nginx reverse proxy

### 🔧 PM2 Mode (Production-like Process Management)
```bash
./dev.sh pm2
```
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000
- **Process clustering** and automatic restarts
- **Professional logging** and monitoring

### ⚡ Simple Mode (Fastest Startup)
```bash
./dev.sh simple
```
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000
- **Direct npm/node processes**
- **Fastest startup** for development

## 🔧 Environment Setup (15 minutes)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ACT-Placemat
cp .env.example .env
```

### 2. Add API Keys (at minimum, add one)
```bash
# Edit .env file with your API keys:
ANTHROPIC_API_KEY=your_key_here     # For Claude AI
OPENAI_API_KEY=your_key_here        # For GPT models  
PERPLEXITY_API_KEY=your_key_here    # For research features
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
# Recommended: Auto-detect best mode
./dev.sh auto

# Or choose specific mode
./dev.sh docker    # Most reliable
./dev.sh pm2       # Production-like
./dev.sh simple    # Fastest
```

## 🌐 Application URLs

After starting, access these URLs:

- **Main Dashboard**: http://localhost:3000 (Docker) or http://localhost:5173 (Simple/PM2)
- **API Backend**: http://localhost:4000  
- **Health Check**: http://localhost:3000/health

## 🛠️ Common Commands

```bash
# Start development
./dev.sh auto

# Stop all services  
./stop.sh

# Check status
./dev.sh status

# View logs
./dev.sh logs

# Restart services
./dev.sh restart

# Run tests
npm test

# Build for production
npm run build
```

## 🔍 Verification Steps

1. **Frontend Loading**: Navigate to main URL and verify dashboard loads
2. **API Connection**: Check that backend API responds at `/health` endpoint
3. **AI Integration**: Test that AI features work (requires API keys)
4. **Database**: Verify data persistence and retrieval

## 🚨 Troubleshooting

### Port Conflicts
```bash
# Auto-resolve port conflicts
./dev.sh auto

# Or manually specify ports
PORT=3001 ./dev.sh simple
```

### API Key Issues
```bash
# Verify API keys are set
grep -E "(ANTHROPIC|OPENAI|PERPLEXITY)" .env

# Test API connection
node test-api-keys.js
```

### Build Failures
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear caches
npm run clean
```

## 📚 Next Steps

- **Documentation**: See `/Docs/` for detailed guides
- **Configuration**: Review `/config/` for advanced settings  
- **Development**: Check `/Docs/Guides/Development/` for development workflows
- **Deployment**: See `/Docs/Deployment/` for production deployment

## 🆘 Getting Help

- **Issues**: Report bugs via GitHub issues
- **Documentation**: Full docs in `/Docs/` directory
- **Community**: Join our community discussions
- **Support**: Contact support for enterprise assistance

---

*This guide consolidates multiple quick start approaches for optimal developer experience.*