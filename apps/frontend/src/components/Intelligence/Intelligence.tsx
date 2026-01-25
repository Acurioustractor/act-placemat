/**
 * ACT Intelligence Center
 *
 * Unified view of:
 * - Agentic Layer (agents, proposals, activity)
 * - Knowledge Layer (entities, stories, embeddings)
 * - Communications (multi-channel)
 * - Relationships (health scores)
 *
 * Data sourced from act-global-infrastructure API (port 3456)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import type { TabId, Agent, Proposal, ActivityData, Task, KnowledgeStats, RelationshipHealth } from './Intelligence.types';
import { useIntelligenceData, useEntitySearch, useKnowledgeSources, useRelationships, useProposals, useScoutsOverview, useScoutsState, useAgentSelection, useTabNavigation } from './Intelligence.hooks';
import { OverviewTab } from './tabs/OverviewTab';
import { AgentsTab } from './tabs/AgentsTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { RelationshipsTab } from './tabs/RelationshipsTab';
import { ProposalsTab } from './tabs/ProposalsTab';
import { ScoutsTab } from './tabs/ScoutsTab';
import { StrategyPlansTab } from './tabs/StrategyPlansTab';

export function Intelligence() {
  // ============================================================================
  // State Management
  // ============================================================================

  const { activeTab, setActiveTab } = useTabNavigation();

  const {
    agents, setAgents,
    proposals, setProposals,
    activity, setActivity,
    tasks, setTasks,
    knowledge, setKnowledge,
    relationships, setRelationships,
    loading, error,
  } = useIntelligenceData();

  const {
    entitySearch, setEntitySearch,
    entityResults, setEntityResults,
    selectedEntity, setSelectedEntity,
    searchLoading,
    handleEntitySearch,
    handleEntitySelect,
  } = useEntitySearch();

  const { knowledgeSources, setKnowledgeSources } = useKnowledgeSources();

  const {
    relationshipsList, setRelationshipsList,
    attentionList, setAttentionList,
    overdueList, setOverdueList,
    relationshipFilter, setRelationshipFilter,
  } = useRelationships();

  const {
    selectedProposal, setSelectedProposal,
    draftModalOpen, setDraftModalOpen,
    draft, setDraft,
    draftLoading, setDraftLoading,
    sendLoading, setSendLoading,
    proposalFilter, setProposalFilter,
    handleApprove, handleReject,
    handleGenerateDraft, handleConfirmSend,
    handleCloseDraftModal,
  } = useProposals();

  const { scoutsOverview, setScoutsOverview } = useScoutsOverview();
  const { activeScout, setActiveScout, scoutLoading, setScoutLoading, scoutError, setScoutError } = useScoutsState();
  const { selectedAgent, setSelectedAgent } = useAgentSelection();

  // ============================================================================
  // BUNYA/ALTA Data State
  // ============================================================================

  const [bunyaData, setBunyaData] = useState<{ summary: Record<string, number>; projects: Array<{
    id: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    healthScore: number;
    status: 'healthy' | 'needs_attention' | 'at_risk' | 'critical';
    risks: string[];
    recommendations: string[];
    metadata: Record<string, unknown>;
    analyzedAt: string;
  }> } | null>(null);
  const [altaData, setAltaData] = useState<{ summary: Record<string, unknown>; grants: Array<{
    id: string;
    name: string;
    provider: string;
    category: string;
    status: string;
    deadline: string;
    daysUntilDeadline: number | null;
    amountMin: number;
    amountMax: number;
    amountDisplay: string;
    matchedProjects: string[];
    relevanceScore: number;
    url: string;
    notes: string;
    isUrgent: boolean;
  }> } | null>(null);
  const [fixingProject, setFixingProject] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ projectCode: string; actions: Array<{ type: string; message?: string; contacts?: number }> } | null>(null);
  const [fixAllLoading, setFixAllLoading] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetch('http://localhost:3456/api/knowledge/sources')
      .then(r => r.json())
      .then(data => setKnowledgeSources(data))
      .catch(() => setKnowledgeSources(null));
  }, [setKnowledgeSources]);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3456/api/relationships/list?limit=50').then(r => r.json()).catch(() => ({ relationships: [] })),
      fetch('http://localhost:3456/api/relationships/attention').then(r => r.json()).catch(() => ({ attention: [] })),
      fetch('http://localhost:3456/api/relationships/overdue').then(r => r.json()).catch(() => ({ overdue: [] })),
    ]).then(([relList, attention, overdue]) => {
      setRelationshipsList(relList.relationships || []);
      setAttentionList(attention.attention || []);
      setOverdueList(overdue.overdue || []);
    });
  }, [setRelationshipsList, setAttentionList, setOverdueList]);

  useEffect(() => {
    fetch('http://localhost:3456/api/scouts')
      .then(r => r.json())
      .then(data => setScoutsOverview(data.scouts || []))
      .catch(() => setScoutsOverview([]));
  }, [setScoutsOverview]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const onApprove = useCallback((id: string) => {
    handleApprove(id, proposals, setProposals);
  }, [handleApprove, proposals, setProposals]);

  const onReject = useCallback((id: string) => {
    handleReject(id, proposals, setProposals);
  }, [handleReject, proposals, setProposals]);

  const onGenerateDraft = useCallback((proposal: Proposal) => {
    handleGenerateDraft(proposal, setDraftLoading, setDraftModalOpen, setSelectedProposal, setDraft);
  }, [handleGenerateDraft, setDraftLoading, setDraftModalOpen, setSelectedProposal, setDraft]);

  const onConfirmSend = useCallback(() => {
    handleConfirmSend(selectedProposal, draft, proposals, setProposals, setDraftModalOpen, setSelectedProposal, setDraft, setSendLoading);
  }, [handleConfirmSend, selectedProposal, draft, proposals, setProposals, setDraftModalOpen, setSelectedProposal, setDraft, setSendLoading]);

  const onCloseDraftModal = useCallback(() => {
    handleCloseDraftModal(setDraftModalOpen, setSelectedProposal, setDraft);
  }, [handleCloseDraftModal, setDraftModalOpen, setSelectedProposal, setDraft]);

  const onScoutSelect = useCallback((scout: 'overview' | 'bunya' | 'alta') => {
    if (scout === 'bunya' && scout !== activeScout) {
      setActiveScout('bunya');
      setScoutError(null);
      if (!bunyaData) {
        setScoutLoading(true);
        fetch('http://localhost:3456/api/scouts/bunya')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(data => {
            setBunyaData(data);
            setScoutLoading(false);
          })
          .catch(err => {
            setScoutError('Failed to load BUNYA data.');
            setScoutLoading(false);
          });
      }
    } else if (scout === 'alta' && scout !== activeScout) {
      setActiveScout('alta');
      setScoutError(null);
      if (!altaData) {
        setScoutLoading(true);
        fetch('http://localhost:3456/api/scouts/alta')
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .then(data => {
            setAltaData(data);
            setScoutLoading(false);
          })
          .catch(err => {
            setScoutError('Failed to load ALTA data.');
            setScoutLoading(false);
          });
      }
    } else {
      setActiveScout(scout);
    }
  }, [activeScout, bunyaData, altaData, setActiveScout, setScoutError, setScoutLoading, setBunyaData, setAltaData]);

  const onFixProject = useCallback(async (projectCode: string) => {
    setFixingProject(projectCode);
    setFixResult(null);
    try {
      const res = await fetch(`http://localhost:3456/api/scouts/bunya/fix/${projectCode}`, { method: 'POST' });
      const data = await res.json();
      setFixResult(data);
      const bunyaRes = await fetch('http://localhost:3456/api/scouts/bunya').then(r => r.json());
      setBunyaData(bunyaRes);
    } catch (err) {
      setFixResult({ projectCode, actions: [{ type: 'error', message: 'Failed to fix project' }] });
    } finally {
      setFixingProject(null);
    }
  }, [setFixingProject, setFixResult, setBunyaData]);

  const onFixAll = useCallback(async () => {
    setFixAllLoading(true);
    setFixResult(null);
    try {
      const res = await fetch('http://localhost:3456/api/scouts/bunya/fix-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      setFixResult({ projectCode: 'all', actions: [{ type: 'batch', message: `Fixed ${data.fixed} projects, created ${data.proposed} proposals, skipped ${data.skipped}` }] });
      const bunyaRes = await fetch('http://localhost:3456/api/scouts/bunya').then(r => r.json());
      setBunyaData(bunyaRes);
    } catch (err) {
      setFixResult({ projectCode: 'all', actions: [{ type: 'error', message: 'Failed to fix projects' }] });
    } finally {
      setFixAllLoading(false);
    }
  }, [setFixAllLoading, setFixResult, setBunyaData]);

  const onClearFixResult = useCallback(() => {
    setFixResult(null);
  }, [setFixResult]);

  // ============================================================================
  // Error State
  // ============================================================================

  if (error) {
    return (
      <div className="p-8">
        <Card variant="bordered" padding="lg">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Connection Error</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              Retry Connection
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Intelligence Center</h1>
          <p className="text-sm text-slate-500 mt-1">Agents, knowledge, and relationships at a glance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
          {loading ? 'Updating...' : 'Live'}
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['overview', 'agents', 'knowledge', 'relationships', 'proposals', 'scouts', 'strategy'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'proposals' && proposals.count > 0 ? (
              <span className="flex items-center gap-2">
                {tab}
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{proposals.count}</span>
              </span>
            ) : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          agents={agents}
          proposals={proposals}
          knowledge={knowledge}
          activity={activity}
          onNavigateToTab={setActiveTab}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}

      {activeTab === 'agents' && (
        <AgentsTab
          agents={agents}
          activity={activity}
          tasks={tasks}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
      )}

      {activeTab === 'knowledge' && (
        <KnowledgeTab
          knowledge={knowledge}
          knowledgeSources={knowledgeSources}
          entitySearch={entitySearch}
          entityResults={entityResults}
          selectedEntity={selectedEntity}
          searchLoading={searchLoading}
          onEntitySearch={handleEntitySearch}
          onEntitySelect={handleEntitySelect}
          onClearSelectedEntity={() => setSelectedEntity(null)}
        />
      )}

      {activeTab === 'relationships' && (
        <RelationshipsTab
          relationships={relationships}
          relationshipsList={relationshipsList}
          attentionList={attentionList}
          overdueList={overdueList}
          relationshipFilter={relationshipFilter}
          onFilterChange={setRelationshipFilter}
        />
      )}

      {activeTab === 'proposals' && (
        <ProposalsTab
          proposals={proposals}
          selectedProposal={selectedProposal}
          draftModalOpen={draftModalOpen}
          draft={draft}
          draftLoading={draftLoading}
          sendLoading={sendLoading}
          proposalFilter={proposalFilter}
          onFilterChange={setProposalFilter}
          onApprove={onApprove}
          onReject={onReject}
          onGenerateDraft={onGenerateDraft}
          onConfirmSend={onConfirmSend}
          onCloseDraftModal={onCloseDraftModal}
          onDraftChange={setDraft}
        />
      )}

      {activeTab === 'scouts' && (
        <ScoutsTab
          scoutsOverview={scoutsOverview}
          bunyaData={bunyaData}
          altaData={altaData}
          activeScout={activeScout}
          scoutLoading={scoutLoading}
          scoutError={scoutError}
          fixingProject={fixingProject}
          fixResult={fixResult}
          fixAllLoading={fixAllLoading}
          onScoutSelect={onScoutSelect}
          onFixProject={onFixProject}
          onFixAll={onFixAll}
          onClearFixResult={onClearFixResult}
        />
      )}

      {activeTab === 'strategy' && <StrategyPlansTab />}
    </div>
  );
}
