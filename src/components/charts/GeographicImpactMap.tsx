import { ResponsiveChoropleth } from '@nivo/geo';
import { COMMUNITY_COLORS, DATA_COLORS } from '../../constants/designSystem';
import { Project } from '../../types';

// Australian States and Territories data - matching ACT's actual geographic presence
const australianStatesAndTerritories = [
  { id: 'QLD', properties: { name: 'Queensland' } },
  { id: 'NT', properties: { name: 'Northern Territory' } },
  { id: 'NSW', properties: { name: 'New South Wales' } },
  { id: 'ACT', properties: { name: 'Australian Capital Territory' } },
  { id: 'VIC', properties: { name: 'Victoria' } },
  { id: 'SA', properties: { name: 'South Australia' } },
  { id: 'WA', properties: { name: 'Western Australia' } },
  { id: 'TAS', properties: { name: 'Tasmania' } },
  { id: 'GLOBAL', properties: { name: 'Global/National' } }
];

interface GeographicImpactMapProps {
  projects: Project[];
  className?: string;
  height?: number;
}

interface GeographicData {
  id: string;
  value: number;
  projectCount: number;
  revenue: number;
  stateName: string;
}

/**
 * Geographic Impact Map
 * Shows community reach and project distribution across geographic regions
 * Meaningful visualization of ACT's geographic footprint and regional impact
 */
const GeographicImpactMap = ({ 
  projects, 
  className = '', 
  height = 500 
}: GeographicImpactMapProps) => {
  
  // Process projects to calculate geographic impact metrics
  const geographicData = new Map<string, GeographicData>();
  
  projects.forEach(project => {
    // Use the actual state field from Notion, fallback to location-based mapping
    let stateCode = mapStateToCode(project.state);
    let displayName = project.state;
    
    // If no state, try to map from location
    if (!stateCode && project.location) {
      stateCode = mapLocationToStateCode(project.location);
      displayName = project.location;
    }
    
    if (!stateCode || !displayName) return;
    
    const existing = geographicData.get(stateCode);
    if (existing) {
      existing.projectCount++;
      existing.revenue += project.revenueActual || 0;
      existing.value = calculateRegionalImpactScore(existing);
    } else {
      const newEntry: GeographicData = {
        id: stateCode,
        projectCount: 1,
        revenue: project.revenueActual || 0,
        stateName: displayName,
        value: 0
      };
      newEntry.value = calculateRegionalImpactScore(newEntry);
      geographicData.set(stateCode, newEntry);
    }
  });

  const data = Array.from(geographicData.values());
  const maxImpact = Math.max(...data.map(d => d.value), 1);

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Geographic Community Reach
        </h3>
        <p className="text-sm text-gray-600">
          Project distribution and community impact across Australian states and territories, including global initiatives
        </p>
      </div>

      {/* Geographic Distribution Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {data.map(region => {
          const intensity = maxImpact > 0 ? region.value / maxImpact : 0;
          const gradientColors = getGradientColors(intensity);
          
          return (
            <div
              key={region.id}
              className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 ${gradientColors.border}`}
              style={{
                background: gradientColors.background
              }}
            >
              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${gradientColors.text}`}>
                  {region.stateName}
                </div>
                <div className={`text-2xl font-bold mb-1 ${gradientColors.text}`}>
                  {region.projectCount}
                </div>
                <div className={`text-sm ${gradientColors.subtext}`}>
                  Project{region.projectCount !== 1 ? 's' : ''}
                </div>
                <div className={`text-xs ${gradientColors.subtext} mt-1`}>
                  ${Math.round(region.revenue / 1000)}K revenue
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Geographic Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
          <div className="text-2xl font-bold text-teal-700 mb-1">
            {data.length}
          </div>
          <div className="text-sm text-teal-600">States/Territories Active</div>
          <div className="text-xs text-teal-500 mt-1">
            Geographic diversity across Australia
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="text-2xl font-bold text-blue-700 mb-1">
            {data.length > 0 ? (projects.length / data.length).toFixed(1) : '0'}
          </div>
          <div className="text-sm text-blue-600">Avg Projects per State</div>
          <div className="text-xs text-blue-500 mt-1">
            Regional concentration of efforts
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="text-2xl font-bold text-green-700 mb-1">
            {getTopRegion(data)?.stateName || 'N/A'}
          </div>
          <div className="text-sm text-green-600">Highest Impact State</div>
          <div className="text-xs text-green-500 mt-1">
            Leading engagement region
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COMMUNITY_COLORS.primary[100] }}></div>
          <span className="text-xs text-gray-600">Low Impact</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COMMUNITY_COLORS.primary[400] }}></div>
          <span className="text-xs text-gray-600">Medium Impact</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: COMMUNITY_COLORS.primary[700] }}></div>
          <span className="text-xs text-gray-600">High Impact</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Calculate regional impact score based on project count and revenue
 */
function calculateRegionalImpactScore(region: GeographicData): number {
  // Weight project count and revenue for regional impact
  const projectScore = region.projectCount * 20; // 20 points per project
  const revenueScore = Math.min(region.revenue / 1000, 50); // Up to 50 points for revenue
  
  return Math.min(projectScore + revenueScore, 100);
}

/**
 * Get gradient colors matching Analytics page card styling
 */
function getGradientColors(intensity: number): {
  background: string;
  border: string;
  text: string;
  subtext: string;
} {
  if (intensity >= 0.75) {
    return {
      background: 'linear-gradient(to bottom right, #ecfdf5, #d1fae5)',
      border: 'border-green-200',
      text: 'text-green-700',
      subtext: 'text-green-600'
    };
  } else if (intensity >= 0.5) {
    return {
      background: 'linear-gradient(to bottom right, #f0fdfa, #ccfbf1)',
      border: 'border-teal-200',
      text: 'text-teal-700',
      subtext: 'text-teal-600'
    };
  } else if (intensity >= 0.25) {
    return {
      background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
      border: 'border-blue-200',
      text: 'text-blue-700',
      subtext: 'text-blue-600'
    };
  } else {
    return {
      background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
      border: 'border-gray-200',
      text: 'text-gray-700',
      subtext: 'text-gray-600'
    };
  }
}

/**
 * Get the region with highest impact
 */
function getTopRegion(data: GeographicData[]): GeographicData | undefined {
  return data.reduce((top, current) => 
    current.value > (top?.value || 0) ? current : top, undefined as GeographicData | undefined
  );
}

/**
 * Map Notion state values to standard state codes
 * Handles the actual state options from the database
 */
function mapStateToCode(state: string): string | null {
  if (!state) return null;
  
  const stateMap: Record<string, string> = {
    'Queensland': 'QLD',
    'Northern Territory': 'NT',
    'NSW': 'NSW',
    'ACT': 'ACT',
    'Global': 'GLOBAL',
    'National': 'GLOBAL'
  };
  
  return stateMap[state] || null;
}

/**
 * Map location names to state codes based on actual ACT locations
 * Uses the real location data from Notion database
 */
function mapLocationToStateCode(location: string): string | null {
  if (!location) return null;
  
  const locationMap: Record<string, string> = {
    // Queensland locations
    'sunshine coast': 'QLD',
    'stradbroke island': 'QLD',
    'brisbane': 'QLD',
    'palm island': 'QLD',
    'townsville': 'QLD',
    'toowoomba': 'QLD',
    
    // Northern Territory locations
    'tennant creek': 'NT',
    'maningrida': 'NT',
    'alice springs': 'NT',
    
    // Other locations
    'mount isa': 'QLD', // Mount Isa is in Queensland
    'canberra': 'ACT',
    'sydney': 'NSW',
    
    // Global/International
    'spain': 'GLOBAL',
    'everywhere': 'GLOBAL'
  };
  
  const normalized = location.toLowerCase().trim();
  return locationMap[normalized] || null;
}

export default GeographicImpactMap;