/**
 * Proposals Tab
 *
 * Human verification workflow for agent proposals.
 */

import React from 'react';
import { Card } from '../../ui/Card';
import type { Proposal, Draft } from '../Intelligence.types';
import { getPriorityColor } from '../Intelligence.utils';

interface ProposalsTabProps {
  proposals: { count: number; proposals: Proposal[] };
  selectedProposal: Proposal | null;
  draftModalOpen: boolean;
  draft: Draft | null;
  draftLoading: boolean;
  sendLoading: boolean;
  proposalFilter: 'all' | 'pending' | 'draft_ready';
  onFilterChange: (filter: 'all' | 'pending' | 'draft_ready') => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGenerateDraft: (proposal: Proposal) => void;
  onConfirmSend: () => void;
  onCloseDraftModal: () => void;
  onDraftChange: (draft: Draft | null) => void;
}

export function ProposalsTab({
  proposals,
  selectedProposal,
  draftModalOpen,
  draft,
  draftLoading,
  sendLoading,
  proposalFilter,
  onFilterChange,
  onApprove,
  onReject,
  onGenerateDraft,
  onConfirmSend,
  onCloseDraftModal,
  onDraftChange,
}: ProposalsTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Total Pending</p>
          <p className="text-2xl font-bold text-slate-900">{proposals.count}</p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Urgent</p>
          <p className="text-2xl font-bold text-red-600">
            {proposals.proposals.filter(p => p.priority === 'urgent').length}
          </p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">High Priority</p>
          <p className="text-2xl font-bold text-orange-600">
            {proposals.proposals.filter(p => p.priority === 'high').length}
          </p>
        </Card>
        <Card variant="soft" padding="md">
          <p className="text-sm text-slate-500">Draft Ready</p>
          <p className="text-2xl font-bold text-emerald-600">
            {proposals.proposals.filter(p => p.status === 'draft_ready').length}
          </p>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Filter:</span>
        {(['all', 'pending', 'draft_ready'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              proposalFilter === filter
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter === 'draft_ready' ? 'Draft Ready' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      <Card variant="bordered" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Agent Proposals
          <span className="ml-2 text-sm font-normal text-slate-500">
            (Requires human verification before sending)
          </span>
        </h2>

        {proposals.proposals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-600">No pending proposals require your attention.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.proposals
              .filter((p) => {
                if (proposalFilter === 'all') return true;
                if (proposalFilter === 'pending') return p.status === 'pending';
                if (proposalFilter === 'draft_ready') return p.status === 'draft_ready';
                return true;
              })
              .map((proposal) => (
                <div key={proposal.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(proposal.priority)}`}>
                          {proposal.priority}
                        </span>
                        <span className="text-xs text-slate-500">from {proposal.agent_id}</span>
                        {proposal.status === 'draft_ready' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                            Draft Ready
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-slate-900 mb-2">{proposal.title}</h3>
                      {proposal.reasoning?.details && (
                        <p className="text-sm text-slate-600 mb-3">{proposal.reasoning.details}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        Created: {new Date(proposal.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onGenerateDraft(proposal)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Review & Edit
                      </button>
                      <button
                        onClick={() => onApprove(proposal.id)}
                        className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Quick Approve
                      </button>
                      <button
                        onClick={() => onReject(proposal.id)}
                        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Draft Review Modal */}
      {draftModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Review Before Sending</h2>
                  <p className="text-sm text-slate-500 mt-1">Edit the draft below, then confirm to send</p>
                </div>
                <button onClick={onCloseDraftModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {draftLoading ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="mt-4 text-slate-600">Generating draft with AI...</p>
                </div>
              ) : draft ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                    <input
                      type="text"
                      value={draft.recipient}
                      onChange={(e) => onDraftChange({ ...draft, recipient: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                    <select
                      value={draft.channel}
                      onChange={(e) => onDraftChange({ ...draft, channel: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="slack">Slack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={draft.subject}
                      onChange={(e) => onDraftChange({ ...draft, subject: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                    <textarea
                      value={draft.body}
                      onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-yellow-800">Human Verification Required</p>
                    <p className="text-sm text-yellow-700 mt-1">Please review the content above carefully.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Generate Draft</h3>
                </div>
              )}
            </div>

            {draft && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={onCloseDraftModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmSend}
                  disabled={sendLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendLoading ? 'Sending...' : 'Confirm & Send'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
