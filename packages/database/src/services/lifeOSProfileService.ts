/**
 * Life OS Profile Service
 * High-level operations for Life OS user profiles with Beautiful Obsolescence compliance
 */

import type { LifeOSProfile, User, Prisma } from '../../generated/client';
import { getPrismaClient } from '../index';

export class LifeOSProfileService {
  private prisma = getPrismaClient();

  /**
   * Create a new Life OS profile for a user
   */
  async createProfile(
    userId: string,
    profileData?: Partial<
      Omit<LifeOSProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<LifeOSProfile> {
    return this.prisma.lifeOSProfile.create({
      data: {
        userId,
        // Australian defaults
        timezone: profileData?.timezone || 'Australia/Sydney',
        locale: profileData?.locale || 'en-AU',
        currency: profileData?.currency || 'AUD',
        dataResidencyPreference: profileData?.dataResidencyPreference || 'Australia',

        // Beautiful Obsolescence defaults
        extractiveSystemsTargeting: profileData?.extractiveSystemsTargeting ?? true,
        communityControlEnabled: profileData?.communityControlEnabled ?? true,

        // Override any other provided data
        ...profileData,
      },
    });
  }

  /**
   * Get Life OS profile by user ID
   */
  async getProfileByUserId(userId: string): Promise<LifeOSProfile | null> {
    return this.prisma.lifeOSProfile.findUnique({
      where: { userId },
    });
  }

  /**
   * Get or create Life OS profile for a user
   */
  async getOrCreateProfile(userId: string): Promise<LifeOSProfile> {
    const existing = await this.getProfileByUserId(userId);
    if (existing) return existing;

    return this.createProfile(userId);
  }

  /**
   * Update Life OS profile settings
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<LifeOSProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<LifeOSProfile> {
    return this.prisma.lifeOSProfile.update({
      where: { userId },
      data: {
        ...updates,
        lastActiveAt: new Date(), // Update activity timestamp
      },
    });
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Record<string, any>
  ): Promise<LifeOSProfile> {
    return this.updateProfile(userId, {
      notificationSettings: settings,
    });
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Record<string, any>
  ): Promise<LifeOSProfile> {
    return this.updateProfile(userId, {
      privacySettings: settings,
    });
  }

  /**
   * Mark user as active (update lastActiveAt)
   */
  async recordActivity(userId: string): Promise<void> {
    await this.prisma.lifeOSProfile.update({
      where: { userId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(userId: string): Promise<LifeOSProfile> {
    return this.updateProfile(userId, {
      onboardingCompleted: true,
      activationDate: new Date(),
    });
  }

  /**
   * Get profiles by data residency preference (for Australian compliance)
   */
  async getProfilesByDataResidency(
    residency: string = 'Australia'
  ): Promise<LifeOSProfile[]> {
    return this.prisma.lifeOSProfile.findMany({
      where: { dataResidencyPreference: residency },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get profiles targeting extractive systems (Beautiful Obsolescence tracking)
   */
  async getProfilesTargetingExtractiveSystems(): Promise<LifeOSProfile[]> {
    return this.prisma.lifeOSProfile.findMany({
      where: {
        extractiveSystemsTargeting: true,
        communityControlEnabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get profile with full user details and relationships
   */
  async getFullProfile(userId: string): Promise<
    | (LifeOSProfile & {
        user: User;
        habits: any[];
        goals: any[];
        transactions: any[];
        budgets: any[];
      })
    | null
  > {
    return this.prisma.lifeOSProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        habits: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        goals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          take: 10,
          orderBy: { transactionDate: 'desc' },
        },
        budgets: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get activity statistics for a profile
   */
  async getActivityStats(userId: string): Promise<{
    totalHabits: number;
    activeHabits: number;
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTransactions: number;
    activeBudgets: number;
    daysActive: number;
  }> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    const [
      totalHabits,
      activeHabits,
      totalGoals,
      activeGoals,
      completedGoals,
      totalTransactions,
      activeBudgets,
    ] = await Promise.all([
      this.prisma.habit.count({ where: { profileId: profile.id } }),
      this.prisma.habit.count({ where: { profileId: profile.id, isActive: true } }),
      this.prisma.goal.count({ where: { profileId: profile.id } }),
      this.prisma.goal.count({ where: { profileId: profile.id, status: 'ACTIVE' } }),
      this.prisma.goal.count({ where: { profileId: profile.id, status: 'COMPLETED' } }),
      this.prisma.financialTransaction.count({ where: { profileId: profile.id } }),
      this.prisma.budget.count({ where: { profileId: profile.id, isActive: true } }),
    ]);

    // Calculate days active since profile creation
    const daysActive = Math.floor(
      (new Date().getTime() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalHabits,
      activeHabits,
      totalGoals,
      activeGoals,
      completedGoals,
      totalTransactions,
      activeBudgets,
      daysActive,
    };
  }

  /**
   * Delete Life OS profile and all related data
   * This is a GDPR/privacy compliant deletion
   */
  async deleteProfile(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    if (!profile) throw new Error('Profile not found');

    // Delete in order to respect foreign key constraints
    await this.prisma.$transaction(async tx => {
      // Delete habit completions first
      await tx.habitCompletion.deleteMany({
        where: { habit: { profileId: profile.id } },
      });

      // Delete goal updates and milestones
      await tx.goalUpdate.deleteMany({
        where: { goal: { profileId: profile.id } },
      });
      await tx.goalMilestone.deleteMany({
        where: { goal: { profileId: profile.id } },
      });

      // Delete main entities
      await tx.habit.deleteMany({ where: { profileId: profile.id } });
      await tx.goal.deleteMany({ where: { profileId: profile.id } });
      await tx.meditationSession.deleteMany({ where: { profileId: profile.id } });
      await tx.moodEntry.deleteMany({ where: { profileId: profile.id } });
      await tx.journal.deleteMany({ where: { profileId: profile.id } });
      await tx.financialTransaction.deleteMany({ where: { profileId: profile.id } });
      await tx.budget.deleteMany({ where: { profileId: profile.id } });

      // Finally delete the profile
      await tx.lifeOSProfile.delete({ where: { id: profile.id } });
    });
  }
}
