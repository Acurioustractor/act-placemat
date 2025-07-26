import { useState, useEffect, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ModernSidebar from './ModernSidebar';
import ModernHeader from './ModernHeader';
import ToastContainer from '../ui/ToastContainer';
import ConnectionStatus from '../ui/ConnectionStatus';

interface ModernAppLayoutProps {
  children?: ReactNode;
}

const ModernAppLayout = ({ children }: ModernAppLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false); // Auto-close on desktop
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input in header
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Command/Ctrl + B for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, isMobile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Sidebar */}
      <ModernSidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Main content area */}
      <div className="transition-all duration-300 ease-out md:ml-72">
        {/* Header */}
        <ModernHeader 
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Main content */}
        <main className="flex-1 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-100/30 to-blue-100/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-100/20 to-pink-100/20 rounded-full blur-3xl"></div>
          </div>

          {/* Content container */}
          <div className="relative z-10 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Page content */}
              <div className="fade-in">
                {children || <Outlet />}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Global components */}
      <ToastContainer />
      <ConnectionStatus />

      {/* Loading overlay for page transitions */}
      <div id="page-loading" className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center hidden">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>

    </div>
  );
};

export default ModernAppLayout;