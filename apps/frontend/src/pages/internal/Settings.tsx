export default function Settings() {
  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>System Settings</h1>
        <p className="text-muted">Configure system preferences and administrative options</p>
      </div>

      <div className="internal-settings-layout">
        <div className="internal-settings-nav">
          <div className="internal-settings-nav__group">
            <h4>General</h4>
            <a href="#" className="internal-settings-nav__item internal-settings-nav__item--active">
              System Preferences
            </a>
            <a href="#" className="internal-settings-nav__item">
              Notifications
            </a>
            <a href="#" className="internal-settings-nav__item">
              Email Templates
            </a>
          </div>
          <div className="internal-settings-nav__group">
            <h4>Security</h4>
            <a href="#" className="internal-settings-nav__item">
              Access Control
            </a>
            <a href="#" className="internal-settings-nav__item">
              API Keys
            </a>
            <a href="#" className="internal-settings-nav__item">
              Audit Logs
            </a>
          </div>
          <div className="internal-settings-nav__group">
            <h4>Integration</h4>
            <a href="#" className="internal-settings-nav__item">
              External Services
            </a>
            <a href="#" className="internal-settings-nav__item">
              Data Sources
            </a>
            <a href="#" className="internal-settings-nav__item">
              Webhooks
            </a>
          </div>
        </div>

        <div className="internal-settings-content">
          <div className="internal-card">
            <div className="internal-card__header">
              <h3>System Preferences</h3>
            </div>
            <div className="internal-card__content">
              <div className="internal-form-group">
                <label className="internal-label">Organisation Name</label>
                <input type="text" className="internal-input" value="ACT Platform" />
              </div>
              
              <div className="internal-form-group">
                <label className="internal-label">Default Timezone</label>
                <select className="internal-select">
                  <option>Australia/Brisbane (UTC+10)</option>
                  <option>Australia/Sydney (UTC+11)</option>
                  <option>Australia/Melbourne (UTC+11)</option>
                  <option>Australia/Perth (UTC+8)</option>
                </select>
              </div>

              <div className="internal-form-group">
                <label className="internal-label">Date Format</label>
                <select className="internal-select">
                  <option>DD/MM/YYYY (31/12/2024)</option>
                  <option>MM/DD/YYYY (12/31/2024)</option>
                  <option>YYYY-MM-DD (2024-12-31)</option>
                </select>
              </div>

              <div className="internal-form-group">
                <label className="internal-checkbox">
                  <input type="checkbox" defaultChecked />
                  Enable automatic backups
                </label>
                <p className="internal-help-text">
                  System will automatically backup data every 24 hours
                </p>
              </div>

              <div className="internal-form-group">
                <label className="internal-checkbox">
                  <input type="checkbox" defaultChecked />
                  Send weekly performance reports
                </label>
                <p className="internal-help-text">
                  Email summary reports to administrators every Monday
                </p>
              </div>

              <div className="internal-form-group">
                <label className="internal-checkbox">
                  <input type="checkbox" />
                  Enable maintenance mode
                </label>
                <p className="internal-help-text">
                  Temporarily disable public access for system maintenance
                </p>
              </div>
            </div>
          </div>

          <div className="internal-card">
            <div className="internal-card__header">
              <h3>System Status</h3>
            </div>
            <div className="internal-card__content">
              <div className="internal-system-status">
                <div className="internal-status-row">
                  <div className="internal-status-label">Database Connection</div>
                  <div className="internal-status-value">
                    <span className="internal-status internal-status--active">Connected</span>
                  </div>
                </div>
                <div className="internal-status-row">
                  <div className="internal-status-label">Cache Service</div>
                  <div className="internal-status-value">
                    <span className="internal-status internal-status--warning">Degraded</span>
                  </div>
                </div>
                <div className="internal-status-row">
                  <div className="internal-status-label">Email Service</div>
                  <div className="internal-status-value">
                    <span className="internal-status internal-status--active">Operational</span>
                  </div>
                </div>
                <div className="internal-status-row">
                  <div className="internal-status-label">File Storage</div>
                  <div className="internal-status-value">
                    <span className="internal-status internal-status--active">85% Available</span>
                  </div>
                </div>
                <div className="internal-status-row">
                  <div className="internal-status-label">Last Backup</div>
                  <div className="internal-status-value">
                    <span className="internal-status internal-status--active">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="internal-card">
            <div className="internal-card__header">
              <h3>System Information</h3>
            </div>
            <div className="internal-card__content">
              <div className="internal-system-info">
                <div className="internal-info-row">
                  <div className="internal-info-label">Platform Version</div>
                  <div className="internal-info-value">v2.1.4</div>
                </div>
                <div className="internal-info-row">
                  <div className="internal-info-label">Database Version</div>
                  <div className="internal-info-value">PostgreSQL 15.3</div>
                </div>
                <div className="internal-info-row">
                  <div className="internal-info-label">Server Uptime</div>
                  <div className="internal-info-value">14 days, 6 hours</div>
                </div>
                <div className="internal-info-row">
                  <div className="internal-info-label">Active Sessions</div>
                  <div className="internal-info-value">127 users</div>
                </div>
              </div>
            </div>
          </div>

          <div className="internal-form-actions">
            <button className="internal-btn internal-btn--primary">Save Changes</button>
            <button className="internal-btn internal-btn--outline">Reset to Defaults</button>
          </div>
        </div>
      </div>
    </div>
  )
}