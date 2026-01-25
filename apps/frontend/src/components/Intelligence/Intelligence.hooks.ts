/**
 * Intelligence Hooks
 *
 * Custom React hooks for the Intelligence Center component.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Agent,
  Proposal,
  ActivityData,
  Task,
  KnowledgeStats,
  RelationshipHealth,
  Entity,
  KnowledgeSources,
  Relationship,
  ScoutSummary,
  BunyaData,
  AltaData,
  Draft,
  FixResult,
} from './Intelligence.types';
import { API_BASE } from './Intelligence.utils';

// ============================================================================
// Data Fetching Hooks
// ============================================================================

/**
 * Hook for fetching all main intelligence data
 */
export function useIntelligenceData() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [proposals, setProposals] = useState<{ count: number; proposals: Proposal[] }>({ count: 0, proposals: [] });
  const [activity, setActivity] = useState<ActivityData>({ count: 0, byAgent: {}, activity: [] });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeStats | null>(null);
  const [relationships, setRelationships] = useState<RelationshipHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [agentsRes, proposalsRes, activityRes, tasksRes, knowledgeRes, relationshipsRes] = await Promise.all([
          fetch(`${API_BASE}/agents/active`).then(r => r.json()),
          fetch(`${API_BASE}/agents/proposals`).then(r => r.json()),
          fetch(`${API_BASE}/agents/activity`).then(r => r.json()),
          fetch(`${API_BASE}/tasks`).then(r => r.json()),
          fetch(`${API_BASE}/knowledge/stats`).then(r => r.json()),
          fetch(`${API_BASE}/relationships/health`).then(r => r.json()),
        ]);

        setAgents(agentsRes);
        setProposals(proposalsRes);
        setActivity(activityRes);
        setTasks(tasksRes);
        setKnowledge(knowledgeRes);
        setRelationships(relationshipsRes);
      } catch (err) {
        setError('Failed to connect to Intelligence API. Is the server running on port 3456?');
        console.error('Intelligence API error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    agents,
    setAgents,
    proposals,
    setProposals,
    activity,
    setActivity,
    tasks,
    setTasks,
    knowledge,
    setKnowledge,
    relationships,
    setRelationships,
    loading,
    error,
  };
}

// ============================================================================
// Knowledge Tab Hooks
// ============================================================================

/**
 * Hook for entity search functionality
 */
export function useEntitySearch() {
  const [entitySearch, setEntitySearch] = useState('');
  const [entityResults, setEntityResults] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleEntitySearch = useCallback(async (query: string) => {
    setEntitySearch(query);
    if (query.length < 2) {
      setEntityResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/entities/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setEntityResults(data.entities || []);
    } catch (err) {
      console.error('Entity search error:', err);
      setEntityResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleEntitySelect = useCallback(async (entity: Entity) => {
    if (selectedEntity?.id === entity.id) {
      setSelectedEntity(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/entities/${entity.id}`);
      const data = await res.json();
      setSelectedEntity(data);
    } catch (err) {
      console.error('Entity fetch error:', err);
      setSelectedEntity(entity);
    }
  }, [selectedEntity]);

  return {
    entitySearch,
    setEntitySearch,
    entityResults,
    setEntityResults,
    selectedEntity,
    setSelectedEntity,
    searchLoading,
    handleEntitySearch,
    handleEntitySelect,
  };
}

/**
 * Hook for knowledge sources data
 */
export function useKnowledgeSources() {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSources | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/knowledge/sources`)
      .then(r => r.json())
      .then(data => setKnowledgeSources(data))
      .catch(() => setKnowledgeSources(null));
  }, []);

  return { knowledgeSources, setKnowledgeSources };
}

// ============================================================================
// Relationships Tab Hooks
// ============================================================================

/**
 * Hook for relationships data
 */
export function useRelationships() {
  const [relationshipsList, setRelationshipsList] = useState<Relationship[]>([]);
  const [attentionList, setAttentionList] = useState<Relationship[]>([]);
  const [overdueList, setOverdueList] = useState<Relationship[]>([]);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'hot' | 'warm' | 'cool'>('all');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/relationships/list?limit=50`).then(r => r.json()).catch(() => ({ relationships: [] })),
      fetch(`${API_BASE}/relationships/attention`).then(r => r.json()).catch(() => ({ attention: [] })),
      fetch(`${API_BASE}/relationships/overdue`).then(r => r.json()).catch(() => ({ overdue: [] })),
    ]).then(([relList, attention, overdue]) => {
      setRelationshipsList(relList.relationships || []);
      setAttentionList(attention.attention || []);
      setOverdueList(overdue.overdue || []);
    });
  }, []);

  return {
    relationshipsList,
    setRelationshipsList,
    attentionList,
    setAttentionList,
    overdueList,
    setOverdueList,
    relationshipFilter,
    setRelationshipFilter,
  };
}

// ============================================================================
// Proposals Tab Hooks
// ============================================================================

/**
 * Hook for proposal management
 */
export function useProposals() {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'draft_ready'>('all');

  const handleApprove = useCallback(async (id: string, currentProposals: { count: number; proposals: Proposal[] }, setProposals: (val: { count: number; proposals: Proposal[] }) => void) => {
    try {
      await fetch(`${API_BASE}/proposals/${id}/approve`, { method: 'POST' });
      setProposals({
        ...currentProposals,
        count: currentProposals.count - 1,
        proposals: currentProposals.proposals.filter(p => p.id !== id),
      });
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  }, []);

  const handleReject = useCallback(async (id: string, currentProposals: { count: number; proposals: Proposal[] }, setProposals: (val: { count: number; proposals: Proposal[] }) => void) => {
    try {
      await fetch(`${API_BASE}/proposals/${id}/reject`, { method: 'POST' });
      setProposals({
        ...currentProposals,
        count: currentProposals.count - 1,
        proposals: currentProposals.proposals.filter(p => p.id !== id),
      });
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  }, []);

  const handleGenerateDraft = useCallback(async (proposal: Proposal, setDraftLoadingFn: (val: boolean) => void, setDraftModalOpenFn: (val: boolean) => void, setSelectedProposalFn: (val: Proposal | null) => void, setDraftFn: (val: Draft | null) => void) => {
    setSelectedProposalFn(proposal);
    setDraftLoadingFn(true);
    setDraftModalOpenFn(true);

    try {
      const res = await fetch(`${API_BASE}/proposals/${proposal.id}/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setDraftFn({
        subject: data.draft?.subject || '',
        body: data.draft?.body || '',
        channel: data.draft?.channel || 'email',
        recipient: data.draft?.recipient || '',
      });
    } catch (err) {
      console.error('Failed to generate draft:', err);
      setDraftFn(null);
    } finally {
      setDraftLoadingFn(false);
    }
  }, []);

  const handleConfirmSend = useCallback(async (selectedProposalVal: Proposal | null, draftVal: Draft | null, currentProposals: { count: number; proposals: Proposal[] }, setProposals: (val: { count: number; proposals: Proposal[] }) => void, setDraftModalOpenFn: (val: boolean) => void, setSelectedProposalFn: (val: Proposal | null) => void, setDraftFn: (val: Draft | null) => void, setSendLoadingFn: (val: boolean) => void) => {
    if (!selectedProposalVal || !draftVal) return;

    setSendLoadingFn(true);
    try {
      const res = await fetch(`${API_BASE}/proposals/${selectedProposalVal.id}/confirm-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: draftVal.subject,
          body: draftVal.body,
          channel: draftVal.channel,
        }),
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setProposals({
        ...currentProposals,
        count: currentProposals.count - 1,
        proposals: currentProposals.proposals.filter(p => p.id !== selectedProposalVal.id),
      });

      setDraftModalOpenFn(false);
      setSelectedProposalFn(null);
      setDraftFn(null);
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSendLoadingFn(false);
    }
  }, []);

  const handleCloseDraftModal = useCallback((setDraftModalOpenFn: (val: boolean) => void, setSelectedProposalFn: (val: Proposal | null) => void, setDraftFn: (val: Draft | null) => void) => {
    setDraftModalOpenFn(false);
    setSelectedProposalFn(null);
    setDraftFn(null);
  }, []);

  return {
    selectedProposal,
    setSelectedProposal,
    draftModalOpen,
    setDraftModalOpen,
    draft,
    setDraft,
    draftLoading,
    setDraftLoading,
    sendLoading,
    setSendLoading,
    proposalFilter,
    setProposalFilter,
    handleApprove,
    handleReject,
    handleGenerateDraft,
    handleConfirmSend,
    handleCloseDraftModal,
  };
}

// ============================================================================
// Scouts Tab Hooks
// ============================================================================

/**
 * Hook for scouts overview data
 */
export function useScoutsOverview() {
  const [scoutsOverview, setScoutsOverview] = useState<ScoutSummary[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/scouts`)
      .then(r => r.json())
      .then(data => setScoutsOverview(data.scouts || []))
      .catch(() => setScoutsOverview([]));
  }, []);

  return { scoutsOverview, setScoutsOverview };
}

/**
 * Hook for shared scout state
 */
export function useScoutsState() {
  const [activeScout, setActiveScout] = useState<'overview' | 'bunya' | 'alta'>('overview');
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState<string | null>(null);

  return {
    activeScout,
    setActiveScout,
    scoutLoading,
    setScoutLoading,
    scoutError,
    setScoutError,
  };
}

// ============================================================================
// Agents Tab Hooks
// ============================================================================

/**
 * Hook for agent selection
 */
export function useAgentSelection() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const toggleAgentSelection = useCallback((agent: Agent | null) => {
    setSelectedAgent(prev => (prev?.id === agent?.id ? null : agent));
  }, []);

  return { selectedAgent, setSelectedAgent, toggleAgentSelection };
}

// ============================================================================
// Tab Navigation Hook
// ============================================================================

/**
 * Hook for tab navigation state
 */
export function useTabNavigation(initialTab: 'overview' | 'agents' | 'knowledge' | 'relationships' | 'proposals' | 'scouts' | 'strategy' = 'overview') {
  const [activeTab, setActiveTab] = useState(initialTab);

  const switchTab = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    setActiveTab: switchTab,
  };
}
