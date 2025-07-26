import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ROUTES, PROJECT_AREAS } from '../../constants';

interface ModernSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ModernSidebar = ({ isOpen, onToggle }: ModernSidebarProps) => {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (path: string) => location.pathname === path;
  const isPartiallyActive = (path: string) => 
    location.pathname.startsWith(path) && path !== '/';

  const navigationItems = [
    {
      path: ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-blue-600',
      count: null
    },
    {
      path: ROUTES.PROJECTS,
      label: 'Projects',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      gradient: 'from-green-500 to-green-600',
      count: '24'
    },
    {
      path: ROUTES.OPPORTUNITIES,
      label: 'Opportunities',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: 'from-orange-500 to-orange-600',
      count: '12'
    },
    {
      path: ROUTES.NETWORK,
      label: 'Network',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-purple-600',
      count: '156'
    },
    {
      path: ROUTES.ANALYTICS,
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-indigo-600',
      count: null
    },
    {
      path: ROUTES.ARTIFACTS,
      label: 'Artifacts',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-pink-500 to-pink-600',
      count: '89'
    }
  ];

  const quickActions = [
    {
      path: `${ROUTES.OPPORTUNITIES}?stage=Applied`,
      label: 'Active Applications',
      icon: '📋',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      count: '5'
    },
    {
      path: `${ROUTES.NETWORK}?needsFollowUp=true`,
      label: 'Follow-up Needed',
      icon: '⏰',
      color: 'text-red-500',
      bg: 'bg-red-50',
      count: '3'
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 transform transition-all duration-300 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200/50 bg-gradient-to-r from-primary-50 to-blue-50">
          <Link to={ROUTES.HOME} className="flex items-center group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <span className="text-xl font-bold text-gradient-primary">ACT Placemat</span>
              <div className="text-xs text-gray-500 -mt-1">Social Impact Hub</div>
            </div>
          </Link>
          
          <button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
            onClick={onToggle}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const active = isActive(item.path) || isPartiallyActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 shadow-md scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:scale-102'
                  }`}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600 rounded-r-full" />
                  )}
                  
                  {/* Icon with gradient background */}
                  <div className={`relative mr-3 p-2 rounded-lg transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-br ${item.gradient} text-white shadow-lg`
                      : hoveredItem === item.path
                        ? `bg-gradient-to-br ${item.gradient} text-white shadow-md scale-110`
                        : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }`}>
                    {item.icon}
                    
                    {/* Hover glow effect */}
                    {hoveredItem === item.path && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-lg opacity-20 blur-xl scale-150`} />
                    )}
                  </div>
                  
                  <span className="flex-1">{item.label}</span>
                  
                  {/* Count badge */}
                  {item.count && (
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
                      active
                        ? 'bg-primary-200 text-primary-800'
                        : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                  
                  {/* Hover arrow */}
                  <svg 
                    className={`ml-2 w-4 h-4 transition-all duration-300 ${
                      hoveredItem === item.path ? 'translate-x-1 opacity-100' : 'opacity-0'
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
            
            {/* Divider */}
            <div className="my-6 border-t border-gray-200"></div>
            
            {/* Project Themes */}
            <div className="mb-6">
              <div className="px-4 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                  <span className="mr-2">🎨</span>
                  Project Themes
                </h3>
              </div>
              <div className="space-y-1">
                {PROJECT_AREAS.slice(0, 5).map((area) => (
                  <Link
                    key={area.value}
                    to={`${ROUTES.PROJECTS}?area=${encodeURIComponent(area.value)}`}
                    className="group flex items-center px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 transition-all duration-200"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-110"
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="truncate">{area.label}</span>
                    <span className="ml-auto text-xs text-gray-400 group-hover:text-gray-500">
                      {area.icon}
                    </span>
                  </Link>
                ))}
                
                <Link
                  to={ROUTES.PROJECTS}
                  className="flex items-center px-4 py-2 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <span className="mr-2">→</span>
                  View all themes
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <div className="px-4 mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                  <span className="mr-2">⚡</span>
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-1">
                {quickActions.map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    className={`group flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 hover:scale-102 ${action.bg} ${action.color} hover:shadow-md`}
                  >
                    <span className="text-base mr-3">{action.icon}</span>
                    <span className="flex-1 truncate">{action.label}</span>
                    <span className="ml-2 px-2 py-1 text-xs font-semibold bg-white rounded-full shadow-sm">
                      {action.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="px-4 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                External Links
              </h3>
            </div>
            <div className="space-y-1">
              <a
                href="#"
                className="group flex items-center px-4 py-2 text-sm rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="mr-3 p-1.5 rounded-md bg-blue-500 text-white">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z"/>
                  </svg>
                </div>
                <span>LinkedIn</span>
                <svg className="ml-auto w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a
                href="#"
                className="group flex items-center px-4 py-2 text-sm rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="mr-3 p-1.5 rounded-md bg-gray-600 text-white">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <span>Our Website</span>
                <svg className="ml-auto w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernSidebar;