import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface PublicLayoutProps {
  children: React.ReactNode
}

const publicNavigation = [
  { path: '/public/overview', label: 'Overview', icon: '🏠' },
  { path: '/public/community', label: 'Community', icon: '🤝' },
  { path: '/public/projects', label: 'Projects', icon: '🚀' },
  { path: '/public/about', label: 'About Us', icon: '💫' },
  { path: '/public/contact', label: 'Contact', icon: '📧' },
]

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="public-layout">
      {/* Public Header - Elegant, editorial style */}
      <header className="public-header">
        <div className="public-header__container">
          <Link to="/public" className="public-logo">
            <div className="public-logo__icon">🌱</div>
            <div className="public-logo__text">
              <div className="public-logo__title">ACT Platform</div>
              <div className="public-logo__tagline">Community Impact</div>
            </div>
          </Link>
          
          <nav className="public-nav">
            <div className="public-nav__items">
              {publicNavigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`public-nav__item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="public-nav__icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          
          <div className="public-header__actions">
            <Link to="/internal" className="public-btn public-btn--outline">
              Admin
            </Link>
          </div>
          
          <button 
            className="public-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="public-mobile-menu">
          <div className="public-mobile-menu__content">
            {publicNavigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`public-mobile-menu__item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="public-mobile-menu__icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Public Main Content */}
      <main className="public-main">
        {children}
      </main>

      {/* Public Footer - Elegant, minimal */}
      <footer className="public-footer">
        <div className="public-footer__container">
          <div className="public-footer__content">
            <div className="public-footer__brand">
              <div className="public-logo__icon">🌱</div>
              <p className="public-footer__tagline">
                Empowering communities through collaborative action
              </p>
            </div>
            
            <div className="public-footer__links">
              <Link to="/public/about" className="public-footer__link">About</Link>
              <Link to="/public/contact" className="public-footer__link">Contact</Link>
              <a href="/privacy" className="public-footer__link">Privacy</a>
              <a href="/terms" className="public-footer__link">Terms</a>
            </div>
          </div>
          
          <div className="public-footer__bottom">
            <p className="public-footer__copyright">
              © {new Date().getFullYear()} ACT Platform. Built with community in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}