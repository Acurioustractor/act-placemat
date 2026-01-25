// Skeleton loading components for Movement Dashboard

export function SkeletonBrief() {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-6 border border-emerald-100 animate-pulse">
      <div className="h-8 w-48 bg-emerald-200/50 rounded mb-4" />
      <div className="h-4 w-full bg-emerald-200/30 rounded mb-2" />
      <div className="h-4 w-3/4 bg-emerald-200/30 rounded" />
    </div>
  )
}

export function SkeletonTask() {
  return (
    <div className="p-4 bg-white border border-slate-100 rounded-lg animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-1/2 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 animate-pulse">
      <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="text-center p-4 bg-white rounded-xl border border-slate-100 animate-pulse">
      <div className="h-8 w-16 bg-slate-200 rounded mx-auto mb-2" />
      <div className="h-3 w-20 bg-slate-100 rounded mx-auto" />
    </div>
  )
}

export function SkeletonProgress() {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
      <div className="h-4 bg-slate-100 rounded-full mb-4" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-16 bg-slate-50 rounded-lg" />
        <div className="h-16 bg-slate-50 rounded-lg" />
        <div className="h-16 bg-slate-50 rounded-lg" />
      </div>
    </div>
  )
}

export function SkeletonReflection() {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100 animate-pulse">
      <div className="h-5 w-40 bg-amber-200/50 rounded mb-4" />
      <div className="h-20 w-full bg-amber-100/30 rounded" />
    </div>
  )
}
