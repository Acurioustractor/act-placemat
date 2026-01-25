/**
 * Agents Tab
 *
 * Detailed view of all agents with performance metrics and task queue.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import type { Agent, ActivityData, Task } from '../Intelligence.types';
import { getAutonomyLabel } from '../Intelligence.utils';

interface AgentsTabProps {
  agents: Agent[];
  activity: ActivityData;
  tasks: Task[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
}

export function AgentsTab({
  agents,
  activity,
  tasks,
  selectedAgent,
  onSelectAgent,
}: AgentsTabProps) {
  const calculateSuccessRate = (): string => {
    if (activity.count === 0) return 'N/A';
    const totalSuccess = Object.values(activity.byAgent).reduce((acc, a) => acc + a.success, 0);
    return `${Math.round((totalSuccess / activity.count) * 100)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Total Agents</p>
          <p className="text-2xl font-bold text-slate-900">{agents.length}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Active Now</p>
          <p className="text-2xl font-bold text-emerald-600">
            {agents.filter(a => a.current_task_id).length}
          </p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Queued Tasks</p>
          <p className="text-2xl font-bold text-blue-600">
            {tasks.filter(t => t.status === 'queued').length}
          </p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Success Rate</p>
          <p className="text-2xl font-bold text-slate-900">{calculateSuccessRate()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">All Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => {
              const autonomy = getAutonomyLabel(agent.autonomy_level);
              const isActive = !!agent.current_task_id;
              const perf = activity.byAgent[agent.id];
              const isSelected = selectedAgent?.id === agent.id;
              const agentTasks = tasks.filter(t => t.assigned_agent === agent.id);

              return (
                <Card
                  key={agent.id}
                  variant={isSelected ? 'bordered' : 'soft'}
                  padding="md"
                  hover
                  onClick={() => onSelectAgent(isSelected ? null : agent)}
                  className={isSelected ? 'ring-2 ring-emerald-500' : ''}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                      <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${autonomy.color}`}>
                      {autonomy.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{agent.description}</p>

                  {perf && perf.count > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{perf.count} actions</span>
                        <span>{Math.round((perf.success / perf.count) * 100)}% success</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(perf.success / perf.count) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize">{agent.domain}</span>
                    <span>{agentTasks.filter(t => t.status === 'queued').length} queued</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Task Queue Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Task Queue
            {selectedAgent && <span className="text-sm font-normal text-slate-500 ml-2">({selectedAgent.name})</span>}
          </h2>
          <Card variant="bordered" padding="md">
            {(() => {
              const filteredTasks = selectedAgent
                ? tasks.filter(t => t.assigned_agent === selectedAgent.id)
                : tasks;
              const queuedTasks = filteredTasks.filter(t => t.status === 'queued' || t.status === 'running');

              if (queuedTasks.length === 0) {
                return (
                  <p className="text-slate-500 text-center py-8">
                    {selectedAgent ? `No tasks for ${selectedAgent.name}` : 'No queued tasks'}
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {queuedTasks.slice(0, 8).map((task) => (
                    <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                          task.status === 'running'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {task.status === 'running' ? 'Running' : 'Queued'}
                        </span>
                        <span className="text-xs text-slate-400">{task.agent_name}</span>
                      </div>
                      <p className="text-sm text-slate-900 line-clamp-2">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          <h2 className="text-lg font-semibold text-slate-900 pt-4">Recent Completions</h2>
          <Card variant="soft" padding="md">
            {(() => {
              const filteredTasks = selectedAgent
                ? tasks.filter(t => t.assigned_agent === selectedAgent.id)
                : tasks;
              const doneTasks = filteredTasks.filter(t => t.status === 'done').slice(0, 5);

              if (doneTasks.length === 0) {
                return <p className="text-slate-500 text-center py-4">No recent completions</p>;
              }

              return (
                <div className="space-y-2">
                  {doneTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                      <span className="text-green-500">✓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-400">{task.agent_name}</p>
                      </div>
                      {task.duration_ms && (
                        <span className="text-xs text-slate-400">
                          {(task.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>

      {/* Agent Activity Timeline */}
      {selectedAgent && (
        <Card variant="bordered" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {selectedAgent.name} Activity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.activity
                  .filter(a => a.agent_id === selectedAgent.id)
                  .slice(0, 10)
                  .map((item) => (
                    <tr key={item.id} className="text-sm">
                      <td className="py-3 text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-900">{item.action}</td>
                      <td className="py-3">
                        <span className={`inline-flex2 py-0 items-center px-.5 rounded-full text-xs font-medium ${
                          item.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {activity.activity.filter(a => a.agent_id === selectedAgent.id).length === 0 && (
              <p className="text-slate-500 text-center py-8">No activity recorded for this agent</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
