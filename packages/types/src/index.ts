// Shared TypeScript types for ACT Placemat

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  authorId: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Life OS Types
export interface LifeOSProfile {
  id: string;
  userId: string;
  preferences: LifeOSPreferences;
  goals: LifeOSGoal[];
  habits: LifeOSHabit[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LifeOSPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    morning: boolean;
    evening: boolean;
    goals: boolean;
    habits: boolean;
  };
}

export interface LifeOSGoal {
  id: string;
  title: string;
  description?: string;
  category:
    | 'personal'
    | 'professional'
    | 'health'
    | 'relationships'
    | 'learning'
    | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused' | 'archived';
  targetDate?: Date;
  milestones: LifeOSMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LifeOSMilestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: Date;
  dueDate?: Date;
}

export interface LifeOSHabit {
  id: string;
  title: string;
  description?: string;
  category:
    | 'health'
    | 'productivity'
    | 'learning'
    | 'relationships'
    | 'mindfulness'
    | 'other';
  frequency: 'daily' | 'weekly' | 'monthly';
  targetValue?: number;
  unit?: string;
  streak: number;
  isActive: boolean;
  history: LifeOSHabitEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LifeOSHabitEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  value?: number;
  notes?: string;
}

export interface LifeOSDashboardData {
  profile: LifeOSProfile;
  todaysHabits: LifeOSHabit[];
  activeGoals: LifeOSGoal[];
  upcomingMilestones: LifeOSMilestone[];
  streakStats: {
    longestStreak: number;
    currentStreaks: number;
    completedToday: number;
  };
}
