import { useState, useEffect } from 'react'

interface DashboardData {
  metrics: {
    totalProjects: number
    activeProjects: number
    totalOpportunities: number
    highValueOpportunities: number
    partnerOrganizations: number
    totalPeople: number
    activePeople: number
    recentActivities: number
  }
  recentActivity: Array<{
    id: string
    name: string
    type: string
    description: string
    date: string
    status: string
  }>
  topProjects: Array<{
    id: string
    name: string
    area: string
    status: string
    budget: number
  }>
}

export default function InternalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:4000/api/dashboard/overview')
      .then(res => res.json())
      .then(dashboardData => {
        setData(dashboardData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="internal-page">Loading real data...</div>
  if (error) return <div className="internal-page">Error: {error}</div>
  if (!data) return <div className="internal-page">No data available</div>

  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>Dashboard Overview</h1>
        <p className="text-muted">Real system metrics from Notion and Supabase</p>
      </div>

      <div className="internal-grid">
        <div className="internal-card">
          <div className="internal-card__header">
            <h3>Active Projects</h3>
            <span className="internal-badge internal-badge--primary">{data.metrics.totalProjects}</span>
          </div>
          <div className="internal-card__content">
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.activeProjects}</div>
              <div className="internal-metric__label">Active Now</div>
            </div>
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.totalProjects - data.metrics.activeProjects}</div>
              <div className="internal-metric__label">Other Status</div>
            </div>
          </div>
        </div>

        <div className="internal-card">
          <div className="internal-card__header">
            <h3>Community & Partners</h3>
            <span className="internal-badge internal-badge--success">{data.metrics.partnerOrganizations} orgs</span>
          </div>
          <div className="internal-card__content">
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.totalPeople}</div>
              <div className="internal-metric__label">Total People</div>
            </div>
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.activePeople}</div>
              <div className="internal-metric__label">Active</div>
            </div>
          </div>
        </div>

        <div className="internal-card">
          <div className="internal-card__header">
            <h3>Opportunities</h3>
            <span className="internal-badge internal-badge--success">{data.metrics.totalOpportunities} total</span>
          </div>
          <div className="internal-card__content">
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.highValueOpportunities}</div>
              <div className="internal-metric__label">High Value</div>
            </div>
            <div className="internal-metric">
              <div className="internal-metric__number">{data.metrics.recentActivities}</div>
              <div className="internal-metric__label">Recent Updates</div>
            </div>
          </div>
        </div>
      </div>

      <div className="internal-section">
        <h2>Recent Activity</h2>
        <div className="internal-table-container">
          <table className="internal-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.map(activity => (
                <tr key={activity.id}>
                  <td>{activity.name}</td>
                  <td>{activity.type}</td>
                  <td>{new Date(activity.date).toLocaleString()}</td>
                  <td><span className="internal-badge internal-badge--success">{activity.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="internal-section">
        <h2>Top Projects</h2>
        <div className="internal-projects-grid">
          {data.topProjects.slice(0, 6).map(project => (
            <div key={project.id} className="internal-project-card">
              <div className="internal-project-card__header">
                <h4>{project.name}</h4>
                <span className="internal-badge internal-badge--outline">{project.status}</span>
              </div>
              <div className="internal-project-card__content">
                <p><strong>Area:</strong> {project.area}</p>
                <p><strong>Budget:</strong> ${project.budget?.toLocaleString() || '0'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}