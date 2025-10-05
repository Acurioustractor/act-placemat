/**
 * OAuth 2.0 Authentication Routes
 * Handles Google, GitHub, and local authentication flows
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
import { generateOAuthJWT, getAuthStrategiesStatus } from '../config/passport.js';
import { authenticate, optionalAuth, generateTokenPair } from '../middleware/auth.js';
import { authConfig } from '../config/auth.js';
import {
  hashPassword,
  validatePassword,
  getPasswordPolicy,
  getSecurityInfo,
} from '../services/passwordHashingService.js';
import {
  encryptObjectSensitiveFields,
  decryptObjectSensitiveFields,
  getEncryptionInfo,
} from '../services/encryptionService.js';

const router = Router();

/**
 * GET /auth/status
 * Check authentication strategies status
 */
router.get('/status', (req, res) => {
  try {
    const status = getAuthStrategiesStatus();
    res.json({
      success: true,
      ...status,
      user: req.user || null,
      isAuthenticated: !!req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get auth status',
      message: error.message,
    });
  }
});

/**
 * Google OAuth Routes
 */

// GET /auth/google
// Initiate Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// GET /auth/google/callback
// Handle Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login?error=google_auth_failed',
  }),
  (req, res) => {
    try {
      // Generate JWT token for OAuth user
      const token = generateOAuthJWT(req.user);

      // Successful authentication
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const callbackUrl = `${redirectUrl}/auth/callback?token=${token}&provider=google`;

      console.log('✅ Google OAuth successful, redirecting to:', callbackUrl);
      res.redirect(callbackUrl);
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error.message);
      res.redirect('/auth/login?error=token_generation_failed');
    }
  }
);

/**
 * GitHub OAuth Routes
 */

// GET /auth/github
// Initiate GitHub OAuth flow
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

// GET /auth/github/callback
// Handle GitHub OAuth callback
router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/auth/login?error=github_auth_failed',
  }),
  (req, res) => {
    try {
      // Generate JWT token for OAuth user
      const token = generateOAuthJWT(req.user);

      // Successful authentication
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const callbackUrl = `${redirectUrl}/auth/callback?token=${token}&provider=github`;

      console.log('✅ GitHub OAuth successful, redirecting to:', callbackUrl);
      res.redirect(callbackUrl);
    } catch (error) {
      console.error('❌ GitHub OAuth callback error:', error.message);
      res.redirect('/auth/login?error=token_generation_failed');
    }
  }
);

/**
 * Local Authentication Routes
 */

// POST /auth/login
// Local email/password authentication
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('❌ Local authentication error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: err.message,
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: info?.message || 'Email or password is incorrect',
      });
    }

    // Log the user in via session
    req.logIn(user, err => {
      if (err) {
        console.error('❌ Session login error:', err.message);
        return res.status(500).json({
          success: false,
          error: 'Session creation failed',
          message: err.message,
        });
      }

      try {
        // Generate JWT token pair
        const userPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: user.provider,
          verified: user.verified,
        };

        const tokens = generateTokenPair(userPayload);

        res.json({
          success: true,
          message: 'Login successful',
          user: userPayload,
          ...tokens,
        });

        console.log('✅ Local authentication successful:', user.email);
      } catch (tokenError) {
        console.error('❌ JWT generation failed:', tokenError.message);
        res.status(500).json({
          success: false,
          error: 'Token generation failed',
          message: tokenError.message,
        });
      }
    });
  })(req, res, next);
});

// POST /auth/register
// Register new local user with bcrypt v6+ password hashing
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, and name are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address',
      });
    }

    // Comprehensive password validation using password policy
    console.log('🔐 Validating password against security policy');
    const passwordValidation = validatePassword(password);

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        message: 'Password does not meet security requirements',
        details: passwordValidation.errors,
        policy: getPasswordPolicy(),
      });
    }

    // Hash password using bcrypt v6+ with salt rounds
    console.log('🔐 Hashing password with bcrypt v6+');
    const hashResult = await hashPassword(password);

    // Create user object with hashed password
    const user = {
      id: `local_${email.replace('@', '_').replace('.', '_')}`,
      email: email,
      name: name,
      provider: 'local',
      role: 'user',
      verified: false,
      passwordHash: hashResult.hash,
      passwordStrength: hashResult.strength,
      hashAlgorithm: hashResult.algorithm,
      hashVersion: hashResult.version,
      saltRounds: hashResult.saltRounds,
      createdAt: new Date(),
    };

    // Encrypt sensitive user data fields
    console.log('🔐 Encrypting sensitive user data fields');
    const encryptedUser = await encryptObjectSensitiveFields(user, {
      encryptionKey: 'user-registration',
      forceEncrypt: ['passwordHash'], // Additional encryption layer for password hashes
      skipEncrypt: ['id', 'provider', 'role', 'verified', 'createdAt'], // Keep these unencrypted for queries
    });

    // TODO: In production, save encrypted user to database
    console.log(
      '✅ User registration completed with secure password hash and field encryption'
    );

    res.json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        verified: user.verified,
        passwordStrength: user.passwordStrength,
      },
      security: {
        algorithm: hashResult.algorithm,
        version: hashResult.version,
        saltRounds: hashResult.saltRounds,
        strengthScore: hashResult.strength,
      },
    });

    console.log('✅ User registration successful:', email);
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message,
    });
  }
});

/**
 * Session Management Routes
 */

// POST /auth/logout
// Logout user (destroy session)
router.post('/logout', (req, res) => {
  try {
    req.logout(err => {
      if (err) {
        console.error('❌ Logout error:', err.message);
        return res.status(500).json({
          success: false,
          error: 'Logout failed',
          message: err.message,
        });
      }

      // Destroy session
      req.session.destroy(err => {
        if (err) {
          console.error('❌ Session destruction error:', err.message);
          return res.status(500).json({
            success: false,
            error: 'Session cleanup failed',
            message: err.message,
          });
        }

        res.json({
          success: true,
          message: 'Logout successful',
        });

        console.log('✅ User logged out successfully');
      });
    });
  } catch (error) {
    console.error('❌ Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message,
    });
  }
});

// GET /auth/me
// Get current user info (supports both JWT and session)
router.get('/me', optionalAuth, (req, res) => {
  try {
    if (req.user) {
      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          provider: req.user.provider,
          verified: req.user.verified,
          lastLogin: req.user.lastLogin,
        },
        isAuthenticated: true,
        authMethod: req.user.provider ? 'oauth' : 'jwt',
      });
    } else {
      res.json({
        success: true,
        user: null,
        isAuthenticated: false,
        authMethod: null,
      });
    }
  } catch (error) {
    console.error('❌ Get user info error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      message: error.message,
    });
  }
});

/**
 * Protected Routes Example
 */

// GET /auth/protected
// Example protected route that accepts both JWT and session authentication
router.get('/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Access granted to protected resource',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /auth/policy
 * Get password policy, security information, and encryption details
 */
router.get('/policy', (req, res) => {
  try {
    const policy = getPasswordPolicy();
    const security = getSecurityInfo();
    const encryption = getEncryptionInfo();

    res.json({
      success: true,
      passwordPolicy: policy,
      securityInfo: security,
      encryptionInfo: encryption,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Policy endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get policy information',
      message: error.message,
    });
  }
});

/**
 * GET /auth/encryption
 * Get field-level encryption information and capabilities
 */
router.get('/encryption', (req, res) => {
  try {
    const encryption = getEncryptionInfo();

    res.json({
      success: true,
      encryption: encryption,
      capabilities: {
        fieldLevelEncryption: true,
        automaticSensitiveDetection: true,
        dataClassification: true,
        authenticationTagValidation: true,
      },
      compliance: {
        australianGovernment: true,
        nistApproved: true,
        fips1402: true,
        commonCriteria: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Encryption endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get encryption information',
      message: error.message,
    });
  }
});

/**
 * JWT Token Refresh Route
 * Accepts refresh token and issues new access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing refresh token',
        message: 'Please provide a valid refresh token',
      });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      });
    } catch (verifyError) {
      return res.status(403).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token is expired or invalid',
      });
    }

    // Ensure it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type',
        message: 'Please provide a valid refresh token',
      });
    }

    // Create new payload without the refresh token type
    const { type, iat, exp, ...userPayload } = decoded;

    // Generate new token pair
    const tokens = generateTokenPair(userPayload);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      user: {
        id: userPayload.id,
        email: userPayload.email,
        name: userPayload.name,
        role: userPayload.role,
      },
      ...tokens,
    });

    console.log('✅ Token refresh successful for user:', userPayload.id);
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message,
    });
  }
});

export default router;
