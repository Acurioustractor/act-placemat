/**
 * 📋 Project Profile Page - Full Detail View
 * Complete project showcase with network visualization and activity
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ExternalLink, MapPin, Users, DollarSign, Target, 
  Building, Zap, Award, TrendingUp, Calendar, Globe, 
  Share2, BookOpen, MessageCircle, Activity
} from 'lucide-react';
import { apiClient, type Project, type Place } from '../services/apiClient';

const ProjectProfilePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        
        // For now, we'll search by name since we don't have ID-based lookup
        // In production, this would be optimized with proper ID lookup
        const projects = await apiClient.getProjects();
        const foundProject = projects.find(p => 
          p.id === projectId || 
          p.name === projectId || 
          p.title === projectId
        );

        if (foundProject) {
          setProject(foundProject);
          
          // Fetch places data for this project
          try {
            const projectPlaces = await apiClient.getProjectPlaces(foundProject);
            setPlaces(projectPlaces);
          } catch (placesError) {
            console.warn('Failed to fetch places for project:', foundProject.name, placesError);
          }
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project profile...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">
            {error || 'Project not found'}
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const connectionCounts = apiClient.calculateConnectionCounts(project);
  const displayLocation = places.length > 0 
    ? (places[0].indigenousName && places[0].westernName 
        ? `${places[0].indigenousName} / ${places[0].westernName}`
        : places[0].displayName || places[0].name)
    : project.location || 'Community Location';

  const formatCurrency = (amount: number | undefined) => {
    if (!amount || amount === 0) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const getStatusStyle = (status: string) => {
    if (status?.includes('Active')) return 'bg-green-100 text-green-800 border-green-200';
    if (status?.includes('Planning')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status?.includes('Ideation')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to projects</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => window.open(`https://www.notion.so/acurioustractor/${project.id}`, '_blank')}
                className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Edit in Notion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Hero Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {project.title || project.name}
                  </h1>
                  <div className={`
                    inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border
                    ${getStatusStyle(project.status)}
                  `}>
                    {project.status}
                  </div>
                </div>
              </div>

              {/* Project Lead */}
              {project.projectLead && (
                <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  {project.projectLead.avatarUrl ? (
                    <img 
                      src={project.projectLead.avatarUrl} 
                      alt={project.projectLead.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {project.projectLead.name}
                    </div>
                    <div className="text-sm text-gray-600">Project Lead</div>
                  </div>
                </div>
              )}

              {/* Description */}
              {(project.aiSummary || project.description) && (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    {project.aiSummary || project.description}
                  </p>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium text-gray-900">{displayLocation}</div>
                    </div>
                  </div>
                  
                  {project.coreValues && (
                    <div className="flex items-center space-x-3">
                      <Target className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Core Values</div>
                        <div className="font-medium text-gray-900">{project.coreValues}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Secured Funding</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(project.actualIncoming)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Potential Funding</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(project.potentialIncoming)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Connections */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Network Connections</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{connectionCounts.actions}</div>
                  <div className="text-sm text-gray-600">Actions</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{connectionCounts.opportunities}</div>
                  <div className="text-sm text-gray-600">Opportunities</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Building className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{connectionCounts.organizations}</div>
                  <div className="text-sm text-gray-600">Organizations</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{connectionCounts.resources}</div>
                  <div className="text-sm text-gray-600">Resources</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">Total Network Reach</span>
                  <span className="text-2xl font-bold text-blue-600">{connectionCounts.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Tags & Themes */}
            {(project.themes?.length || project.tags?.length) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
                
                {project.themes?.length && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-2">Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {project.themes.map((theme, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {project.tags?.length && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">Contact Project Lead</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">View Documentation</span>
                </button>
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Activity className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">View Activity Feed</span>
                </button>
              </div>
            </div>

            {/* Project Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Network Reach</span>
                  <span className="font-medium text-gray-900">{connectionCounts.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Status</span>
                  <span className="font-medium text-green-600">
                    {project.status?.includes('Active') ? 'Active' : 'Planning'}
                  </span>
                </div>
                {project.themes?.length && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Focus Areas</span>
                    <span className="font-medium text-gray-900">{project.themes.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectProfilePage;