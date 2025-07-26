import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface ModernHeaderProps {
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
}

const ModernHeader = ({ onSidebarToggle, sidebarOpen }: ModernHeaderProps) => {
  const location = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setNotificationsOpen(false);
      setProfileOpen(false);
    };

    if (notificationsOpen || profileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [notificationsOpen, profileOpen]);

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/opportunities')) return 'Opportunities';
    if (path.startsWith('/network')) return 'Network';
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.startsWith('/artifacts')) return 'Artifacts';
    return 'ACT Placemat';
  };

  const getPageDescription = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview of your social impact projects';
    if (path.startsWith('/projects')) return 'Manage and explore ACT projects';
    if (path.startsWith('/opportunities')) return 'Track funding opportunities';
    if (path.startsWith('/network')) return 'Connect with partners and stakeholders';
    if (path.startsWith('/analytics')) return 'Data insights and performance metrics';
    if (path.startsWith('/artifacts')) return 'Documents and resources';
    return 'Social impact management platform';
  };

  const mockNotifications = [
    {
      id: 1,
      title: 'New funding opportunity',
      message: 'Queensland Youth Justice Grant - $500K available',
      time: '2 minutes ago',
      type: 'opportunity',
      unread: true
    },
    {
      id: 2,
      title: 'Project milestone reached',
      message: 'Economic Freedom Initiative hit 75% completion',
      time: '1 hour ago',
      type: 'success',
      unread: true
    },
    {
      id: 3,
      title: 'Follow-up required',
      message: 'Meeting with Brisbane Council scheduled',
      time: '3 hours ago',
      type: 'reminder',
      unread: false
    }
  ];

  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className={`h-5 w-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>

          {/* Page title and breadcrumb */}
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
            <p className="text-sm text-gray-500 -mt-1">{getPageDescription()}</p>
          </div>
        </div>

        {/* Center - Global Search */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <div
              className={`relative flex items-center transition-all duration-300 ${
                searchFocused
                  ? 'bg-white shadow-lg ring-2 ring-primary-500 ring-opacity-20'
                  : 'bg-gray-50 hover:bg-gray-100'
              } rounded-xl`}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className={`h-4 w-4 transition-colors duration-300 ${
                    searchFocused ? 'text-primary-500' : 'text-gray-400'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              <input
                ref={searchRef}
                type="text"
                placeholder="Search projects, opportunities, people..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="block w-full pl-10 pr-4 py-3 border-0 bg-transparent text-sm placeholder-gray-500 focus:outline-none focus:ring-0"
              />

              {/* Search shortcut */}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs font-mono text-gray-500 bg-gray-100">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Search suggestions dropdown */}
            {searchFocused && searchValue && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 fade-in">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                    Quick Results
                  </div>
                  <div className="space-y-1">
                    <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-green-600 text-xs">📋</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Youth Justice Project</div>
                        <div className="text-xs text-gray-500">Active project</div>
                      </div>
                    </button>
                    <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-blue-600 text-xs">👥</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Sarah Johnson</div>
                        <div className="text-xs text-gray-500">Policy Director</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Quick create button */}
          <Button
            variant="primary"
            size="sm"
            className="hidden sm:flex btn-modern bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a4 4 0 118 0v5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              
              {unreadCount > 0 && (
                <Badge
                  variant="danger"
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0 min-w-0"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Mark all read
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                        notification.unread ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.unread ? 'bg-primary-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm">{notification.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                          <div className="text-xs text-gray-400 mt-2">{notification.time}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="p-3 border-t border-gray-100">
                  <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User profile */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-semibold">AU</span>
              </div>
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-blue-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-semibold">AE</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">ACT User</div>
                      <div className="text-sm text-gray-600">admin@actplacemat.org</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-2">
                  <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Support
                  </button>
                  
                  <div className="my-2 border-t border-gray-100" />
                  
                  <button className="w-full flex items-center px-3 py-2 text-sm text-left rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                    <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;