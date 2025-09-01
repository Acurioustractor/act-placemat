/**
 * Habit Tracking Service
 * Business logic for habit creation, completion tracking, and streak calculation
 */

import type { Habit, HabitCompletion, HabitFrequency } from '../../generated/client';
import { getPrismaClient } from '../index';

export class HabitService {
  private prisma = getPrismaClient();

  /**
   * Create a new habit
   */
  async createHabit(
    profileId: string,
    habitData: {
      name: string;
      description?: string;
      category?: string;
      frequency?: HabitFrequency;
      targetValue?: number;
      unit?: string;
      color?: string;
      icon?: string;
      reminder?: Record<string, any>;
    }
  ): Promise<Habit> {
    return this.prisma.habit.create({
      data: {
        profileId,
        ...habitData,
      },
    });
  }

  /**
   * Get all active habits for a profile
   */
  async getActiveHabits(profileId: string): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: {
        profileId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get habit by ID with recent completions
   */
  async getHabitWithCompletions(
    habitId: string,
    days: number = 30
  ): Promise<(Habit & { completions: HabitCompletion[] }) | null> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          where: {
            completedAt: {
              gte: startDate,
            },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Complete a habit (record completion)
   */
  async completeHabit(
    habitId: string,
    completionData?: {
      value?: number;
      notes?: string;
      satisfaction?: number;
      difficulty?: number;
      completedAt?: Date;
    }
  ): Promise<HabitCompletion> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      throw new Error('Habit not found');
    }

    const completedAt = completionData?.completedAt || new Date();

    // Create the completion record
    const completion = await this.prisma.habitCompletion.create({
      data: {
        habitId,
        completedAt,
        value: completionData?.value || 1,
        notes: completionData?.notes,
        satisfaction: completionData?.satisfaction,
        difficulty: completionData?.difficulty,
      },
    });

    // Update streak and last completed date
    await this.updateStreakData(habitId, completedAt);

    return completion;
  }

  /**
   * Update streak calculation for a habit
   */
  private async updateStreakData(habitId: string, completedAt: Date): Promise<void> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 100, // Look at last 100 completions for streak calculation
        },
      },
    });

    if (!habit) return;

    const currentStreak = this.calculateCurrentStreak(
      habit.completions,
      habit.frequency
    );
    const longestStreak = Math.max(habit.longestStreak, currentStreak);

    await this.prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        longestStreak,
        lastCompletedDate: completedAt,
      },
    });
  }

  /**
   * Calculate current streak based on completions and frequency
   */
  private calculateCurrentStreak(
    completions: HabitCompletion[],
    frequency: HabitFrequency
  ): number {
    if (completions.length === 0) return 0;

    const sortedCompletions = completions.sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today

    const frequencyDays = this.getFrequencyDays(frequency);

    for (let i = 0; i < sortedCompletions.length; i++) {
      const completion = sortedCompletions[i];
      const completionDate = new Date(completion.completedAt);
      completionDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor(
        (currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if this completion fits the streak pattern
      if (daysDifference <= frequencyDays) {
        streak++;
        // Move to next expected completion date
        currentDate = new Date(
          completionDate.getTime() - frequencyDays * 24 * 60 * 60 * 1000
        );
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }

  /**
   * Get frequency in days for streak calculation
   */
  private getFrequencyDays(frequency: HabitFrequency): number {
    switch (frequency) {
      case 'DAILY':
        return 1;
      case 'WEEKLY':
        return 7;
      case 'MONTHLY':
        return 30;
      case 'CUSTOM':
        return 1; // Default to daily for custom frequency
      default:
        return 1;
    }
  }

  /**
   * Get habit completion stats for a date range
   */
  async getCompletionStats(
    habitId: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<{
    totalCompletions: number;
    averageValue: number;
    averageSatisfaction: number;
    completionRate: number;
    expectedCompletions: number;
  }> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          where: {
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    if (!habit) {
      throw new Error('Habit not found');
    }

    const completions = habit.completions;
    const totalCompletions = completions.length;
    const averageValue =
      totalCompletions > 0
        ? completions.reduce((sum, c) => sum + c.value, 0) / totalCompletions
        : 0;

    const satisfactionValues = completions.filter(c => c.satisfaction !== null);
    const averageSatisfaction =
      satisfactionValues.length > 0
        ? satisfactionValues.reduce((sum, c) => sum + (c.satisfaction || 0), 0) /
          satisfactionValues.length
        : 0;

    // Calculate expected completions based on frequency and date range
    const daysDifference = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const frequencyDays = this.getFrequencyDays(habit.frequency);
    const expectedCompletions = Math.ceil(daysDifference / frequencyDays);

    const completionRate =
      expectedCompletions > 0 ? totalCompletions / expectedCompletions : 0;

    return {
      totalCompletions,
      averageValue,
      averageSatisfaction,
      completionRate,
      expectedCompletions,
    };
  }

  /**
   * Get habit analytics for a profile
   */
  async getHabitAnalytics(
    profileId: string,
    days: number = 30
  ): Promise<{
    totalHabits: number;
    activeHabits: number;
    avgCurrentStreak: number;
    avgCompletionRate: number;
    topCategories: Array<{ category: string; count: number }>;
    streakDistribution: Array<{ range: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const habits = await this.prisma.habit.findMany({
      where: { profileId },
      include: {
        completions: {
          where: {
            completedAt: { gte: startDate },
          },
        },
      },
    });

    const totalHabits = habits.length;
    const activeHabits = habits.filter(h => h.isActive).length;
    const avgCurrentStreak =
      habits.length > 0
        ? habits.reduce((sum, h) => sum + h.currentStreak, 0) / habits.length
        : 0;

    // Calculate average completion rate
    const completionRates = await Promise.all(
      habits.map(async habit => {
        const stats = await this.getCompletionStats(habit.id, startDate);
        return stats.completionRate;
      })
    );
    const avgCompletionRate =
      completionRates.length > 0
        ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length
        : 0;

    // Top categories
    const categoryCount = habits.reduce(
      (acc, habit) => {
        const category = habit.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Streak distribution
    const streakRanges = [
      { range: '0-7 days', min: 0, max: 7 },
      { range: '8-21 days', min: 8, max: 21 },
      { range: '22-50 days', min: 22, max: 50 },
      { range: '51+ days', min: 51, max: Infinity },
    ];

    const streakDistribution = streakRanges.map(({ range, min, max }) => ({
      range,
      count: habits.filter(h => h.currentStreak >= min && h.currentStreak <= max)
        .length,
    }));

    return {
      totalHabits,
      activeHabits,
      avgCurrentStreak,
      avgCompletionRate,
      topCategories,
      streakDistribution,
    };
  }

  /**
   * Update habit settings
   */
  async updateHabit(
    habitId: string,
    updates: Partial<
      Omit<
        Habit,
        | 'id'
        | 'profileId'
        | 'createdAt'
        | 'updatedAt'
        | 'currentStreak'
        | 'longestStreak'
        | 'lastCompletedDate'
      >
    >
  ): Promise<Habit> {
    return this.prisma.habit.update({
      where: { id: habitId },
      data: updates,
    });
  }

  /**
   * Deactivate a habit (soft delete)
   */
  async deactivateHabit(habitId: string): Promise<Habit> {
    return this.updateHabit(habitId, { isActive: false });
  }

  /**
   * Reactivate a habit
   */
  async reactivateHabit(habitId: string): Promise<Habit> {
    return this.updateHabit(habitId, { isActive: true });
  }

  /**
   * Delete habit completion
   */
  async deleteCompletion(completionId: string): Promise<void> {
    const completion = await this.prisma.habitCompletion.findUnique({
      where: { id: completionId },
      include: { habit: true },
    });

    if (!completion) {
      throw new Error('Completion not found');
    }

    await this.prisma.habitCompletion.delete({
      where: { id: completionId },
    });

    // Recalculate streaks after deletion
    await this.recalculateStreaks(completion.habitId);
  }

  /**
   * Recalculate streaks for a habit (useful after deletion or bulk operations)
   */
  private async recalculateStreaks(habitId: string): Promise<void> {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        completions: {
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!habit) return;

    const currentStreak = this.calculateCurrentStreak(
      habit.completions,
      habit.frequency
    );
    const longestStreak = this.calculateLongestStreak(
      habit.completions,
      habit.frequency
    );

    const lastCompletion = habit.completions[0]?.completedAt || null;

    await this.prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak,
        longestStreak,
        lastCompletedDate: lastCompletion,
      },
    });
  }

  /**
   * Calculate the longest streak from all completions
   */
  private calculateLongestStreak(
    completions: HabitCompletion[],
    frequency: HabitFrequency
  ): number {
    if (completions.length === 0) return 0;

    const sortedCompletions = completions.sort(
      (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
    );

    let longestStreak = 0;
    let currentStreak = 1;
    const frequencyDays = this.getFrequencyDays(frequency);

    for (let i = 1; i < sortedCompletions.length; i++) {
      const prevDate = new Date(sortedCompletions[i - 1].completedAt);
      const currDate = new Date(sortedCompletions[i].completedAt);

      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference <= frequencyDays) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  }
}
