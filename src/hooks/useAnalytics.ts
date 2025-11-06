// Custom hook for analytics data

import { useQuery } from '@tanstack/react-query';
import { useProjectMetrics } from './useProjects';
import { useOpportunityPipelineMetrics } from './useOpportunities';
import { useOrganizationMetrics } from './useOrganizations';
import { usePeopleMetrics } from './usePeople';
import { useArtifactMetrics } from './useArtifacts';
import { DashboardMetrics, ChartDataPoint, TimeSeriesDataPoint } from '../types';
import { CHART_COLORS } from '../constants';

/**
 * Aggregates comprehensive dashboard metrics from all data sources.
 * Combines metrics from projects, opportunities, organizations, people, and artifacts.
 *
 * @returns {DashboardMetrics} Aggregated metrics object containing all dashboard statistics
 * @example
 * const metrics = useDashboardMetrics();
 * console.log('Active projects:', metrics.projects.active);
 * console.log('Total pipeline value:', metrics.opportunities.totalValue);
 * console.log('Partner organizations:', metrics.organizations.partners);
 */
export function useDashboardMetrics(): DashboardMetrics {
  const projectMetrics = useProjectMetrics();
  const opportunityMetrics = useOpportunityPipelineMetrics();
  const organizationMetrics = useOrganizationMetrics();
  const peopleMetrics = usePeopleMetrics();
  const artifactMetrics = useArtifactMetrics();
  
  return {
    projects: {
      total: projectMetrics.total,
      active: projectMetrics.byStatus['Active'] || 0,
      completed: projectMetrics.byStatus['Completed'] || 0,
      totalRevenue: projectMetrics.totalRevenue,
      potentialRevenue: projectMetrics.potentialRevenue
    },
    opportunities: {
      total: opportunityMetrics.totalCount,
      totalValue: opportunityMetrics.totalValue,
      weightedValue: opportunityMetrics.weightedValue,
      averageProbability: opportunityMetrics.averageProbability,
      byStage: opportunityMetrics.byStage
    },
    organizations: {
      total: organizationMetrics.total,
      partners: organizationMetrics.byRelationshipStatus['Partner'] || 0,
      prospects: organizationMetrics.byRelationshipStatus['Prospect'] || 0,
      byType: organizationMetrics.byType
    },
    people: {
      total: peopleMetrics.total,
      byRelationshipType: peopleMetrics.byRelationshipType,
      byInfluenceLevel: peopleMetrics.byInfluenceLevel
    },
    artifacts: {
      total: artifactMetrics.total,
      byType: artifactMetrics.byType,
      byStatus: artifactMetrics.byStatus
    }
  };
}

/**
 * Generates revenue chart data aggregated by time period.
 * Provides actual, projected, by-project, and by-area revenue breakdowns.
 *
 * @param {'month' | 'quarter' | 'year'} [timeRange='month'] - Time period for data aggregation
 * @returns {{ actual: TimeSeriesDataPoint[]; projected: TimeSeriesDataPoint[]; byProject: ChartDataPoint[]; byArea: ChartDataPoint[] }} Revenue chart data organized by different dimensions
 * @example
 * const revenueData = useRevenueChartData('quarter');
 * // revenueData.actual contains daily revenue for the current quarter
 * // revenueData.byProject contains top 10 projects by revenue
 */
export function useRevenueChartData(timeRange: 'month' | 'quarter' | 'year' = 'month') {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => import('../services').then(m => m.projectService.getProjects())
  });

  // Generate time series data based on time range
  const actual: TimeSeriesDataPoint[] = [];
  const projected: TimeSeriesDataPoint[] = [];
  
  // Generate time points based on time range
  const timePoints = generateTimePoints(timeRange);
  
  // Initialize data points with zero values
  timePoints.forEach(date => {
    actual.push({ date, value: 0 });
    projected.push({ date, value: 0 });
  });
  
  // Aggregate project revenue by time period
  projects.forEach(project => {
    // Skip projects without start date
    if (!project.startDate) return;
    
    // Find the appropriate time bucket for this project
    const timeIndex = timePoints.findIndex(date => 
      project.startDate && project.startDate <= date
    );
    
    if (timeIndex >= 0) {
      // Add actual revenue to the time bucket
      actual[timeIndex].value += project.revenueActual;
      
      // Add potential revenue to the time bucket
      projected[timeIndex].value += project.revenuePotential;
    }
  });
  
  // Generate by project data
  const byProject: ChartDataPoint[] = projects
    .filter(p => p.revenueActual > 0)
    .sort((a, b) => b.revenueActual - a.revenueActual)
    .slice(0, 10) // Top 10 projects by revenue
    .map((project, index) => ({
      label: project.name,
      value: project.revenueActual,
      color: CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length],
      metadata: { id: project.id }
    }));
  
  // Generate by area data
  const byAreaMap: Record<string, number> = {};
  projects.forEach(project => {
    byAreaMap[project.area] = (byAreaMap[project.area] || 0) + project.revenueActual;
  });
  
  const byArea: ChartDataPoint[] = Object.entries(byAreaMap)
    .map(([area, value], index) => ({
      label: area,
      value,
      color: CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length]
    }));
  
  return { actual, projected, byProject, byArea };
}

/**
 * Generates opportunity pipeline visualization data.
 * Provides stage breakdown, conversion rates, and timeline projections.
 *
 * @returns {{ stages: ChartDataPoint[]; conversion: Array<{ stage: string; count: number; rate: number }>; timeline: TimeSeriesDataPoint[] }} Pipeline chart data with stages, conversion, and timeline
 * @example
 * const pipelineData = usePipelineChartData();
 * console.log('Opportunities by stage:', pipelineData.stages);
 * console.log('Stage conversion rates:', pipelineData.conversion);
 * console.log('Pipeline timeline:', pipelineData.timeline);
 */
export function usePipelineChartData() {
  const { opportunities = [] } = useOpportunityPipelineMetrics();
  
  // Generate stages data
  const stageMap: Record<string, number> = {};
  opportunities.forEach(opp => {
    stageMap[opp.stage] = (stageMap[opp.stage] || 0) + opp.amount;
  });
  
  const stages: ChartDataPoint[] = Object.entries(stageMap)
    .map(([stage, value], index) => ({
      label: stage,
      value,
      color: CHART_COLORS.rainbow[index % CHART_COLORS.rainbow.length]
    }));
  
  // Generate conversion data
  const stageOrder = [
    'Discovery 🔍',
    'Qualification 📋',
    'Proposal 📄',
    'Negotiation 🤝',
    'Closed Won ✅',
    'Closed Lost ❌'
  ];
  
  const stageCounts = stageOrder.map(stage => ({
    stage,
    count: opportunities.filter(opp => opp.stage === stage).length
  }));
  
  const conversion = [];
  for (let i = 0; i < stageCounts.length - 1; i++) {
    const currentCount = stageCounts[i].count;
    const nextCount = stageCounts[i + 1].count;
    
    conversion.push({
      stage: stageCounts[i].stage,
      count: currentCount,
      rate: currentCount > 0 ? (nextCount / currentCount) * 100 : 0
    });
  }
  
  // Generate timeline data
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const timeline: TimeSeriesDataPoint[] = [];
  
  // Generate monthly data points for the last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(sixMonthsAgo);
    date.setMonth(date.getMonth() + i);
    
    // Filter opportunities by expected decision date in this month
    const monthlyOpportunities = opportunities.filter(opp => {
      if (!opp.expectedDecisionDate) return false;
      
      const oppDate = new Date(opp.expectedDecisionDate);
      return oppDate.getMonth() === date.getMonth() && 
             oppDate.getFullYear() === date.getFullYear();
    });
    
    // Calculate total value for this month
    const value = monthlyOpportunities.reduce((sum, opp) => sum + opp.weightedValue, 0);
    
    timeline.push({
      date,
      value,
      category: 'Weighted Pipeline',
      metadata: { count: monthlyOpportunities.length }
    });
  }
  
  return { stages, conversion, timeline };
}

/**
 * Generates an array of date points for the specified time range.
 * Used internally for creating time-series data.
 *
 * @private
 * @param {'month' | 'quarter' | 'year'} timeRange - The time range to generate points for
 * @returns {Date[]} Array of Date objects representing time points
 */
function generateTimePoints(timeRange: 'month' | 'quarter' | 'year'): Date[] {
  const now = new Date();
  const points: Date[] = [];
  
  switch (timeRange) {
    case 'month': {
      // Daily points for the current month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        points.push(new Date(now.getFullYear(), now.getMonth(), i));
      }
      break;
    }

    case 'quarter': {
      // Monthly points for the current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startMonth = currentQuarter * 3;
      for (let i = 0; i < 3; i++) {
        points.push(new Date(now.getFullYear(), startMonth + i, 1));
      }
      break;
    }

    case 'year':
      // Monthly points for the current year
      for (let i = 0; i < 12; i++) {
        points.push(new Date(now.getFullYear(), i, 1));
      }
      break;
  }
  
  return points;
}