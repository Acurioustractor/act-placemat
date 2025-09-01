# Task 1 Implementation Guide: Setup Core Project Architecture

## Overview
This guide provides step-by-step instructions for implementing Task 1: "Setup Core Project Architecture and Repository Structure" for the ACT Universal Bot Platform.

## Current Status
- **Task ID:** 1
- **Status:** In Progress
- **Priority:** High
- **Dependencies:** None

## Subtasks Overview
1. **1.1** Initialize Nx 19 monorepo workspace
2. **1.2** Configure Yarn v4 workspaces
3. **1.3** Create Next.js 14 app template
4. **1.4** Create Expo 51 React Native app template
5. **1.5** Create NestJS 10 backend app template
6. **1.6** Create Node.js worker app templates
7. **1.7** Set up shared packages (zod/types/utils)
8. **1.8** Create infrastructure folders and configurations
9. **1.9** Configure shared linting and formatting
10. **1.10** Set up Git hooks and commit validation
11. **1.11** Configure comprehensive testing harness
12. **1.12** Implement environment and secrets management

## Implementation Steps

### Subtask 1.1: Initialize Nx 19 monorepo workspace

#### Prerequisites
- Node.js 18+
- npm or yarn installed

#### Steps
1. **Create the project directory:**
   ```bash
   mkdir act-universal-bot-platform
   cd act-universal-bot-platform
   ```

2. **Initialize Nx workspace:**
   ```bash
   npx create-nx-workspace@19 act-universal-bot-platform \
     --preset=empty \
     --workspaceType=integrated \
     --interactive=false
   ```

3. **Navigate to project root:**
   ```bash
   cd act-universal-bot-platform
   ```

4. **Verify Nx installation:**
   ```bash
   nx --version
   ```

#### Expected Outcome
- Nx workspace initialized with proper structure
- `nx.json` configuration file created
- `package.json` with Nx dependencies
- Basic project structure in place

#### Verification
```bash
# Check Nx workspace configuration
cat nx.json

# Verify project structure
ls -la

# Test Nx command
nx graph
```

### Subtask 1.2: Configure Yarn v4 workspaces

#### Steps
1. **Install Yarn v4:**
   ```bash
   npm install -g yarn
   yarn set version berry
   ```

2. **Configure workspace settings in `package.json`:**
   ```json
   {
     "workspaces": [
       "apps/*",
       "packages/*",
       "services/*"
     ]
   }
   ```

3. **Create `.yarnrc.yml` for Yarn configuration:**
   ```yaml
   nodeLinker: node-modules
   yarnPath: .yarn/releases/yarn-4.x.x.cjs
   ```

#### Expected Outcome
- Yarn v4 properly configured
- Workspace structure defined
- Package management ready for monorepo

### Subtask 1.3: Create Next.js 14 app template

#### Steps
1. **Generate Next.js app using Nx:**
   ```bash
   nx g @nx/next:application web
   ```

2. **Configure Next.js 14 features:**
   - App Router setup
   - TypeScript configuration
   - Tailwind CSS integration
   - React Server Components

#### Expected Outcome
- Next.js 14 web application ready
- Proper routing and component structure
- Development server runnable

### Subtask 1.4: Create Expo 51 React Native app template

#### Steps
1. **Generate React Native app using Nx:**
   ```bash
   nx g @nx/react-native:application mobile
   ```

2. **Configure Expo 51:**
   - Expo SDK 51 integration
   - Native dependencies setup
   - iOS/Android configuration

#### Expected Outcome
- React Native mobile app with Expo
- Native build capabilities
- Cross-platform development ready

### Subtask 1.5: Create NestJS 10 backend app template

#### Steps
1. **Generate NestJS app using Nx:**
   ```bash
   nx g @nx/nest:application api
   ```

2. **Configure NestJS 10 features:**
   - Module structure
   - Controllers and services
   - Dependency injection setup
   - API documentation (Swagger)

#### Expected Outcome
- NestJS backend API service
- RESTful endpoints ready
- Proper architecture for microservices

## Development Workflow

### Daily Development Commands
```bash
# Start development servers
nx serve web      # Next.js web app
nx serve api      # NestJS backend
nx serve mobile   # React Native mobile

# Run tests
nx test web
nx test api
nx test mobile

# Build for production
nx build web
nx build api
nx build mobile
```

### Code Quality Commands
```bash
# Lint all projects
nx lint

# Format code
nx format:write

# Run all tests
nx run-many --target=test --all
```

## Project Structure
```
act-universal-bot-platform/
├── apps/
│   ├── web/           # Next.js 14 web application
│   ├── mobile/        # Expo 51 React Native mobile app
│   └── api/           # NestJS 10 backend API
├── packages/
│   ├── shared/        # Shared utilities and types
│   └── ui/            # Shared UI components
├── services/
│   ├── agents/        # AI agent services
│   ├── workers/       # Background workers
│   └── connectors/    # Data connectors
├── infrastructure/
│   ├── k8s/           # Kubernetes manifests
│   ├── docker/        # Docker configurations
│   └── terraform/     # Infrastructure as code
├── tools/
│   └── scripts/       # Development scripts
├── nx.json            # Nx workspace configuration
├── package.json       # Root package configuration
└── README.md          # Project documentation
```

## Next Steps After Task 1 Completion
1. **Update Task Master status:**
   ```bash
   task-master set-status --id=1 --status=done
   ```

2. **Proceed to Task 2:** Implement LangGraph Multi-Agent Framework

3. **Document any challenges or learnings** in the task details using:
   ```bash
   task-master update-subtask --id=1.1 --prompt="Implementation notes and challenges encountered"
   ```

## Troubleshooting

### Common Issues
1. **Nx installation fails:**
   - Ensure Node.js 18+ is installed
   - Clear npm/yarn cache
   - Try installing Nx globally first

2. **Yarn workspace issues:**
   - Verify `.yarnrc.yml` configuration
   - Check Node.js version compatibility
   - Ensure proper workspace paths in `package.json`

3. **Next.js/React Native build errors:**
   - Check TypeScript configuration
   - Verify dependency versions
   - Ensure proper environment setup

### Support Resources
- [Nx Documentation](https://nx.dev)
- [Yarn Berry Documentation](https://yarnpkg.com/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev)
- [NestJS Documentation](https://docs.nestjs.com)

## Success Criteria
- ✅ Nx 19 monorepo workspace initialized
- ✅ Yarn v4 workspaces configured
- ✅ Next.js 14 web app template created
- ✅ Expo 51 mobile app template created
- ✅ NestJS 10 backend template created
- ✅ All apps build and run successfully
- ✅ Project structure follows best practices
- ✅ Development workflow established
