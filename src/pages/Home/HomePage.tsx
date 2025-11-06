import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { ROUTES, PROJECT_AREAS } from '../../constants';

/**
 * Home page component
 * Landing page with quick access to main areas
 */
const HomePage = () => {
  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">ACT Placemat</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A unified platform for managing community projects, opportunities, and relationships
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card hoverable className="text-center p-6">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-12 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard</h3>
          <p className="text-gray-500 mb-4">Get a quick overview of all activity</p>
          <Link to={ROUTES.DASHBOARD}>
            <Button variant="primary" fullWidth>
              View Dashboard
            </Button>
          </Link>
        </Card>

        <Card hoverable className="text-center p-6">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-12 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Projects</h3>
          <p className="text-gray-500 mb-4">Manage and track community projects</p>
          <Link to={ROUTES.PROJECTS}>
            <Button variant="primary" fullWidth>
              View Projects
            </Button>
          </Link>
        </Card>

        <Card hoverable className="text-center p-6">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-12 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Opportunities</h3>
          <p className="text-gray-500 mb-4">Track funding and partnership opportunities</p>
          <Link to={ROUTES.OPPORTUNITIES}>
            <Button variant="primary" fullWidth>
              View Opportunities
            </Button>
          </Link>
        </Card>

        <Card hoverable className="text-center p-6">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-12 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Network</h3>
          <p className="text-gray-500 mb-4">Manage organizations and relationships</p>
          <Link to={ROUTES.NETWORK}>
            <Button variant="primary" fullWidth>
              View Network
            </Button>
          </Link>
        </Card>
      </div>

      {/* Project Areas */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Project Areas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {PROJECT_AREAS.map((area) => (
            <Card
              key={area.value}
              hoverable
              className="text-center p-6 border-t-4"
              style={{ borderTopColor: area.color }}
            >
              <div className="text-2xl mb-2">{area.icon}</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{area.label}</h3>
              <Link to={`${ROUTES.PROJECTS}?area=${encodeURIComponent(area.value)}`}>
                <Button variant="outline" fullWidth>
                  View Projects
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div className="bg-gray-50 rounded-lg p-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About ACT Placemat</h2>
          <p className="text-gray-600 mb-6">
            ACT Placemat is a unified platform for A Curious Tractor (ACT) to manage community projects, 
            funding opportunities, and relationships. It provides transparency into all ACT projects and 
            initiatives across five main areas, with a focus on community ownership and data sovereignty.
          </p>
          <p className="text-gray-600">
            40% of profits flow back to communities, supporting cooperative and community-owned models 
            while respecting Indigenous and traditional knowledge systems.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;