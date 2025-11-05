import type { StorytellingMetrics } from '../types/project'

interface StorytellingScaleCardProps {
  metrics: StorytellingMetrics
  projectName?: string
}

export function StorytellingScaleCard({ metrics, projectName }: StorytellingScaleCardProps) {
  const opportunityPercentage = metrics.storyOpportunities > 0
    ? Math.round((metrics.storiesCaptured / metrics.storyOpportunities) * 100)
    : 0

  const storytellerActivationRate = metrics.potentialStorytellers > 0
    ? Math.round((metrics.activeStorytellers / metrics.potentialStorytellers) * 100)
    : 0

  const potentialReachUnlocked = metrics.potentialReach - metrics.totalCurrentReach

  return (
    <div className="rounded-xl border border-ocean-100 bg-gradient-to-br from-ocean-50 to-brand-50 p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-clay-900">Storytelling Scale Opportunity</h3>
          <p className="text-sm text-clay-600 mt-1">
            Capturing and amplifying community narratives
          </p>
        </div>
        <span className="rounded-full bg-ocean-600 px-3 py-1 text-xs font-semibold text-white">
          📖 Stories
        </span>
      </div>

      {/* Key Metrics Overview */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border-2 border-ocean-200 bg-white p-4">
          <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
            Storyteller Activation
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-ocean-700">
                {metrics.activeStorytellers}
              </p>
              <p className="text-sm text-clay-600 mt-1">
                of {metrics.potentialStorytellers} potential
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-ocean-600">
                {storytellerActivationRate}%
              </p>
              <p className="text-xs text-clay-500">activated</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-clay-100">
              <div
                className="h-full rounded-full bg-ocean-500 transition-all"
                style={{ width: `${storytellerActivationRate}%` }}
              />
            </div>
            {metrics.trainingGap > 0 && (
              <p className="text-xs text-clay-600 mt-2">
                ⚠️ Training gap: {metrics.trainingGap} storytellers need training
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border-2 border-brand-200 bg-white p-4">
          <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
            Story Capture Rate
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-brand-700">
                {metrics.storiesCaptured}
              </p>
              <p className="text-sm text-clay-600 mt-1">
                of {metrics.storyOpportunities}+ opportunities
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-600">
                {opportunityPercentage}%
              </p>
              <p className="text-xs text-clay-500">captured</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-clay-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${opportunityPercentage}%` }}
              />
            </div>
            {opportunityPercentage < 50 && (
              <p className="text-xs text-brand-700 mt-2">
                🚀 Massive opportunity: {metrics.storyOpportunities - metrics.storiesCaptured} uncaptured stories
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Impact Multiplier */}
      <div className="mb-6 rounded-lg border-2 border-clay-200 bg-white p-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700 mb-3">
          Impact Reach Multiplier
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-clay-500">Average Story Reach</p>
            <p className="text-2xl font-bold text-ocean-700 mt-1">
              {metrics.averageStoryReach.toLocaleString()}
            </p>
            <p className="text-xs text-clay-600 mt-1">people per story</p>
          </div>
          <div>
            <p className="text-xs text-clay-500">Current Total Reach</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {metrics.totalCurrentReach.toLocaleString()}
            </p>
            <p className="text-xs text-clay-600 mt-1">
              from {metrics.storiesCaptured} stories
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-600 font-medium">Potential Reach</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {metrics.potentialReach.toLocaleString()}
            </p>
            <p className="text-xs text-brand-600 mt-1">
              if all {metrics.storyOpportunities} captured
            </p>
          </div>
        </div>
      </div>

      {/* Opportunity Visual */}
      <div className="mb-6 rounded-lg border-2 border-brand-200 bg-gradient-to-r from-brand-50 to-ocean-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-4xl">💎</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-brand-900 uppercase tracking-wider">
              Untapped Potential
            </h4>
            <p className="text-2xl font-bold text-brand-700 mt-2">
              +{potentialReachUnlocked.toLocaleString()} people
            </p>
            <p className="text-clay-700 mt-2 leading-relaxed">
              By capturing the remaining <strong>{metrics.storyOpportunities - metrics.storiesCaptured} story opportunities</strong> and
              training <strong>{metrics.trainingGap} more storytellers</strong>, this project could reach an additional{' '}
              <strong>{potentialReachUnlocked.toLocaleString()} people</strong> with authentic community narratives.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Status */}
      {(metrics.storytellersInTraining || metrics.storiesInProduction) && (
        <div className="rounded-lg border border-ocean-100 bg-white p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700 mb-3">
            Current Pipeline
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {metrics.storytellersInTraining && metrics.storytellersInTraining > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-ocean-50 p-3">
                <div>
                  <p className="text-sm font-medium text-ocean-900">In Training</p>
                  <p className="text-xs text-ocean-700 mt-0.5">Storytellers being onboarded</p>
                </div>
                <p className="text-2xl font-bold text-ocean-700">{metrics.storytellersInTraining}</p>
              </div>
            )}
            {metrics.storiesInProduction && metrics.storiesInProduction > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-brand-50 p-3">
                <div>
                  <p className="text-sm font-medium text-brand-900">In Production</p>
                  <p className="text-xs text-brand-700 mt-0.5">Stories being captured</p>
                </div>
                <p className="text-2xl font-bold text-brand-700">{metrics.storiesInProduction}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Economics of Scale Message */}
      <div className="mt-6 rounded-lg border-l-4 border-brand-500 bg-brand-50/50 p-4">
        <p className="text-sm text-clay-900 leading-relaxed">
          <strong className="text-brand-900">Economics of scale:</strong> With more storytellers trained and
          systematic capture processes, the cost per story drops significantly while social impact multiplies.
          This is how ACT moves from grant dependency to market-based economics with measurable impact.
        </p>
      </div>
    </div>
  )
}
