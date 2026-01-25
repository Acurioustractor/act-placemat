/**
 * Skeleton Loading Components
 *
 * Research-backed patterns:
 * - Only show for fetches >1 second
 * - Match final layout exactly
 * - Subtle pulse animation (not shimmer - too distracting)
 * - Respect reduced motion
 */

interface SkeletonProps {
  className?: string
}

// Base skeleton with pulse animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
      aria-hidden="true"
    />
  )
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = '' }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

// Avatar skeleton
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }
  return <Skeleton className={`${sizes[size]} rounded-full`} />
}

// Card skeleton (matches SectorsTable row)
export function SkeletonTableRow() {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
      <div className="col-span-6">
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-6 w-16 rounded-lg" />
      </div>
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  )
}

// Timeline item skeleton (matches StoryTimeline)
export function SkeletonTimelineItem() {
  return (
    <div className="relative flex items-start gap-4">
      <div className="w-20 flex-shrink-0 flex justify-end">
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="relative flex flex-col items-center">
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Story hero skeleton
export function SkeletonStoryHero() {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 min-h-[280px]">
      <div className="flex items-start gap-6">
        <Skeleton className="w-20 h-20 rounded-full bg-slate-700" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-6 w-32 bg-slate-700 rounded-full" />
          <Skeleton className="h-6 w-full bg-slate-700" />
          <Skeleton className="h-6 w-full bg-slate-700" />
          <Skeleton className="h-6 w-3/4 bg-slate-700" />
          <div className="pt-4">
            <Skeleton className="h-5 w-48 bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Metrics ticker skeleton
export function SkeletonMetricsTicker() {
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-3">
      <div className="flex items-center justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// LCAA card skeleton
export function SkeletonLCAACard() {
  return (
    <div className="rounded-2xl border border-slate-100 p-6 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

// Full dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-white border-r border-slate-100 p-4">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Top nav skeleton */}
        <div className="bg-violet-50 border-b border-violet-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-lg" />
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-full" />
            </div>
          </div>
        </div>

        {/* Metrics ticker skeleton */}
        <SkeletonMetricsTicker />

        {/* Page content skeleton */}
        <div className="p-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <SkeletonStoryHero />
        </div>
      </div>
    </div>
  )
}
