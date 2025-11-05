import type { CommunityLaborMetrics } from '../types/project'

interface CommunityLaborValueCardProps {
  metrics: CommunityLaborMetrics
  projectName?: string
}

export function CommunityLaborValueCard({ metrics, projectName }: CommunityLaborValueCardProps) {
  const totalParticipants =
    metrics.youngPeople.count +
    metrics.communityMembers.count +
    metrics.livedExperience.count

  const totalHours =
    metrics.youngPeople.hoursContributed +
    metrics.communityMembers.hoursContributed +
    metrics.livedExperience.hoursContributed

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const costSavings = metrics.contractorEquivalentCost - metrics.actualCost

  return (
    <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-ocean-50 p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-clay-900">Community Labor Value</h3>
          <p className="text-sm text-clay-600 mt-1">
            Building infrastructure through community participation
          </p>
        </div>
        <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
          🏗️ Infrastructure
        </span>
      </div>

      {/* Total Value Impact */}
      <div className="mb-6 rounded-lg border-2 border-brand-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
              Contractor Equivalent
            </p>
            <p className="text-2xl font-bold text-clay-700 mt-1">
              {formatCurrency(metrics.contractorEquivalentCost)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-clay-500 uppercase tracking-wider">
              Actual Cost
            </p>
            <p className="text-2xl font-bold text-ocean-700 mt-1">
              {formatCurrency(metrics.actualCost)}
            </p>
            <p className="text-xs text-clay-500 mt-1">Materials + paid labor</p>
          </div>
          <div>
            <p className="text-xs font-medium text-brand-600 uppercase tracking-wider">
              Community Value Created
            </p>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {formatCurrency(metrics.communityValueCreated)}
            </p>
            <p className="text-xs text-brand-600 mt-1">
              {Math.round((costSavings / metrics.contractorEquivalentCost) * 100)}% cost savings
            </p>
          </div>
        </div>
      </div>

      {/* Community Participation */}
      <div className="mb-6 space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700">
          Community Participation
        </h4>
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.youngPeople.count > 0 && (
            <div className="rounded-lg border border-ocean-100 bg-ocean-50/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ocean-900">Young People</p>
                  <p className="text-2xl font-bold text-ocean-700">{metrics.youngPeople.count}</p>
                </div>
                <span className="text-3xl">👥</span>
              </div>
              <p className="text-xs text-ocean-700 mt-2">
                {metrics.youngPeople.hoursContributed.toLocaleString()} hours contributed
              </p>
            </div>
          )}

          {metrics.communityMembers.count > 0 && (
            <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-900">Community Members</p>
                  <p className="text-2xl font-bold text-brand-700">{metrics.communityMembers.count}</p>
                </div>
                <span className="text-3xl">🤝</span>
              </div>
              <p className="text-xs text-brand-700 mt-2">
                {metrics.communityMembers.hoursContributed.toLocaleString()} hours contributed
              </p>
            </div>
          )}

          {metrics.livedExperience.count > 0 && (
            <div className="rounded-lg border border-clay-100 bg-clay-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-clay-900">Lived Experience</p>
                  <p className="text-2xl font-bold text-clay-700">{metrics.livedExperience.count}</p>
                </div>
                <span className="text-3xl">💪</span>
              </div>
              <p className="text-xs text-clay-700 mt-2">
                {metrics.livedExperience.hoursContributed.toLocaleString()} hours contributed
              </p>
              {metrics.livedExperience.description && (
                <p className="text-xs text-clay-600 mt-1 italic">{metrics.livedExperience.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-clay-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-clay-700">Total Participation</p>
              <p className="text-xs text-clay-500 mt-0.5">
                {totalParticipants} people • {totalHours.toLocaleString()} hours
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-clay-700">
                {Math.round(totalHours / totalParticipants)} hours
              </p>
              <p className="text-xs text-clay-500">per person average</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Transferred */}
      {metrics.skillsTransferred && metrics.skillsTransferred.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700">
            Skills Transferred
          </h4>
          <div className="space-y-2">
            {metrics.skillsTransferred.map((skill, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-ocean-100 bg-ocean-50/30 p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-clay-900">{skill.skill}</p>
                  <p className="text-sm text-clay-600 mt-0.5">
                    {skill.peopleTrained} people trained
                    {skill.certificationsEarned && skill.certificationsEarned > 0 && (
                      <span className="ml-2 text-brand-700">
                        • {skill.certificationsEarned} certifications earned
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-2xl">📚</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Assets Built */}
      {metrics.physicalAssets && metrics.physicalAssets.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-clay-700">
            Infrastructure Built
          </h4>
          <div className="grid gap-2 md:grid-cols-2">
            {metrics.physicalAssets.map((asset, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-brand-100 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-clay-900">{asset.type}</p>
                    <p className="text-xl font-bold text-brand-700 mt-1">
                      {asset.quantity} {asset.unit}
                    </p>
                  </div>
                  <span className="text-2xl">🏗️</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employability Outcomes */}
      {metrics.employabilityOutcomes && (
        <div className="rounded-lg border-2 border-brand-200 bg-brand-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✨</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-brand-900 uppercase tracking-wider">
                Long-term Impact
              </h4>
              <p className="text-clay-900 mt-2 leading-relaxed">{metrics.employabilityOutcomes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
