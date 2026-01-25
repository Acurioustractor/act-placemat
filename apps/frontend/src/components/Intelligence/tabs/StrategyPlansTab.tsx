/**
 * Strategy Plans Tab
 *
 * Display and management of project strategy plans.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/StatusBadge';
import { API_BASE } from '../Intelligence.utils';

interface StrategyPlan {
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

export function StrategyPlansTab() {
  const [plans, setPlans] = useState<StrategyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/strategy/plans`);
        if (!res.ok) throw new Error('Failed to fetch strategy plans');
        const data = await res.json();
        setPlans(data.plans || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const loadPlanContent = async (planId: string) => {
    try {
      setContentLoading(true);
      setSelectedPlan(planId);
      const res = await fetch(`${API_BASE}/strategy/plans/${planId}`);
      if (!res.ok) throw new Error('Failed to fetch plan content');
      const data = await res.json();
      setPlanContent(data.content);
    } catch (e) {
      setPlanContent(`Error loading plan: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setContentLoading(false);
    }
  };

  const closePlanContent = () => {
    setSelectedPlan(null);
    setPlanContent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <span className="ml-3 text-slate-600">Loading strategy plans...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">{error}</p>
        <p className="text-sm text-slate-500">Make sure the Command Center API is running on port 3456</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Project Strategy Plans</h2>
          <p className="text-sm text-slate-500">Active planning documents from docs/strategy/</p>
        </div>
        <span className="text-sm text-slate-500">{plans.length} plan{plans.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            variant="soft"
            padding="lg"
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => loadPlanContent(plan.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {plan.project_code && (
                  <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                    {plan.project_code}
                  </span>
                )}
                <StatusBadge status={plan.status === 'Planning Phase' ? 'paused' : 'active'} />
              </div>
              {plan.launch_date && (
                <span className="text-xs text-slate-500">Launch: {plan.launch_date}</span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">{plan.title}</h3>

            {plan.parent_project && (
              <p className="text-xs text-slate-500 mb-2">Parent: {plan.parent_project}</p>
            )}

            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{plan.summary}</p>

            {plan.deliverables.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Key Deliverables:</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {plan.deliverables.slice(0, 3).map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {d}
                    </li>
                  ))}
                  {plan.deliverables.length > 3 && (
                    <li className="text-xs text-slate-400">+{plan.deliverables.length - 3} more...</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
              <span>Updated {new Date(plan.updated_at).toLocaleDateString()}</span>
              <span className="text-emerald-600 font-medium">View details</span>
            </div>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Strategy Plans</h3>
          <p className="text-slate-600">Create markdown files in docs/strategy/ to see them here.</p>
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closePlanContent}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">
                {plans.find((p) => p.id === selectedPlan)?.title || 'Strategy Plan'}
              </h3>
              <button onClick={closePlanContent} className="text-slate-400 hover:text-slate-600 text-2xl">Close</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-50 p-4 rounded-lg overflow-x-auto">
                    {planContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
