/**
 * User Resolvers
 * GraphQL resolvers for user management with data source integration
 */

import { PubSub } from 'graphql-subscriptions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pubsub = new PubSub();

export const userResolvers = {
  Query: {
    // Get current user profile
    me: async (parent, args, context) => {
      if (!context.isAuthenticated) {
        throw new Error('Authentication required');
      }

      try {
        const user = await context.dataSources.supabase.query('users', {
          eq: { id: context.user.id },
          select: `
            id, email, name, username, role, status,
            profile:user_profiles(
              bio, cultural_background, location,
              skills, interests, created_at, updated_at
            )
          `,
        });

        if (!user || user.length === 0) {
          throw new Error('User not found');
        }

        return user[0];
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw new Error('Failed to fetch user profile');
      }
    },

    // Get user by ID
    user: async (parent, { id }, context) => {
      try {
        const user = await context.dataSources.supabase.query('users', {
          eq: { id },
          select: `
            id, name, username, role, status, created_at,
            profile:user_profiles(
              bio, cultural_background, location,
              skills, interests, privacy_settings
            )
          `,
        });

        if (!user || user.length === 0) {
          return null;
        }

        // Check privacy settings
        const userProfile = user[0];
        if (
          userProfile.profile?.privacy_settings?.profile_visibility === 'private' &&
          context.user?.id !== id
        ) {
          return {
            id: userProfile.id,
            name: userProfile.name,
            username: userProfile.username,
            role: userProfile.role,
            created_at: userProfile.created_at,
          };
        }

        return userProfile;
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('Failed to fetch user');
      }
    },

    // Search users with cultural safety
    searchUsers: async (
      parent,
      { query, culturalSafety = 80, limit = 20 },
      context
    ) => {
      try {
        const users = await context.dataSources.supabase.query('users', {
          textSearch: { column: 'search_vector', query },
          gte: { cultural_safety_score: culturalSafety },
          limit,
          orderBy: { column: 'created_at', ascending: false },
          select: `
            id, name, username, role, cultural_safety_score,
            profile:user_profiles(
              bio, cultural_background, location, skills
            )
          `,
        });

        return users || [];
      } catch (error) {
        console.error('Error searching users:', error);
        throw new Error('Failed to search users');
      }
    },

    // Get user collaborations from Neo4j
    userCollaborations: async (parent, { userId }, context) => {
      if (!context.dataSources.neo4j) {
        throw new Error('Graph database not available');
      }

      try {
        const collaborations =
          await context.dataSources.neo4j.findUserCollaborations(userId);
        return collaborations;
      } catch (error) {
        console.error('Error fetching user collaborations:', error);
        throw new Error('Failed to fetch collaborations');
      }
    },
  },

  Mutation: {
    // User registration
    registerUser: async (parent, { input }, context) => {
      const { email, password, name, username, culturalBackground } = input;

      try {
        // Check if user exists
        const existingUser = await context.dataSources.supabase.query('users', {
          eq: { email },
          select: 'id',
        });

        if (existingUser && existingUser.length > 0) {
          throw new Error('User already exists with this email');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = await context.dataSources.supabase.insert(
          'users',
          {
            email,
            password_hash: hashedPassword,
            name,
            username,
            role: 'community_member',
            status: 'active',
            cultural_safety_score: 95, // Default high score for new users
          },
          { returning: 'id, email, name, username, role' }
        );

        if (!newUser || newUser.length === 0) {
          throw new Error('Failed to create user');
        }

        const user = newUser[0];

        // Create user profile
        await context.dataSources.supabase.insert('user_profiles', {
          user_id: user.id,
          cultural_background: culturalBackground,
          bio: '',
          privacy_settings: {
            profile_visibility: 'public',
            activity_visibility: 'community',
            contact_preferences: 'community_only',
          },
        });

        // Create user node in Neo4j
        if (context.dataSources.neo4j) {
          await context.dataSources.neo4j.createUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            culturalBackground,
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Cache user session
        if (context.dataSources.redis) {
          await context.dataSources.redis.cacheUserSession(
            user.id,
            { id: user.id, email: user.email, role: user.role },
            3600 * 24 * 7 // 7 days
          );
        }

        // Publish subscription
        pubsub.publish('USER_REGISTERED', {
          userRegistered: user,
        });

        return {
          success: true,
          user,
          token,
          message: 'User registered successfully',
        };
      } catch (error) {
        console.error('Registration error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // User login
    loginUser: async (parent, { email, password }, context) => {
      try {
        // Find user
        const users = await context.dataSources.supabase.query('users', {
          eq: { email },
          select: 'id, email, password_hash, name, username, role, status',
        });

        if (!users || users.length === 0) {
          throw new Error('Invalid credentials');
        }

        const user = users[0];

        if (user.status !== 'active') {
          throw new Error('Account is not active');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Cache user session
        if (context.dataSources.redis) {
          await context.dataSources.redis.cacheUserSession(
            user.id,
            { id: user.id, email: user.email, role: user.role },
            3600 * 24 * 7 // 7 days
          );

          // Track user activity
          await context.dataSources.redis.trackUserActivity(user.id, {
            action: 'login',
            ip: context.req?.ip,
            userAgent: context.req?.get('User-Agent'),
          });
        }

        // Remove password hash from response
        const { password_hash, ...userResponse } = user;

        return {
          success: true,
          user: userResponse,
          token,
          message: 'Login successful',
        };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // Update user profile
    updateUserProfile: async (parent, { input }, context) => {
      if (!context.isAuthenticated) {
        throw new Error('Authentication required');
      }

      try {
        const {
          bio,
          culturalBackground,
          location,
          skills,
          interests,
          privacySettings,
        } = input;

        // Update user profile
        const updatedProfile = await context.dataSources.supabase.update(
          'user_profiles',
          {
            bio,
            cultural_background: culturalBackground,
            location,
            skills,
            interests,
            privacy_settings: privacySettings,
            updated_at: new Date().toISOString(),
          },
          { eq: { user_id: context.user.id } },
          { returning: '*' }
        );

        if (!updatedProfile || updatedProfile.length === 0) {
          throw new Error('Profile not found');
        }

        // Update cached user data
        if (context.dataSources.redis) {
          await context.dataSources.redis.del(`user:${context.user.id}`);
        }

        // Publish subscription
        pubsub.publish('USER_PROFILE_UPDATED', {
          userProfileUpdated: {
            userId: context.user.id,
            profile: updatedProfile[0],
          },
        });

        return {
          success: true,
          profile: updatedProfile[0],
          message: 'Profile updated successfully',
        };
      } catch (error) {
        console.error('Profile update error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  },

  Subscription: {
    // User registration events
    userRegistered: {
      subscribe: () => pubsub.asyncIterator(['USER_REGISTERED']),
    },

    // Profile update events
    userProfileUpdated: {
      subscribe: () => pubsub.asyncIterator(['USER_PROFILE_UPDATED']),
    },

    // User activity stream
    userActivity: {
      subscribe: (parent, { userId }, context) => {
        if (!context.isAuthenticated || context.user.id !== userId) {
          throw new Error('Unauthorized');
        }
        return pubsub.asyncIterator([`USER_ACTIVITY_${userId}`]);
      },
    },
  },

  // Type resolvers
  User: {
    // Resolve user projects
    projects: async (parent, args, context) => {
      try {
        const projects = await context.dataSources.supabase.query('projects', {
          eq: { created_by: parent.id },
          orderBy: { column: 'created_at', ascending: false },
          select: `
            id, title, description, status, cultural_safety_score,
            created_at, updated_at
          `,
        });
        return projects || [];
      } catch (error) {
        console.error('Error fetching user projects:', error);
        return [];
      }
    },

    // Resolve user stories
    stories: async (parent, args, context) => {
      try {
        const stories = await context.dataSources.supabase.query('stories', {
          eq: { author_id: parent.id },
          orderBy: { column: 'created_at', ascending: false },
          select: `
            id, title, content_preview, status, cultural_safety_score,
            created_at, updated_at
          `,
        });
        return stories || [];
      } catch (error) {
        console.error('Error fetching user stories:', error);
        return [];
      }
    },

    // Resolve user activity from Redis
    recentActivity: async (parent, { limit = 10 }, context) => {
      if (!context.dataSources.redis) {
        return [];
      }

      try {
        const activities = await context.dataSources.redis.getUserActivity(
          parent.id,
          limit
        );
        return activities || [];
      } catch (error) {
        console.error('Error fetching user activity:', error);
        return [];
      }
    },

    // Resolve user network metrics from Neo4j
    networkMetrics: async (parent, args, context) => {
      if (!context.dataSources.neo4j) {
        return null;
      }

      try {
        const metrics = await context.dataSources.neo4j.calculateNetworkMetrics(
          parent.id,
          'User'
        );
        return metrics;
      } catch (error) {
        console.error('Error fetching network metrics:', error);
        return null;
      }
    },
  },
};
