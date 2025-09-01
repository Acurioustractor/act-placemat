/**
 * Project Collaboration Component
 * Task: 3.3 - Add Project Collaboration Features
 * Enables community members to collaborate on projects
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import socketService from '../services/socketService'

interface Project {
  id: string
  name: string
  status: string
  description?: string
  collaborators?: string[]
  needsHelp?: string[]
  skills?: string[]
}

interface CollaborationRequest {
  id: string
  projectId: string
  projectName: string
  requesterName: string
  message: string
  skills: string[]
  timestamp: string
  status: 'pending' | 'accepted' | 'declined'
}

export default function ProjectCollaboration() {
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([])
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [joinMessage, setJoinMessage] = useState('')
  const [userSkills, setUserSkills] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch active projects and collaboration requests
  useEffect(() => {
    fetchActiveProjects()
    fetchCollaborationRequests()
    
    // Listen for real-time collaboration updates
    const handleCollaborationUpdate = (data: any) => {
      console.log('🤝 Collaboration update:', data)
      if (data.activity?.type === 'collaboration') {
        // Add to collaboration requests or update existing
        setCollaborationRequests(prev => [data.activity, ...prev.slice(0, 9)])
      }
    }

    socketService.on('collaboration_added', handleCollaborationUpdate)
    
    return () => {
      socketService.off('collaboration_added', handleCollaborationUpdate)
    }
  }, [])

  const fetchActiveProjects = async () => {
    try {
      // Using existing projects API but filtering for collaboration opportunities
      const response = await fetch('http://localhost:4000/api/dashboard/real-projects?limit=20')
      if (response.ok) {
        const data = await response.json()
        // Filter for projects that need collaboration or are actively seeking members
        const collaborativeProjects = data.projects?.map((project: any) => ({
          id: project.id || `proj_${Date.now()}_${Math.random()}`,
          name: project.name || 'Untitled Project',
          status: project.status || 'Active',
          description: project.description || 'Community impact project',
          collaborators: project.collaborators || [],
          needsHelp: ['Design', 'Development', 'Community Outreach'], // Mock skills needed
          skills: ['React', 'Node.js', 'Community Engagement'] // Mock skills offered
        })) || []
        
        setActiveProjects(collaborativeProjects.slice(0, 8))
      }
    } catch (error) {
      console.warn('Failed to fetch projects, using mock data:', error)
      setActiveProjects(generateMockProjects())
    }
  }

  const fetchCollaborationRequests = () => {
    // Mock collaboration requests - in production this would be from the API
    setCollaborationRequests(generateMockCollaborationRequests())
  }

  const handleJoinProject = async (project: Project) => {
    setSelectedProject(project)
    setShowJoinModal(true)
  }

  const submitCollaborationRequest = async () => {
    if (!selectedProject || !joinMessage.trim()) return
    
    setLoading(true)
    try {
      // Use the collaboration endpoint from community API
      await socketService.postProjectUpdate({
        projectId: selectedProject.id,
        title: `New Collaboration Request for ${selectedProject.name}`,
        description: `Community member wants to join: ${joinMessage}`,
        milestone: 'collaboration_request'
      })

      // Also send collaboration announcement
      const response = await fetch('http://localhost:4000/api/community/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds: [selectedProject.id],
          title: `New Collaboration Request`,
          description: `Someone wants to join ${selectedProject.name} with skills: ${userSkills}. Message: ${joinMessage}`,
          collaborators: [selectedProject.name]
        })
      })

      if (response.ok) {
        setShowJoinModal(false)
        setJoinMessage('')
        setUserSkills('')
        console.log('✅ Collaboration request submitted successfully')
      }
    } catch (error) {
      console.error('❌ Failed to submit collaboration request:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="card"
      style={{ marginBottom: 'var(--space-8)' }}
    >
      <div className="split" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>
            🤝 Project Collaboration Hub
          </h2>
          <p className="text-body" style={{ color: 'var(--dove)' }}>
            Connect with projects that need your skills or find collaborators for your initiatives
          </p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 'var(--text-small)' }}>
          Start New Project
        </button>
      </div>

      {/* Active Projects Seeking Collaboration */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
          🚀 Projects Seeking Collaborators
        </h3>
        <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
          {activeProjects.slice(0, 4).map((project, index) => (
            <motion.div
              key={project.id}
              className="project-collaboration-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              style={{
                padding: 'var(--space-4)',
                background: 'var(--pearl)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                cursor: 'pointer'
              }}
            >
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <h4 className="heading-5" style={{ marginBottom: 'var(--space-1)' }}>
                  {project.name}
                </h4>
                <p className="text-small" style={{ color: 'var(--dove)', marginBottom: 'var(--space-2)' }}>
                  Status: {project.status} • {project.collaborators?.length || 0} collaborators
                </p>
                <p className="text-body" style={{ fontSize: 'var(--text-small)', lineHeight: 1.4 }}>
                  {project.description}
                </p>
              </div>

              {project.needsHelp && project.needsHelp.length > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="text-small" style={{ color: 'var(--champagne)', marginBottom: 'var(--space-1)' }}>
                    Looking for:
                  </div>
                  <div className="inline" style={{ gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                    {project.needsHelp.map(skill => (
                      <span
                        key={skill}
                        style={{
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'var(--ivory)',
                          borderRadius: 'var(--radius)',
                          fontSize: 'var(--text-small)',
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="split">
                <div className="text-small" style={{ color: 'var(--dove)' }}>
                  Last updated: 2 hours ago
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 'var(--text-small)', padding: 'var(--space-1) var(--space-3)' }}
                  onClick={() => handleJoinProject(project)}
                >
                  Join Project
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Collaboration Activity */}
      <div>
        <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
          📋 Recent Collaboration Activity
        </h3>
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          {collaborationRequests.slice(0, 3).map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              style={{
                padding: 'var(--space-3)',
                background: 'var(--ivory)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="split" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <div className="text-body" style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                    {request.requesterName} wants to join {request.projectName}
                  </div>
                  <div className="text-small" style={{ color: 'var(--dove)', marginBottom: 'var(--space-2)' }}>
                    {request.message}
                  </div>
                  <div className="inline" style={{ gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                    {request.skills.map(skill => (
                      <span
                        key={skill}
                        style={{
                          padding: '2px var(--space-1)',
                          background: 'var(--champagne)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-small" style={{ color: 'var(--dove)' }}>
                  {formatTime(request.timestamp)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Join Project Modal */}
      {showJoinModal && selectedProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'white',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius)',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
              Join {selectedProject.name}
            </h3>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="text-small" style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
                Your Skills (comma-separated)
              </label>
              <input
                type="text"
                value={userSkills}
                onChange={(e) => setUserSkills(e.target.value)}
                placeholder="e.g. React, Design, Marketing, Project Management"
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-base)'
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="text-small" style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
                Why do you want to join this project?
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Tell the team why you're interested and how you can contribute..."
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-base)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="inline" style={{ gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowJoinModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitCollaborationRequest}
                disabled={loading || !joinMessage.trim()}
              >
                {loading ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Helper functions
function formatTime(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInMs = now.getTime() - time.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  return `${Math.floor(diffInHours / 24)}d ago`
}

function generateMockProjects(): Project[] {
  return [
    {
      id: 'proj-1',
      name: 'Empathy Ledger Mobile App',
      status: 'Active Development',
      description: 'Building a mobile companion app for mental health support networks',
      collaborators: ['Sarah', 'Marcus'],
      needsHelp: ['React Native', 'UI/UX Design', 'Mental Health Expertise'],
      skills: ['Community Engagement', 'Healthcare']
    },
    {
      id: 'proj-2',
      name: 'Justice Hub Community Portal',
      status: 'Beta Testing',
      description: 'Creating a community portal for legal advocacy and support',
      collaborators: ['Lisa', 'Ahmed', 'Jennifer'],
      needsHelp: ['Legal Research', 'Community Outreach', 'Translation'],
      skills: ['Legal Advocacy', 'Community Support']
    },
    {
      id: 'proj-3',
      name: 'PICC Digital Inclusion Initiative',
      status: 'Planning',
      description: 'Expanding digital inclusion programs across rural communities',
      collaborators: ['Ben'],
      needsHelp: ['Rural Expertise', 'Digital Literacy Training', 'Grant Writing'],
      skills: ['Digital Strategy', 'Rural Development']
    },
    {
      id: 'proj-4',
      name: 'Community Storytelling Platform',
      status: 'Active',
      description: 'Platform for sharing and preserving community stories and wisdom',
      collaborators: ['Community Team'],
      needsHelp: ['Content Curation', 'Video Editing', 'Indigenous Perspectives'],
      skills: ['Storytelling', 'Cultural Preservation']
    }
  ]
}

function generateMockCollaborationRequests(): CollaborationRequest[] {
  return [
    {
      id: 'req-1',
      projectId: 'proj-1',
      projectName: 'Empathy Ledger Mobile App',
      requesterName: 'Alex Chen',
      message: 'I\'m a React Native developer with experience in mental health apps. I\'d love to contribute to this important project.',
      skills: ['React Native', 'Mental Health Apps', 'Accessibility'],
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'pending'
    },
    {
      id: 'req-2',
      projectId: 'proj-2',
      projectName: 'Justice Hub Community Portal',
      requesterName: 'Maria Rodriguez',
      message: 'As a community legal worker, I can help with research and outreach for this portal.',
      skills: ['Legal Research', 'Community Engagement', 'Spanish Translation'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: 'pending'
    },
    {
      id: 'req-3',
      projectId: 'proj-3',
      projectName: 'PICC Digital Inclusion Initiative',
      requesterName: 'James Wilson',
      message: 'I work with rural communities and have experience with digital literacy programs. Happy to help.',
      skills: ['Rural Development', 'Digital Literacy', 'Grant Writing'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      status: 'pending'
    }
  ]
}