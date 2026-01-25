/**
 * Intelligence Data Fetching
 *
 * API calls and data fetching functions for the Intelligence Center.
 */

import { API_BASE } from './Intelligence.utils';
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
  FixResult,
} from './Intelligence.types';

// ============================================================================
// Fetch Wrappers
// ============================================================================

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function safeFetchWithFallback<T>(url: string, fallback: T): Promise<T> {
  const result = await safeFetch<T>(url);
  return result ?? fallback;
}

// ============================================================================
// Agent API Calls
// ============================================================================

export async function fetchAgents(): Promise<Agent[]> {
  return safeFetchWithFallback<Agent[]>(`${API_BASE}/agents/active`, []);
}

export async function fetchProposals(): Promise<{ count: number; proposals: Proposal[] }> {
  return safeFetchWithFallback<{ count: number; proposals: Proposal[] }>(`${API_BASE}/agents/proposals`, { count: 0, proposals: [] });
}

export async function fetchActivity(): Promise<ActivityData> {
  return safeFetchWithFallback<ActivityData>(`${API_BASE}/agents/activity`, { count: 0, byAgent: {}, activity: [] });
}

export async function approveProposal(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/proposals/${id}/approve`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function rejectProposal(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/proposals/${id}/reject`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Task API Calls
// ============================================================================

export async function fetchTasks(): Promise<Task[]> {
  return safeFetchWithFallback<Task[]>(`${API_BASE}/tasks`, []);
}

// ============================================================================
// Knowledge API Calls
// ============================================================================

export async function fetchKnowledgeStats(): Promise<KnowledgeStats | null> {
  return safeFetch<KnowledgeStats>(`${API_BASE}/knowledge/stats`);
}

export async function fetchKnowledgeSources(): Promise<KnowledgeSources | null> {
  return safeFetch<KnowledgeSources>(`${API_BASE}/knowledge/sources`);
}

export async function searchEntities(query: string, limit = 20): Promise<Entity[]> {
  if (query.length < 2) return [];
  return safeFetchWithFallback<Entity[]>(`${API_BASE}/entities/search?q=${encodeURIComponent(query)}&limit=${limit}`, []);
}

export async function fetchEntity(id: string): Promise<Entity | null> {
  return safeFetch<Entity>(`${API_BASE}/entities/${id}`);
}

// ============================================================================
// Relationships API Calls
// ============================================================================

export async function fetchRelationshipHealth(): Promise<RelationshipHealth | null> {
  return safeFetch<RelationshipHealth>(`${API_BASE}/relationships/health`);
}

export async function fetchRelationshipsList(limit = 50): Promise<Relationship[]> {
  return safeFetchWithFallback<Relationship[]>(`${API_BASE}/relationships/list?limit=${limit}`, []);
}

export async function fetchAttentionRelationships(): Promise<Relationship[]> {
  return safeFetchWithFallback<Relationship[]>(`${API_BASE}/relationships/attention`, []);
}

export async function fetchOverdueRelationships(): Promise<Relationship[]> {
  return safeFetchWithFallback<Relationship[]>(`${API_BASE}/relationships/overdue`, []);
}

// ============================================================================
// Scouts API Calls
// ============================================================================

export async function fetchScoutsOverview(): Promise<ScoutSummary[]> {
  return safeFetchWithFallback<ScoutSummary[]>(`${API_BASE}/scouts`, []);
}

export async function fetchBunyaData(): Promise<BunyaData | null> {
  return safeFetch<BunyaData>(`${API_BASE}/scouts/bunya`);
}

export async function fetchAltaData(): Promise<AltaData | null> {
  return safeFetch<AltaData>(`${API_BASE}/scouts/alta`);
}

export async function fixBunyaProject(projectCode: string): Promise<FixResult | null> {
  try {
    const res = await fetch(`${API_BASE}/scouts/bunya/fix/${projectCode}`, { method: 'POST' });
    return res.json();
  } catch {
    return null;
  }
}

export async function fixAllBunyaProjects(limit = 20): Promise<{ fixed: number; proposed: number; skipped: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/scouts/bunya/fix-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    return res.json();
  } catch {
    return null;
  }
}

// ============================================================================
// Proposal Draft API Calls
// ============================================================================

export async function generateDraft(proposalId: string): Promise<{ draft?: { subject: string; body: string; channel: string; recipient: string }; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/proposals/${proposalId}/generate-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  } catch (err) {
    return { error: 'Failed to generate draft' };
  }
}

export async function confirmSend(proposalId: string, draft: { subject: string; body: string; channel: string }): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/proposals/${proposalId}/confirm-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    return res.json();
  } catch (err) {
    return { error: 'Failed to send proposal' };
  }
}

// ============================================================================
// Strategy Plans API Calls
// ============================================================================

export interface StrategyPlan {
  id: string;
  filename: string;
  title: string;
  project_code: string | null;
  parent_project: string | null;
  status: string;
  launch_date: string | null;
  summary: string;
  deliverables: string[];
  updated_at: string;
}

export async function fetchStrategyPlans(): Promise<{ plans: StrategyPlan[] }> {
  return safeFetchWithFallback<{ plans: StrategyPlan[] }>(`${API_BASE}/strategy/plans`, { plans: [] });
}

export async function fetchStrategyPlanContent(planId: string): Promise<{ content: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/strategy/plans/${planId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
