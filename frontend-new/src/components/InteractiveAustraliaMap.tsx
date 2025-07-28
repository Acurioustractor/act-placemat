import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommunityLocation {
  id: string;
  name: string;
  state: string;
  type: 'community' | 'partner' | 'project-site' | 'innovation-hub';
  coordinates: { x: number; y: number }; // Percentage positions on SVG
  projects: string[];
  description: string;
  population?: number;
  established?: string;
  connections: string[]; // IDs of connected locations
  stories: number;
  innovations: number;
}

interface ConnectionLine {
  from: string;
  to: string;
  type: 'collaboration' | 'knowledge-sharing' | 'resource-flow' | 'storytelling';
  strength: 'strong' | 'medium' | 'emerging';
}

export default function InteractiveAustraliaMap() {
  const [selectedLocation, setSelectedLocation] = useState<CommunityLocation | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  // Mock community data with real Aboriginal communities and locations
  const communities: CommunityLocation[] = [
    {
      id: 'yarrabah',
      name: 'Yarrabah Community',
      state: 'QLD',
      type: 'community',
      coordinates: { x: 85, y: 25 },
      projects: ['goods', 'picc'],
      description: 'Traditional Aboriginal community testing the Great Bed design and developing local innovation solutions.',
      population: 2500,
      established: '2023',
      connections: ['cairns', 'melbourne', 'alice-springs'],
      stories: 12,
      innovations: 3
    },
    {
      id: 'tiwi-islands',
      name: 'Tiwi Islands',
      state: 'NT',
      type: 'innovation-hub',
      coordinates: { x: 50, y: 15 },
      projects: ['picc', 'justice-hub'],
      description: 'Community innovation lab piloting place-based solutions and youth justice programs.',
      population: 3000,
      established: '2023',
      connections: ['darwin', 'melbourne', 'yarrabah'],
      stories: 8,
      innovations: 5
    },
    {
      id: 'alice-springs',
      name: 'Alice Springs',
      state: 'NT',
      type: 'project-site',
      coordinates: { x: 52, y: 50 },
      projects: ['justice-hub', 'goods'],
      description: 'Central Australia hub for youth justice innovation and community design partnerships.',
      population: 25000,
      established: '2022',
      connections: ['yarrabah', 'melbourne', 'perth'],
      stories: 15,
      innovations: 4
    },
    {
      id: 'broome',
      name: 'Broome',
      state: 'WA',
      type: 'community',
      coordinates: { x: 35, y: 25 },
      projects: ['picc'],
      description: 'Pearling town community developing tourism and cultural preservation innovations.',
      population: 14000,
      established: '2024',
      connections: ['perth', 'alice-springs'],
      stories: 6,
      innovations: 2
    },
    {
      id: 'melbourne',
      name: 'Melbourne',
      state: 'VIC',
      type: 'partner',
      coordinates: { x: 75, y: 75 },
      projects: ['goods', 'justice-hub', 'picc'],
      description: 'ACT headquarters and design lab, supporting all community partnerships.',
      population: 5000000,
      established: '2021',
      connections: ['yarrabah', 'tiwi-islands', 'alice-springs', 'sydney'],
      stories: 25,
      innovations: 8
    },
    {
      id: 'sydney',
      name: 'Sydney',
      state: 'NSW',
      type: 'partner',
      coordinates: { x: 82, y: 70 },
      projects: ['justice-hub'],
      description: 'Youth justice advocacy partnerships and policy influence hub.',
      population: 5500000,
      established: '2023',
      connections: ['melbourne', 'brisbane'],
      stories: 18,
      innovations: 3
    },
    {
      id: 'brisbane',
      name: 'Brisbane',
      state: 'QLD',
      type: 'partner',
      coordinates: { x: 85, y: 55 },
      projects: ['goods', 'picc'],
      description: 'Innovation funding and university research partnerships.',
      population: 2500000,
      established: '2022',
      connections: ['sydney', 'cairns'],
      stories: 12,
      innovations: 4
    },
    {
      id: 'cairns',
      name: 'Cairns',
      state: 'QLD',
      type: 'project-site',
      coordinates: { x: 82, y: 30 },
      projects: ['goods'],
      description: 'Regional health innovation testing site for Great Bed project.',
      population: 150000,
      established: '2023',
      connections: ['yarrabah', 'brisbane'],
      stories: 9,
      innovations: 2
    },
    {
      id: 'perth',
      name: 'Perth',
      state: 'WA',
      type: 'partner',
      coordinates: { x: 25, y: 65 },
      projects: ['picc'],
      description: 'Western Australia community innovation support and funding partnerships.',
      population: 2100000,
      established: '2023',
      connections: ['broome', 'alice-springs', 'adelaide'],
      stories: 14,
      innovations: 3
    },
    {
      id: 'adelaide',
      name: 'Adelaide',
      state: 'SA',
      type: 'innovation-hub',
      coordinates: { x: 62, y: 70 },
      projects: ['picc', 'goods'],
      description: 'Social innovation incubator and community design methodologies development.',
      population: 1300000,
      established: '2024',
      connections: ['perth', 'melbourne'],
      stories: 10,
      innovations: 6
    },
    {
      id: 'darwin',
      name: 'Darwin',
      state: 'NT',
      type: 'project-site',
      coordinates: { x: 50, y: 20 },
      projects: ['justice-hub'],
      description: 'Northern Territory youth justice system reform partnership.',
      population: 150000,
      established: '2024',
      connections: ['tiwi-islands'],
      stories: 7,
      innovations: 2
    }
  ];

  // Connection lines between communities
  const connections: ConnectionLine[] = [
    { from: 'yarrabah', to: 'melbourne', type: 'collaboration', strength: 'strong' },
    { from: 'tiwi-islands', to: 'melbourne', type: 'knowledge-sharing', strength: 'strong' },
    { from: 'alice-springs', to: 'melbourne', type: 'resource-flow', strength: 'strong' },
    { from: 'yarrabah', to: 'cairns', type: 'storytelling', strength: 'medium' },
    { from: 'tiwi-islands', to: 'darwin', type: 'collaboration', strength: 'medium' },
    { from: 'broome', to: 'perth', type: 'resource-flow', strength: 'medium' },
    { from: 'melbourne', to: 'sydney', type: 'knowledge-sharing', strength: 'strong' },
    { from: 'sydney', to: 'brisbane', type: 'collaboration', strength: 'medium' },
    { from: 'perth', to: 'adelaide', type: 'knowledge-sharing', strength: 'emerging' },
    { from: 'adelaide', to: 'melbourne', type: 'collaboration', strength: 'medium' },
    { from: 'alice-springs', to: 'yarrabah', type: 'storytelling', strength: 'emerging' }
  ];

  const getLocationColor = (type: string) => {
    switch (type) {
      case 'community': return '#10B981'; // Green
      case 'partner': return '#6366F1'; // Indigo  
      case 'project-site': return '#F59E0B'; // Amber
      case 'innovation-hub': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getConnectionColor = (type: string, strength: string) => {
    const baseColors = {
      'collaboration': '#10B981',
      'knowledge-sharing': '#3B82F6', 
      'resource-flow': '#F59E0B',
      'storytelling': '#8B5CF6'
    };
    
    const opacity = strength === 'strong' ? '1' : strength === 'medium' ? '0.7' : '0.4';
    return baseColors[type as keyof typeof baseColors] + opacity.replace('1', 'FF').replace('0.7', 'B3').replace('0.4', '66');
  };

  const filteredCommunities = filterType === 'all' 
    ? communities 
    : communities.filter(c => c.type === filterType || c.projects.includes(filterType));

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-green-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-white mb-6">
            Community <span className="text-green-400">Connection Network</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
            ACT's revolutionary platform connects communities across Australia, creating a living network 
            of innovation, storytelling, and collaborative change.
          </p>
        </motion.div>

        {/* Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {[
            { key: 'all', label: 'All Locations', icon: '🌏' },
            { key: 'community', label: 'Communities', icon: '🏘️' },
            { key: 'partner', label: 'Partners', icon: '🤝' },
            { key: 'innovation-hub', label: 'Innovation Hubs', icon: '💡' },
            { key: 'goods', label: 'Goods Project', icon: '🛏️' },
            { key: 'justice-hub', label: 'JusticeHub', icon: '⚖️' },
            { key: 'picc', label: 'PICC', icon: '🌱' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                filterType === filter.key
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Map Container */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Australia Map SVG */}
            <div className="flex-1">
              <div className="relative bg-slate-900 rounded-xl p-6 overflow-hidden">
                <svg
                  viewBox="0 0 100 80"
                  className="w-full h-auto max-h-96"
                  style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
                >
                  {/* Simplified Australia outline */}
                  <path
                    d="M15,25 Q20,20 30,22 L35,25 Q40,20 50,25 L55,20 Q65,18 75,22 L85,25 Q90,30 88,40 L90,50 Q88,55 85,58 L80,65 Q75,70 70,68 L60,70 Q50,72 40,70 L30,68 Q20,65 15,60 L12,50 Q10,40 12,35 Q14,30 15,25 Z"
                    fill="#1E293B"
                    stroke="#334155"
                    strokeWidth="0.5"
                  />

                  {/* Connection Lines */}
                  {showConnections && connections.map((connection, index) => {
                    const fromLocation = communities.find(c => c.id === connection.from);
                    const toLocation = communities.find(c => c.id === connection.to);
                    
                    if (!fromLocation || !toLocation) return null;
                    
                    const shouldShow = filteredCommunities.includes(fromLocation) && 
                                     filteredCommunities.includes(toLocation);
                    
                    if (!shouldShow) return null;

                    return (
                      <motion.line
                        key={`${connection.from}-${connection.to}`}
                        x1={fromLocation.coordinates.x}
                        y1={fromLocation.coordinates.y}
                        x2={toLocation.coordinates.x}
                        y2={toLocation.coordinates.y}
                        stroke={getConnectionColor(connection.type, connection.strength)}
                        strokeWidth={connection.strength === 'strong' ? '0.3' : connection.strength === 'medium' ? '0.2' : '0.1'}
                        strokeDasharray={connection.type === 'storytelling' ? '1,1' : 'none'}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, delay: index * 0.1 }}
                      />
                    );
                  })}

                  {/* Community Locations */}
                  {filteredCommunities.map((location, index) => (
                    <g key={location.id}>
                      {/* Location dot */}
                      <motion.circle
                        cx={location.coordinates.x}
                        cy={location.coordinates.y}
                        r={hoveredLocation === location.id ? '2' : '1.5'}
                        fill={getLocationColor(location.type)}
                        stroke="white"
                        strokeWidth="0.3"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredLocation(location.id)}
                        onMouseLeave={() => setHoveredLocation(null)}
                        onClick={() => setSelectedLocation(location)}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ scale: 1.3 }}
                      />
                      
                      {/* Pulse animation for active locations */}
                      {(hoveredLocation === location.id || selectedLocation?.id === location.id) && (
                        <motion.circle
                          cx={location.coordinates.x}
                          cy={location.coordinates.y}
                          r="3"
                          fill="none"
                          stroke={getLocationColor(location.type)}
                          strokeWidth="0.2"
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}

                      {/* Location label */}
                      <text
                        x={location.coordinates.x}
                        y={location.coordinates.y - 3}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ fontSize: '2px' }}
                      >
                        {location.name}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-white font-semibold mb-3">Location Types</h4>
                  <div className="space-y-2">
                    {[
                      { type: 'community', label: 'Communities', icon: '🏘️' },
                      { type: 'partner', label: 'Partners', icon: '🤝' },
                      { type: 'project-site', label: 'Project Sites', icon: '📍' },
                      { type: 'innovation-hub', label: 'Innovation Hubs', icon: '💡' }
                    ].map((item) => (
                      <div key={item.type} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getLocationColor(item.type) }}
                        />
                        <span className="text-slate-300 text-sm">{item.icon} {item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection Toggle */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowConnections(!showConnections)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      showConnections 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {showConnections ? '🔗 Hide Connections' : '🔗 Show Connections'}
                  </button>
                </div>
              </div>
            </div>

            {/* Location Details Panel */}
            <div className="lg:w-80">
              <AnimatePresence mode="wait">
                {selectedLocation ? (
                  <motion.div
                    key={selectedLocation.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-slate-700 rounded-xl p-6 h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{selectedLocation.name}</h3>
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Type and State */}
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getLocationColor(selectedLocation.type) }}
                        />
                        <span className="text-slate-300 capitalize">
                          {selectedLocation.type.replace('-', ' ')} • {selectedLocation.state}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-300 leading-relaxed">
                        {selectedLocation.description}
                      </p>

                      {/* Projects */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Active Projects</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedLocation.projects.map(project => (
                            <span 
                              key={project}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
                            >
                              {project === 'goods' ? '🛏️ Goods' : 
                               project === 'justice-hub' ? '⚖️ JusticeHub' : 
                               project === 'picc' ? '🌱 PICC' : project}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-green-400">{selectedLocation.stories}</div>
                          <div className="text-slate-400 text-sm">Stories</div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-400">{selectedLocation.innovations}</div>
                          <div className="text-slate-400 text-sm">Innovations</div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {selectedLocation.population && (
                        <div className="text-slate-300 text-sm">
                          <strong>Population:</strong> {selectedLocation.population.toLocaleString()}
                        </div>
                      )}
                      
                      {selectedLocation.established && (
                        <div className="text-slate-300 text-sm">
                          <strong>Partnership since:</strong> {selectedLocation.established}
                        </div>
                      )}

                      {/* Connections */}
                      <div>
                        <h4 className="text-white font-semibold mb-2">Connected To</h4>
                        <div className="space-y-1">
                          {selectedLocation.connections.map(connectionId => {
                            const connectedLocation = communities.find(c => c.id === connectionId);
                            return connectedLocation ? (
                              <button
                                key={connectionId}
                                onClick={() => setSelectedLocation(connectedLocation)}
                                className="block text-blue-400 hover:text-blue-300 text-sm"
                              >
                                → {connectedLocation.name}
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-slate-700 rounded-xl p-6 h-full flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">🗺️</div>
                      <p className="text-slate-300">
                        Click on any location to explore ACT's community connections
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Network Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-4 gap-6 mt-12"
        >
          {[
            { label: 'Communities', value: communities.filter(c => c.type === 'community').length, icon: '🏘️' },
            { label: 'Total Stories', value: communities.reduce((sum, c) => sum + c.stories, 0), icon: '📚' },
            { label: 'Innovations', value: communities.reduce((sum, c) => sum + c.innovations, 0), icon: '💡' },
            { label: 'Connections', value: connections.length, icon: '🔗' }
          ].map((stat, index) => (
            <div key={stat.label} className="bg-slate-800 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-green-400 mb-1">{stat.value}</div>
              <div className="text-slate-300">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}