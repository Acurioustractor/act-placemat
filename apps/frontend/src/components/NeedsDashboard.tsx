import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SectionHeader } from './ui/SectionHeader';
import { Card } from './ui/Card';

interface ProjectNeed {
  type: 'funding' | 'people' | 'milestone' | 'governance' | 'data';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  projectId: string;
  projectName: string;
  projectStatus?: string;
  projectThemes?: string[];
  suggestedActions: string[];
}

interface NeedsResponse {
  total: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  grouped: {
    critical: ProjectNeed[];
    high: ProjectNeed[];
    medium: ProjectNeed[];
    low: ProjectNeed[];
  };
}

export function NeedsDashboard() {
  const [needs, setNeeds] = useState<NeedsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'critical' | 'high' | 'medium' | 'low' | 'all'>('all');

  useEffect(() => {
    fetchNeeds();
  }, []);

  async function fetchNeeds() {
    try {
      setLoading(true);
      const response = await fetch('https://act-backend-production.up.railway.app/api/v2/projects/needs');
      const data = await response.json();
      setNeeds(data);
      setError(null);
    } catch (err) {
      setError('Failed to load project needs');
      console.error('Error fetching needs:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading project needs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!needs) {
    return null;
  }

  const filteredNeeds = selectedPriority === 'all'
    ? [...needs.grouped.critical, ...needs.grouped.high, ...needs.grouped.medium, ...needs.grouped.low]
    : needs.grouped[selectedPriority];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Project Needs Intelligence</h1>
        <p className="text-gray-600 mt-2">
          Automatically detected urgent needs across {needs.total} project issues
        </p>
      </div>

      {/* Priority Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PrioritySummaryCard
          label="Critical"
          count={needs.byPriority.critical}
          color="red"
          active={selectedPriority === 'critical'}
          onClick={() => setSelectedPriority('critical')}
        />
        <PrioritySummaryCard
          label="High"
          count={needs.byPriority.high}
          color="orange"
          active={selectedPriority === 'high'}
          onClick={() => setSelectedPriority('high')}
        />
        <PrioritySummaryCard
          label="Medium"
          count={needs.byPriority.medium}
          color="yellow"
          active={selectedPriority === 'medium'}
          onClick={() => setSelectedPriority('medium')}
        />
        <PrioritySummaryCard
          label="Low"
          count={needs.byPriority.low}
          color="gray"
          active={selectedPriority === 'low'}
          onClick={() => setSelectedPriority('low')}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedPriority('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedPriority === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({needs.total})
        </button>
        <button
          onClick={() => setSelectedPriority('critical')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedPriority === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Critical ({needs.byPriority.critical})
        </button>
        <button
          onClick={() => setSelectedPriority('high')}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedPriority === 'high'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          High ({needs.byPriority.high})
        </button>
      </div>

      {/* Needs List */}
      <div className="space-y-4">
        {filteredNeeds.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {selectedPriority === 'all' ? '' : selectedPriority + ' priority'} needs detected. All projects looking healthy! 🎉
          </div>
        ) : (
          filteredNeeds.map((need, index) => (
            <NeedCard key={`${need.projectId}-${index}`} need={need} />
          ))
        )}
      </div>
    </div>
  );
}

interface PrioritySummaryCardProps {
  label: string;
  count: number;
  color: 'red' | 'orange' | 'yellow' | 'gray';
  active: boolean;
  onClick: () => void;
}

function PrioritySummaryCard({ label, count, color, active, onClick }: PrioritySummaryCardProps) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  const activeClass = active ? 'ring-2 ring-blue-500' : '';

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} ${activeClass} border-2 rounded-lg p-4 text-left hover:shadow-md transition-shadow`}
    >
      <div className="text-sm font-medium opacity-75">{label}</div>
      <div className="text-3xl font-bold mt-1">{count}</div>
    </button>
  );
}

function NeedCard({ need }: { need: ProjectNeed }) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-gray-300 bg-gray-50',
  };

  const priorityBadges = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-600 text-white',
    medium: 'bg-yellow-600 text-white',
    low: 'bg-gray-600 text-white',
  };

  const typeIcons = {
    funding: '💰',
    people: '👥',
    milestone: '🎯',
    governance: '⚖️',
    data: '📊',
  };

  return (
    <div className={`border-l-4 ${priorityColors[need.priority]} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{typeIcons[need.type]}</span>
            <h3 className="font-semibold text-lg text-gray-900">{need.projectName}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${priorityBadges[need.priority]}`}>
              {need.priority.toUpperCase()}
            </span>
          </div>

          <p className="text-gray-700 mb-2">{need.description}</p>

          {need.projectThemes && need.projectThemes.length > 0 && (
            <div className="flex gap-2 mb-3">
              {need.projectThemes.map(theme => (
                <span key={theme} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          {expanded ? '▲ Hide' : '▼ Actions'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Suggested Actions:</h4>
          <ul className="space-y-2">
            {need.suggestedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span className="text-gray-700 text-sm">{action}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              View Project
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              Take Action
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
              Mark Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
