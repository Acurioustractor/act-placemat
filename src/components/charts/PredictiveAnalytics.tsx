import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { COMMUNITY_COLORS } from '../../constants/designSystem';
import { Opportunity, Project } from '../../types';

interface PredictiveAnalyticsProps {
  opportunities: Opportunity[];
  projects: Project[];
  className?: string;
  height?: number;
}

interface PredictiveDataPoint {
  x: number;
  y: number;
  id: string;
  data: {
    name: string;
    stage: string;
    amount: number;
    probability: number;
    predictedSuccess: number;
    riskLevel: 'Low' | 'Medium' | 'High';
  };
}

interface RevenueProjection {
  id: string;
  value: number;
  color: string;
  children?: RevenueProjection[];
}

/**
 * Predictive Analytics Dashboard
 * Advanced forecasting and success probability analysis
 * Machine learning-inspired insights for opportunity optimization
 */
const PredictiveAnalytics = ({ 
  opportunities, 
  projects, 
  className = '', 
  height = 400 
}: PredictiveAnalyticsProps) => {

  // Calculate predictive success score based on multiple factors
  const calculatePredictiveScore = (opportunity: Opportunity): number => {
    let score = 0;
    
    // Base probability weight (40%)
    score += (opportunity.probability || 0) * 0.4;
    
    // Amount size factor (20%) - larger amounts get slight boost
    const amountFactor = Math.min((opportunity.amount || 0) / 50000, 1) * 20;
    score += amountFactor;
    
    // Stage progression factor (20%)
    const stageFactors: Record<string, number> = {
      'Discovery': 10,
      'Applied': 25,
      'Negotiation': 40,
      'Closed Won': 100,
      'Closed Lost': 0
    };
    score += (stageFactors[opportunity.stage as string] || 10) * 0.2;
    
    // Relationship strength factor (20%) - based on related projects
    const relatedProjects = projects.filter(p =>
      p.partnerOrganizations.some(org =>
        opportunity.organization && org === opportunity.organization
      )
    ).length;
    const relationshipBonus = Math.min(relatedProjects * 5, 20);
    score += relationshipBonus;
    
    return Math.min(score, 100);
  };

  // Determine risk level based on various factors
  const calculateRiskLevel = (opportunity: Opportunity, predictiveScore: number): 'Low' | 'Medium' | 'High' => {
    if (predictiveScore > 70 && (opportunity.probability || 0) > 50) return 'Low';
    if (predictiveScore > 40 && (opportunity.probability || 0) > 25) return 'Medium';
    return 'High';
  };

  // Create scatter plot data for opportunity analysis
  const scatterData = [{
    id: 'Opportunities',
    data: opportunities.map(opp => {
      const predictiveScore = calculatePredictiveScore(opp);
      const riskLevel = calculateRiskLevel(opp, predictiveScore);
      
      return {
        x: opp.probability || 0,
        y: predictiveScore,
        id: opp.id,
        data: {
          name: opp.title || 'Untitled Opportunity',
          stage: opp.stage || 'Discovery',
          amount: opp.amount || 0,
          probability: opp.probability || 0,
          predictedSuccess: predictiveScore,
          riskLevel
        }
      } as PredictiveDataPoint;
    })
  }];

  // Calculate revenue projections by quarter
  const calculateRevenueProjections = (): RevenueProjection[] => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentQuarter = Math.floor((new Date().getMonth()) / 3);
    
    return quarters.map((quarter, index) => {
      const isCurrentOrFuture = index >= currentQuarter;
      let quarterRevenue = 0;
      
      if (isCurrentOrFuture) {
        // Project revenue based on opportunity probability and timing
        quarterRevenue = opportunities
          .filter(opp => (opp.probability || 0) > 25) // Only likely opportunities
          .reduce((sum, opp) => {
            const weightedAmount = (opp.amount || 0) * ((opp.probability || 0) / 100);
            const timingFactor = index === currentQuarter ? 0.7 : index === currentQuarter + 1 ? 0.9 : 0.5;
            return sum + (weightedAmount * timingFactor);
          }, 0);
      } else {
        // Use actual revenue for past quarters (approximated from projects)
        quarterRevenue = projects
          .filter(p => p.revenueActual && p.revenueActual > 0)
          .reduce((sum, p) => sum + (p.revenueActual || 0), 0) / 4; // Approximate quarterly split
      }
      
      return {
        id: quarter,
        value: Math.round(quarterRevenue / 1000), // Convert to K
        color: isCurrentOrFuture ? COMMUNITY_COLORS.secondary[600] : COMMUNITY_COLORS.primary[600]
      };
    });
  };

  const revenueProjections = calculateRevenueProjections();

  // Calculate key metrics
  const totalProjectedRevenue = revenueProjections.reduce((sum, q) => sum + q.value, 0);
  const highConfidenceOpps = opportunities.filter(opp => (opp.probability || 0) > 75).length;
  const averagePredictiveScore = scatterData[0].data.length > 0 ? 
    scatterData[0].data.reduce((sum, d) => sum + d.data.predictedSuccess, 0) / scatterData[0].data.length : 0;
  
  const riskDistribution = scatterData[0].data.reduce((acc, d) => {
    acc[d.data.riskLevel] = (acc[d.data.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Predictive Analytics & Forecasting
        </h3>
        <p className="text-sm text-gray-600">
          AI-inspired success probability analysis and revenue forecasting based on historical patterns and relationship strength
        </p>
      </div>

      {/* Predictive Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">
            ${totalProjectedRevenue}K
          </div>
          <div className="text-sm text-blue-600">Projected Revenue</div>
          <div className="text-xs text-blue-500 mt-1">Next 4 quarters</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700">
            {highConfidenceOpps}
          </div>
          <div className="text-sm text-green-600">High-Confidence</div>
          <div className="text-xs text-green-500 mt-1">Opportunities (&gt;75%)</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-700">
            {averagePredictiveScore.toFixed(1)}
          </div>
          <div className="text-sm text-purple-600">Avg Success Score</div>
          <div className="text-xs text-purple-500 mt-1">Predictive algorithm</div>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">
            {riskDistribution.Low || 0}:{riskDistribution.Medium || 0}:{riskDistribution.High || 0}
          </div>
          <div className="text-sm text-amber-600">Risk Distribution</div>
          <div className="text-xs text-amber-500 mt-1">Low:Med:High</div>
        </div>
      </div>

      {/* Opportunity Success Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Opportunity Success Probability Matrix</h4>
          <div style={{ height: height - 100 }}>
            <ResponsiveScatterPlot
              data={scatterData}
              margin={{ top: 20, right: 100, bottom: 70, left: 70 }}
              xScale={{ type: 'linear', min: 0, max: 100 }}
              yScale={{ type: 'linear', min: 0, max: 100 }}
              nodeSize={{
                key: 'data.amount',
                values: [0, 100000],
                sizes: [6, 20]
              }}
              colors={[COMMUNITY_COLORS.success[600], COMMUNITY_COLORS.secondary[600], COMMUNITY_COLORS.error[500]]}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Current Probability (%)',
                legendPosition: 'middle',
                legendOffset: 46
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Predictive Success Score',
                legendPosition: 'middle',
                legendOffset: -60
              }}
              theme={{
                background: 'transparent',
                text: {
                  fill: COMMUNITY_COLORS.neutral[700],
                  fontSize: 11
                },
                axis: {
                  domain: {
                    line: {
                      stroke: COMMUNITY_COLORS.neutral[300],
                      strokeWidth: 1
                    }
                  },
                  legend: {
                    text: {
                      fontSize: 12,
                      fill: COMMUNITY_COLORS.neutral[700],
                      fontWeight: 500
                    }
                  },
                  ticks: {
                    line: {
                      stroke: COMMUNITY_COLORS.neutral[300],
                      strokeWidth: 1
                    },
                    text: {
                      fontSize: 10,
                      fill: COMMUNITY_COLORS.neutral[600]
                    }
                  }
                },
                grid: {
                  line: {
                    stroke: COMMUNITY_COLORS.neutral[200],
                    strokeWidth: 1
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
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Quarterly Revenue Projections</h4>
          <div style={{ height: height - 100 }}>
            <ResponsiveTreeMap
              data={{
                id: 'root',
                children: revenueProjections
              }}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              labelSkipSize={12}
              labelTextColor={COMMUNITY_COLORS.neutral[50]}
              parentLabelPosition="left"
              parentLabelTextColor={COMMUNITY_COLORS.neutral[700]}
              borderColor={COMMUNITY_COLORS.neutral[300]}
              theme={{
                background: 'transparent',
                text: {
                  fill: COMMUNITY_COLORS.neutral[50],
                  fontSize: 14
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
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <h4 className="font-semibold text-indigo-900 mb-3">AI-Inspired Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-indigo-800">Optimization Focus:</span>
            <span className="ml-2 text-indigo-700">
              {averagePredictiveScore < 60 ? 'Strengthen relationship building and proposal quality' : 
               'Maintain current approach, consider increasing opportunity volume'}
            </span>
          </div>
          <div>
            <span className="font-medium text-indigo-800">Risk Management:</span>
            <span className="ml-2 text-indigo-700">
              {(riskDistribution.High || 0) > (riskDistribution.Low || 0) ? 
                'Focus on converting medium-risk opportunities to reduce portfolio risk' :
                'Portfolio shows healthy risk distribution'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;