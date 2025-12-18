/**
 * Enhanced Timeline Generator Service
 *
 * Intelligently generates timeline entries from calendar, Gmail, and Notion data
 * with smart categorization and suggested display sizes
 */

import googleCalendarService from './googleCalendarService.js';
import { createSupabaseClient } from '../config/supabase.js';

// Entry size/importance levels
export const ENTRY_SIZES = {
  HERO: 'hero',       // Full-width, large hero image/video, detailed story
  FEATURED: 'featured', // Large card with image, description, read more
  STANDARD: 'standard', // Medium card with brief info
  COMPACT: 'compact',   // Small entry, just title and date
  MARKER: 'marker'     // Timeline dot only, minimal info
};

// Entry categories with detection patterns
const CATEGORIES = {
  TRAVEL: {
    patterns: ['flight', 'fly to', 'drive to', 'pick up', 'airport', 'travel'],
    icon: '✈️',
    defaultSize: ENTRY_SIZES.STANDARD
  },
  STRATEGY: {
    patterns: ['strategy', 'planning', 'roadmap', 'vision', 'offsite', 'retreat'],
    icon: '🎯',
    defaultSize: ENTRY_SIZES.FEATURED
  },
  MEETING: {
    patterns: ['meeting', 'meet', 'catch up', 'catchup', 'sync', 'call', 'chat', 'yarns', 'yarn'],
    icon: '🤝',
    defaultSize: ENTRY_SIZES.COMPACT
  },
  BOARD: {
    patterns: ['board', 'governance', 'agm', 'committee'],
    icon: '📋',
    defaultSize: ENTRY_SIZES.STANDARD
  },
  GRANT: {
    patterns: ['grant', 'funding', 'application', 'dgr', 'abn'],
    icon: '💰',
    defaultSize: ENTRY_SIZES.FEATURED
  },
  PARTNERSHIP: {
    patterns: ['partnership', 'partner', 'collaborate', 'collaboration', 'alliance'],
    icon: '🤝',
    defaultSize: ENTRY_SIZES.FEATURED
  },
  WORKSHOP: {
    patterns: ['workshop', 'training', 'session', 'program'],
    icon: '🎓',
    defaultSize: ENTRY_SIZES.STANDARD
  },
  EVENT: {
    patterns: ['event', 'launch', 'ceremony', 'celebration', 'conference', 'summit'],
    icon: '🎉',
    defaultSize: ENTRY_SIZES.FEATURED
  },
  NETWORK: {
    patterns: ['network', 'community', 'ambassador', 'regen places'],
    icon: '🌐',
    defaultSize: ENTRY_SIZES.STANDARD
  },
  PROJECT: {
    patterns: ['project', 'kick off', 'kickoff', 'milestone', 'launch'],
    icon: '🚀',
    defaultSize: ENTRY_SIZES.FEATURED
  },
  CREATIVE: {
    patterns: ['creative', 'design', 'art', 'story', 'media', 'photo', 'video'],
    icon: '🎨',
    defaultSize: ENTRY_SIZES.STANDARD
  }
};

/**
 * Categorize an event based on its title and description
 */
function categorizeEvent(title, description = '') {
  const searchText = `${title} ${description}`.toLowerCase();

  for (const [category, config] of Object.entries(CATEGORIES)) {
    if (config.patterns.some(p => searchText.includes(p))) {
      return {
        category,
        icon: config.icon,
        suggestedSize: config.defaultSize
      };
    }
  }

  return {
    category: 'OTHER',
    icon: '📌',
    suggestedSize: ENTRY_SIZES.COMPACT
  };
}

/**
 * Determine importance score based on various factors
 */
function calculateImportance(event) {
  let score = 0;

  // More attendees = more important
  const attendees = event.attendees?.length || 0;
  if (attendees >= 10) score += 3;
  else if (attendees >= 5) score += 2;
  else if (attendees >= 2) score += 1;

  // Has location = more important (in-person event)
  if (event.location && !event.location.includes('zoom') && !event.location.includes('teams') && !event.location.includes('meet')) {
    score += 2;
  }

  // Duration matters
  if (event.start?.dateTime && event.end?.dateTime) {
    const duration = new Date(event.end.dateTime) - new Date(event.start.dateTime);
    const hours = duration / (1000 * 60 * 60);
    if (hours >= 4) score += 2;
    else if (hours >= 2) score += 1;
  }

  // All-day events are often significant
  if (event.start?.date && !event.start?.dateTime) {
    score += 1;
  }

  // Keywords in title boost importance
  const importantKeywords = ['launch', 'strategy', 'board', 'grant', 'partnership', 'keynote', 'opening', 'ceremony'];
  if (importantKeywords.some(k => event.summary?.toLowerCase().includes(k))) {
    score += 2;
  }

  return score;
}

/**
 * Convert importance score to entry size
 */
function scoreToSize(score, categorySize) {
  if (score >= 5) return ENTRY_SIZES.HERO;
  if (score >= 3) return ENTRY_SIZES.FEATURED;
  if (score >= 1) return categorySize || ENTRY_SIZES.STANDARD;
  return ENTRY_SIZES.COMPACT;
}

/**
 * Extract meaningful description from calendar event
 */
function extractDescription(event) {
  const parts = [];

  if (event.location) {
    parts.push(`📍 ${event.location.split(',')[0]}`);
  }

  const attendees = event.attendees?.length || 0;
  if (attendees > 0) {
    const names = event.attendees
      .filter(a => !a.self)
      .map(a => a.displayName || a.email.split('@')[0])
      .slice(0, 3);
    if (names.length > 0) {
      parts.push(`With ${names.join(', ')}${attendees > 3 ? ` +${attendees - 3} others` : ''}`);
    }
  }

  // Extract first sentence of description if exists
  if (event.description) {
    const firstSentence = event.description.split(/[.!?\n]/)[0].trim();
    if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200) {
      parts.push(firstSentence);
    }
  }

  return parts.join(' • ');
}

/**
 * Group related events into a single entry
 */
function groupRelatedEvents(events) {
  const groups = [];
  const processed = new Set();

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < events.length; i++) {
    if (processed.has(i)) continue;

    const event = events[i];
    const group = [event];
    processed.add(i);

    // Look for related events within 24 hours
    for (let j = i + 1; j < events.length; j++) {
      if (processed.has(j)) continue;

      const other = events[j];
      const timeDiff = Math.abs(new Date(other.date) - new Date(event.date));
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Group if same day and related keywords
      if (hoursDiff <= 24) {
        const eventWords = event.title.toLowerCase().split(/\s+/);
        const otherWords = other.title.toLowerCase().split(/\s+/);
        const commonWords = eventWords.filter(w => otherWords.includes(w) && w.length > 3);

        if (commonWords.length > 0) {
          group.push(other);
          processed.add(j);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Generate timeline entries from calendar events
 */
export async function generateFromCalendar(year) {
  try {
    if (!googleCalendarService) {
      console.log('Calendar service not available');
      return [];
    }

    const timeMin = new Date(`${year}-01-01T00:00:00Z`).toISOString();
    const timeMax = new Date(`${year}-12-31T23:59:59Z`).toISOString();

    const result = await googleCalendarService.getEventsWithProjectOverlay({
      timeMin,
      timeMax,
      maxResults: 500
    });

    const events = result?.events || [];

    // Filter out working location events and cancelled events
    const meaningfulEvents = events.filter(e =>
      e.eventType !== 'workingLocation' &&
      e.status !== 'cancelled' &&
      e.summary // Has a title
    );

    // Convert to timeline entries
    const entries = meaningfulEvents.map(event => {
      const { category, icon, suggestedSize } = categorizeEvent(event.summary, event.description);
      const importance = calculateImportance(event);
      const finalSize = scoreToSize(importance, suggestedSize);

      return {
        id: `cal-${event.id}`,
        date: event.start.dateTime || event.start.date,
        title: event.summary,
        description: extractDescription(event),
        source: 'calendar',
        category,
        icon,
        size: finalSize,
        importance,
        included: importance >= 1, // Auto-include important events
        metadata: {
          calendarId: event.id,
          location: event.location,
          attendees: event.attendees?.length || 0,
          isAllDay: !event.start.dateTime,
          organizer: event.organizer?.displayName || event.organizer?.email
        },
        raw: event
      };
    });

    return entries;
  } catch (error) {
    console.error('Error generating from calendar:', error);
    return [];
  }
}

/**
 * Generate timeline entries from Notion projects
 */
export async function generateFromNotion(year) {
  const supabase = createSupabaseClient();

  // This would call the existing Notion integration
  // For now, return the format we need
  return [];
}

/**
 * Generate complete enhanced timeline
 */
export async function generateEnhancedTimeline(year) {
  const [calendarEntries, notionEntries] = await Promise.all([
    generateFromCalendar(year),
    generateFromNotion(year)
  ]);

  // Merge and sort all entries
  const allEntries = [...calendarEntries, ...notionEntries];
  allEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Group into months for organization
  const monthGroups = {};
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  allEntries.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = monthNames[date.getMonth()];

    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = {
        key: monthKey,
        name: monthName,
        year: date.getFullYear(),
        month: date.getMonth(),
        entries: []
      };
    }
    monthGroups[monthKey].entries.push(entry);
  });

  // Calculate stats
  const stats = {
    total: allEntries.length,
    bySize: {
      hero: allEntries.filter(e => e.size === ENTRY_SIZES.HERO).length,
      featured: allEntries.filter(e => e.size === ENTRY_SIZES.FEATURED).length,
      standard: allEntries.filter(e => e.size === ENTRY_SIZES.STANDARD).length,
      compact: allEntries.filter(e => e.size === ENTRY_SIZES.COMPACT).length,
      marker: allEntries.filter(e => e.size === ENTRY_SIZES.MARKER).length
    },
    byCategory: {},
    included: allEntries.filter(e => e.included).length
  };

  allEntries.forEach(entry => {
    stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
  });

  return {
    year,
    entries: allEntries,
    months: Object.values(monthGroups).sort((a, b) => a.key.localeCompare(b.key)),
    stats
  };
}

/**
 * Get suggested video break points in the timeline
 */
export function suggestVideoBreaks(entries) {
  const breaks = [];

  // Suggest video breaks at season transitions
  const seasonMonths = [2, 5, 8, 11]; // End of each season

  let lastBreak = -1;
  entries.forEach((entry, index) => {
    const month = new Date(entry.date).getMonth();

    if (seasonMonths.includes(month) && index - lastBreak > 10) {
      breaks.push({
        afterIndex: index,
        reason: 'Season transition',
        month: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][month]
      });
      lastBreak = index;
    }
  });

  return breaks;
}

export default {
  ENTRY_SIZES,
  generateFromCalendar,
  generateFromNotion,
  generateEnhancedTimeline,
  suggestVideoBreaks
};
