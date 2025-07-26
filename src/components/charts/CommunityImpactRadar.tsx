import { COMMUNITY_COLORS, DATA_COLORS } from '../../constants/designSystem';
import { Project } from '../../types';

interface CommunityImpactRadarProps {
  projects: Project[];
  className?: string;
  height?: number;
}

interface FocusAreaData {
  area: string;
  fullLabel: string;
  projectCount: number;
  totalRevenue: number;
  avgRevenue: number;
  revenuePerProject: number;
  color: string;
}

/**
 * Community Impact by Focus Area
 * Shows ACT's project distribution and financial impact across different focus areas
 * Uses meaningful bar charts to show actual differences between areas
 */
const CommunityImpactRadar = ({ 
  projects, 
  className = '', 
  height = 400 
}: CommunityImpactRadarProps) => {
  
  // Define focus area colors from our design system
  const areaColors: Record<string, string> = {
    'Art': DATA_COLORS.projectAreas.storyMatter || COMMUNITY_COLORS.primary[600],
    'Economic Freedom': DATA_COLORS.projectAreas.economicFreedom || COMMUNITY_COLORS.secondary[600],
    'Health and wellbeing': DATA_COLORS.projectAreas.healingJustice || COMMUNITY_COLORS.success[600],
    'Indigenous': COMMUNITY_COLORS.secondary[500],
    'Youth Justice': DATA_COLORS.projectAreas.politicalPower || '#8b5cf6',
    'Storytelling': DATA_COLORS.projectAreas.storyMatter || COMMUNITY_COLORS.primary[500],
    'Global community': '#ef4444',
    'Operations': '#64748b'
  };

  // Initialize focus area data with actual project areas from Notion
  const focusAreaData: Record<string, FocusAreaData> = {};
  
  // Group by locations instead of focus areas
  const locationData: Record<string, FocusAreaData> = {};
  
  // First pass: identify all unique locations and initialize
  projects.forEach(project => {
    const location = project.location || project.state || 'Unknown';
    if (!locationData[location]) {
      locationData[location] = {
        area: location,
        fullLabel: location,
        projectCount: 0,
        totalRevenue: 0,
        avgRevenue: 0,
        revenuePerProject: 0,
        color: getLocationColor(location)
      };
    }
  });

  // Second pass: calculate metrics for each location
  projects.forEach(project => {
    const location = project.location || project.state || 'Unknown';
    if (!locationData[location]) return;
    
    const locData = locationData[location];
    locData.projectCount++;
    locData.totalRevenue += project.revenueActual || 0;
  });

  // Calculate derived metrics
  Object.values(locationData).forEach(loc => {
    loc.avgRevenue = loc.totalRevenue / Math.max(loc.projectCount, 1);
    loc.revenuePerProject = loc.projectCount > 0 ? loc.totalRevenue / loc.projectCount : 0;
  });

  // Helper function to format revenue
  const formatRevenue = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${Math.round(amount / 1000)}K`;
    } else {
      return `${Math.round(amount)}`;
    }
  };

  // Convert to array and filter out empty locations, sort by project count
  const chartData = Object.values(locationData)
    .filter(loc => loc.projectCount > 0)
    .sort((a, b) => b.projectCount - a.projectCount)
    .map(loc => ({
      area: loc.area,
      'Project Count': loc.projectCount,
      'Total Revenue': formatRevenue(loc.totalRevenue),
      'Avg Revenue per Project': formatRevenue(loc.revenuePerProject),
      color: loc.color
    }));

  return (
    <div className={`relative ${className}`}>
      {/* Chart Title */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Projects by Location
        </h3>
        <p className="text-sm text-gray-600">
          Where ACT is making impact across Australia and beyond
        </p>
      </div>

      {/* Compact Cards - 3 Across */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartData.map((area, index) => (
            <div
              key={area.area}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-xl">{getLocationIcon(area.area)}</div>
                <div className="font-medium text-gray-900 text-sm">{area.area}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-gray-500">
                  {area['Project Count']} project{area['Project Count'] !== 1 ? 's' : ''}
                </div>
                <div className="font-semibold text-gray-900">
                  {area['Total Revenue']} total
                </div>
                {area['Total Revenue'] !== '0' && (
                  <div className="text-xs text-gray-500">
                    {area['Avg Revenue per Project']} avg
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No projects found in any focus areas
        </div>
      )}

      {/* Insights Panel */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
          <div className="text-2xl font-bold text-teal-700 mb-1">
            {chartData.length}
          </div>
          <div className="text-sm text-teal-600">Active Locations</div>
          <div className="text-xs text-teal-500 mt-1">
            Places with projects
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
          <div className="text-2xl font-bold text-amber-700 mb-1">
            {chartData.length > 0 ? chartData[0]?.area || 'N/A' : 'N/A'}
          </div>
          <div className="text-sm text-amber-600">Most Active</div>
          <div className="text-xs text-amber-500 mt-1">
            Location with most projects
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="text-2xl font-bold text-green-700 mb-1">
            {formatRevenue(Object.values(locationData).reduce((sum, loc) => sum + loc.totalRevenue, 0))}
          </div>
          <div className="text-sm text-green-600">Total Revenue</div>
          <div className="text-xs text-green-500 mt-1">
            Across all locations
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get icon for location
 */
function getLocationIcon(location: string): string {
  const iconMap: Record<string, string> = {
    'Brisbane': '🏙️',
    'Sydney': '🌉',
    'Canberra': '🏛️',
    'Melbourne': '☕',
    'Sunshine Coast': '🌅',
    'Townsville': '🌴',
    'Alice Springs': '🏜️',
    'Tennant Creek': '⛰️',
    'Mount Isa': '⛏️',
    'Palm Island': '🏝️',
    'Stradbroke Island': '🏖️',
    'Maningrida': '🦘',
    'Toowoomba': '🌾',
    'Spain': '🇪🇸',
    'Everywhere': '🌍',
    'Queensland': '🦘',
    'Northern Territory': '🌵',
    'NSW': '🏙️',
    'ACT': '🏛️',
    'Global': '🌎',
    'National': '🇦🇺'
  };
  
  return iconMap[location] || '📍';
}

/**
 * Get color for location
 */
function getLocationColor(location: string): string {
  const colorMap: Record<string, string> = {
    'Brisbane': '#e11d48',
    'Sydney': '#0ea5e9', 
    'Canberra': '#7c3aed',
    'Melbourne': '#059669',
    'Queensland': '#dc2626',
    'Northern Territory': '#ea580c',
    'NSW': '#0284c7',
    'ACT': '#7c2d12',
    'Global': '#059669',
    'National': '#0f766e',
    'Spain': '#eab308'
  };
  
  return colorMap[location] || COMMUNITY_COLORS.primary[600];
}

export default CommunityImpactRadar;