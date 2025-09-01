# ACT Placemat - Focused Workspace Guide

## Quick Context Reduction

When you get the "request_too_large" error, use these commands:

### 1. Clean Build Artifacts
```bash
# Remove all node_modules and build artifacts
rm -rf node_modules .next dist build .nx
rm -rf apps/*/node_modules apps/*/.next apps/*/dist
rm -rf packages/*/node_modules packages/*/dist
```

### 2. Use Sparse Checkout (for specific work areas)
```bash
# Enable sparse checkout
git sparse-checkout init --cone

# Focus on specific apps
git sparse-checkout set apps/placemat packages/shared-ui

# Or focus on documentation
git sparse-checkout set Docs .taskmaster

# Reset to full repo when needed
git sparse-checkout disable
```

### 3. Create Work Sessions by Area

#### For Placemat App Work:
```bash
cd apps/placemat
claude .  # Start Claude in app directory only
```

#### For Intelligence/AI Work:
```bash
cd apps/intelligence
claude .
```

#### For Documentation:
```bash
cd Docs
claude .
```

## Core Files Structure (1.2MB total)

### Active Applications
- `apps/placemat/` - Main community platform
- `apps/empathy-ledger/` - Empathy tracking system
- `apps/farmhand/` - Bot platform
- `apps/intelligence/` - AI integration layer

### Shared Resources
- `packages/` - Shared components and utilities
- `tools/` - Development scripts
- `infrastructure/` - Deployment configs

### Documentation
- `Docs/` - All documentation
- `.taskmaster/` - Task management system

## Working with Large Codebase

### Option 1: Directory-Specific Sessions
```bash
# Work on specific app
cd apps/placemat && claude

# Work on docs
cd Docs && claude
```

### Option 2: Use .claudeignore
The `.claudeignore` file now excludes:
- node_modules (3GB)
- Build artifacts
- Binary files
- Test files
- Archive folders

### Option 3: Git Worktrees for Parallel Work
```bash
# Create focused worktrees
git worktree add ../act-placemat-app apps/placemat
git worktree add ../act-docs Docs

# Work in isolated contexts
cd ../act-placemat-app && claude
```

## Emergency Context Reset

If Claude still has too much context:

```bash
# 1. Clear Claude's context
# Type: /clear

# 2. Start fresh session in specific directory
cd apps/placemat && claude

# 3. Or use headless mode for specific tasks
claude -p "Fix the authentication in apps/placemat"
```

## Essential Commands

### Check Context Size
```bash
# See what Claude will load
find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l

# Check actual git tracked files
git ls-files | xargs du -ch | tail -1
```

### Clean Workspace
```bash
# Full clean
npm run clean
rm -rf node_modules .next dist build

# Reinstall when needed
npm install
```

## Task Master Integration

Use Task Master to focus on specific work:
```bash
# Get next task
task-master next

# Work on specific task area
task-master show <id>  # Shows task context

# Update progress without loading full codebase
task-master update-subtask --id=<id> --prompt="progress notes"
```