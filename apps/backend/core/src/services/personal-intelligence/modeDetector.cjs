/**
 * Mode Detector Service
 *
 * Determines the optimal work mode based on:
 * - Time of day and day of week
 * - Moon phase and energy
 * - Calendar density
 * - Recent work patterns
 * - Energy levels (if tracked)
 *
 * Work Modes:
 *   - DEEP_WORK: Complex coding, writing, strategic thinking
 *   - CONNECT: Meetings, calls, relationship building
 *   - ADMIN: Email, documentation, quick tasks
 *   - CREATE: Art, content creation, design
 *   - PLAN: Sprint planning, roadmapping, organizing
 *   - REST: Low energy, break time, integration
 *
 * Usage:
 *   const { modeDetector } = require('./modeDetector');
 *   const mode = await modeDetector.detectMode();
 *
 * Migrated from: act-personal-ai/services/mode-detector.mjs
 */

const { db } = require('./db.cjs');

// Mode definitions with characteristics
const MODES = {
  DEEP_WORK: {
    name: 'Deep Work',
    icon: '?',
    description: 'Complex coding, writing, strategic thinking',
    idealConditions: {
      meetingFree: true,
      energyLevel: 'high',
      moonPhases: ['waxing_gibbous', 'full_moon', 'waxing_crescent'],
      timeRanges: [
        { start: 9, end: 12 },
        { start: 14, end: 17 },
      ],
      days: ['monday', 'tuesday', 'wednesday', 'thursday'],
    },
  },
  CONNECT: {
    name: 'Connect',
    icon: '??',
    description: 'Meetings, calls, relationship building',
    idealConditions: {
      meetingFree: false,
      energyLevel: 'medium',
      moonPhases: ['full_moon', 'waning_gibbous'],
      timeRanges: [
        { start: 10, end: 12 },
        { start: 14, end: 16 },
      ],
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  ADMIN: {
    name: 'Admin',
    icon: '??',
    description: 'Email, documentation, quick tasks',
    idealConditions: {
      meetingFree: true,
      energyLevel: 'low',
      moonPhases: ['waning_crescent', 'last_quarter'],
      timeRanges: [
        { start: 8, end: 9 },
        { start: 16, end: 18 },
      ],
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  CREATE: {
    name: 'Create',
    icon: '??',
    description: 'Art, content creation, design',
    idealConditions: {
      meetingFree: true,
      energyLevel: 'high',
      moonPhases: ['new_moon', 'waxing_crescent', 'first_quarter'],
      timeRanges: [
        { start: 10, end: 13 },
        { start: 19, end: 22 },
      ],
      days: ['tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'],
    },
  },
  PLAN: {
    name: 'Plan',
    icon: '??',
    description: 'Sprint planning, roadmapping, organizing',
    idealConditions: {
      meetingFree: true,
      energyLevel: 'medium',
      moonPhases: ['new_moon', 'first_quarter'],
      timeRanges: [
        { start: 9, end: 11 },
        { start: 14, end: 16 },
      ],
      days: ['monday', 'friday'],
    },
  },
  REST: {
    name: 'Rest',
    icon: '??',
    description: 'Low energy, break time, integration',
    idealConditions: {
      meetingFree: true,
      energyLevel: 'low',
      moonPhases: ['waning_crescent', 'new_moon'],
      timeRanges: [
        { start: 12, end: 14 },
        { start: 18, end: 20 },
      ],
      days: ['friday', 'saturday', 'sunday'],
    },
  },
};

class ModeDetector {
  constructor() {
    this.dbConfigured = false;
  }

  async initialize() {
    this.dbConfigured = db.isConfigured().main;
  }

  /**
   * Detect the optimal work mode
   */
  async detectMode(options = {}) {
    await this.initialize();

    const now = new Date();
    const context = {
      timestamp: now,
      hour: now.getHours(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      moonPhase: this.getMoonPhase(now),
      calendarDensity: await this.getCalendarDensity(now),
      recentModes: await this.getRecentModes(),
      ...options,
    };

    // Score each mode
    const scores = {};

    for (const [modeKey, mode] of Object.entries(MODES)) {
      scores[modeKey] = this.scoreMode(mode, context);
    }

    // Get recommended mode
    const sortedModes = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [recommendedMode, score] = sortedModes[0];

    // Get alternative mode
    const [alternativeMode, altScore] = sortedModes[1];

    return {
      mode: recommendedMode,
      modeInfo: MODES[recommendedMode],
      score,
      confidence: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low',
      alternative: {
        mode: alternativeMode,
        modeInfo: MODES[alternativeMode],
        score: altScore,
      },
      context: {
        hour: context.hour,
        day: context.dayOfWeek,
        moonPhase: context.moonPhase,
        calendarDensity: context.calendarDensity,
        hasMeetings: context.calendarDensity > 0,
      },
      reasoning: this.generateReasoning(recommendedMode, context),
    };
  }

  /**
   * Score a mode based on current context
   */
  scoreMode(mode, context) {
    let score = 0;
    let factors = 0;

    const conditions = mode.idealConditions;

    // Time of day score
    const inTimeRange = conditions.timeRanges.some(
      (range) => context.hour >= range.start && context.hour < range.end
    );
    if (inTimeRange) score += 0.3;
    factors++;

    // Day of week score
    if (conditions.days.includes(context.dayOfWeek)) {
      score += 0.2;
    }
    factors++;

    // Moon phase score
    if (conditions.moonPhases.includes(context.moonPhase.key)) {
      score += 0.2;
    }
    factors++;

    // Meeting density score
    if (conditions.meetingFree && context.calendarDensity === 0) {
      score += 0.2;
    } else if (!conditions.meetingFree && context.calendarDensity > 0) {
      score += 0.15;
    }
    factors++;

    // Energy level score (if provided)
    if (context.energyLevel) {
      if (context.energyLevel === conditions.energyLevel) {
        score += 0.1;
      }
    }

    return score;
  }

  /**
   * Get moon phase for a date
   */
  getMoonPhase(date) {
    const knownNewMoon = new Date(2000, 0, 6);
    const lunarCycle = 29.53059;

    const diff = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
    const phaseDay = diff % lunarCycle;

    let phase, key, energy;

    if (phaseDay < 1.85) {
      phase = 'New Moon';
      key = 'new_moon';
      energy = 'Set intentions, plant seeds, begin new projects';
    } else if (phaseDay < 7.38) {
      phase = 'Waxing Crescent';
      key = 'waxing_crescent';
      energy = 'Build momentum, take initial action';
    } else if (phaseDay < 9.23) {
      phase = 'First Quarter';
      key = 'first_quarter';
      energy = 'Push through challenges, make decisions';
    } else if (phaseDay < 14.77) {
      phase = 'Waxing Gibbous';
      key = 'waxing_gibbous';
      energy = 'Refine and adjust, prepare for completion';
    } else if (phaseDay < 16.61) {
      phase = 'Full Moon';
      key = 'full_moon';
      energy = 'Celebrate, connect with community, peak energy';
    } else if (phaseDay < 22.15) {
      phase = 'Waning Gibbous';
      key = 'waning_gibbous';
      energy = 'Share knowledge, express gratitude';
    } else if (phaseDay < 23.99) {
      phase = 'Last Quarter';
      key = 'last_quarter';
      energy = "Release what's not working, reflect";
    } else {
      phase = 'Waning Crescent';
      key = 'waning_crescent';
      energy = 'Rest, integrate learnings, prepare for renewal';
    }

    return { phase, key, energy, dayInCycle: Math.floor(phaseDay) };
  }

  /**
   * Get calendar density for the current day
   */
  async getCalendarDensity(date) {
    if (!this.dbConfigured) return 0;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const { count } = await db.main
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('event_type', 'meeting');

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get recently used modes (for variety)
   */
  async getRecentModes() {
    // Could be stored in conversation_context or daily_work_log
    // For now, return empty
    return [];
  }

  /**
   * Generate human-readable reasoning
   */
  generateReasoning(mode, context) {
    const modeInfo = MODES[mode];
    const parts = [];

    parts.push(`${modeInfo.icon} **${modeInfo.name}** is recommended`);

    // Time reasoning
    const timeStr = context.hour < 12 ? 'morning' : context.hour < 17 ? 'afternoon' : 'evening';
    parts.push(`It's ${context.dayOfWeek} ${timeStr}`);

    // Moon reasoning
    parts.push(`Moon is in ${context.moonPhase.phase}: ${context.moonPhase.energy}`);

    // Calendar reasoning
    if (context.calendarDensity > 0) {
      parts.push(`You have ${context.calendarDensity} meeting(s) scheduled`);
    } else {
      parts.push('No meetings scheduled - good for focused work');
    }

    return parts.join('. ') + '.';
  }

  /**
   * Get mode suggestions for the day
   */
  async getDaySuggestions() {
    const suggestions = [];
    const now = new Date();

    // Check modes for different time slots
    const timeSlots = [9, 11, 14, 16, 18];

    for (const hour of timeSlots) {
      const slotTime = new Date(now);
      slotTime.setHours(hour, 0, 0, 0);

      if (slotTime > now) {
        const context = {
          hour,
          dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          moonPhase: this.getMoonPhase(now),
          calendarDensity: await this.getCalendarDensity(slotTime),
        };

        let bestMode = null;
        let bestScore = 0;

        for (const [modeKey, mode] of Object.entries(MODES)) {
          const score = this.scoreMode(mode, context);
          if (score > bestScore) {
            bestScore = score;
            bestMode = modeKey;
          }
        }

        if (bestMode) {
          suggestions.push({
            time: `${hour}:00`,
            mode: bestMode,
            modeInfo: MODES[bestMode],
            score: bestScore,
          });
        }
      }
    }

    return suggestions;
  }
}

// Singleton instance
const modeDetector = new ModeDetector();

module.exports = { modeDetector, ModeDetector, MODES };
module.exports.default = modeDetector;
