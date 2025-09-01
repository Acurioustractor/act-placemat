/**
 * 🌟 Network Visualization Component
 * Revolutionary visualization of community collaboration networks
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Network, Users, Building, MapPin, Zap } from 'lucide-react';
import { ProjectCardData } from './ProjectCard';

interface NetworkVisualizationProps {
  projects: ProjectCardData[];
  onProjectClick: (project: ProjectCardData) => void;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  projects,
  onProjectClick
}) => {
  // Calculate network data
  const networkData = useMemo(() => {
    const collaboratorMap = new Map<string, {
      name: string;
      type: string;
      projects: ProjectCardData[];
      connections: number;
    }>();

    // Build collaborator network
    projects.forEach(project => {
      project.collaborators.forEach(collaborator => {
        if (!collaboratorMap.has(collaborator.name)) {
          collaboratorMap.set(collaborator.name, {
            name: collaborator.name,
            type: collaborator.type,
            projects: [],
            connections: 0
          });
        }
        const collab = collaboratorMap.get(collaborator.name)!;
        collab.projects.push(project);
        collab.connections++;
      });
    });

    return {
      totalProjects: projects.length,
      totalCollaborators: collaboratorMap.size,
      topCollaborators: Array.from(collaboratorMap.values())
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 12),
      networkDensity: (collaboratorMap.size / projects.length).toFixed(2)
    };
  }, [projects]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'community': return Users;
      case 'organization': return Building;
      case 'government': return MapPin;
      case 'business': return Zap;
      default: return Users;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'community': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'organization': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'government': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'business': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Network Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-lg"
      >
        <div className="flex items-center mb-6">
          <Network className="w-8 h-8 text-emerald-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Collaboration Network</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-1">{networkData.totalProjects}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{networkData.totalCollaborators}</div>
            <div className="text-sm text-gray-600">Collaborators</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{networkData.networkDensity}</div>
            <div className="text-sm text-gray-600">Network Density</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {Math.round(networkData.totalCollaborators / networkData.totalProjects * 10) / 10}
            </div>
            <div className="text-sm text-gray-600">Avg Collaborators</div>
          </div>
        </div>

        <p className="text-gray-600 text-center">
          This network visualization shows the interconnected web of communities, organizations, 
          and partners working together to create systemic change.
        </p>
      </motion.div>

      {/* Top Collaborators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-8 shadow-lg"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Most Connected Collaborators</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {networkData.topCollaborators.map((collaborator, index) => {
            const IconComponent = getTypeIcon(collaborator.type);
            const colorClasses = getTypeColor(collaborator.type);
            
            return (
              <motion.div
                key={collaborator.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 ${colorClasses} hover:shadow-md transition-all cursor-pointer`}
              >
                <div className="flex items-center mb-3">
                  <IconComponent className="w-5 h-5 mr-2" />
                  <span className="font-semibold text-sm">{collaborator.name}</span>
                </div>
                
                <div className="text-xs opacity-75 mb-2 capitalize">{collaborator.type}</div>
                
                <div className="flex items-center justify-between text-xs">
                  <span>{collaborator.connections} connections</span>
                  <div className="flex -space-x-1">
                    {collaborator.projects.slice(0, 3).map((project, idx) => (
                      <div
                        key={project.id}
                        className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center font-bold text-xs"
                        title={project.communityStory.communityName}
                      >
                        {project.communityStory.communityName.charAt(0)}
                      </div>
                    ))}
                    {collaborator.projects.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-xs font-bold">
                        +{collaborator.projects.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Project Network Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-8 shadow-lg"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6">Project Connection Map</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onProjectClick(project)}
              className="p-6 border-2 border-gray-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group"
            >
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {project.communityStory.communityName}
                </h4>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  {project.collaborators.length} collaborators
                </div>
                <div className="flex flex-wrap gap-1">
                  {project.collaborators.slice(0, 4).map((collab, idx) => {
                    const colorClass = getTypeColor(collab.type).split(' ')[0];
                    return (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs ${colorClass} opacity-75`}
                      >
                        {collab.name.split(' ')[0]}
                      </span>
                    );
                  })}
                  {project.collaborators.length > 4 && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                      +{project.collaborators.length - 4}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Community Control: {project.powerDynamics.communityControl}%
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default NetworkVisualization;