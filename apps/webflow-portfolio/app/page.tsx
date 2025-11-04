import { ProjectGrid } from '../components/ProjectGrid';

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Our Project Portfolio
          </h1>
          <p className="text-lg text-gray-600">
            Building community strength and sovereignty
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectGrid />
      </div>
    </div>
  );
}
