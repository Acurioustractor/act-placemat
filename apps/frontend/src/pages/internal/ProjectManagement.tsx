export default function ProjectManagement() {
  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>Project Management</h1>
        <p className="text-muted">Manage projects, tasks, and resource allocation</p>
      </div>

      <div className="internal-toolbar">
        <div className="internal-toolbar__group">
          <button className="internal-btn internal-btn--primary">New Project</button>
          <button className="internal-btn internal-btn--outline">Import Projects</button>
        </div>
        <div className="internal-toolbar__group">
          <input type="search" className="internal-input" placeholder="Search projects..." />
          <select className="internal-select">
            <option>All Status</option>
            <option>Active</option>
            <option>Planning</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
        </div>
      </div>

      <div className="internal-projects-view">
        <div className="internal-projects-sidebar">
          <div className="internal-filter-group">
            <h4>Project Status</h4>
            <label className="internal-checkbox">
              <input type="checkbox" defaultChecked />
              Active (18)
            </label>
            <label className="internal-checkbox">
              <input type="checkbox" defaultChecked />
              Planning (6)
            </label>
            <label className="internal-checkbox">
              <input type="checkbox" />
              On Hold (3)
            </label>
            <label className="internal-checkbox">
              <input type="checkbox" />
              Completed (45)
            </label>
          </div>

          <div className="internal-filter-group">
            <h4>Location</h4>
            <label className="internal-checkbox">
              <input type="checkbox" defaultChecked />
              Queensland (12)
            </label>
            <label className="internal-checkbox">
              <input type="checkbox" defaultChecked />
              New South Wales (8)
            </label>
            <label className="internal-checkbox">
              <input type="checkbox" />
              Victoria (4)
            </label>
          </div>
        </div>

        <div className="internal-projects-grid">
          <div className="internal-project-card">
            <div className="internal-project-card__header">
              <h3>Community Gardens Initiative</h3>
              <span className="internal-badge internal-badge--success">Active</span>
            </div>
            <div className="internal-project-card__meta">
              <span>📍 Brisbane, QLD</span>
              <span>👥 12 members</span>
              <span>📅 Started Mar 2024</span>
            </div>
            <div className="internal-project-card__progress">
              <div className="internal-progress-bar">
                <div className="internal-progress-fill" style={{ width: '75%' }}></div>
              </div>
              <span>75% complete</span>
            </div>
            <div className="internal-project-card__actions">
              <button className="internal-btn internal-btn--sm">View Details</button>
              <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
            </div>
          </div>

          <div className="internal-project-card">
            <div className="internal-project-card__header">
              <h3>Youth Leadership Program</h3>
              <span className="internal-badge internal-badge--warning">Planning</span>
            </div>
            <div className="internal-project-card__meta">
              <span>📍 Sydney, NSW</span>
              <span>👥 8 members</span>
              <span>📅 Starting Jun 2024</span>
            </div>
            <div className="internal-project-card__progress">
              <div className="internal-progress-bar">
                <div className="internal-progress-fill" style={{ width: '25%' }}></div>
              </div>
              <span>25% complete</span>
            </div>
            <div className="internal-project-card__actions">
              <button className="internal-btn internal-btn--sm">View Details</button>
              <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
            </div>
          </div>

          <div className="internal-project-card">
            <div className="internal-project-card__header">
              <h3>Digital Literacy Workshops</h3>
              <span className="internal-badge internal-badge--success">Active</span>
            </div>
            <div className="internal-project-card__meta">
              <span>📍 Melbourne, VIC</span>
              <span>👥 15 members</span>
              <span>📅 Started Feb 2024</span>
            </div>
            <div className="internal-project-card__progress">
              <div className="internal-progress-bar">
                <div className="internal-progress-fill" style={{ width: '60%' }}></div>
              </div>
              <span>60% complete</span>
            </div>
            <div className="internal-project-card__actions">
              <button className="internal-btn internal-btn--sm">View Details</button>
              <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}