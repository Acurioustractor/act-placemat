/**
 * Passport.js configuration for OAuth 2.0 authentication
 * Integrates with existing JWT-based authentication system
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LocalStrategy } from 'passport-local';
import { generateToken } from '../middleware/auth.js';
import { cacheService } from '../services/cacheService.js';
import { verifyPassword, hashPassword } from '../services/passwordHashingService.js';
import {
  encryptObjectSensitiveFields,
  decryptObjectSensitiveFields,
} from '../services/encryptionService.js';

/**
 * Mock user database for demonstration
 * In production, this would be replaced with actual database queries
 */
const getMockUsers = async () => {
  // Generate some test users with bcrypt hashes
  // Password: "TestPass123!" for all demo users
  const testPasswordHash =
    '$2b$12$K8Y8Z.9YX0qNg3H0yoI5aeSrPwJj3QjxlKHv6n4lE/JKwIEoXgEJW'; // pre-hashed for demo

  return [
    {
      id: 'local_demo_example_com',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'user',
      verified: true,
      passwordHash: testPasswordHash,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'local_admin_example_com',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      verified: true,
      passwordHash: testPasswordHash,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'local_test_act_org',
      email: 'test@act.org',
      name: 'ACT Test User',
      role: 'user',
      verified: true,
      passwordHash: testPasswordHash,
      createdAt: new Date('2024-01-01'),
    },
  ];
};

/**
 * User serialization for session management
 * Stores minimal user info in session
 */
passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
  });
});

/**
 * User deserialization from session
 * Reconstructs user object from session data
 */
passport.deserializeUser(async (sessionUser, done) => {
  try {
    // Try to get user from cache first
    const cacheKey = `user:${sessionUser.id}`;
    let user = await cacheService.get(cacheKey);

    if (!user) {
      // In production, fetch from database
      // For now, reconstruct from session data
      user = {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role || 'user',
        provider: 'oauth',
        verified: true,
        lastLogin: new Date(),
      };

      // Cache user for 15 minutes
      await cacheService.set(cacheKey, user, 900);
    }

    done(null, user);
  } catch (error) {
    console.error('❌ User deserialization failed:', error.message);
    done(error, null);
  }
});

/**
 * Google OAuth 2.0 Strategy
 * Handles Google authentication flow (only if credentials are provided)
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(
            '🔐 Google OAuth callback received for:',
            profile.emails?.[0]?.value
          );

          // Extract user information from Google profile
          const user = {
            id: `google_${profile.id}`,
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            provider: 'google',
            role: 'user', // Default role, can be upgraded
            verified: true,
            lastLogin: new Date(),
            accessToken: accessToken, // Store for API calls if needed
            refreshToken: refreshToken,
          };

          // Cache user profile for faster access
          const cacheKey = `user:${user.id}`;
          await cacheService.set(cacheKey, user, 1800); // 30 minutes

          // Log successful authentication
          console.log('✅ Google authentication successful:', {
            email: user.email,
            name: user.name,
            role: user.role,
          });

          return done(null, user);
        } catch (error) {
          console.error('❌ Google OAuth strategy error:', error.message);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.log(
    '⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET'
  );
}

/**
 * GitHub OAuth 2.0 Strategy
 * Handles GitHub authentication flow (only if credentials are provided)
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔐 GitHub OAuth callback received for:', profile.username);

          // Extract user information from GitHub profile
          const user = {
            id: `github_${profile.id}`,
            githubId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value,
            name: profile.displayName || profile.username,
            avatar: profile.photos?.[0]?.value,
            provider: 'github',
            role: 'user', // Default role, can be upgraded
            verified: true,
            lastLogin: new Date(),
            accessToken: accessToken,
            refreshToken: refreshToken,
            profileUrl: profile.profileUrl,
          };

          // Cache user profile
          const cacheKey = `user:${user.id}`;
          await cacheService.set(cacheKey, user, 1800); // 30 minutes

          console.log('✅ GitHub authentication successful:', {
            username: user.username,
            email: user.email,
            role: user.role,
          });

          return done(null, user);
        } catch (error) {
          console.error('❌ GitHub OAuth strategy error:', error.message);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.log(
    '⚠️ GitHub OAuth not configured - missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET'
  );
}

/**
 * Local Strategy for email/password authentication
 * Integrates with existing JWT system
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        console.log('🔐 Local authentication attempt for:', email);

        // Validate input
        if (!email || !password) {
          return done(null, false, { message: 'Email and password are required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return done(null, false, { message: 'Invalid email format' });
        }

        // TODO: In production, fetch user from database with stored password hash
        // For demonstration, we'll simulate a stored user with bcrypt hash
        const mockUsers = await getMockUsers();
        const storedUser = mockUsers.find(
          u => u.email.toLowerCase() === email.toLowerCase()
        );

        if (!storedUser) {
          console.log('❌ User not found:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Verify password using bcrypt v6+ with constant-time comparison
        console.log('🔐 Verifying password with bcrypt v6+');
        const passwordResult = await verifyPassword(password, storedUser.passwordHash);

        if (!passwordResult.valid) {
          console.log(
            '❌ Password verification failed:',
            passwordResult.reason || 'Invalid password'
          );
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Create user object (excluding password hash)
        const user = {
          id: storedUser.id,
          email: storedUser.email,
          name: storedUser.name,
          provider: 'local',
          role: storedUser.role || 'user',
          verified: storedUser.verified || false,
          lastLogin: new Date(),
          passwordVerified: true,
          verificationTiming: passwordResult.timing,
        };

        console.log('✅ Local authentication successful:', {
          email: user.email,
          role: user.role,
          timing: `${passwordResult.timing.toFixed(2)}ms`,
        });

        return done(null, user);
      } catch (error) {
        console.error('❌ Local strategy error:', error.message);
        return done(error, null);
      }
    }
  )
);

/**
 * Generate JWT token for OAuth authenticated user
 * Bridges OAuth authentication with existing JWT system
 */
export const generateOAuthJWT = user => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'user',
    provider: user.provider,
    verified: user.verified,
    iat: Math.floor(Date.now() / 1000),
  };

  return generateToken(payload);
};

/**
 * Middleware to check if user is authenticated via OAuth
 */
export const ensureOAuthAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // If not authenticated via OAuth, check for JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Let existing JWT middleware handle this
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required',
    message: 'Please log in via OAuth or provide a valid JWT token',
    redirectTo: '/auth/login',
  });
};

/**
 * Get authentication strategies status
 */
export const getAuthStrategiesStatus = () => {
  return {
    strategies: {
      google: {
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
      },
      github: {
        enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        callbackUrl: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
      },
      local: {
        enabled: true,
        endpoint: '/auth/login',
      },
    },
    session: {
      configured: !!process.env.SESSION_SECRET,
      redis: !!process.env.REDIS_URL,
    },
  };
};

export default passport;
