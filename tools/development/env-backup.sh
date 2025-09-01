#!/bin/bash

# 🔒 ACT Placemat - Environment Backup & Recovery System
# Never lose your .env files again!

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.secrets/env-backups"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

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

log_header() {
    echo -e "\n${CYAN}🔒 $1${NC}\n"
}

# Create secure backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR/$TIMESTAMP"
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR/$TIMESTAMP"
    log_success "Created secure backup directory: $BACKUP_DIR/$TIMESTAMP"
}

# Find all .env files in the project
find_env_files() {
    log_info "Scanning for .env files..."
    
    local env_files=()
    
    # Find all .env files, excluding node_modules
    while IFS= read -r -d '' file; do
        # Skip node_modules and other unwanted directories
        if [[ "$file" != *"node_modules"* ]] && [[ "$file" != *".git"* ]]; then
            env_files+=("$file")
        fi
    done < <(find "$PROJECT_ROOT" -name ".env*" -type f -print0)
    
    printf '%s\n' "${env_files[@]}"
}

# Backup all environment files
backup_env_files() {
    log_header "Backing Up Environment Files"
    
    create_backup_dir
    
    local files_backed_up=0
    local backup_manifest="$BACKUP_DIR/$TIMESTAMP/BACKUP_MANIFEST.txt"
    
    # Create backup manifest
    cat > "$backup_manifest" << EOF
# ACT Placemat Environment Backup
# Created: $(date)
# Backup ID: $TIMESTAMP
# System: $(uname -a)

EOF

    # Find and backup each .env file
    while IFS= read -r env_file; do
        if [[ -f "$env_file" ]]; then
            local relative_path="${env_file#$PROJECT_ROOT/}"
            local backup_name="${relative_path//\//_}"
            local backup_path="$BACKUP_DIR/$TIMESTAMP/$backup_name"
            
            # Copy file with metadata
            cp "$env_file" "$backup_path"
            chmod 600 "$backup_path"
            
            # Add to manifest
            echo "✓ $relative_path → $backup_name" >> "$backup_manifest"
            
            log_success "Backed up: $relative_path"
            ((files_backed_up++))
        fi
    done < <(find_env_files)
    
    # Create archive for extra security
    local archive_path="$BACKUP_DIR/env-backup-$TIMESTAMP.tar.gz"
    tar -czf "$archive_path" -C "$BACKUP_DIR" "$TIMESTAMP"
    chmod 600 "$archive_path"
    
    # Summary
    echo "Backup Summary:" >> "$backup_manifest"
    echo "Files backed up: $files_backed_up" >> "$backup_manifest"
    echo "Archive created: env-backup-$TIMESTAMP.tar.gz" >> "$backup_manifest"
    
    log_success "🎉 Backup completed: $files_backed_up files backed up"
    log_info "📦 Archive created: $archive_path"
    log_info "📋 Manifest: $backup_manifest"
}

# List available backups
list_backups() {
    log_header "Available Environment Backups"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "No backup directory found. Run backup first."
        return 1
    fi
    
    local backup_count=0
    
    for backup_dir in "$BACKUP_DIR"/*; do
        if [[ -d "$backup_dir" ]]; then
            local backup_name=$(basename "$backup_dir")
            local manifest="$backup_dir/BACKUP_MANIFEST.txt"
            
            echo -e "\n${PURPLE}📅 Backup: $backup_name${NC}"
            
            if [[ -f "$manifest" ]]; then
                local file_count=$(grep -c "✓" "$manifest" || echo "0")
                local created=$(grep "Created:" "$manifest" | cut -d' ' -f3-)
                
                echo "   📊 Files: $file_count"
                echo "   🕒 Created: $created"
                echo "   📁 Location: $backup_dir"
            else
                echo "   ❓ No manifest found"
            fi
            
            ((backup_count++))
        fi
    done
    
    if [[ $backup_count -eq 0 ]]; then
        log_warning "No backups found"
    else
        log_success "Found $backup_count backup(s)"
    fi
}

# Restore from backup
restore_from_backup() {
    local backup_id="$1"
    
    if [[ -z "$backup_id" ]]; then
        log_error "Please specify a backup ID"
        list_backups
        return 1
    fi
    
    log_header "Restoring Environment from Backup: $backup_id"
    
    local backup_path="$BACKUP_DIR/$backup_id"
    local manifest="$backup_path/BACKUP_MANIFEST.txt"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup not found: $backup_id"
        list_backups
        return 1
    fi
    
    if [[ ! -f "$manifest" ]]; then
        log_error "Backup manifest not found: $manifest"
        return 1
    fi
    
    log_warning "⚠️  This will overwrite existing .env files!"
    
    if [[ "${FORCE_RESTORE:-}" != "true" ]]; then
        echo -n "Continue? (y/N): "
        read -r response
        if [[ "$response" != "y" && "$response" != "Y" ]]; then
            log_info "Restore cancelled"
            return 0
        fi
    fi
    
    local files_restored=0
    
    # Read manifest and restore files
    while IFS=' → ' read -r relative_path backup_name; do
        if [[ "$relative_path" =~ ^✓ ]]; then
            relative_path="${relative_path#✓ }"
            local original_path="$PROJECT_ROOT/$relative_path"
            local backup_file="$backup_path/$backup_name"
            
            if [[ -f "$backup_file" ]]; then
                # Ensure destination directory exists
                mkdir -p "$(dirname "$original_path")"
                
                # Restore file
                cp "$backup_file" "$original_path"
                chmod 644 "$original_path"
                
                log_success "Restored: $relative_path"
                ((files_restored++))
            else
                log_warning "Backup file not found: $backup_name"
            fi
        fi
    done < "$manifest"
    
    log_success "🎉 Restore completed: $files_restored files restored"
    log_info "💡 Run 'npm run env:check' to validate the restored environment"
}

# Emergency recovery - restore from most recent backup
emergency_recovery() {
    log_header "🚨 EMERGENCY RECOVERY MODE"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "No backup directory found. Cannot recover."
        return 1
    fi
    
    # Find most recent backup
    local latest_backup=""
    local latest_timestamp=""
    
    for backup_dir in "$BACKUP_DIR"/*; do
        if [[ -d "$backup_dir" ]]; then
            local backup_name=$(basename "$backup_dir")
            if [[ "$backup_name" > "$latest_timestamp" ]]; then
                latest_timestamp="$backup_name"
                latest_backup="$backup_dir"
            fi
        fi
    done
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found for emergency recovery"
        return 1
    fi
    
    log_info "🔍 Found most recent backup: $latest_timestamp"
    
    FORCE_RESTORE=true restore_from_backup "$latest_timestamp"
}

# Clean old backups (keep last N backups)
cleanup_old_backups() {
    local keep_count="${1:-10}"
    
    log_header "Cleaning Old Backups (keeping last $keep_count)"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "No backup directory found. Nothing to clean."
        return 0
    fi
    
    local backup_dirs=()
    for backup_dir in "$BACKUP_DIR"/*; do
        if [[ -d "$backup_dir" ]]; then
            backup_dirs+=("$backup_dir")
        fi
    done
    
    # Sort by timestamp (directory name)
    IFS=$'\n' backup_dirs=($(sort -r <<< "${backup_dirs[*]}"))
    
    local total_backups=${#backup_dirs[@]}
    local to_delete=$((total_backups - keep_count))
    
    if [[ $to_delete -le 0 ]]; then
        log_info "No old backups to clean (have $total_backups, keeping $keep_count)"
        return 0
    fi
    
    log_info "Will delete $to_delete old backup(s)..."
    
    for ((i=keep_count; i<total_backups; i++)); do
        local backup_to_delete="${backup_dirs[i]}"
        local backup_name=$(basename "$backup_to_delete")
        
        rm -rf "$backup_to_delete"
        
        # Also remove corresponding archive
        local archive="$BACKUP_DIR/env-backup-$backup_name.tar.gz"
        if [[ -f "$archive" ]]; then
            rm -f "$archive"
        fi
        
        log_success "Deleted old backup: $backup_name"
    done
    
    log_success "Cleanup completed: deleted $to_delete old backup(s)"
}

# Verify backup integrity
verify_backup() {
    local backup_id="$1"
    
    if [[ -z "$backup_id" ]]; then
        log_error "Please specify a backup ID"
        list_backups
        return 1
    fi
    
    log_header "Verifying Backup Integrity: $backup_id"
    
    local backup_path="$BACKUP_DIR/$backup_id"
    local manifest="$backup_path/BACKUP_MANIFEST.txt"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup not found: $backup_id"
        return 1
    fi
    
    if [[ ! -f "$manifest" ]]; then
        log_error "Backup manifest not found: $manifest"
        return 1
    fi
    
    local files_checked=0
    local files_missing=0
    
    # Verify each file in manifest exists
    while IFS=' → ' read -r relative_path backup_name; do
        if [[ "$relative_path" =~ ^✓ ]]; then
            relative_path="${relative_path#✓ }"
            local backup_file="$backup_path/$backup_name"
            
            if [[ -f "$backup_file" ]]; then
                log_success "✓ $backup_name"
                ((files_checked++))
            else
                log_error "✗ Missing: $backup_name"
                ((files_missing++))
            fi
        fi
    done < "$manifest"
    
    if [[ $files_missing -eq 0 ]]; then
        log_success "🎉 Backup integrity verified: $files_checked files OK"
    else
        log_error "❌ Backup integrity check failed: $files_missing files missing"
        return 1
    fi
}

# Show usage information
show_usage() {
    echo -e "${CYAN}🔒 ACT Placemat Environment Backup System${NC}"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  backup          Create backup of all .env files"
    echo "  list            List available backups"
    echo "  restore ID      Restore from specific backup"
    echo "  recovery        Emergency recovery from latest backup"
    echo "  verify ID       Verify backup integrity"
    echo "  cleanup [N]     Clean old backups (keep last N, default: 10)"
    echo "  help            Show this help message"
    echo
    echo "Examples:"
    echo "  $0 backup                    # Create new backup"
    echo "  $0 list                      # List all backups"
    echo "  $0 restore 2024-01-15_14-30-45  # Restore specific backup"
    echo "  $0 recovery                  # Emergency restore latest"
    echo "  $0 cleanup 5                 # Keep only last 5 backups"
    echo
    echo "Environment variables:"
    echo "  FORCE_RESTORE=true           # Skip confirmation prompts"
    echo
    echo "🔐 All backups are stored securely in $BACKUP_DIR"
}

# Main command processing
main() {
    local command="${1:-help}"
    
    case "$command" in
        backup)
            backup_env_files
            ;;
        list)
            list_backups
            ;;
        restore)
            if [[ $# -lt 2 ]]; then
                log_error "Please specify a backup ID"
                list_backups
                exit 1
            fi
            restore_from_backup "$2"
            ;;
        recovery)
            emergency_recovery
            ;;
        verify)
            if [[ $# -lt 2 ]]; then
                log_error "Please specify a backup ID"
                list_backups
                exit 1
            fi
            verify_backup "$2"
            ;;
        cleanup)
            cleanup_old_backups "${2:-10}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"