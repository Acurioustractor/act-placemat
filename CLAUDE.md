# Claude Code Instructions

## Project Overview
ACT Placemat is a community platform connecting people, projects, and opportunities across Australia, with a focus on collaborative social impact initiatives.

## Code Style & Conventions
- Use 2-space indentation for JavaScript/HTML/CSS
- Use Australian English spelling throughout (e.g., "colour", "centre", "organisation")
- Follow semantic naming conventions for files and functions
- Prefer descriptive variable names over abbreviated ones
- Add JSDoc comments for complex functions
- Use TypeScript strict mode for all new code
- Follow conventional commit message format (feat:, fix:, docs:, etc.)
- Maintain consistent file naming: kebab-case for files, PascalCase for React components
- Use modern ES6+ syntax (arrow functions, destructuring, template literals)
- Implement proper error handling with try-catch blocks
- Use async/await instead of Promises where applicable

## File Organization
- `/apps/` - Core applications (placemat, empathy-ledger, farmhand)
- `/packages/` - Shared utilities and components
- `/Docs/` - Organized documentation by category
- `/archive/` - Historical files and deprecated code
- `/tools/` - Development and utility scripts

## Development Workflow
- Always run `npm run lint` and type checking before commits
- Use meaningful commit messages following conventional commits
- Test locally before deployment using provided scripts
- Check Australian spelling in user-facing content

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
