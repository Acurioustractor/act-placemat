/**
 * Moon Phase Calculator
 *
 * Calculates moon phase for any given date using astronomical formulas.
 * Based on Conway's algorithm for moon phase approximation.
 */

export interface MoonPhase {
  phase: number // 0-1 where 0 = new moon, 0.5 = full moon
  name: string
  emoji: string
  energy: string
  color: string
  illumination: number // 0-100%
  nextFullMoon: Date
  nextNewMoon: Date
}

const MOON_PHASES = [
  { name: 'New Moon', emoji: '🌑', energy: 'Intention setting, new beginnings', color: '#1a1a1a' },
  { name: 'Waxing Crescent', emoji: '🌒', energy: 'Building momentum, taking action', color: '#2d3748' },
  { name: 'First Quarter', emoji: '🌓', energy: 'Challenges and decisions', color: '#4a5568' },
  { name: 'Waxing Gibbous', emoji: '🌔', energy: 'Refinement and adjustment', color: '#718096' },
  { name: 'Full Moon', emoji: '🌕', energy: 'Completion, celebration, release', color: '#fbbf24' },
  { name: 'Waning Gibbous', emoji: '🌖', energy: 'Gratitude and sharing', color: '#a0aec0' },
  { name: 'Last Quarter', emoji: '🌗', energy: 'Letting go, forgiveness', color: '#718096' },
  { name: 'Waning Crescent', emoji: '🌘', energy: 'Rest, reflection, surrender', color: '#4a5568' },
]

/**
 * Calculate the Julian Date for a given date
 */
function toJulianDate(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate() + date.getHours() / 24

  let y = year
  let m = month

  if (m <= 2) {
    y -= 1
    m += 12
  }

  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)

  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
}

/**
 * Calculate moon phase for a given date
 * Returns a value from 0 to 1 where:
 * 0 = New Moon
 * 0.25 = First Quarter
 * 0.5 = Full Moon
 * 0.75 = Last Quarter
 */
function calculateMoonPhase(date: Date): number {
  // Known new moon: January 6, 2000 at 18:14 UTC
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))

  // Synodic month (average time between new moons) in days
  const synodicMonth = 29.530588853

  // Calculate days since known new moon
  const daysSinceKnown = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)

  // Calculate phase (0 to 1)
  const phase = (daysSinceKnown % synodicMonth) / synodicMonth

  return phase < 0 ? phase + 1 : phase
}

/**
 * Find the next occurrence of a specific phase
 */
function findNextPhase(date: Date, targetPhase: number): Date {
  const synodicMonth = 29.530588853
  const currentPhase = calculateMoonPhase(date)

  let daysUntil = (targetPhase - currentPhase) * synodicMonth
  if (daysUntil < 0) {
    daysUntil += synodicMonth
  }

  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + Math.round(daysUntil))
  return nextDate
}

/**
 * Get detailed moon phase information for a date
 */
export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const phase = calculateMoonPhase(date)

  // Determine which of the 8 phases we're in
  const phaseIndex = Math.floor(phase * 8) % 8
  const phaseInfo = MOON_PHASES[phaseIndex]

  // Calculate illumination (simplified: 0% at new moon, 100% at full moon)
  const illumination = Math.round(Math.abs(Math.sin(phase * Math.PI)) * 100)

  return {
    phase,
    name: phaseInfo.name,
    emoji: phaseInfo.emoji,
    energy: phaseInfo.energy,
    color: phaseInfo.color,
    illumination,
    nextFullMoon: findNextPhase(date, 0.5),
    nextNewMoon: findNextPhase(date, 0),
  }
}

/**
 * Get moon phases for a range of dates (useful for calendar month view)
 */
export function getMoonPhasesForMonth(year: number, month: number): Map<number, MoonPhase> {
  const phases = new Map<number, MoonPhase>()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12, 0, 0) // Noon to avoid timezone issues
    phases.set(day, getMoonPhase(date))
  }

  return phases
}

/**
 * Get significant moon dates for a month (new and full moons)
 */
export function getSignificantMoonDates(year: number, month: number): {
  newMoons: Date[]
  fullMoons: Date[]
  quarterMoons: Date[]
} {
  const result = {
    newMoons: [] as Date[],
    fullMoons: [] as Date[],
    quarterMoons: [] as Date[],
  }

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  // Check each day for significant phases
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const phase = calculateMoonPhase(d)

    // New Moon (phase near 0 or 1)
    if (phase < 0.02 || phase > 0.98) {
      result.newMoons.push(new Date(d))
    }
    // Full Moon (phase near 0.5)
    else if (phase > 0.48 && phase < 0.52) {
      result.fullMoons.push(new Date(d))
    }
    // Quarter Moons (phase near 0.25 or 0.75)
    else if ((phase > 0.23 && phase < 0.27) || (phase > 0.73 && phase < 0.77)) {
      result.quarterMoons.push(new Date(d))
    }
  }

  return result
}

/**
 * Get ACT-aligned energy recommendation based on moon phase
 */
export function getMoonEnergySuggestion(phase: MoonPhase): {
  activity: string
  projectFocus: string
  lcaaAlignment: string
} {
  const phaseValue = phase.phase

  if (phaseValue < 0.125) {
    // New Moon
    return {
      activity: 'Set intentions for new projects',
      projectFocus: 'Planning and visioning',
      lcaaAlignment: 'Listen - Gather community input',
    }
  } else if (phaseValue < 0.375) {
    // Waxing
    return {
      activity: 'Build and create',
      projectFocus: 'Active development and outreach',
      lcaaAlignment: 'Connect - Build relationships',
    }
  } else if (phaseValue < 0.625) {
    // Full Moon
    return {
      activity: 'Celebrate and share achievements',
      projectFocus: 'Launch features, share stories',
      lcaaAlignment: 'Amplify - Share impact stories',
    }
  } else {
    // Waning
    return {
      activity: 'Reflect and release',
      projectFocus: 'Documentation, handover prep',
      lcaaAlignment: 'Act - Complete and hand over',
    }
  }
}
