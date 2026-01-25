/**
 * Relationships Tab
 *
 * Relationship health scores and contact management.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import type { RelationshipHealth, Relationship } from '../Intelligence.types';
import { getTemperatureColor, getTrendIcon, getDaysSince } from '../Intelligence.utils';

interface RelationshipsTabProps {
  relationships: RelationshipHealth | null;
  relationshipsList: Relationship[];
  attentionList: Relationship[];
  overdueList: Relationship[];
  relationshipFilter: 'all' | 'hot' | 'warm' | 'cool';
  onFilterChange: (filter: 'all' | 'hot' | 'warm' | 'cool') => void;
}

export function RelationshipsTab({
  relationships,
  relationshipsList,
  attentionList,
  overdueList,
  relationshipFilter,
  onFilterChange,
}: RelationshipsTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{relationships?.total || 0}</p>
        </Card>
        <Card variant="soft" padding="md" className="cursor-pointer hover:ring-2 hover:ring-red-300" onClick={() => onFilterChange('hot')}>
          <p className="text-sm text-slate-500">Hot (80+)</p>
          <p className="text-2xl font-bold text-red-600">{relationships?.hot || 0}</p>
        </Card>
        <Card variant="soft" padding="md" className="cursor-pointer hover:ring-2 hover:ring-yellow-300" onClick={() => onFilterChange('warm')}>
          <p className="text-sm text-slate-500">Warm (50-79)</p>
          <p className="text-2xl font-bold text-yellow-600">{relationships?.warm || 0}</p>
        </Card>
        <Card variant="soft" padding="md" className="cursor-pointer hover:ring-2 hover:ring-blue-300" onClick={() => onFilterChange('cool')}>
          <p className="text-sm text-slate-500">Cool (&lt;50)</p>
          <p className="text-2xl font-bold text-blue-600">{relationships?.cool || 0}</p>
        </Card>
        <Card variant="bordered" padding="md">
          <p className="text-sm text-slate-500">Needs Attention</p>
          <p className="text-2xl font-bold text-orange-600">{relationships?.needsAttention || 0}</p>
        </Card>
        <Card variant="bordered" padding="md">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{relationships?.overdue || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Relationships List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter:</span>
            {(['all', 'hot', 'warm', 'cool'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                  relationshipFilter === filter
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <Card variant="bordered" padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Relationships
              {relationshipFilter !== 'all' && (
                <span className="ml-2 text-sm font-normal text-slate-500">({relationshipFilter})</span>
              )}
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {relationshipsList
                .filter((r) => {
                  if (relationshipFilter === 'all') return true;
                  if (relationshipFilter === 'hot') return r.temperature >= 80;
                  if (relationshipFilter === 'warm') return r.temperature >= 50 && r.temperature < 80;
                  if (relationshipFilter === 'cool') return r.temperature < 50;
                  return true;
                })
                .map((rel) => {
                  const tempColor = getTemperatureColor(rel.temperature);
                  const daysSince = getDaysSince(rel.last_contact_date);
                  return (
                    <div key={rel.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900 truncate">{rel.contact_name || 'Unknown'}</p>
                            {rel.trend && <span className="text-sm">{getTrendIcon(rel.trend)}</span>}
                          </div>
                          {rel.next_action && (
                            <p className="text-sm text-slate-600 truncate">→ {rel.next_action}</p>
                          )}
                          {rel.tags && rel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rel.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full ${tempColor.bg} rounded-full`} style={{ width: `${rel.temperature}%` }} />
                            </div>
                            <span className={`text-sm font-medium ${tempColor.text}`}>{rel.temperature}</span>
                          </div>
                          {daysSince !== null && (
                            <span className={`text-xs ${daysSince > 60 ? 'text-red-500' : daysSince > 30 ? 'text-yellow-600' : 'text-slate-400'}`}>
                              {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {relationshipsList.length === 0 && (
                <p className="text-slate-500 text-center py-8">No relationship data available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card variant="bordered" padding="lg" className="border-orange-200 bg-orange-50/30">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-orange-500">Needs Attention</span>
            </h2>
            {attentionList.length > 0 ? (
              <div className="space-y-3">
                {attentionList.slice(0, 8).map((rel) => {
                  const daysSince = getDaysSince(rel.last_contact_date);
                  const tempColor = getTemperatureColor(rel.temperature);
                  return (
                    <div key={rel.id} className="p-2 bg-white rounded-lg border border-orange-100">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm truncate">{rel.contact_name || 'Unknown'}</p>
                          {rel.next_action && <p className="text-xs text-slate-500 truncate">{rel.next_action}</p>}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tempColor.light} ${tempColor.text}`}>
                          {rel.temperature}°
                        </span>
                      </div>
                      {daysSince !== null && (
                        <p className="text-xs text-orange-600 mt-1">
                          Last contact: {daysSince === 0 ? 'Today' : `${daysSince} days ago`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">All relationships healthy!</p>
            )}
          </Card>

          <Card variant="bordered" padding="lg" className="border-red-200 bg-red-50/30">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-red-500">Overdue (60+ days)</span>
            </h2>
            {overdueList.length > 0 ? (
              <div className="space-y-2">
                {overdueList.slice(0, 8).map((rel) => {
                  const daysSince = getDaysSince(rel.last_contact_date);
                  return (
                    <div key={rel.id} className="p-2 bg-white rounded-lg border border-red-100">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900 text-sm truncate flex-1">{rel.contact_name || 'Unknown'}</p>
                        <span className="text-xs text-red-600 ml-2">{daysSince ? `${daysSince}d` : 'Never'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No overdue follow-ups!</p>
            )}
          </Card>

          {relationships && relationships.total > 0 && (
            <Card variant="soft" padding="lg">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribution</h2>
              <div className="flex items-end h-32 gap-3">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-red-400 rounded-t-lg transition-all" style={{ height: `${Math.max((relationships.hot / relationships.total) * 100, 5)}%` }} />
                  <span className="mt-2 text-xs text-slate-600">Hot</span>
                  <span className="text-sm font-medium">{relationships.hot}</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-yellow-400 rounded-t-lg transition-all" style={{ height: `${Math.max((relationships.warm / relationships.total) * 100, 5)}%` }} />
                  <span className="mt-2 text-xs text-slate-600">Warm</span>
                  <span className="text-sm font-medium">{relationships.warm}</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-400 rounded-t-lg transition-all" style={{ height: `${Math.max((relationships.cool / relationships.total) * 100, 5)}%` }} />
                  <span className="mt-2 text-xs text-slate-600">Cool</span>
                  <span className="text-sm font-medium">{relationships.cool}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
