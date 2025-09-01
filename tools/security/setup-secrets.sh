#!/usr/bin/env bash

# ACT Placemat - Secrets Setup Script
# Sets up secure environment variable management with age encryption

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$PROJECT_ROOT/.secrets"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

# Logging functions
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

# Check if age is installed
check_age_installation() {
  if command -v age >/dev/null 2>&1; then
    log_success "age is installed: $(age --version)"
    return 0
  else
    log_warning "age is not installed"
    return 1
  fi
}

# Install age on macOS
install_age_macos() {
  log_info "Installing age via Homebrew..."
  if command -v brew >/dev/null 2>&1; then
    brew install age
    log_success "age installed successfully"
  else
    log_error "Homebrew not found. Please install age manually:"
    echo "  Visit: https://github.com/FiloSottile/age/releases"
    exit 1
  fi
}

# Install age on Linux
install_age_linux() {
  log_info "Installing age..."
  
  if command -v apt-get >/dev/null 2>&1; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y age
  elif command -v yum >/dev/null 2>&1; then
    # RHEL/CentOS/Fedora
    sudo yum install -y age
  elif command -v pacman >/dev/null 2>&1; then
    # Arch Linux
    sudo pacman -S age
  else
    log_error "Package manager not supported. Please install age manually:"
    echo "  Visit: https://github.com/FiloSottile/age/releases"
    exit 1
  fi
  
  log_success "age installed successfully"
}

# Setup age encryption
setup_age() {
  log_info "Setting up age encryption..."
  
  # Create secrets directory
  mkdir -p "$SECRETS_DIR"
  
  # Generate key pair if not exists
  if [[ ! -f "$SECRETS_DIR/age.key" ]]; then
    log_info "Generating new age key pair..."
    
    # Generate keys
    age-keygen -o "$SECRETS_DIR/age.key" 2>"$SECRETS_DIR/age.pub.tmp"
    
    # Extract public key
    grep "public key:" "$SECRETS_DIR/age.pub.tmp" | sed 's/# public key: //' > "$SECRETS_DIR/age.pub"
    rm "$SECRETS_DIR/age.pub.tmp"
    
    # Set proper permissions
    chmod 600 "$SECRETS_DIR/age.key"
    chmod 644 "$SECRETS_DIR/age.pub"
    
    log_success "Generated age key pair"
    log_info "Private key: $SECRETS_DIR/age.key"
    log_info "Public key: $SECRETS_DIR/age.pub"
    
    # Show public key
    echo ""
    log_info "Your public key (share with team members):"
    cat "$SECRETS_DIR/age.pub"
    echo ""
  else
    log_success "Age key pair already exists"
  fi
}

# Create environment templates
create_env_templates() {
  log_info "Creating environment templates..."
  
  # Create .env.example if it doesn't exist
  if [[ ! -f "$PROJECT_ROOT/.env.example" ]]; then
    cat > "$PROJECT_ROOT/.env.example" << 'EOF'
# ACT Placemat - Environment Variables Example
# Copy this to .env.local and fill in your actual values

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
NODE_ENV=development
APP_NAME="ACT Placemat"
APP_VERSION=2.0.0

# Port Configuration
FRONTEND_PORT=5173
BACKEND_PORT=4000
API_PORT=3000

# ==============================================
# DATABASE & STORAGE
# ==============================================
DATABASE_URL=postgresql://user:password@localhost:5432/act_placemat
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ==============================================
# EXTERNAL API KEYS (Sensitive - use .env.local)
# ==============================================
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
NOTION_TOKEN=your_notion_integration_token_here

# ==============================================
# SECURITY (Sensitive - use .env.local)
# ==============================================
JWT_SECRET=your_jwt_secret_here_min_32_characters
ENCRYPTION_KEY=your_encryption_key_here_min_32_characters

# ==============================================
# FEATURE FLAGS
# ==============================================
ENABLE_ANALYTICS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_REAL_TIME_UPDATES=true

# ==============================================
# LOCALISATION (AUSTRALIAN)
# ==============================================
TIMEZONE=Australia/Sydney
LOCALE=en-AU
CURRENCY=AUD
EOF
    log_success "Created .env.example"
  fi
  
  # Update .gitignore to protect sensitive files
  update_gitignore
}

# Update .gitignore
update_gitignore() {
  log_info "Updating .gitignore for secrets protection..."
  
  local gitignore_entries=(
    "# Environment variables (sensitive)"
    ".env.local"
    ".env.*.local"
    ".env.production"
    "*.env.local"
    ""
    "# Age encryption keys (NEVER COMMIT)"
    ".secrets/age.key"
    ".secrets/*.key"
    ""
    "# Encrypted secrets (commit these)"
    "# .secrets/*.enc"
    "# *.secrets.enc"
  )
  
  local gitignore_file="$PROJECT_ROOT/.gitignore"
  local backup_file="$gitignore_file.backup"
  
  # Backup existing .gitignore
  if [[ -f "$gitignore_file" ]]; then
    cp "$gitignore_file" "$backup_file"
  fi
  
  # Add entries if they don't exist
  for entry in "${gitignore_entries[@]}"; do
    if [[ -n "$entry" ]] && ! grep -Fxq "$entry" "$gitignore_file" 2>/dev/null; then
      echo "$entry" >> "$gitignore_file"
    fi
  done
  
  log_success "Updated .gitignore"
}

# Create secrets management aliases
create_aliases() {
  log_info "Creating helpful aliases..."
  
  cat > "$PROJECT_ROOT/.secrets/aliases.sh" << 'EOF'
#!/usr/bin/env bash

# ACT Placemat - Secrets Management Aliases
# Source this file or add to your shell profile

# Age encryption aliases
alias age-encrypt='age -r $(cat .secrets/age.pub)'
alias age-decrypt='age -d -i .secrets/age.key'

# Secrets management
alias secrets-encrypt='node scripts/secrets-manager.js encrypt'
alias secrets-decrypt='node scripts/secrets-manager.js decrypt'
alias secrets-list='node scripts/secrets-manager.js list'

# Environment management
alias env-encrypt='secrets-encrypt .env.local'
alias env-decrypt='secrets-decrypt .env.local.enc'

# Quick setup for new developers
alias secrets-setup='bash scripts/setup-secrets.sh'

echo "🔐 Secrets management aliases loaded"
echo "Available commands:"
echo "  secrets-encrypt <file>   - Encrypt a file"
echo "  secrets-decrypt <file>   - Decrypt a file" 
echo "  secrets-list            - List encrypted files"
echo "  env-encrypt             - Encrypt .env.local"
echo "  env-decrypt             - Decrypt .env.local.enc"
EOF
  
  chmod +x "$PROJECT_ROOT/.secrets/aliases.sh"
  log_success "Created secrets aliases in .secrets/aliases.sh"
}

# Validate setup
validate_setup() {
  log_info "Validating secrets setup..."
  
  local errors=0
  
  # Check age installation
  if ! command -v age >/dev/null 2>&1; then
    log_error "age is not installed"
    errors=$((errors + 1))
  fi
  
  # Check key files
  if [[ ! -f "$SECRETS_DIR/age.key" ]]; then
    log_error "Private key not found: $SECRETS_DIR/age.key"
    errors=$((errors + 1))
  fi
  
  if [[ ! -f "$SECRETS_DIR/age.pub" ]]; then
    log_error "Public key not found: $SECRETS_DIR/age.pub"
    errors=$((errors + 1))
  fi
  
  # Check .gitignore
  if ! grep -q ".env.local" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    log_warning ".env.local not in .gitignore"
  fi
  
  if [[ $errors -eq 0 ]]; then
    log_success "Secrets setup validation passed"
    return 0
  else
    log_error "Secrets setup validation failed with $errors errors"
    return 1
  fi
}

# Test encryption/decryption
test_encryption() {
  log_info "Testing encryption/decryption..."
  
  local test_file="$SECRETS_DIR/test.txt"
  local test_content="SECRET_TEST=this_is_a_test_secret"
  
  # Create test file
  echo "$test_content" > "$test_file"
  
  # Test JavaScript encryption
  if node "$SCRIPTS_DIR/secrets-manager.js" encrypt "$test_file" >/dev/null 2>&1; then
    if node "$SCRIPTS_DIR/secrets-manager.js" decrypt "$test_file.enc" >/dev/null 2>&1; then
      if [[ "$(cat "$test_file")" == "$test_content" ]]; then
        log_success "Encryption/decryption test passed"
        rm -f "$test_file" "$test_file.enc"
        return 0
      fi
    fi
  fi
  
  log_error "Encryption/decryption test failed"
  rm -f "$test_file" "$test_file.enc"
  return 1
}

# Main setup function
main() {
  echo ""
  log_info "🔐 Setting up ACT Placemat Secrets Management"
  echo ""
  
  # Check/install age
  if ! check_age_installation; then
    case "$(uname -s)" in
      Darwin*)
        install_age_macos
        ;;
      Linux*)
        install_age_linux
        ;;
      *)
        log_error "Unsupported operating system. Please install age manually."
        exit 1
        ;;
    esac
  fi
  
  # Setup age encryption
  setup_age
  
  # Create templates and configuration
  create_env_templates
  create_aliases
  
  # Validate setup
  if validate_setup; then
    test_encryption
  fi
  
  echo ""
  log_success "🎉 Secrets management setup complete!"
  echo ""
  echo "Next steps:"
  echo "1. Copy .env.example to .env.local and fill in your secrets"
  echo "2. Encrypt sensitive files: node scripts/secrets-manager.js encrypt .env.local"
  echo "3. Share your public key with team members: cat .secrets/age.pub"
  echo "4. Source aliases: source .secrets/aliases.sh"
  echo ""
  echo "Documentation: See CONTRIBUTING.md for secrets management guidelines"
  echo ""
}

# Run main function
main "$@"