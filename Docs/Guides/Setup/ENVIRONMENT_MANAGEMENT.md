# Environment and Secrets Management

ACT Placemat uses a comprehensive environment management system with multiple layers of security and convenience.

## 🌏 Overview

Our environment management system provides:

- **dotenv-flow**: Advanced environment file loading with hierarchy
- **direnv**: Directory-based automatic environment loading  
- **age encryption**: Secure secrets management with SOPS-like functionality
- **Australian localisation**: Built-in support for Australian English and standards

## 📁 Environment File Structure

```
project/
├── .env                    # Base configuration (committed)
├── .env.local             # Local overrides (NEVER commit)
├── .env.development       # Development settings (committed)
├── .env.development.local # Local dev overrides (NEVER commit)
├── .env.production        # Production settings (committed)
├── .env.production.local  # Local prod overrides (NEVER commit)
├── .env.template          # Template for team setup (committed)
├── .env.example           # Public example (committed)
└── .envrc                 # direnv configuration (committed)
```

### Loading Priority (highest to lowest)

1. `.env.${NODE_ENV}.local` (e.g., `.env.development.local`)
2. `.env.local` 
3. `.env.${NODE_ENV}` (e.g., `.env.development`)
4. `.env`

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Run the setup script
./scripts/setup-secrets.sh

# Or manually:
npm install dotenv-flow
```

### 2. Configure Your Environment

```bash
# Copy template to local environment
cp .env.template .env.local

# Edit with your actual values
editor .env.local
```

### 3. Enable direnv (Optional but Recommended)

```bash
# Install direnv
brew install direnv  # macOS
apt install direnv   # Ubuntu

# Add to your shell
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc  # Bash
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc    # Zsh

# Allow the project
direnv allow
```

## 🔐 Secrets Management

### Encryption with age

We use age encryption for secure secrets management:

```bash
# Generate key pair (one-time setup)
node scripts/secrets-manager.js generate-key

# Encrypt sensitive files
node scripts/secrets-manager.js encrypt .env.local

# Decrypt when needed
node scripts/secrets-manager.js decrypt .env.local.enc

# List encrypted files
node scripts/secrets-manager.js list
```

### Key Management

```bash
# Your keys are stored in:
.secrets/age.key    # Private key (NEVER commit)
.secrets/age.pub    # Public key (share with team)

# Share public key with team members
cat .secrets/age.pub
```

## 📝 Environment Variables

### Application Settings

```bash
# Basic Configuration
NODE_ENV=development|production|test
APP_NAME="ACT Placemat"
APP_VERSION=2.0.0

# Server Ports
FRONTEND_PORT=5173
BACKEND_PORT=4000
API_PORT=3000

# URLs (auto-configured by direnv)
VITE_API_URL=http://localhost:4000
VITE_FRONTEND_URL=http://localhost:5173
```

### Database Configuration

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/act_placemat

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Sensitive!
```

### External APIs

```bash
# AI Services
ANTHROPIC_API_KEY=sk-ant-...      # Sensitive!
OPENAI_API_KEY=sk-...             # Sensitive!
PERPLEXITY_API_KEY=pplx-...       # Sensitive!

# Notion Integration  
NOTION_TOKEN=secret_...           # Sensitive!
NOTION_DATABASE_ID=abc123...

# Gmail Integration
GMAIL_CLIENT_ID=123...apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...    # Sensitive!
```

### Security

```bash
# JWT Configuration
JWT_SECRET=your-32-char-secret    # Sensitive!
JWT_REFRESH_SECRET=another-secret # Sensitive!
ENCRYPTION_KEY=encryption-key     # Sensitive!

# Session Security
SESSION_SECRET=session-secret     # Sensitive!
```

### Australian Localisation

```bash
# Location Settings
TIMEZONE=Australia/Sydney
LOCALE=en-AU  
CURRENCY=AUD
TZ=Australia/Sydney
```

### Feature Flags

```bash
# Enable/Disable Features
ENABLE_ANALYTICS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_REAL_TIME_UPDATES=true
```

## 🛠️ Development Workflow

### Using dotenv-flow

```javascript
// In your application code
import { config } from './env.config.js';

// Access configuration
const { server, database, apis } = config;
console.log(`Server running on port ${server.backend.port}`);
```

### Using direnv

When you `cd` into the project directory, direnv automatically:

- Loads environment variables
- Sets up helpful aliases
- Configures PATH with local tools
- Shows available commands

```bash
# Available aliases (auto-loaded by direnv)
dev          # npm run dev
build        # npm run build  
test         # npm run test
lint         # npm run lint
format       # npm run format
typecheck    # npm run type-check

# Nx shortcuts
nxdev        # nx run-many --target=serve --parallel
nxbuild      # nx run-many --target=build --parallel
nxtest       # nx run-many --target=test --parallel

# Task Master shortcuts
tm           # task-master
tmnext       # task-master next
tmlist       # task-master list

# Server management
start-ecosystem  # ./start-ecosystem-bulletproof.sh
stop-ecosystem   # ./stop-ecosystem.sh
```

### Environment Validation

The system automatically validates required variables:

```bash
# Check environment on startup
npm run dev  # Will show missing variables

# Manual validation
node -e "import('./env.config.js')"
```

## 🔒 Security Best Practices

### What to Commit

✅ **Safe to commit:**
- `.env` (base configuration)
- `.env.development` (non-sensitive dev settings)
- `.env.production` (non-sensitive prod settings)
- `.env.template` (template for setup)
- `.env.example` (public example)
- `.envrc` (direnv configuration)
- `*.enc` files (encrypted secrets)
- `.secrets/age.pub` (public keys)

❌ **NEVER commit:**
- `.env.local` (local overrides)
- `.env.*.local` (environment-specific local files)
- `.secrets/age.key` (private keys)
- Any file containing actual API keys, passwords, or secrets

### Sharing Secrets with Team

```bash
# 1. Team member generates their key pair
node scripts/secrets-manager.js generate-key

# 2. They share their public key with you
cat .secrets/age.pub

# 3. You add their public key to .sops.yaml
# 4. Re-encrypt secrets with multiple keys
age -r $(cat .secrets/age.pub) -r $(cat teammate-age.pub) .env.local
```

### Production Deployment

```bash
# 1. Never use .env.local in production
# 2. Use proper secrets management (AWS Secrets Manager, etc.)
# 3. Set environment variables via deployment platform
# 4. Use encrypted .env.production.enc for version control
```

## 🐛 Troubleshooting

### Common Issues

#### Environment Variables Not Loading

```bash
# Check dotenv-flow configuration
node -e "import('./env.config.js').then(c => console.log(c.getEnvironmentConfig()))"

# Verify file exists and is readable
ls -la .env*
```

#### direnv Not Working

```bash
# Check direnv installation
direnv --version

# Check shell integration
echo $DIRENV_DIR

# Re-allow directory
direnv allow
```

#### Encryption/Decryption Fails

```bash
# Check age installation
age --version

# Verify key files exist
ls -la .secrets/

# Check file permissions
chmod 600 .secrets/age.key
chmod 644 .secrets/age.pub
```

#### Missing Required Variables

The system will show warnings for missing variables:

```bash
🚨 Environment Configuration Errors:
  - Missing required environment variable: SUPABASE_URL
⚠️  Environment Configuration Warnings:  
  - Missing recommended environment variable: ANTHROPIC_API_KEY
```

### Getting Help

1. **Check the validation output** when starting the application
2. **Run the setup script** again: `./scripts/setup-secrets.sh`
3. **Verify your environment files** follow the naming convention
4. **Check file permissions** on sensitive files
5. **Review the .gitignore** to ensure sensitive files aren't committed

## 📚 Advanced Usage

### Custom Environment Loading

```javascript
// Custom environment configuration
import dotenvFlow from 'dotenv-flow';

dotenvFlow.config({
  path: './custom/path',
  pattern: '.env[.node_env][.local]',
  node_env: 'staging',
});
```

### Multiple Environment Support

```bash
# Development with staging API
NODE_ENV=development API_ENV=staging npm run dev

# Testing with production database
NODE_ENV=test DATABASE_ENV=production npm test
```

### Dynamic Configuration

```javascript
// Environment-specific configuration
export const getConfig = () => {
  const env = process.env.NODE_ENV;
  
  return {
    ...baseConfig,
    ...envOverrides[env],
    // Dynamic overrides based on feature flags
    features: {
      analytics: env === 'production' && process.env.ENABLE_ANALYTICS === 'true',
    },
  };
};
```

---

This environment management system ensures secure, convenient, and Australian-compliant configuration management for ACT Placemat. 🇦🇺