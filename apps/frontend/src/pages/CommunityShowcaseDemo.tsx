/**
 * 🌟 Community Projects Page
 * Displays real Notion projects using ACT's existing CSS system
 * Connected to actual data via unified data lake service
 */

import React from 'react';
import CommunityShowcase from '../components/CommunityShowcase/CommunityShowcase';
import { ProjectData } from '../components/CommunityShowcase/ProjectCard';

const CommunityShowcaseDemo: React.FC = () => {
  const handleProjectClick = (project: ProjectData) => {
    // In a real app, this would navigate to the detailed project page
    console.log('🚀 Clicked project:', project.title);
    
    // For now, show basic project info
    alert(`🌟 ${project.title}\n\n${project.description}\n\nLocation: ${project.location}\nStatus: ${project.status}\nCommunity Control: ${project.community_control_percentage || 0}%`);
  };

  return (
    <CommunityShowcase onProjectClick={handleProjectClick} />
  );
};

export default CommunityShowcaseDemo;