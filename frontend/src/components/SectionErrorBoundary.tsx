'use client';

import React from 'react';
import ErrorBoundary from './ErrorBoundary';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  sectionName: string;
}

/**
 * A component error boundary that can be used for specific sections of the app
 * with a more compact error display
 */
export function SectionErrorBoundary({
  children,
  fallbackComponent,
  sectionName,
}: SectionErrorBoundaryProps) {
  const defaultFallback = (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Error in {sectionName}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>We encountered an error while displaying this content.</p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallbackComponent || defaultFallback}>
      {children}
    </ErrorBoundary>
  );
}
