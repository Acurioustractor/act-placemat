/**
 * Overview Tab
 *
 * Summary dashboard showing key metrics and quick views.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import { MetricCard } from '../../ui/MetricCard';
import type { Agent, Proposal, KnowledgeStats, ActivityData } from '../Intelligence.types';
import { getPriorityColor, getAutonomyLabel } from '../Intelligence.utils';

interface OverviewTabProps {
  agents: Agent[];
  proposals: { count: number; proposals: Proposal[] };
  knowledge: KnowledgeStats | null;
  activity: ActivityData;
  onNavigateToTab: (tab: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function OverviewTab({
  agents,
  proposals,
  knowledge,
  activity,
  onNavigateToTab,
  onApprove,
  onReject,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Agents"
          value={agents.length}
          subtitle={`${agents.filter(a => a.current_task_id).length} currently working`}
          status="healthy"
        />
        <MetricCard
          title="Pending Approvals"
          value={proposals.count}
          subtitle={`${proposals.proposals.filter(p => p.priority === 'urgent').length} urgent`}
          status={proposals.count > 10 ? 'warning' : 'healthy'}
        />
        <MetricCard
          title="Entities"
          value={knowledge?.entities || 0}
          subtitle={`${knowledge?.identifiers || 0} identifiers`}
          status="healthy"
        />
        <MetricCard
          title="Stories"
          value={knowledge?.stories || 0}
          subtitle={`${knowledge?.storytellers || 0} storytellers`}
          status="healthy"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents Panel */}
        <Card variant="soft" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Agentic Layer
          </h2>
          <div className="space-y-3">
            {agents.slice(0, 6).map((agent) => {
              const autonomy = getAutonomyLabel(agent.autonomy_level);
              const isActive = !!agent.current_task_id;
              return (
                <div key={agent.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="font-medium text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.domain}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${autonomy.color}`}>
                    {autonomy.label}
                  </span>
                </div>
              );
            })}
          </div>
          {agents.length > 6 && (
            <button
              onClick={() => onNavigateToTab('agents')}
              className="mt-4 text-sm text-emerald-600 hover:text-emerald-700"
            >
              View all {agents.length} agents
            </button>
          )}
        </Card>

        {/* Knowledge Panel */}
        <Card variant="soft" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Knowledge Layer
          </h2>
          {knowledge && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{knowledge.knowledgeChunks}</p>
                <p className="text-sm text-slate-500">RAG Chunks</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{knowledge.qaPairs}</p>
                <p className="text-sm text-slate-500">QA Pairs</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{knowledge.entities}</p>
                <p className="text-sm text-slate-500">Entities</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{knowledge.vignettes}</p>
                <p className="text-sm text-slate-500">Vignettes</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card variant="bordered" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Pending Approvals ({proposals.count})
        </h2>
        {proposals.proposals.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No pending approvals</p>
        ) : (
          <div className="space-y-3">
            {proposals.proposals.slice(0, 5).map((proposal) => (
              <div key={proposal.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(proposal.priority)}`}>
                      {proposal.priority}
                    </span>
                    <span className="text-xs text-slate-500">{proposal.agent_id}</span>
                  </div>
                  <p className="font-medium text-slate-900">{proposal.title}</p>
                  {proposal.reasoning?.details && (
                    <p className="text-sm text-slate-600 mt-1">{proposal.reasoning.details}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onApprove(proposal.id)}
                    className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(proposal.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card variant="soft" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Agent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Time</th>
                <th className="pb-3">Agent</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activity.activity.slice(0, 10).map((item) => (
                <tr key={item.id} className="text-sm">
                  <td className="py-3 text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 font-medium text-slate-900">{item.agent_id}</td>
                  <td className="py-3 text-slate-600">{item.action}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
