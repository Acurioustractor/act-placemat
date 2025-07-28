# Authentication & User Management System Design

## Overview

This document outlines the implementation of a secure authentication and user management system for the ACT Placemat platform, enabling role-based access control and secure multi-user functionality.

## Architecture

### Technology Stack
- **Backend**: Node.js with Express
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcrypt for hashing
- **Session Management**: express-session with Redis
- **Database**: PostgreSQL for user data
- **Optional SSO**: Auth0 for enterprise integration

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    notion_user_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user', 'viewer'))
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

## Role-Based Access Control (RBAC)

### Role Hierarchy
1. **Admin**: Full system access, user management, system configuration
2. **Manager**: Project/opportunity management, team oversight, reports
3. **User**: Create/edit own items, view all, collaborate
4. **Viewer**: Read-only access to permitted resources

### Permission Matrix

| Resource | Viewer | User | Manager | Admin |
|----------|--------|------|---------|-------|
| Projects | Read | Read/Create/Edit Own | Read/Write All | Full Access |
| Opportunities | Read | Read/Create/Edit Own | Read/Write All | Full Access |
| Organizations | Read | Read | Read/Write | Full Access |
| People | Read | Read/Create Own | Read/Write All | Full Access |
| Financial Data | None | View Own | View All | Full Access |
| System Settings | None | None | None | Full Access |
| User Management | None | None | View | Full Access |

## Implementation

### 1. Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const verify = promisify(jwt.verify);

class AuthMiddleware {
    async authenticate(req, res, next) {
        try {
            const token = this.extractToken(req);
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = await verify(token, process.env.JWT_SECRET);
            const user = await this.validateUser(decoded.userId);
            
            if (!user || !user.is_active) {
                return res.status(401).json({ error: 'Invalid or inactive user' });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(401).json({ error: 'Invalid token' });
        }
    }

    authorize(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        };
    }

    extractToken(req) {
        if (req.headers.authorization?.startsWith('Bearer ')) {
            return req.headers.authorization.substring(7);
        }
        return req.cookies?.token;
    }

    async validateUser(userId) {
        // Database query to get user details
        const user = await db.query(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
            [userId]
        );
        return user.rows[0];
    }
}

module.exports = new AuthMiddleware();
```

### 2. Authentication Service

```javascript
// services/auth.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
    async register(userData) {
        const { email, password, fullName } = userData;

        // Check if user exists
        const existing = await this.getUserByEmail(email);
        if (existing) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await db.query(
            `INSERT INTO users (email, password_hash, full_name) 
             VALUES ($1, $2, $3) 
             RETURNING id, email, full_name, role`,
            [email, passwordHash, fullName]
        );

        // Send verification email
        await this.sendVerificationEmail(user.rows[0]);

        return {
            user: user.rows[0],
            token: this.generateToken(user.rows[0])
        };
    }

    async login(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        if (!user.is_active) {
            throw new Error('Account is inactive');
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Create session
        const token = this.generateToken(user);
        await this.createSession(user.id, token);

        // Log the action
        await this.logAction(user.id, 'login', 'user', user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            },
            token
        };
    }

    async logout(token) {
        await db.query('DELETE FROM sessions WHERE token = $1', [token]);
    }

    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    async createSession(userId, token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours

        await db.query(
            `INSERT INTO sessions (user_id, token, expires_at) 
             VALUES ($1, $2, $3)`,
            [userId, token, expiresAt]
        );
    }

    async resetPassword(email) {
        const user = await this.getUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return { message: 'If user exists, reset email sent' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

        await db.query(
            `INSERT INTO password_resets (user_id, token, expires_at) 
             VALUES ($1, $2, $3)`,
            [user.id, token, expiresAt]
        );

        await this.sendPasswordResetEmail(user, token);
        return { message: 'If user exists, reset email sent' };
    }

    async logAction(userId, action, entityType, entityId, metadata = {}) {
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, entityType, entityId, JSON.stringify(metadata)]
        );
    }
}

module.exports = new AuthService();
```

### 3. API Routes

```javascript
// routes/auth.routes.js
const router = require('express').Router();
const authService = require('../services/auth.service');
const auth = require('../middleware/auth');

// Public routes
router.post('/register', async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const result = await authService.login(req.body.email, req.body.password);
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

router.post('/logout', auth.authenticate, async (req, res) => {
    try {
        await authService.logout(req.cookies.token);
        res.clearCookie('token');
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body.email);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected routes
router.get('/me', auth.authenticate, (req, res) => {
    res.json({ user: req.user });
});

router.put('/profile', auth.authenticate, async (req, res) => {
    try {
        const updated = await authService.updateProfile(req.user.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin routes
router.get('/users', auth.authenticate, auth.authorize(['admin']), async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id/role', auth.authenticate, auth.authorize(['admin']), async (req, res) => {
    try {
        const updated = await authService.updateUserRole(req.params.id, req.body.role);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
```

### 4. Frontend Integration

```javascript
// frontend/auth.js
class AuthClient {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = null;
    }

    async login(email, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const data = await response.json();
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        
        return data;
    }

    async logout() {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    isAuthenticated() {
        return !!this.token;
    }

    hasRole(role) {
        return this.user?.role === role;
    }

    canAccess(resource, action) {
        const permissions = {
            admin: ['all'],
            manager: ['projects:write', 'opportunities:write', 'organizations:write'],
            user: ['projects:create', 'opportunities:create'],
            viewer: ['projects:read', 'opportunities:read']
        };

        const userPerms = permissions[this.user?.role] || [];
        return userPerms.includes('all') || userPerms.includes(`${resource}:${action}`);
    }
}
```

## Security Best Practices

### 1. Password Requirements
```javascript
const passwordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true // Check against common passwords list
};
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later'
});

app.use('/api/auth/login', loginLimiter);
```

### 3. Session Management
- Sessions expire after 24 hours of inactivity
- Refresh tokens for extended sessions
- Invalidate all sessions on password change
- Track concurrent sessions per user

### 4. Security Headers
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

## Migration Strategy

### Phase 1: Basic Authentication
1. Implement user registration and login
2. Add JWT token generation
3. Create basic middleware

### Phase 2: Role Management
1. Implement RBAC system
2. Add permission checks
3. Create admin interface

### Phase 3: Advanced Features
1. Add SSO integration
2. Implement 2FA
3. Add audit logging
4. Create user management UI

## Testing Strategy

### Unit Tests
```javascript
describe('AuthService', () => {
    test('should hash passwords correctly', async () => {
        const password = 'testPassword123!';
        const hash = await authService.hashPassword(password);
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50);
    });

    test('should validate tokens', async () => {
        const user = { id: '123', email: 'test@example.com', role: 'user' };
        const token = authService.generateToken(user);
        const decoded = await authService.validateToken(token);
        expect(decoded.userId).toBe(user.id);
    });
});
```

### Integration Tests
- Test full login flow
- Test permission enforcement
- Test session management
- Test rate limiting

## Monitoring & Analytics

### Key Metrics
- Login success/failure rates
- Average session duration
- Password reset requests
- Failed authentication attempts
- Role distribution

### Alerts
- Multiple failed login attempts
- Unusual login patterns
- Expired sessions
- Security policy violations

## Next Steps

1. Set up PostgreSQL database
2. Implement basic authentication endpoints
3. Create login/register UI
4. Add role-based middleware
5. Implement audit logging
6. Add security headers
7. Set up monitoring