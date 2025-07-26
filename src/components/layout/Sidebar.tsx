import { Link, useLocation } from 'react-router-dom';
import { ROUTES, PROJECT_AREAS } from '../../constants';
import { COMMUNITY_COLORS } from '../../constants/designSystem';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Modern Community-focused sidebar component
 * Elegant navigation with sophisticated styling and community branding
 */
const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isPartiallyActive = (path: string) => {
    return location.pathname.startsWith(path) && path !== '/';
  };

  // Modern navigation link component
  const NavigationLink = ({ 
    to, 
    children, 
    icon, 
    isActive: active, 
    isPartialActive = false 
  }: {
    to: string;
    children: React.ReactNode;
    icon: React.ReactNode;
    isActive: boolean;
    isPartialActive?: boolean;
  }) => {
    const linkActive = active || isPartialActive;
    
    return (
      <Link
        to={to}
        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mx-2 ${
          linkActive
            ? 'text-white shadow-lg transform scale-105'
            : 'text-gray-700 hover:text-gray-900'
        }`}
        style={{
          background: linkActive 
            ? `linear-gradient(135deg, ${COMMUNITY_COLORS.primary[600]}, ${COMMUNITY_COLORS.primary[700]})` 
            : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!linkActive) {
            e.currentTarget.style.backgroundColor = COMMUNITY_COLORS.primary[100];
          }
        }}
        onMouseLeave={(e) => {
          if (!linkActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <div className={`mr-3 h-5 w-5 ${linkActive ? 'text-white' : 'text-gray-500'}`}>
          {icon}
        </div>
        {children}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: `linear-gradient(180deg, ${COMMUNITY_COLORS.primary[50]} 0%, ${COMMUNITY_COLORS.neutral[50]} 100%)`,
          borderRight: `1px solid ${COMMUNITY_COLORS.primary[200]}`
        }}
      >
        {/* Sidebar header */}
        <div 
          className="h-16 flex items-center justify-between px-6"
          style={{ borderBottom: `1px solid ${COMMUNITY_COLORS.primary[200]}` }}
        >
          <Link to={ROUTES.HOME} className="flex items-center group">
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-sm transition-all duration-200 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${COMMUNITY_COLORS.primary[600]}, ${COMMUNITY_COLORS.primary[700]})`
                }}
              >
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">ACT Placemat</span>
                <div className="text-xs text-gray-500">Community Impact Hub</div>
              </div>
            </div>
          </Link>
          <button
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onToggle}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          {/* Main navigation */}
          <nav className="flex-1 px-2 py-6 space-y-2">
            <NavigationLink
              to={ROUTES.DASHBOARD}
              isActive={isActive(ROUTES.DASHBOARD)}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
                </svg>
              }
            >
              Dashboard
            </NavigationLink>

            <NavigationLink
              to={ROUTES.PROJECTS}
              isActive={false}
              isPartialActive={isPartiallyActive(ROUTES.PROJECTS)}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            >
              Projects
            </NavigationLink>

            <Link
              to={ROUTES.OPPORTUNITIES}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isPartiallyActive(ROUTES.OPPORTUNITIES)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 h-5 w-5 ${
                  isPartiallyActive(ROUTES.OPPORTUNITIES) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Opportunities
            </Link>

            <Link
              to={ROUTES.NETWORK}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isPartiallyActive(ROUTES.NETWORK)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 h-5 w-5 ${
                  isPartiallyActive(ROUTES.NETWORK) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Network
            </Link>

            <Link
              to={ROUTES.ANALYTICS}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isPartiallyActive(ROUTES.ANALYTICS)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 h-5 w-5 ${
                  isPartiallyActive(ROUTES.ANALYTICS) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </Link>

            <Link
              to={ROUTES.ARTIFACTS}
              className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isPartiallyActive(ROUTES.ARTIFACTS)
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <svg
                className={`mr-3 h-5 w-5 ${
                  isPartiallyActive(ROUTES.ARTIFACTS) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Artifacts
            </Link>

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Project Areas */}
            <div className="mb-6">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Project Themes
                </h3>
              </div>
              <div className="space-y-1">
                {PROJECT_AREAS.map((area) => (
                  <Link
                    key={area.value}
                    to={`${ROUTES.PROJECTS}?area=${encodeURIComponent(area.value)}`}
                    className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: area.color }}
                    ></span>
                    <span className="truncate">{area.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-1">
                <Link
                  to={`${ROUTES.OPPORTUNITIES}?stage=Proposal`}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <svg
                    className="mr-3 h-4 w-4 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Active Proposals
                </Link>
                <Link
                  to={`${ROUTES.NETWORK}?needsFollowUp=true`}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <svg
                    className="mr-3 h-4 w-4 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Follow-up Needed
                </Link>
              </div>
            </div>
          </nav>

          {/* External Links Section - Placeholder for future */}
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                External Links
              </h3>
            </div>
            <div className="space-y-1">
              {/* Placeholder links - ready for future implementation */}
              <a
                href="#"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="mr-3 h-4 w-4 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
              <a
                href="#"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg
                  className="mr-3 h-4 w-4 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Our Website
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;