import { useState, useEffect } from 'react'

/**
 * Hook to detect user's reduced motion preference
 *
 * Based on research:
 * - Apple HIG: Always respect prefers-reduced-motion
 * - Provide instant transitions as fallback
 * - Some users have vestibular disorders
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  return prefersReducedMotion
}

/**
 * Returns animation config that respects reduced motion
 * Falls back to instant transitions when reduced motion is preferred
 */
export function useMotionConfig() {
  const prefersReducedMotion = useReducedMotion()

  return {
    // Use this for transition prop
    transition: prefersReducedMotion
      ? { duration: 0 }
      : undefined,

    // Use this for initial/animate props
    shouldAnimate: !prefersReducedMotion,

    // Reduced spring for subtle motion even with preference
    reducedSpring: prefersReducedMotion
      ? { type: 'tween', duration: 0.1 }
      : { type: 'spring', stiffness: 200, damping: 20 },
  }
}
