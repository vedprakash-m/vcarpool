/**
 * Real-time Status Component
 * Shows connection status and real-time updates for mobile users
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRealTime } from '@/services/realtime.service';
import { useOffline } from '@/services/offline.service';
import { useMobile } from '@/services/mobile.service';
import {
  WifiIcon,
  SignalIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface RealTimeStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function RealTimeStatus({
  className = '',
  showDetails = false,
}: RealTimeStatusProps) {
  const { connectionStatus, capabilities } = useRealTime();
  const { isOnline, hasUnsynced, syncStatus } = useOffline();
  const { isMobile } = useMobile();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (connectionStatus.reconnecting) return 'text-amber-500';
    if (connectionStatus.connected) return 'text-green-500';
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (!isOnline) return ExclamationTriangleIcon;
    if (connectionStatus.reconnecting) return CloudIcon;
    if (connectionStatus.connected) return CheckCircleIcon;
    return SignalIcon;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (connectionStatus.reconnecting) return 'Reconnecting...';
    if (connectionStatus.connected) return 'Connected';
    return 'Disconnected';
  };

  const getLatencyText = () => {
    if (!connectionStatus.connected) return '';
    if (connectionStatus.latency === 0) return '';

    const latency = connectionStatus.latency;
    if (latency < 100) return 'Excellent';
    if (latency < 300) return 'Good';
    if (latency < 500) return 'Fair';
    return 'Poor';
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Icon */}
      <div className="relative">
        <StatusIcon className={`w-4 h-4 ${getStatusColor()}`} />

        {/* Syncing indicator */}
        {syncStatus?.inProgress && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}

        {/* Unsynced indicator */}
        {hasUnsynced && !syncStatus?.inProgress && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
        )}
      </div>

      {/* Status Text (only on mobile if showDetails is true) */}
      {(!isMobile || showDetails) && (
        <div className="flex flex-col text-xs">
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>

          {showDetails && connectionStatus.connected && (
            <div className="text-gray-500 space-y-1">
              {connectionStatus.latency > 0 && (
                <div className="flex items-center gap-1">
                  <span>{connectionStatus.latency}ms</span>
                  <span className="text-gray-400">•</span>
                  <span>{getLatencyText()}</span>
                </div>
              )}

              {connectionStatus.lastConnected && (
                <div>
                  Last: {connectionStatus.lastConnected.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {showDetails && hasUnsynced && (
            <div className="text-amber-600">
              {syncStatus?.inProgress
                ? `Syncing ${syncStatus.completed}/${syncStatus.total}...`
                : 'Has unsynced data'}
            </div>
          )}
        </div>
      )}

      {/* Connection quality indicator */}
      {connectionStatus.connected && !showDetails && (
        <div className="flex gap-1">
          {[1, 2, 3].map(bar => (
            <div
              key={bar}
              className={`
                w-1 h-3 rounded-full
                ${
                  connectionStatus.latency === 0
                    ? 'bg-gray-300'
                    : connectionStatus.latency < bar * 150
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default RealTimeStatus;
