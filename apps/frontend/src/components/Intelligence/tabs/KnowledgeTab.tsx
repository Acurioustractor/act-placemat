/**
 * Knowledge Tab
 *
 * Entity search and knowledge graph visualization.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import type { KnowledgeStats, KnowledgeSources, Entity } from '../Intelligence.types';

interface KnowledgeTabProps {
  knowledge: KnowledgeStats | null;
  knowledgeSources: KnowledgeSources | null;
  entitySearch: string;
  entityResults: Entity[];
  selectedEntity: Entity | null;
  searchLoading: boolean;
  onEntitySearch: (query: string) => void;
  onEntitySelect: (entity: Entity) => void;
  onClearSelectedEntity: () => void;
}

export function KnowledgeTab({
  knowledge,
  knowledgeSources,
  entitySearch,
  entityResults,
  selectedEntity,
  searchLoading,
  onEntitySearch,
  onEntitySelect,
  onClearSelectedEntity,
}: KnowledgeTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">RAG Chunks</p>
          <p className="text-2xl font-bold text-slate-900">{knowledge?.knowledgeChunks || 0}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Entities</p>
          <p className="text-2xl font-bold text-blue-600">{knowledge?.entities || 0}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Identifiers</p>
          <p className="text-2xl font-bold text-slate-900">{knowledge?.identifiers || 0}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Stories</p>
          <p className="text-2xl font-bold text-emerald-600">{knowledge?.stories || 0}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">QA Pairs</p>
          <p className="text-2xl font-bold text-slate-900">{knowledge?.qaPairs || 0}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Vignettes</p>
          <p className="text-2xl font-bold text-purple-600">{knowledge?.vignettes || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Search */}
        <div className="lg:col-span-2 space-y-4">
          <Card variant="bordered" padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Entity Search</h2>
            <div className="relative">
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => onEntitySearch(e.target.value)}
                placeholder="Search entities by name..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            {entityResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {entityResults.map((entity) => (
                  <div
                    key={entity.id}
                    onClick={() => onEntitySelect(entity)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedEntity?.id === entity.id
                        ? 'bg-emerald-50 ring-2 ring-emerald-500'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{entity.canonical_name}</p>
                        <p className="text-sm text-slate-500">{entity.entity_type}</p>
                      </div>
                      <span className="px-2 py--medium rounded-full bg1 text-xs font-blue-100 text-blue-700">
                        {entity.identifiers?.length || 0} IDs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {entitySearch.length >= 2 && entityResults.length === 0 && !searchLoading && (
              <p className="mt-4 text-slate-500 text-center py-4">No entities found for &quot;{entitySearch}&quot;</p>
            )}

            {entitySearch.length < 2 && (
              <p className="mt-4 text-slate-400 text-sm">Type at least 2 characters to search</p>
            )}
          </Card>

          {/* Entity Detail */}
          {selectedEntity && (
            <Card variant="soft" padding="lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedEntity.canonical_name}</h2>
                  <p className="text-sm text-slate-500">{selectedEntity.entity_type}</p>
                </div>
                <button onClick={onClearSelectedEntity} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedEntity.identifiers && selectedEntity.identifiers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Identifiers ({selectedEntity.identifiers.length})</h3>
                  <div className="space-y-2">
                    {selectedEntity.identifiers.map((id) => (
                      <div key={id.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{id.identifier_type}:</span>
                          <span className="ml-2 text-slate-600">{id.identifier_value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{id.source}</span>
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            id.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                            id.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {Math.round(id.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Created: {new Date(selectedEntity.created_at).toLocaleDateString()}
              </p>
            </Card>
          )}
        </div>

        {/* Knowledge Sources Breakdown */}
        <div className="space-y-4">
          <Card variant="bordered" padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Entity Types</h2>
            {knowledgeSources?.entitiesByType && Object.keys(knowledgeSources.entitiesByType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(knowledgeSources.entitiesByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(knowledgeSources.entitiesByType).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 capitalize">{type || 'unknown'}</span>
                          <span className="text-slate-500">{count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No entity type data available</p>
            )}
          </Card>

          <Card variant="soft" padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Identifier Types</h2>
            {knowledgeSources?.identifiersByType && Object.keys(knowledgeSources.identifiersByType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(knowledgeSources.identifiersByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{type}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No identifier data available</p>
            )}
          </Card>

          <Card variant="soft" padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Knowledge Sources</h2>
            {knowledgeSources?.knowledgeBySource && Object.keys(knowledgeSources.knowledgeBySource).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(knowledgeSources.knowledgeBySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600">{source}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No source data available</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
