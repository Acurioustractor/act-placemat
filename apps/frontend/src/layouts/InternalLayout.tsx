import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface InternalLayoutProps {
  children: React.ReactNode
}

const internalNavigation = [
  { path: '/internal/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/internal/projects', label: 'Projects', icon: '🚀' },
  { path: '/internal/analytics', label: 'Analytics', icon: '📈' },
  { path: '/internal/intelligence', label: 'Intelligence', icon: '🧠' },
  { path: '/internal/users', label: 'Users', icon: '👥' },
  { path: '/internal/settings', label: 'Settings', icon: '⚙️' },
]

export default function InternalLayout({ children }: InternalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="internal-layout">
      {/* Internal Sidebar - Functional, efficient */}
      <aside className={`internal-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="internal-sidebar__header">
          <div className="internal-logo">
            <div className="internal-logo__icon">⚡</div>
            {!sidebarCollapsed && (
              <div className="internal-logo__text">
                <div className="internal-logo__title">ACT Admin</div>
                <div className="internal-logo__version">v2.0</div>
              </div>
            )}
          </div>
          
          <button 
            className="internal-sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        <nav className="internal-nav">
          <div className="internal-nav__items">
            {internalNavigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`internal-nav__item ${location.pathname === item.path ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="internal-nav__icon">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="internal-nav__label">{item.label}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>
        
        <div className="internal-sidebar__footer">
          <Link to="/public" className="internal-btn internal-btn--ghost">
            {sidebarCollapsed ? '🌐' : '🌐 Public Site'}
          </Link>
        </div>
      </aside>

      {/* Internal Main Content */}
      <div className="internal-content">
        {/* Internal Header - Compact, functional */}
        <header className="internal-header">
          <div className="internal-header__title">
            <h1 className="internal-page-title">
              {internalNavigation.find(item => item.path === location.pathname)?.label || 'ACT Admin'}
            </h1>
          </div>
          
          <div className="internal-header__actions">
            <button className="internal-btn internal-btn--outline">
              Notifications
            </button>
            <div className="internal-user-menu">
              <div className="internal-avatar">👤</div>
              <span className="internal-username">Admin User</span>
            </div>
          </div>
        </header>

        {/* Internal Page Content */}
        <main className="internal-main">
          {children}
        </main>
      </div>
    </div>
  )
}