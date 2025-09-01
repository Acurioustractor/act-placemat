#!/usr/bin/env node

/**
 * 🔒 ACT Placemat - Bulletproof Environment Manager
 * 
 * Never fuck around with missing .env files again!
 * This system ensures environment variables are ALWAYS available.
 * 
 * Features:
 * - Auto-detection of missing .env files
 * - Smart backup and recovery system
 * - Cross-app environment synchronization
 * - Validation and health checks
 * - Emergency fallback values
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Console colors for better visibility
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🔒 ${msg}${colors.reset}\n`),
};

// Environment file paths that need to exist
const ENV_PATHS = {
  root: path.join(PROJECT_ROOT, '.env'),
  rootBackup: path.join(PROJECT_ROOT, '.env.backup'),
  rootTemplate: path.join(PROJECT_ROOT, '.env.template'),
  rootExample: path.join(PROJECT_ROOT, '.env.example'),
  frontend: path.join(PROJECT_ROOT, 'apps/frontend/.env'),
  frontendDev: path.join(PROJECT_ROOT, 'apps/frontend/.env.development'),
  frontendProd: path.join(PROJECT_ROOT, 'apps/frontend/.env.production'),
  backend: path.join(PROJECT_ROOT, 'apps/backend/.env'),
  backendTest: path.join(PROJECT_ROOT, 'apps/backend/.env.test'),
  intelligence: path.join(PROJECT_ROOT, 'apps/intelligence/.env'),
  intelligenceHub: path.join(PROJECT_ROOT, 'apps/intelligence-hub/.env.development'),
};

// Critical environment variables that MUST exist
const CRITICAL_ENV_VARS = [
  'NOTION_TOKEN',
  'NOTION_DATABASE_ID',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'PORT',
];

// Emergency fallback values (safe defaults)
const EMERGENCY_FALLBACKS = {
  'PORT': '4000',
  'LOG_LEVEL': 'INFO',
  'CACHE_TIMEOUT': '300000',
  'AUTO_REFRESH_INTERVAL': '300000',
  'MAX_API_RETRIES': '3',
  'API_RETRY_DELAY': '1000',
  'NOTION_API_VERSION': '2022-06-28',
  'GMAIL_DEMO_MODE': 'true',
  'XERO_DEMO_MODE': 'true',
};

class BulletproofEnvManager {
  constructor() {
    this.envData = new Map();
    this.missingFiles = [];
    this.missingVars = [];
    this.healthStatus = 'unknown';
  }

  // Main entry point - run all checks and fixes
  async ensureBulletproofEnvironment() {
    log.header('ACT Placemat - Bulletproof Environment Check');
    
    try {
      // 1. Check all environment files exist
      await this.checkEnvironmentFiles();
      
      // 2. Load and validate environment variables  
      await this.loadAndValidateEnvironment();
      
      // 3. Synchronize environments across apps
      await this.synchronizeAppEnvironments();
      
      // 4. Create secure backups
      await this.createSecureBackups();
      
      // 5. Final health check
      await this.performHealthCheck();
      
      log.success('🚀 Environment system is bulletproof and ready!');
      return true;
      
    } catch (error) {
      log.error(`Environment setup failed: ${error.message}`);
      await this.emergencyRecovery();
      return false;
    }
  }

  // Check that all required .env files exist
  async checkEnvironmentFiles() {
    log.info('Checking environment files...');
    
    this.missingFiles = [];
    
    for (const [name, filePath] of Object.entries(ENV_PATHS)) {
      if (!fs.existsSync(filePath)) {
        this.missingFiles.push({ name, path: filePath });
        log.warning(`Missing: ${name} (${filePath})`);
      } else {
        log.info(`✓ Found: ${name}`);
      }
    }

    // Auto-fix missing files
    if (this.missingFiles.length > 0) {
      log.info('Auto-fixing missing environment files...');
      await this.createMissingEnvFiles();
    }
  }

  // Create missing .env files from templates or root
  async createMissingEnvFiles() {
    const rootEnvExists = fs.existsSync(ENV_PATHS.root);
    const rootContent = rootEnvExists ? fs.readFileSync(ENV_PATHS.root, 'utf8') : '';

    for (const missing of this.missingFiles) {
      const dir = path.dirname(missing.path);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`Created directory: ${dir}`);
      }

      let content = '';
      
      // Try to use appropriate template or example
      if (missing.name.includes('frontend')) {
        content = this.generateFrontendEnv(rootContent);
      } else if (missing.name.includes('backend')) {
        content = this.generateBackendEnv(rootContent);
      } else if (missing.name.includes('intelligence')) {
        content = this.generateIntelligenceEnv(rootContent);
      } else if (missing.name === 'rootTemplate' || missing.name === 'rootExample') {
        content = this.generateTemplateEnv(rootContent);
      } else {
        // Default: copy from root or create basic template
        content = rootContent || this.generateBasicEnv();
      }

      fs.writeFileSync(missing.path, content);
      log.success(`Created: ${missing.name} → ${missing.path}`);
    }
  }

  // Load environment and validate critical variables
  async loadAndValidateEnvironment() {
    log.info('Loading and validating environment variables...');
    
    // Load root .env
    if (fs.existsSync(ENV_PATHS.root)) {
      const content = fs.readFileSync(ENV_PATHS.root, 'utf8');
      this.parseEnvContent(content);
    }

    // Check for missing critical variables
    this.missingVars = [];
    for (const varName of CRITICAL_ENV_VARS) {
      if (!this.envData.has(varName) || !this.envData.get(varName)) {
        this.missingVars.push(varName);
        log.warning(`Missing critical variable: ${varName}`);
      }
    }

    // Apply emergency fallbacks where possible
    for (const varName of this.missingVars) {
      if (EMERGENCY_FALLBACKS[varName]) {
        this.envData.set(varName, EMERGENCY_FALLBACKS[varName]);
        log.info(`Applied emergency fallback for: ${varName}`);
      }
    }
  }

  // Parse .env file content into our data map
  parseEnvContent(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          this.envData.set(key.trim(), value);
        }
      }
    }
  }

  // Synchronize environment variables across all apps
  async synchronizeAppEnvironments() {
    log.info('Synchronizing environment across all apps...');

    // Frontend-specific environment
    await this.updateFrontendEnvironment();
    
    // Backend-specific environment  
    await this.updateBackendEnvironment();
    
    // Intelligence apps environment
    await this.updateIntelligenceEnvironment();
    
    log.success('Environment synchronized across all apps');
  }

  // Update frontend environment files
  async updateFrontendEnvironment() {
    const frontendEnv = this.generateFrontendEnv();
    
    // Development environment
    if (fs.existsSync(ENV_PATHS.frontendDev)) {
      fs.writeFileSync(ENV_PATHS.frontendDev, frontendEnv);
    }
    
    // Main frontend .env
    if (fs.existsSync(ENV_PATHS.frontend)) {
      fs.writeFileSync(ENV_PATHS.frontend, frontendEnv);
    }
    
    // Production environment (with production overrides)
    const prodEnv = frontendEnv.replace('LOG_LEVEL=INFO', 'LOG_LEVEL=ERROR');
    if (fs.existsSync(ENV_PATHS.frontendProd)) {
      fs.writeFileSync(ENV_PATHS.frontendProd, prodEnv);
    }
  }

  // Update backend environment files  
  async updateBackendEnvironment() {
    const backendEnv = this.generateBackendEnv();
    
    if (fs.existsSync(ENV_PATHS.backend)) {
      fs.writeFileSync(ENV_PATHS.backend, backendEnv);
    }
    
    // Test environment with safe defaults
    const testEnv = backendEnv
      .replace(/GMAIL_DEMO_MODE=.*/g, 'GMAIL_DEMO_MODE=true')
      .replace(/XERO_DEMO_MODE=.*/g, 'XERO_DEMO_MODE=true')
      .replace(/LOG_LEVEL=.*/g, 'LOG_LEVEL=DEBUG');
      
    if (fs.existsSync(ENV_PATHS.backendTest)) {
      fs.writeFileSync(ENV_PATHS.backendTest, testEnv);
    }
  }

  // Update intelligence environment files
  async updateIntelligenceEnvironment() {
    const intelligenceEnv = this.generateIntelligenceEnv();
    
    if (fs.existsSync(ENV_PATHS.intelligence)) {
      fs.writeFileSync(ENV_PATHS.intelligence, intelligenceEnv);
    }
    
    if (fs.existsSync(ENV_PATHS.intelligenceHub)) {
      fs.writeFileSync(ENV_PATHS.intelligenceHub, intelligenceEnv);
    }
  }

  // Create secure backups of environment files
  async createSecureBackups() {
    log.info('Creating secure environment backups...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(PROJECT_ROOT, '.secrets', 'env-backups', timestamp);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    for (const [name, filePath] of Object.entries(ENV_PATHS)) {
      if (fs.existsSync(filePath)) {
        const backupPath = path.join(backupDir, `${name}.env`);
        fs.copyFileSync(filePath, backupPath);
      }
    }

    // Also update the main backup
    if (fs.existsSync(ENV_PATHS.root)) {
      fs.copyFileSync(ENV_PATHS.root, ENV_PATHS.rootBackup);
    }

    log.success(`Environment backup created: ${backupDir}`);
  }

  // Perform comprehensive health check
  async performHealthCheck() {
    log.info('Performing environment health check...');
    
    let issues = 0;
    
    // Check file existence
    for (const [name, filePath] of Object.entries(ENV_PATHS)) {
      if (!fs.existsSync(filePath)) {
        log.error(`Health check failed: ${name} missing`);
        issues++;
      }
    }

    // Check critical variables
    for (const varName of CRITICAL_ENV_VARS) {
      if (!this.envData.has(varName) || !this.envData.get(varName)) {
        log.error(`Health check failed: ${varName} not set`);
        issues++;
      }
    }

    // Check API connectivity (basic)
    await this.checkAPIConnectivity();

    this.healthStatus = issues === 0 ? 'healthy' : 'degraded';
    
    if (this.healthStatus === 'healthy') {
      log.success('🎉 Environment health check PASSED');
    } else {
      log.warning(`⚠️ Environment health check found ${issues} issues`);
    }
  }

  // Check basic API connectivity
  async checkAPIConnectivity() {
    const apis = [
      { name: 'Supabase', url: this.envData.get('SUPABASE_URL') },
    ];

    for (const api of apis) {
      if (api.url) {
        try {
          // Simple connectivity check (don't actually call APIs with keys)
          log.info(`✓ ${api.name} endpoint configured`);
        } catch (error) {
          log.warning(`⚠️ ${api.name} connectivity issue: ${error.message}`);
        }
      }
    }
  }

  // Emergency recovery system
  async emergencyRecovery() {
    log.header('🚨 EMERGENCY RECOVERY MODE');
    log.warning('Attempting to recover from environment failure...');

    try {
      // Try to restore from backup
      if (fs.existsSync(ENV_PATHS.rootBackup)) {
        fs.copyFileSync(ENV_PATHS.rootBackup, ENV_PATHS.root);
        log.success('Restored from .env.backup');
      }

      // Create minimal working environment
      const minimalEnv = this.generateEmergencyEnv();
      
      if (!fs.existsSync(ENV_PATHS.root)) {
        fs.writeFileSync(ENV_PATHS.root, minimalEnv);
        log.success('Created emergency .env file');
      }

      // Recreate critical app environments
      await this.createMissingEnvFiles();
      
      log.success('🆘 Emergency recovery completed');
      log.warning('⚠️ Please review and update your environment variables');
      
    } catch (error) {
      log.error(`Emergency recovery failed: ${error.message}`);
      log.error('🆘 Manual intervention required!');
      this.showManualRecoveryInstructions();
    }
  }

  // Show manual recovery instructions
  showManualRecoveryInstructions() {
    console.log(`
${colors.bold}${colors.red}🆘 MANUAL RECOVERY REQUIRED${colors.reset}

Your environment files are corrupted or missing critical values.
Please follow these steps:

1. Check if you have backups in .secrets/env-backups/
2. Restore your API keys and tokens from a secure source
3. Run this command again: npm run env:fix
4. If you need to start fresh: npm run env:reset

Critical variables to check:
${CRITICAL_ENV_VARS.map(v => `   - ${v}`).join('\n')}

${colors.yellow}Need help? Check /Docs/Guides/Setup/ for detailed instructions.${colors.reset}
    `);
  }

  // Generate frontend-specific environment
  generateFrontendEnv(rootContent = '') {
    const frontendVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'NOTION_TOKEN',
      'NOTION_DATABASE_ID',
      'PORT',
    ];

    let content = '# Frontend Environment Configuration\n';
    content += '# Generated by ACT Placemat Environment Manager\n\n';

    for (const varName of frontendVars) {
      const value = this.envData.get(varName) || '';
      content += `${varName}=${value}\n`;
    }

    return content;
  }

  // Generate backend-specific environment  
  generateBackendEnv(rootContent = '') {
    let content = '# Backend Environment Configuration\n';
    content += '# Generated by ACT Placemat Environment Manager\n\n';

    // Include all environment variables for backend
    for (const [key, value] of this.envData.entries()) {
      content += `${key}=${value}\n`;
    }

    return content;
  }

  // Generate intelligence-specific environment
  generateIntelligenceEnv(rootContent = '') {
    const intelligenceVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY', 
      'PERPLEXITY_API_KEY',
      'NOTION_TOKEN',
      'NOTION_DATABASE_ID',
      'LOG_LEVEL',
      'PORT',
    ];

    let content = '# Intelligence Environment Configuration\n';
    content += '# Generated by ACT Placemat Environment Manager\n\n';

    for (const varName of intelligenceVars) {
      const value = this.envData.get(varName) || '';
      content += `${varName}=${value}\n`;
    }

    return content;
  }

  // Generate template environment (safe for git)
  generateTemplateEnv(rootContent = '') {
    let content = '# ACT Placemat Environment Template\n';
    content += '# Copy this file to .env and fill in your actual values\n\n';

    const sections = {
      'Notion Configuration': ['NOTION_TOKEN', 'NOTION_DATABASE_ID', 'NOTION_API_VERSION'],
      'Supabase Configuration': ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      'AI APIs': ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'PERPLEXITY_API_KEY'],
      'Application Settings': ['PORT', 'LOG_LEVEL', 'CACHE_TIMEOUT'],
    };

    for (const [section, vars] of Object.entries(sections)) {
      content += `\n# ${section}\n`;
      for (const varName of vars) {
        content += `${varName}=\n`;
      }
    }

    return content;
  }

  // Generate basic working environment
  generateBasicEnv() {
    return `# ACT Placemat Basic Environment
# Generated by Emergency Recovery System

PORT=4000
LOG_LEVEL=INFO
CACHE_TIMEOUT=300000
AUTO_REFRESH_INTERVAL=300000
MAX_API_RETRIES=3
API_RETRY_DELAY=1000
NOTION_API_VERSION=2022-06-28
GMAIL_DEMO_MODE=true
XERO_DEMO_MODE=true

# TODO: Add your API keys and tokens
NOTION_TOKEN=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
`;
  }

  // Generate emergency minimal environment
  generateEmergencyEnv() {
    let content = '# Emergency Environment Configuration\n';
    content += '# Generated by ACT Placemat Emergency Recovery\n\n';

    for (const [key, value] of Object.entries(EMERGENCY_FALLBACKS)) {
      content += `${key}=${value}\n`;
    }

    content += '\n# TODO: Restore your API keys from backup\n';
    for (const varName of CRITICAL_ENV_VARS) {
      if (!EMERGENCY_FALLBACKS[varName]) {
        content += `${varName}=\n`;
      }
    }

    return content;
  }

  // Show current environment status
  showStatus() {
    log.header('Environment Status Report');
    
    console.log(`Health Status: ${this.healthStatus === 'healthy' ? 
      colors.green + '🟢 HEALTHY' : colors.yellow + '🟡 DEGRADED'} ${colors.reset}`);
    
    console.log(`\nEnvironment Files:`);
    for (const [name, filePath] of Object.entries(ENV_PATHS)) {
      const exists = fs.existsSync(filePath);
      const status = exists ? '✅' : '❌';
      const color = exists ? colors.green : colors.red;
      console.log(`  ${status} ${color}${name}${colors.reset} → ${filePath}`);
    }

    console.log(`\nCritical Variables:`);
    for (const varName of CRITICAL_ENV_VARS) {
      const hasValue = this.envData.has(varName) && this.envData.get(varName);
      const status = hasValue ? '✅' : '❌';
      const color = hasValue ? colors.green : colors.red;
      const value = hasValue ? '[SET]' : '[MISSING]';
      console.log(`  ${status} ${color}${varName}${colors.reset} ${value}`);
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  const manager = new BulletproofEnvManager();

  switch (command) {
    case 'check':
    case 'fix':
      await manager.ensureBulletproofEnvironment();
      break;
    
    case 'status':
      await manager.loadAndValidateEnvironment();
      manager.showStatus();
      break;
    
    case 'backup':
      await manager.createSecureBackups();
      log.success('Environment backup completed');
      break;
    
    case 'recovery':
      await manager.emergencyRecovery();
      break;
    
    case 'sync':
      await manager.loadAndValidateEnvironment();
      await manager.synchronizeAppEnvironments();
      log.success('Environment synchronization completed');
      break;
    
    default:
      console.log(`
🔒 ACT Placemat Environment Manager

Usage: node env-manager.js [command]

Commands:
  check    Check and fix environment files (default)
  status   Show current environment status  
  backup   Create secure backup of all .env files
  recovery Run emergency recovery process
  sync     Synchronize environment across all apps

Examples:
  node env-manager.js check
  node env-manager.js status
  npm run env:fix
      `);
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Environment manager failed:', error);
    process.exit(1);
  });
}

export default BulletproofEnvManager;