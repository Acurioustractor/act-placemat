import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>ACT Platform</h1>
          <div className="nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/analytics">Projects</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </div>
      
      <div className="container">
        {children}
      </div>
    </div>
  )
}

function Dashboard() {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  
  React.useEffect(() => {
    console.log('🚀 Starting API call to:', 'http://localhost:4000/api/dashboard/overview')
    fetch('http://localhost:4000/api/dashboard/overview', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
      .then(res => {
        console.log('📡 Response received:', res.status, res.statusText)
        console.log('📡 Response headers:', [...res.headers.entries()])
        return res.json()
      })
      .then(data => {
        console.log('✅ Dashboard API Response:', data)
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('❌ API Error:', err)
        console.error('❌ Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
        setLoading(false)
      })
  }, [])
  
  if (loading) {
    return (
      <Layout>
        <h2>Dashboard</h2>
        <div className="card">
          <p>Loading real data from backend...</p>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <h2>Dashboard</h2>
      <p>Real data from your backend API and Notion integration.</p>
      
      <div className="grid">
        <div className="card">
          <h3>Projects</h3>
          <p>{data?.metrics?.totalProjects || 0} total projects</p>
          <p>{data?.metrics?.activeProjects || 0} active</p>
          <button>View All Projects</button>
        </div>
        <div className="card">
          <h3>People</h3>
          <p>{data?.metrics?.totalPeople || 0} people in system</p>
          <p>{data?.metrics?.activePeople || 0} active people</p>
          <button>View All People</button>
        </div>
        <div className="card">
          <h3>Opportunities</h3>
          <p>{data?.metrics?.totalOpportunities || 0} total opportunities</p>
          <p>{data?.metrics?.highValueOpportunities || 0} high value</p>
          <button>View Opportunities</button>
        </div>
        <div className="card">
          <h3>Organizations</h3>
          <p>{data?.metrics?.partnerOrganizations || 0} partner orgs</p>
          <p>{data?.metrics?.recentActivities || 0} recent activities</p>
          <button>View Organizations</button>
        </div>
      </div>
      
      {data?.topProjects && data.topProjects.length > 0 && (
        <div className="card">
          <h3>Top Projects</h3>
          <div className="grid">
            {data.topProjects.slice(0, 4).map((project) => (
              <div key={project.id} className="card">
                <h4>{project.name}</h4>
                <p><strong>Area:</strong> {project.area}</p>
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Budget:</strong> ${project.budget?.toLocaleString() || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="card">
        <h3>System Status</h3>
        <p>Backend API: {data ? '✅ Connected' : '❌ Disconnected'}</p>
        <p>Notion API: {data?.metrics ? '✅ Connected' : '❌ Disconnected'}</p>
        <p>Total projects synced: {data?.metrics?.totalProjects || 0}</p>
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <p>Recent: {data.recentActivity[0].name} ({data.recentActivity[0].status})</p>
        )}
        <p style={{fontSize: '12px', marginTop: '10px'}}>
          Debug: Data received = {data ? 'Yes' : 'No'} | 
          Metrics = {data?.metrics ? 'Yes' : 'No'}
        </p>
      </div>
    </Layout>
  )
}

function Analytics() {
  const [projects, setProjects] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  
  React.useEffect(() => {
    fetch('http://localhost:4000/api/dashboard/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Projects API Error:', err)
        setLoading(false)
      })
  }, [])
  
  if (loading) {
    return (
      <Layout>
        <h2>Projects</h2>
        <div className="card">
          <p>Loading projects from Notion...</p>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <h2>Projects ({projects.length})</h2>
      <p>Real projects from your Notion database with full details.</p>
      
      <div className="grid">
        {projects.map((project, index) => (
          <div key={project.id || index} className="card">
            <h3>{project.name || project.title || `Project ${index + 1}`}</h3>
            
            <p><strong>Status:</strong> {project.status || 'Unknown'}</p>
            
            {project.projectLead && (
              <p><strong>Lead:</strong> {project.projectLead.name || project.lead}</p>
            )}
            
            {project.area && (
              <p><strong>Area:</strong> {project.area}</p>
            )}
            
            {project.budget > 0 && (
              <p><strong>Budget:</strong> ${project.budget.toLocaleString()}</p>
            )}
            
            {project.themes && project.themes.length > 0 ? (
              <p><strong>Themes:</strong> {project.themes.slice(0, 2).join(', ')}</p>
            ) : project.tags && project.tags.length > 0 ? (
              <p><strong>Tags:</strong> {project.tags.slice(0, 2).join(', ')}</p>
            ) : null}
            
            {project.partnerCount > 0 && (
              <p><strong>Partners:</strong> {project.partnerCount}</p>
            )}
            
            {project.description && (
              <p style={{marginTop: '15px', fontSize: '14px', lineHeight: '1.4'}}>
                {project.description.substring(0, 150)}...
              </p>
            )}
            
            <Link to={`/project/${project.id}`}>
              <button style={{marginTop: '15px'}}>View Full Details</button>
            </Link>
          </div>
        ))}
      </div>
      
      {projects.length === 0 && (
        <div className="card">
          <p>No projects found.</p>
        </div>
      )}
    </Layout>
  )
}

function About() {
  return (
    <Layout>
      <h2>About</h2>
      <div className="card">
        <h3>About ACT Platform</h3>
        <p>Simple about page with clean styling.</p>
      </div>
    </Layout>
  )
}

function Contact() {
  return (
    <Layout>
      <h2>Contact</h2>
      <div className="card">
        <h3>Get in Touch</h3>
        <p>Fill out the form below and we'll get back to you.</p>
        
        <div className="form">
          <input type="text" placeholder="Your name" />
          <input type="email" placeholder="Your email" />
          <textarea placeholder="Your message" rows={5}></textarea>
          <button type="submit">Send Message</button>
        </div>
      </div>
    </Layout>
  )
}

function ProjectDetail() {
  const [project, setProject] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const { projectId } = useParams()
  
  React.useEffect(() => {
    fetch('http://localhost:4000/api/dashboard/projects')
      .then(res => res.json())
      .then(data => {
        const foundProject = data.find(p => p.id === projectId)
        setProject(foundProject)
        setLoading(false)
      })
      .catch(err => {
        console.error('Project Detail API Error:', err)
        setLoading(false)
      })
  }, [projectId])
  
  if (loading) {
    return (
      <Layout>
        <h2>Loading Project...</h2>
        <div className="card">
          <p>Loading project details from Notion...</p>
        </div>
      </Layout>
    )
  }
  
  if (!project) {
    return (
      <Layout>
        <h2>Project Not Found</h2>
        <div className="card">
          <p>The requested project could not be found.</p>
          <Link to="/analytics"><button>Back to Projects</button></Link>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <Link to="/analytics" style={{marginBottom: '20px', display: 'inline-block'}}>← Back to Projects</Link>
      
      <h2>{project.name || project.title}</h2>
      
      <div className="grid">
        <div className="card">
          <h3>Project Overview</h3>
          <p><strong>Status:</strong> {project.status}</p>
          <p><strong>Area:</strong> {project.area}</p>
          {project.location && <p><strong>Location:</strong> {project.location}</p>}
          {project.coreValues && <p><strong>Core Values:</strong> {project.coreValues}</p>}
          
          {project.projectLead && (
            <div style={{marginTop: '20px'}}>
              <h4>Project Lead</h4>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {project.projectLead.avatarUrl && (
                  <img 
                    src={project.projectLead.avatarUrl} 
                    alt={project.projectLead.name}
                    style={{width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover'}}
                  />
                )}
                <p><strong>{project.projectLead.name}</strong></p>
              </div>
            </div>
          )}
        </div>
        
        <div className="card">
          <h3>Financial Information</h3>
          <p><strong>Budget:</strong> ${project.budget?.toLocaleString() || '0'}</p>
          <p><strong>Total Funding:</strong> ${project.totalFunding?.toLocaleString() || '0'}</p>
          <p><strong>Actual Revenue:</strong> ${project.revenueActual?.toLocaleString() || '0'}</p>
          <p><strong>Potential Revenue:</strong> ${project.revenuePotential?.toLocaleString() || '0'}</p>
          <p><strong>Actual Incoming:</strong> ${project.actualIncoming?.toLocaleString() || '0'}</p>
          <p><strong>Potential Incoming:</strong> ${project.potentialIncoming?.toLocaleString() || '0'}</p>
        </div>
      </div>
      
      <div className="card">
        <h3>Project Description</h3>
        {project.aiSummary && (
          <div style={{marginBottom: '20px'}}>
            <h4>AI Summary</h4>
            <p style={{fontStyle: 'italic', lineHeight: '1.6'}}>{project.aiSummary}</p>
          </div>
        )}
        {project.description && (
          <div>
            <h4>Full Description</h4>
            <p style={{lineHeight: '1.6'}}>{project.description}</p>
          </div>
        )}
      </div>
      
      {project.themes && project.themes.length > 0 && (
        <div className="card">
          <h3>Themes & Tags</h3>
          <p><strong>Themes:</strong> {project.themes.join(', ')}</p>
          {project.tags && project.tags.length > 0 && (
            <p><strong>Tags:</strong> {project.tags.join(', ')}</p>
          )}
        </div>
      )}
      
      <div className="card">
        <h3>Community & Partnerships</h3>
        <p><strong>Partner Count:</strong> {project.partnerCount || 0}</p>
        <p><strong>Supporters:</strong> {project.supporters || 0}</p>
        {project.nextMilestoneDate && (
          <p><strong>Next Milestone:</strong> {new Date(project.nextMilestoneDate).toLocaleDateString()}</p>
        )}
      </div>
      
      {(project.relatedFields?.length > 0 || project.relatedActions?.length > 0 || project.relatedResources?.length > 0) && (
        <div className="card">
          <h3>Related Items</h3>
          {project.relatedFields?.length > 0 && (
            <p><strong>Related Fields:</strong> {project.relatedFields.length} items</p>
          )}
          {project.relatedActions?.length > 0 && (
            <p><strong>Related Actions:</strong> {project.relatedActions.length} items</p>
          )}
          {project.relatedResources?.length > 0 && (
            <p><strong>Related Resources:</strong> {project.relatedResources.length} items</p>
          )}
          {project.relatedOpportunities?.length > 0 && (
            <p><strong>Related Opportunities:</strong> {project.relatedOpportunities.length} items</p>
          )}
        </div>
      )}
    </Layout>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/project/:projectId" element={<ProjectDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  )
}

export default App