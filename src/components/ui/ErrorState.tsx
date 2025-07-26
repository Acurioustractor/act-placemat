import Button from './Button';

interface ErrorStateProps {
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error state component for displaying when an error occurs
 */
const ErrorState = ({
  message,
  details,
  onRetry,
  className = '',
}: ErrorStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="mb-4 text-red-500">
        <svg
          className="h-12 w-12 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      {details && (
        <p className="text-sm text-gray-500 mb-6 max-w-md">{details}</p>
      )}
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;