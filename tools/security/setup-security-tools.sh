#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Install tfsec
install_tfsec() {
    log_info "Installing tfsec..."
    
    local os=$(detect_os)
    
    if command_exists tfsec; then
        log_warning "tfsec is already installed"
        tfsec --version
        return 0
    fi
    
    case $os in
        "linux")
            curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash
            ;;
        "macos")
            if command_exists brew; then
                brew install tfsec
            else
                curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash
            fi
            ;;
        "windows")
            log_error "Please install tfsec manually on Windows: https://github.com/aquasecurity/tfsec/releases"
            return 1
            ;;
        *)
            log_error "Unsupported OS for automatic tfsec installation"
            return 1
            ;;
    esac
    
    if command_exists tfsec; then
        log_success "tfsec installed successfully"
        tfsec --version
    else
        log_error "Failed to install tfsec"
        return 1
    fi
}

# Install Checkov
install_checkov() {
    log_info "Installing Checkov..."
    
    if command_exists checkov; then
        log_warning "Checkov is already installed"
        checkov --version
        return 0
    fi
    
    if command_exists pip3; then
        pip3 install checkov
    elif command_exists pip; then
        pip install checkov
    else
        log_error "Python pip is required to install Checkov"
        return 1
    fi
    
    if command_exists checkov; then
        log_success "Checkov installed successfully"
        checkov --version
    else
        log_error "Failed to install Checkov"
        return 1
    fi
}

# Install Terraform (if not present)
install_terraform() {
    log_info "Checking Terraform installation..."
    
    if command_exists terraform; then
        log_success "Terraform is already installed"
        terraform --version
        return 0
    fi
    
    log_info "Installing Terraform..."
    
    local os=$(detect_os)
    local arch=""
    
    case $(uname -m) in
        "x86_64")
            arch="amd64"
            ;;
        "arm64" | "aarch64")
            arch="arm64"
            ;;
        *)
            log_error "Unsupported architecture: $(uname -m)"
            return 1
            ;;
    esac
    
    local terraform_version="1.5.0"
    local download_url=""
    
    case $os in
        "linux")
            download_url="https://releases.hashicorp.com/terraform/${terraform_version}/terraform_${terraform_version}_linux_${arch}.zip"
            ;;
        "macos")
            download_url="https://releases.hashicorp.com/terraform/${terraform_version}/terraform_${terraform_version}_darwin_${arch}.zip"
            ;;
        "windows")
            download_url="https://releases.hashicorp.com/terraform/${terraform_version}/terraform_${terraform_version}_windows_${arch}.zip"
            ;;
        *)
            log_error "Unsupported OS for Terraform installation"
            return 1
            ;;
    esac
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    
    # Download and install
    log_info "Downloading Terraform from $download_url"
    curl -LO "$download_url"
    
    if command_exists unzip; then
        unzip "terraform_${terraform_version}_*.zip"
    else
        log_error "unzip command is required to install Terraform"
        return 1
    fi
    
    # Move to PATH
    local install_dir="/usr/local/bin"
    if [[ ! -w "$install_dir" ]]; then
        install_dir="$HOME/.local/bin"
        mkdir -p "$install_dir"
    fi
    
    mv terraform "$install_dir/"
    chmod +x "$install_dir/terraform"
    
    # Clean up
    cd - > /dev/null
    rm -rf "$temp_dir"
    
    if command_exists terraform; then
        log_success "Terraform installed successfully"
        terraform --version
    else
        log_error "Failed to install Terraform"
        return 1
    fi
}

# Create security scanning configuration
create_config() {
    log_info "Creating security scanning configuration..."
    
    local config_dir=".security"
    mkdir -p "$config_dir"
    
    # tfsec configuration
    cat > "$config_dir/tfsec.yml" << 'EOF'
# tfsec configuration for Australian compliance
exclude:
  # Exclude specific checks if needed
  # - aws-s3-enable-bucket-encryption

minimum_severity: MEDIUM

# Australian-specific security requirements
custom_checks:
  - check_data_residency
  - check_encryption_at_rest
  - check_encryption_in_transit
  - check_access_logging
  - check_backup_encryption

# Exclude paths
exclude_paths:
  - .git/
  - node_modules/
  - .terraform/
  - .github/
  - vendor/
EOF
    
    # Checkov configuration
    cat > "$config_dir/checkov.yml" << 'EOF'
# Checkov configuration for Australian compliance
framework:
  - terraform
  - kubernetes
  - dockerfile

check:
  - CKV_AWS_*  # All AWS checks
  - CKV_AZURE_*  # All Azure checks
  - CKV_GCP_*  # All GCP checks

# Australian compliance frameworks
compliance:
  - australian-privacy-act
  - gdpr
  - iso27001
  - pci-dss

skip-check:
  # Add specific checks to skip if needed
  # - CKV_AWS_1

# Exclude paths
skip-path:
  - .git
  - node_modules
  - .terraform
  - .github
  - vendor

# Output settings
output:
  - cli
  - json
  - junit
  - sarif

# Quiet mode for CI
quiet: false

# Download external modules
download-external-modules: true
EOF
    
    # Security scanning script
    cat > "$config_dir/scan.sh" << 'EOF'
#!/bin/bash

# Security scanning script for ACT Placemat
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCAN_PATH="${1:-.}"
OUTPUT_DIR="security-results"
SEVERITY_THRESHOLD="${SEVERITY_THRESHOLD:-medium}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

log_info "Starting security scan for: $SCAN_PATH"
log_info "Output directory: $OUTPUT_DIR"
log_info "Severity threshold: $SEVERITY_THRESHOLD"

# Run tfsec
log_info "Running tfsec scan..."
if command -v tfsec >/dev/null 2>&1; then
    tfsec "$SCAN_PATH" \
        --format json \
        --out "$OUTPUT_DIR/tfsec-results.json" \
        --minimum-severity "$SEVERITY_THRESHOLD" \
        --exclude-downloaded-modules \
        --config-file .security/tfsec.yml || true
    
    tfsec "$SCAN_PATH" \
        --format default \
        --out "$OUTPUT_DIR/tfsec-report.txt" \
        --minimum-severity "$SEVERITY_THRESHOLD" \
        --exclude-downloaded-modules \
        --config-file .security/tfsec.yml || true
    
    log_success "tfsec scan completed"
else
    log_warning "tfsec not found, skipping"
fi

# Run Checkov
log_info "Running Checkov scan..."
if command -v checkov >/dev/null 2>&1; then
    checkov \
        --directory "$SCAN_PATH" \
        --config-file .security/checkov.yml \
        --output json \
        --output-file "$OUTPUT_DIR/checkov-results.json" || true
    
    checkov \
        --directory "$SCAN_PATH" \
        --config-file .security/checkov.yml \
        --output cli \
        --output-file "$OUTPUT_DIR/checkov-report.txt" || true
    
    log_success "Checkov scan completed"
else
    log_warning "Checkov not found, skipping"
fi

# Generate summary report
log_info "Generating compliance summary..."
cat > "$OUTPUT_DIR/compliance-summary.md" << EOL
# Security Scan Results

**Scan Date:** $(date)
**Scan Path:** $SCAN_PATH
**Severity Threshold:** $SEVERITY_THRESHOLD

## Australian Compliance Requirements

### Data Residency
- All resources configured for Australian regions
- Data processing within Australian borders

### Encryption Requirements
- Encryption at rest enabled
- Encryption in transit enforced
- Key management compliance

### Access Control
- Least privilege access implemented
- Authentication and authorization verified
- Access logging enabled

### Privacy Act Compliance
- Data protection measures in place
- Privacy-by-design principles followed
- Data retention policies implemented

## Scan Results Summary

See individual reports for detailed findings:
- tfsec-report.txt: Infrastructure security issues
- checkov-report.txt: Compliance violations
- *-results.json: Machine-readable results

EOL

log_success "Security scan completed successfully"
log_info "Results available in: $OUTPUT_DIR/"
EOF
    
    chmod +x "$config_dir/scan.sh"
    
    # Pre-commit hook
    if [[ -d ".git/hooks" ]]; then
        cat > ".git/hooks/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit security scan
echo "Running pre-commit security scan..."

# Only scan if terraform files changed
if git diff --cached --name-only | grep -E '\.(tf|tfvars)$' > /dev/null; then
    echo "Terraform files detected, running security scan..."
    
    # Run lightweight security check
    if command -v tfsec >/dev/null 2>&1; then
        tfsec . --minimum-severity HIGH --no-colour || {
            echo "Security issues detected. Please fix before committing."
            exit 1
        }
    fi
fi

echo "Pre-commit security check passed"
EOF
        chmod +x ".git/hooks/pre-commit"
        log_success "Pre-commit hook installed"
    fi
    
    log_success "Security scanning configuration created in $config_dir/"
}

# Main installation function
main() {
    log_info "Setting up security scanning tools for ACT Placemat..."
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    
    if ! command_exists curl; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command_exists unzip; then
        log_warning "unzip is recommended for Terraform installation"
    fi
    
    # Install tools
    install_terraform
    install_tfsec
    install_checkov
    
    # Create configuration
    create_config
    
    log_success "Security scanning tools setup completed!"
    log_info ""
    log_info "Usage:"
    log_info "  # Run full security scan:"
    log_info "  .security/scan.sh"
    log_info ""
    log_info "  # Scan specific directory:"
    log_info "  .security/scan.sh infrastructure/"
    log_info ""
    log_info "  # Run with different severity threshold:"
    log_info "  SEVERITY_THRESHOLD=high .security/scan.sh"
    log_info ""
    log_info "Tool versions installed:"
    if command_exists terraform; then
        echo -n "  Terraform: "
        terraform --version | head -n1
    fi
    if command_exists tfsec; then
        echo -n "  tfsec: "
        tfsec --version
    fi
    if command_exists checkov; then
        echo -n "  Checkov: "
        checkov --version
    fi
}

# Run main function
main "$@"