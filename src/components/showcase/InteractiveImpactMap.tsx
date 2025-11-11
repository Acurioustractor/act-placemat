import { useState, useMemo } from 'react';
import { Project } from '../../types';
import { PROJECT_AREAS } from '../../constants';

interface InteractiveMapProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  className?: string;
}

// Australian cities coordinates (for mapping)
const LOCATION_COORDS: Record<string, { x: number; y: number; label: string }> = {
  // ACT
  'Canberra': { x: 580, y: 420, label: 'Canberra' },
  'ACT': { x: 580, y: 420, label: 'ACT' },

  // NSW
  'Sydney': { x: 600, y: 400, label: 'Sydney' },
  'NSW': { x: 600, y: 350, label: 'NSW' },

  // Queensland
  'Brisbane': { x: 620, y: 270, label: 'Brisbane' },
  'Queensland': { x: 550, y: 200, label: 'Queensland' },
  'Sunshine Coast': { x: 630, y: 260, label: 'Sunshine Coast' },
  'Townsville': { x: 600, y: 150, label: 'Townsville' },
  'Toowoomba': { x: 610, y: 280, label: 'Toowoomba' },
  'Mount Isa': { x: 480, y: 160, label: 'Mount Isa' },
  'Palm Island': { x: 610, y: 140, label: 'Palm Island' },
  'Stradbroke Island': { x: 635, y: 275, label: 'Stradbroke Island' },

  // Northern Territory
  'Darwin': { x: 450, y: 90, label: 'Darwin' },
  'Northern Territory': { x: 450, y: 200, label: 'NT' },
  'Alice Springs': { x: 460, y: 290, label: 'Alice Springs' },
  'Tennant Creek': { x: 465, y: 200, label: 'Tennant Creek' },
  'Maningrida': { x: 470, y: 95, label: 'Maningrida' },

  // Victoria
  'Melbourne': { x: 580, y: 460, label: 'Melbourne' },
  'Victoria': { x: 580, y: 460, label: 'VIC' },

  // South Australia
  'Adelaide': { x: 500, y: 420, label: 'Adelaide' },
  'South Australia': { x: 480, y: 380, label: 'SA' },

  // Western Australia
  'Perth': { x: 300, y: 400, label: 'Perth' },
  'Western Australia': { x: 350, y: 300, label: 'WA' },

  // Tasmania
  'Hobart': { x: 600, y: 520, label: 'Hobart' },
  'Tasmania': { x: 600, y: 520, label: 'TAS' },

  // Special
  'National': { x: 450, y: 300, label: 'National' },
  'Global': { x: 200, y: 250, label: 'Global' },
  'Everywhere': { x: 450, y: 300, label: 'National' },
  'Spain': { x: 100, y: 200, label: 'Spain' }
};

/**
 * InteractiveImpactMap - Geographic visualization of project locations
 * Shows projects on an interactive Australia map with clickable markers
 *
 * Features:
 * - SVG-based Australia map
 * - Color-coded markers by project area
 * - Hover cards with project details
 * - Click to view full project
 * - Responsive design
 */
const InteractiveImpactMap = ({ projects, onProjectClick, className = '' }: InteractiveMapProps) => {
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 });

  // Group projects by location
  const projectsByLocation = useMemo(() => {
    const grouped = new Map<string, Project[]>();

    projects.forEach(project => {
      const location = project.location || project.state || 'National';
      if (!grouped.has(location)) {
        grouped.set(location, []);
      }
      grouped.get(location)!.push(project);
    });

    return grouped;
  }, [projects]);

  // Get marker color based on project area
  const getMarkerColor = (projects: Project[]): string => {
    if (projects.length === 0) return '#6B7280';

    const firstProject = projects[0];
    const areaConfig = PROJECT_AREAS.find(a => a.value === firstProject.area);
    return areaConfig?.color || '#6366F1';
  };

  // Get marker size based on number of projects
  const getMarkerSize = (count: number): number => {
    if (count === 1) return 8;
    if (count <= 3) return 12;
    if (count <= 5) return 16;
    return 20;
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {/* Map Container */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        <svg
          viewBox="0 0 800 600"
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Australia Outline (Simplified) */}
          <path
            d="M 200 450
               Q 250 480 300 480
               L 350 470
               L 400 450
               L 450 420
               L 480 400
               L 520 380
               L 550 350
               L 570 320
               L 580 280
               L 600 250
               L 620 220
               L 630 180
               L 630 140
               L 620 110
               L 600 90
               L 570 80
               L 540 80
               L 510 90
               L 480 110
               L 450 130
               L 420 150
               L 400 180
               L 380 210
               L 360 240
               L 340 270
               L 320 300
               L 300 320
               L 280 340
               L 260 360
               L 240 380
               L 220 410
               Z"
            fill="#F0F9FF"
            stroke="#3B82F6"
            strokeWidth="1"
            opacity="0.3"
          />

          {/* State Borders (Simplified) */}
          <g stroke="#94A3B8" strokeWidth="0.5" opacity="0.3" fill="none">
            <line x1="450" y1="90" x2="450" y2="450" /> {/* NT/QLD border */}
            <line x1="300" y1="300" x2="600" y2="300" /> {/* Central line */}
            <line x1="500" y1="380" x2="600" y2="420" /> {/* NSW/VIC border */}
          </g>

          {/* Location Markers */}
          {Array.from(projectsByLocation.entries()).map(([location, locationProjects]) => {
            const coords = LOCATION_COORDS[location];
            if (!coords) return null;

            const markerColor = getMarkerColor(locationProjects);
            const markerSize = getMarkerSize(locationProjects.length);

            return (
              <g key={location}>
                {/* Marker pulse effect */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={markerSize + 4}
                  fill={markerColor}
                  opacity="0.2"
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />

                {/* Main marker */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={markerSize}
                  fill={markerColor}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onMouseEnter={(e) => {
                    setHoveredProject(locationProjects[0]);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPosition({ x: coords.x, y: coords.y });
                  }}
                  onMouseLeave={() => setHoveredProject(null)}
                  onClick={() => onProjectClick?.(locationProjects[0])}
                />

                {/* Project count badge */}
                {locationProjects.length > 1 && (
                  <text
                    x={coords.x}
                    y={coords.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {locationProjects.length}
                  </text>
                )}
              </g>
            );
          })}

          {/* Location Labels */}
          {Array.from(projectsByLocation.keys()).map(location => {
            const coords = LOCATION_COORDS[location];
            if (!coords) return null;

            return (
              <text
                key={`label-${location}`}
                x={coords.x}
                y={coords.y - 25}
                textAnchor="middle"
                fill="#1F2937"
                fontSize="11"
                fontWeight="500"
                className="pointer-events-none"
              >
                {coords.label}
              </text>
            );
          })}
        </svg>

        {/* Hover Card */}
        {hoveredProject && (
          <div
            className="absolute z-10 bg-white rounded-lg shadow-xl p-4 max-w-xs pointer-events-none"
            style={{
              left: `${(hoveredPosition.x / 800) * 100}%`,
              top: `${(hoveredPosition.y / 600) * 100}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <h4 className="font-semibold text-gray-900 mb-1">{hoveredProject.name}</h4>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {hoveredProject.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{hoveredProject.location || hoveredProject.state}</span>
              {hoveredProject.revenueActual > 0 && (
                <>
                  <span>•</span>
                  <span>${(hoveredProject.revenueActual / 1000).toFixed(0)}K</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Project Areas</h4>
        <div className="flex flex-wrap gap-3">
          {PROJECT_AREAS.map(area => {
            const count = projects.filter(p => p.area === area.value).length;
            if (count === 0) return null;

            return (
              <div key={area.value} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: area.color }}
                />
                <span className="text-sm text-gray-600">
                  {area.label} ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary-600">
            {projectsByLocation.size}
          </div>
          <div className="text-xs text-gray-500">Locations</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary-600">
            {projects.length}
          </div>
          <div className="text-xs text-gray-500">Projects</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary-600">
            {projects.filter(p => p.status === 'Active 🔥').length}
          </div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveImpactMap;
