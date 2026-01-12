/**
 * BEAUTIFUL OBSOLESCENCE PROGRESS TRACKER
 *
 * Visualizes the journey from 100% ACT energy → 0% (community ownership)
 *
 * The Rocket Booster Model:
 * - IGNITION (100% ACT): Discovery & initial collaboration
 * - THRUST (60% ACT): Active support, community building capacity
 * - TRAJECTORY (20% ACT): Community-led, ACT advising
 * - ORBIT (0% ACT): Community-owned, ACT obsolete ✨
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

type ObsolescenceStage = 'discovery' | 'ignition' | 'thrust' | 'trajectory' | 'orbit';

interface ObsolescenceJourney {
  id: string;
  contact_id: string;
  project_id: string;
  contact_name: string;
  project_name: string;
  current_stage: ObsolescenceStage;
  act_energy_percent: number;
  community_energy_percent: number;
  journey_start_date: string;
  stage_transitions: StageTransition[];
  next_milestone: string;
  blockers?: string[];
  wins?: string[];
  beautiful_obsolescence_achieved: boolean;
  obsolescence_date?: string;
}

interface StageTransition {
  stage: ObsolescenceStage;
  date: string;
  act_percent: number;
  community_percent: number;
  notes: string;
  evidence?: string[];
}

interface BeautifulObsolescenceTrackerProps {
  contactId?: string;
  projectId?: string;
  showAll?: boolean;
}

// ============================================================================
// STAGE DEFINITIONS
// ============================================================================

const STAGE_DEFINITIONS = {
  discovery: {
    name: 'Discovery',
    icon: '🔍',
    actEnergy: 100,
    communityEnergy: 0,
    description: 'Intelligence Hub match identified',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  ignition: {
    name: 'Ignition',
    icon: '🚀',
    actEnergy: 100,
    communityEnergy: 0,
    description: 'Initial outreach & co-design',
    color: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  thrust: {
    name: 'Thrust',
    icon: '🔥',
    actEnergy: 60,
    communityEnergy: 40,
    description: 'Active collaboration, building capacity',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  trajectory: {
    name: 'Trajectory',
    icon: '🌟',
    actEnergy: 20,
    communityEnergy: 80,
    description: 'Community-led, ACT advising',
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  orbit: {
    name: 'Orbit',
    icon: '✨',
    actEnergy: 0,
    communityEnergy: 100,
    description: 'Community-owned, ACT obsolete',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const BeautifulObsolescenceTracker: React.FC<BeautifulObsolescenceTrackerProps> = ({
  contactId,
  projectId,
  showAll = false
}) => {
  const [journeys, setJourneys] = useState<ObsolescenceJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<ObsolescenceJourney | null>(null);

  // ========================================================================
  // FETCH JOURNEYS
  // ========================================================================

  useEffect(() => {
    fetchJourneys();
  }, [contactId, projectId, showAll]);

  const fetchJourneys = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('ghl_engagement_metrics')
        .select(`
          *,
          contact:linkedin_contacts(full_name, current_position),
          project:notion_projects_cache(project_name, status)
        `)
        .order('journey_start_date', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching journeys:', error);
        return;
      }

      // Transform to ObsolescenceJourney format
      const transformedJourneys: ObsolescenceJourney[] = (data || []).map(record => ({
        id: record.id,
        contact_id: record.contact_id,
        project_id: record.project_id,
        contact_name: record.contact?.full_name || 'Unknown',
        project_name: record.project?.project_name || 'Unknown',
        current_stage: record.engagement_status || 'discovery',
        act_energy_percent: record.act_energy_percent || 100,
        community_energy_percent: record.community_energy_percent || 0,
        journey_start_date: record.first_contact_date || record.created_at,
        stage_transitions: record.stage_history || [],
        next_milestone: record.next_milestone || 'Initial outreach',
        blockers: record.blockers || [],
        wins: record.wins || [],
        beautiful_obsolescence_achieved: record.act_energy_percent === 0,
        obsolescence_date: record.obsolescence_date
      }));

      setJourneys(transformedJourneys);
    } catch (err) {
      console.error('Failed to fetch journeys:', err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // JOURNEY CARD
  // ========================================================================

  const renderJourneyCard = (journey: ObsolescenceJourney) => {
    const stage = STAGE_DEFINITIONS[journey.current_stage];
    const daysInJourney = Math.floor(
      (new Date().getTime() - new Date(journey.journey_start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div
        key={journey.id}
        className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
        onClick={() => setSelectedJourney(journey)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {journey.contact_name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{journey.project_name}</p>
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border-2 ${stage.color}`}>
              {stage.icon} {stage.name}
            </span>
          </div>
          {journey.beautiful_obsolescence_achieved && (
            <div className="text-4xl">✨</div>
          )}
        </div>

        {/* Energy Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>ACT Energy: {journey.act_energy_percent}%</span>
            <span>Community: {journey.community_energy_percent}%</span>
          </div>
          <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
              style={{ width: `${journey.act_energy_percent}%` }}
            >
              {journey.act_energy_percent > 15 && `${journey.act_energy_percent}%`}
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-500"
              style={{ width: `${journey.community_energy_percent}%` }}
            >
              {journey.community_energy_percent > 15 && `${journey.community_energy_percent}%`}
            </div>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="flex items-center justify-between mb-4">
          {Object.entries(STAGE_DEFINITIONS).map(([stageKey, stageDef], index) => {
            const stages = Object.keys(STAGE_DEFINITIONS);
            const currentIndex = stages.indexOf(journey.current_stage);
            const thisIndex = stages.indexOf(stageKey);
            const isComplete = thisIndex < currentIndex;
            const isCurrent = thisIndex === currentIndex;

            return (
              <React.Fragment key={stageKey}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? stage.color.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', 'border-')
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isComplete ? '✓' : stageDef.icon}
                  </div>
                  <span className="text-xs text-gray-600 mt-1">{stageDef.name}</span>
                </div>
                {index < Object.keys(STAGE_DEFINITIONS).length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      isComplete ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Next Milestone */}
        <div className="text-sm mb-3">
          <strong className="text-gray-700">Next Milestone:</strong>
          <p className="text-gray-600 mt-1">{journey.next_milestone}</p>
        </div>

        {/* Journey Duration */}
        <div className="text-xs text-gray-500">
          Journey started {daysInJourney} days ago
        </div>

        {/* Wins & Blockers Summary */}
        {(journey.wins && journey.wins.length > 0) && (
          <div className="mt-3 text-xs">
            <span className="text-green-600 font-semibold">✓ {journey.wins.length} wins</span>
          </div>
        )}
        {(journey.blockers && journey.blockers.length > 0) && (
          <div className="mt-1 text-xs">
            <span className="text-orange-600 font-semibold">⚠ {journey.blockers.length} blockers</span>
          </div>
        )}
      </div>
    );
  };

  // ========================================================================
  // DETAILED JOURNEY MODAL
  // ========================================================================

  const renderJourneyDetails = () => {
    if (!selectedJourney) return null;

    const stage = STAGE_DEFINITIONS[selectedJourney.current_stage];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedJourney.contact_name} → {selectedJourney.project_name}
              </h2>
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border-2 ${stage.color}`}>
                {stage.icon} {stage.name} - {stage.description}
              </span>
            </div>
            <button
              onClick={() => setSelectedJourney(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {/* Energy Visualization */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Energy Distribution</h3>
              <div className="w-full h-20 bg-gray-200 rounded-lg overflow-hidden flex items-center">
                <div
                  className="bg-blue-500 h-full flex items-center justify-center text-white font-bold transition-all duration-500"
                  style={{ width: `${selectedJourney.act_energy_percent}%` }}
                >
                  {selectedJourney.act_energy_percent > 0 && (
                    <div className="text-center">
                      <div className="text-2xl">🚀</div>
                      <div className="text-sm">ACT: {selectedJourney.act_energy_percent}%</div>
                    </div>
                  )}
                </div>
                <div
                  className="bg-green-500 h-full flex items-center justify-center text-white font-bold transition-all duration-500"
                  style={{ width: `${selectedJourney.community_energy_percent}%` }}
                >
                  {selectedJourney.community_energy_percent > 0 && (
                    <div className="text-center">
                      <div className="text-2xl">🌱</div>
                      <div className="text-sm">Community: {selectedJourney.community_energy_percent}%</div>
                    </div>
                  )}
                </div>
              </div>
              {selectedJourney.beautiful_obsolescence_achieved && (
                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg text-center">
                  <div className="text-4xl mb-2">✨</div>
                  <div className="text-lg font-bold text-purple-800">
                    Beautiful Obsolescence Achieved!
                  </div>
                  <div className="text-sm text-purple-600">
                    ACT is now 0% - Community owns this completely
                  </div>
                  {selectedJourney.obsolescence_date && (
                    <div className="text-xs text-purple-500 mt-2">
                      Achieved on {new Date(selectedJourney.obsolescence_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stage History */}
            {selectedJourney.stage_transitions && selectedJourney.stage_transitions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4">Journey Timeline</h3>
                <div className="space-y-4">
                  {selectedJourney.stage_transitions.map((transition, index) => {
                    const transitionStage = STAGE_DEFINITIONS[transition.stage];
                    return (
                      <div key={index} className="flex items-start">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${transitionStage.color} flex-shrink-0`}>
                          {transitionStage.icon}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="font-semibold text-gray-900">
                            {transitionStage.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(transition.date).toLocaleDateString()} -
                            ACT: {transition.act_percent}% / Community: {transition.community_percent}%
                          </div>
                          {transition.notes && (
                            <div className="text-sm text-gray-700 mt-1">{transition.notes}</div>
                          )}
                          {transition.evidence && transition.evidence.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Evidence: {transition.evidence.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wins */}
            {selectedJourney.wins && selectedJourney.wins.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-green-700">🎉 Wins</h3>
                <ul className="space-y-2">
                  {selectedJourney.wins.map((win, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Blockers */}
            {selectedJourney.blockers && selectedJourney.blockers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-orange-700">⚠️ Blockers</h3>
                <ul className="space-y-2">
                  {selectedJourney.blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-500 mr-2">⚠</span>
                      <span className="text-gray-700">{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Milestone */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">🎯 Next Milestone</h3>
              <p className="text-gray-700">{selectedJourney.next_milestone}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // STATS SUMMARY
  // ========================================================================

  const renderStats = () => {
    const totalJourneys = journeys.length;
    const orbiting = journeys.filter(j => j.current_stage === 'orbit').length;
    const trajectory = journeys.filter(j => j.current_stage === 'trajectory').length;
    const thrust = journeys.filter(j => j.current_stage === 'thrust').length;
    const ignition = journeys.filter(j => j.current_stage === 'ignition').length;
    const discovery = journeys.filter(j => j.current_stage === 'discovery').length;

    const avgActEnergy = totalJourneys > 0
      ? Math.round(journeys.reduce((sum, j) => sum + j.act_energy_percent, 0) / totalJourneys)
      : 100;

    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{totalJourneys}</div>
          <div className="text-xs text-blue-600">Total Journeys</div>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{orbiting}</div>
          <div className="text-xs text-purple-600">✨ Orbit (0%)</div>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{trajectory}</div>
          <div className="text-xs text-green-600">🌟 Trajectory (20%)</div>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{thrust}</div>
          <div className="text-xs text-yellow-600">🔥 Thrust (60%)</div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-700">{ignition}</div>
          <div className="text-xs text-orange-600">🚀 Ignition (100%)</div>
        </div>
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{avgActEnergy}%</div>
          <div className="text-xs text-gray-600">Avg ACT Energy</div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">
          No Beautiful Obsolescence Journeys Yet
        </h3>
        <p className="text-gray-600">
          Start engaging with polymath contacts to begin tracking their Beautiful Obsolescence journey!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          ✨ Beautiful Obsolescence Tracker
        </h2>
        <p className="text-gray-600">
          Tracking the journey from 100% ACT energy → 0% (community ownership)
        </p>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Journeys Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {journeys.map(renderJourneyCard)}
      </div>

      {/* Journey Details Modal */}
      {selectedJourney && renderJourneyDetails()}
    </div>
  );
};

export default BeautifulObsolescenceTracker;
