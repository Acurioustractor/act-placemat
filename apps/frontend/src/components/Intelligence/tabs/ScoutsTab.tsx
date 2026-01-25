/**
 * Scouts Tab
 *
 * Overview of scouting agents (BUNYA, ALTA) for project health and grant opportunities.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { MetricCard } from '../../ui/MetricCard';
import { StatusBadge } from '../../ui/StatusBadge';
import type { ScoutSummary, BunyaProject, AltaGrant, FixResult } from '../Intelligence.types';

interface ScoutsTabProps {
  scoutsOverview: ScoutSummary[];
  bunyaData: { summary: Record<string, number>; projects: BunyaProject[] } | null;
  altaData: { summary: Record<string, unknown>; grants: AltaGrant[] } | null;
  activeScout: 'overview' | 'bunya' | 'alta';
  scoutLoading: boolean;
  scoutError: string | null;
  fixingProject: string | null;
  fixResult: FixResult | null;
  fixAllLoading: boolean;
  onScoutSelect: (scout: 'overview' | 'bunya' | 'alta') => void;
  onFixProject: (projectCode: string) => void;
  onFixAll: () => void;
  onClearFixResult: () => void;
}

export function ScoutsTab({
  scoutsOverview,
  bunyaData,
  altaData,
  activeScout,
  scoutLoading,
  scoutError,
  fixingProject,
  fixResult,
  fixAllLoading,
  onScoutSelect,
  onFixProject,
  onFixAll,
  onClearFixResult,
}: ScoutsTabProps) {
  return (
    <div className="space-y-6">
      {/* Scout Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onScoutSelect('overview')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeScout === 'overview'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onScoutSelect('bunya')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
            activeScout === 'bunya'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>BUNYA</span>
        </button>
        <button
          onClick={() => onScoutSelect('alta')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
            activeScout === 'alta'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>ALTA</span>
        </button>
      </div>

      {/* Scouts Overview */}
      {activeScout === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scoutsOverview.map((scout) => {
            const badgeStatus = scout.status === 'healthy' ? 'active' :
                               scout.status === 'warning' ? 'needs-attention' :
                               scout.status === 'attention' ? 'paused' : 'inactive';
            return (
              <Card
                key={scout.id}
                variant="soft"
                padding="lg"
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onScoutSelect(scout.id as 'bunya' | 'alta')}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{scout.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{scout.name}</h3>
                      <StatusBadge status={badgeStatus} />
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{scout.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(scout.summary).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium text-slate-900">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {scoutsOverview.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Scout Data</h3>
              <p className="text-slate-600">Run the scouts to populate data.</p>
            </div>
          )}
        </div>
      )}

      {/* BUNYA Project Pulse */}
      {activeScout === 'bunya' && bunyaData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard title="Total Projects" value={bunyaData.summary.total || 0} status="healthy" />
            <MetricCard title="Healthy" value={bunyaData.summary.healthy || 0} status="healthy" />
            <MetricCard title="Needs Attention" value={bunyaData.summary.needsAttention || 0} status={bunyaData.summary.needsAttention > 0 ? 'warning' : 'healthy'} />
            <MetricCard title="At Risk" value={bunyaData.summary.atRisk || 0} status={bunyaData.summary.atRisk > 0 ? 'critical' : 'healthy'} />
            <MetricCard title="Critical" value={bunyaData.summary.critical || 0} status={bunyaData.summary.critical > 0 ? 'critical' : 'healthy'} />
          </div>

          {fixResult && (
            <div className={`p-4 rounded-lg ${fixResult.actions[0]?.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${fixResult.actions[0]?.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
                    {fixResult.projectCode === 'all' ? 'Batch Fix' : `Fixed ${fixResult.projectCode}`}
                  </span>
                </div>
                <button onClick={onClearFixResult} className="text-slate-400 hover:text-slate-600">Close</button>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {fixResult.actions.map((action, i) => (
                  <div key={i}>{action.message}</div>
                ))}
              </div>
            </div>
          )}

          <Card variant="soft" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Project Health</h3>
              <button
                onClick={onFixAll}
                disabled={fixAllLoading}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {fixAllLoading ? 'Fixing...' : 'Fix All Issues'}
              </button>
            </div>
            <div className="space-y-3">
              {bunyaData.projects.map((project) => (
                <div key={project.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
                    project.status === 'healthy' ? 'bg-emerald-500' :
                    project.status === 'needs_attention' ? 'bg-yellow-500' :
                    project.status === 'at_risk' ? 'bg-orange-500' : 'bg-red-500'
                  }`}>
                    {project.healthScore}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{project.projectName}</h4>
                      <span className="text-xs text-slate-500">{project.projectCode}</span>
                    </div>
                    {project.risks.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">{project.risks[0]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-500">
                      {project.analyzedAt && new Date(project.analyzedAt).toLocaleDateString()}
                    </div>
                    {project.status !== 'healthy' && project.projectCode && (
                      <button
                        onClick={() => onFixProject(project.projectCode)}
                        disabled={fixingProject === project.projectCode}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 disabled:opacity-50"
                      >
                        {fixingProject === project.projectCode ? 'Fixing...' : 'Fix'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {bunyaData.projects.length === 0 && (
                <p className="text-center text-slate-500 py-8">No project health data.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ALTA Grant Scout */}
      {activeScout === 'alta' && altaData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard title="Total Grants" value={(altaData.summary.total as number) || 0} status="healthy" />
            <MetricCard title="Open" value={(altaData.summary.open as number) || 0} status="healthy" />
            <MetricCard title="Applied" value={(altaData.summary.applied as number) || 0} status="healthy" />
            <MetricCard title="Upcoming 30 Days" value={(altaData.summary.upcoming30Days as number) || 0} status={(altaData.summary.upcoming30Days as number) > 0 ? 'warning' : 'healthy'} />
            <MetricCard title="Total Value" value={(altaData.summary.totalOpportunityDisplay as string) || '$0'} status="healthy" />
          </div>

          <Card variant="soft" padding="lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Grant Opportunities</h3>
            <div className="space-y-3">
              {altaData.grants.map((grant) => (
                <div key={grant.id} className={`flex items-center gap-4 p-3 bg-white rounded-lg border ${grant.isUrgent ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    grant.isUrgent ? 'bg-red-500 text-white' :
                    grant.status === 'applied' ? 'bg-blue-500 text-white' :
                    grant.status === 'awarded' ? 'bg-emerald-500 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {grant.isUrgent ? '!' : grant.status === 'awarded' ? '✓' : '🦅'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{grant.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        grant.status === 'open' ? 'bg-green-100 text-green-700' :
                        grant.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                        grant.status === 'awarded' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {grant.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{grant.provider} - {grant.category}</p>
                    {grant.matchedProjects.length > 0 && (
                      <p className="text-sm text-emerald-600 mt-1">Matched: {grant.matchedProjects.join(', ')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-900">{grant.amountDisplay}</div>
                    <div className={`text-sm ${grant.isUrgent ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {grant.daysUntilDeadline !== null && grant.daysUntilDeadline >= 0
                        ? `${grant.daysUntilDeadline} days left`
                        : grant.deadline && new Date(grant.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  {grant.url && (
                    <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {((activeScout === 'bunya' && !bunyaData) || (activeScout === 'alta' && !altaData)) && (
        <div className="flex flex-col items-center justify-center py-12">
          {scoutError ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <span className="text-red-600 font-medium">{scoutError}</span>
              </div>
            </>
          ) : scoutLoading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              <span className="mt-3 text-slate-600">Loading scout data...</span>
            </>
          ) : (
            <span className="text-slate-500">Click a scout button to load data</span>
          )}
        </div>
      )}
    </div>
  );
}
