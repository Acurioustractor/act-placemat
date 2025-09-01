export default function DataAnalytics() {
  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>Data Analytics</h1>
        <p className="text-muted">Comprehensive data analysis and reporting tools</p>
      </div>

      <div className="internal-toolbar">
        <div className="internal-toolbar__group">
          <button className="internal-btn internal-btn--primary">Create Report</button>
          <button className="internal-btn internal-btn--outline">Schedule Export</button>
          <button className="internal-btn internal-btn--outline">Data Sources</button>
        </div>
        <div className="internal-toolbar__group">
          <select className="internal-select">
            <option>Custom Range</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="internal-analytics-layout">
        <div className="internal-analytics-main">
          <div className="internal-card">
            <div className="internal-card__header">
              <h3>Engagement Metrics</h3>
              <select className="internal-select internal-select--sm">
                <option>Weekly View</option>
                <option>Monthly View</option>
                <option>Quarterly View</option>
              </select>
            </div>
            <div className="internal-card__content">
              <div className="internal-chart-large">
                <div className="internal-chart-area">
                  <svg viewBox="0 0 400 200" className="internal-chart-svg">
                    <path d="M 0 150 Q 100 120 200 100 T 400 80" 
                          stroke="var(--color-primary)" 
                          strokeWidth="3" 
                          fill="none" />
                    <path d="M 0 180 Q 100 160 200 140 T 400 120" 
                          stroke="var(--color-success)" 
                          strokeWidth="3" 
                          fill="none" />
                  </svg>
                </div>
                <div className="internal-chart-legend">
                  <div className="internal-legend-item">
                    <span className="internal-legend-color internal-legend-color--primary"></span>
                    Page Views
                  </div>
                  <div className="internal-legend-item">
                    <span className="internal-legend-color internal-legend-color--success"></span>
                    Active Users
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="internal-analytics-grid">
            <div className="internal-card">
              <div className="internal-card__header">
                <h4>Top Performing Content</h4>
              </div>
              <div className="internal-card__content">
                <div className="internal-ranking-list">
                  <div className="internal-ranking-item">
                    <span className="internal-ranking-number">1</span>
                    <div className="internal-ranking-details">
                      <div className="internal-ranking-title">Community Success Stories</div>
                      <div className="internal-ranking-metric">2,450 views</div>
                    </div>
                  </div>
                  <div className="internal-ranking-item">
                    <span className="internal-ranking-number">2</span>
                    <div className="internal-ranking-details">
                      <div className="internal-ranking-title">Project Gallery</div>
                      <div className="internal-ranking-metric">1,890 views</div>
                    </div>
                  </div>
                  <div className="internal-ranking-item">
                    <span className="internal-ranking-number">3</span>
                    <div className="internal-ranking-details">
                      <div className="internal-ranking-title">Get Involved Page</div>
                      <div className="internal-ranking-metric">1,567 views</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="internal-card">
              <div className="internal-card__header">
                <h4>Geographic Distribution</h4>
              </div>
              <div className="internal-card__content">
                <div className="internal-geo-stats">
                  <div className="internal-geo-item">
                    <div className="internal-geo-location">Queensland</div>
                    <div className="internal-geo-bar">
                      <div className="internal-geo-fill" style={{ width: '45%' }}></div>
                    </div>
                    <div className="internal-geo-percentage">45%</div>
                  </div>
                  <div className="internal-geo-item">
                    <div className="internal-geo-location">NSW</div>
                    <div className="internal-geo-bar">
                      <div className="internal-geo-fill" style={{ width: '32%' }}></div>
                    </div>
                    <div className="internal-geo-percentage">32%</div>
                  </div>
                  <div className="internal-geo-item">
                    <div className="internal-geo-location">Victoria</div>
                    <div className="internal-geo-bar">
                      <div className="internal-geo-fill" style={{ width: '18%' }}></div>
                    </div>
                    <div className="internal-geo-percentage">18%</div>
                  </div>
                  <div className="internal-geo-item">
                    <div className="internal-geo-location">Other</div>
                    <div className="internal-geo-bar">
                      <div className="internal-geo-fill" style={{ width: '5%' }}></div>
                    </div>
                    <div className="internal-geo-percentage">5%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="internal-analytics-sidebar">
          <div className="internal-card">
            <div className="internal-card__header">
              <h4>Quick Stats</h4>
            </div>
            <div className="internal-card__content">
              <div className="internal-quick-stats">
                <div className="internal-quick-stat">
                  <div className="internal-quick-stat__number">12.4K</div>
                  <div className="internal-quick-stat__label">Total Visits</div>
                  <div className="internal-quick-stat__change internal-quick-stat__change--positive">+8.2%</div>
                </div>
                <div className="internal-quick-stat">
                  <div className="internal-quick-stat__number">3.2K</div>
                  <div className="internal-quick-stat__label">Unique Users</div>
                  <div className="internal-quick-stat__change internal-quick-stat__change--positive">+12.5%</div>
                </div>
                <div className="internal-quick-stat">
                  <div className="internal-quick-stat__number">4.8</div>
                  <div className="internal-quick-stat__label">Avg. Session</div>
                  <div className="internal-quick-stat__change internal-quick-stat__change--negative">-2.1%</div>
                </div>
                <div className="internal-quick-stat">
                  <div className="internal-quick-stat__number">68%</div>
                  <div className="internal-quick-stat__label">Bounce Rate</div>
                  <div className="internal-quick-stat__change internal-quick-stat__change--negative">-5.3%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}