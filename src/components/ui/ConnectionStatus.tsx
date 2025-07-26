// Component for displaying backend connection status

import { useHealthStatus, useConfig } from '../../hooks/useConfig';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';

interface ConnectionStatusProps {
  compact?: boolean;
  className?: string;
}

/**
 * ConnectionStatus component shows the status of backend connectivity
 */
export function ConnectionStatus({ compact = false, className = '' }: ConnectionStatusProps) {
  const { data: health, isLoading: healthLoading, error: healthError } = useHealthStatus();
  const { data: config, isLoading: configLoading, error: configError } = useConfig();

  const isLoading = healthLoading || configLoading;
  const hasErrors = healthError || configError;

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <LoadingSpinner size="sm" />
        {!compact && <span className="text-sm text-gray-600">Checking connection...</span>}
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="danger" size="sm">Disconnected</Badge>
        {!compact && (
          <span className="text-sm text-red-600">
            Backend connection failed
          </span>
        )}
      </div>
    );
  }

  const isConnected = health?.status === 'healthy';
  const notionConfigured = config?.status?.notion_configured;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge 
        variant={isConnected ? 'success' : 'warning'} 
        size="sm"
      >
        {isConnected ? 'Connected' : 'Partial'}
      </Badge>
      
      {!compact && (
        <div className="text-sm">
          <div className={isConnected ? 'text-green-600' : 'text-yellow-600'}>
            Backend: {isConnected ? 'Online' : 'Issues'}
          </div>
          <div className={notionConfigured ? 'text-green-600' : 'text-red-600'}>
            Notion: {notionConfigured ? 'Configured' : 'Not configured'}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;