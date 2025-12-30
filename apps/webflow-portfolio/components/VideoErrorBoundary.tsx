'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for video components.
 * Catches JavaScript errors in child components and displays a fallback UI.
 *
 * Usage:
 * <VideoErrorBoundary>
 *   <VideoEmbed platform="youtube" embedUrl="..." />
 * </VideoErrorBoundary>
 */
export class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[VideoErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center p-6">
          <svg
            className="w-16 h-16 text-slate-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-white font-semibold mb-2">Video Failed to Load</h3>
          <p className="text-slate-400 text-sm text-center mb-4">
            {this.state.error?.message || 'An unexpected error occurred while loading the video.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-full text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for easier use with function components
 */
export function withVideoErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <VideoErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </VideoErrorBoundary>
    );
  };
}

export default VideoErrorBoundary;
