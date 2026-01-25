/**
 * Motion utilities for ACT Dashboard
 *
 * Based on research:
 * - Framer Motion spring physics (stiffness/damping/mass)
 * - Superhuman's 100ms perceived instant rule
 * - Reduced motion accessibility support
 */

// Spring presets based on UX research
export const springs = {
  // Snappy - for buttons, toggles, quick feedback
  // stiffness=200, damping=20 gives bouncy but controlled feel
  snappy: { type: 'spring', stiffness: 200, damping: 20 } as const,

  // Smooth - for panels, modals, larger elements
  // Lower stiffness for more elegant movement
  smooth: { type: 'spring', stiffness: 100, damping: 15 } as const,

  // Gentle - for page transitions, subtle animations
  gentle: { type: 'spring', stiffness: 60, damping: 15 } as const,

  // Bouncy - for celebrations, achievements
  bouncy: { type: 'spring', stiffness: 300, damping: 10 } as const,
}

// Transition presets
export const transitions = {
  // Instant fade for <100ms perceived speed
  instant: { duration: 0.1 },

  // Quick for micro-interactions
  quick: { duration: 0.15 },

  // Normal for most animations
  normal: { duration: 0.2 },

  // Slow for emphasis
  slow: { duration: 0.4 },
}

// Animation variants for common patterns
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Button micro-interaction variants
export const buttonVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: springs.snappy,
  },
  tap: {
    scale: 0.98,
    transition: springs.snappy,
  },
}

// Card hover variants (subtle lift effect)
export const cardVariants = {
  idle: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  hover: {
    y: -2,
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    transition: springs.smooth,
  },
}

// List item stagger animation
export const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const listItem = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: springs.smooth,
  },
}

// Skeleton pulse animation (CSS keyframes reference)
export const skeletonPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Celebration burst (for Beautiful Obsolescence milestones)
export const celebrationBurst = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: springs.bouncy,
  },
}

// Presence indicator pulse
export const presencePulse = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}
