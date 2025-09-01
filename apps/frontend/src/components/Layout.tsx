import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { path: '/platform', label: 'Platform Overview', icon: '🌟' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/intelligence', label: 'Intelligence', icon: '🧠' },
  { path: '/projects', label: 'Projects', icon: '🚀' },
  { path: '/network', label: 'Network', icon: '🤝' },
  { path: '/financial', label: 'Financial', icon: '💰' },
]

export default function Layout({ children }: LayoutProps) {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="app-layout">
      {/* Navigation Sidebar */}
      <nav className={`nav ${navOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <div className="inline">
            <span style={{ fontSize: '2rem' }}>🚜</span>
            <div>
              <div className="heading-4" style={{ margin: 0 }}>ACT Platform</div>
              <div className="text-caption">Clean & Elegant</div>
            </div>
          </div>
        </div>
        
        <div className="nav-items">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
        
        <div className="nav-footer" style={{ 
          padding: 'var(--space-4)', 
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(0, 0, 0, 0.02)' 
        }}>
          <div className="text-caption" style={{ textAlign: 'center', color: 'var(--champagne)' }}>
            🌱 Where story meets system
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Menu Toggle */}
      <button
        className="btn btn-ghost"
        style={{
          position: 'fixed',
          top: 'var(--space-4)',
          left: 'var(--space-4)',
          zIndex: 1001,
          display: 'none'
        }}
        onClick={() => setNavOpen(!navOpen)}
      >
        ☰
      </button>

      {/* Mobile Overlay */}
      {navOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'none'
          }}
          onClick={() => setNavOpen(false)}
        />
      )}
    </div>
  )
}