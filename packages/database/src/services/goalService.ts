/**
 * Goal Service
 * SMART goals management with milestone tracking and progress analytics
 * Supports Beautiful Obsolescence community benefit goals
 */

import type {
  Goal,
  GoalMilestone,
  GoalUpdate,
  GoalStatus,
  Priority,
} from '../../generated/client';
import { getPrismaClient } from '../index';

export class GoalService {
  private prisma = getPrismaClient();

  /**
   * Create a new SMART goal
   */
  async createGoal(
    profileId: string,
    goalData: {
      title: string;
      description?: string;
      category?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      targetDate: Date;
      priority?: Priority;
      isPublic?: boolean;
      communityBenefit?: boolean;
      beautifulObsolescenceAlignment?: number;
      extractiveAlternative?: string;
      requiredSkills?: string[];
      color?: string;
      icon?: string;
    }
  ): Promise<Goal> {
    return this.prisma.goal.create({
      data: {
        profileId,
        status: 'ACTIVE',
        progress: 0,
        // Australian defaults
        timezone: 'Australia/Sydney',
        ...goalData,
      },
    });
  }

  /**
   * Get all active goals for a profile
   */
  async getActiveGoals(profileId: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: {
        profileId,
        status: 'ACTIVE',
      },
      orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get goal with milestones and recent updates
   */
  async getGoalWithDetails(goalId: string): Promise<
    | (Goal & {
        milestones: GoalMilestone[];
        updates: GoalUpdate[];
      })
    | null
  > {
    return this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    goalId: string,
    currentValue: number,
    notes?: string
  ): Promise<Goal> {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Calculate progress percentage
    const targetValue = goal.targetValue || 100;
    const progress = Math.min((currentValue / targetValue) * 100, 100);
    const status: GoalStatus = progress >= 100 ? 'COMPLETED' : goal.status;

    // Update goal and create update record
    const [updatedGoal] = await this.prisma.$transaction([
      this.prisma.goal.update({
        where: { id: goalId },
        data: {
          currentValue,
          progress,
          status,
          updatedAt: new Date(),
        },
      }),
      this.prisma.goalUpdate.create({
        data: {
          goalId,
          previousValue: goal.currentValue || 0,
          newValue: currentValue,
          progressChange: progress - goal.progress,
          notes,
        },
      }),
    ]);

    // Check if any milestones were reached
    await this.checkMilestoneCompletion(goalId, currentValue);

    return updatedGoal;
  }

  /**
   * Add milestone to goal
   */
  async addMilestone(
    goalId: string,
    milestoneData: {
      title: string;
      description?: string;
      targetValue: number;
      targetDate?: Date;
      isRequired?: boolean;
      reward?: string;
    }
  ): Promise<GoalMilestone> {
    return this.prisma.goalMilestone.create({
      data: {
        goalId,
        status: 'PENDING',
        ...milestoneData,
      },
    });
  }

  /**
   * Check and complete milestones based on current progress
   */
  private async checkMilestoneCompletion(
    goalId: string,
    currentValue: number
  ): Promise<void> {
    const incompleteMilestones = await this.prisma.goalMilestone.findMany({
      where: {
        goalId,
        status: 'PENDING',
        targetValue: { lte: currentValue },
      },
      orderBy: { targetValue: 'asc' },
    });

    if (incompleteMilestones.length > 0) {
      await this.prisma.goalMilestone.updateMany({
        where: {
          id: { in: incompleteMilestones.map(m => m.id) },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get goal analytics for a profile
   */
  async getGoalAnalytics(
    profileId: string,
    days: number = 30
  ): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    avgProgress: number;
    avgBeautifulObsolescenceAlignment: number;
    goalsByCategory: Array<{ category: string; count: number }>;
    goalsByPriority: Array<{ priority: Priority; count: number }>;
    communityBenefitGoals: number;
    progressTrend: Array<{ date: Date; totalProgress: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const goals = await this.prisma.goal.findMany({
      where: { profileId },
      include: {
        updates: {
          where: { createdAt: { gte: startDate } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === 'ACTIVE').length;
    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const communityBenefitGoals = goals.filter(g => g.communityBenefit).length;

    const avgProgress =
      totalGoals > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / totalGoals : 0;

    const alignmentScores = goals.filter(
      g => g.beautifulObsolescenceAlignment !== null
    );
    const avgBeautifulObsolescenceAlignment =
      alignmentScores.length > 0
        ? alignmentScores.reduce(
            (sum, g) => sum + (g.beautifulObsolescenceAlignment || 0),
            0
          ) / alignmentScores.length
        : 0;

    // Category distribution
    const categoryCount = goals.reduce(
      (acc, goal) => {
        const category = goal.category || 'Uncategorised';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const goalsByCategory = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Priority distribution
    const priorityCount = goals.reduce(
      (acc, goal) => {
        const priority = goal.priority || 'MEDIUM';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      },
      {} as Record<Priority, number>
    );

    const goalsByPriority = Object.entries(priorityCount).map(([priority, count]) => ({
      priority: priority as Priority,
      count,
    }));

    // Progress trend (simplified - would need more sophisticated trending in production)
    const progressTrend = await this.getProgressTrend(profileId, days);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      avgProgress,
      avgBeautifulObsolescenceAlignment,
      goalsByCategory,
      goalsByPriority,
      communityBenefitGoals,
      progressTrend,
    };
  }

  /**
   * Get progress trend over time
   */
  private async getProgressTrend(
    profileId: string,
    days: number
  ): Promise<Array<{ date: Date; totalProgress: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all goal updates in date range
    const updates = await this.prisma.goalUpdate.findMany({
      where: {
        goal: { profileId },
        createdAt: { gte: startDate },
      },
      include: { goal: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date and calculate cumulative progress
    const trendMap = new Map<string, number>();

    updates.forEach(update => {
      const dateKey = update.createdAt.toISOString().split('T')[0];
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, 0);
      }
      trendMap.set(dateKey, trendMap.get(dateKey)! + update.progressChange);
    });

    return Array.from(trendMap.entries())
      .map(([dateStr, totalProgress]) => ({
        date: new Date(dateStr),
        totalProgress,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Update goal settings
   */
  async updateGoal(
    goalId: string,
    updates: Partial<Omit<Goal, 'id' | 'profileId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Goal> {
    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Change goal status
   */
  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<Goal> {
    return this.updateGoal(goalId, { status });
  }

  /**
   * Get goals supporting Beautiful Obsolescence initiatives
   */
  async getBeautifulObsolescenceGoals(minAlignment: number = 7.0): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: {
        beautifulObsolescenceAlignment: { gte: minAlignment },
        communityBenefit: true,
      },
      orderBy: { beautifulObsolescenceAlignment: 'desc' },
    });
  }

  /**
   * Get community goals that others can support
   */
  async getCommunityGoals(location?: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: {
        isPublic: true,
        communityBenefit: true,
        status: 'ACTIVE',
        ...(location && {
          profile: {
            user: {
              location: { contains: location },
            },
          },
        }),
      },
      include: {
        profile: {
          include: {
            user: {
              select: {
                name: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: [{ beautifulObsolescenceAlignment: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Delete goal and all related data
   */
  async deleteGoal(goalId: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // Delete updates and milestones first
      await tx.goalUpdate.deleteMany({ where: { goalId } });
      await tx.goalMilestone.deleteMany({ where: { goalId } });

      // Delete the goal
      await tx.goal.delete({ where: { id: goalId } });
    });
  }
}
