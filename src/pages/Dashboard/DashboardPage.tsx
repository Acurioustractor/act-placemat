import { useState } from 'react';
import { Card, LoadingSpinner, ErrorState, ConnectionStatus } from '../../components/ui';
import { BarChart, PieChart, LineChart, FunnelChart } from '../../components/charts';
import CommunityImpactRadar from '../../components/charts/CommunityImpactRadar';
import GeographicImpactMap from '../../components/charts/GeographicImpactMap';
import OpportunityPipelineFunnel from '../../components/charts/OpportunityPipelineFunnel';
import { useProjects, useOpportunities, useOrganizations, usePeople } from '../../hooks';
import { useConfig, useHealthStatus } from '../../hooks/useConfig';
import { PROJECT_AREAS } from '../../constants';
import { ProjectStatus, RelationshipStatus } from '../../types';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatting';
import { useQueryClient } from '@tanstack/react-query';
import { smartDataService } from '../../services/smartDataService';

/**
 * Dashboard page component
 * Rich data visualization showing overview of projects, opportunities, and network
 */
const DashboardPage = () => {
  const queryClient = useQueryClient();
  const { data: health } = useHealthStatus();
  const { data: config } = useConfig();
  
  // Debug function to clear all caches
  const clearAllCaches = () => {
    console.log('🗑️ Clearing all caches...');
    queryClient.clear();
    smartDataService.clearCache();
    window.location.reload();
  };
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  
  // Debug logging for project loading
  console.log('🔍 Dashboard: Projects debug info:', {
    projectsCount: projects.length,
    projectsLoading,
    projectsError,
    hasProjectsData: projects.length > 0,
    firstProject: projects[0]
  });
  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities();
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: people = [], isLoading: peopleLoading } = usePeople();

  // Show content as soon as ANY data loads - don't wait for everything
  const hasAnyData = projects.length > 0 || opportunities.length > 0 || organizations.length > 0 || people.length > 0;
  const isLoading = projectsLoading && oppsLoading && orgsLoading && peopleLoading && !hasAnyData;

  // Calculate rich metrics
  const metrics = {
    projects: {
      total: projects.length,
      active: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
      totalRevenue: projects.reduce((sum, p) => sum + (p.revenueActual || 0), 0),
      potentialRevenue: projects.reduce((sum, p) => sum + (p.revenuePotential || 0), 0),
      byArea: PROJECT_AREAS.map(area => ({
        ...area,
        count: projects.filter(p => p.area === area.value).length,
        revenue: projects
          .filter(p => p.area === area.value)
          .reduce((sum, p) => sum + (p.revenueActual || 0), 0)
      })),
      byLocation: [...new Set(projects.map(p => p.state || p.location))]
        .filter(Boolean)
        .map(location => ({
          location,
          count: projects.filter(p => (p.state || p.location) === location).length,
          revenue: projects
            .filter(p => (p.state || p.location) === location)
            .reduce((sum, p) => sum + (p.revenueActual || 0), 0)
        }))
        .sort((a, b) => b.count - a.count)
    },
    opportunities: {
      total: opportunities.length,
      totalValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
      weightedValue: opportunities.reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0) / 100), 0)
    },
    organizations: {
      total: organizations.length,
      partners: organizations.filter(o => o.relationshipStatus === RelationshipStatus.PARTNER).length
    },
    people: {
      total: people.length,
      byRelationshipType: people.reduce((acc, p) => {
        const type = p.relationshipType || 'Other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };

  // Upcoming milestones
  const upcomingMilestones = projects
    .filter(p => p.nextMilestone && new Date(p.nextMilestone) >= new Date())
    .sort((a, b) => new Date(a.nextMilestone!).getTime() - new Date(b.nextMilestone!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ACT Placemat Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time insights into community projects, opportunities, and impact</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearAllCaches}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
            >
              Clear Cache & Reload
            </button>
            <ConnectionStatus />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center p-6">
          <div className="text-4xl font-bold text-primary-600 mb-2">
            {metrics.projects.total}
          </div>
          <div className="text-lg font-medium text-gray-900 mb-1">Projects</div>
          <div className="text-sm text-gray-500">
            {metrics.projects.active} active
          </div>
        </Card>

        <Card className="text-center p-6">
          <div className="text-4xl font-bold text-green-600 mb-2">
            {formatCurrency(metrics.projects.totalRevenue)}
          </div>
          <div className="text-lg font-medium text-gray-900 mb-1">Revenue</div>
          <div className="text-sm text-gray-500">
            {formatCurrency(metrics.projects.potentialRevenue)} potential
          </div>
        </Card>

        <Card className="text-center p-6">
          <div className="text-4xl font-bold text-amber-600 mb-2">
            {metrics.opportunities.total}
          </div>
          <div className="text-lg font-medium text-gray-900 mb-1">Opportunities</div>
          <div className="text-sm text-gray-500">
            {formatCurrency(metrics.opportunities.weightedValue)} weighted
          </div>
        </Card>

        <Card className="text-center p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {metrics.organizations.total}
          </div>
          <div className="text-lg font-medium text-gray-900 mb-1">Organizations</div>
          <div className="text-sm text-gray-500">
            {metrics.organizations.partners} partners
          </div>
        </Card>
      </div>

      {/* Sophisticated Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Community Impact Radar - Sophisticated multi-dimensional view */}
        <Card className="p-6">
          <CommunityImpactRadar 
            projects={projects}
            height={480}
            className="mb-4"
          />
        </Card>

        {/* Opportunity Pipeline Funnel - Advanced pipeline analytics */}
        <Card className="p-6">
          <OpportunityPipelineFunnel 
            opportunities={opportunities}
            height={480}
            className="mb-4"
          />
        </Card>
      </div>

      {/* Geographic Impact Visualization */}
      <Card className="p-6">
        <GeographicImpactMap 
          projects={projects}
          height={400}
          className="mb-4"
        />
      </Card>

      {/* Enhanced Insights Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Community Impact Insights */}
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <h3 className="text-lg font-semibold mb-3 text-teal-800">Community Impact</h3>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-teal-700">
                {((metrics.projects.totalRevenue / metrics.projects.potentialRevenue) * 100 || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-teal-600">Revenue Achievement Rate</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-teal-700">
                {metrics.projects.byArea.filter(area => area.count > 0).length}
              </div>
              <div className="text-sm text-teal-600">Active Focus Areas</div>
            </div>
          </div>
        </Card>

        {/* Pipeline Performance */}
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <h3 className="text-lg font-semibold mb-3 text-amber-800">Pipeline Performance</h3>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(metrics.opportunities.weightedValue)}
              </div>
              <div className="text-sm text-amber-600">Weighted Pipeline Value</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-amber-700">
                {opportunities.filter(o => (o.probability || 0) > 75).length}
              </div>
              <div className="text-sm text-amber-600">High-Confidence Opps</div>
            </div>
          </div>
        </Card>

        {/* Network Strength */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Network Strength</h3>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-blue-700">
                {Math.round((metrics.people.total / metrics.projects.total) * 10) / 10 || 0}
              </div>
              <div className="text-sm text-blue-600">Avg People per Project</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-blue-700">
                {metrics.organizations.partners}
              </div>
              <div className="text-sm text-blue-600">Active Partners</div>
            </div>
          </div>
        </Card>

        {/* Project Velocity */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">Project Velocity</h3>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-green-700">
                {upcomingMilestones.length}
              </div>
              <div className="text-sm text-green-600">Upcoming Milestones</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-green-700">
                {metrics.projects.byLocation.filter(loc => loc.count > 0).length}
              </div>
              <div className="text-sm text-green-600">Geographic Regions</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Milestones */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Upcoming Milestones</h3>
          <div className="space-y-4">
            {upcomingMilestones.length > 0 ? (
              upcomingMilestones.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-500">{project.location || project.state}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(project.nextMilestone!).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.ceil((new Date(project.nextMilestone!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming milestones</p>
            )}
          </div>
        </div>
      </Card>

      {/* Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Geographic Reach</h3>
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {metrics.projects.byLocation.length}
          </div>
          <p className="text-sm text-gray-600">States & territories with active projects</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Community Impact</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {metrics.projects.byArea.reduce((sum, area) => sum + area.count, 0)}
          </div>
          <p className="text-sm text-gray-600">Projects across all ACT focus areas</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Network Strength</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {metrics.people.total + metrics.organizations.total}
          </div>
          <p className="text-sm text-gray-600">People & organizations in network</p>
        </Card>
      </div>

    </div>
  );
};

export default DashboardPage;