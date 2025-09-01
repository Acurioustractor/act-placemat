export default function Intelligence() {
  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>Intelligence & Analytics</h1>
        <p className="text-muted">Data insights and predictive analytics</p>
      </div>

      <div className="internal-toolbar">
        <div className="internal-toolbar__group">
          <button className="internal-btn internal-btn--primary">Generate Report</button>
          <button className="internal-btn internal-btn--outline">Export Data</button>
        </div>
        <div className="internal-toolbar__group">
          <select className="internal-select">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Last year</option>
          </select>
        </div>
      </div>

      <div className="internal-grid internal-grid--intelligence">
        <div className="internal-card internal-card--chart">
          <div className="internal-card__header">
            <h3>Project Success Rates</h3>
          </div>
          <div className="internal-card__content">
            <div className="internal-chart-placeholder">
              <div className="internal-chart-bar" style={{ height: '60%' }}>Jan</div>
              <div className="internal-chart-bar" style={{ height: '75%' }}>Feb</div>
              <div className="internal-chart-bar" style={{ height: '80%' }}>Mar</div>
              <div className="internal-chart-bar" style={{ height: '85%' }}>Apr</div>
              <div className="internal-chart-bar" style={{ height: '90%' }}>May</div>
            </div>
          </div>
        </div>

        <div className="internal-card">
          <div className="internal-card__header">
            <h3>Key Insights</h3>
          </div>
          <div className="internal-card__content">
            <ul className="internal-insights-list">
              <li className="internal-insight">
                <span className="internal-insight__icon">📈</span>
                Community engagement up 23% this quarter
              </li>
              <li className="internal-insight">
                <span className="internal-insight__icon">🎯</span>
                Project completion rate: 87.5%
              </li>
              <li className="internal-insight">
                <span className="internal-insight__icon">🔍</span>
                Most active region: Queensland
              </li>
              <li className="internal-insight">
                <span className="internal-insight__icon">💡</span>
                Opportunity: Rural engagement initiatives
              </li>
            </ul>
          </div>
        </div>

        <div className="internal-card internal-card--full">
          <div className="internal-card__header">
            <h3>Predictive Analytics</h3>
            <span className="internal-badge internal-badge--warning">Beta</span>
          </div>
          <div className="internal-card__content">
            <div className="internal-predictions">
              <div className="internal-prediction">
                <div className="internal-prediction__label">Project Success Likelihood</div>
                <div className="internal-prediction__value">82%</div>
                <div className="internal-prediction__bar">
                  <div className="internal-prediction__fill" style={{ width: '82%' }}></div>
                </div>
              </div>
              <div className="internal-prediction">
                <div className="internal-prediction__label">Resource Optimization Potential</div>
                <div className="internal-prediction__value">67%</div>
                <div className="internal-prediction__bar">
                  <div className="internal-prediction__fill" style={{ width: '67%' }}></div>
                </div>
              </div>
              <div className="internal-prediction">
                <div className="internal-prediction__label">Community Growth Forecast</div>
                <div className="internal-prediction__value">94%</div>
                <div className="internal-prediction__bar">
                  <div className="internal-prediction__fill" style={{ width: '94%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}