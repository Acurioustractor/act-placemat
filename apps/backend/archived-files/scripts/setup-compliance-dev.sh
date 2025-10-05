#!/bin/bash

# ACT Platform - Compliance System Development Setup
# Sets up the development environment for testing encryption and compliance features

set -e  # Exit on any error

echo "🔒 ACT Platform - Compliance System Development Setup"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Please run this script from the backend directory (apps/backend)"
    exit 1
fi

print_status "Setting up compliance and encryption development environment..."

# 1. Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# 2. Install dependencies if needed
print_status "Installing/updating dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Install additional dev dependencies for testing
print_status "Installing testing dependencies..."
npm install --save-dev \
    jest \
    supertest \
    chalk \
    @jest/globals

print_success "Dependencies installed"

# 3. Create .env.development file for compliance testing
print_status "Setting up development environment variables..."

ENV_FILE=".env.development"

if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << EOF
# ACT Platform - Development Environment for Compliance Testing
NODE_ENV=development

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Encryption Keys (Development - Replace with secure keys in production)
ENCRYPTION_KEY_users_data=$(openssl rand -base64 32)
ENCRYPTION_KEY_stories_data=$(openssl rand -base64 32)
ENCRYPTION_KEY_projects_data=$(openssl rand -base64 32)
ENCRYPTION_KEY_organisations_data=$(openssl rand -base64 32)
MASTER_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
VALID_API_KEYS=dev-api-key-$(openssl rand -hex 16)

# TLS/HTTPS Configuration (Development)
TLS_KEY_PATH=./certs/dev-key.pem
TLS_CERT_PATH=./certs/dev-cert.pem

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Neo4j Configuration (Optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password

# Port Configuration
PORT=4000
HTTPS_PORT=4443
EOF
    print_success "Created $ENV_FILE with development configuration"
else
    print_warning "$ENV_FILE already exists - skipping creation"
fi

# 4. Create development certificates
print_status "Setting up development TLS certificates..."

CERTS_DIR="certs"
mkdir -p "$CERTS_DIR"

if [ ! -f "$CERTS_DIR/dev-key.pem" ] || [ ! -f "$CERTS_DIR/dev-cert.pem" ]; then
    print_status "Generating self-signed development certificates..."
    
    # Create OpenSSL config for the certificate
    cat > "$CERTS_DIR/dev-cert.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN=localhost
C=AU
ST=NSW
L=Sydney
O=ACT Platform Development
OU=Development

[v3_req]
basicConstraints = CA:FALSE
keyUsage = keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    # Generate private key
    openssl genrsa -out "$CERTS_DIR/dev-key.pem" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "$CERTS_DIR/dev-key.pem" \
        -out "$CERTS_DIR/dev-cert.pem" \
        -days 365 \
        -config "$CERTS_DIR/dev-cert.conf" \
        -extensions v3_req

    # Set proper permissions
    chmod 600 "$CERTS_DIR/dev-key.pem"
    chmod 644 "$CERTS_DIR/dev-cert.pem"
    
    print_success "Development certificates generated"
    print_warning "Certificate valid for 1 year"
    print_warning "Browsers will show security warnings for self-signed certificates"
else
    print_warning "Development certificates already exist - skipping generation"
fi

# 5. Create test database schema if Supabase is configured
print_status "Database setup..."
print_warning "Please ensure your Supabase database is running and configured"
print_warning "Run the following SQL files in your database:"
echo "  - database/migrations/audit-compliance-schema.sql"

# 6. Create package.json scripts for compliance testing
print_status "Adding npm scripts for compliance testing..."

# Create temporary file with updated package.json
node -e "
const pkg = require('./package.json');
pkg.scripts = pkg.scripts || {};
pkg.scripts['test:compliance'] = 'jest tests/compliance/ --testTimeout=30000';
pkg.scripts['test:compliance:watch'] = 'jest tests/compliance/ --watch --testTimeout=30000';
pkg.scripts['compliance:test-runner'] = 'node scripts/test-compliance-system.js';
pkg.scripts['compliance:health-check'] = 'node -e \"import(\\'./src/startup/complianceStartup.js\\').then(m => m.default.healthCheck().then(console.log))\"';
pkg.scripts['dev:secure'] = 'NODE_ENV=development node -r dotenv/config src/server.js dotenv_config_path=.env.development';
pkg.scripts['dev:compliance'] = 'NODE_ENV=development node -r dotenv/config scripts/test-compliance-system.js dotenv_config_path=.env.development';
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

print_success "Added npm scripts for compliance testing"

# 7. Create Jest configuration for compliance tests
print_status "Setting up Jest configuration for compliance tests..."

if [ ! -f "jest.config.js" ]; then
    cat > "jest.config.js" << 'EOF'
// Jest configuration for ACT Platform backend tests
export default {
  // Use ES modules
  preset: 'default',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Timeout for async tests
  testTimeout: 30000,
  
  // Transform configuration for ES modules
  transform: {},
  
  // Module resolution
  moduleFileExtensions: ['js', 'json'],
  
  // Verbose output
  verbose: true
};
EOF
    print_success "Created Jest configuration"
else
    print_warning "Jest configuration already exists - skipping creation"
fi

# 8. Create test setup file
print_status "Creating test setup file..."

mkdir -p "tests"

if [ ! -f "tests/setup.js" ]; then
    cat > "tests/setup.js" << 'EOF'
/**
 * Jest test setup for ACT Platform backend tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.TEST_VERBOSE === 'true' ? originalConsole.log : jest.fn(),
  warn: process.env.TEST_VERBOSE === 'true' ? originalConsole.warn : jest.fn(),
  error: originalConsole.error, // Always show errors
};

// Global test timeout
jest.setTimeout(30000);

// Cleanup function for tests
global.afterEach(() => {
  // Clean up any test data or mocks
  jest.clearAllMocks();
});
EOF
    print_success "Created test setup file"
else
    print_warning "Test setup file already exists - skipping creation"
fi

# 9. Create compliance testing README
print_status "Creating compliance testing documentation..."

if [ ! -f "COMPLIANCE_TESTING.md" ]; then
    cat > "COMPLIANCE_TESTING.md" << 'EOF'
# ACT Platform - Compliance System Testing Guide

This guide covers testing the encryption and compliance features of the ACT Platform backend.

## Quick Start

1. **Environment Setup**
   ```bash
   ./scripts/setup-compliance-dev.sh
   ```

2. **Start Interactive Test Runner**
   ```bash
   npm run compliance:test-runner
   ```

3. **Run Automated Tests**
   ```bash
   npm run test:compliance
   ```

## Available Commands

### Development
- `npm run dev:secure` - Start server with HTTPS and security features
- `npm run dev:compliance` - Start interactive compliance test runner

### Testing  
- `npm run test:compliance` - Run compliance test suite
- `npm run test:compliance:watch` - Run tests in watch mode
- `npm run compliance:health-check` - Check system health

### Manual Testing
- `node scripts/test-compliance-system.js` - Interactive test runner

## Test Features

### 1. Field-Level Encryption
- Tests AES-256-GCM encryption of sensitive fields
- Verifies encryption/decryption cycle accuracy
- Tests handling of complex nested data structures

### 2. Data Export/Deletion APIs
- Tests GDPR/CCPA compliant data export in multiple formats
- Validates proper authentication and authorization  
- Tests comprehensive data deletion across all systems

### 3. Audit Logging
- Verifies all privacy operations are logged
- Tests compliance event tracking
- Validates audit trail completeness

### 4. Compliance Monitoring
- Tests automated compliance checks
- Validates violation detection and reporting
- Tests scheduled compliance reporting

### 5. Cultural Safety
- Tests Indigenous data sovereignty features
- Validates community consent tracking
- Tests cultural safety scoring and protocols

## Environment Variables

Required environment variables for testing:

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Encryption (Auto-generated by setup script)
ENCRYPTION_KEY_users_data=base64-encoded-key
ENCRYPTION_KEY_stories_data=base64-encoded-key
# ... etc

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
TLS_KEY_PATH=./certs/dev-key.pem  
TLS_CERT_PATH=./certs/dev-cert.pem
```

## Database Setup

1. Run the database migration:
   ```sql
   -- In your Supabase SQL editor
   \i database/migrations/audit-compliance-schema.sql
   ```

2. Verify tables created:
   - audit_logs
   - compliance_events  
   - privacy_requests
   - cultural_safety_reviews
   - encryption_events

## Testing Workflow

### Manual Testing
1. Run `npm run compliance:test-runner`
2. Select test options from the interactive menu
3. Review test results and any generated audit logs

### Automated Testing  
1. Run `npm run test:compliance` for full test suite
2. Use `npm run test:compliance:watch` for development
3. Check coverage reports in `coverage/` directory

### CI/CD Testing
The compliance tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Compliance Tests
  run: |
    npm run test:compliance
  env:
    NODE_ENV: test
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Troubleshooting

### Common Issues

1. **Encryption Key Errors**
   - Ensure all ENCRYPTION_KEY_* variables are set
   - Keys must be base64-encoded and 32 bytes when decoded

2. **Database Connection Issues**  
   - Verify Supabase URL and service role key
   - Check that audit tables exist in database

3. **Certificate Issues**
   - Run `./scripts/setup-compliance-dev.sh` to regenerate certificates
   - Accept browser security warnings for self-signed certificates

4. **Test Timeouts**
   - Increase timeout in jest.config.js if needed
   - Some integration tests may take longer with real database

### Getting Help

- Check the console output for detailed error messages
- Review audit logs in your database for system events  
- Use the health check command to diagnose system issues

## Production Deployment

When deploying to production:

1. Use proper TLS certificates (not self-signed)
2. Generate strong encryption keys and store securely
3. Configure proper environment variables
4. Set up real Redis and Neo4j instances if using
5. Configure scheduled compliance monitoring
6. Set up alerting for compliance violations

See the main deployment documentation for full production setup.
EOF
    print_success "Created compliance testing documentation"
else
    print_warning "Compliance testing documentation already exists"
fi

# 10. Final summary and next steps
echo ""
echo "================================================="
print_success "✅ Compliance System Development Setup Complete!"
echo "================================================="
echo ""

print_status "📋 Next Steps:"
echo "1. Configure your Supabase database URL and service role key in .env.development"  
echo "2. Run the database migration: database/migrations/audit-compliance-schema.sql"
echo "3. Start testing with: npm run compliance:test-runner"
echo "4. Run automated tests with: npm run test:compliance"
echo ""

print_status "📚 Available Commands:"
echo "• npm run compliance:test-runner  - Interactive test runner"
echo "• npm run test:compliance         - Run compliance test suite"
echo "• npm run compliance:health-check - Check system health"
echo "• npm run dev:secure              - Start secure development server"
echo ""

print_status "📄 Documentation:"
echo "• COMPLIANCE_TESTING.md          - Testing guide"
echo "• docs/data-sovereignty-protocols.md - Privacy policies"
echo "• docs/encryption-implementation-guide.md - Technical details"
echo ""

print_warning "⚠️  Important Notes:"
echo "• Update Supabase credentials in .env.development"
echo "• Development certificates are self-signed (browsers will warn)"
echo "• Some features require Redis and Neo4j for full functionality"
echo "• Always use strong encryption keys in production"
echo ""

print_success "🔒 Your compliance and encryption development environment is ready!"
echo ""