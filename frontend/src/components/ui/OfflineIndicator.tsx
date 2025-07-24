/**
 * Offline Indicator Component
 * Shows offline status and sync progress for mobile users
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useOffline } from '@/services/offline.service';
import { useMobile } from '@/services/mobile.service';
import {
  CloudIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom';
}

export function OfflineIndicator({
  className = '',
  showDetails = false,
  position = 'top',
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isOfflineReady,
    hasUnsynced,
    syncStatus,
    lastSync,
    cacheSize,
    forceSync,
  } = useOffline();
  const { isMobile, hapticFeedback } = useMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success indicator when sync completes
  useEffect(() => {
    if (syncStatus && !syncStatus.inProgress && syncStatus.completed > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  // Don't show indicator if online and no unsynced data
  if (isOnline && !hasUnsynced && !syncStatus?.inProgress && !showSuccess) {
    return null;
  }

  const getStatusIcon = () => {
    if (syncStatus?.inProgress) return CloudArrowUpIcon;
    if (showSuccess) return CheckCircleIcon;
    if (!isOnline) return ExclamationTriangleIcon;
    if (hasUnsynced) return CloudArrowDownIcon;
    return CloudIcon;
  };

  const getStatusColor = () => {
    if (syncStatus?.inProgress) return 'text-blue-600 bg-blue-50';
    if (showSuccess) return 'text-green-600 bg-green-50';
    if (!isOnline) return 'text-red-600 bg-red-50';
    if (hasUnsynced) return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusText = () => {
    if (syncStatus?.inProgress) {
      return `Syncing ${syncStatus.completed}/${syncStatus.total}...`;
    }
    if (showSuccess) return 'Sync complete!';
    if (!isOnline && hasUnsynced) return 'Offline - Changes pending';
    if (!isOnline) return 'Offline mode';
    if (hasUnsynced) return 'Changes ready to sync';
    return 'Online';
  };

  const formatCacheSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleSync = async () => {
    if (!isOnline || syncStatus?.inProgress) return;

    hapticFeedback('medium');
    try {
      await forceSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <>
      {/* Main Indicator */}
      <div
        className={`
          ${position === 'top' ? 'top-4' : 'bottom-4'}
          left-4 right-4 fixed z-40 transition-all duration-300
          ${className}
        `}
      >
        <div
          onClick={() => showDetails && setIsExpanded(!isExpanded)}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
            backdrop-blur-sm cursor-pointer transition-all duration-200
            ${getStatusColor()}
            ${showDetails ? 'hover:shadow-xl' : ''}
            ${isExpanded ? 'rounded-b-none' : ''}
          `}
        >
          {/* Status Icon */}
          <StatusIcon
            className={`
              w-5 h-5 flex-shrink-0
              ${syncStatus?.inProgress ? 'animate-spin' : ''}
              ${showSuccess ? 'animate-pulse' : ''}
            `}
          />

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getStatusText()}</p>

            {syncStatus?.inProgress && (
              <div className="w-full bg-white/30 rounded-full h-1.5 mt-1">
                <div
                  className="bg-current h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (syncStatus.completed / syncStatus.total) * 100
                    }%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Sync Button */}
          {isOnline && hasUnsynced && !syncStatus?.inProgress && (
            <button
              onClick={e => {
                e.stopPropagation();
                handleSync();
              }}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Sync now"
            >
              <CloudArrowUpIcon className="w-4 h-4" />
            </button>
          )}

          {/* Expand/Close Button */}
          {showDetails && (
            <button
              onClick={e => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <XMarkIcon className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4 flex flex-col justify-center gap-0.5">
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                </div>
              )}
            </button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <div
            className={`
            border-t-0 rounded-b-lg shadow-lg border backdrop-blur-sm
            ${getStatusColor().replace('bg-', 'bg-').replace('-50', '-100')}
            animate-in slide-in-from-top-2 duration-200
          `}
          >
            <div className="p-4 space-y-3">
              {/* Connection Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Connection</span>
                <span
                  className={`
                  text-xs px-2 py-1 rounded-full
                  ${
                    isOnline
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }
                `}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Offline Ready Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Offline Ready</span>
                <span
                  className={`
                  text-xs px-2 py-1 rounded-full
                  ${
                    isOfflineReady
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }
                `}
                >
                  {isOfflineReady ? 'Yes' : 'No'}
                </span>
              </div>

              {/* Cache Size */}
              {cacheSize > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cache Size</span>
                  <span className="text-xs text-gray-600">
                    {formatCacheSize(cacheSize)}
                  </span>
                </div>
              )}

              {/* Last Sync */}
              {lastSync && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Sync</span>
                  <span className="text-xs text-gray-600">
                    {lastSync.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Sync Errors */}
              {syncStatus?.errors && syncStatus.errors > 0 && (
                <div className="bg-red-100 border border-red-200 rounded p-2">
                  <p className="text-xs text-red-800">
                    {syncStatus.errors} items failed to sync
                  </p>
                  {syncStatus.lastError && (
                    <p className="text-xs text-red-600 mt-1">
                      {syncStatus.lastError.message}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {isOnline && hasUnsynced && !syncStatus?.inProgress && (
                  <button
                    onClick={handleSync}
                    className="flex-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-xs font-medium transition-colors"
                  >
                    Sync Now
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 bg-white/20 hover:bg-white/30 px-3 py-2 rounded text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default OfflineIndicator;
