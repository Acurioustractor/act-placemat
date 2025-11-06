import { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useApiHealth } from '../../hooks';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main application layout component
 * Provides consistent layout with header, sidebar, and footer
 */
const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // const location = useLocation();
  const { data: healthData, isLoading: healthLoading } = useApiHealth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={toggleSidebar}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto pb-20">
          {/* API warning banner */}
          {!healthLoading && healthData && (
            (healthData.notion_token === 'missing' || healthData.notion_database === 'missing') && (
              <div className="m-4 p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-700 rounded-r-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p>
                    <span className="font-bold">Notion API Configuration Issue: </span>
                    {healthData.notion_token === 'missing' && 'API token is missing. '}
                    {healthData.notion_database === 'missing' && 'Database ID is missing. '}
                    Using mock data for now.
                  </p>
                </div>
              </div>
            )
          )}

          {/* Page content */}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;