import { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CloudIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { smartDataService } from '../../services/smartDataService';

interface DataStatusProps {
  type?: 'projects' | 'opportunities' | 'organizations' | 'people';
  showDetails?: boolean;
}

/**
 * Component that shows the current data status and configuration
 */
const DataStatus = ({ showDetails = false }: DataStatusProps) => {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [cacheStats, setCacheStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Get database configuration status
    const dbStatus = smartDataService.getDatabaseStatus();
    const stats = smartDataService.getCacheStats();
    
    setStatus(dbStatus);
    setCacheStats(stats);
  }, []);

  if (!showDetails && !status) return null;

  // Count configured databases
  const configuredCount = status ? Object.values(status).filter(Boolean).length : 0;
  const totalDatabases = 5;

  // Determine overall status
  let statusIcon;
  let statusColor;
  let statusMessage;

  if (configuredCount === totalDatabases) {
    statusIcon = CheckCircleIcon;
    statusColor = 'text-green-600';
    statusMessage = 'All databases configured';
  } else if (configuredCount > 0) {
    statusIcon = ExclamationTriangleIcon;
    statusColor = 'text-amber-600';
    statusMessage = `${configuredCount}/${totalDatabases} databases configured`;
  } else {
    statusIcon = ExclamationTriangleIcon;
    statusColor = 'text-red-600';
    statusMessage = 'No databases configured';
  }

  const StatusIcon = statusIcon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Main Status */}
      <div className="flex items-center gap-3 mb-4">
        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
        <div>
          <h4 className="font-medium text-gray-900">Data Status</h4>
          <p className={`text-sm ${statusColor}`}>{statusMessage}</p>
        </div>
      </div>

      {showDetails && status && (
        <>
          {/* Database Configuration Details */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Database Configuration</h5>
            <div className="space-y-2">
              {Object.entries(status).map(([dbType, configured]) => (
                <div key={dbType} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{dbType}</span>
                  <div className="flex items-center gap-2">
                    {configured ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">Configured</span>
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600">Missing</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cache Statistics */}
          {cacheStats && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Cache Statistics</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cached Entries:</span>
                  <span className="ml-2 font-medium">{cacheStats.totalEntries}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cache Size:</span>
                  <span className="ml-2 font-medium">{Math.round(cacheStats.totalSize / 1024)}KB</span>
                </div>
                <div>
                  <span className="text-gray-600">Expired:</span>
                  <span className="ml-2 font-medium">{cacheStats.expiredEntries}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                smartDataService.clearCache();
                window.location.reload();
              }}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Clear Cache & Refresh
            </button>
            
            {configuredCount < totalDatabases && (
              <a
                href="https://notion.so"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              >
                <CloudIcon className="h-4 w-4" />
                Configure Notion
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DataStatus;