# Contributing to ACT Placemat

Thank you for your interest in contributing to ACT Placemat! This guide outlines
our development standards and processes.

## Code Quality Standards

### Git Hooks and Automated Checks

This project uses automated Git hooks to maintain code quality:

- **Pre-commit**: Automatically runs linting and formatting on staged files
- **Commit message**: Validates commit messages follow conventional commit
  format

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) with
Australian English spelling:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous changes

#### Examples

```bash
feat(auth): add JWT token validation
fix(api): correct user profile endpoint response
docs: update README with installation instructions
refactor(database): optimise query performance
```

#### Breaking Changes

Add `!` after type/scope for breaking changes:

```bash
feat!: drop support for Node.js 16
feat(api)!: change user ID format to UUID
```

### Australian English

Use Australian English spelling throughout:

- colour (not color)
- centre (not center)
- organisation (not organization)
- realise (not realize)
- behaviour (not behavior)

### Code Style

- Use 2-space indentation for JavaScript/HTML/CSS
- Use TypeScript strict mode for all new code
- Follow semantic naming conventions
- Add JSDoc comments for complex functions
- Use modern ES6+ syntax

### Development Workflow

1. **Before committing**:

   ```bash
   npm run code-quality  # Run linting, formatting, and type checking
   ```

2. **Commit with template**:

   ```bash
   git commit  # Opens editor with commit message template
   ```

3. **Automated checks**: Pre-commit hooks will automatically:
   - Run ESLint with auto-fix
   - Format code with Prettier
   - Validate commit message format

### Testing

Run tests before submitting changes:

```bash
npm run test                # Run all tests
npm run test:frontend      # Frontend tests only
npm run test:backend       # Backend tests only
```

### Environment Management

ACT Placemat uses a multi-layered environment management system:

#### Quick Setup
```bash
# 1. Set up secrets management
./scripts/setup-secrets.sh

# 2. Copy environment template
cp .env.template .env.local

# 3. Fill in your actual values
editor .env.local

# 4. Enable direnv (optional)
direnv allow
```

#### Environment Files
- `.env` - Base configuration (committed)
- `.env.local` - Your local secrets (NEVER commit)
- `.env.template` - Template for new developers (committed)

#### Secrets Encryption
```bash
# Encrypt sensitive files
node scripts/secrets-manager.js encrypt .env.local

# Decrypt when needed  
node scripts/secrets-manager.js decrypt .env.local.enc
```

#### Security Rules
- ✅ Commit: `.env`, `.env.template`, `.envrc`, `*.enc` files
- ❌ Never commit: `.env.local`, `.env.*.local`, private keys

See [Environment Management Guide](Docs/Guides/Setup/ENVIRONMENT_MANAGEMENT.md) for details.

### Getting Help

- Check the documentation in `/Docs/`
- Review the project structure in `PROJECT_STRUCTURE.md`
- Environment setup: [Environment Management Guide](Docs/Guides/Setup/ENVIRONMENT_MANAGEMENT.md)
- Ask questions in issues or discussions

## Project Structure

- `/apps/` - Core applications (frontend, backend, mobile, etc.)
- `/packages/` - Shared utilities and components
- `/infrastructure/` - Infrastructure as code and deployment configs
- `/Docs/` - Organised documentation by category
- `/tools/` - Development and utility scripts

Thank you for contributing to ACT Placemat! 🇦🇺
