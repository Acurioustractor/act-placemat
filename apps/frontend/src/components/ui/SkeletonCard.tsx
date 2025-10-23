export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-clay-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-clay-200 rounded w-1/3"></div>
          <div className="h-4 bg-clay-100 rounded w-2/3"></div>
          <div className="h-4 bg-clay-100 rounded w-1/2"></div>
        </div>
        <div className="h-8 w-24 bg-clay-200 rounded"></div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-clay-100 rounded w-full"></div>
        <div className="h-3 bg-clay-100 rounded w-5/6"></div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  )
}
