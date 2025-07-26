import { ResponsiveSankey } from '@nivo/sankey';
import { COMMUNITY_COLORS, DATA_COLORS } from '../../constants/designSystem';
import { Opportunity } from '../../types';

interface OpportunityPipelineFunnelProps {
  opportunities: Opportunity[];
  className?: string;
  height?: number;
}

interface PipelineStage {
  id: string;
  name: string;
  count: number;
  totalValue: number;
  weightedValue: number;
  averageProbability: number;
}

interface SankeyData {
  nodes: Array<{ id: string; color?: string }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    color?: string;
  }>;
}

/**
 * Opportunity Pipeline Funnel
 * Sophisticated visualization showing opportunity flow through pipeline stages
 * with weighted values, conversion rates, and bottleneck identification
 */
const OpportunityPipelineFunnel = ({ 
  opportunities, 
  className = '', 
  height = 400 
}: OpportunityPipelineFunnelProps) => {
  
  // Calculate pipeline metrics by stage
  const stages: PipelineStage[] = [
    { id: 'Discovery', name: 'Discovery', count: 0, totalValue: 0, weightedValue: 0, averageProbability: 0 },
    { id: 'Applied', name: 'Applied', count: 0, totalValue: 0, weightedValue: 0, averageProbability: 0 },
    { id: 'Negotiation', name: 'Negotiation', count: 0, totalValue: 0, weightedValue: 0, averageProbability: 0 },
    { id: 'Closed Won', name: 'Closed Won', count: 0, totalValue: 0, weightedValue: 0, averageProbability: 0 },
    { id: 'Closed Lost', name: 'Closed Lost', count: 0, totalValue: 0, weightedValue: 0, averageProbability: 0 }
  ];

  // Process opportunities into pipeline stages
  opportunities.forEach(opp => {
    const stage = stages.find(s => s.id === opp.stage);
    if (stage) {
      stage.count++;
      stage.totalValue += opp.amount || 0;
      stage.weightedValue += (opp.amount || 0) * ((opp.probability || 0) / 100);
      stage.averageProbability = (stage.averageProbability + (opp.probability || 0)) / stage.count;
    }
  });

  // Create Sankey flow data showing movement between stages
  const sankeyData: SankeyData = {
    nodes: [
      { id: 'Pipeline Entry', color: COMMUNITY_COLORS.neutral[400] },
      ...stages.filter(s => s.count > 0).map(stage => ({
        id: stage.name,
        color: getStageColor(stage.id)
      }))
    ],
    links: []
  };

  // Add links based on stage progression (simplified flow model)
  const activeStages = stages.filter(s => s.count > 0);
  if (activeStages.length > 0) {
    // Entry to first stages
    sankeyData.links.push({
      source: 'Pipeline Entry',
      target: 'Discovery',
      value: stages[0].count || 1,
      color: COMMUNITY_COLORS.primary[300]
    });

    // Stage to stage flows (simplified)
    for (let i = 0; i < activeStages.length - 1; i++) {
      const current = activeStages[i];
      const next = activeStages[i + 1];
      if (current.count > 0 && next.count > 0) {
        sankeyData.links.push({
          source: current.name,
          target: next.name,
          value: Math.min(current.count, next.count),
          color: getStageColor(next.id)
        });
      }
    }
  }

  // Calculate conversion metrics
  const totalOpportunities = opportunities.length;
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
  const totalWeightedValue = opportunities.reduce((sum, opp) => 
    sum + (opp.amount || 0) * ((opp.probability || 0) / 100), 0
  );
  const conversionRate = totalOpportunities > 0 ? 
    (stages.find(s => s.id === 'Closed Won')?.count || 0) / totalOpportunities * 100 : 0;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Opportunity Pipeline Analysis
        </h3>
        <p className="text-sm text-gray-600">
          Flow of opportunities through pipeline stages with conversion tracking and bottleneck identification
        </p>
      </div>

      {/* Pipeline Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">
            {totalOpportunities}
          </div>
          <div className="text-sm text-blue-600">Total Opportunities</div>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">
            ${Math.round(totalValue / 1000)}K
          </div>
          <div className="text-sm text-amber-600">Pipeline Value</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700">
            ${Math.round(totalWeightedValue / 1000)}K
          </div>
          <div className="text-sm text-green-600">Weighted Value</div>
        </div>
        
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <div className="text-2xl font-bold text-teal-700">
            {conversionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-teal-600">Win Rate</div>
        </div>
      </div>

      {/* Pipeline Stages Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="p-4 rounded-lg border-2 relative overflow-hidden"
            style={{
              backgroundColor: `${getStageColor(stage.id)}15`,
              borderColor: getStageColor(stage.id)
            }}
          >
            <div className="text-center relative z-10">
              <div className="text-lg font-bold" style={{ color: getStageColor(stage.id) }}>
                {stage.count}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {stage.name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                ${Math.round(stage.totalValue / 1000)}K total
              </div>
              <div className="text-xs text-gray-500">
                ${Math.round(stage.weightedValue / 1000)}K weighted
              </div>
              {stage.count > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {stage.averageProbability.toFixed(0)}% avg prob
                </div>
              )}
            </div>
            
            {/* Stage health indicator */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-300"
              style={{ 
                backgroundColor: getStageColor(stage.id),
                opacity: stage.count > 0 ? 0.6 : 0.1
              }}
            />
          </div>
        ))}
      </div>

      {/* Sankey Flow Visualization */}
      {sankeyData.nodes.length > 1 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4" style={{ height }}>
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
            align="justify"
            colors={({ id }) => {
              const node = sankeyData.nodes.find(n => n.id === id);
              return node?.color || COMMUNITY_COLORS.neutral[400];
            }}
            nodeOpacity={0.8}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderRadius={4}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={3}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={COMMUNITY_COLORS.neutral[700]}
            theme={{
              labels: {
                text: {
                  fontSize: 12,
                  fontWeight: 500,
                  fill: COMMUNITY_COLORS.neutral[700]
                }
              },
              tooltip: {
                container: {
                  background: COMMUNITY_COLORS.neutral[900],
                  color: COMMUNITY_COLORS.neutral[50],
                  fontSize: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }
              }
            }}
          />
        </div>
      )}

      {/* Pipeline Health Insights */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Pipeline Health Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Bottleneck Analysis:</span>
            <span className="ml-2 text-gray-600">
              {getBottleneckStage(stages)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Velocity:</span>
            <span className="ml-2 text-gray-600">
              {calculatePipelineVelocity(opportunities)} days avg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get color for each pipeline stage
 */
function getStageColor(stageId: string): string {
  const colors = {
    'Discovery': COMMUNITY_COLORS.neutral[500],
    'Applied': COMMUNITY_COLORS.secondary[500], 
    'Negotiation': COMMUNITY_COLORS.primary[500],
    'Closed Won': COMMUNITY_COLORS.success[600],
    'Closed Lost': COMMUNITY_COLORS.error[400]
  };
  return colors[stageId as keyof typeof colors] || COMMUNITY_COLORS.neutral[400];
}

/**
 * Identify bottleneck stage in pipeline
 */
function getBottleneckStage(stages: PipelineStage[]): string {
  const activeStages = stages.filter(s => s.count > 0);
  if (activeStages.length < 2) return 'Insufficient data';
  
  // Find stage with highest count (potential bottleneck)
  const maxCount = Math.max(...activeStages.map(s => s.count));
  const bottleneck = activeStages.find(s => s.count === maxCount);
  
  return `${bottleneck?.name || 'N/A'} (${maxCount} opportunities)`;
}

/**
 * Calculate average pipeline velocity
 */
function calculatePipelineVelocity(opportunities: Opportunity[]): number {
  // Simplified calculation - in production, would track actual stage durations
  const avgAmount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0) / opportunities.length;
  const avgProbability = opportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / opportunities.length;
  
  // Rough estimate: higher value + higher probability = faster velocity
  return Math.max(30, 120 - (avgAmount / 10000) - avgProbability);
}

export default OpportunityPipelineFunnel;